"use client";

import { useEffect, useState } from 'react';
import { 
  ArrowRight, Check, X, Crown, Sparkles, Clock, ShieldCheck, 
  BarChart3, Pin, Layers, Dna, Tv, Film, Award, CheckCircle2 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

const VIP_FEATURES = [
  {
    title: 'ساخت نامحدود لیست‌های سفارشی',
    desc: 'بدون محدودیت ۳ لیست برای کاربران عادی، هر تعداد کالکشن و لیست که دوست دارید بسازید.',
    icon: <Layers size={18} className="text-amber-300" />
  },
  {
    title: 'سنجاق کردن لیست در بالای پروفایل',
    desc: 'کالکشن منتخب و شاخص خود را در صدر پروفایل سنجاق (پین) کنید تا همه اولین بار آن را ببینند.',
    icon: <Pin size={18} className="text-amber-300" />
  },
  {
    title: 'آمار پیشرفته و سالنامه تماشا (Binger Wrapped)',
    desc: 'کارت سالانه افتخارات تماشا شبیه به Spotify Wrapped با قابلیت دانلود، اشتراک و بررسی روند سالانه.',
    icon: <BarChart3 size={18} className="text-amber-300" />
  },
  {
    title: 'محبوب‌ترین بازیگر و بیشترین کارگردان دیده‌شده',
    desc: 'نمودارهای دقیق از ستارگان و کارگردانانی که بیشترین اپیزود و اثر را از آن‌ها تماشا کرده‌اید.',
    icon: <Film size={18} className="text-amber-300" />
  },
  {
    title: 'ساعات دقیق تماشا در ماه و سال',
    desc: 'نمودارهای گرافیکی تعاملی روند تماشا بر اساس ماه‌های سال، روزهای هفته و ساعات شبانه‌روز.',
    icon: <Clock size={18} className="text-amber-300" />
  },
  {
    title: 'تحلیل ژنتیک و DNA سلیقه سریالی',
    desc: 'شناسنامه اختصاصی توزیع ژانرها، دهه‌های تاریخی، شبکه‌های برتر و کهن‌الگوی تماشاچی شما.',
    icon: <Dna size={18} className="text-amber-300" />
  },
  {
    title: 'گفت‌وگوی نامحدود با دستیار هوشمند دکتر بینجر',
    desc: 'تجویز بی‌پایان سریال بر اساس حال و هوای روحی و مود لحظه‌ای با حذف کامل تکراری‌ها.',
    icon: <Tv size={18} className="text-amber-300" />
  },
  {
    title: 'بج و قاب طلایی درخشان VIP',
    desc: 'تمایز ظاهری لوکس در پروفایل، لیدربورد هفتگی و بخش کامنت‌های اپیزودها.',
    icon: <Award size={18} className="text-amber-300" />
  },
];

const COMPARISON_ROWS = [
  { feature: 'سقف ساخت لیست‌های سفارشی', free: 'حداکثر ۳ لیست', vip: 'نامحدود ⚡' },
  { feature: 'سنجاق کردن لیست در بالای پروفایل', free: 'ندارد', vip: 'دارد 📌' },
  { feature: 'آمار پایه (اپیزودها و زمان کل)', free: 'دارد', vip: 'دارد' },
  { feature: 'نمودار تفکیکی ساعات ماهانه و سالانه', free: 'قفل 🔒', vip: 'کامل با جزئیات گرافیکی 📊' },
  { feature: 'محبوب‌ترین بازیگران من (Top Actors)', free: 'قفل 🔒', vip: 'باز با عکس و رتبه 🎭' },
  { feature: 'بیشترین کارگردان دیده‌شده (Top Directors)', free: 'قفل 🔒', vip: 'باز با عکس و سابقه 🎬' },
  { feature: 'تحلیل ژنتیک سلیقه و کهن‌الگو (Series DNA)', free: 'قفل 🔒', vip: 'شناسنامه کامل و رادار 🧬' },
  { feature: 'کارت سالنامه Binger Wrapped', free: 'قفل 🔒', vip: 'امکان ساخت و دانلود اشتراکی 🌟' },
  { feature: 'دکتر بینجر (پیشنهاد هوش مصنوعی)', free: 'روزانه ۱ پیشنهاد', vip: 'نامحدود 🤖' },
  { feature: 'تیک آبی و قاب طلایی پروفایل', free: 'ندارد', vip: 'فعال 👑' },
];

export default function SubscriptionPage() {
  const router = useRouter();
  const supabase = createClient() as any;
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
            .select('is_vip, role')
            .eq('id', user.id)
            .single();
          if (data?.is_vip || data?.role === 'admin') {
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
    <main dir="rtl" className="min-h-screen bg-[#050505] px-4 py-8 text-white font-['Vazirmatn'] md:px-8 relative overflow-x-hidden pb-24">
      {/* هاله طلایی بالای صفحه */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_50%)]" />

      <div className="relative mx-auto max-w-5xl z-10">
        
        {/* نوار ناوبری بالا */}
        <div className="flex items-center justify-between mb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-gray-300 transition-colors hover:border-amber-400/50 hover:text-amber-300 focus:outline-none"
          >
            <ArrowRight size={16} /> بازگشت
          </button>

          <Link
            href="/dashboard/insights"
            className="flex items-center gap-2 text-xs font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-400/30 px-4 py-2 rounded-full hover:bg-cyan-500/20 transition-all shadow-[0_0_15px_rgba(34,211,238,0.15)]"
          >
            <BarChart3 size={15} />
            <span>مشاهده صفحه آمار و DNA</span>
          </Link>
        </div>

        {/* بخش هیرو و عنوان */}
        <section className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 text-black shadow-[0_0_50px_rgba(245,158,11,0.45)]">
            <Crown size={40} />
          </div>
          
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-xs font-bold text-amber-300 mb-4 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Sparkles size={14} />
            <span>عضویت ویژه و ابزارهای حرفه‌ای بینجر (BINGER VIP)</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight tracking-tight">
            ابزارهای نامحدود، <span className="bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent">آمار پیشرفته</span> و سالنامه تماشا
          </h1>
          
          <p className="mt-4 text-sm sm:text-base leading-relaxed text-gray-300 max-w-2xl mx-auto">
            با اشتراک VIP، سقف ۳ لیست را بشکنید، کالکشن‌هایتان را در صدر پروفایل پین کنید، به نمودارهای دقیق بازیگران و کارگردان‌ها دست پیدا کنید و کارت سالنامه Binger Wrapped خود را دریافت نمایید.
          </p>

          {isVip && (
            <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <ShieldCheck size={22} />
              <span className="text-sm font-black">اشتراک ویژه VIP هم‌اکنون روی حساب کاربری شما فعال و نامحدود است!</span>
            </div>
          )}
        </section>

        {/* انتخاب پلن */}
        <section className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setSelectedPlan('monthly')}
            className={`rounded-3xl border p-6 text-right transition-all cursor-pointer relative overflow-hidden ${
              selectedPlan === 'monthly' 
                ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_30px_rgba(245,158,11,0.15)]' 
                : 'border-white/10 bg-white/[0.02] hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-400">پلن ماهانه</span>
              {selectedPlan === 'monthly' && (
                <span className="w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center text-xs">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </div>
            <strong className="block text-2xl sm:text-3xl font-black text-amber-300">۹۹٬۰۰۰ تومان</strong>
            <span className="mt-2 block text-xs text-gray-400">دسترسی کامل به مدت ۳۰ روز</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPlan('yearly')}
            className={`relative rounded-3xl border p-6 text-right transition-all cursor-pointer overflow-hidden ${
              selectedPlan === 'yearly' 
                ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_30px_rgba(245,158,11,0.2)]' 
                : 'border-white/10 bg-white/[0.02] hover:border-white/20'
            }`}
          >
            <span className="absolute left-4 top-4 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-2.5 py-1 text-[10px] font-black text-black shadow-md">
              ۲ ماه هدیه رایگان 🔥
            </span>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-400">پلن سالانه (یک‌ساله)</span>
              {selectedPlan === 'yearly' && (
                <span className="w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center text-xs">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </div>
            <strong className="block text-2xl sm:text-3xl font-black text-amber-300">۹۹۰٬۰۰۰ تومان</strong>
            <span className="mt-2 block text-xs text-gray-400">شامل ۱۲ ماه دسترسی نامحدود (به جای ۱٬۱۸۸٬۰۰۰)</span>
          </button>
        </section>

        {/* لیست امکانات جامع VIP */}
        <section className="mx-auto mt-8 max-w-4xl rounded-3xl border border-amber-400/30 bg-gradient-to-br from-[#16120b] via-[#101010] to-[#0a0a0a] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="mb-8 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-400/20 text-amber-300">
              <Sparkles size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">امکانات و مزایای اختصاصی اشتراک VIP</h2>
              <p className="text-xs text-gray-400 mt-0.5">همه آنچه برای تجربه پیشرفته‌ترین دستیار و ژورنال سریال نیاز دارید</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {VIP_FEATURES.map((item, idx) => (
              <div 
                key={idx} 
                className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-amber-400/30 transition-colors"
              >
                <div className="p-2 rounded-xl bg-amber-400/10 shrink-0 mt-0.5">
                  {item.icon}
                </div>
                <div>
                  <h4 className="text-sm font-black text-white mb-1">{item.title}</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* جدول مقایسه Free vs VIP */}
          <div className="mt-10 pt-8 border-t border-white/10">
            <h3 className="text-base font-black text-amber-300 mb-4 flex items-center gap-2">
              <ShieldCheck size={18} /> جدول مقایسه حساب عادی با اشتراک VIP
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-gray-400">
                    <th className="p-3.5 font-bold">قابلیت و امکانات</th>
                    <th className="p-3.5 font-bold text-center">کاربر عادی</th>
                    <th className="p-3.5 font-bold text-center text-amber-300">مشترک VIP 👑</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {COMPARISON_ROWS.map((row, index) => (
                    <tr key={index} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5 font-medium text-gray-300">{row.feature}</td>
                      <td className="p-3.5 text-center text-gray-400 font-bold">{row.free}</td>
                      <td className="p-3.5 text-center text-amber-300 font-black">{row.vip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* اطلاع‌رسانی درگاه پرداخت */}
          <div className="mt-8 rounded-2xl border border-white/10 bg-black/50 p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-amber-300 font-bold text-sm mb-1">
              <Clock size={16} />
              <span>اتصال درگاه بانکی مستقیم شاپرک در مرحله نهایی است</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed max-w-xl mx-auto">
              جهت حفظ حقوق کاربران، درگاه خرید مستقیم کارت‌های شتاب در روزهای آینده فعال خواهد شد. در فاز فعلی، اشتراک‌های VIP از طریق ایونت‌های معرفی دوستان (جام بینجر)، پیش‌ثبت‌نام و کدهای هدیه فعال می‌شوند.
            </p>
          </div>

          <button
            type="button"
            disabled
            className="mt-6 w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/10 py-4 text-sm font-black text-gray-400 opacity-80"
          >
            خرید اشتراک {selectedPlan === 'monthly' ? 'ماهانه' : 'سالانه'} — به‌زودی در دسترس قرار می‌گیرد
          </button>
        </section>

      </div>
    </main>
  );
}