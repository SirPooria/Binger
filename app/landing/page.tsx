"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Sparkles, ArrowLeft, Loader2, CheckCircle, Trophy, 
  Crown, Flame, Star, Gift, Share2, Copy, Check, Tv, Play, 
  Clock, ShieldCheck, ChevronDown, MessageSquare, Heart, 
  Zap, Award, Compass, Search, Smartphone, ExternalLink,
  BarChart3, ListPlus, ThumbsUp, Calendar, Bot, Film, CheckCircle2,
  XCircle, RotateCw, Edit3, KeyRound
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { validateIranPhoneNumber, convertToAsciiDigits } from '@/lib/validation/phone';
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

export interface CinematicCharacter {
  name: string;
  show: string;
  icon: string;
}

const CINEMATIC_CHARACTERS_POOL: CinematicCharacter[] = [
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
  { name: 'JessePinkman', show: 'بریکینگ بد', icon: '💥' },
  { name: 'ArthurShelby', show: 'پیکی بلایندرز', icon: '🥃' },
  { name: 'MartyHart', show: 'کاراگاه حقیقی', icon: '🍺' },
  { name: 'TyrionLannister', show: 'بازی تاج و تخت', icon: '🍷' },
  { name: 'AryaStark', show: 'بازی تاج و تخت', icon: '🗡️' },
  { name: 'GusFring', show: 'بریکینگ بد', icon: '🍗' },
  { name: 'MichaelCorleone', show: 'پدرخوانده ۲', icon: '🇮🇹' },
  { name: 'ElliotAlderson', show: 'مستر روبات', icon: '💻' },
  { name: 'SherlockHolmes', show: 'شرلوک', icon: '🎻' },
  { name: 'Moriarty', show: 'شرلوک', icon: '♟️' },
  { name: 'RickGrimes', show: 'واکینگ دد', icon: '🤠' },
  { name: 'Negan', show: 'واکینگ دد', icon: '🏏' },
  { name: 'KendallRoy', show: 'وراثت', icon: '📈' },
  { name: 'LoganRoy', show: 'وراثت', icon: '👑' },
  { name: 'DonDraper', show: 'مد من', icon: '🥃' },
  { name: 'Eleven', show: 'چیزهای عجیب', icon: '🧇' },
  { name: 'Homelander', show: 'بویز', icon: '🦸' },
  { name: 'BillyButcher', show: 'بویز', icon: '⚡' },
  { name: 'Lucifer', show: 'لوسیفر', icon: '😈' },
  { name: 'RagnarLothbrok', show: 'وایکینگ‌ها', icon: '🪓' },
  { name: 'BoJack', show: 'بوجک هورسمن', icon: '🐴' },
  { name: 'TedLasso', show: 'تد لاسو', icon: '⚽' },
  { name: 'PatrickBateman', show: 'روانی آمریکایی', icon: '🪓' },
  { name: 'SeverusSnape', show: 'هری پاتر', icon: '🪄' },
  { name: 'JohnWick', show: 'جان ویک', icon: '🐶' },
  { name: 'Joker', show: 'شوالیه تاریکی', icon: '🃏' },
  { name: 'PaulAtreides', show: 'تل‌ماسه', icon: '🏜️' },
  { name: 'Morpheus', show: 'ماتریکس', icon: '💊' },
  { name: 'HannibalLecter', show: 'هانیبال', icon: '🍷' },
  { name: 'Loki', show: 'لوکی', icon: '⌛' },
  { name: 'ChandlerBing', show: 'فرندز', icon: '🛋️' },
  { name: 'BarneyStinson', show: 'آشنایی با مادر', icon: '👔' },
  { name: 'JackSparrow', show: 'دزدان دریایی', icon: '🏴‍☠️' },
  { name: 'Wednesday', show: 'ونزدی', icon: '🖤' },
];

