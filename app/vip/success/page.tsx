import React, { Suspense } from 'react';
import Link from 'next/link';
import { Crown, CheckCircle2, ArrowLeft, User, Sparkles, ShieldCheck } from 'lucide-react';
import { toPersianDigits } from '@/lib/subscription';

export const metadata = {
  title: 'پرداخت موفق | اشتراک VIP بینجر',
  description: 'حساب کاربری شما با موفقیت به اشتراک ویژه VIP ارتقا یافت.',
};

interface SuccessPageProps {
  searchParams: Promise<{
    trackId?: string;
    refNumber?: string;
    plan?: string;
  }>;
}

export default async function VipSuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const trackId = params.trackId || '';
  const refNumber = params.refNumber || '';
  const plan = params.plan || 'monthly';

  const planTitle = plan === 'yearly' ? 'اشتراک طلایی سالانه (۱۲ ماه)' : 'اشتراک استاندارد ماهانه (۳۰ روز)';

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] flex items-center justify-center p-4 relative overflow-hidden selection:bg-amber-400 selection:text-black"
    >
      {/* Background Ambient Glows */}
      <div className="fixed top-1/4 right-1/4 w-96 h-96 bg-amber-500/15 blur-[150px] rounded-full pointer-events-none -z-10 animate-pulse" />
      <div className="fixed bottom-1/4 left-1/4 w-96 h-96 bg-[#ccff00]/10 blur-[160px] rounded-full pointer-events-none -z-10" />

      <main className="w-full max-w-lg bg-[#0e0e0e] border border-amber-400/40 rounded-3xl p-6 sm:p-10 shadow-[0_0_60px_rgba(251,191,36,0.15)] relative overflow-hidden backdrop-blur-2xl">
        {/* Top Floating Badge */}
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />

        {/* Icon & Celebration */}
        <div className="text-center space-y-4 pt-2">
          <div className="relative inline-block">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shadow-[0_0_35px_rgba(251,191,36,0.4)] mx-auto flex items-center justify-center animate-bounce duration-1000">
              <div className="w-full h-full bg-[#0a0a0a] rounded-[22px] flex items-center justify-center">
                <Crown className="w-10 h-10 text-amber-400" />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-black p-1.5 rounded-full shadow-lg">
              <CheckCircle2 className="w-5 h-5 text-black stroke-[3]" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-black">
              <Sparkles size={13} />
              <span>اشتراک طلایی فعال شد</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">پرداخت با موفقیت انجام شد!</h1>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-sm mx-auto">
              تبریک! حساب کاربری شما به نشان طلایی VIP ارتقا یافت و تمام امکانات حرفه‌ای برای شما فعال شد.
            </p>
          </div>
        </div>

        {/* Transaction Summary Card */}
        <div className="mt-8 bg-black/60 rounded-2xl border border-white/10 p-4 sm:p-5 space-y-3.5 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <span className="text-gray-400 font-medium">نوع پلن خریداری‌شده:</span>
            <span className="font-bold text-amber-300 flex items-center gap-1.5">
              <Crown size={14} className="text-amber-400" />
              <span>{planTitle}</span>
            </span>
          </div>

          {refNumber && (
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <span className="text-gray-400 font-medium">شماره مرجع بانکی:</span>
              <span className="font-mono text-gray-200 font-bold tracking-wider">
                {toPersianDigits(refNumber)}
              </span>
            </div>
          )}

          {trackId && (
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <span className="text-gray-400 font-medium">شناسه پیگیری زیبال:</span>
              <span className="font-mono text-gray-200 font-bold tracking-wider">
                {toPersianDigits(trackId)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-gray-400 font-medium">وضعیت تراکنش:</span>
            <span className="text-emerald-400 font-black flex items-center gap-1">
              <CheckCircle2 size={14} />
              <span>موفق و تأیید شده</span>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 space-y-3">
          <Link href="/dashboard" className="block w-full">
            <button className="w-full py-4 px-6 rounded-2xl font-black text-sm bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black hover:brightness-110 transition-all shadow-[0_0_30px_rgba(251,191,36,0.35)] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer">
              <span>ورود به داشبورد اختصاصی VIP</span>
              <ArrowLeft size={18} />
            </button>
          </Link>

          <Link href="/dashboard/profile" className="block w-full">
            <button className="w-full py-3.5 px-6 rounded-2xl font-bold text-xs bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer">
              <User size={15} />
              <span>مشاهده پروفایل و نشان طلایی کاربری</span>
            </button>
          </Link>
        </div>

        {/* Footer Guarantee */}
        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-center gap-2 text-[11px] text-gray-500 font-medium">
          <ShieldCheck size={14} className="text-amber-400" />
          <span>رسید دیجیتال این تراکنش در پایگاه داده بینجر ثبت شد</span>
        </div>
      </main>
    </div>
  );
}
