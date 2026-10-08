"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Play,
  Check,
  BookOpen,
  Film,
  Compass,
  ShieldCheck,
  Flame,
  Clock,
  Sparkles,
  Tv,
  Radio,
  SlidersHorizontal,
  ChevronLeft
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
    <div dir="rtl" className="min-h-screen w-full bg-[#050505] text-neutral-100 font-['Vazirmatn'] selection:bg-[#ccff00] selection:text-black">

      {/* --- CINEMA ARCHIVE MASTHEAD & TOP BAR --- */}
      <div className="w-full bg-[#050505] border-b border-white/[0.08] text-[11px] font-mono text-neutral-400 py-1.5 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-block w-1.5 h-1.5 bg-[#ccff00]" />
            <span className="tracking-wider text-neutral-300 font-bold">بینجر // پلتفرم هوشمند مدیریت و کشف سریال</span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-neutral-500">
            <span>نسخه ۲۰۲۶</span>
            <span>•</span>
            <span>سرویس ابری پایدار</span>
          </div>
        </div>
      </div>

      {/* --- SHARP ARCHITECTURAL NAVIGATION --- */}
      <header className="sticky top-0 z-50 w-full bg-[#050505]/95 backdrop-blur-md border-b border-white/10 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">

          {/* Logo & Direct Links */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 group focus:outline-none">
              <img
                src="/Logo.png"
                alt="Binger Logo"
                className="h-8 w-auto object-contain transition-transform group-hover:scale-105"
              />
            </Link>

            <nav className="hidden md:flex items-center text-xs font-semibold text-neutral-300 divide-x divide-x-reverse divide-white/10">
              <Link
                href="/landing"
                className="px-4 py-2 hover:text-[#ccff00] transition-colors flex items-center gap-2 text-white"
              >
                <Radio size={13} className="text-[#ccff00]" />
                <span>جام بینجر و رزرو آیدی</span>
              </Link>
              <a
                href="#features"
                className="px-4 py-2 hover:text-white transition-colors text-neutral-400"
              >
                میز فرمان و قابلیت‌ها
              </a>
              <Link
                href="/blog"
                className="px-4 py-2 hover:text-white transition-colors text-neutral-400 flex items-center gap-1.5"
              >
                <BookOpen size={13} />
                <span>مجله سینمایی</span>
              </Link>
              <Link
                href="/dashboard/explore"
                className="px-4 py-2 hover:text-white transition-colors text-neutral-400 flex items-center gap-1.5"
              >
                <Compass size={13} />
                <span>کاوش عناوین</span>
              </Link>
            </nav>
          </div>

          {/* Auth Action */}
          <div className="flex items-center gap-3">
            {loading ? (
              <div className="w-24 h-9 bg-neutral-900 border border-white/10 rounded-sm animate-pulse" />
            ) : user ? (
              <Link href="/dashboard">
                <button className="bg-[#ccff00] hover:bg-[#b8e600] active:scale-[0.98] text-black text-xs font-black px-5 py-2.5 rounded-sm transition-all flex items-center gap-2 cursor-pointer">
                  <User size={14} />
                  <span>میز فرمان من</span>
                </button>
              </Link>
            ) : (
              <Link href="/login">
                <button className="bg-transparent hover:bg-white/[0.06] text-white border border-white/20 hover:border-white/40 text-xs font-bold px-4 py-2 rounded-sm transition-all flex items-center gap-2 cursor-pointer">
                  <span>ورود / عضویت</span>
                  <ArrowLeft size={13} />
                </button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* --- HERO SECTION: COMMANDING EDITORIAL ARCHITECTURE --- */}
      <section className="relative pt-12 sm:pt-20 pb-16 sm:pb-24 px-4 sm:px-8 border-b border-white/10 overflow-hidden">

        {/* Ambient Filmic Filmstrip Track (Subdued, Strictly Horizontal, Zero 8-deg Tilt) */}
        <div className="absolute inset-0 z-0 opacity-15 brightness-[0.3] pointer-events-none select-none overflow-hidden">
          <div className="absolute top-1/2 -translate-y-1/2 -left-10 w-[220%] flex gap-2 animate-marquee-slow">
            {[...displayPosters, ...displayPosters, ...displayPosters].map((src, i) => (
              <div
                key={`hero-film-${i}`}
                className="w-28 h-44 sm:w-36 sm:h-56 bg-neutral-950 shrink-0 border border-white/10 overflow-hidden"
              >
                <img src={src} className="w-full h-full object-cover grayscale" alt="Cinema Poster" loading="lazy" />
              </div>
            ))}
          </div>
          {/* Filmic Vignette Mask */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-[#050505]/85" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-transparent to-[#050505]" />
        </div>

        {/* Hero Content Stack */}
        <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center text-center">

          {/* Issue/Live Marker (Sharp Architectural Bracket, NO PINGS, NO PILLS) */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <Link
              href="/landing"
              className="inline-flex items-center gap-3 px-3 py-1.5 border border-white/15 bg-black hover:border-[#ccff00] text-xs font-mono text-neutral-300 transition-colors group"
            >
              <span className="text-[#ccff00] font-bold">[ رویداد زنده ]</span>
              <span className="text-white font-medium">جام بینجر و رزرو آیدی اختصاصی</span>
              <span className="text-neutral-500 font-sans group-hover:text-white transition-colors">←</span>
            </Link>
          </motion.div>

          {/* Primary Editorial Headline: Crisp Pure White, Zero Rainbow Gradient */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-full max-w-4xl"
          >
            <EditableText
              settingKey="home_hero_title"
              initialValue={heroTitle}
              isAdmin={isAdmin}
              as="h1"
              multiline
              description="تیتر اصلی بخش هیرو در صفحه نخست"
              className="text-4xl sm:text-6xl md:text-7xl lg:text-[5rem] font-black leading-[1.08] sm:leading-[1.05] tracking-tight text-white block text-center"
            />

            <EditableText
              settingKey="home_hero_subtitle"
              initialValue={heroSubtitle}
              isAdmin={isAdmin}
              as="p"
              multiline
              description="توضیحات و زیرعنوان بخش هیرو در صفحه نخست"
              className="text-neutral-300 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto mt-6 font-normal block text-center"
            />
          </motion.div>

          {/* Focal Action Bar: Clear Unambiguous Hierarchy */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md mx-auto"
          >
            {loading ? (
              <div className="w-full h-14 bg-neutral-900 border border-white/10 rounded-sm animate-pulse" />
            ) : user ? (
              <Link href="/dashboard" className="w-full sm:w-auto flex-1">
                <button className="w-full bg-[#ccff00] hover:bg-[#b8e600] active:scale-[0.99] text-black py-4 px-8 rounded-sm font-black text-base transition-all flex items-center justify-center gap-3 cursor-pointer">
                  <Play size={18} className="fill-black" />
                  <span>ورود به میز فرمان من</span>
                </button>
              </Link>
            ) : (
              <>
                {/* Primary High-Contrast CTA Button */}
                <Link href="/login" className="w-full sm:w-auto flex-1">
                  <button className="w-full bg-[#ccff00] hover:bg-[#b8e600] active:scale-[0.99] text-black py-4 px-8 rounded-sm font-black text-base transition-all flex items-center justify-center gap-3 cursor-pointer group">
                    <EditableText
                      settingKey="home_cta_text"
                      initialValue={ctaText}
                      isAdmin={isAdmin}
                      as="span"
                      description="متن دکمه شروع در هیرو"
                      className="font-black text-base text-black"
                    />
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                  </button>
                </Link>

                {/* Secondary Action */}
                <Link href="/dashboard/explore" className="w-full sm:w-auto">
                  <button className="w-full bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200 border border-white/20 py-4 px-6 rounded-sm font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer">
                    <Compass size={16} className="text-neutral-400" />
                    <span>مشاهده ترندها</span>
                  </button>
                </Link>
              </>
            )}
          </motion.div>

          {/* Cinema Proof Strip: Clean Metadata Line */}
          <div className="mt-10 pt-6 border-t border-white/10 w-full max-w-xl flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs font-mono text-neutral-300">
            <span className="flex items-center gap-2">
              <span className="text-[#ccff00]">✓</span>
              <span>شروع ۱۰۰٪ رایگان</span>
            </span>
            <span className="text-neutral-700 hidden sm:inline">|</span>
            <span className="flex items-center gap-2">
              <span className="text-[#ccff00]">✓</span>
              <span>بدون تبلیغات آزاردهنده</span>
            </span>
            <span className="text-neutral-700 hidden sm:inline">|</span>
            <span className="flex items-center gap-2">
              <span className="text-[#ccff00]">✓</span>
              <span>پوشش جامع سریال‌های جهان</span>
            </span>
          </div>

        </div>
      </section>

      {/* --- METRICS LEDGER: INDUSTRIAL FULL-WIDTH GAUGE (NO CARDS) --- */}
      <section className="relative z-10 bg-[#080808] border-b border-white/10">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-white/10">

          <div className="p-6 sm:p-8 space-y-2">
            <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">آرشیو جامع</div>
            <div className="text-xs text-neutral-300">ردیابی و مدیریت هزاران اپیزود سریال</div>
          </div>

          <div className="p-6 sm:p-8 space-y-2">
            <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">۱۶ سبک</div>
            <div className="text-xs text-neutral-300">هویت و تحلیل تخصصی سلیقه</div>
          </div>

          <div className="p-6 sm:p-8 space-y-2">
            <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">سپر اسپویل</div>
            <div className="text-xs text-neutral-300">تحلیل‌های تفکیک‌شده بدون افشای داستان</div>
          </div>

          <div className="p-6 sm:p-8 space-y-2">
            <div className="text-3xl sm:text-4xl font-black text-[#ccff00] font-mono tracking-tight">رادار مود</div>
            <div className="text-xs text-neutral-300">پیشنهاد هوشمند طبق حس لحظه</div>
          </div>

        </div>
      </section>

      {/* --- ARCHITECTURAL CONSOLE (BREAKING FREE FROM BENTO CARDS) --- */}
      <section id="features" className="relative z-10 py-20 px-4 sm:px-8 max-w-7xl mx-auto">

        {/* Section Header */}
        <div className="border-b border-white/10 pb-10 mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
              میز فرمان سینمایی بینجر
            </h2>
            <p className="text-neutral-400 text-sm sm:text-base leading-relaxed">
              جایگزین یادداشت‌های پراکنده، اکسل و جستجوهای فرسایشی. ۴ ابزار اختصاصی برای کسانی که جدی سریال می‌بینند.
            </p>
          </div>
          <div className="text-xs text-neutral-400 font-bold bg-white/5 border border-white/10 px-3 py-1.5 rounded-full w-fit">
            هسته هوشمند بینجر
          </div>
        </div>

        {/* MASTER CONSOLE ROW 1: Wide Airing Slate (Feature 01) */}
        <div className="border border-white/10 bg-[#080808] mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-white/10 items-stretch">

            {/* Left Content Column */}
            <div className="lg:col-span-5 p-6 sm:p-10 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h3 className="text-2xl sm:text-3xl font-black text-white leading-snug">
                  نوبت تماشا: دیگر گم نمی‌کنی فصل قبل کجا بودی
                </h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  با الگوریتم «نوبت تماشا»، هر بار که وارد بینجر می‌شوی دقیقاً اپیزود بعدی سریالی که در حال دیدنش هستی جلو روت قرار می‌گیرد، همراه با تقویم زنده پخش اپیزودهای جدید امروز و این هفته.
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center gap-6 text-xs text-neutral-400">
                <span className="text-[#ccff00]">● همگام‌سازی لحظه‌ای</span>
                <span>•</span>
                <span>پایش هوشمند فصل‌ها</span>
              </div>
            </div>

            {/* Right Live Timeline Widget (Integrated, NO Card-in-Card) */}
            <div className="lg:col-span-7 p-6 sm:p-10 bg-black flex flex-col justify-center space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-xs text-neutral-400 font-medium">اپیزود در حال تماشا</span>
                <span className="font-mono text-xs text-[#ccff00]">پخش اپیزود جدید: فردا ۲۱:۳۰</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black text-white">Breaking Bad</span>
                    <span className="font-mono text-xs text-neutral-400 bg-neutral-900 border border-white/10 px-2 py-0.5">TV-MA</span>
                  </div>
                  <div className="font-mono text-sm text-[#ccff00]">فصل ۵ · قسمت ۱۴ // Ozymandias</div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-left font-mono text-xs text-neutral-500">
                    <div>وضعیت تماشا</div>
                    <div className="text-white font-bold">۸۵٪ تکمیل</div>
                  </div>
                  <button className="bg-[#ccff00] hover:bg-[#b8e600] text-black px-4 py-2.5 font-mono text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors">
                    <Check size={14} strokeWidth={3} />
                    <span>ثبت تماشا</span>
                  </button>
                </div>
              </div>

              {/* Progress Scrubber */}
              <div className="space-y-2">
                <div className="w-full h-1.5 bg-neutral-900 overflow-hidden">
                  <div className="h-full bg-[#ccff00] w-[85%]" />
                </div>
                <div className="flex justify-between font-mono text-[11px] text-neutral-500">
                  <span>اپیزود ۱۴ از ۱۶</span>
                  <span>زمان کل تماشا: ۴۸ ساعت و ۳۰ دقیقه</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* MASTER CONSOLE ROW 2: 3 Structural Columns (Features 02, 03, 04 - NO Cards) */}
        <div className="border border-white/10 bg-[#080808] grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-white/10">

          {/* Column 01: DNA & Persona */}
          <div className="p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <h3 className="text-xl font-black text-white">
                شناسنامه و هویت سینمایی اختصاصی
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                بینجر بر اساس ساعت‌ها تماشای سریال، هویت ۱۶ گانه سینمایی تو را تحلیل می‌کند؛ با کارت شناسنامه گرافیکی آماده استوری.
              </p>
            </div>

            <div className="border-t border-white/10 pt-4 space-y-3 font-mono text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>تخصص احراز‌شده:</span>
                <span className="text-[#ccff00] font-bold">فوق‌تخصص بریکینگ‌بدولوژی</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>نشان تحلیلی:</span>
                <span className="text-white">نشان طلایی منتقد</span>
              </div>
              <div className="flex justify-between text-neutral-500">
                <span>شناسه پاسپورت:</span>
                <span>#BNG-9481</span>
              </div>
            </div>
          </div>

          {/* Column 02: Mood AI Assistant */}
          <div className="p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <h3 className="text-xl font-black text-white">
                دستیار هوشمند بر اساس حس لحظه
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                حس و حال الانت رو به زبان خودمانی بنویس. هوش مصنوعی بدون اسپویل اثری را پیشنهاد می‌دهد که با ذائقه گذشته‌ات هم‌خوانی دارد.
              </p>
            </div>

            <div className="border-t border-white/10 pt-4 space-y-3 font-mono text-xs">
              <div className="text-neutral-400 text-[11px]">
                <span className="text-neutral-500">پرامپت:</span> «یه چیز معمایی تاریک مثل ترو دیتکتیو...»
              </div>
              <div className="bg-black border border-white/10 p-2.5 flex items-center justify-between">
                <span className="text-white font-bold">Chernobyl // مینی‌سریال</span>
                <span className="text-[#ccff00] font-bold">۹۸٪ تطابق</span>
              </div>
            </div>
          </div>

          {/* Column 03: Spoiler-Free Ledger */}
          <div className="p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <h3 className="text-xl font-black text-white">
                باشگاه منتقدین بدون افشای داستان
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                تنها تحلیل‌گرانی که به حدنصاب تماشا رسیده‌اند نشان رسمی دریافت می‌کنند. سیستم غربال هوشمند هرگز پایان داستان را لو نمی‌دهد.
              </p>
            </div>

            <div className="border-t border-white/10 pt-4 space-y-3 font-mono text-xs">
              <div className="flex items-center gap-2 text-white">
                <ShieldCheck size={16} className="text-[#ccff00]" />
                <span className="font-bold">تأییدیه ۱۰۰٪ بدون اسپویل</span>
              </div>
              <div className="text-[11px] text-neutral-500">
                برچسب‌های شفاف: شاهکار ماندگار • پیشنهاد تماشا • سلیقه‌ای
              </div>
            </div>
          </div>

        </div>

      </section>

      {/* --- FULL-WIDTH CINEMATIC CALLOUT (NO FLOATING ROUNDED CARDS) --- */}
      <section className="relative z-10 border-y border-white/10 bg-[#080808] py-20 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            آماده‌ای پرونده سریالیت را <br />
            <span className="text-[#ccff00]">حرفه‌ای و منظم</span> مدیریت کنی؟
          </h3>
          <p className="text-neutral-400 text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
            عضویت کمتر از ۳۰ ثانیه طول می‌کشد. بدون نیاز به نصب برنامه اضافی، در تمام دستگاه‌ها (موبایل و کامپیوتر) همیشه در دسترس است.
          </p>

          <div className="pt-4">
            <Link href={user ? "/dashboard" : "/login"}>
              <button className="bg-[#ccff00] hover:bg-[#b8e600] active:scale-[0.99] text-black py-4 px-12 rounded-sm font-black text-base transition-all inline-flex items-center gap-3 cursor-pointer group">
                <span>{user ? "ورود به میز فرمان من" : ctaText}</span>
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* --- ARCHITECTURAL FOOTER --- */}
      <footer className="relative z-10 bg-[#050505] py-12 px-4 sm:px-8 text-xs text-neutral-400 font-mono border-t border-white/10">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">

            {/* Brand */}
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right">
              <div className="flex items-center gap-3">
                <img src="/Logo.png" alt="لوگوی بینجر" className="h-7 w-auto object-contain opacity-90" />
                <span className="font-bold text-neutral-200 font-sans">بینجر • Binger</span>
              </div>
              {footerDescription && (
                <span className="hidden sm:inline text-neutral-700">|</span>
              )}
              {footerDescription && (
                <EditableText
                  settingKey="footer_description"
                  initialValue={footerDescription}
                  isAdmin={isAdmin}
                  as="p"
                  description="متن کوتاه معرفی در فوتر"
                  className="text-[11px] text-neutral-300 font-sans max-w-md"
                />
              )}
            </div>

            {/* Navigation & Legal Links */}
            <div className="flex flex-wrap items-center justify-center gap-5 text-neutral-300 text-xs">
              <Link href="/landing" className="hover:text-white transition-colors">جام بینجر</Link>
              <Link href="/dashboard/explore" className="hover:text-white transition-colors">کاوش سریال‌ها</Link>
              <Link href="/dashboard/critics" className="hover:text-white transition-colors">باشگاه منتقدین</Link>
              <Link href="/terms" className="hover:text-[#ccff00] transition-colors font-bold">قوانین و مقررات</Link>
              <Link href="/privacy" className="hover:text-[#ccff00] transition-colors font-bold">حریم خصوصی</Link>
              <Link href="/cookies" className="hover:text-[#ccff00] transition-colors font-bold">سیاست کوکی‌ها</Link>
            </div>
          </div>

          {/* TMDB Attribution & Legal Disclaimer Bar */}
          <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-400 font-sans">
            <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-right">
              <span className="text-neutral-300 font-bold">سلب مسئولیت رسانه:</span>
              <span>بینجر فایل ویدیویی میزبانی نمی‌کند. کلیه ابرداده‌ها و تصاویر از API وب‌سایت TMDB دریافت شده‌اند.</span>
            </div>

            <div className="flex items-center gap-4 text-neutral-400 font-mono">
              <span>پشتیبانی: support@binger.ir</span>
            </div>
          </div>

          {/* Copyright */}
          <div className="flex justify-between items-center text-[11px] text-neutral-400 border-t border-white/5 pt-4">
            <EditableText
              settingKey="footer_copyright"
              initialValue={footerCopyright}
              isAdmin={isAdmin}
              as="p"
              description="متن کپی‌رایت انتهای صفحات"
              className="text-[11px] text-neutral-400"
            />
            <span>نسخه ۲۰۲۶</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
