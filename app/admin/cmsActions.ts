"use server";

import { revalidatePath } from 'next/cache';
import { verifyAdminSession } from '@/lib/adminAuth';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Returns a database client capable of managing CMS posts.
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

import { formatSlug } from '@/lib/slug';
export { formatSlug };

export interface PostInputData {
  title: string;
  slug?: string;
  content?: string;
  cover_image?: string | null;
  published?: boolean;
}

export interface PostActionResponse {
  success: boolean;
  postId?: number;
  post?: any;
  published?: boolean;
  error?: string;
}

/**
 * Server Action: Create or Update a CMS Post
 * Strictly verifies admin session before write operations.
 */
export async function savePost(
  data: PostInputData,
  postId?: number
): Promise<PostActionResponse> {
  const { authorized, user, supabase } = await verifyAdminSession();
  if (!authorized || !user) {
    return {
      success: false,
      error: 'دسترسی غیرمجاز. فقط مدیر سیستم مجاز به انتشار یا ویرایش نوشته‌ها است.',
    };
  }

  const title = data.title?.trim();
  if (!title) {
    return {
      success: false,
      error: 'لطفاً عنوان نوشته را وارد کنید.',
    };
  }

  // Format and validate slug
  let slug = formatSlug(data.slug || title);
  if (!slug) {
    slug = `post-${Date.now()}`;
  }

  const db = getAdminDbClient(supabase);

  try {
    if (postId) {
      // Update existing post
      const { data: updatedPost, error } = await db
        .from('posts')
        .update({
          title,
          slug,
          content: data.content ?? '',
          cover_image: data.cover_image?.trim() || null,
          published: data.published ?? false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating post in DB:', error);
        if (error.code === '23505') {
          return {
            success: false,
            error: 'این نامک (Slug) قبلاً برای نوشته دیگری ثبت شده است. لطفاً یک نامک یکتا وارد کنید.',
          };
        }
        return {
          success: false,
          error: error.message || 'خطا در به‌روزرسانی نوشته در پایگاه داده',
        };
      }

      revalidatePath('/admin/cms');
      revalidatePath('/admin/cms/editor');
      revalidatePath('/blog');
      revalidatePath('/');

      return {
        success: true,
        postId: updatedPost?.id || postId,
        post: updatedPost,
      };
    } else {
      // Insert new post
      const { data: newPost, error } = await db
        .from('posts')
        .insert({
          title,
          slug,
          content: data.content ?? '',
          cover_image: data.cover_image?.trim() || null,
          published: data.published ?? false,
          author_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error inserting new post into DB:', error);
        if (error.code === '23505') {
          return {
            success: false,
            error: 'این نامک (Slug) قبلاً برای نوشته دیگری ثبت شده است. لطفاً یک نامک یکتا وارد کنید.',
          };
        }
        return {
          success: false,
          error: error.message || 'خطا در ایجاد نوشته در پایگاه داده',
        };
      }

      revalidatePath('/admin/cms');
      revalidatePath('/admin/cms/editor');
      revalidatePath('/blog');
      revalidatePath('/');

      return {
        success: true,
        postId: newPost?.id,
        post: newPost,
      };
    }
  } catch (err: any) {
    console.error('Unexpected error saving post:', err);
    return {
      success: false,
      error: err?.message || 'خطای غیرمنتظره هنگام ذخیره نوشته رخ داد.',
    };
  }
}

/**
 * Server Action: Delete a CMS Post
 * Strictly verifies admin session before deletion.
 */
export async function deletePost(postId: number): Promise<PostActionResponse> {
  const { authorized, user, supabase } = await verifyAdminSession();
  if (!authorized || !user) {
    return {
      success: false,
      error: 'دسترسی غیرمجاز. فقط مدیر سیستم مجاز به حذف نوشته‌ها است.',
    };
  }

  if (!postId || isNaN(postId)) {
    return {
      success: false,
      error: 'شناسه نوشته معتبر نمی‌باشد.',
    };
  }

  const db = getAdminDbClient(supabase);

  try {
    const { error } = await db
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) {
      console.error('Error deleting post from DB:', error);
      return {
        success: false,
        error: error.message || 'خطا در حذف نوشته از پایگاه داده',
      };
    }

    revalidatePath('/admin/cms');
    revalidatePath('/blog');
    revalidatePath('/');

    return {
      success: true,
      postId,
    };
  } catch (err: any) {
    console.error('Unexpected error deleting post:', err);
    return {
      success: false,
      error: err?.message || 'خطای غیرمنتظره هنگام حذف نوشته رخ داد.',
    };
  }
}

/**
 * Server Action: Toggle published status of a CMS Post
 * Strictly verifies admin session before updating status.
 */
export async function togglePostPublish(
  postId: number,
  currentStatus: boolean
): Promise<PostActionResponse> {
  const { authorized, user, supabase } = await verifyAdminSession();
  if (!authorized || !user) {
    return {
      success: false,
      error: 'دسترسی غیرمجاز. فقط مدیر سیستم مجاز به تغییر وضعیت انتشار است.',
    };
  }

  if (!postId || isNaN(postId)) {
    return {
      success: false,
      error: 'شناسه نوشته معتبر نمی‌باشد.',
    };
  }

  const nextStatus = !currentStatus;
  const db = getAdminDbClient(supabase);

  try {
    const { error } = await db
      .from('posts')
      .update({
        published: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId);

    if (error) {
      console.error('Error toggling post published status:', error);
      return {
        success: false,
        error: error.message || 'خطا در تغییر وضعیت انتشار نوشته',
      };
    }

    revalidatePath('/admin/cms');
    revalidatePath('/blog');
    revalidatePath('/');

    return {
      success: true,
      postId,
      published: nextStatus,
    };
  } catch (err: any) {
    console.error('Unexpected error toggling publish state:', err);
    return {
      success: false,
      error: err?.message || 'خطای غیرمنتظره هنگام تغییر وضعیت انتشار رخ داد.',
    };
  }
}
