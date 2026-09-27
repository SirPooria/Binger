import React from 'react';
import Link from 'next/link';
import { verifyAdminSession } from '@/lib/adminAuth';
import CommentsTableClient, { AdminCommentRecord } from './CommentsTableClient';
import { MessageCircle, ShieldAlert, Sparkles, Tv, MessageSquare, CheckCircle } from 'lucide-react';
import { toPersianDigits } from '@/lib/subscription';

export const metadata = {
  title: 'مدیریت و نظارت بر نظرات کاربران | Binger Admin',
  description: 'صف بررسی و مدیریت دیدگاه‌ها، نظرات اپیزودها و محتوای ارسالی کاربران در Binger',
};

export const dynamic = 'force-dynamic';

export default async function AdminCommentsPage() {
  const { authorized, supabase } = await verifyAdminSession();

  if (!authorized || !supabase) {
    return (
      <div className="p-8 rounded-3xl bg-red-500/10 border border-red-500/20 text-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">دسترسی غیرمجاز</h2>
        <p className="text-sm text-gray-400">
          فقط مدیران مجاز به مشاهده و مدیریت نظرات کاربران هستند.
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

  let formattedComments: AdminCommentRecord[] = [];
  let totalCount = 0;
  let gifCount = 0;
  let episodeCount = 0;

  try {
    // 1. Fetch latest 100 comments ordered by created_at DESC
    const { data: rawComments, error: commentsErr } = await supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (commentsErr) {
      console.error('Error fetching comments in admin:', commentsErr);
    } else if (rawComments && rawComments.length > 0) {
      totalCount = rawComments.length;

      // 2. Fetch profiles for user_ids using .in() operator
      const userIds = Array.from(new Set(rawComments.map((c) => c.user_id)));
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, phone, is_vip')
        .in('id', userIds);

      const profileMap = new Map<string, {
        username: string | null;
        avatar_url: string | null;
        phone: string | null;
        is_vip: boolean | null;
      }>();

      (profiles || []).forEach((p) => {
        profileMap.set(p.id, p);
      });

      // 3. Fetch show names from cached_shows for show_ids
      const showIds = Array.from(
        new Set(rawComments.map((c) => c.show_id).filter((id): id is number => typeof id === 'number'))
      );

      const showNameMap = new Map<number, string>();
      if (showIds.length > 0) {
        const { data: shows } = await supabase
          .from('cached_shows')
          .select('id, data')
          .in('id', showIds);

        (shows || []).forEach((s) => {
          const showData = s.data as any;
          const title = showData?.name_fa || showData?.name || `سریال #${s.id}`;
          showNameMap.set(s.id, title);
        });
      }

      // 4. Map comments together with profile and show details
      formattedComments = rawComments.map((c) => {
        const prof = profileMap.get(c.user_id);
        const displayName = prof?.username || 'کاربر بینجر';
        const showTitle = c.show_id ? showNameMap.get(c.show_id) || `سریال #${c.show_id}` : null;
        const hasGif = (c.content || '').includes('[gif:') || (c.content || '').includes('![GIF]');

        if (hasGif) gifCount++;
        if (c.episode_id) episodeCount++;

        return {
          id: c.id,
          user_id: c.user_id,
          show_id: c.show_id,
          episode_id: c.episode_id,
          content: c.content,
          created_at: c.created_at,
          parent_id: c.parent_id,
          authorName: displayName,
          authorAvatar: prof?.avatar_url || '😎',
          authorPhone: prof?.phone || null,
          authorIsVip: prof?.is_vip === true,
          showName: showTitle,
        };
      });
    }
  } catch (err) {
    console.error('Unexpected error loading comments for admin:', err);
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header and Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Link href="/admin" className="hover:text-gray-300 transition">داشبورد ادمین</Link>
            <span>/</span>
            <span className="text-[#ccff00] font-medium">نظارت بر نظرات</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <MessageCircle className="w-6 h-6 text-[#ccff00]" />
            <span>صف نظارت و مدیریت نظرات کاربران (Moderation Queue)</span>
          </h1>
          <p className="text-xs text-gray-400">
            مشاهده، ویرایش و حذف دیدگاه‌های ثبت‌شده برای سریال‌ها و اپیزودها (۱۰۰ نظر اخیر)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#ccff00]" />
            <span>Real-time DB</span>
          </div>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-[#0e0e0e] border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ccff00]/10 border border-[#ccff00]/20 text-[#ccff00] flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-gray-400 block font-medium">کل دیدگاه‌های اخیر</span>
            <span className="text-xl font-bold text-white font-mono">{toPersianDigits(totalCount)}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0e0e0e] border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-gray-400 block font-medium">دیدگاه‌های همراه با GIF</span>
            <span className="text-xl font-bold text-purple-400 font-mono">{toPersianDigits(gifCount)}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0e0e0e] border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-gray-400 block font-medium">دیدگاه‌های اپیزودها</span>
            <span className="text-xl font-bold text-blue-400 font-mono">{toPersianDigits(episodeCount)}</span>
          </div>
        </div>
      </div>

      {/* Main Comments Table */}
      <CommentsTableClient initialComments={formattedComments} />
    </div>
  );
}
