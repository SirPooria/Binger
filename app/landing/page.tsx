"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Eye, Sparkles, ArrowLeft, Loader2, CheckCircle, User as UserIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { validateIranPhoneNumber } from '@/lib/validation/phone';
import type { User } from '@supabase/supabase-js';
import Link from 'next/link';
import Image from 'next/image';

export default function BingerLandingPage() {
  const supabase = createClient();
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(true);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState("");

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

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

  const handleSubmit = async (e: React.FormEvent) => {
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
          consent: true,
        }),
      });

      const data = await res.json() as { error?: string; message?: string; status?: string };

      if (!res.ok) {
        setStatus('error');
        setMessage(data.error || data.message || "مشکلی پیش آمد. لطفاً دوباره تلاش کنید.");
        return;
      }

      setStatus('success');
      setMessage(data.message || "تبریک، جایگاه شما رزرو شد! منتظر ما باشید.");
      setPhone("");
    } catch {
      setStatus('error');
      setMessage("خطا در برقراری ارتباط با سرور. لطفاً اتصال اینترنت را بررسی کنید.");
    }
  };

  return (
    <div dir="rtl" className="min-h-screen w-full bg-[#050505] text-white font-['Vazirmatn'] overflow-x-hidden overflow-y-auto relative selection:bg-[#ccff00] selection:text-black flex flex-col">
      <div className="fixed top-[-20%] right-[-10%] w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#ccff00]/10 rounded-full blur-[100px] pointer-events-none" />

      <header className="w-full z-50 flex justify-between items-center px-4 sm:px-8 py-4 sm:py-6">
        <div className="flex items-center gap-3">
          <Image src="/Logo.png" alt="لوگوی بینجر" width={120} height={40} className="h-8 sm:h-10 w-auto object-contain" priority />
          <span className="text-[10px] text-gray-400 hidden sm:block">اپلیکیشن ردیابی سریال</span>
        </div>

        <div>
          {authLoading ? (
            <div className="h-10 w-32 bg-white/10 rounded-full animate-pulse" />
          ) : user ? (
            <Link 
              href="/dashboard" 
              className="bg-[#ccff00] hover:bg-[#b3e600] text-black font-bold px-4 py-2 sm:px-6 sm:py-2.5 rounded-full text-xs sm:text-sm flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(204,255,0,0.3)] hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ccff00]"
            >
              <span>ورود به داشبورد</span>
              <ArrowLeft size={16} />
            </Link>
          ) : (
            <Link 
              href="/login" 
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium px-4 py-2 sm:px-5 sm:py-2 rounded-full text-xs sm:text-sm flex items-center gap-2 transition-all hover:border-[#ccff00]/50 hover:text-[#ccff00] focus:outline-none focus:ring-2 focus:ring-[#ccff00]"
            >
              <UserIcon size={14} />
              <span>ورود / ثبت‌نام</span>
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 z-10 max-w-4xl mx-auto my-auto py-8">
        <div className="flex flex-col items-center gap-4 sm:gap-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-[11px] sm:text-xs text-gray-300 backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-[#ccff00] animate-ping" />
            <span>به زودی؛ در حال آماده‌سازی برای انتشار عمومی</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight sm:leading-tight">
            همگام با دنیای سریال، <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ccff00] to-cyan-400">
              بدون جا ماندن از حتی یک قسمت!
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-gray-400 leading-relaxed max-w-md">
            اولین دستیار شخصیِ فیلم‌بازها در ایران. نقد کن، لیستت رو بساز <br className="hidden md:block" />
            و بدون ترس از اسپویل نقد بخون!
          </p>

          <form onSubmit={handleSubmit} className="mt-2 sm:mt-4 w-full max-w-sm relative group">
            {status !== 'success' ? (
              <div className="space-y-3">
                <div className="relative h-14 sm:h-16">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-[#ccff00] to-cyan-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-500" />
                  <div className="relative flex p-1 sm:p-1.5 bg-[#0a0a0a] border border-white/10 rounded-xl h-full items-center">
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="شماره موبایل (۰۹۱۲۳۴۵۶۷۸۹)" 
                      disabled={status === 'loading'}
                      aria-label="شماره موبایل برای رزرو جایگاه"
                      className="flex-1 bg-transparent border-none outline-none text-white px-2 sm:px-3 text-xs sm:text-base font-medium text-right dir-rtl placeholder:text-gray-600 h-full w-full"
                    />
                    <button 
                      type="submit"
                      disabled={status === 'loading'}
                      className="bg-[#ccff00] hover:bg-[#b3e600] disabled:bg-gray-600 text-black font-bold h-full px-3.5 sm:px-5 rounded-lg transition-all flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      {status === 'loading' ? (
                        <>
                          <span>صبر کنید</span>
                          <Loader2 className="animate-spin" size={16} />
                        </>
                      ) : (
                        <>
                          <span>رزرو جایگاه</span>
                          <ArrowLeft size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-right text-[11px] text-gray-400 cursor-pointer justify-start pr-1">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="accent-[#ccff00] rounded cursor-pointer"
                  />
                  <span>موافقم که پیامک اطلاع‌رسانی راه‌اندازی برای این شماره ارسال شود.</span>
                </label>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full h-14 sm:h-16 bg-[#ccff00]/10 border border-[#ccff00]/50 rounded-xl flex items-center justify-center gap-3 text-[#ccff00]"
              >
                <CheckCircle size={24} />
                <span className="font-bold text-base sm:text-lg">شما رزرو شدید! 🎉</span>
              </motion.div>
            )}

            {message && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-3 text-xs font-bold text-center ${status === 'error' ? 'text-red-400' : 'text-gray-400'}`}
              >
                {message}
              </motion.p>
            )}
          </form>
        </div>

        <section aria-label="ویژگی‌های بینجر" className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 sm:mt-16 w-full text-right">
          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-[#ccff00]/10 flex items-center justify-center text-[#ccff00] mb-3">
              <Eye size={18} />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-white mb-1">ضد اسپویل هوشمند</h2>
            <p className="text-xs text-gray-400 leading-relaxed">فقط نقدهایی رو می‌بینی که تا همون قسمتی که دیدی نوشته شدن!</p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-3">
              <Sparkles size={18} />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-white mb-1">دستیار هوش مصنوعی</h2>
            <p className="text-xs text-gray-400 leading-relaxed">مودت رو بهش بگو تا دقیق‌ترین سریال رو بر اساس سلیقه‌ت بهت پیشنهاد بده.</p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 mb-3">
              <Users size={18} />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-white mb-1">شبکه فیلم‌بازها</h2>
            <p className="text-xs text-gray-400 leading-relaxed">دوستات رو دنبال کن، ببین چی می‌بینن و به لیست‌های هم امتیاز بدید.</p>
          </div>
        </section>
      </main>

      <footer className="w-full text-center py-4 text-[11px] text-gray-600 z-10">
        تمامی حقوق برای پلتفرم بینجر محفوظ است © {new Date().getFullYear()}
      </footer>
    </div>
  );
}