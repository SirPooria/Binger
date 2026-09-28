"use server";

import { revalidatePath, revalidateTag } from 'next/cache';
import { verifyAdminSession } from '@/lib/adminAuth';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Returns a database client capable of managing site settings.
 * Uses service role key when available or fallback to verified session client.
 */
function getAdminDbClient(fallbackClient: any) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (serviceKey && url) {
    return createSupabaseClient(url, serviceKey);
  }
  return fallbackClient;
}

export interface SiteSettingItem {
  id: number;
  setting_key: string;
  setting_value: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettingsActionResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Server Action: دریافت تمامی تنظیمات متنی سایت
 */
export async function getSettings(): Promise<{ success: boolean; settings: SiteSettingItem[]; error?: string }> {
  try {
    const { authorized, user, supabase } = await verifyAdminSession();
    if (!authorized || !user) {
      return {
        success: false,
        settings: [],
        error: 'دسترسی غیرمجاز. تنها مدیر سایت امکان مشاهده تنظیمات را دارد.',
      };
    }

    const db = getAdminDbClient(supabase);
    const { data, error } = await db
      .from('site_settings')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[getSettings] Database error:', error);
      return {
        success: false,
        settings: [],
        error: 'خطا در بارگذاری تنظیمات از پایگاه داده.',
      };
    }

    return {
      success: true,
      settings: (data || []) as SiteSettingItem[],
    };
  } catch (err: any) {
    console.error('[getSettings] Unexpected error:', err);
    return {
      success: false,
      settings: [],
      error: err?.message || 'خطای غیرمنتظره در سرور رخ داد.',
    };
  }
}

/**
 * Server Action: ایجاد یا ویرایش یک متغیر متنی (Update or Upsert Setting)
 * همراه با به‌روزرسانی آنی کش کل سایت با revalidatePath('/', 'layout')
 */
export async function updateSetting(
  key: string,
  value: string,
  description?: string
): Promise<SettingsActionResponse> {
  const cleanKey = key?.trim();
  if (!cleanKey) {
    return { success: false, error: 'شناسه کلید (setting_key) الزامی است.' };
  }

  // کلید باید ساختار معتبر اسلاگ انگلیسی داشته باشد (مثال: hero_title یا footer_text)
  const normalizedKey = cleanKey.toLowerCase().replace(/[^a-z0-9_]/g, '_');

  try {
    const { authorized, user, supabase } = await verifyAdminSession();
    if (!authorized || !user) {
      return {
        success: false,
        error: 'دسترسی غیرمجاز. فقط مدیر سیستم مجاز به تغییر متون است.',
      };
    }

    const db = getAdminDbClient(supabase);
    const nowIso = new Date().toISOString();

    const payload: Record<string, any> = {
      setting_key: normalizedKey,
      setting_value: value ?? '',
      updated_at: nowIso,
    };

    if (description !== undefined) {
      payload.description = description?.trim() || null;
    }

    const { data, error } = await db
      .from('site_settings')
      .upsert(payload, { onConflict: 'setting_key' })
      .select()
      .single();

    if (error) {
      console.error('[updateSetting] Database error:', error);
      return { success: false, error: 'خطا در ذخیره‌سازی مقدار در پایگاه داده.' };
    }

    // بازنشانی آنی کش کل صفحات سایت طبق خواسته کاربر
    try {
      revalidatePath('/', 'layout');
    } catch (revalidateErr) {
      console.warn('[updateSetting] Revalidation notice:', revalidateErr);
    }

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    console.error('[updateSetting] Unexpected error:', err);
    return {
      success: false,
      error: err?.message || 'خطا در ثبت تغییرات.',
    };
  }
}

/**
 * Server Action: حذف یک کلید تنظیمات
 */
export async function deleteSetting(key: string): Promise<SettingsActionResponse> {
  const cleanKey = key?.trim();
  if (!cleanKey) {
    return { success: false, error: 'کلید معتبر نیست.' };
  }

  try {
    const { authorized, user, supabase } = await verifyAdminSession();
    if (!authorized || !user) {
      return {
        success: false,
        error: 'دسترسی غیرمجاز.',
      };
    }

    const db = getAdminDbClient(supabase);
    const { error } = await db
      .from('site_settings')
      .delete()
      .eq('setting_key', cleanKey);

    if (error) {
      console.error('[deleteSetting] Database error:', error);
      return { success: false, error: 'خطا در حذف کلید.' };
    }

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('[deleteSetting] Error:', err);
    return { success: false, error: err?.message || 'خطا در حذف تنظیم.' };
  }
}
