import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cirdpdixhxhdsgldfpav.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * تابع کش‌شده Next.js برای دریافت مقدار یک کلید متنی از جدول site_settings.
 * از مکانیزم unstable_cache همراه با تگ 'site_settings' برای بازنشانی آنی استفاده می‌کند.
 */
const getCachedSettingValue = unstable_cache(
  async (key: string): Promise<string | null> => {
    try {
      if (!supabaseUrl || !supabaseKey) return null;
      const client = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await client
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', key)
        .maybeSingle();

      if (error || !data) return null;
      return data.setting_value;
    } catch (err) {
      console.warn(`[getSiteText] Cache fetch error for key "${key}":`, err);
      return null;
    }
  },
  ['site_setting_value'],
  {
    revalidate: 3600, // ۱ ساعت کش، یا بازنشانی در لحظه با ویرایش ادمین
    tags: ['site_settings'],
  }
);

/**
 * هلپر دریافت متن پویای سایت
 * @param key کلید شناسه متن (مانند hero_title یا footer_copyright)
 * @param fallback متن پیش‌فرض در صورت عدم وجود کلید یا خطا در دیتابیس
 * @returns متن ثبت‌شده در دیتابیس یا مقدار پیش‌فرض
 */
export async function getSiteText(key: string, fallback: string): Promise<string> {
  if (!key) return fallback;
  try {
    const val = await getCachedSettingValue(key.toLowerCase().trim());
    if (val !== null && val !== undefined && val.trim() !== '') {
      return val;
    }
  } catch (err) {
    console.warn(`[getSiteText] Fallback used for "${key}":`, err);
  }
  return fallback;
}

/**
 * دریافت دیکشنری کامل تنظیمات متنی با کش Next.js برای دسترسی فوق‌العاده سریع
 */
export const getAllSiteSettings = unstable_cache(
  async (): Promise<Record<string, string>> => {
    try {
      if (!supabaseUrl || !supabaseKey) return {};
      const client = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await client
        .from('site_settings')
        .select('setting_key, setting_value');

      if (error || !data) return {};
      const dict: Record<string, string> = {};
      data.forEach((row: any) => {
        if (row.setting_key) dict[row.setting_key] = row.setting_value || '';
      });
      return dict;
    } catch (err) {
      console.warn('[getAllSiteSettings] Cache fetch error:', err);
      return {};
    }
  },
  ['all_site_settings'],
  {
    revalidate: 3600,
    tags: ['site_settings'],
  }
);
