"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Phone, KeyRound, ArrowRight, RotateCcw } from 'lucide-react';
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

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Focus OTP input when transitioning to step 2
  useEffect(() => {
    if (step === 2) {
      otpInputRef.current?.focus();
    }
  }, [step]);

  // Step 1: Request OTP from Supabase
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
      setMessage(`کد ورود ۶ رقمی برای شماره ${validation.normalizedPhone} ارسال شد.`);
    } catch (error: unknown) {
      setIsError(true);
      const err = error as { message?: string };
      if (err.message?.includes('rate') || err.message?.includes('too many')) {
        setMessage('تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی بعد تلاش کنید.');
      } else {
        setMessage('خطا در ارسال کد تایید. لطفاً شماره را بررسی و دوباره تلاش کنید.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
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
      setMessage('ورود موفقیت‌آمیز بود! در حال انتقال...');

      setTimeout(() => {
        if (isOnboarded) {
          router.push('/dashboard');
        } else {
          router.push('/onboarding');
        }
      }, 400);
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
    <div dir="rtl" className="min-h-screen w-full bg-[#101010] text-white font-['Vazirmatn'] flex items-center justify-center p-4 py-8 overflow-y-auto selection:bg-[#ccff00] selection:text-black">
      <div className="w-full max-w-sm mx-auto my-auto">
        <Link 
          href="/" 
          className="flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 text-sm focus:outline-none focus:ring-2 focus:ring-[#ccff00] rounded-lg px-2 py-1 w-fit mx-auto"
        >
          <ArrowRight size={16} />
          <span>بازگشت به صفحه اصلی</span>
        </Link>

        <div className="bg-black/40 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-black">ورود به بینجر</h1>
            <p className="text-gray-400 mt-2 text-xs sm:text-sm">
              {step === 1 ? 'شماره تماس خود را برای ورود وارد کنید' : `کد تایید ۶ رقمی را برای شماره ${phone} وارد کنید`}
            </p>
          </div>

          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label htmlFor="phone-input" className="text-xs text-gray-400 mr-2 mb-1 block">
                  شماره تماس
                </label>
                <div className="relative">
                  <input
                    id="phone-input"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-[#ccff00] focus:outline-none transition-colors text-left ltr tracking-wider"
                    placeholder="09123456789"
                    disabled={loading}
                    autoFocus
                  />
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || cooldown > 0}
                className="w-full bg-[#ccff00] text-black py-3 rounded-xl font-black text-base hover:bg-[#b3e600] transition-all active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.2)] disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ccff00]"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <span>دریافت کد تایید</span>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label htmlFor="otp-input" className="text-xs text-gray-400 mr-2 mb-1 block">
                  کد تایید ۶ رقمی
                </label>
                <div className="relative">
                  <input
                    ref={otpInputRef}
                    id="otp-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-[#ccff00] focus:outline-none transition-colors text-center ltr tracking-[0.4em] font-bold text-lg"
                    placeholder="••••••"
                    disabled={loading}
                  />
                  <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full bg-[#ccff00] text-black py-3 rounded-xl font-black text-base hover:bg-[#b3e600] transition-all active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.2)] disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ccff00]"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <span>تایید و ورود</span>
                )}
              </button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => { setStep(1); setOtp(''); setMessage(''); }}
                  className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  تغییر شماره تماس
                </button>

                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  disabled={cooldown > 0 || loading}
                  className="text-[#ccff00] hover:underline disabled:text-gray-600 disabled:no-underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>
                    {cooldown > 0 ? `ارسال مجدد (${cooldown} ثانیه)` : 'ارسال مجدد کد'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {message && (
            <p className={`mt-4 text-xs font-bold text-center leading-relaxed ${isError ? 'text-red-400' : 'text-[#ccff00]'}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}