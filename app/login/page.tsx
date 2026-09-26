"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Phone, ArrowLeft, RotateCcw,
  Sparkles, ShieldCheck, CheckCircle2, AlertCircle, Tv,
  Star, Flame, Users
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { validateIranPhoneNumber } from '@/lib/validation/phone';
import Link from 'next/link';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // شمارش معکوس ارسال مجدد کد
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // فوکوس خودکار روی خانه اول (چپ‌ترین خانه) هنگام رفتن به مرحله ۲
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  // اعتبارسنجی زنده شماره تلفن برای فیدبک بصری
  const isPhoneValid = React.useMemo(() => {
    return validateIranPhoneNumber(phone).isValid;
  }, [phone]);

  // مرحله ۱: ارسال کد تایید با پیامک از سوپابیس
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (cooldown > 0) return;

    setLoading(true);
    setMessage('');
    setIsError(false);

    const validation = validateIranPhoneNumber(phone);
    if (!validation.isValid) {
      setIsError(true);
      setMessage(validation.error || 'شماره موبایل وارد شده معتبر نیست.');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: validation.internationalFormat,
      });

      if (error) {
        console.warn('SMS gateway notice:', error.message);
        // در صورت عدم ارسال پیامک (مثلاً اتمام شارژ پیامکی)، کاربر متوقف نمی‌شود
        setStep(2);
        setAttempts(0);
        setMessage('پیامک ارسال نشد یا شارژ پنل تمام است؛ کد اختصاصی ۱۸۱۶۰ را وارد کنید.');
        return;
      }

      setStep(2);
      setAttempts(0);
      setCooldown(60);
      setMessage(`کد ورود به شماره ${validation.normalizedPhone} پیامک شد.`);
    } catch {
      // در صورت قطعی اینترنت یا درگاه پیامک
      setStep(2);
      setAttempts(0);
      setMessage('سامانه پیامک در دسترس نیست؛ لطفاً کد اختصاصی ۱۸۱۶۰ را وارد کنید.');
    } finally {
      setLoading(false);
    }
  };

  // مدیریت تغییر هر یک از ۶ رقم OTP (از چپ به راست)
  const handleDigitChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, '');

    // در صورتی که کاربر متن یا کدی چند رقمی را پیست کند
    if (cleaned.length > 1) {
      const next = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        next[i] = cleaned[i] || '';
      }
      setOtpDigits(next);
      const targetFocus = Math.min(cleaned.length, 5);
      otpInputRefs.current[targetFocus]?.focus();
      return;
    }

    const next = [...otpDigits];
    next[index] = cleaned.slice(-1);
    setOtpDigits(next);

    // پرش خودکار به رقم بعدی از چپ به راست
    if (cleaned && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        const next = [...otpDigits];
        next[index - 1] = '';
        setOtpDigits(next);
        otpInputRefs.current[index - 1]?.focus();
      } else {
        const next = [...otpDigits];
        next[index] = '';
        setOtpDigits(next);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const next = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setOtpDigits(next);
    const targetFocus = Math.min(pasted.length, 5);
    otpInputRefs.current[targetFocus]?.focus();
  };

  // مرحله ۲: تایید کد OTP و ورود به حساب
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (attempts >= 5) {
      setIsError(true);
      setMessage('تعداد تلاش‌های ناموفق بیش از حد مجاز بود. لطفاً مجدداً تلاش کنید.');
      setStep(1);
      setOtpDigits(['', '', '', '', '', '']);
      return;
    }

    const cleanOtp = otpDigits.join('').trim();
    if (cleanOtp.length < 5) {
      setIsError(true);
      setMessage('کد تایید وارد شده کوتاه است.');
      return;
    }

    setLoading(true);
    setMessage('');
    setIsError(false);

    const validation = validateIranPhoneNumber(phone);

    // ورود با کد اختصاصی / شاه‌کلید اضطراری (18160)
    if (cleanOtp === '18160' || cleanOtp === '018160') {
      try {
        const res = await fetch('/api/auth/master-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: validation.internationalFormat || phone,
            code: cleanOtp,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'خطا در ورود با کد اختصاصی.');
        }

        if (data.session) {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
        }

        setMessage('ورود با موفقیت انجام شد! در حال انتقال...');

        setTimeout(() => {
          if (data.isOnboarded) {
            router.push('/dashboard');
          } else {
            router.push('/onboarding');
          }
        }, 500);
        return;
      } catch (masterErr: any) {
        setIsError(true);
        setMessage(masterErr.message || 'خطا در ورود با کد اختصاصی.');
        setLoading(false);
        return;
      }
    }

    // ورود استاندارد پیامکی از طریق سوپابیس
    if (cleanOtp.length < 6) {
      setIsError(true);
      setMessage('کد پیامک‌شده باید ۶ رقمی باشد (یا کد اختصاصی ۱۸۱۶۰).');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: validation.internationalFormat,
        token: cleanOtp,
        type: 'sms',
      });

      if (error) {
        setAttempts((prev) => prev + 1);
        throw error;
      }

      const isOnboarded = data.user?.user_metadata?.onboarding_complete;
      setMessage('ورود موفقیت‌آمیز بود! در حال انتقال به بینجر...');

      setTimeout(() => {
        if (isOnboarded) {
          router.push('/dashboard');
        } else {
          router.push('/onboarding');
        }
      }, 500);
    } catch {
      setIsError(true);
      const remainingAttempts = 4 - attempts;
      if (remainingAttempts > 0) {
        setMessage(`کد وارد شده اشتباه است (${remainingAttempts} تلاش باقی‌مانده).`);
      } else {
        setMessage('کد اشتباه است و فرصت‌های این کد به پایان رسید. لطفاً کد جدید دریافت کنید.');
        setStep(1);
        setOtpDigits(['', '', '', '', '', '']);
      }
    } finally {
      setLoading(false);
    }
  };

  const currentOtpLength = otpDigits.join('').trim().length;

  return (
    <div dir="rtl" className="min-h-screen w-full bg-[#050505] text-white font-['Vazirmatn'] relative flex flex-col justify-between p-4 sm:p-6 md:p-8 overflow-x-hidden selection:bg-[#ccff00] selection:text-black">
      
      {/* --- AMBIENT NEON GLOWS --- */}
      <div className="fixed top-1/4 right-1/4 w-[450px] h-[450px] bg-[#ccff00]/10 blur-[150px] rounded-full pointer-events-none -z-10 animate-pulse" />
      <div className="fixed bottom-1/4 left-1/4 w-[400px] h-[400px] bg-purple-600/10 blur-[160px] rounded-full pointer-events-none -z-10" />

      {/* --- TOP NAV --- */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-2 sm:py-3 z-10">
        <Link href="/" className="flex items-center gap-2.5 group">
          <img
            src="/Logo.png"
            alt="Binger Logo"
            className="h-9 sm:h-11 w-auto object-contain transition-transform group-hover:scale-105 drop-shadow-[0_0_20px_rgba(204,255,0,0.35)]"
          />
        </Link>

        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-bold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 px-3.5 py-2 rounded-xl transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ccff00] backdrop-blur-md"
        >
          <span>بازگشت به خانه</span>
          <ArrowLeft size={14} />
        </Link>
      </header>

      {/* --- MAIN HERO WRAPPER --- */}
      <main className="w-full max-w-6xl mx-auto my-auto py-6 sm:py-10 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          
          {/* بخش ویترینی و متنی (دسکتاپ) */}
          <div className="hidden lg:flex lg:col-span-7 flex-col space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ccff00]/10 border border-[#ccff00]/30 text-[#ccff00] text-xs font-black w-fit shadow-[0_0_20px_rgba(204,255,0,0.15)]">
              <Sparkles size={14} />
              <span>پلتفرم نسل جدید فیلم و سریال</span>
            </div>

            <h2 className="text-3xl xl:text-4xl font-black text-white leading-[1.3] tracking-tight">
              جهان سینما در مشت شما؛ <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ccff00] via-[#d4ff33] to-white">
                هوشمند، شخصی‌سازی‌شده و بی‌پایان
              </span>
            </h2>

            <p className="text-gray-400 text-sm leading-relaxed max-w-xl">
              با ورود به بینجر، بیش از ۱۰,۰۰۰ سریال و فیلم را با هوش مصنوعی خلق‌کننده مود تماشا (Mood AI)، ردیابی پیشرفت اپیزودها و نشان‌های باشگاه منتقدان تجربه کنید.
            </p>

            {/* کارت‌های سه‌گانه مزیت‌ها */}
            <div className="grid grid-cols-3 gap-3.5 pt-2">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md hover:border-[#ccff00]/40 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-[#ccff00]/10 text-[#ccff00] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Sparkles size={20} />
                </div>
                <h3 className="text-xs font-black text-white mb-1.5">دستیار Mood AI</h3>
                <p className="text-[11px] text-gray-400 leading-snug">پیشنهاد بر اساس مود و حال‌وهوای دقیق شما</p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md hover:border-[#ccff00]/40 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Tv size={20} />
                </div>
                <h3 className="text-xs font-black text-white mb-1.5">ردیاب اپیزودها</h3>
                <p className="text-[11px] text-gray-400 leading-snug">ثبت لحظه‌ای فصل‌ها و محاسبه زمان‌های تماشا</p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md hover:border-[#ccff00]/40 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Star size={20} />
                </div>
                <h3 className="text-xs font-black text-white mb-1.5">باشگاه منتقدان</h3>
                <p className="text-[11px] text-gray-400 leading-snug">کسب نشان‌ها و ثبت دیدگاه با نمرات تخصصی</p>
              </div>
            </div>

            {/* نشان اعتمادساز */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md max-w-lg">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
                <Users size={16} className="text-[#ccff00]" />
                <span>جامعه سریال‌بین‌های ایرانی</span>
              </div>
              <span className="text-gray-600">•</span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#ccff00]">
                <Flame size={15} />
                <span>۱۰۰٪ رایگان و بدون پسورد</span>
              </div>
            </div>

          </div>

          {/* کارت فرم ورود شیشه‌ای (مدرن، ساده و بدون خطوط اضافی) */}
          <div className="w-full max-w-[430px] mx-auto lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="relative rounded-3xl bg-[#0c0c0c]/85 border border-white/12 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_0_80px_rgba(0,0,0,0.85)]"
            >
              {/* هدر کارت */}
              <div className="text-center space-y-2 mb-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ccff00]/10 border border-[#ccff00]/30 text-[#ccff00] text-[11px] font-black mb-1">
                  <Sparkles size={12} />
                  <span>ورود یا ثبت‌نام سریع و امن</span>
                </div>
                
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  ورود به <span className="text-[#ccff00]">بینجر</span>
                </h1>
                
                <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                  {step === 1
                    ? 'شماره موبایل خود را وارد کنید تا کد ورود ارسال شود'
                    : 'کد تایید پیامک‌شده یا کد اضطراری ۱۸۱۶۰ را وارد کنید'}
                </p>
              </div>

              <AnimatePresence mode="wait">
                {step === 1 ? (
                  <motion.form
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.25 }}
                    onSubmit={handleSendOtp}
                    className="space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="phone-input" className="text-xs font-bold text-gray-300">
                          شماره موبایل
                        </label>
                        {isPhoneValid && (
                          <span className="text-[11px] font-bold text-[#ccff00] flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            شماره معتبر است
                          </span>
                        )}
                      </div>
                      
                      <div className="relative group">
                        <input
                          id="phone-input"
                          type="tel"
                          autoComplete="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className={`w-full bg-black/60 border rounded-2xl p-3.5 pr-4 pl-14 text-white placeholder:text-gray-600 focus:outline-none transition-all text-left ltr tracking-wider text-sm font-mono shadow-inner group-hover:border-white/30 ${
                            isPhoneValid
                              ? 'border-[#ccff00]/60 focus:border-[#ccff00] focus:ring-1 focus:ring-[#ccff00]'
                              : 'border-white/15 focus:border-[#ccff00]'
                          }`}
                          placeholder="09123456789"
                          disabled={loading}
                          autoFocus
                        />
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none text-gray-400">
                          <span className="text-[11px] font-bold font-mono border-r border-white/15 pr-1.5">🇮🇷 +۹۸</span>
                          <Phone size={15} />
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1 block">
                        فرمت‌های مجاز: ۰۹۱۲۳۴۵۶۷۸۹ یا ۹۱۲۳۴۵۶۷۸۹
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || cooldown > 0}
                      className="w-full bg-[#ccff00] hover:bg-[#b3e600] text-black py-3.5 rounded-2xl font-black text-sm sm:text-base transition-all active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(204,255,0,0.35)] disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ccff00]"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          <span>در حال ارسال پیامک...</span>
                        </>
                      ) : (
                        <>
                          <span>دریافت کد تایید یک‌بار مصرف</span>
                          <ArrowLeft size={16} />
                        </>
                      )}
                    </button>
                  </motion.form>
                ) : (
                  <motion.form
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    onSubmit={handleVerifyOtp}
                    className="space-y-4"
                  >
                    {/* پیش‌نمایش شماره واردشده و دکمه ویرایش */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                      <div className="flex items-center gap-1.5 text-gray-300">
                        <Phone size={13} className="text-[#ccff00]" />
                        <span className="ltr font-mono font-bold">{phone}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setStep(1); setOtpDigits(['', '', '', '', '', '']); setMessage(''); }}
                        className="text-[#ccff00] hover:underline text-[11px] font-bold cursor-pointer"
                      >
                        ویرایش شماره
                      </button>
                    </div>

                    {/* ۶ جایگاه مشخص و تفکیک‌شده رقم کد تایید (کاملاً از چپ به راست) */}
                    <div>
                      <label className="text-xs font-bold text-gray-300 mb-2 block">
                        کد تایید (پیامک یا کد اختصاصی ۱۸۱۶۰)
                      </label>
                      
                      <div dir="ltr" className="flex items-center justify-center gap-2 sm:gap-2.5 my-3">
                        {otpDigits.map((digit, index) => (
                          <input
                            key={index}
                            ref={(el) => { otpInputRefs.current[index] = el; }}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={1}
                            dir="ltr"
                            value={digit}
                            onChange={(e) => handleDigitChange(index, e.target.value)}
                            onKeyDown={(e) => handleDigitKeyDown(index, e)}
                            onPaste={handleDigitPaste}
                            onFocus={(e) => e.target.select()}
                            className={`w-11 h-14 sm:w-13 sm:h-15 rounded-2xl bg-black/60 border text-center font-mono font-black text-2xl transition-all outline-none ${
                              digit
                                ? 'border-[#ccff00] text-[#ccff00] bg-[#ccff00]/10 shadow-[0_0_15px_rgba(204,255,0,0.3)]'
                                : 'border-white/15 text-white focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/40'
                            }`}
                            disabled={loading}
                          />
                        ))}
                      </div>
                      
                      <span className="text-[10px] text-gray-500 text-center block mt-1">
                        ارقام از چپ به راست پر می‌شوند (کد پیامک یا ۱۸۱۶۰)
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || currentOtpLength < 5}
                      className="w-full bg-[#ccff00] hover:bg-[#b3e600] text-black py-3.5 rounded-2xl font-black text-sm sm:text-base transition-all active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(204,255,0,0.35)] disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ccff00]"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          <span>در حال بررسی کد...</span>
                        </>
                      ) : (
                        <>
                          <span>تایید و ورود به بینجر</span>
                          <CheckCircle2 size={18} />
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-center pt-1 text-xs">
                      <button
                        type="button"
                        onClick={() => handleSendOtp()}
                        disabled={cooldown > 0 || loading}
                        className="text-gray-400 hover:text-white disabled:text-gray-600 disabled:no-underline flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <RotateCcw size={13} className={cooldown > 0 ? "animate-spin" : ""} />
                        <span>
                          {cooldown > 0 ? `ارسال مجدد کد تا (${cooldown} ثانیه)` : 'ارسال مجدد کد تایید'}
                        </span>
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* پیام اعلان خطا یا موفقیت */}
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-4 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 leading-relaxed ${
                    isError
                      ? 'bg-red-500/10 border border-red-500/30 text-red-300'
                      : 'bg-[#ccff00]/10 border border-[#ccff00]/30 text-[#ccff00]'
                  }`}
                >
                  {isError ? <AlertCircle size={16} className="shrink-0" /> : <CheckCircle2 size={16} className="shrink-0" />}
                  <span>{message}</span>
                </motion.div>
              )}

            </motion.div>
          </div>

        </div>
      </main>

      {/* --- FOOTER --- */}
      <footer className="w-full text-center py-3 text-[11px] text-gray-500 z-10 border-t border-white/5 mt-auto">
        بینجر؛ پلتفرم و دستیار تماشای فیلم و سریال ایرانیان 🍿
      </footer>

    </div>
  );
}