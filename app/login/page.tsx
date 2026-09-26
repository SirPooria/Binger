"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Phone, ArrowLeft, RotateCcw,
  Sparkles, ShieldCheck, CheckCircle2, AlertCircle, Tv,
  Star, Compass, Flame, Users
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { validateIranPhoneNumber } from '@/lib/validation/phone';
import Link from 'next/link';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const otpInputRef = useRef<HTMLInputElement>(null);

  // شمارش معکوس ارسال مجدد کد
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // فوکوس روی فیلد کد تایید هنگام رفتن به مرحله ۲
  useEffect(() => {
    if (step === 2) {
      otpInputRef.current?.focus();
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

      if (error) throw error;

      setStep(2);
      setAttempts(0);
      setCooldown(60);
      setMessage(`کد ورود ۶ رقمی به شماره ${validation.normalizedPhone} پیامک شد.`);
    } catch (error: unknown) {
      setIsError(true);
      const err = error as { message?: string };
      if (err.message?.includes('rate') || err.message?.includes('too many')) {
        setMessage('تعداد درخواست‌ها بیش از حد مجاز است. لطفاً چند دقیقه بعد تلاش کنید.');
      } else {
        setMessage('خطا در ارسال کد تایید. لطفاً شماره را بررسی و دوباره تلاش کنید.');
      }
    } finally {
      setLoading(false);
    }
  };

  // مرحله ۲: تایید کد OTP و ورود به حساب
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (attempts >= 5) {
      setIsError(true);
      setMessage('تعداد تلاش‌های ناموفق بیش از حد مجاز بود. لطفاً کد جدید دریافت کنید.');
      setStep(1);
      setOtp('');
      return;
    }

    const cleanOtp = otp.trim();
    if (cleanOtp.length < 6) {
      setIsError(true);
      setMessage('کد تایید باید ۶ رقمی باشد.');
      return;
    }

    setLoading(true);
    setMessage('');
    setIsError(false);

    const validation = validateIranPhoneNumber(phone);

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
        setOtp('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen w-full bg-[#050505] text-white font-['Vazirmatn'] relative flex flex-col justify-between p-4 sm:p-6 md:p-8 overflow-x-hidden selection:bg-[#ccff00] selection:text-black">
      
      {/* --- AMBIENT NEON GLOWS (بدون هیچ عکس خارجی، کاملاً سبک و سریع) --- */}
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
          
          {/* بخش ویترینی و متنی (مخصوص دسکتاپ و تبلت بزرگ - بدون عکس خارجی) */}
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

            {/* آمار زنده پلتفرم بدون عکس */}
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

          {/* کارت فرم ورود شیشه‌ای (مدرن، ریسپانسیو و سریع) */}
          <div className="w-full max-w-[430px] mx-auto lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="relative rounded-3xl bg-[#0c0c0c]/85 border border-white/12 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_0_80px_rgba(0,0,0,0.85)] overflow-hidden"
            >
              {/* خط نور باریک نئونی بالای کارت */}
              <div className="absolute -top-px left-1/2 -translate-x-1/2 w-48 h-[2px] bg-gradient-to-r from-transparent via-[#ccff00] to-transparent shadow-[0_0_15px_#ccff00]" />

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
                    : `کد ۶ رقمی پیامک‌شده را وارد کنید`}
                </p>
              </div>

              {/* گام‌شمار ۲ مرحله‌ای با انیمیشن */}
              <div className="flex items-center gap-2 mb-6">
                <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  step >= 1 ? 'bg-[#ccff00] shadow-[0_0_10px_rgba(204,255,0,0.5)]' : 'bg-white/10'
                }`} />
                <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  step === 2 ? 'bg-[#ccff00] shadow-[0_0_10px_rgba(204,255,0,0.5)]' : 'bg-white/10'
                }`} />
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
                        onClick={() => { setStep(1); setOtp(''); setMessage(''); }}
                        className="text-[#ccff00] hover:underline text-[11px] font-bold cursor-pointer"
                      >
                        ویرایش شماره
                      </button>
                    </div>

                    {/* جعبه‌های ۶ رقمی مجزای OTP با انیمیشن و فوکوس */}
                    <div>
                      <label htmlFor="otp-input" className="text-xs font-bold text-gray-300 mb-2 block">
                        کد تایید ۶ رقمی
                      </label>
                      
                      <div className="relative">
                        {/* ورودی مخفی با پوشش کامل برای کیبورد و SMS Autofill */}
                        <input
                          ref={otpInputRef}
                          id="otp-input"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          autoComplete="one-time-code"
                          required
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10 text-center"
                          disabled={loading}
                        />

                        {/* جعبه‌های دیجیت ۶ گانه بصری */}
                        <div className="flex items-center justify-between gap-1.5 sm:gap-2 ltr my-2">
                          {[0, 1, 2, 3, 4, 5].map((index) => {
                            const digit = otp[index] || '';
                            const isCurrent = otp.length === index;
                            const isFilled = Boolean(digit);
                            return (
                              <div
                                key={index}
                                className={`w-11 h-13 sm:w-13 sm:h-15 rounded-2xl flex items-center justify-center font-mono text-xl sm:text-2xl font-black transition-all duration-200 border ${
                                  isCurrent
                                    ? 'border-[#ccff00] bg-[#ccff00]/10 shadow-[0_0_15px_rgba(204,255,0,0.35)] scale-105'
                                    : isFilled
                                    ? 'border-white/30 bg-white/10 text-[#ccff00]'
                                    : 'border-white/10 bg-black/50 text-gray-600'
                                }`}
                              >
                                {digit ? (
                                  <span>{digit}</span>
                                ) : isCurrent ? (
                                  <span className="w-2.5 h-0.5 bg-[#ccff00] animate-pulse" />
                                ) : (
                                  <span className="text-gray-700 text-xs">•</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      <span className="text-[10px] text-gray-500 text-center block mt-1">
                        کد پیامک‌شده را تایپ یا جای‌گذاری (Paste) کنید
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || otp.length < 6}
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

              {/* نشان‌های اعتماد و امنیت */}
              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-center gap-3 text-[10px] text-gray-500 font-bold">
                <span className="flex items-center gap-1">
                  <ShieldCheck size={13} className="text-[#ccff00]" />
                  ورود امن بدون پسورد
                </span>
                <span>•</span>
                <span>ارسال آنی پیامک</span>
                <span>•</span>
                <span>حفظ حریم خصوصی</span>
              </div>

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