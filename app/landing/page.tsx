"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Sparkles, ArrowLeft, Loader2, CheckCircle, Trophy, 
  Crown, Flame, Star, Gift, Share2, Copy, Check, Tv, Play, 
  Clock, ShieldCheck, ChevronDown, MessageSquare, Heart, 
  Zap, Award, Compass, Search, Smartphone, ExternalLink
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { validateIranPhoneNumber } from '@/lib/validation/phone';
import type { User } from '@supabase/supabase-js';
import Link from 'next/link';
import Image from 'next/image';
import confetti from 'canvas-confetti';

interface LeaderboardUser {
  rank: number;
  username: string;
  avatar: string;
  redeem_code: string;
  invites_count: number;
  phone_masked: string;
  prize: string;
}

const CINEMATIC_USERNAMES = [
  { name: 'Heisenberg', show: 'بریکینگ بد', icon: '⚗️' },
  { name: 'Shelby', show: 'پیکی بلایندرز', icon: '🎩' },
  { name: 'RustCohle', show: 'کاراگاه حقیقی', icon: '🚬' },
  { name: 'TonySoprano', show: 'سوپرانوز', icon: '🥩' },
  { name: 'JonSnow', show: 'بازی تاج و تخت', icon: '🐺' },
  { name: 'Dexter', show: 'دکستر', icon: '💉' },
  { name: 'Geralt', show: 'ویچر', icon: '⚔️' },
  { name: 'DonCorleone', show: 'پدرخوانده', icon: '🌹' },
  { name: 'Lalo', show: 'بتر کال ساول', icon: '🌮' },
  { name: 'Neo', show: 'ماتریکس', icon: '🕶️' },
  { name: 'Batman', show: 'شوالیه تاریکی', icon: '🦇' },
  { name: 'TylerDurden', show: 'فایت کلاب', icon: '🧼' },
  { name: 'Daenerys', show: 'مادر اژدها', icon: '🐉' },
  { name: 'SaulGoodman', show: 'قانون‌دان زیرک', icon: '⚖️' },
];