function LandingContent() {
  const supabase = createClient();
  const [formStep, setFormStep] = useState<'info' | 'otp' | 'completed'>('info');
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
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

  // Taken usernames and dynamic presets
  const [takenUsernames, setTakenUsernames] = useState<string[]>([]);
  const [visiblePresets, setVisiblePresets] = useState<CinematicCharacter[]>([]);
  const [presetOffset, setPresetOffset] = useState(0);

  // Live username uniqueness validation
  const [usernameCheckStatus, setUsernameCheckStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [usernameCheckMsg, setUsernameCheckMsg] = useState('');

  // لیدربورد جام دعوت
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [totalRegistered, setTotalRegistered] = useState(25);
  const [remainingVipSlots, setRemainingVipSlots] = useState(25);
  const [leaderboardSearch, setLeaderboardSearch] = useState("");
  const [activeTab, setActiveTab] = useState<'tracker' | 'insights' | 'ai_doctor' | 'spoiler_proof' | 'custom_lists'>('tracker');
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

  // دریافت اطلاعات لیدربورد جام بینجر و یوزرهای رزرو شده
  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/waitlist');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLeaderboard(data.leaderboard || []);
          setTotalRegistered(data.totalRegistered || 25);
          setRemainingVipSlots(data.remainingVipSlots ?? 25);
          if (Array.isArray(data.takenUsernames)) {
            setTakenUsernames(data.takenUsernames);
          }
        }
      }
    } catch (e) {
      console.error("Leaderboard fetch error:", e);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  // Update visible presets whenever takenUsernames or offset changes
  useEffect(() => {
    const takenSet = new Set(takenUsernames.map(n => n.toLowerCase()));
    const available = CINEMATIC_CHARACTERS_POOL.filter(c => !takenSet.has(c.name.toLowerCase()));
    if (available.length === 0) {
      setVisiblePresets(CINEMATIC_CHARACTERS_POOL.slice(0, 10));
      return;
    }
    const start = presetOffset % available.length;
    const slice = available.slice(start, start + 10);
    if (slice.length < 10) {
      slice.push(...available.slice(0, 10 - slice.length));
    }
    setVisiblePresets(slice);
  }, [takenUsernames, presetOffset]);

  // Live username uniqueness debounced check
  useEffect(() => {
    const trimmed = username.trim();
    if (!trimmed || trimmed.length < 2) {
      setUsernameCheckStatus('idle');
      setUsernameCheckMsg('');
      return;
    }

    setUsernameCheckStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/waitlist?check_username=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.available) {
            setUsernameCheckStatus('available');
            setUsernameCheckMsg(data.message || 'نام کاربری آزاد و قابل رزرو است ✓');
          } else {
            setUsernameCheckStatus('taken');
            setUsernameCheckMsg(data.message || 'این نام کاربری قبلاً رزرو شده است.');
          }
        }
      } catch {
        setUsernameCheckStatus('idle');
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [username]);

  // Cooldown countdown timer for OTP resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(c => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const triggerCelebration = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ccff00', '#22d3ee', '#ffffff', '#ffd700']
    });
  };

  // کلیک روی یوزرنیم پیشنهادی: مقدار را پر می‌کند و آن آیتم را از لیست حذف کرده و آیتم جدید جایگزین می‌کند
  const handleSelectPreset = (item: CinematicCharacter) => {
    setUsername(item.name);
    setVisiblePresets(prev => {
      const takenSet = new Set([...takenUsernames.map(n => n.toLowerCase()), item.name.toLowerCase()]);
      const currentNames = new Set(prev.map(p => p.name.toLowerCase()));
      const nextCandidate = CINEMATIC_CHARACTERS_POOL.find(
        c => !takenSet.has(c.name.toLowerCase()) && !currentNames.has(c.name.toLowerCase())
      );
      const filtered = prev.filter(p => p.name !== item.name);
      if (nextCandidate) {
        filtered.push(nextCandidate);
      }
      return filtered;
    });
  };

  // جابجایی ۱۰ پیشنهاد بعدی
  const handleRotatePresets = () => {
    setPresetOffset(prev => prev + 10);
  };

  // مرحله ۱: ارسال کد تایید پیامکی از طریق سامانه ملی‌پیامک (Supabase Auth)
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setStatus('idle');

    const phoneValidation = validateIranPhoneNumber(phone);
    if (!phoneValidation.isValid) {
      setStatus('error');
      setMessage(phoneValidation.error || "شماره موبایل نامعتبر است (مثلاً ۰۹۱۲۳۴۵۶۷۸۹)");
      return;
    }

    if (username.trim() && usernameCheckStatus === 'taken') {
      setStatus('error');
      setMessage("این نام کاربری قبلاً رزرو شده است. لطفاً یک نام کاربری دیگر انتخاب نمایید.");
      return;
    }

    if (!consent) {
      setStatus('error');
      setMessage("لطفاً موافقت با دریافت پیامک را تایید کنید.");
      return;
    }

    setStatus('loading');

    try {
      // In Binger Supabase Auth, phone is stored as internationalFormat without plus (e.g. 989930663787)
      const targetPhone = phoneValidation.internationalFormat;
      const { error } = await supabase.auth.signInWithOtp({
        phone: targetPhone,
      });

      if (error) {
        console.error("signInWithOtp error:", error);
        setStatus('error');
        if (error.message?.includes('rate') || error.message?.includes('too many')) {
          setMessage("تعداد درخواست‌های پیامک بیش از حد مجاز است. لطفاً ۲ دقیقه دیگر تلاش کنید.");
        } else {
          setMessage(error.message || "خطا در ارسال پیامک کد تایید. لطفاً شماره را بررسی و دوباره تلاش کنید.");
        }
        return;
      }

      setFormStep('otp');
      setStatus('idle');
      setCooldown(60);
      setMessage(`کد تایید ۶ رقمی به شماره ${phoneValidation.normalizedPhone} پیامک شد.`);
    } catch {
      setStatus('error');
      setMessage("خطا در برقراری ارتباط با سامانه پیامکی. لطفاً اتصال اینترنت خود را بررسی کنید.");
    }
  };

  // ارسال مجدد پیامک کد تایید
  const handleResendOtp = async () => {
    if (cooldown > 0 || status === 'loading') return;
    const phoneValidation = validateIranPhoneNumber(phone);
    if (!phoneValidation.isValid) return;

    setStatus('loading');
    setMessage("در حال ارسال مجدد پیامک کد تایید...");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneValidation.internationalFormat,
      });

      if (error) {
        setStatus('error');
        setMessage("خطا در ارسال مجدد کد تایید. لطفاً کمی صبر کنید.");
      } else {
        setStatus('idle');
        setCooldown(60);
        setMessage(`کد تایید مجدداً به شماره ${phoneValidation.normalizedPhone} ارسال شد.`);
      }
    } catch {
      setStatus('error');
      setMessage("خطا در ارتباط با سامانه پیامکی.");
    }
  };

  // مرحله ۲: تایید کد پیامک، ثبت در دیتابیس و اعطای بج و ریدیم کد
  const handleVerifyAndRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setMessage("");

    // Convert Persian / Arabic numerals and strip any extraneous text/spaces
    const cleanOtp = convertToAsciiDigits(otp.trim()).replace(/\D/g, '').slice(0, 6);
    if (cleanOtp.length < 6) {
      setStatus('error');
      setMessage("لطفاً کد تایید ۶ رقمی پیامک شده را کامل وارد کنید.");
      return;
    }

    const phoneValidation = validateIranPhoneNumber(phone);
    if (!phoneValidation.isValid) {
      setStatus('error');
      setMessage("شماره موبایل نامعتبر است.");
      return;
    }

    setStatus('loading');

    try {
      // 1. تایید کد پیامک در سامانه Supabase Auth
      // Try international format without plus first (Binger standard), fallback to with plus
      let authUser: User | null = null;
      let lastAuthError: { message?: string } | null = null;

      const attempt1 = await supabase.auth.verifyOtp({
        phone: phoneValidation.internationalFormat,
        token: cleanOtp,
        type: 'sms',
      });

      if (!attempt1.error && attempt1.data?.user) {
        authUser = attempt1.data.user;
      } else {
        // Fallback retry with leading plus
        const attempt2 = await supabase.auth.verifyOtp({
          phone: '+' + phoneValidation.internationalFormat,
          token: cleanOtp,
          type: 'sms',
        });
        if (!attempt2.error && attempt2.data?.user) {
          authUser = attempt2.data.user;
        } else {
          lastAuthError = attempt1.error || attempt2.error;
        }
      }

      if (!authUser) {
        console.error("verifyOtp error:", lastAuthError);
        setStatus('error');
        setMessage("کد تایید وارد شده نادرست یا منقضی شده است. لطفاً کد جدید دریافت کنید.");
        return;
      }

      const verifiedUserId = authUser.id;

      // 2. ذخیره قطعی در لیست انتظار و همگام‌سازی پروفایل
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneValidation.normalizedPhone,
          username: username.trim(),
          redeemCode: redeemCode.trim(),
          userId: verifiedUserId,
          consent: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setMessage(data.error || "مشکلی در نهایی‌سازی ثبت‌نام پیش آمد.");
        return;
      }

      // 3. همگام‌سازی نام کاربری در جدول profiles در صورت موجود بودن کاربر
      if (verifiedUserId && username.trim()) {
        await supabase.from('profiles').update({
          username: data.username || username.trim(),
          phone: phoneValidation.normalizedPhone,
        }).eq('id', verifiedUserId);
      }

      setUser(authUser);
      setFormStep('completed');
      setStatus('success');
      setMessage(data.message || "تبریک! جایگاه و یوزرنیم شما با موفقیت در بینجر رزرو شد!");
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
      q: 'بینجر دقیقاً چه مشکلی از من حل می‌کنه و چطور کار می‌کنه؟',
      a: 'بینجر اولین دستیار هوش مصنوعی و بهشت خوره‌های سریال است. ما دقیقاً بهت می‌گیم تا کجا دیدی تا هیچ‌وقت بین فصل‌ها و اپیزودها گم نشی، تاریخ دقیق و شمارش معکوس پخش تمام قسمت‌ها رو جلو چشمت می‌ذاریم، با هوش مصنوعی بر اساس حال‌وهوات شاهکار بعدی رو برات تجویز می‌کنیم، آمار پیشرفته ساعت‌های تماشا و سالنامه‌ات رو می‌سازیم و در تالارهای ۱۰۰٪ امن و بدون اسپویل اجازه می‌دیم درباره هر اپیزود با بقیه بحث کنی.'
    },
    {
      q: 'هوش مصنوعی بینجر چطور سریال پیشنهاد میده و چقدر دقیقه؟',
      a: 'هوش مصنوعی دکتر بینجر با تحلیل عمیق حال روحی شما و مقایسه آن با ژنتیک داستانی و ریتم هزاران اثر، دقیق‌ترین نسخه سینمایی رو متناسب با مود امشبت تجویز می‌کنه. علاوه بر این، موتور هوش مصنوعی سریال‌های مشابه، کارهایی دقیقاً شبیه به علایقت رو با تحلیل هوشمند ریتم، لحن و کاراکترها پیدا می‌کنه.'
    },
    {
      q: 'بج و اشتراک دائمی VIP به چه کسانی تعلق می‌گیرد؟',
      a: 'تنها ۵۰ نفر اولی که شماره خود را در این پیش‌ثبت‌نام وارد کنند، به صورت دائمی نشان طلایی Early Adopter VIP دریافت می‌کنند و به تمامی امکانات پلتفرم از جمله هوش مصنوعی نامحدود، سالنامه تماشای پیشرفته (Wrapped) و ساخت لیست‌های نامحدود دسترسی رایگان خواهند داشت.'
    },
    {
      q: 'چطور بدون ترس از اسپویل در تالار هر اپیزود شرکت کنم؟',
      a: 'سیستم هوشمند بینجر طوری طراحی شده که اتاق نقد و تئوری‌های هر قسمت تا زمانی که شما تماشای آن قسمت را تیک نزده باشید قفل است. بنابراین با خیال ۱۰۰٪ راحت از امنیت داستان، می‌توانید بعد از دیدن هر قسمت وارد شوید، ری‌اکشن بگذارید و به بازیگر و کارگردان محبوبتان رای دهید.'
    },
    {
      q: 'جام دعوت و ریدیم کدها چگونه کار می‌کند؟',
      a: 'با ثبت‌نام در بینجر، یک ریدیم کد اختصاصی مثل BINGER-SHELBY دریافت می‌کنید. لینک اختصاصی خود را برای دوستان اهل فیلم و سریالتان بفرستید. به ازای هر نفری که با کد شما وارد شود، ۱ امتیاز در جدول می‌گیرید. در روز لانچ رسمی: به ۳ نفر اول ۶ ماه اشتراک رایگان کامل و به ۱۰ نفر بعدی ۳ ماه اشتراک رایگان به همراه بج پرمیوم اهدا می‌شود.'
    },
    {
      q: 'آیا پیش‌ثبت‌نام هزینه‌ای دارد؟',
      a: 'خیر، پیش‌ثبت‌نام کاملاً رایگان است و شماره شما با بالاترین استانداردهای امنیتی فقط برای اطلاع‌رسانی زمان انتشار و دریافت دعوت‌نامه VIP با هوش مصنوعی استفاده خواهد شد.'
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
            <Bot size={12} className="text-[#ccff00]" /> هوش مصنوعی سینمایی • پیش‌ثبت‌نام رسمی
          </span>
        </div>

        {/* منوی سریع و دکمه ورود */}
        <div className="flex items-center gap-3">
          <a href="#features-section" className="hidden sm:flex items-center gap-1.5 text-xs text-gray-300 hover:text-cyan-400 font-bold px-3 py-1.5 rounded-xl hover:bg-white/5 transition-colors">
            <Sparkles size={14} className="text-cyan-400" />
            <span>امکانات هوش مصنوعی</span>
          </a>

          <a href="#leaderboard-section" className="hidden sm:flex items-center gap-1.5 text-xs text-gray-300 hover:text-[#ccff00] font-bold px-3 py-1.5 rounded-xl hover:bg-white/5 transition-colors">
            <Trophy size={14} className="text-[#ccff00]" />
            <span>جام دعوت</span>
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
            تنها <strong className="text-[#ccff00] font-mono text-sm sm:text-base mx-1">{remainingVipSlots}</strong> جایگاه از ۵۰ اکانت VIP رایگانِ مؤسسین با هوش مصنوعی نامحدود باقی مانده!
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
          اولین پلتفرم هوش مصنوعی و بهشت خوره‌های سریال؛
          <br />
          <span className="bg-gradient-to-r from-[#ccff00] via-cyan-400 to-[#ccff00] bg-clip-text text-transparent drop-shadow-md">
            ما بهت می‌گیم تا کجا دیدی و شاهکار بعدیت چیه!
          </span>
        </motion.h1>

        {/* توضیحات هدف */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-gray-400 text-sm sm:text-lg max-w-3xl mt-4 sm:mt-6 leading-relaxed"
        >
          دیگه وسط سریال‌ها سرگردان نباش و ساعت‌ها برای انتخاب فیلم وقت تلف نکن!
          <br className="hidden sm:inline" />
          با هوش مصنوعی بینجر مود امشبت رو بگو تا نسخه دارویی بپیچه، تاریخ پخش و شمارش معکوس تمام اپیزودها رو بدون، آمار پیشرفته ساعت‌های تماشات رو ببین و بدون ترس از اسپویل نقد بخون.
          <br />
          <strong className="text-white mt-1 block">
            👑 ۵۰ نفر اولی که ثبت‌نام کنند بج دائمی <span className="text-[#ccff00]">Founder VIP</span> با دسترسی نامحدود به هوش مصنوعی هدیه می‌گیرند!
          </strong>
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
          
          {/* هدر باکس فرم */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Crown size={18} className="text-[#ccff00]" />
                {formStep === 'info' && 'رزرو زودهنگام آیدی سینمایی + اکانت VIP با هوش مصنوعی'}
                {formStep === 'otp' && 'تایید شماره همراه و ثبت نهایی در بینجر'}
                {formStep === 'completed' && 'جایگاه شما با موفقیت رزرو شد! 🎉'}
              </h2>
              <span className="text-[11px] text-gray-400">
                {formStep === 'info' && 'ارسال کد فعال‌سازی پیامکی ۱۰۰٪ رایگان • دسترسی نامحدود به دکتر بینجر'}
                {formStep === 'otp' && `کد تایید ۶ رقمی ارسال‌شده به شماره همراه خود را وارد کنید`}
                {formStep === 'completed' && 'اطلاعات حساب و ریدیم کد اختصاصی شما برای جام دعوت'}
              </span>
            </div>
            <span className="text-xs bg-[#ccff00]/15 text-[#ccff00] font-mono font-bold px-2.5 py-1 rounded-lg shrink-0">
              {formStep === 'completed' ? 'تایید شد ✓' : '۱۰۰٪ رایگان'}
            </span>
          </div>

          {/* ========================================================================= */}
          {/* گام ۱: وارد کردن شماره، آیدی دلخواه و کد معرف */}
          {/* ========================================================================= */}
          {formStep === 'info' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              
              {/* ۱. ورودی شماره موبایل */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">
                  شماره همراه شما (جهت دریافت پیامک تایید و فعال‌سازی اکانت VIP) <span className="text-red-400">*</span>
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

              {/* ۲. ورودی یوزرنیم دلخواه با بررسی زنده یکتایی */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-gray-300">
                    نام کاربری سینمایی دلخواه شما در بینجر
                  </label>
                  <span className="text-[10px] text-cyan-400 font-bold">رزرو یکتا و ماندگار</span>
                </div>
                
                <div className="relative">
                  <input 
                    type="text"
                    dir="ltr"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="مثلاً: Heisenberg یا Shelby"
                    disabled={status === 'loading'}
                    className={`w-full bg-[#080808] border rounded-2xl px-4 py-3.5 text-white text-sm font-bold focus:outline-none transition-all placeholder:text-gray-600 ${
                      usernameCheckStatus === 'available'
                        ? 'border-emerald-500/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20'
                        : usernameCheckStatus === 'taken'
                        ? 'border-rose-500/60 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20'
                        : 'border-white/15 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
                    }`}
                  />
                  {usernameCheckStatus === 'checking' && (
                    <Loader2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 animate-spin text-cyan-400 pointer-events-none" />
                  )}
                  {usernameCheckStatus === 'available' && (
                    <CheckCircle2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
                  )}
                  {usernameCheckStatus === 'taken' && (
                    <XCircle size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-400 pointer-events-none" />
                  )}
                </div>

                {/* وضعیت استعلام آنلاین نام کاربری */}
                {username.trim().length >= 2 && (
                  <div className="mt-1.5 text-[11px] flex items-center gap-1.5">
                    {usernameCheckStatus === 'checking' && (
                      <span className="text-cyan-400 flex items-center gap-1">
                        <Loader2 size={11} className="animate-spin" /> در حال استعلام یکتایی در دیتابیس...
                      </span>
                    )}
                    {usernameCheckStatus === 'available' && (
                      <span className="text-emerald-400 flex items-center gap-1 font-bold">
                        <CheckCircle2 size={12} /> {usernameCheckMsg}
                      </span>
                    )}
                    {usernameCheckStatus === 'taken' && (
                      <span className="text-rose-400 flex items-center gap-1 font-bold">
                        <XCircle size={12} /> {usernameCheckMsg}
                      </span>
                    )}
                  </div>
                )}

                {/* چیپ‌های داینامیک کاراکترهای سینمایی */}
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-gray-400">
                      پیشنهادهای طلایی سینما (کلیک کنید تا انتخاب و با کاراکتر بعدی جایگزین شود):
                    </span>
                    <button
                      type="button"
                      onClick={handleRotatePresets}
                      className="text-[10px] text-[#ccff00] hover:text-[#e6ff80] flex items-center gap-1 cursor-pointer font-bold transition-colors"
                    >
                      <RotateCw size={10} />
                      <span>پیشنهادهای دیگر</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                    {visiblePresets.map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => handleSelectPreset(item)}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                          username === item.name
                            ? 'bg-[#ccff00] text-black border-[#ccff00] font-black scale-105 shadow-[0_0_10px_rgba(204,255,0,0.3)]'
                            : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10 hover:border-white/20'
                        }`}
                        title={`${item.name} از سریال ${item.show}`}
                      >
                        <span>{item.icon}</span>
                        <span className="font-bold">{item.name}</span>
                        <span className="text-[9px] text-gray-500 font-normal">({item.show})</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ۳. ورودی ریدیم کد (معرف) */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">
                  کد معرف یا ریدیم کد دوستان (اختیاری)
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
                    ✓ با این کد معرف، در جام دعوت امتیاز برای دوست شما ثبت خواهد شد.
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

              {/* دکمه درخواست کد پیامکی */}
              <button 
                type="submit"
                disabled={status === 'loading' || usernameCheckStatus === 'taken'}
                className="w-full bg-[#ccff00] hover:bg-[#b3e600] active:scale-[0.98] text-black font-black text-sm sm:text-base py-4 rounded-2xl transition-all shadow-[0_0_25px_rgba(204,255,0,0.35)] flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="animate-spin text-black" size={20} />
                    <span>در حال ارسال پیامک تایید...</span>
                  </>
                ) : (
                  <>
                    <Zap size={18} strokeWidth={3} className="fill-black" />
                    <span>دریافت کد تایید پیامکی و رزرو جایگاه ⚡</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ========================================================================= */}
          {/* گام ۲: وارد کردن کد تایید پیامکی (OTP VERIFICATION) */}
          {/* ========================================================================= */}
          {formStep === 'otp' && (
            <form onSubmit={handleVerifyAndRegister} className="space-y-4">
              
              {/* کادر خلاصه شماره و دکمه ویرایش */}
              <div className="flex items-center justify-between bg-black/60 border border-white/10 p-3 rounded-2xl">
                <div>
                  <span className="text-xs text-gray-400 block">پیامک تایید به شماره زیر ارسال شد:</span>
                  <strong className="text-sm font-mono text-white tracking-wider dir-ltr">{phone}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormStep('info');
                    setMessage('');
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Edit3 size={13} />
                  <span>ویرایش شماره</span>
                </button>
              </div>

              {/* ورودی کد تایید ۶ رقمی */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-2 text-center">
                  کد تایید ۶ رقمی پیامک شده را وارد کنید:
                </label>
                <input 
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  dir="ltr"
                  autoFocus
                  value={otp}
                  onChange={(e) => {
                    const converted = convertToAsciiDigits(e.target.value).replace(/\D/g, '').slice(0, 6);
                    setOtp(converted);
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pasted = e.clipboardData.getData('text');
                    const converted = convertToAsciiDigits(pasted).replace(/\D/g, '').slice(0, 6);
                    setOtp(converted);
                  }}
                  placeholder="• • • • • •"
                  disabled={status === 'loading'}
                  className="w-full bg-[#080808] border border-[#ccff00]/40 focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/25 rounded-2xl py-4 text-center font-mono text-2xl tracking-[0.5em] font-black text-[#ccff00] focus:outline-none transition-all placeholder:text-gray-700"
                  required
                />
              </div>

              {/* تایمر ارسال مجدد پیامک */}
              <div className="flex justify-between items-center text-xs pt-1">
                {cooldown > 0 ? (
                  <span className="text-gray-400 text-[11px] flex items-center gap-1">
                    <Clock size={12} className="text-amber-400" />
                    ارسال مجدد کد پس از <strong className="font-mono text-[#ccff00] mx-0.5">{cooldown}</strong> ثانیه
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={status === 'loading'}
                    className="text-[#ccff00] hover:text-[#e6ff80] text-[11px] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <RotateCw size={12} />
                    <span>ارسال مجدد کد تایید پیامکی</span>
                  </button>
                )}

                {username.trim() && (
                  <span className="text-[11px] text-gray-400">
                    آیدی درخواستی: <strong className="text-white ltr font-mono">{username}</strong>
                  </span>
                )}
              </div>

              {/* دکمه تایید نهایی */}
              <button 
                type="submit"
                disabled={status === 'loading' || otp.trim().length < 6}
                className="w-full bg-[#ccff00] hover:bg-[#b3e600] active:scale-[0.98] text-black font-black text-sm sm:text-base py-4 rounded-2xl transition-all shadow-[0_0_25px_rgba(204,255,0,0.35)] flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="animate-spin text-black" size={20} />
                    <span>در حال اعتبارسنجی و ثبت در دیتابیس...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} strokeWidth={3} className="fill-black" />
                    <span>تایید پیامک و فعال‌سازی اکانت VIP 🚀</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* پیام‌های وضعیت و خطا */}
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
              {status === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
              <span>{message}</span>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* کارت موفقیت نهایی و نمایش ریدیم کد اختصاصی */}
          {/* ========================================================================= */}
          {formStep === 'completed' && assignedCode && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-5 p-5 rounded-2xl bg-white/[0.04] border border-[#ccff00]/40 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-white flex items-center gap-1.5">
                    <Trophy size={15} className="text-[#ccff00]" />
                    کارت پیش‌ثبت‌نام رسمی شما در بینجر
                  </span>
                  <span className="text-[11px] text-gray-400">
                    آیدی رزرو شده: <strong className="text-[#ccff00] font-mono ltr">{assignedUsername || username}</strong>
                  </span>
                </div>
                {isEarlyVip && (
                  <span className="text-[10px] bg-gradient-to-r from-amber-400 to-[#ccff00] text-black font-black px-2.5 py-1 rounded-full shadow-[0_0_12px_rgba(204,255,0,0.4)]">
                    👑 بج Early Adopter VIP فعال شد
                  </span>
                )}
              </div>

              {/* کادر ریدیم کد */}
              <div>
                <span className="text-[11px] text-gray-300 block mb-1">کد معرف اختصاصی شما برای جام دعوت:</span>
                <div className="flex items-center justify-between bg-black/70 border border-white/10 p-3 rounded-xl">
                  <span className="font-mono text-base font-black text-[#ccff00] ltr tracking-wider">{assignedCode}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(assignedCode, 'code')}
                    className="bg-white/10 hover:bg-white/20 text-xs px-3.5 py-1.5 rounded-lg text-white font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedCode ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>{copiedCode ? 'کپی شد' : 'کپی کد'}</span>
                  </button>
                </div>
              </div>

              {/* لینک دعوت مستقیم */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(inviteLink, 'link')}
                  className="flex-1 bg-[#ccff00] text-black text-xs font-black py-3 rounded-xl hover:bg-[#b3e600] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(204,255,0,0.3)]"
                >
                  {copiedLink ? <Check size={14} /> : <Share2 size={14} />}
                  <span>{copiedLink ? 'لینک دعوت کپی شد!' : 'کپی لینک اختصاصی دعوت'}</span>
                </button>

                <a 
                  href={`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(`سلام! من در بینجر یوزرنیمم رو رزرو کردم و اکانت VIP هوش مصنوعی گرفتم. بیا با کد معرف من ثبت‌نام کن تا هر دو بج و اشتراک رایگان بگیریم: ${assignedCode}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 border border-sky-500/30 px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  تلگرام
                </a>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center space-y-1">
                <p className="text-[11px] text-gray-300">
                  به ازای هر دوستی که با این لینک یا کد ثبت‌نام کند، ۱ امتیاز در جام بینجر کسب می‌کنید!
                </p>
                <a 
                  href="#leaderboard-section" 
                  className="inline-flex items-center gap-1 text-[11px] text-[#ccff00] hover:underline font-bold"
                >
                  <span>مشاهده جدول رده‌بندی جام بینجر</span>
                  <ArrowLeft size={12} />
                </a>
              </div>
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
                بج دائمی Early Adopter VIP + هوش مصنوعی نامحدود
              </h3>
              <p className="text-xs sm:text-sm text-gray-300 max-w-xl leading-relaxed">
                ۵۰ نفری که سریع‌تر ثبت‌نام کنند، علاوه بر قفل کردن یوزرنیم سینمایی دلخواه، نشان افتخار طلایی مؤسسین بینجر (Founder Badge)، دسترسی نامحدود به دکتر بینجر، سالنامه پیشرفته تماشا و اشتراک ویژه بدون تبلیغات را برای همیشه رایگان دریافت می‌کنند.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 shrink-0 w-full sm:w-auto">
              <div className="bg-black/60 border border-white/10 rounded-2xl p-4 text-center">
                <span className="text-2xl block mb-1">👑</span>
                <span className="text-xs font-black text-white block">بج VIP مؤسس</span>
                <span className="text-[10px] text-gray-400">ماندگار در پروفایل</span>
              </div>
              <div className="bg-black/60 border border-white/10 rounded-2xl p-4 text-center">
                <span className="text-2xl block mb-1">⚡</span>
                <span className="text-xs font-black text-white block">هوش مصنوعی نامحدود</span>
                <span className="text-[10px] text-gray-400">بدون محدودیت روزانه</span>
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
          <span className="text-xs font-black text-[#ccff00] uppercase tracking-wider block flex items-center justify-center gap-1.5">
            <Sparkles size={14} /> قدرت گرفته از هوش مصنوعی سینمایی
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white">چرا بینجر با تمام اپ‌های دیگر فرق دارد؟</h2>
          <p className="text-xs sm:text-sm text-gray-400 max-w-xl mx-auto leading-relaxed">
            امکاناتی که منحصراً برای خوره‌های فیلم و سریال طراحی شده تا بدون سردرگمی، لذت تماشا و ردیابی را به اوج برسانند.
          </p>
        </div>

        {/* سوییچ تب‌های تعاملی */}
        <div className="flex justify-center gap-2 sm:gap-3 mb-8 overflow-x-auto pb-2 no-scrollbar">
          
          <button
            onClick={() => setActiveTab('tracker')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'tracker'
                ? 'bg-[#ccff00] text-black shadow-[0_0_20px_rgba(204,255,0,0.3)] font-black scale-105'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/5'
            }`}
          >
            <Clock size={15} />
            <span>ما بهت می‌گیم تا کجا دیدی!</span>
          </button>

          <button
            onClick={() => setActiveTab('insights')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'insights'
                ? 'bg-[#ccff00] text-black shadow-[0_0_20px_rgba(204,255,0,0.3)] font-black scale-105'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/5'
            }`}
          >
            <BarChart3 size={15} />
            <span>آمار پیشرفته و سالنامه تماشا</span>
          </button>

          <button
            onClick={() => setActiveTab('ai_doctor')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'ai_doctor'
                ? 'bg-[#ccff00] text-black shadow-[0_0_20px_rgba(204,255,0,0.3)] font-black scale-105'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/5'
            }`}
          >
            <Bot size={15} />
            <span>هوش مصنوعی و دکتر بینجر</span>
          </button>

          <button
            onClick={() => setActiveTab('spoiler_proof')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'spoiler_proof'
                ? 'bg-[#ccff00] text-black shadow-[0_0_20px_rgba(204,255,0,0.3)] font-black scale-105'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/5'
            }`}
          >
            <ShieldCheck size={15} />
            <span>تالار نقد ۱۰۰٪ ضد اسپویل</span>
          </button>

          <button
            onClick={() => setActiveTab('custom_lists')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'custom_lists'
                ? 'bg-[#ccff00] text-black shadow-[0_0_20px_rgba(204,255,0,0.3)] font-black scale-105'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/5'
            }`}
          >
            <ListPlus size={15} />
            <span>ساخت لیست و رای به ستاره‌ها</span>
          </button>

        </div>

        {/* محتوای تب فعال با شبیه‌ساز واقعی اپ */}
        <div className="bg-[#121212]/90 border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
          <AnimatePresence mode="wait">
            
            {/* تب ۱: ما بهت می‌گیم تا کجا دیدی! */}
            {activeTab === 'tracker' && (
              <motion.div 
                key="tracker-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
              >
                <div className="lg:col-span-5 space-y-4">
                  <div className="inline-flex items-center gap-1.5 bg-[#ccff00]/10 text-[#ccff00] border border-[#ccff00]/20 px-3 py-1 rounded-full text-xs font-bold">
                    <Clock size={12} /> پایان قطعی سردرگمی بین فصل‌ها
                  </div>
                  <h3 className="text-xl sm:text-3xl font-black text-white leading-snug">
                    دقیقاً از همون ثانیه‌ای که موند شروع کن؛ ما بهت می‌گیم تا کجا دیدی!
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                    دیگه لازم نیست فکر کنی فصل چند بودی یا تا قسمت چندم دیده بودی. هر جای سایت (سرچ، کاوش، ترندها و صفحه اختصاصی) که بری، وضعیت دقیق تماشات مشخصه و با یک کلیک اپیزود جدید رو ثبت می‌کنی.
                  </p>
                  <ul className="space-y-2.5 text-xs text-gray-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-[#ccff00] shrink-0 mt-0.5" />
                      <span><strong>تاریخ دقیق و شمارش معکوس پخش:</strong> بدون تا چند روز یا ساعت دیگه قسمت جدید سریالت منتشر میشه؛ هیچ اپیزودی رو از دست نمیدی!</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                      <span><strong>ثبت آنی با یک تیک:</strong> بدون لودینگ صفحه، قسمت بعد وارد صف تماشات میشه و کل دیتابیس هوشمندت بروزرسانی میشه.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-amber-400 shrink-0 mt-0.5" />
                      <span><strong>دسترسی سریع به پلتفرم‌های پخش:</strong> لینک مستقیم تماشا در فیلیمو، نماوا و فیلم‌نت با یک کلیک.</span>
                    </li>
                  </ul>
                </div>

                {/* موکاپ زنده ردیابی سریال و شمارش معکوس */}
                <div className="lg:col-span-7 space-y-3.5 bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-inner">
                  
                  {/* نمونه کارت ۱: سریال در حال تماشا */}
                  <div className="p-4 rounded-2xl bg-[#161616] border border-[#ccff00]/30 hover:border-[#ccff00]/60 transition-all space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-16 rounded-xl bg-purple-950/60 border border-white/10 flex items-center justify-center text-2xl shrink-0 font-bold">
                          🧪
                        </div>
                        <div>
                          <span className="text-sm font-black text-white block">Breaking Bad (بریکینگ بد)</span>
                          <span className="text-[11px] text-gray-400">تا قسمت ۱۴ فصل ۵ رو دیدی (۲ قسمت تا پایان شاهکار)</span>
                        </div>
                      </div>
                      <span className="text-[11px] bg-cyan-500/10 text-cyan-400 font-bold px-2.5 py-1 rounded-lg">
                        در حال تماشا
                      </span>
                    </div>

                    {/* وضعیت خطی دیده‌شده */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>پیشرفت تماشا: ۹۶٪</span>
                        <span className="font-mono text-[#ccff00]">۶۰ از ۶۲ قسمت</span>
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-cyan-400 to-[#ccff00] rounded-full" style={{ width: '96%' }} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-gray-300 flex items-center gap-1.5">
                        <Play size={12} className="text-[#ccff00]" />
                        نوبت بعدی شما: <strong>فصل ۵ • قسمت ۱۵ (Granite State)</strong>
                      </span>
                      <button className="bg-[#ccff00] hover:bg-[#b3e600] text-black text-xs font-black px-3.5 py-1.5 rounded-xl transition-transform active:scale-95 flex items-center gap-1 cursor-pointer">
                        <Check size={14} strokeWidth={3} />
                        <span>تیک دیدم</span>
                      </button>
                    </div>
                  </div>

                  {/* نمونه کارت ۲: سریال در حال پخش با شمارش معکوس تقویم */}
                  <div className="p-4 rounded-2xl bg-[#161616] border border-white/5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-16 rounded-xl bg-amber-950/40 border border-white/10 flex items-center justify-center text-2xl shrink-0 font-bold">
                          🍄
                        </div>
                        <div>
                          <span className="text-sm font-black text-white block">The Last of Us (آخرین بازمانده از ما)</span>
                          <span className="text-[11px] text-emerald-400 font-bold">✓ فصل ۱ کامل تماشا شد (۹ قسمت)</span>
                        </div>
                      </div>
                      <span className="text-[10px] bg-amber-500/15 text-amber-400 font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                        <Calendar size={11} /> شمارش معکوس
                      </span>
                    </div>

                    <div className="bg-black/40 border border-white/5 p-2.5 rounded-xl flex items-center justify-between">
                      <span className="text-xs text-gray-300">قسمت جدید (S02E01):</span>
                      <span className="text-xs font-mono font-black text-amber-400 ltr">
                        پخش تا ۳ روز دیگر (یکشنبه ۲۲:۳۰)
                      </span>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

            {/* تب ۲: آمار پیشرفته و سالنامه تماشا (Insights & Wrapped) */}
            {activeTab === 'insights' && (
              <motion.div 
                key="insights-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
              >
                <div className="lg:col-span-5 space-y-4">
                  <div className="inline-flex items-center gap-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3 py-1 rounded-full text-xs font-bold">
                    <BarChart3 size={12} /> سالنامه هوشمند تماشا (Binger Wrapped)
                  </div>
                  <h3 className="text-xl sm:text-3xl font-black text-white leading-snug">
                    هوش مصنوعی بهت میگه هویت سینمایی و شناسنامه سریالی‌ات چیه!
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                    مثل Spotify Wrapped اما اختصاصی برای سریال‌ها! ببین دقیقا چند ساعت و چند روز از عمرت رو پای سریال‌ها گذروندی، محبوب‌ترین بازیگرت کیه، کارهای کدوم کارگردان رو بلعیدی و هوش مصنوعی سلیقه‌ات رو چطور آنالیز می‌کنه.
                  </p>
                  <ul className="space-y-2.5 text-xs text-gray-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-[#ccff00] shrink-0 mt-0.5" />
                      <span><strong>کشف DNA سریالی با هوش مصنوعی:</strong> تحلیل ناخودآگاه سلیقه شما (مثلا: ۸۲٪ تریلر معمایی تاریک، ۱۸٪ علمی‌تخیلی روان‌شناختی).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                      <span><strong>محبوب‌ترین بازیگر و کارگردان شما:</strong> رتبه‌بندی بر اساس ساعت‌ها و اپیزودهایی که با هنرنمایی‌شون زندگی کردی.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-amber-400 shrink-0 mt-0.5" />
                      <span><strong>کارت گرافیکی استوری برای شبکه‌های اجتماعی:</strong> کارت آماده دانلود برای اینستاگرام و توییتر جهت کل‌کل با دوستانت!</span>
                    </li>
                  </ul>
                </div>

                {/* موکاپ گرافیکی شبیه کارت Binger Wrapped */}
                <div className="lg:col-span-7 bg-[#0d0d0d] border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-[#ccff00] via-cyan-400 to-purple-500" />
                  
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-[#ccff00]" />
                      <span className="text-xs font-black text-white">سالنامه سینمایی شما • Binger Wrapped</span>
                    </div>
                    <span className="text-[10px] bg-[#ccff00]/15 text-[#ccff00] font-bold px-2 py-0.5 rounded-full font-mono">
                      تحلیل هوش مصنوعی
                    </span>
                  </div>

                  {/* کارت تحلیل DNA */}
                  <div className="bg-gradient-to-r from-purple-950/40 via-black to-cyan-950/40 border border-white/10 p-3.5 rounded-2xl mb-3.5">
                    <span className="text-[10px] text-purple-400 font-bold block mb-1">🧬 امضای DNA سریالی شما:</span>
                    <span className="text-sm font-black text-white block">
                      «معماپسند تاریک با گرایش به درام‌های سنگین اخلاقی»
                    </span>
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      هوش مصنوعی بینجر با ضریب دقت ۹۹٪ این الگو را در تماشای شما کشف کرده است.
                    </span>
                  </div>

                  {/* گرید ۴ تایی آمار */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-[#161616] p-3 rounded-2xl border border-white/5">
                      <span className="text-[10px] text-gray-400 block mb-1">⏱️ ساعت خالص تماشا:</span>
                      <span className="text-lg font-black text-[#ccff00] font-mono block">۳۸۴ ساعت</span>
                      <span className="text-[10px] text-gray-500">معادل ۱۶ روز خالص زندگی</span>
                    </div>
                    
                    <div className="bg-[#161616] p-3 rounded-2xl border border-white/5">
                      <span className="text-[10px] text-gray-400 block mb-1">🎭 بازیگر شماره یک شما:</span>
                      <span className="text-sm font-black text-white block">Bryan Cranston</span>
                      <span className="text-[10px] text-cyan-400 font-mono">۶۲ قسمت تماشا شده</span>
                    </div>

                    <div className="bg-[#161616] p-3 rounded-2xl border border-white/5">
                      <span className="text-[10px] text-gray-400 block mb-1">🎬 کارگردان برتر:</span>
                      <span className="text-sm font-black text-white block">Christopher Nolan</span>
                      <span className="text-[10px] text-amber-400 font-mono">۸ اثر کامل دیده‌شده</span>
                    </div>

                    <div className="bg-[#161616] p-3 rounded-2xl border border-white/5">
                      <span className="text-[10px] text-gray-400 block mb-1">👑 عنوان افتخاری شما:</span>
                      <span className="text-sm font-black text-emerald-400 block">بینجر افسانه‌ای</span>
                      <span className="text-[10px] text-gray-500">جزو ۱٪ خوره‌ترین کاربران</span>
                    </div>
                  </div>

                  {/* دکمه استوری */}
                  <div className="bg-white/5 p-2.5 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-gray-300 text-[11px]">این کارت آماده اشتراک‌گذاری در استوری است</span>
                    <span className="text-[#ccff00] font-bold flex items-center gap-1 cursor-pointer">
                      <Share2 size={12} /> اشتراک در شبکه‌های اجتماعی
                    </span>
                  </div>

                </div>
              </motion.div>
            )}

            {/* تب ۳: دکتر بینجر و هوش مصنوعی سینمایی */}
            {activeTab === 'ai_doctor' && (
              <motion.div 
                key="ai-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
              >
                <div className="lg:col-span-5 space-y-4">
                  <div className="inline-flex items-center gap-1.5 bg-[#ccff00]/10 text-[#ccff00] border border-[#ccff00]/20 px-3 py-1 rounded-full text-xs font-bold">
                    <Bot size={12} /> موتور هوش مصنوعی نسل جدید
                  </div>
                  <h3 className="text-xl sm:text-3xl font-black text-white leading-snug">
                    به هوش مصنوعی بگو چه حسی داری؛ شاهکار بعدیت رو تحویل بگیر!
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                    دیگه نیم‌ساعت وقتت رو برای سرچ کردن تو اینترنت و خوندن نظرات متفرقه تلف نکن. دکتر بینجر با ۱۶ تخصص پزشکی-سینمایی و الگوریتم هوش مصنوعی پیشرفته، بر اساس مود روحی و سریال‌هایی که دیدی بهترین اثر رو نسخه می‌پیچه.
                  </p>
                  <ul className="space-y-2.5 text-xs text-gray-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-[#ccff00] shrink-0 mt-0.5" />
                      <span><strong>۱۶ تخصص پزشکی سینمایی:</strong> از «فوق تخصص قهقهه و کمدی» تا «جراح مغز و اعصاب تعلیق و هیجان شدید».</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                      <span><strong>موتور هوش مصنوعی سریال‌های مشابه:</strong> کشف آثار با خط داستانی عمیق و شباهت تماتیک به محبوب‌ترین سریال‌هایت.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-amber-400 shrink-0 mt-0.5" />
                      <span><strong>بدون پیشنهاد تکراری:</strong> چون بینجر دقیقا می‌دونه چی دیدی، هرگز سریال‌های دیده‌شده‌ات رو بهت پیشنهاد نمیده!</span>
                    </li>
                  </ul>
                </div>

                <div className="lg:col-span-7 space-y-3.5">
                  
                  {/* نسخه تجویزی دکتر بینجر */}
                  <div className="bg-[#0a0a0a] border border-[#ccff00]/30 rounded-2xl p-5 space-y-3 shadow-xl">
                    <div className="border-b border-white/10 pb-3 flex justify-between items-center">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">🩺</span>
                        <div>
                          <span className="text-xs font-black text-white block">نسخه رسمی دکتر بینجر با هوش مصنوعی</span>
                          <span className="text-[10px] text-cyan-400">بیمار: شما | تشخیص: نیاز فوری به آدرنالین و تعلیق پیچیده</span>
                        </div>
                      </div>
                      <span className="text-xs bg-[#ccff00]/10 text-[#ccff00] font-mono px-2 py-0.5 rounded">Rx #9284</span>
                    </div>

                    <div className="bg-[#161616] p-4 rounded-xl border border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-white">داروی تجویزی: Severance (جداسازی)</span>
                        <span className="text-[10px] text-emerald-400 font-bold">تطابق ۹۸٪ با مود شما</span>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        دستور مصرف: روزی ۱ اپیزود در تاریکی مطلق. این سریال با فضای وهم‌آلود اداری و کارگردانی بن استیلر، سطح هیجان ذهنی شما را به اوج می‌رساند.
                      </p>
                    </div>
                  </div>

                  {/* موتور هوش مصنوعی سریال‌های مشابه */}
                  <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-300 flex items-center gap-1.5">
                        <Sparkles size={13} className="text-cyan-400" />
                        تحلیل هوش مصنوعی سریال‌های مشابه:
                      </span>
                      <span className="text-[10px] text-gray-500">بر اساس علاقه‌مندی به Succession</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-black/50 p-2.5 rounded-xl border border-white/5">
                        <span className="text-white font-bold block">Billions</span>
                        <span className="text-[10px] text-cyan-400">۹۵٪ شباهت تمپو و جنگ قدرت</span>
                      </div>
                      <div className="bg-black/50 p-2.5 rounded-xl border border-white/5">
                        <span className="text-white font-bold block">Industry</span>
                        <span className="text-[10px] text-[#ccff00]">۹۱٪ شباهت استرس مالی و درام</span>
                      </div>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

            {/* تب ۴: تالار نقد ۱۰۰٪ ضد اسپویل */}
            {activeTab === 'spoiler_proof' && (
              <motion.div 
                key="hub-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
              >
                <div className="lg:col-span-5 space-y-4">
                  <div className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-bold">
                    <ShieldCheck size={12} /> محافظت ۱۰۰٪ امن دور از اسپویلرها
                  </div>
                  <h3 className="text-xl sm:text-3xl font-black text-white leading-snug">
                    با خیال راحت درباره هیجان‌انگیزترین پیچش‌های داستان بحث کن!
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                    تا وقتی یک اپیزود رو تماشا نکرده باشید، تمام نظرات و تئوری‌های اون اپیزود قفله تا هیچ داستانی براتون لو نره! بعد از تماشا، وارد اتاق امن بحث شو، ری‌اکشن احساسی بگذار و به ستاره‌های قسمت رای بده.
                  </p>
                  <ul className="space-y-2.5 text-xs text-gray-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-[#ccff00] shrink-0 mt-0.5" />
                      <span><strong>اتاق اختصاصی برای تک‌تک اپیزودها:</strong> بحث‌های قسمت ۴ هرگز در صفحه قسمت ۱ اسپویل نمیشه.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                      <span><strong>رای به بهترین بازیگر و کارگردان قسمت:</strong> در انتهای هر اپیزود، به بازیگری که بیشترین درخشش رو داشت رای بده.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-amber-400 shrink-0 mt-0.5" />
                      <span><strong>ری‌اکشن‌های احساسی زنده:</strong> ثبت شوک، گریه، خنده یا هیجان بدون اسپویل کردن جزئیات.</span>
                    </li>
                  </ul>
                </div>

                <div className="lg:col-span-7 bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-white/10 pb-3">
                    <span className="text-xs font-bold text-gray-200">اتاق نقد: بهتره با ساول تماس بگیری (فصل ۶ • قسمت ۷)</span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">✓ قفل باز شد (تماشا کردید)</span>
                  </div>

                  <div>
                    <span className="text-xs text-gray-400 block mb-2">ری‌اکشن‌های زنده بینجرهای این قسمت:</span>
                    <div className="grid grid-cols-5 gap-2 text-center">
                      <div className="bg-[#161616] p-2 rounded-xl border border-white/5">
                        <span className="text-xl block mb-1">🤯</span>
                        <span className="text-xs font-mono font-bold text-[#ccff00]">۶۲٪</span>
                        <span className="text-[9px] text-gray-500 block">شوک خالص</span>
                      </div>
                      <div className="bg-[#161616] p-2 rounded-xl border border-white/5">
                        <span className="text-xl block mb-1">🔥</span>
                        <span className="text-xs font-mono font-bold text-cyan-400">۲۴٪</span>
                        <span className="text-[9px] text-gray-500 block">شاهکار</span>
                      </div>
                      <div className="bg-[#161616] p-2 rounded-xl border border-white/5">
                        <span className="text-xl block mb-1">😭</span>
                        <span className="text-xs font-mono font-bold text-gray-400">۸٪</span>
                        <span className="text-[9px] text-gray-500 block">گریه</span>
                      </div>
                      <div className="bg-[#161616] p-2 rounded-xl border border-white/5">
                        <span className="text-xl block mb-1">🤩</span>
                        <span className="text-xs font-mono font-bold text-gray-400">۴٪</span>
                        <span className="text-[9px] text-gray-500 block">بازیگری</span>
                      </div>
                      <div className="bg-[#161616] p-2 rounded-xl border border-white/5">
                        <span className="text-xl block mb-1">💔</span>
                        <span className="text-xs font-mono font-bold text-gray-400">۲٪</span>
                        <span className="text-[9px] text-gray-500 block">شکست عشقی</span>
                      </div>
                    </div>
                  </div>

                  {/* نظرسنجی بازیگر برتر قسمت */}
                  <div className="bg-[#161616] p-3.5 rounded-xl border border-white/5 space-y-2">
                    <span className="text-xs font-bold text-white block flex items-center gap-1.5">
                      <ThumbsUp size={13} className="text-[#ccff00]" />
                      رای کاربران به بهترین بازیگر این اپیزود:
                    </span>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center bg-black/40 p-2 rounded-lg">
                        <span className="text-gray-200">Bob Odenkirk (ساول گودمن)</span>
                        <span className="font-mono text-[#ccff00] font-bold">۷۴٪ آرا</span>
                      </div>
                      <div className="flex justify-between items-center bg-black/40 p-2 rounded-lg">
                        <span className="text-gray-200">Rhea Seehorn (کیم وکسلر)</span>
                        <span className="font-mono text-cyan-400 font-bold">۲۶٪ آرا</span>
                      </div>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

            {/* تب ۵: ساخت لیست و رای به ستاره‌ها */}
            {activeTab === 'custom_lists' && (
              <motion.div 
                key="lists-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
              >
                <div className="lg:col-span-5 space-y-4">
                  <div className="inline-flex items-center gap-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1 rounded-full text-xs font-bold">
                    <ListPlus size={12} /> ساخت کالکشن‌های سفارشی و ستاره‌ها
                  </div>
                  <h3 className="text-xl sm:text-3xl font-black text-white leading-snug">
                    لیست‌های خاص خودت رو بچین و شناسنامه کامل بازیگران رو ورق بزن!
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                    پلی‌لیست‌های اختصاصی از سریال‌هایی که دیدی یا می‌خواهی ببینی بساز و بالای پروفایلت پین کن تا همه سلیقه‌ت رو تحسین کنن. بیوگرافی و تمام کارهای بازیگران و کارگردان‌ها رو با یک لمس بخون و به ستاره‌های مورد علاقه‌ت رای بده.
                  </p>
                  <ul className="space-y-2.5 text-xs text-gray-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-[#ccff00] shrink-0 mt-0.5" />
                      <span><strong>ساخت لیست‌های موضوعی و پین در پروفایل:</strong> مثل «سریال‌هایی که بعد دیدنشون افسردگی می‌گیری» یا «شاهکارهای جمعه شب».</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                      <span><strong>شناسنامه و فیلموگرافی کامل عوامل:</strong> بیوگرافی، تاریخ تولد، جوایز و تمام سریال‌های مشترک یک کارگردان یا بازیگر.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-amber-400 shrink-0 mt-0.5" />
                      <span><strong>رای دادن و ارتش هواداری:</strong> به بازیگر و کارگردان محبوبت امتیاز بده و اون‌ها رو در جدول محبوب‌ترین‌های بینجر بالا ببر.</span>
                    </li>
                  </ul>
                </div>

                <div className="lg:col-span-7 space-y-3.5">
                  {/* نمونه کارت لیست سفارشی */}
                  <div className="bg-[#161616] border border-[#ccff00]/30 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-amber-400 font-bold block flex items-center gap-1">
                          📌 پین شده در بالای پروفایل کاربر
                        </span>
                        <h4 className="text-sm font-black text-white mt-0.5">۱۰ شاهکار معمایی که ذهنت رو منفجر می‌کنن</h4>
                      </div>
                      <span className="text-[11px] bg-white/10 text-gray-300 px-2.5 py-1 rounded-lg">۱۰ سریال</span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-1">
                      <div className="bg-black/60 p-2 rounded-xl text-center border border-white/5">
                        <span className="text-xs font-bold text-white block truncate">Dark</span>
                        <span className="text-[10px] text-cyan-400">آلمان</span>
                      </div>
                      <div className="bg-black/60 p-2 rounded-xl text-center border border-white/5">
                        <span className="text-xs font-bold text-white block truncate">Severance</span>
                        <span className="text-[10px] text-[#ccff00]">آمریکا</span>
                      </div>
                      <div className="bg-black/60 p-2 rounded-xl text-center border border-white/5">
                        <span className="text-xs font-bold text-white block truncate">Mindhunter</span>
                        <span className="text-[10px] text-amber-400">جنایی</span>
                      </div>
                      <div className="bg-black/60 p-2 rounded-xl text-center border border-white/5">
                        <span className="text-xs font-bold text-white block truncate">True Detective</span>
                        <span className="text-[10px] text-purple-400">فصل ۱</span>
                      </div>
                    </div>
                  </div>

                  {/* نمونه کارت بازیگر و رای هواداری */}
                  <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-cyan-950/60 border border-cyan-400/30 flex items-center justify-center text-xl shrink-0 font-bold">
                        🎭
                      </div>
                      <div>
                        <span className="text-sm font-black text-white block">Cillian Murphy (کیلیان مورفی)</span>
                        <span className="text-[11px] text-gray-400">بازیگر نقش توماس شلبی در Peaky Blinders</span>
                      </div>
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-black text-[#ccff00] font-mono block">★ ۹.۸ / ۱۰</span>
                      <span className="text-[10px] text-gray-400">رای ۳,۲۸۰ کاربر</span>
                    </div>
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