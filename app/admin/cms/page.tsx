import React from 'react';
import Link from 'next/link';
import { verifyAdminSession } from '@/lib/adminAuth';
import CmsTableClient, { PostRecord } from './CmsTableClient';
import {
  Newspaper,
  Plus,
  ShieldAlert,
  FileText,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { toPersianDigits } from '@/lib/subscription';

export const metadata = {
  title: 'مدیریت مجله و وبلاگ (CMS) | Binger Admin',
  description: 'سیستم جامع مدیریت محتوا، مقالات سینمایی، نقد و بررسی‌ها و اخبار Binger',
};

export const dynamic = 'force-dynamic';

export default async function AdminCmsDashboardPage() {
  const { authorized, supabase } = await verifyAdminSession();

  if (!authorized || !supabase) {
    return (
      <div className="p-8 rounded-3xl bg-red-500/10 border border-red-500/20 text-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">دسترسی غیرمجاز</h2>
        <p className="text-sm text-gray-400">
          فقط مدیران سیستم مجاز به دسترسی به بخش مدیریت محتوا و وبلاگ هستند.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/15 transition"
        >
          بازگشت به داشبورد
        </Link>
      </div>
    );
  }

  let posts: PostRecord[] = [];

  try {
    // 1. Fetch all posts
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('id, title, slug, content, cover_image, author_id, published, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (postsError) {
      console.error('Error fetching posts for CMS dashboard:', postsError);
    } else if (postsData && postsData.length > 0) {
      // 2. Fetch author profiles for author_ids
      const authorIds = Array.from(
        new Set(postsData.map((p) => p.author_id).filter(Boolean))
      ) as string[];

      let authorMap = new Map<string, { username: string | null; avatar_url: string | null }>();

      if (authorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', authorIds);

        if (profilesData) {
          profilesData.forEach((prof) => {
            authorMap.set(prof.id, {
              username: prof.username,
              avatar_url: prof.avatar_url,
            });
          });
        }
      }

      // Map posts with author details
      posts = postsData.map((p) => {
        const author = p.author_id ? authorMap.get(p.author_id) : null;
        return {
          ...p,
          authorName: author?.username || 'مدیر سیستم',
          authorAvatar: author?.avatar_url || null,
        };
      });
    }
  } catch (err) {
    console.error('Unexpected error loading CMS dashboard:', err);
  }

  const totalPosts = posts.length;
  const publishedCount = posts.filter((p) => p.published).length;
  const draftCount = totalPosts - publishedCount;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header and Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Link href="/admin" className="hover:text-gray-300 transition">داشبورد ادمین</Link>
            <span>/</span>
            <span className="text-[#ccff00] font-medium">مجله و وبلاگ (CMS)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <Newspaper className="w-6 h-6 text-[#ccff00]" />
            <span>مدیریت مجله و مقالات (CMS & Blog)</span>
          </h1>
          <p className="text-xs text-gray-400">
            انتشار، بازبینی و مدیریت مقالات سینمایی، نقد و بررسی‌ها و اخبار پلتفرم بینجر
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/cms/editor"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ccff00] text-black text-xs font-bold hover:bg-[#b8e600] shadow-lg shadow-[#ccff00]/10 hover:shadow-[#ccff00]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>نوشته جدید (New Post)</span>
          </Link>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Posts */}
        <div className="p-5 rounded-2xl bg-[#0e0e0e] border border-white/10 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-bold block">کل مقالات</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                {toPersianDigits(totalPosts)}
              </span>
              <span className="text-xs text-gray-400">مطلب</span>
            </div>
            <p className="text-[11px] text-gray-500">مجموع نوشته‌های موجود در دیتابیس</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-300">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Published Posts */}
        <div className="p-5 rounded-2xl bg-[#0e0e0e] border border-emerald-500/20 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-emerald-400 font-bold block">منتشر شده (عمومی)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                {toPersianDigits(publishedCount)}
              </span>
              <span className="text-xs text-emerald-400/70">مقاله فعال</span>
            </div>
            <p className="text-[11px] text-gray-500">قابل مشاهده توسط تمام کاربران سایت</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Drafts */}
        <div className="p-5 rounded-2xl bg-[#0e0e0e] border border-amber-500/20 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-amber-400 font-bold block">پیش‌نویس‌ها (غیرعمومی)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                {toPersianDigits(draftCount)}
              </span>
              <span className="text-xs text-amber-400/70">پیش‌نویس</span>
            </div>
            <p className="text-[11px] text-gray-500">در انتظار بازبینی یا ویرایش نهایی</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main CMS Table */}
      <CmsTableClient initialPosts={posts} />
    </div>
  );
}
