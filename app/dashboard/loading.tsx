import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 mt-6 space-y-8 animate-pulse" dir="rtl">
      {/* سوییچر لودینگ */}
      <div className="flex items-center gap-2">
        <div className="w-28 h-9 bg-white/5 rounded-2xl" />
        <div className="w-28 h-9 bg-white/5 rounded-2xl" />
      </div>

      {/* استریپ آمار لودینگ */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="h-16 bg-white/[0.03] border border-white/5 rounded-2xl" />
        <div className="h-16 bg-white/[0.03] border border-white/5 rounded-2xl" />
        <div className="h-16 bg-white/[0.03] border border-white/5 rounded-2xl" />
      </div>

      {/* کارت‌های لودینگ */}
      <div className="space-y-4">
        <div className="h-6 w-36 bg-white/10 rounded-lg" />
        <div className="h-28 bg-white/[0.03] border border-white/5 rounded-3xl" />
        <div className="h-28 bg-white/[0.03] border border-white/5 rounded-3xl" />
      </div>
    </div>
  );
}
