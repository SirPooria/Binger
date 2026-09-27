"use server";

import { revalidatePath } from 'next/cache';
import { verifyAdminSession } from '@/lib/adminAuth';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { TMDBShow } from '@/lib/tmdbClient';

/**
 * Returns a database client capable of updating user profiles.
 * Prefers the service role client (if configured) or falls back to the verified admin session client.
 */
function getAdminDbClient(fallbackClient: any) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (serviceKey && url) {
    return createSupabaseClient(url, serviceKey);
  }
  return fallbackClient;
}

/**
 * Server Action: Toggle user VIP status (Grant / Revoke)
 * Strictly verifies admin authorization before performing any database write.
 */
export async function toggleUserVip(
  userId: string,
  currentStatus: boolean
): Promise<{
  success: boolean;
  is_vip?: boolean;
  error?: string;
}> {
  // CRITICAL: Strictly verify admin session
  const { authorized, user, supabase } = await verifyAdminSession();
  if (!authorized || !user) {
    return { success: false, error: 'دسترسی غیرمجاز. فقط مدیر سیستم مجاز به تغییر وضعیت است.' };
  }

  try {
    const nextStatus = !currentStatus;
    const db = getAdminDbClient(supabase);

    const { error } = await db
      .from('profiles')
      .update({
        is_vip: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('toggleUserVip DB error:', error);
      return { success: false, error: 'خطا در به‌روزرسانی وضعیت VIP کاربر در پایگاه داده' };
    }

    // Refresh cached admin server components
    revalidatePath('/admin/users');
    revalidatePath('/admin');

    return { success: true, is_vip: nextStatus };
  } catch (err: unknown) {
    console.error('toggleUserVip exception:', err);
    return { success: false, error: 'خطای غیرمنتظره در تغییر وضعیت VIP کاربر' };
  }
}

/**
 * Server Action: Toggle user Admin role (Grant / Revoke)
 * Strictly verifies admin authorization and prevents self-demotion.
 */
export async function toggleUserAdmin(
  userId: string,
  currentRole: string
): Promise<{
  success: boolean;
  role?: string;
  error?: string;
}> {
  // CRITICAL: Strictly verify admin session
  const { authorized, user, supabase } = await verifyAdminSession();
  if (!authorized || !user) {
    return { success: false, error: 'دسترسی غیرمجاز. فقط مدیر سیستم مجاز به تغییر نقش است.' };
  }

  // Safety check: Prevent admin from removing their own admin privilege
  if (user.id === userId && currentRole === 'admin') {
    return { success: false, error: 'امکان لغو نقش مدیریت برای حساب خودتان وجود ندارد.' };
  }

  try {
    const nextRole = currentRole === 'admin' ? 'user' : 'admin';
    const db = getAdminDbClient(supabase);

    const { error } = await db
      .from('profiles')
      .update({
        role: nextRole,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('toggleUserAdmin DB error:', error);
      return { success: false, error: 'خطا در به‌روزرسانی نقش مدیریتی کاربر در پایگاه داده' };
    }

    // Refresh cached admin server components
    revalidatePath('/admin/users');
    revalidatePath('/admin');

    return { success: true, role: nextRole };
  } catch (err: unknown) {
    console.error('toggleUserAdmin exception:', err);
    return { success: false, error: 'خطای غیرمنتظره در تغییر نقش ادمین کاربر' };
  }
}

/**
 * Server Action: Fetch show data by TMDB ID from cached_shows (or live TMDB)
 * Strictly verifies admin authorization.
 */
export async function fetchShowData(
  showId: number
): Promise<{
  success: boolean;
  show?: TMDBShow | null;
  source?: 'cache' | 'tmdb';
  updated_at?: string;
  error?: string;
}> {
  // CRITICAL: Strictly verify admin session
  const { authorized, user, supabase } = await verifyAdminSession();
  if (!authorized || !user) {
    return { success: false, error: 'دسترسی غیرمجاز. فقط مدیر سیستم مجاز به دریافت اطلاعات است.' };
  }

  const numId = Number(showId);
  if (isNaN(numId) || numId <= 0) {
    return { success: false, error: 'شناسه سریال نامعتبر است. لطفاً یک عدد صحیح وارد کنید.' };
  }

  try {
    const db = getAdminDbClient(supabase);

    // 1. Check cached_shows in Supabase
    const { data: row, error: dbError } = await db
      .from('cached_shows')
      .select('id, data, updated_at')
      .eq('id', numId)
      .maybeSingle();

    if (!dbError && row && row.data) {
      return {
        success: true,
        show: row.data as TMDBShow,
        source: 'cache',
        updated_at: row.updated_at,
      };
    }

    // 2. Fallback to TMDB gateway if not yet cached in DB
    const { getShowDetails } = await import('@/lib/tmdbClient');
    const liveShow = await getShowDetails(String(numId));
    if (!liveShow) {
      return { success: false, error: `سریالی با شناسه TMDB ${numId} در دیتابیس یا سرور TMDB یافت نشد.` };
    }

    return {
      success: true,
      show: liveShow,
      source: 'tmdb',
    };
  } catch (err: unknown) {
    console.error('fetchShowData exception:', err);
    return { success: false, error: 'خطای غیرمنتظره در واکشی اطلاعات سریال' };
  }
}

/**
 * Server Action: Update custom show data (Persian Title, Overview, Poster) in cached_shows
 * Strictly verifies admin authorization and safely merges with existing TMDB payload.
 */
export async function updateShowData(
  showId: number,
  updates: {
    name_fa?: string;
    overview_fa?: string;
    poster_path?: string;
  }
): Promise<{
  success: boolean;
  show?: TMDBShow;
  error?: string;
}> {
  // CRITICAL: Strictly verify admin session
  const { authorized, user, supabase } = await verifyAdminSession();
  if (!authorized || !user) {
    return { success: false, error: 'دسترسی غیرمجاز. فقط مدیر سیستم مجاز به ویرایش محتوا است.' };
  }

  const numId = Number(showId);
  if (isNaN(numId) || numId <= 0) {
    return { success: false, error: 'شناسه سریال نامعتبر است.' };
  }

  try {
    const db = getAdminDbClient(supabase);
    const { getShowDetails } = await import('@/lib/tmdbClient');

    // 1. Fetch current record to perform a non-destructive shallow merge
    let baseData: TMDBShow | null = null;
    const { data: row } = await db
      .from('cached_shows')
      .select('data')
      .eq('id', numId)
      .maybeSingle();

    if (row?.data) {
      baseData = row.data as TMDBShow;
    } else {
      baseData = await getShowDetails(String(numId));
    }

    if (!baseData) {
      return { success: false, error: 'اطلاعات اولیه سریال برای ادغام و ذخیره‌سازی یافت نشد.' };
    }

    // 2. Merge overrides safely preserving all other 34+ TMDB keys
    const cleanNameFa = updates.name_fa !== undefined ? updates.name_fa.trim() : (baseData.name_fa || '');
    const cleanOverviewFa = updates.overview_fa !== undefined ? updates.overview_fa.trim() : (baseData.overview_fa || '');
    const cleanPosterPath = updates.poster_path !== undefined ? updates.poster_path.trim() : (baseData.poster_path || '');

    const mergedData: TMDBShow = {
      ...baseData,
      name_fa: cleanNameFa,
      overview_fa: cleanOverviewFa,
      // If Persian overview is set, sync it as active overview as well
      overview: cleanOverviewFa || baseData.overview,
      poster_path: cleanPosterPath || baseData.poster_path,
    };

    // 3. Upsert into cached_shows with fresh updated_at
    const { error: upsertErr } = await db.from('cached_shows').upsert(
      {
        id: numId,
        data: mergedData as any,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (upsertErr) {
      console.error('updateShowData DB error:', upsertErr);
      return { success: false, error: 'خطا در ذخیره‌سازی داده‌های ویرایش‌شده در پایگاه داده' };
    }

    // Revalidate paths that could display this show
    revalidatePath('/admin');
    revalidatePath(`/dashboard/tv/${numId}`);
    revalidatePath('/dashboard');

    return { success: true, show: mergedData };
  } catch (err: unknown) {
    console.error('updateShowData exception:', err);
    return { success: false, error: 'خطای غیرمنتظره در به‌روزرسانی اطلاعات سریال' };
  }
}

/**
 * Server Action: Delete a comment by ID (Admin Moderation)
 * Strictly verifies admin authorization before deleting.
 */
export async function deleteAdminComment(commentId: number): Promise<{
  success: boolean;
  deletedId?: number;
  error?: string;
}> {
  const { authorized, user, supabase } = await verifyAdminSession();
  if (!authorized || !user) {
    return { success: false, error: 'دسترسی غیرمجاز. فقط مدیر سیستم مجاز به حذف نظر است.' };
  }

  const id = Number(commentId);
  if (isNaN(id) || id <= 0) {
    return { success: false, error: 'شناسه نظر نامعتبر است.' };
  }

  try {
    const db = getAdminDbClient(supabase);

    // Clean up any likes on this comment to maintain DB integrity
    await db.from('comment_likes').delete().eq('comment_id', id);

    const { error } = await db.from('comments').delete().eq('id', id);

    if (error) {
      console.error('deleteAdminComment DB error:', error);
      return { success: false, error: 'خطا در حذف نظر از پایگاه داده' };
    }

    revalidatePath('/admin/comments');
    revalidatePath('/admin');
    return { success: true, deletedId: id };
  } catch (err: unknown) {
    console.error('deleteAdminComment exception:', err);
    return { success: false, error: 'خطای غیرمنتظره در حذف نظر' };
  }
}

/**
 * Server Action: Update comment text content (Admin Moderation)
 * Strictly verifies admin authorization before editing.
 */
export async function updateAdminComment(
  commentId: number,
  newContent: string
): Promise<{
  success: boolean;
  updatedContent?: string;
  error?: string;
}> {
  const { authorized, user, supabase } = await verifyAdminSession();
  if (!authorized || !user) {
    return { success: false, error: 'دسترسی غیرمجاز. فقط مدیر سیستم مجاز به ویرایش نظر است.' };
  }

  const id = Number(commentId);
  if (isNaN(id) || id <= 0) {
    return { success: false, error: 'شناسه نظر نامعتبر است.' };
  }

  const trimmed = newContent.trim();
  if (!trimmed) {
    return { success: false, error: 'متن نظر نمی‌تواند خالی باشد.' };
  }

  try {
    const db = getAdminDbClient(supabase);

    const { error } = await db
      .from('comments')
      .update({ content: trimmed })
      .eq('id', id);

    if (error) {
      console.error('updateAdminComment DB error:', error);
      return { success: false, error: 'خطا در ویرایش نظر در پایگاه داده' };
    }

    revalidatePath('/admin/comments');
    return { success: true, updatedContent: trimmed };
  } catch (err: unknown) {
    console.error('updateAdminComment exception:', err);
    return { success: false, error: 'خطای غیرمنتظره در ویرایش نظر' };
  }
}

/**
 * Server Action: Quick Grant VIP by Phone Number or Username
 * Strictly verifies admin authorization.
 */
export async function quickGrantVip(
  phoneOrUsername: string
): Promise<{
  success: boolean;
  user?: {
    id: string;
    username: string | null;
    phone: string | null;
    avatar_url: string | null;
    role: string | null;
    is_vip: boolean | null;
    created_at: string;
  };
  message?: string;
  error?: string;
}> {
  // CRITICAL: Strictly verify admin session
  const { authorized, user, supabase } = await verifyAdminSession();
  if (!authorized || !user) {
    return { success: false, error: 'دسترسی غیرمجاز. فقط مدیر سیستم مجاز به اعطای اشتراک ویژه است.' };
  }

  const query = phoneOrUsername.trim();
  if (!query) {
    return { success: false, error: 'لطفاً شماره تماس یا نام کاربری را وارد کنید.' };
  }

  try {
    const db = getAdminDbClient(supabase);
    const { convertToAsciiDigits, validateIranPhoneNumber } = await import('@/lib/validation/phone');

    const asciiInput = convertToAsciiDigits(query);
    const phoneValidation = validateIranPhoneNumber(asciiInput);

    let targetProfile: any = null;

    if (phoneValidation.isValid) {
      // 1. Try search by normalized phone number or international format
      const { data, error } = await db
        .from('profiles')
        .select('id, username, phone, avatar_url, role, is_vip, created_at')
        .or(`phone.eq.${phoneValidation.normalizedPhone},phone.eq.${phoneValidation.internationalFormat}`)
        .maybeSingle();

      if (!error && data) {
        targetProfile = data;
      }
    }

    // 2. Fallback to username search if not found by phone
    if (!targetProfile) {
      const { data, error } = await db
        .from('profiles')
        .select('id, username, phone, avatar_url, role, is_vip, created_at')
        .ilike('username', query)
        .maybeSingle();

      if (!error && data) {
        targetProfile = data;
      }
    }

    // 3. Fallback to partial phone search if input is all digits
    if (!targetProfile && /^\d+$/.test(asciiInput)) {
      const { data, error } = await db
        .from('profiles')
        .select('id, username, phone, avatar_url, role, is_vip, created_at')
        .ilike('phone', `%${asciiInput}%`)
        .maybeSingle();

      if (!error && data) {
        targetProfile = data;
      }
    }

    if (!targetProfile) {
      return {
        success: false,
        error: `کاربری با شماره یا نام کاربری «${query}» در پایگاه داده یافت نشد.`,
      };
    }

    // Update user to VIP
    const { error: updateError } = await db
      .from('profiles')
      .update({
        is_vip: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetProfile.id);

    if (updateError) {
      console.error('quickGrantVip update error:', updateError);
      return { success: false, error: 'خطا در ارتقای وضعیت VIP کاربر در پایگاه داده' };
    }

    revalidatePath('/admin/vip');
    revalidatePath('/admin/users');
    revalidatePath('/admin');

    const updatedUser = {
      ...targetProfile,
      is_vip: true,
    };

    return {
      success: true,
      user: updatedUser,
      message: `اشتراک ویژه (VIP) با موفقیت برای «${targetProfile.username || targetProfile.phone || 'کاربر'}» فعال شد.`,
    };
  } catch (err: unknown) {
    console.error('quickGrantVip exception:', err);
    return { success: false, error: 'خطای غیرمنتظره در اعطای اشتراک ویژه' };
  }
}


