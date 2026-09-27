import React from 'react';
import Link from 'next/link';
import { verifyAdminSession } from '@/lib/adminAuth';
import ContentEditorClient from './ContentEditorClient';
import { Edit3, Sparkles, ShieldAlert } from 'lucide-react';

export const metadata = {
  title: 'مدیریت و ویرایش محتوای سریال‌ها | Binger Admin',
  description: 'سفارشی‌سازی عناوین فارسی، خلاصه‌ها و پوستر سریال‌های TMDB در دیتابیس',
};

export const dynamic = 'force-dynamic';

export default async function AdminContentEditorPage() {
  const { authorized } = await verifyAdminSession();

  if (!authorized) {
    return (
      <div className="p-8 rounded-3xl bg-red-500/10 border border-red-500/20 text-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">دسترسی غیرمجاز</h2>
        <p className="text-sm text-gray-400">
          شما مجوز دسترسی به بخش ویرایش محتوای دیتابیس را ندارید.
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header and Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Link href="/admin" className="hover:text-gray-300 transition">داشبورد ادمین</Link>
            <span>/</span>
            <span className="text-[#ccff00] font-medium">ویرایش محتوا</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <Edit3 className="w-6 h-6 text-[#ccff00]" />
            <span>ویرایش و بازنویسی اطلاعات سریال‌ها (Content Overrides)</span>
          </h1>
          <p className="text-xs text-gray-400">
            سفارشی‌سازی و بازنویسی عنوان فارسی، خلاصه داستان و پوستر سریال‌ها در جدول آیینه دیتابیس (cached_shows)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#ccff00]" />
            <span>Live DB Sync</span>
          </div>
        </div>
      </div>

      {/* Main Client Content Editor */}
      <ContentEditorClient />
    </div>
  );
}
