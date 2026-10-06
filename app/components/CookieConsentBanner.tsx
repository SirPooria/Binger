"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie, Check, X, ShieldCheck } from 'lucide-react';

export default function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('binger_cookie_consent');
      if (!consent) {
        // تاخیر کوتاه برای روان بودن نمایش در صفحه اول
        const timer = setTimeout(() => setShowBanner(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem('binger_cookie_consent', 'accepted');
    } catch {
      // ignore
    }
    setShowBanner(false);
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem('binger_cookie_consent', 'essential_only');
    } catch {
      // ignore
    }
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div
      dir="rtl"
      role="region"
      aria-label="اطلاعیه کوکی‌ها و حریم خصوصی"
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 font-['Vazirmatn']"
    >
      <div className="rounded-2xl bg-[#0c0c0c]/95 border border-white/15 p-4 sm:p-5 shadow-[0_10px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-[#ccff00]/10 text-[#ccff00] shrink-0 mt-0.5">
            <Cookie size={20} />
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">استفاده از کوکی‌ها و حافظه محلی</h3>
              <button
                onClick={handleDismiss}
                aria-label="بستن اطلاعیه"
                className="text-neutral-400 hover:text-white transition-colors cursor-pointer p-1"
              >
                <X size={15} />
              </button>
            </div>

            <p className="text-neutral-300 leading-relaxed">
              بینجر برای حفظ وضعیت ورود امن شما و بازگردانی سریع موقعیت صفحات، از کوکی‌های فنی ضروری و حافظه مرورگر استفاده می‌کند. ما هیچ کوکی تبلیغاتی ردیاب قرار نمی‌دهیم.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAccept}
                className="bg-[#ccff00] hover:bg-[#b8e600] text-black font-black text-xs px-4 py-2 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Check size={14} strokeWidth={3} />
                <span>پذیرش و ادامه</span>
              </button>

              <Link
                href="/cookies"
                className="bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 px-3 py-2 rounded-xl text-xs transition-colors"
              >
                <span>مطالعه سیاست کوکی‌ها</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
