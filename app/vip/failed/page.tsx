import React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, RotateCcw, Home, HelpCircle } from 'lucide-react';
import { toPersianDigits } from '@/lib/subscription';

export const metadata = {
  title: 'پرداخت ناموفق | اشتراک VIP بینجر',
  description: 'پرداخت انجام نشد یا توسط کاربر لغو گردید.',
};

interface FailedPageProps {
  searchParams: Promise<{
    trackId?: string;
    code?: string;
    message?: string;
    reason?: string;
  }>;
}

export default async function VipFailedPage({ searchParams }: FailedPageProps) {
  const params = await searchParams;
  const trackId = params.trackId || '';
  const message = params.message || (params.reason === 'canceled' ? 'عملیات پرداخت توسط کاربر لغو شد.' : 'تراکنش توسط درگاه بانکی تأیید نشد.');

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] flex items-center justify-center p-4 relative overflow-hidden selection:bg-rose-500 selection:text-white"
    >
      {/* Background Ambient Glows */}
      <div className="fixed top-1/4 right-1/4 w-96 h-96 bg-rose-600/10 blur-[150px] rounded-full pointer-events-none -z-10 animate-pulse" />
      <div className="fixed bottom-1/4 left-1/4 w-96 h-96 bg-amber-600/10 blur-[160px] rounded-full pointer-events-none -z-10" />

      <main className="w-full max-w-lg bg-[#0e0e0e] border border-rose-500/30 rounded-3xl p-6 sm:p-10 shadow-[0_0_60px_rgba(244,63,94,0.1)] relative overflow-hidden backdrop-blur-2xl">
        {/* Top Warning Strip */}
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500" />

        {/* Icon & Status */}
        <div className="text-center space-y-4 pt-2">
          <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/20 mx-auto flex items-center justify-center text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.2)]">
            <AlertTriangle className="w-10 h-10" />
          </div>

          <div className="space-y-1.5">
            <span className="inline-block px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-black">
              تراکنش ناموفق
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white">پرداخت انجام نشد</h1>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-sm mx-auto">
              {message}
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-black/60 rounded-2xl border border-white/10 p-4 sm:p-5 space-y-3 text-xs">
          {trackId && (
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <span className="text-gray-400 font-medium">شناسه پیگیری زیبال:</span>
              <span className="font-mono text-gray-300 font-bold tracking-wider">
                {toPersianDigits(trackId)}
              </span>
            </div>
          )}

          <div className="text-gray-400 text-[11px] leading-relaxed flex items-start gap-2">
            <HelpCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
            <span>
              اگر وجهی از حساب بانکی شما کسر شده است، ظرف حداکثر ۷۲ ساعت کاری آینده به صورت خودکار توسط شبکه شاپرک بانک مرکزی به حسابتان برگشت داده خواهد شد.
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 space-y-3">
          <Link href="/vip" className="block w-full">
            <button className="w-full py-4 px-6 rounded-2xl font-black text-sm bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer shadow-lg">
              <RotateCcw size={16} />
              <span>تلاش مجدد برای خرید اشتراک VIP</span>
            </button>
          </Link>

          <Link href="/dashboard" className="block w-full">
            <button className="w-full py-3.5 px-6 rounded-2xl font-bold text-xs bg-transparent hover:bg-white/5 text-gray-400 border border-white/5 transition-all flex items-center justify-center gap-2 cursor-pointer">
              <Home size={15} />
              <span>بازگشت به داشبورد</span>
            </button>
          </Link>
        </div>
      </main>
    </div>
  );
}
