"use client";

import { useState } from 'react';
import { ArrowRight, Check, Crown, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

const FEATURES = [
  'گفت‌وگوی نامحدود با دستیار سینمایی',
  'پیشنهاد سریال بر اساس مود لحظه‌ای',
  'درنظر گرفتن سابقه تماشای شما',
  'حذف پیشنهادهای تکراری و دیده‌شده',
];

export default function SubscriptionPage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [message, setMessage] = useState('');

  const handlePurchase = () => {
    setMessage('درگاه پرداخت به‌زودی فعال می‌شود. پلن انتخابی شما ذخیره شد.');
  };

  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-[#050505] px-4 py-8 text-white font-['Vazirmatn'] md:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.16),transparent_42%)]" />

      <div className="relative mx-auto max-w-5xl">
        <button
          onClick={() => router.back()}
          className="mb-10 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-gray-300 transition-colors hover:border-amber-400/50 hover:text-amber-300"
        >
          <ArrowRight size={16} /> بازگشت به دستیار
        </button>

        <section className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-yellow-600 text-black shadow-[0_0_35px_rgba(245,158,11,0.35)]">
            <Crown size={32} />
          </div>
          <p className="mb-3 text-xs font-bold tracking-[0.25em] text-amber-300">BINGER VIP</p>
          <h1 className="text-3xl font-black leading-tight md:text-5xl">برای هر مود، یک پیشنهاد دقیق</h1>
          <p className="mt-4 text-sm leading-7 text-gray-400">نسخه امشب فقط یک پیشنهاد هوشمند رایگان دارد. با VIP هر وقت خواستی با دستیار سینمایی گفت‌وگو کن.</p>
        </section>

        <section className="mx-auto mt-10 grid max-w-3xl gap-4 md:grid-cols-2">
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={`rounded-2xl border p-5 text-right transition-all ${selectedPlan === 'monthly' ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_30px_rgba(245,158,11,0.12)]' : 'border-white/10 bg-white/[0.03]'}`}
          >
            <span className="text-xs font-bold text-gray-400">ماهانه</span>
            <strong className="mt-2 block text-2xl font-black text-amber-300">۹۹٬۰۰۰ تومان</strong>
            <span className="mt-1 block text-xs text-gray-500">قابل تمدید هر ماه</span>
          </button>
          <button
            onClick={() => setSelectedPlan('yearly')}
            className={`relative rounded-2xl border p-5 text-right transition-all ${selectedPlan === 'yearly' ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_30px_rgba(245,158,11,0.12)]' : 'border-white/10 bg-white/[0.03]'}`}
          >
            <span className="absolute left-4 top-4 rounded-full bg-amber-400 px-2 py-1 text-[9px] font-black text-black">به‌صرفه‌تر</span>
            <span className="text-xs font-bold text-gray-400">سالانه</span>
            <strong className="mt-2 block text-2xl font-black text-amber-300">۹۹۰٬۰۰۰ تومان</strong>
            <span className="mt-1 block text-xs text-gray-500">دو ماه رایگان</span>
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
          <button onClick={handlePurchase} className="mt-8 w-full rounded-xl bg-gradient-to-r from-amber-300 to-yellow-500 py-3.5 text-sm font-black text-black shadow-[0_0_25px_rgba(245,158,11,0.25)] transition-transform hover:scale-[1.01]">
            خرید اشتراک {selectedPlan === 'monthly' ? 'ماهانه' : 'سالانه'}
          </button>
          {message && <p className="mt-4 text-center text-xs text-amber-200">{message}</p>}
        </section>
      </div>
    </main>
  );
}