import React from 'react';

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4 text-white font-sans" dir="rtl">
      <div className="relative flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-2 border-white/10 border-t-[#ccff00] animate-spin shadow-[0_0_20px_rgba(204,255,0,0.2)]" />
        <div className="absolute text-xs font-black text-[#ccff00] font-mono tracking-widest">
          B
        </div>
      </div>
      <p className="text-xs text-gray-500 font-medium animate-pulse">
        در حال آماده‌سازی اطلاعات بینجر...
      </p>
    </div>
  );
}
