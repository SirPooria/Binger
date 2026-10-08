'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError Boundary]:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4 selection:bg-[#ccff00] selection:text-black font-sans" dir="rtl">
      <div className="max-w-md w-full bg-white/[0.03] border border-white/10 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#ccff00]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle size={32} />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-black text-white">
            مشکلی در برقراری ارتباط پیش آمد
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
            سیستم در پردازش این درخواست با اختلال موقت مواجه شد. می‌توانید دوباره تلاش کنید یا به صفحه اصلی بازگردید.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 bg-[#ccff00] hover:bg-[#b3e600] text-black font-black text-xs sm:text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer shadow-[0_0_20px_rgba(204,255,0,0.2)]"
          >
            <RotateCcw size={16} />
            <span>تلاش مجدد</span>
          </button>

          <Link
            href="/"
            className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-bold text-xs sm:text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Home size={16} />
            <span>صفحه اصلی</span>
          </Link>
        </div>

        {process.env.NODE_ENV !== 'production' && error?.message && (
          <div className="text-left font-mono text-[10px] text-rose-400/80 bg-black/50 p-2.5 rounded-lg overflow-x-auto max-h-24">
            {error.message}
          </div>
        )}
      </div>
    </div>
  );
}
