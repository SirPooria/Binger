import React from 'react';
import Link from 'next/link';
import {
  Compass,
  Home,
  Feather,
  Sparkles,
  BookOpen,
  ArrowLeft,
  ChevronLeft,
  Tv,
} from 'lucide-react';

import { getSiteText } from '@/lib/settings';
import { verifyAdminSession } from '@/lib/adminAuth';
import EditableText from '@/app/components/EditableText';

export const metadata = {
  title: 'مجله و وبلاگ سینمایی | Binger Magazine',
  description: 'نقد و تحلیل سریال‌ها، معرفی آثار برتر، اخبار روز سینما و مقالات اختصاصی پلتفرم بینجر',
};

export default async function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [footerDesc, footerCopyright, adminSession] = await Promise.all([
    getSiteText(
      'footer_description',
      'مرجع نقد، بررسی، اخبار و تحلیل سریال‌ها و فیلم‌های برتر سینمای ایران و جهان.'
    ),
    getSiteText(
      'footer_copyright',
      '© تمامی حقوق برای پلتفرم بینجر (Binger) محفوظ است.'
    ),
    verifyAdminSession().catch(() => ({ authorized: false })),
  ]);

  const isAdmin = adminSession?.authorized === true;
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] flex flex-col relative overflow-x-hidden selection:bg-[#ccff00] selection:text-black antialiased"
    >
      {/* Ambient Glows */}
      <div className="fixed top-0 right-1/4 w-96 h-96 bg-[#ccff00]/5 blur-[160px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-1/3 left-1/4 w-96 h-96 bg-purple-600/5 blur-[160px] rounded-full pointer-events-none -z-10" />

      {/* Floating Top Header */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-[#050505]/80 border-b border-white/10 px-4 md:px-8 py-3 transition-all">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo & Magazine Branding */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 group">
              <img
                src="/Logo.png"
                alt="Binger Logo"
                className="h-9 sm:h-10 w-auto object-contain transition-transform group-hover:scale-105 drop-shadow-[0_0_12px_rgba(204,255,0,0.25)]"
              />
            </Link>
            <div className="hidden sm:flex items-center gap-2 pr-3 border-r border-white/10 text-xs">
              <span className="font-bold text-white">مجله سینمایی</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#ccff00]/15 text-[#ccff00] border border-[#ccff00]/30 font-mono">
                Magazine
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-gray-300">
            <Link
              href="/dashboard"
              className="hover:text-[#ccff00] transition-colors flex items-center gap-1.5"
            >
              <Home size={14} />
              <span>داشبورد</span>
            </Link>
            <Link
              href="/dashboard/explore"
              className="hover:text-[#ccff00] transition-colors flex items-center gap-1.5"
            >
              <Compass size={14} />
              <span>کاوش سریال‌ها</span>
            </Link>
            <Link
              href="/blog"
              className="text-[#ccff00] flex items-center gap-1.5"
            >
              <BookOpen size={14} />
              <span>مقالات و نقدها</span>
            </Link>
            <Link
              href="/dashboard/critics"
              className="hover:text-[#ccff00] transition-colors flex items-center gap-1.5 text-amber-300"
            >
              <Feather size={14} />
              <span>باشگاه منتقدین</span>
            </Link>
          </nav>

          {/* Header Action Button */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <button className="bg-[#ccff00] hover:bg-[#b3e600] text-black text-xs font-black px-4 py-2 rounded-xl transition-all shadow-[0_0_15px_rgba(204,255,0,0.25)] flex items-center gap-1.5 active:scale-95 cursor-pointer">
                <span>ورود به بینجر</span>
                <ChevronLeft size={14} />
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#080808] py-10 px-4 md:px-8 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-right">
          <div className="space-y-2">
            <div className="flex items-center justify-center md:justify-start gap-2.5">
              <img src="/Logo.png" alt="Binger" className="h-8 w-auto object-contain" />
              <span className="text-sm font-bold text-white">مجله سینمایی بینجر</span>
            </div>
            <EditableText
              settingKey="footer_description"
              initialValue={footerDesc || 'مرجع نقد، بررسی، اخبار و تحلیل سریال‌ها و فیلم‌های برتر سینمای ایران و جهان.'}
              isAdmin={isAdmin}
              as="p"
              description="توضیح کوتاه فوتر در مجله"
              className="text-xs text-gray-500 max-w-md"
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-gray-400 font-medium">
            <Link href="/dashboard" className="hover:text-[#ccff00] transition">خانه</Link>
            <Link href="/dashboard/explore" className="hover:text-[#ccff00] transition">اکسپلور</Link>
            <Link href="/dashboard/mood" className="hover:text-[#ccff00] transition">پیشنهاد هوشمند</Link>
            <Link href="/dashboard/subscription" className="hover:text-[#ccff00] transition">اشتراک ویژه VIP</Link>
            <Link href="/admin" className="hover:text-white transition">پنل مدیریت</Link>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-gray-600">
          <EditableText
            settingKey="footer_copyright"
            initialValue={footerCopyright || '© تمامی حقوق برای پلتفرم بینجر (Binger) محفوظ است.'}
            isAdmin={isAdmin}
            as="p"
            description="متن کپی‌رایت فوتر"
            className="text-[11px] text-gray-600"
          />
          <p className="font-mono text-gray-500">Binger Cinematic Magazine 2026</p>
        </div>
      </footer>
    </div>
  );
}
