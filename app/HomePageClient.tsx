"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft, Tv, User, Sparkles, Play, CheckCircle2,
  Trophy, Star, Compass, Check, BookOpen
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { getTrendingShows, getImageUrl } from '@/lib/tmdbClient';
import EditableText from './components/EditableText';

interface HomePageClientProps {
  heroTitle: string;
  heroSubtitle: string;
  ctaText: string;
  footerDescription: string;
  footerCopyright: string;
  isAdmin?: boolean;
}


export default function HomePageClient({
  heroTitle,
  heroSubtitle,
  ctaText,
  footerDescription,
  footerCopyright,
  isAdmin = false,
}: HomePageClientProps) {
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [posters, setPosters] = useState<string[]>([]);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    const fetchPosters = async () => {
      try {
        const [showsPage1, showsPage2] = await Promise.all([
          getTrendingShows(1),
          getTrendingShows(2),
        ]);
        const allShows = [...showsPage1, ...showsPage2];

        const posterUrls = allShows
          .map((show) => getImageUrl(show.poster_path))
          .filter((url) => url && url !== '/placeholder.png');

        if (posterUrls.length > 0) {
          setPosters(posterUrls);
        }
      } catch {
        // ignore
      }
    };

    checkUser();
    fetchPosters();
  }, [supabase]);

  const displayPosters = posters.length > 0 ? posters : [
    '/placeholder.png', '/placeholder.png', '/placeholder.png',
    '/placeholder.png', '/placeholder.png', '/placeholder.png'
  ];

  return (
    <div dir="rtl" className="min-h-screen w-full bg-[#050505] text-white font-['Vazirmatn'] relative overflow-x-hidden selection:bg-[#ccff00] selection:text-black">

      {/* --- AMBIENT NEON GLOWS --- */}
      <div className="fixed top-0 right-1/4 w-96 h-96 bg-[#ccff00]/10 blur-[140px] rounded-full pointer-events-none -z-10 animate-pulse" />
      <div className="fixed bottom-1/4 left-1/4 w-[28rem] h-[28rem] bg-purple-600/10 blur-[150px] rounded-full pointer-events-none -z-10" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[30rem] bg-cyan-500/5 blur-[160px] rounded-full pointer-events-none -z-10" />

      {/* --- FLOATING HEADER --- */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-[#050505]/75 border-b border-white/10 px-4 md:px-8 py-3.5 transition-all">
        <div className="max-w-6xl mx-auto flex items-center justify-between">

          {/* لوگو و عنوان */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <img
                src="/Logo.png"
                alt="Binger Logo"
                className="h-9 sm:h-11 w-auto object-contain transition-transform group-hover:scale-105 drop-shadow-[0_0_15px_rgba(204,255,0,0.3)]"
              />
            </div>
          </Link>

          {/* پیوندهای میانی هدر (در دسکتاپ) */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-gray-300">
            <Link href="/landing" className="hover:text-[#ccff00] transition-colors flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ccff00] animate-ping" />
              <span>جام بینجر و رزرو آیدی</span>
            </Link>
            <a href="#features" className="hover:text-[#ccff00] transition-colors">
              ویژگی‌های کلیدی
            </a>
            <Link href="/blog" className="hover:text-[#ccff00] transition-colors flex items-center gap-1">
              <span>مجله سینمایی</span>
              <BookOpen size={14} className="text-[#ccff00]" />
            </Link>
            <Link href="/dashboard/explore" className="hover:text-[#ccff00] transition-colors flex items-center gap-1">
              <span>کاوش سریال‌ها</span>
              <Compass size={14} className="text-[#ccff00]" />
            </Link>
          </nav>

          {/* اکشن ورود / داشبورد */}
          <div className="flex items-center gap-3">
            {loading ? (
              <div className="w-24 h-9 bg-white/10 rounded-xl animate-pulse" />
            ) : user ? (
              <Link href="/dashboard">
                <button className="bg-[#ccff00] hover:bg-[#b3e600] text-black text-xs font-black px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(204,255,0,0.35)] flex items-center gap-2 active:scale-95 cursor-pointer">
                  <User size={16} />
                  <span>ورود به داشبورد</span>
                </button>
              </Link>
            ) : (
              <Link href="/login">
                <button className="bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-bold px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl transition-all flex items-center gap-2 active:scale-95 cursor-pointer">
                  <span>ورود / عضویت</span>
                  <ArrowLeft size={14} />
                </button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center pt-8 md:pt-14 pb-16 px-4 overflow-hidden">

        {/* دیواره پوستر شناور متحرک در پس‌زمینه (Cinematic Marquee Wall) */}
        <div className="absolute inset-0 z-0 opacity-25 grayscale-[30%] brightness-[0.45] pointer-events-none overflow-hidden select-none">
          {/* ردیف اول */}
          <div className="absolute -top-16 -left-32 w-[240%] flex gap-4 rotate-[8deg] animate-marquee-slow">
            {[...displayPosters, ...displayPosters, ...displayPosters].map((src, i) => (
              <div
                key={`hero-r1-${i}`}
                className="w-36 h-52 sm:w-48 sm:h-72 bg-white/5 rounded-2xl overflow-hidden shrink-0 border border-white/10 shadow-2xl transition-transform"
              >
                <img src={src} className="w-full h-full object-cover" alt="TV Poster" loading="lazy" />
              </div>
            ))}
          </div>

          {/* ردیف دوم */}
          <div className="absolute top-52 sm:top-64 -left-32 w-[240%] flex gap-4 rotate-[8deg] animate-marquee-reverse">
            {[...displayPosters, ...displayPosters, ...displayPosters].map((src, i) => (
              <div
                key={`hero-r2-${i}`}
                className="w-36 h-52 sm:w-48 sm:h-72 bg-white/5 rounded-2xl overflow-hidden shrink-0 border border-white/10 shadow-2xl transition-transform"
              >
                <img src={src} className="w-full h-full object-cover" alt="TV Poster" loading="lazy" />
              </div>
            ))}
          </div>

          {/* ماسک گرادینت تاریک تئاتری برای خوانایی عالی */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/85 to-[#050505]/75" />
          <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#050505]/70 to-[#050505]" />
        </div>

        {/* محتوای متنی و اکشن‌های هیرو */}
        <div className="relative z-10 w-full max-w-3xl text-center space-y-6 sm:space-y-8 my-auto">

          {/* بج پروموشن یا رویداد */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link
              href="/landing"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-[#ccff00]/40 text-xs font-bold text-gray-200 transition-all shadow-[0_0_20px_rgba(204,255,0,0.15)] group"
            >
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ccff00] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ccff00]" />
              </span>
              <span className="text-[#ccff00] font-black">رویداد زنده:</span>
              <span>رزرو آیدی سینمایی، پیش‌ثبت‌نام و جوایز میلیونی</span>
              <ArrowLeft size={13} className="text-[#ccff00] group-hover:-translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          {/* تیتر اصلی و توضیحات پویا با قابلیت ویرایش مستقیم درون‌متنی */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="space-y-4"
          >
            <EditableText
              settingKey="home_hero_title"
              initialValue={heroTitle}
              isAdmin={isAdmin}
              as="h1"
              multiline
              description="تیتر اصلی بخش هیرو در صفحه نخست"
              className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.2] md:leading-[1.15] tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#ccff00] via-emerald-300 to-cyan-300 drop-shadow-[0_0_35px_rgba(204,255,0,0.35)] block text-center"
            />

            <EditableText
              settingKey="home_hero_subtitle"
              initialValue={heroSubtitle}
              isAdmin={isAdmin}
              as="p"
              multiline
              description="توضیحات و زیرعنوان بخش هیرو در صفحه نخست"
              className="text-gray-300 text-sm sm:text-base md:text-lg leading-relaxed max-w-xl mx-auto pt-2 font-medium block text-center"
            />
          </motion.div>

          {/* دکمه‌های فراخوان (CTA پویا) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2 max-w-md mx-auto"
          >
            {loading ? (
              <div className="w-full h-14 bg-white/10 rounded-2xl animate-pulse" />
            ) : user ? (
              <Link href="/dashboard" className="w-full sm:w-auto flex-1">
                <button className="w-full bg-[#ccff00] hover:bg-[#b3e600] text-black py-4 px-8 rounded-2xl font-black text-base transition-all active:scale-95 flex items-center justify-center gap-2.5 shadow-[0_0_30px_rgba(204,255,0,0.45)] cursor-pointer">
                  <Play size={20} className="fill-black" />
                  <span>ورود به مرکز تماشا</span>
                </button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="w-full sm:w-auto flex-1">
                  <button className="w-full bg-[#ccff00] hover:bg-[#b3e600] text-black py-4 px-8 rounded-2xl font-black text-base transition-all active:scale-95 flex items-center justify-center gap-2.5 shadow-[0_0_30px_rgba(204,255,0,0.45)] group cursor-pointer">
                    <EditableText
                      settingKey="home_cta_text"
                      initialValue={ctaText}
                      isAdmin={isAdmin}
                      as="span"
                      description="متن دکمه شروع در هیرو"
                      className="font-black text-base"
                    />
                    <ArrowLeft size={18} className="group-hover:-translate-x-1.5 transition-transform" />
                  </button>
                </Link>

                <Link href="/dashboard/explore" className="w-full sm:w-auto">
                  <button className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/15 py-4 px-6 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer">
                    <Compass size={18} className="text-[#ccff00]" />
                    <span>مشاهده ترندها</span>
                  </button>
                </Link>
              </>
            )}
          </motion.div>

          {/* مزایای اطمینان‌بخش زیر دکمه */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-3 text-[11px] text-gray-400 font-bold">
            <span className="flex items-center gap-1.5 text-gray-300">
              <Check size={14} className="text-[#ccff00]" strokeWidth={3} />
              <span>همیشه ۱۰۰٪ رایگان</span>
            </span>
            <span className="flex items-center gap-1.5 text-gray-300">
              <Check size={14} className="text-[#ccff00]" strokeWidth={3} />
              <span>بدون هرگونه تبلیغات آزاردهنده</span>
            </span>
            <span className="flex items-center gap-1.5 text-gray-300">
              <Check size={14} className="text-[#ccff00]" strokeWidth={3} />
              <span>پوشش انیمه، کی‌دراما و شاهکارهای جهان</span>
            </span>
          </div>

        </div>

      </section>

      {/* --- LIVE STATS STRIP --- */}
      <section className="relative z-10 border-y border-white/10 bg-white/[0.02] backdrop-blur-md py-6 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-[#ccff00] font-mono tracking-tight">+۵۰,۰۰۰</div>
            <div className="text-xs text-gray-400 font-medium">اپیزود ردیابی‌شده توسط کاربران</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono tracking-tight">۱۶ سبک</div>
            <div className="text-xs text-gray-400 font-medium">تخصص و هویت سینمایی اختصاصی</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-purple-400 font-mono tracking-tight">۱۰۰٪</div>
            <div className="text-xs text-gray-400 font-medium">نقدها و تحلیل‌های بدون اسپویل</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight">دستیار Mood</div>
            <div className="text-xs text-gray-400 font-medium">پیشنهاد هوش مصنوعی مطابق حس لحظه‌ای</div>
          </div>
        </div>
      </section>

      {/* --- INTERACTIVE BENTO GRID (ابر‌قدرت‌های بینجر) --- */}
      <section id="features" className="relative z-10 py-20 px-4 md:px-8 max-w-6xl mx-auto space-y-12">

        {/* سربرگ بخش ویژگی‌ها */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ccff00]/10 border border-[#ccff00]/30 text-[#ccff00] text-xs font-black">
            <Sparkles size={14} />
            <span>امکانات نسل بعدی</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white">
            چرا بینجر خانه ابدی خوره‌های سریال است؟
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm">
            تمام ابزارهایی که یک سریال‌بین حرفه‌ای به آن‌ها احتیاج دارد، در یک پلتفرم منسجم و چشم‌نواز گرد هم آمده‌اند.
          </p>
        </div>

        {/* بنتو گرید ۴ تایی مدرن */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">

          {/* کارت ۱ (عرض ۲ ستون): نوبت تماشا و تقویم اختصاصی */}
          <div className="md:col-span-2 bg-[#0e0e0e] border border-white/10 hover:border-[#ccff00]/40 rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group transition-all shadow-xl hover:shadow-[0_0_30px_rgba(204,255,0,0.1)]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#ccff00]/5 blur-[80px] rounded-full pointer-events-none" />

            <div className="space-y-3 relative z-10">
              <span className="text-xs font-black text-[#ccff00] bg-[#ccff00]/10 px-3 py-1 rounded-lg inline-block">
                ⚡ نوبت تماشا و تقویم پخش
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                دیگه یادت نمیره فصل قبل کجا تموم شد!
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-lg">
                با الگوریتم «نوبت تماشا»، هر بار که وارد بینجر می‌شی، دقیقاً اپیزود بعدی سریالی که در حال دیدنش هستی جلو روت قرار می‌گیره. به همراه تقویم زنده پخش اپیزودهای جدید امروز و این هفته.
              </p>
            </div>

            {/* موک‌آپ تصویری زنده داخل کارت */}
            <div className="mt-6 pt-4 border-t border-white/5 relative z-10 bg-black/60 rounded-2xl p-4 border border-white/10">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-16 rounded-xl bg-purple-900/40 border border-white/15 overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold">
                    🎬
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-black text-white block truncate">Breaking Bad</span>
                    <span className="text-xs font-mono text-[#ccff00] font-bold">S05E14 • Ozymandias</span>
                    <div className="w-32 sm:w-48 h-1.5 bg-white/15 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-[#ccff00] w-[88%]" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300 px-2 py-1 rounded-lg hidden sm:inline">
                    پخش هفته آینده ⏰
                  </span>
                  <div className="w-9 h-9 rounded-full bg-[#ccff00] text-black flex items-center justify-center font-bold shadow-md cursor-pointer hover:scale-105 transition-transform">
                    <Check size={16} strokeWidth={3} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* کارت ۲ (۱ ستون): هویت و DNA سینمایی */}
          <div className="bg-[#0e0e0e] border border-white/10 hover:border-purple-500/40 rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group transition-all shadow-xl hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]">
            <div className="absolute top-0 left-0 w-48 h-48 bg-purple-600/10 blur-[70px] rounded-full pointer-events-none" />

            <div className="space-y-3 relative z-10">
              <span className="text-xs font-black text-purple-400 bg-purple-500/10 px-3 py-1 rounded-lg inline-block">
                🧬 هویت و DNA سینمایی
              </span>
              <h3 className="text-xl font-black text-white">
                تخصص فیلم‌بازیت چیه؟
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                بینجر بر اساس ساعت‌ها تماشای سریال، هویت ۱۶ گانه سینمایی تو رو تحلیل می‌کنه؛ مثل «فوق تخصص بریکینگ‌بدولوژی» یا «دکتر کی‌دراما»، با کارت گرافیکی آماده استوری اینستاگرام!
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 relative z-10 text-center">
              <div className="p-3.5 bg-gradient-to-tr from-purple-950/40 to-black/60 rounded-2xl border border-purple-500/30 text-xs font-bold text-purple-300 flex items-center justify-center gap-2">
                <span>🧪 فوق‌تخصص بریکینگ‌بدولوژی</span>
                <span className="text-[10px] bg-purple-500/20 px-2 py-0.5 rounded-full">استوری آماده 📸</span>
              </div>
            </div>
          </div>

          {/* کارت ۳ (۱ ستون): دستیار هوش مصنوعی Mood */}
          <div className="bg-[#0e0e0e] border border-white/10 hover:border-cyan-500/40 rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group transition-all shadow-xl hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]">
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-cyan-500/10 blur-[70px] rounded-full pointer-events-none" />

            <div className="space-y-3 relative z-10">
              <span className="text-xs font-black text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-lg inline-block">
                🤖 دستیار هوشمند Mood
              </span>
              <h3 className="text-xl font-black text-white">
                «حالم گرفته است، چی ببینم؟»
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                به زبان خودمانی احساست رو بنویس. هوش مصنوعی بینجر با در نظر گرفتن سریال‌هایی که قبلاً دیدی، دقیقاً اثری رو بهت پیشنهاد می‌ده که حالتو بسازه؛ بدون هیچ اسپویلی!
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 relative z-10">
              <div className="bg-black/60 p-3 rounded-2xl border border-white/10 text-[11px] text-gray-300 space-y-1.5">
                <div className="text-gray-400">👤 کاربر: «یه چیز تو مایه ترو دیتکتیو می‌خوام...»</div>
                <div className="text-[#ccff00] font-bold">🤖 بینجر: «پیشنهاد من Mindhunter و Mare of Easttown!»</div>
              </div>
            </div>
          </div>

          {/* کارت ۴ (۲ ستون): کلاب منتقدین و نقد بدون اسپویل */}
          <div className="md:col-span-2 bg-[#0e0e0e] border border-white/10 hover:border-amber-500/40 rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group transition-all shadow-xl hover:shadow-[0_0_30px_rgba(245,158,11,0.1)]">
            <div className="absolute top-0 left-0 w-64 h-64 bg-amber-500/5 blur-[80px] rounded-full pointer-events-none" />

            <div className="space-y-3 relative z-10">
              <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-3 py-1 rounded-lg inline-block">
                🪶 باشگاه منتقدین رسمی بینجر
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                نقد بخون، بدون اینکه داستان برات بسوزه
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-lg">
                تنها کاربرانی که به حدنصاب تماشای ۳۰۰۰ اپیزود و تحلیل‌های عمیق می‌رسند، نشان رسمی منتقد بینجر را دریافت می‌کنند. تمام نقدها با برچسب‌های شفاف «شاهکار ماندگار»، «پیشنهاد تماشا» یا «سلیقه‌ای» علامت‌گذاری می‌شوند.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 relative z-10 flex flex-wrap items-center gap-3">
              <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-bold flex items-center gap-1.5">
                <Trophy size={14} />
                <span>شاهکار ماندگار 🏆</span>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-[#ccff00]/15 border border-[#ccff00]/30 text-[#ccff00] text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                <span>۱۰۰٪ بدون اسپویل</span>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-xs font-bold">
                تأیید صلاحیت با سنجش تخصص
              </div>
            </div>
          </div>

        </div>

      </section>

      {/* --- BOTTOM CTA CALLOUT BANNER --- */}
      <section className="relative z-10 py-16 px-4 md:px-8 max-w-5xl mx-auto">
        <div className="relative rounded-3xl p-8 sm:p-12 bg-gradient-to-tr from-[#121212] via-[#1a1a1a] to-[#121212] border border-[#ccff00]/40 text-center overflow-hidden shadow-[0_0_50px_rgba(204,255,0,0.15)]">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#ccff00]/15 blur-[100px] rounded-full pointer-events-none" />

          <div className="relative z-10 space-y-5 max-w-xl mx-auto">
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white">
              آماده‌ای پرونده سریالیت رو <br />
              <span className="text-[#ccff00]">حرفه‌ای و لذت‌بخش</span> کنی؟
            </h3>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              عضویت کمتر از ۳۰ ثانیه طول می‌کشه. بدون نیاز به نصب هیچ برنامه اضافی، در تمام دستگاه‌ها (موبایل و کامپیوتر) همیشه همراهته.
            </p>

            <div className="pt-2">
              <Link href={user ? "/dashboard" : "/login"}>
                <button className="bg-[#ccff00] hover:bg-[#b3e600] text-black py-4 px-10 rounded-2xl font-black text-base transition-all shadow-[0_0_30px_rgba(204,255,0,0.4)] active:scale-95 inline-flex items-center gap-2 cursor-pointer">
                  <span>{user ? "ورود به داشبورد من" : ctaText}</span>
                  <ArrowLeft size={20} />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="relative z-10 border-t border-white/10 bg-[#050505] py-8 px-4 md:px-8 text-center text-xs text-gray-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-right">
            <div className="flex items-center gap-2">
              <img src="/Logo.png" alt="Binger" className="h-8 w-auto object-contain opacity-80" />
              <span className="font-bold text-gray-400">بینجر • Binger</span>
            </div>
            {footerDescription && (
              <span className="hidden sm:inline text-gray-600">|</span>
            )}
            {footerDescription && (
              <EditableText
                settingKey="footer_description"
                initialValue={footerDescription}
                isAdmin={isAdmin}
                as="p"
                description="متن کوتاه معرفی در فوتر"
                className="text-[11px] text-gray-400 max-w-md"
              />
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 text-gray-400 font-medium">
            <Link href="/landing" className="hover:text-[#ccff00] transition-colors">جام بینجر</Link>
            <Link href="/dashboard/explore" className="hover:text-[#ccff00] transition-colors">کاوش سریال‌ها</Link>
            <Link href="/dashboard/critics" className="hover:text-[#ccff00] transition-colors">باشگاه منتقدین</Link>
            <Link href="/login" className="hover:text-[#ccff00] transition-colors">حساب کاربری</Link>
          </div>

          <EditableText
            settingKey="footer_copyright"
            initialValue={footerCopyright}
            isAdmin={isAdmin}
            as="p"
            description="متن کپی‌رایت انتهای صفحات"
            className="text-[11px] text-gray-500"
          />
        </div>
      </footer>

    </div>
  );
}
