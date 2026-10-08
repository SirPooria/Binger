'use client';

import React, { useEffect } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[DashboardError Boundary]:', error);
  }, [error]);

  return (
    <div className="py-20 px-4 flex flex-col items-center justify-center text-center space-y-5" dir="rtl">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-lg">
        <AlertCircle size={28} />
      </div>

      <div className="max-w-md space-y-1.5">
        <h2 className="text-lg font-black text-white">خطا در بارگذاری اطلاعات داشبورد</h2>
        <p className="text-xs text-gray-400 leading-relaxed">
          ارتباط با سرور یا دیتابیس موقتاً با مشکل مواجه شد. لطفاً دوباره تلاش کنید.
        </p>
      </div>

      <button
        onClick={() => reset()}
        className="bg-[#ccff00] hover:bg-[#b3e600] text-black font-black text-xs py-2.5 px-5 rounded-xl flex items-center gap-2 transition-transform active:scale-95 cursor-pointer shadow-md"
      >
        <RotateCcw size={15} />
        <span>تلاش مجدد</span>
      </button>
    </div>
  );
}
