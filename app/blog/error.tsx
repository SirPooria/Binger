'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default function BlogError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[BlogError Boundary]:', error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6 space-y-5" dir="rtl">
      <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
        <AlertTriangle size={28} />
      </div>

      <div className="max-w-md space-y-1">
        <h2 className="text-lg font-black text-white">خطا در بارگذاری مقالات وبلاگ</h2>
        <p className="text-xs text-gray-400">
          امکان دریافت اطلاعات مقالات در این لحظه میسر نشد.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => reset()}
          className="bg-[#ccff00] hover:bg-[#b3e600] text-black font-black text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 transition-transform active:scale-95 cursor-pointer shadow-md"
        >
          <RotateCcw size={14} />
          <span>تلاش مجدد</span>
        </button>

        <Link
          href="/"
          className="bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Home size={14} />
          <span>خانه</span>
        </Link>
      </div>
    </div>
  );
}
