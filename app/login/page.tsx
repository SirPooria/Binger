"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Phone, KeyRound, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  // تبدیل دقیق شماره به فرمت عددی بدون علامت مثبت (مثلاً 0912 تبدیل به 98912 می‌شود)
  const formatPhoneNumber = (inputPhone: string) => {
    let clean = inputPhone.replace(/\D/g, '').trim(); // فقط اعداد را نگه می‌دارد
    if (clean.startsWith('0')) {
      clean = '98' + clean.substring(1);
    } else if (!clean.startsWith('98')) {
      clean = '98' + clean;
    }
    return clean;
  };

  // --- مرحله ۱: ارسال شماره به سوپابیس ---
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setIsError(false);

    const formattedPhone = formatPhoneNumber(phone);

    try {
      const { error } = await supabase.auth.signInWithOtp({ 
        phone: formattedPhone 
      });
      
      if (error) throw error;
      
      setStep(2);
      setMessage('شماره تایید شد؛ کد ۶ رقمی تستی خود را وارد کنید.');
    } catch (error: any) {
      setIsError(true);
      if (error.message?.includes('Twilio') || error.message?.includes('provider')) {
        setMessage('شماره با فرمت تستی سوپابیس همخوانی ندارد. لطفاً شماره را بررسی کنید.');
      } else {
        setMessage(error.message || 'خطا در ارسال کد.');
      }
    } finally {
      setLoading(false);
    }
  };

  // --- مرحله ۲: تایید کد و ورود ---
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setIsError(false);

    const formattedPhone = formatPhoneNumber(phone);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp.trim(),
        type: 'sms',
      });

      if (error) throw error;

      const isOnboarded = data.user?.user_metadata?.onboarding_complete;
      setMessage('ورود موفقیت‌آمیز بود!');
      
      if (isOnboarded) {
        router.push('/dashboard');
      } else {
        router.push('/onboarding');
      }

    } catch (error: any) {
      setIsError(true);
      setMessage('کد وارد شده اشتباه است.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="h-screen w-full bg-[#101010] text-white font-['Vazirmatn'] flex items-center justify-center p-4">
      <div className="w-full max-w-sm mx-auto">

        <Link href="/" className="flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 text-sm">
          بازگشت به صفحه اصلی
        </Link>
        
        <div className="bg-black/20 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black">ورود به بینجر</h1>
            <p className="text-gray-400 mt-2 text-sm">
              {step === 1 ? 'شماره تماس خود را برای ورود وارد کنید' : `کد تایید ۶ رقمی را برای شماره ${phone} وارد کنید`}
            </p>
          </div>
          
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mr-2 mb-1 block">شماره تماس</label>
                <input 
                  type="tel" 
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-[#ccff00] focus:outline-none transition-colors text-left ltr tracking-wider"
                  placeholder="09123456789"
                  disabled={loading}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#ccff00] text-black py-3 rounded-xl font-black text-base hover:bg-[#b3e600] transition-all active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.2)] disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 size={24} className="animate-spin" /> : <Phone size={20} />}
                دریافت کد ورود
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mr-2 mb-1 block">کد تایید تستی</label>
                <input 
                  type="text" 
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-[#ccff00] focus:outline-none transition-colors text-center ltr tracking-[0.4em] font-mono text-xl"
                  placeholder="123456"
                  disabled={loading}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#ccff00] text-black py-3 rounded-xl font-black text-base hover:bg-[#b3e600] transition-all active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.2)] disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 size={24} className="animate-spin" /> : <KeyRound size={20} />}
                تایید کد و ورود
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setOtp('');
                  setMessage('');
                  setIsError(false);
                }}
                className="w-full text-xs text-gray-400 hover:text-white py-2 flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <ArrowRight size={14} />
                ویرایش شماره تماس
              </button>
            </form>
          )}

          {message && (
            <p className={`text-center text-sm mt-6 p-3 rounded-lg border ${
              isError 
                ? 'text-red-400 bg-red-950/40 border-red-500/30' 
                : 'text-[#ccff00] bg-lime-950/40 border-lime-500/30'
            }`}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}