function LandingContent() {
  const supabase = createClient();
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [redeemCode, setRedeemCode] = useState("");
  const [consent, setConsent] = useState(true);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState("");
  const [assignedCode, setAssignedCode] = useState<string | null>(null);
  const [assignedUsername, setAssignedUsername] = useState<string | null>(null);
  const [isEarlyVip, setIsEarlyVip] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // لیدربورد جام دعوت
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [totalRegistered, setTotalRegistered] = useState(12);
  const [remainingVipSlots, setRemainingVipSlots] = useState(38);
  const [leaderboardSearch, setLeaderboardSearch] = useState("");
  const [activeTab, setActiveTab] = useState<'queue' | 'mood' | 'hub' | 'badges'>('queue');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // خواندن پارامتر ریدیم کد از URL در صورت وجود (?ref=CODE)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const refParam = urlParams.get('ref') || urlParams.get('code');
      if (refParam) {
        setRedeemCode(refParam.toUpperCase());
      }
    }
  }, []);

  // چک کردن لاگین فعلی کاربر
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);
      } catch {
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    checkUser();
  }, [supabase.auth]);

  // دریافت اطلاعات لیدربورد جام بینجر
  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/waitlist');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLeaderboard(data.leaderboard || []);
          setTotalRegistered(data.totalRegistered || 12);
          setRemainingVipSlots(data.remainingVipSlots ?? 38);
        }
      }
    } catch (e) {
      console.error("Leaderboard fetch error:", e);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const triggerCelebration = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ccff00', '#22d3ee', '#ffffff', '#ffd700']
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setStatus('idle');

    const phoneValidation = validateIranPhoneNumber(phone);
    if (!phoneValidation.isValid) {
      setStatus('error');
      setMessage(phoneValidation.error || "شماره موبایل نامعتبر است (مثلاً ۰۹۱۲۳۴۵۶۷۸۹)");
      return;
    }

    if (!consent) {
      setStatus('error');
      setMessage("لطفاً موافقت با دریافت پیامک را تایید کنید.");
      return;
    }

    setStatus('loading');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneValidation.normalizedPhone,
          username: username.trim(),
          redeemCode: redeemCode.trim(),
          consent: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setStatus('error');
          setMessage("این شماره تماس قبلاً در لیست انتظار ثبت شده است.");
          if (data.redeemCode) {
            setAssignedCode(data.redeemCode);
            setAssignedUsername(data.username || username);
          }
          return;
        }
        setStatus('error');
        setMessage(data.error || "مشکلی در ثبت‌نام پیش آمد. لطفاً دوباره تلاش کنید.");
        return;
      }

      setStatus('success');
      setMessage(data.message || "تبریک، جایگاه و یوزرنیم شما با موفقیت رزرو شد!");
      setAssignedCode(data.redeemCode);
      setAssignedUsername(data.username);
      setIsEarlyVip(Boolean(data.isEarlyAdopter));
      triggerCelebration();
      fetchLeaderboard();
    } catch {
      setStatus('error');
      setMessage("خطا در برقراری ارتباط با سرور. لطفاً اتصال اینترنت خود را بررسی کنید.");
    }
  };

  const inviteLink = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    return assignedCode ? `${origin}/landing?ref=${assignedCode}` : `${origin}/landing`;
  }, [assignedCode]);

  const copyToClipboard = (text: string, type: 'link' | 'code') => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const filteredLeaderboard = useMemo(() => {
    if (!leaderboardSearch.trim()) return leaderboard;
    const q = leaderboardSearch.trim().toLowerCase();
    return leaderboard.filter(item => 
      item.username.toLowerCase().includes(q) || 
      item.redeem_code.toLowerCase().includes(q)
    );
  }, [leaderboard, leaderboardSearch]);

  const FAQS = [
    {
      q: 'بینجر دقیقاً چه کاری انجام میده؟',
      a: 'بینجر یک دستیار هوشمند و شبکه اجتماعی اختصاصی سریال است. با بینجر اپیزودهایی که دیدید رو تیک می‌زنید، نوبت تماشا و تقویم اختصاصی دارید، نسخه هوش مصنوعی بر اساس مود دریافت می‌کنید و بدون ترس از لو رفتن داستان، در تالار گفتگو و نظرسنجی هر قسمت شرکت می‌کنید.'
    },
    {
      q: 'بج و اشتراک Early Adopter VIP به چه کسانی تعلق می‌گیرد؟',
      a: 'تنها ۵۰ نفر اولی که شماره خود را در این پیش‌ثبت‌نام وارد کنند، به صورت دائمی نشان طلایی Early Adopter VIP دریافت می‌کنند و به تمامی امکانات پلتفرم از جمله هوش مصنوعی بدون محدودیت دسترسی خواهند داشت.'
    },
    {
      q: 'جام دعوت و ریدیم کدها چگونه کار می‌کند؟',
      a: 'با ثبت‌نام در بینجر، یک ریدیم کد اختصاصی مثل BINGER-SHELBY دریافت می‌کنید. لینک اختصاصی خود را برای دوستان اهل فیلم و سریالتان بفرستید. به ازای هر نفری که با کد شما وارد شود، ۱ امتیاز در جدول می‌گیرید. در روز لانچ رسمی: به ۳ نفر اول ۶ ماه اشتراک رایگان کامل و به ۱۰ نفر بعدی ۳ ماه اشتراک رایگان به همراه بج پرمیوم اهدا می‌شود.'
    },
    {
      q: 'چرا رزرو یوزرنیم سینمایی اهمیت دارد؟',
      a: 'در بینجر تمام یوزرنیم‌ها یکتا و انحصاری هستند. با رزرو زودهنگام می‌توانید اسم کاراکترهای اسطوره‌ای دنیای سینما و تلویزیون مثل Heisenberg یا Shelby را به نام خودتان سند بزنید تا بعد از انتشار عمومی در دسترس دیگران نباشد.'
    },
    {
      q: 'آیا ثبت‌نام رایگان است؟',
      a: 'بله، پیش‌ثبت‌نام کاملاً رایگان است و شماره شما با بالاترین استانداردهای امنیتی فقط برای اطلاع‌رسانی زمان لانچ و فعال‌سازی اکانت رزرو شده استفاده خواهد شد.'
    }
  ];

  return (
    <div dir="rtl" className="min-h-screen w-full bg-[#050505] text-white font-['Vazirmatn'] overflow-x-hidden selection:bg-[#ccff00] selection:text-black flex flex-col relative">
      
      {/* هاله‌های نور نئونی پس‌زمینه */}
      <div className="fixed top-[-15%] right-[-10%] w-[600px] h-[600px] bg-[#ccff00]/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed top-[30%] left-[-15%] w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[20%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[130px] pointer-events-none z-0" />

      {/* ========================================================================= */}
      {/* نوبار و هدر اصلی */}
      {/* ========================================================================= */}
      <header className="sticky top-0 w-full z-50 backdrop-blur-xl bg-[#050505]/75 border-b border-white/5 px-4 sm:px-8 py-3.5 flex justify-between items-center transition-all">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group cursor-pointer">
            <Image 
              src="/Logo.png" 
              alt="بینجر" 
              width={120} 
              height={40} 
              className="h-8 sm:h-9 w-auto object-contain drop-shadow-[0_0_15px_rgba(204,255,0,0.3)] transition-transform group-hover:scale-105" 
              priority 
            />
          </Link>
          <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-bold bg-[#ccff00]/10 text-[#ccff00] border border-[#ccff00]/20 px-2.5 py-0.5 rounded-full">
            <Sparkles size={11} /> پیش‌ثبت‌نام رسمی (Pre-Launch)
          </span>
        </div>

        {/* منوی سریع و دکمه ورود */}
        <div className="flex items-center gap-3">
          <a href="#leaderboard-section" className="hidden sm:flex items-center gap-1.5 text-xs text-gray-300 hover:text-[#ccff00] font-bold px-3 py-1.5 rounded-xl hover:bg-white/5 transition-colors">
            <Trophy size={14} className="text-[#ccff00]" />
            <span>جام دعوت</span>
          </a>

          <a href="#features-section" className="hidden sm:flex items-center gap-1.5 text-xs text-gray-300 hover:text-cyan-400 font-bold px-3 py-1.5 rounded-xl hover:bg-white/5 transition-colors">
            <Smartphone size={14} className="text-cyan-400" />
            <span>امکانات اپ</span>
          </a>

          {authLoading ? (
            <div className="h-9 w-24 bg-white/10 rounded-full animate-pulse" />
          ) : user ? (
            <Link 
              href="/dashboard" 
              className="bg-[#ccff00] text-black text-xs font-black px-4 py-2 rounded-full hover:bg-[#b3e600] transition-all flex items-center gap-1.5 shadow-[0_0_20px_rgba(204,255,0,0.4)] cursor-pointer"
            >
              <span>ورود به داشبورد</span>
              <ArrowLeft size={14} strokeWidth={2.5} />
            </Link>
          ) : (
            <a 
              href="#register-box" 
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2 rounded-full border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>رزرو یوزرنیم</span>
              <ArrowLeft size={14} />
            </a>
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* بخش هیرو (HERO SECTION) */}
      {/* ========================================================================= */}
      <section className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-16 flex flex-col items-center text-center">
        
        {/* نشانگر زنده سقف ۵۰ نفر */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/10 via-[#ccff00]/10 to-amber-500/10 border border-[#ccff00]/30 rounded-full px-4 py-1.5 mb-6 shadow-[0_0_25px_rgba(204,255,0,0.2)]"
        >
          <Flame size={16} className="text-amber-400 animate-bounce" />
          <span className="text-xs sm:text-sm font-bold text-gray-200">
            تنها <strong className="text-[#ccff00] font-mono text-sm sm:text-base mx-1">{remainingVipSlots}</strong> جایگاه از ۵۰ اشتراک VIP رایگان باقی مانده است!
          </span>
          <Crown size={15} className="text-[#ccff00]" />
        </motion.div>

        {/* عنوان جذاب و هوک لندینگ */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-5xl md:text-6xl font-black leading-tight sm:leading-snug max-w-4xl tracking-tight"
        >
          دستیار شخصی و هوشمندِ خوره‌های سریال؛
          <br />
          <span className="bg-gradient-to-r from-[#ccff00] via-cyan-400 to-[#ccff00] bg-clip-text text-transparent drop-shadow-md">
            یوزرنیم سینمایی‌ات را قبل از بقیه رزرو کن!
          </span>
        </motion.h1>

        {/* توضیحات هدف */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-gray-400 text-sm sm:text-lg max-w-2xl mt-4 sm:mt-6 leading-relaxed"
        >
          ردیابی دقیق اپیزودها بدون ترس از اسپویل، نسخه هوش مصنوعی برای خلق‌و‌خوی شما و تالار نقد هر قسمت.
          <br className="hidden sm:inline" />
          <strong> ۵۰ نفر اولی که ثبت‌نام کنند</strong> بج دائمی <span className="text-[#ccff00] font-bold">Early Adopter VIP</span> هدیه می‌گیرند!
        </motion.p>

        {/* ========================================================================= */}
        {/* کادر تعاملی پیش‌ثبت‌نام (FORM BOX) */}
        {/* ========================================================================= */}
        <motion.div 
          id="register-box"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-xl mt-8 sm:mt-10 bg-[#121212]/90 border border-white/15 rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-2xl text-right relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-transparent via-[#ccff00] to-transparent" />
          
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Crown size={18} className="text-[#ccff00]" />
                رزرو زودهنگام و دریافت بج VIP
              </h2>
              <span className="text-[11px] text-gray-400">بدون نیاز به پرداخت، جایگاهت در جامعه بینجر محفوظ می‌شود.</span>
            </div>
            <span className="text-xs bg-[#ccff00]/15 text-[#ccff00] font-mono font-bold px-2.5 py-1 rounded-lg">
              ۱۰۰٪ رایگان
            </span>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            
            {/* ۱. ورودی شماره موبایل */}
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                شماره موبایل شما <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input 
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09123456789"
                  disabled={status === 'loading'}
                  className="w-full bg-[#080808] border border-white/15 rounded-2xl px-4 py-3.5 text-white text-sm font-mono focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 focus:outline-none transition-all placeholder:text-gray-600"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none">
                  🇮🇷
                </span>
              </div>
            </div>

            {/* ۲. ورودی یوزرنیم دلخواه */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-gray-300">
                  نام کاربری دلخواه شما در بینجر
                </label>
                <span className="text-[10px] text-cyan-400 font-bold">رزرو یکتا و ماندگار</span>
              </div>
              <input 
                type="text"
                dir="ltr"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="مثلاً: Heisenberg یا Shelby"
                disabled={status === 'loading'}
                className="w-full bg-[#080808] border border-white/15 rounded-2xl px-4 py-3.5 text-white text-sm font-bold focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 focus:outline-none transition-all placeholder:text-gray-600"
              />

              {/* پیشنهادهای یوزرنیم‌های محبوب سینما */}
              <div className="mt-2.5">
                <span className="text-[10px] text-gray-400 block mb-1.5">پیشنهادهای طلایی دنیای سینما (کلیک کنید تا درج شود):</span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                  {CINEMATIC_USERNAMES.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setUsername(item.name)}
                      className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                        username === item.name
                          ? 'bg-[#ccff00] text-black border-[#ccff00] font-black scale-105'
                          : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ۳. ورودی ریدیم کد (معرف) */}
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                کد معرف یا ریدیم کد (اختیاری)
              </label>
              <input 
                type="text"
                dir="ltr"
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                placeholder="BINGER-SHELBY"
                disabled={status === 'loading'}
                className="w-full bg-[#080808] border border-white/15 rounded-2xl px-4 py-3 text-white text-xs font-mono uppercase focus:border-amber-400 focus:outline-none transition-all placeholder:text-gray-600"
              />
              {redeemCode && (
                <span className="text-[10px] text-amber-400 font-bold block mt-1">
                  ✓ با این کد معرف، در جام دعوت امتیاز برای معرف ثبت خواهد شد.
                </span>
              )}
            </div>

            {/* موافقت با پیامک */}
            <div className="flex items-center gap-2 pt-1">
              <input 
                type="checkbox"
                id="consent-check"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="rounded border-gray-700 bg-gray-900 text-[#ccff00] focus:ring-[#ccff00] cursor-pointer"
              />
              <label htmlFor="consent-check" className="text-[11px] text-gray-400 cursor-pointer">
                موافقم که هنگام انتشار عمومی اپلیکیشن و اعلام برندگان، از طریق پیامک مطلع شوم.
              </label>
            </div>

            {/* دکمه ارسال فرم */}
            <button 
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-[#ccff00] hover:bg-[#b3e600] active:scale-[0.98] text-black font-black text-sm sm:text-base py-4 rounded-2xl transition-all shadow-[0_0_25px_rgba(204,255,0,0.35)] flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="animate-spin text-black" size={20} />
                  <span>در حال اعتبارسنجی و رزرو جایگاه...</span>
                </>
              ) : (
                <>
                  <Zap size={18} strokeWidth={3} className="fill-black" />
                  <span>رزرو آنی یوزرنیم و دریافت بج VIP</span>
                </>
              )}
            </button>
          </form>

          {/* پیام‌های وضعیت */}
          {message && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 p-3.5 rounded-2xl text-xs font-bold border flex items-center gap-2 ${
                status === 'success' 
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                  : 'bg-red-500/15 border-red-500/30 text-red-400'
              }`}
            >
              {status === 'success' ? <CheckCircle size={16} /> : <Flame size={16} />}
              <span>{message}</span>
            </motion.div>
          )}

          {/* کارت موفقیت و اشتراک ریدیم کد اختصاصی */}
          {assignedCode && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-5 p-4 rounded-2xl bg-white/[0.04] border border-[#ccff00]/40 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  <Trophy size={14} className="text-[#ccff00]" />
                  ریدیم کد اختصاصی شما برای جام دعوت:
                </span>
                {isEarlyVip && (
                  <span className="text-[10px] bg-gradient-to-r from-amber-400 to-[#ccff00] text-black font-black px-2 py-0.5 rounded-full">
                    👑 بج VIP فعال شد
                  </span>
                )}
              </div>

              {/* کادر کد */}
              <div className="flex items-center justify-between bg-black/60 border border-white/10 p-2.5 rounded-xl">
                <span className="font-mono text-sm font-black text-[#ccff00] ltr">{assignedCode}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(assignedCode, 'code')}
                  className="bg-white/10 hover:bg-white/20 text-xs px-3 py-1 rounded-lg text-white font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  {copiedCode ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedCode ? 'کپی شد' : 'کپی کد'}</span>
                </button>
              </div>

              {/* لینک دعوت مستقیم */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(inviteLink, 'link')}
                  className="flex-1 bg-[#ccff00] text-black text-xs font-black py-2.5 rounded-xl hover:bg-[#b3e600] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedLink ? <Check size={14} /> : <Share2 size={14} />}
                  <span>{copiedLink ? 'لینک دعوت کپی شد!' : 'کپی لینک اختصاصی دعوت'}</span>
                </button>

                <a 
                  href={`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(`سلام! من در بینجر یوزرنیمم رو رزرو کردم. بیا با کد معرف من ثبت‌نام کن تا هر دو بج و اشتراک رایگان بگیریم: ${assignedCode}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 border border-sky-500/30 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                >
                  تلگرام
                </a>
              </div>
              <p className="text-[10px] text-gray-400 text-center">
                به ازای هر دوستی که با این لینک یا کد ثبت‌نام کند، ۱ امتیاز در جام بینجر کسب می‌کنید!
              </p>
            </motion.div>
          )}

        </motion.div>
      </section>

      {/* ========================================================================= */}
      {/* بنر جوایز ۵۰ نفر اول (50 FIRST USERS VIP CARD) */}
      {/* ========================================================================= */}
      <section className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-gradient-to-r from-amber-500/10 via-[#ccff00]/10 to-cyan-500/10 border border-[#ccff00]/30 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-right">
              <span className="text-[11px] font-black text-amber-400 uppercase tracking-widest block flex items-center justify-center md:justify-start gap-1">
                <Crown size={14} /> امتیاز اختصاصی ۵۰ کاربر نخست
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                بج دائمی Early Adopter VIP + اشتراک ویژه
              </h3>
              <p className="text-xs sm:text-sm text-gray-300 max-w-xl leading-relaxed">
                ۵۰ نفری که سریع‌تر ثبت‌نام کنند، علاوه بر قفل کردن یوزرنیم دلخواه، نشان افتخار طلایی مؤسسین بینجر (Founder Badge)، دسترسی نامحدود به دکتر بینجر و اشتراک ویژه بدون تبلیغات را برای همیشه دریافت می‌کنند.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 shrink-0 w-full sm:w-auto">
              <div className="bg-black/60 border border-white/10 rounded-2xl p-4 text-center">
                <span className="text-2xl block mb-1">👑</span>
                <span className="text-xs font-black text-white block">بج VIP طلایی</span>
                <span className="text-[10px] text-gray-400">ماندگار در پروفایل</span>
              </div>
              <div className="bg-black/60 border border-white/10 rounded-2xl p-4 text-center">
                <span className="text-2xl block mb-1">⚡</span>
                <span className="text-xs font-black text-white block">AI نامحدود</span>
                <span className="text-[10px] text-gray-400">بدون سقف روزانه</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* اسکرین‌ها و ویژگی‌های اپلیکیشن (INTERACTIVE FEATURE TOUR) */}
      {/* ========================================================================= */}
      <section id="features-section" className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-16">
        
        <div className="text-center space-y-3 mb-10">
          <span className="text-xs font-black text-cyan-400 uppercase tracking-wider block">تجربه کاربری بی‌نظیر</span>
          <h2 className="text-2xl sm:text-4xl font-black text-white">چرا بینجر با بقیه اپ‌ها فرق دارد؟</h2>
          <p className="text-xs sm:text-sm text-gray-400 max-w-lg mx-auto">
            امکاناتی که منحصراً برای خوره‌های سریال طراحی شده تا لذت تماشا چند برابر شود.
          </p>
        </div>

        {/* سوییچ تب‌های تعاملی */}
        <div className="flex justify-center gap-2 sm:gap-3 mb-8 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'queue'
                ? 'bg-[#ccff00] text-black shadow-[0_0_20px_rgba(204,255,0,0.3)] font-black'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/5'
            }`}
          >
            <Play size={15} />
            <span>نوبت تماشا و پروگرس‌بار</span>
          </button>

          <button
            onClick={() => setActiveTab('mood')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'mood'
                ? 'bg-[#ccff00] text-black shadow-[0_0_20px_rgba(204,255,0,0.3)] font-black'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/5'
            }`}
          >
            <Sparkles size={15} />
            <span>دکتر بینجر (هوش مصنوعی)</span>
          </button>

          <button
            onClick={() => setActiveTab('hub')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'hub'
                ? 'bg-[#ccff00] text-black shadow-[0_0_20px_rgba(204,255,0,0.3)] font-black'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/5'
            }`}
          >
            <MessageSquare size={15} />
            <span>تالار نقد بدون اسپویل</span>
          </button>

          <button
            onClick={() => setActiveTab('badges')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'badges'
                ? 'bg-[#ccff00] text-black shadow-[0_0_20px_rgba(204,255,0,0.3)] font-black'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/5'
            }`}
          >
            <Award size={15} />
            <span>۳۵ نشان افتخار</span>
          </button>
        </div>

        {/* محتوای تب فعال با شبیه‌ساز واقعی اپ */}
        <div className="bg-[#121212]/90 border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
          <AnimatePresence mode="wait">
            
            {/* تب ۱: نوبت تماشا و پروگرس بار */}
            {activeTab === 'queue' && (
              <motion.div 
                key="queue-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
              >
                <div className="lg:col-span-5 space-y-4">
                  <div className="inline-flex items-center gap-1.5 bg-[#ccff00]/10 text-[#ccff00] border border-[#ccff00]/20 px-3 py-1 rounded-full text-xs font-bold">
                    <Play size={12} /> مدیریت هوشمند دیده‌ها
                  </div>
                  <h3 className="text-xl sm:text-3xl font-black text-white leading-snug">
                    هیچ‌وقت یادت نمیره تا کدوم قسمت دیدی!
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                    با پروگرس‌بار هوشمند نئونی بینجر، در تمامی بخش‌های سایت (سرچ، کاوش، ترندها و لیست‌ها) درصد تماشای خودت رو می‌بینی. دکمه تیک آنی، بدون لودینگ نوبت قسمت بعد رو در صف تماشا قرار میده.
                  </p>
                  <ul className="space-y-2 text-xs text-gray-300">
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-[#ccff00]" />
                      <span>پروگرس بار سبز لایم برای سریال‌های ۱۰۰٪ کامل‌شده</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-cyan-400" />
                      <span>نوار فیروزه‌ای برای سریال‌های در حال تماشا</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-amber-400" />
                      <span>تقویم هوشمند پخش قسمت بعدی (امروز، این هفته، به‌زودی)</span>
                    </li>
                  </ul>
                </div>

                {/* موکاپ زنده کارت‌های سریال بینجر */}
                <div className="lg:col-span-7 space-y-3 bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-inner">
                  
                  {/* نمونه کارت سریال ۱ */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#161616] border border-white/5 hover:border-[#ccff00]/30 transition-all">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-16 rounded-xl bg-purple-900/40 border border-white/10 flex items-center justify-center text-xl shrink-0 font-bold">
                        🧪
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-black text-white block truncate">Breaking Bad</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-mono font-bold text-[#ccff00]">S05E14</span>
                          <span className="text-gray-600 text-xs">•</span>
                          <span className="text-[11px] text-gray-400 font-mono">۶۰/۶۲ قسمت دیده شده</span>
                        </div>
                        {/* پروگرس بار کوچک */}
                        <div className="w-36 h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                          <div className="h-full bg-cyan-400 rounded-full" style={{ width: '96%' }} />
                        </div>
                      </div>
                    </div>
                    <button className="w-10 h-10 rounded-full flex items-center justify-center bg-[#ccff00] text-black font-black shadow-md cursor-pointer hover:scale-105 transition-transform">
                      <Check size={18} strokeWidth={3} />
                    </button>
                  </div>

                  {/* نمونه کارت سریال ۲ */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#161616] border border-white/5 hover:border-emerald-400/30 transition-all">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-16 rounded-xl bg-blue-900/40 border border-white/10 flex items-center justify-center text-xl shrink-0 font-bold">
                        👑
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-black text-white block truncate">Succession</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-mono font-bold text-emerald-400">✓ کامل شده</span>
                          <span className="text-gray-600 text-xs">•</span>
                          <span className="text-[11px] text-gray-400 font-mono">۳۹/۳۹ قسمت</span>
                        </div>
                        <div className="w-36 h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                          <div className="h-full bg-[#ccff00] rounded-full shadow-[0_0_8px_#ccff00]" style={{ width: '100%' }} />
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2.5 py-1 rounded-lg">
                      ۱۰۰٪ تماشا
                    </span>
                  </div>

                </div>
              </motion.div>
            )}

            {/* تب ۲: دکتر بینجر هوش مصنوعی */}
            {activeTab === 'mood' && (
              <motion.div 
                key="mood-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
              >
                <div className="lg:col-span-5 space-y-4">
                  <div className="inline-flex items-center gap-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3 py-1 rounded-full text-xs font-bold">
                    <Sparkles size={12} /> نسخه دارویی سینمایی
                  </div>
                  <h3 className="text-xl sm:text-3xl font-black text-white leading-snug">
                    نمی‌دونی چی ببینی؟ دکتر بینجر نسخه می‌پیچه!
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                    با ۱۶ تخصص پزشکی-سینمایی مثل «فوق تخصص قهقهه» یا «جراح مغز و اعصاب تعلیق»، دقیقاً بر اساس حال و هوای روحی‌ات بهترین فیلم یا سریال با لینک تماشای قانونی تجویز میشه.
                  </p>
                  <div className="flex gap-2 pt-2">
                    <span className="bg-white/5 px-2.5 py-1 rounded-lg text-xs text-gray-300">فیلیمو</span>
                    <span className="bg-white/5 px-2.5 py-1 rounded-lg text-xs text-gray-300">نماوا</span>
                    <span className="bg-white/5 px-2.5 py-1 rounded-lg text-xs text-gray-300">فیلم‌نت</span>
                  </div>
                </div>

                <div className="lg:col-span-7 bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 space-y-3">
                  <div className="border-b border-white/10 pb-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🩺</span>
                      <div>
                        <span className="text-xs font-black text-white block">نسخه رسمی دکتر بینجر</span>
                        <span className="text-[10px] text-cyan-400">بیمار: شما | تشخیص: نیاز به ترشح آدرنالین شدید</span>
                      </div>
                    </div>
                    <span className="text-xs bg-[#ccff00]/10 text-[#ccff00] font-mono px-2 py-0.5 rounded">Rx #9284</span>
                  </div>

                  <div className="bg-[#161616] p-4 rounded-xl border border-white/5 space-y-2">
                    <span className="text-xs font-black text-white">داروی تجویزی: Severance (جداسازی)</span>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      دستور مصرف: روزی ۱ اپیزود قبل از خواب با نور کم. این سریال با فضای وهم‌آلود اداری سطح هیجان و کنجکاوی ذهنی شما را به اوج می‌رساند.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* تب ۳: تالار نقد بدون اسپویل */}
            {activeTab === 'hub' && (
              <motion.div 
                key="hub-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
              >
                <div className="lg:col-span-5 space-y-4">
                  <div className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-bold">
                    <ShieldCheck size={12} /> ضد اسپویل ۱۰۰٪ هوشمند
                  </div>
                  <h3 className="text-xl sm:text-3xl font-black text-white leading-snug">
                    تالار نقد و نظرسنجی اختصاصی برای هر اپیزود
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                    تا وقتی یک اپیزود رو تماشا نکرده باشید، نظرات اون اپیزود قفله تا هیچ داستانی براتون لو نره! بعد از تماشا، می‌تونید ری‌اکشن احساسی بدید و به بهترین بازیگر قسمت رای بدید.
                  </p>
                </div>

                <div className="lg:col-span-7 bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 space-y-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-gray-300">ری‌اکشن‌های واقعی کاربران به این قسمت:</span>
                    <span className="text-[10px] text-emerald-400">۱,۴۲۰ رای ثبت‌شده</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2 text-center">
                    <div className="bg-[#161616] p-2 rounded-xl border border-white/5">
                      <span className="text-xl block mb-1">🤯</span>
                      <span className="text-xs font-mono font-bold text-[#ccff00]">۶۲٪</span>
                    </div>
                    <div className="bg-[#161616] p-2 rounded-xl border border-white/5">
                      <span className="text-xl block mb-1">🔥</span>
                      <span className="text-xs font-mono font-bold text-cyan-400">۲۴٪</span>
                    </div>
                    <div className="bg-[#161616] p-2 rounded-xl border border-white/5">
                      <span className="text-xl block mb-1">😭</span>
                      <span className="text-xs font-mono font-bold text-gray-400">۸٪</span>
                    </div>
                    <div className="bg-[#161616] p-2 rounded-xl border border-white/5">
                      <span className="text-xl block mb-1">🤩</span>
                      <span className="text-xs font-mono font-bold text-gray-400">۴٪</span>
                    </div>
                    <div className="bg-[#161616] p-2 rounded-xl border border-white/5">
                      <span className="text-xl block mb-1">😴</span>
                      <span className="text-xs font-mono font-bold text-gray-400">۲٪</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* تب ۴: ۳۵ نشان افتخار */}
            {activeTab === 'badges' && (
              <motion.div 
                key="badges-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
              >
                <div className="lg:col-span-5 space-y-4">
                  <div className="inline-flex items-center gap-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1 rounded-full text-xs font-bold">
                    <Trophy size={12} /> گیمیفیکیشن و کلکسیون مدال‌ها
                  </div>
                  <h3 className="text-xl sm:text-3xl font-black text-white leading-snug">
                    ۳۵ نشان افتخار انحصاری برای حرفه‌ای‌ها
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                    با تماشای سریال‌ها در نیمه‌شب، نوشتن نقد، کامل کردن ماراتن‌ها و دعوت از دوستان، نشان‌های منحصربه‌فرد باز کنید و در لیدربورد پروفایلتان بدرخشید.
                  </p>
                </div>

                <div className="lg:col-span-7 grid grid-cols-3 sm:grid-cols-4 gap-2.5 bg-[#0a0a0a] border border-white/10 rounded-2xl p-4">
                  <div className="bg-[#161616] border border-[#ccff00]/40 rounded-xl p-3 text-center">
                    <span className="text-2xl block mb-1">🍿</span>
                    <span className="text-xs font-black text-white block">تودوم</span>
                    <span className="text-[9px] text-[#ccff00]">اولین اپیزود</span>
                  </div>
                  <div className="bg-[#161616] border border-cyan-400/40 rounded-xl p-3 text-center">
                    <span className="text-2xl block mb-1">🚜</span>
                    <span className="text-xs font-black text-white block">تراکتور</span>
                    <span className="text-[9px] text-cyan-400">۵۰ قسمت</span>
                  </div>
                  <div className="bg-[#161616] border border-amber-400/40 rounded-xl p-3 text-center">
                    <span className="text-2xl block mb-1">🦇</span>
                    <span className="text-xs font-black text-white block">خفاش شب</span>
                    <span className="text-[9px] text-amber-400">ماراتن نیمه‌شب</span>
                  </div>
                  <div className="bg-[#161616] border border-purple-400/40 rounded-xl p-3 text-center">
                    <span className="text-2xl block mb-1">👑</span>
                    <span className="text-xs font-black text-white block">بینجر واقعی</span>
                    <span className="text-[9px] text-purple-400">۵۰۰ قسمت</span>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* جدول جام دعوت و مسابقه ریدیم کدها (CUP & LEADERBOARD SECTION) */}
      {/* ========================================================================= */}
      <section id="leaderboard-section" className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-16">
        
        <div className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-[#ccff00]/20 border border-[#ccff00]/30 px-3.5 py-1.5 rounded-full text-xs font-bold text-gray-200">
            <Trophy size={14} className="text-amber-400" /> جام بزرگ پیش‌ثبت‌نام بینجر
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            دوستانت رو دعوت کن، اشتراک رایگان ببر!
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 max-w-xl mx-auto leading-relaxed">
            با ریدیم کد اختصاصی خودت هر چه افراد بیشتری رو به اپلیکیشن بیاری، رتبه‌ات در جام بالا میره و جوایز ارزشمند زیر رو در روز لانچ رسمی دریافت می‌کنی:
          </p>
        </div>

        {/* کارت‌های ۳ سطح جوایز */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          
          {/* جایزه نفرات ۱ تا ۳ */}
          <div className="bg-gradient-to-b from-amber-500/20 to-[#121212] border border-amber-500/40 rounded-3xl p-5 text-center relative overflow-hidden shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3 text-2xl font-black">
              🥇
            </div>
            <span className="text-xs font-black text-amber-400 block mb-1">رتبه‌های ۱ تا ۳</span>
            <h4 className="text-base sm:text-lg font-black text-white">۶ ماه اشتراک رایگان VIP</h4>
            <p className="text-[11px] text-gray-300 mt-2">
              دسترسی کامل و نامحدود به تمامی امکانات + بج طلایی قهرمان جام بینجر
            </p>
          </div>

          {/* جایزه نفرات ۴ تا ۱۳ */}
          <div className="bg-gradient-to-b from-cyan-500/20 to-[#121212] border border-cyan-500/40 rounded-3xl p-5 text-center relative overflow-hidden shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-3 text-2xl font-black">
              🥈
            </div>
            <span className="text-xs font-black text-cyan-400 block mb-1">۱۰ نفر بعدی (رتبه‌های ۴ تا ۱۳)</span>
            <h4 className="text-base sm:text-lg font-black text-white">۳ ماه اشتراک رایگان + بج پرمیوم</h4>
            <p className="text-[11px] text-gray-300 mt-2">
              اشتراک رایگان ۳ ماهه به همراه نشان نقره‌ای پرمیوم در پروفایل
            </p>
          </div>

          {/* جایزه ۵۰ نفر اول */}
          <div className="bg-gradient-to-b from-[#ccff00]/15 to-[#121212] border border-[#ccff00]/30 rounded-3xl p-5 text-center relative overflow-hidden shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-[#ccff00]/20 text-[#ccff00] flex items-center justify-center mx-auto mb-3 text-2xl font-black">
              🎖️
            </div>
            <span className="text-xs font-black text-[#ccff00] block mb-1">همه ۵۰ نفر اول</span>
            <h4 className="text-base sm:text-lg font-black text-white">بج دائمی Early Adopter</h4>
            <p className="text-[11px] text-gray-300 mt-2">
              رزرو یوزرنیم اختصاصی سینمایی و نشان ماندگار عضو مؤسس در اکانت
            </p>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* جدول لیدربورد زنده */}
        {/* ========================================================================= */}
        <div className="bg-[#121212] border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4 mb-5">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Trophy size={18} className="text-[#ccff00]" />
                جدول زنده رقابت جام بینجر
              </h3>
              <span className="text-[11px] text-gray-400">رتبه‌بندی بر اساس بیشترین تعداد کاربر جذب شده با ریدیم کد</span>
            </div>

            {/* جستجو در جدول */}
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text"
                value={leaderboardSearch}
                onChange={(e) => setLeaderboardSearch(e.target.value)}
                placeholder="جستجوی یوزرنیم یا ریدیم کد..."
                className="w-full bg-[#080808] border border-white/15 rounded-xl pr-9 pl-3 py-2 text-xs text-white focus:border-[#ccff00] focus:outline-none"
              />
            </div>
          </div>

          {/* ردیف‌های جدول */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 font-bold text-[11px]">
                  <th className="py-3 px-3">رتبه</th>
                  <th className="py-3 px-3">کاربر</th>
                  <th className="py-3 px-3">ریدیم کد</th>
                  <th className="py-3 px-3 text-center">تعداد دعوت</th>
                  <th className="py-3 px-3">وضعیت جایزه</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLeaderboard.map((item) => {
                  const isTop3 = item.rank <= 3;
                  const isTop13 = item.rank > 3 && item.rank <= 13;

                  return (
                    <tr 
                      key={item.redeem_code}
                      className={`hover:bg-white/[0.03] transition-colors ${
                        item.rank === 1 ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      {/* رتبه */}
                      <td className="py-3 px-3 font-mono font-bold">
                        {item.rank === 1 ? (
                          <span className="inline-flex items-center gap-1 text-amber-400 font-black">
                            🥇 ۱
                          </span>
                        ) : item.rank === 2 ? (
                          <span className="inline-flex items-center gap-1 text-cyan-400 font-black">
                            🥈 ۲
                          </span>
                        ) : item.rank === 3 ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 font-black">
                            🥉 ۳
                          </span>
                        ) : (
                          <span className="text-gray-400">#{item.rank}</span>
                        )}
                      </td>

                      {/* کاربر */}
                      <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                        <span className="text-base">{item.avatar}</span>
                        <span className="ltr font-bold text-left">{item.username}</span>
                      </td>

                      {/* ریدیم کد */}
                      <td className="py-3 px-3 font-mono text-gray-300 ltr text-right">
                        <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10 text-[10px]">
                          {item.redeem_code}
                        </span>
                      </td>

                      {/* تعداد دعوت */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-sm text-[#ccff00]">
                        {item.invites_count}
                      </td>

                      {/* جایزه */}
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isTop3 
                            ? 'bg-amber-400/15 text-amber-400 border border-amber-400/30' 
                            : isTop13 
                            ? 'bg-cyan-400/15 text-cyan-400 border border-cyan-400/30' 
                            : 'bg-white/10 text-gray-300'
                        }`}>
                          {item.prize}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {filteredLeaderboard.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500 text-xs">
                      کاربری با این مشخصات یافت نشد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-400">
            <span>تعداد کل ثبت‌نام‌کنندگان فعلی: <strong className="text-white font-mono">{totalRegistered}</strong> نفر</span>
            <a 
              href="#register-box" 
              className="text-[#ccff00] font-bold hover:underline flex items-center gap-1"
            >
              <span>می‌خواهی وارد جدول شوی؟ همین حالا ثبت‌نام کن</span>
              <ArrowLeft size={12} />
            </a>
          </div>

        </div>

      </section>

      {/* ========================================================================= */}
      {/* بخش سوالات متداول (FAQ SECTION) */}
      {/* ========================================================================= */}
      <section className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-xl sm:text-3xl font-black text-white">سوالات متداول</h2>
          <p className="text-xs text-gray-400">پاسخ به سوالاتی که ممکن است درباره پیش‌ثبت‌نام و بینجر داشته باشید.</p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div 
                key={faq.q}
                className="bg-[#121212] border border-white/10 rounded-2xl overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full p-4 sm:p-5 flex justify-between items-center text-right text-xs sm:text-sm font-bold text-white hover:text-[#ccff00] transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown 
                    size={16} 
                    className={`transition-transform duration-300 text-gray-400 ${
                      isOpen ? 'rotate-180 text-[#ccff00]' : ''
                    }`} 
                  />
                </button>
                {isOpen && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-4 sm:px-5 pb-4 sm:pb-5 text-xs text-gray-400 leading-relaxed border-t border-white/5 pt-3"
                  >
                    {faq.a}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* فوتر مدرن (FOOTER) */}
      {/* ========================================================================= */}
      <footer className="w-full border-t border-white/10 bg-[#080808] py-8 px-4 sm:px-8 mt-auto z-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Image src="/Logo.png" alt="بینجر" width={90} height={30} className="h-6 w-auto object-contain opacity-80" />
            <span>— دستیار هوشمند خوره‌های فیلم و سریال</span>
          </div>
          <div className="flex items-center gap-4 text-gray-400 text-xs">
            <a href="#register-box" className="hover:text-white transition-colors">ثبت‌نام</a>
            <a href="#leaderboard-section" className="hover:text-white transition-colors">جام دعوت</a>
            <a href="#features-section" className="hover:text-white transition-colors">امکانات</a>
          </div>
          <span className="font-mono text-[11px]">© {new Date().getFullYear()} Binger. All rights reserved.</span>
        </div>
      </footer>

    </div>
  );
}

export default function BingerLandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050505] flex items-center justify-center text-[#ccff00]">در حال بارگذاری بینجر...</div>}>
      <LandingContent />
    </Suspense>
  );
}