"use client";

import { useEffect, useState } from 'react';
import { ArrowRight, Check, Crown, Sparkles, Clock, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

const FEATURES = [
  'گفت‌وگوی نامحدود با دستیار سینمایی هوش مصنوعی',
  'پیشنهاد سریال بر اساس مود لحظه‌ای و وضعیت روحی',
  'درنظر گرفتن سابقه تماشای شما در پیشنهادها',
  'حذف کامل پیشنهادهای تکراری و دیده‌شده',
  'نشان اختصاصی VIP در پروفایل و لیدربورد',
];

export default function SubscriptionPage() {
  const router = useRouter();
  const supabase = createClient();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [isVip, setIsVip] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkVipStatus() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('is_vip')
            .eq('id', user.id)
            .single();
          if (data?.is_vip) {
            setIsVip(true);
          }
        }
      } catch (err) {
        console.error('Error fetching VIP status:', err);
      } finally {
        setLoading(false);
      }
    }
    checkVipStatus();
  }, [supabase]);

  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-[#050505] px-4 py-8 text-white font-['Vazirmatn'] md:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.16),transparent_42%)]" />

      <div className="relative mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-10 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-gray-300 transition-colors hover:border-amber-400/50 hover:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <ArrowRight size={16} /> بازگشت به دستیار
        </button>

        <section className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-yellow-600 text-black shadow-[0_0_35px_rgba(245,158,11,0.35)]">
            <Crown size={32} />
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300 mb-3">
            <Sparkles size={14} />
            <span>عضویت ویژه BINGER VIP</span>
          </div>
          <h1 className="text-3xl font-black leading-tight md:text-5xl">برای هر مود، یک پیشنهاد دقیق</h1>
          <p className="mt-4 text-sm leading-7 text-gray-400">
            کاربران عادی روزانه ۱ پیشنهاد رایگان از دستیار هوشمند سینمایی دریافت می‌کنند. با فعال‌سازی اشتراک VIP، این سقف نامحدود خواهد شد.
          </p>

          {isVip && (
            <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-400">
              <ShieldCheck size={20} />
              <span className="text-sm font-bold">اشتراک VIP شما در حال حاضر روی این حساب کاربری فعال است!</span>
            </div>
          )}
        </section>

        <section className="mx-auto mt-10 grid max-w-3xl gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setSelectedPlan('monthly')}
            className={`rounded-2xl border p-5 text-right transition-all focus:outline-none focus:ring-2 focus:ring-amber-400 ${selectedPlan === 'monthly' ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_30px_rgba(245,158,11,0.12)]' : 'border-white/10 bg-white/[0.03]'}`}
          >
            <span className="text-xs font-bold text-gray-400">پلن ماهانه</span>
            <strong className="mt-2 block text-2xl font-black text-amber-300">۹۹٬۰۰۰ تومان</strong>
            <span className="mt-1 block text-xs text-gray-500">دسترسی نامحدود به مدت ۳۰ روز</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedPlan('yearly')}
            className={`relative rounded-2xl border p-5 text-right transition-all focus:outline-none focus:ring-2 focus:ring-amber-400 ${selectedPlan === 'yearly' ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_30px_rgba(245,158,11,0.12)]' : 'border-white/10 bg-white/[0.03]'}`}
          >
            <span className="absolute left-4 top-4 rounded-full bg-amber-400 px-2 py-1 text-[9px] font-black text-black">به‌صرفه‌تر</span>
            <span className="text-xs font-bold text-gray-400">پلن سالانه</span>
            <strong className="mt-2 block text-2xl font-black text-amber-300">۹۹۰٬۰۰۰ تومان</strong>
            <span className="mt-1 block text-xs text-gray-500">شامل ۲ ماه اشتراک هدیه رایگان</span>
          </button>
        </section>

        <section className="mx-auto mt-5 max-w-3xl rounded-3xl border border-amber-400/30 bg-gradient-to-br from-[#1b160c] to-[#101010] p-6 shadow-2xl md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <Sparkles className="text-amber-300" size={20} />
            <h2 className="text-lg font-black">امکانات اشتراک VIP</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-sm text-gray-300">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-300"><Check size={14} /></span>
                {feature}
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-black/40 p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-amber-300 font-bold text-sm mb-1">
              <Clock size={16} />
              <span>اتصال درگاه بانکی در حال تکمیل است (به‌زودی)</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              برای رعایت شفافیت با کاربران بینجر، درگاه پرداخت مستقیم شاپرک هنوز عمومی نشده است. در فاز فعلی، اعطای دسترسی VIP از طریق مدیریت یا رویدادهای ویژه انجام می‌شود.
            </p>
          </div>

          <button
            type="button"
            disabled
            className="mt-5 w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/10 py-3.5 text-sm font-black text-gray-400 opacity-80"
          >
            خرید اشتراک {selectedPlan === 'monthly' ? 'ماهانه' : 'سالانه'} — به‌زودی در دسترس قرار می‌گیرد
          </button>
        </section>
      </div>
    </main>
  );
}