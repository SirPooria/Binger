"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Crown,
  Sparkles,
  Check,
  ShieldCheck,
  Zap,
  ArrowRight,
  Flame,
  Award,
  Layers,
  BarChart3,
  Tv,
  Star,
  Lock,
  ChevronDown,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { toPersianDigits } from '@/lib/subscription';

interface PlanDetails {
  id: 'monthly' | 'yearly';
  title: string;
  badge?: string;
  originalPrice?: number;
  price: number;
  period: string;
  subtitle: string;
  popular?: boolean;
  savings?: string;
}

const PLANS: PlanDetails[] = [
  {
    id: 'monthly',
    title: 'پلن استاندارد ماهانه',
    price: 149_000,
    period: 'ماهانه (۳۰ روز)',
    subtitle: 'انعطاف‌پذیر و بدون تعهد بلندمدت؛ شروع تجربه حرفه‌ای سینما',
  },
  {
    id: 'yearly',
    title: 'پلن طلایی سالانه',
    badge: 'دو ماه رایگان',
    originalPrice: 1_788_000,
    price: 1_490_000,
    period: 'سالانه (۱۲ ماه)',
    subtitle: 'بهترین انتخاب برای عاشقان واقعی سریال؛ معادل ۱۲۴ هزار تومان در ماه',
    popular: true,
    savings: '۲۹۸,۰۰۰ تومان صرفه‌جویی نقدی (۱۷٪ تخفیف واقعی)',
  },
];

const VIP_BENEFITS = [
  {
    title: 'نشان طلایی کاربری (Golden Badge)',
    desc: 'نمایش بج درخشان و برجسته VIP در کنار نام شما در پروفایل، دیدگاه‌ها و لیدربورد هفتگی.',
    icon: Award,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10 border-amber-400/20',
  },
  {
    title: 'دسترسی به نقدهای اختصاصی',
    desc: 'مطالعه مقالات تحلیلی عمیق، نقد منتقدین سینما و بخش‌های اختصاصی مجله بینجر.',
    icon: Star,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10 border-emerald-400/20',
  },
  {
    title: 'تجربه کاملاً بدون تبلیغات',
    desc: 'محیطی بی‌نهایت خلوت، سریع و متمرکز بدون هیچ‌گونه آگهی بازرگانی یا پاپ‌آپ مزاحم.',
    icon: Zap,
    color: 'text-[#ccff00]',
    bg: 'bg-[#ccff00]/10 border-[#ccff00]/20',
  },
  {
    title: 'شخصی‌سازی هویت سینمایی',
    desc: 'امکان سفارشی‌سازی کامل بنر، تم، اولویت‌های نمایش و هویت بصری حساب کاربری شما.',
    icon: Flame,
    color: 'text-rose-400',
    bg: 'bg-rose-400/10 border-rose-400/20',
  },
  {
    title: 'ساخت نامحدود لیست‌های سفارشی',
    desc: 'حذف سقف ۳ لیست رایگان؛ هر تعداد لیست و کالکشن موضوعی که دوست دارید بسازید.',
    icon: Layers,
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10 border-cyan-400/20',
  },
  {
    title: 'مشاوره نامحدود با دکتر بینجر هوش مصنوعی',
    desc: 'پیشنهاد هوشمندانه آثار بر اساس خلق‌وخو (مود) با حذف سقف مصرف روزانه بدون محدودیت.',
    icon: Tv,
    color: 'text-purple-400',
    bg: 'bg-purple-400/10 border-purple-400/20',
  },
  {
    title: 'سالنامه و آمار پیشرفته (Binger Wrapped)',
    desc: 'کارت سالانه دستاوردها شبیه به Spotify Wrapped به همراه نمودارهای گرافیکی روند تماشا.',
    icon: BarChart3,
    color: 'text-amber-300',
    bg: 'bg-amber-300/10 border-amber-300/20',
  },
  {
    title: 'سنجاق کردن لیست در صدر پروفایل',
    desc: 'کالکشن شاخص و دست‌چین خود را پین کنید تا به عنوان ویترین سلیقه‌تان به دیگران نمایش یابد.',
    icon: CheckCircle2,
    color: 'text-teal-400',
    bg: 'bg-teal-400/10 border-teal-400/20',
  },
];

const FAQS = [
  {
    q: 'آیا اشتراک پس از اتمام دوره به صورت خودکار تمدید می‌شود؟',
    a: 'خیر، در بینجر هیچ‌گونه برداشت خودکاری انجام نمی‌شود. پس از پایان اعتبار دوره، انتخاب با شماست که پلن خود را مجدداً تمدید کنید یا به حساب استاندارد بازگردید.',
  },
  {
    q: 'تفاوت پلن ماهانه و سالانه در چیست؟',
    a: 'هر دو پلن دسترسی ۱۰۰٪ کامل و نامحدود به تمامی امکانات VIP را فراهم می‌کنند. اما در پلن سالانه، با پرداخت هزینه ۱۰ ماه، ۱۲ ماه کامل اشتراک دریافت می‌کنید (۲ ماه رایگان و ۲۹۸ هزار تومان تخفیف نقدی).',
  },
  {
    q: 'آیا با ارتقا به VIP اطلاعات و واچ‌لیست‌های فعلی من حفظ می‌شوند؟',
    a: 'بله کاملاً! حساب شما بدون هیچ تغییری در تاریخچه تماشا، اپیزودهای دیده‌شده یا واچ‌لیست‌ها بلافاصله به سطح طلایی VIP ارتقا می‌یابد.',
  },
  {
    q: 'چگونه می‌توانم با تیم پشتیبانی در ارتباط باشم؟',
    a: 'تیم پشتیبانی اختصاصی کاربران VIP در تمام روزهای هفته آماده پاسخگویی به پرسش‌ها و راهنمایی شماست.',
  },
];

export default function VipLandingClient() {
  const router = useRouter();
  const supabase = createClient() as any;

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isVip, setIsVip] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_vip')
            .eq('id', user.id)
            .maybeSingle();
          if (profile?.is_vip) {
            setIsVip(true);
          }
        }
      } catch (err) {
        console.error('Error checking user session:', err);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [supabase]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handlePurchase = (planId: 'monthly' | 'yearly') => {
    const plan = PLANS.find((p) => p.id === planId);
    console.log('[VIP Upgrade] Purchase initiated for plan:', {
      planId,
      planTitle: plan?.title,
      price: plan?.price,
      userId: currentUser?.id || 'guest',
      timestamp: new Date().toISOString(),
    });

    showToast(
      `درگاه پرداخت آنلاین به‌زودی متصل می‌شود! پلن «${plan?.title}» برای حساب شما ثبت اولیه شد 🚀`
    );
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] selection:bg-amber-400 selection:text-black relative overflow-hidden pb-24">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-[#141414] border border-amber-400/40 text-amber-300 shadow-[0_0_30px_rgba(251,191,36,0.3)] backdrop-blur-xl text-xs sm:text-sm font-bold">
            <Sparkles className="w-5 h-5 text-amber-400 animate-spin shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Background Golden Ambient Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[30rem] h-[30rem] bg-[#ccff00]/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Top Navigation */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between border-b border-white/5 relative z-10">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 p-0.5 shadow-[0_0_20px_rgba(251,191,36,0.3)]">
              <div className="w-full h-full bg-[#0a0a0a] rounded-[14px] flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white block">
                Binger <span className="text-amber-400">VIP</span>
              </span>
              <span className="text-[10px] text-gray-400 block -mt-1 font-mono">PREMIUM CLUB</span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {currentUser ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 transition border border-white/10"
            >
              <span>داشبورد من</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <Link
              href="/login?next=/vip"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black transition shadow-[0_0_15px_rgba(251,191,36,0.3)]"
            >
              <span>ورود به حساب</span>
            </Link>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 space-y-16 relative z-10">
        <section className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-400/15 via-yellow-400/10 to-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-black shadow-[0_0_25px_rgba(251,191,36,0.15)]">
            <Crown className="w-4 h-4 text-amber-400 animate-bounce" />
            <span>تجربه لوکس و نامحدود در بینجر</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight">
            فرمانروایی در دنیای سریال با{' '}
            <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent underline decoration-amber-400/40 decoration-wavy decoration-2">
              اشتراک طلایی VIP
            </span>
          </h1>

          <p className="text-sm sm:text-base text-gray-400 leading-relaxed max-w-2xl mx-auto">
            محدودیت‌ها را پشت سر بگذارید. با ارتقا به حساب VIP، به آمار پیشرفته هوشمند، نقدهای اختصاصی، نشان طلایی کاربری و دستیار بی‌پایان سینمایی دست پیدا کنید.
          </p>

          {isVip && (
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>حساب شما در حال حاضر دارای اشتراک فعال VIP است! برای تمدید یا افزایش دوره می‌توانید پلن جدید انتخاب کنید.</span>
            </div>
          )}
        </section>

        {/* Pricing Cards Section */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-white">انتخاب پلن ارتقا</h2>
            <p className="text-xs sm:text-sm text-gray-400">بهترین گزینه متناسب با سبک زندگی سینمایی خود را انتخاب کنید</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch">
            {PLANS.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              const isYearly = plan.id === 'yearly';

              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative rounded-3xl p-7 sm:p-9 flex flex-col justify-between transition-all duration-300 cursor-pointer ${
                    isYearly
                      ? 'bg-gradient-to-b from-[#131208] via-[#0d0d0a] to-[#070707] border-2 border-amber-400/60 shadow-[0_0_50px_rgba(251,191,36,0.18)] hover:border-amber-400'
                      : 'bg-[#0b0b0b] border border-white/10 hover:border-white/20 shadow-xl'
                  } ${isSelected ? 'ring-2 ring-amber-400/40' : ''}`}
                >
                  {/* Top Glowing Badge for Yearly */}
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-xs font-black shadow-[0_0_20px_rgba(251,191,36,0.6)] flex items-center gap-1.5 uppercase tracking-wide">
                      <Sparkles className="w-3.5 h-3.5 fill-black" />
                      <span>{plan.badge}</span>
                    </div>
                  )}

                  {/* Header info */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                          <span>{plan.title}</span>
                          {isYearly && <Crown className="w-5 h-5 text-amber-400" />}
                        </h3>
                        <p className="text-xs text-gray-400 leading-relaxed">{plan.subtitle}</p>
                      </div>

                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected ? 'border-amber-400 bg-amber-400 text-black' : 'border-white/20 bg-white/5'
                      }`}>
                        {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                    </div>

                    {/* Price Display */}
                    <div className="pt-4 pb-4 border-y border-white/5 space-y-1.5">
                      {plan.originalPrice && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500 line-through font-mono">
                            {toPersianDigits(plan.originalPrice.toLocaleString('en-US'))}
                          </span>
                          <span className="text-gray-500 line-through">تومان</span>
                          <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 text-[10px] font-bold">
                            تخفیف ویژه سالانه
                          </span>
                        </div>
                      )}

                      <div className="flex items-baseline gap-2">
                        <span className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${
                          isYearly ? 'text-amber-400' : 'text-white'
                        }`}>
                          {toPersianDigits(plan.price.toLocaleString('en-US'))}
                        </span>
                        <span className="text-sm font-bold text-gray-400">تومان</span>
                        <span className="text-xs text-gray-500 font-mono">/ {plan.period}</span>
                      </div>

                      {plan.savings && (
                        <div className="pt-1 flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{plan.savings}</span>
                        </div>
                      )}
                    </div>

                    {/* Highlighted bullets */}
                    <ul className="space-y-3 pt-2 text-xs sm:text-sm text-gray-300">
                      <li className="flex items-center gap-2.5">
                        <Check className={`w-4 h-4 shrink-0 ${isYearly ? 'text-amber-400' : 'text-[#ccff00]'}`} />
                        <span>دسترسی ۱۰۰٪ بدون محدودیت به تمامی قابلیت‌های VIP</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <Check className={`w-4 h-4 shrink-0 ${isYearly ? 'text-amber-400' : 'text-[#ccff00]'}`} />
                        <span>نشان طلایی کاربری در پروفایل و لیدربورد</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <Check className={`w-4 h-4 shrink-0 ${isYearly ? 'text-amber-400' : 'text-[#ccff00]'}`} />
                        <span>{isYearly ? '۱۲ ماه اشتراک پیوسته (پرداخت فقط ۱۰ ماه)' : '۳۰ روز اشتراک کامل'}</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <Check className={`w-4 h-4 shrink-0 ${isYearly ? 'text-amber-400' : 'text-[#ccff00]'}`} />
                        <span>بدون تمدید خودکار؛ فعال‌سازی فوری حساب</span>
                      </li>
                    </ul>
                  </div>

                  {/* CTA Button */}
                  <div className="pt-8">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePurchase(plan.id);
                      }}
                      className={`w-full py-4 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-lg ${
                        isYearly
                          ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black hover:brightness-110 shadow-[0_0_30px_rgba(251,191,36,0.4)]'
                          : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                      }`}
                    >
                      <Crown className="w-4 h-4" />
                      <span>{isYearly ? 'خرید اشتراک سالانه (با ۲ ماه هدیه)' : 'خرید اشتراک ماهانه'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="space-y-8 pt-8 border-t border-white/5">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ALL INCLUSIVE VIP SUITE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              امکاناتی که با پیوستن به جمع VIP در اختیارتان قرار می‌گیرد
            </h2>
            <p className="text-xs sm:text-sm text-gray-400">
              هر آنچه برای لذت بردن عمیق‌تر از سینما و مجموعه‌های تلویزیونی نیاز دارید
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {VIP_BENEFITS.map((b, idx) => {
              const Icon = b.icon;
              return (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-[#0b0b0b] border border-white/5 hover:border-white/15 transition-all space-y-3 group"
                >
                  <div className={`w-10 h-10 rounded-xl ${b.bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                    <Icon className={`w-5 h-5 ${b.color}`} />
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                    {b.title}
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {b.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Trust & Guarantee Banner */}
        <section className="rounded-3xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 border border-amber-400/25 p-6 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-right shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-white">تضمین کیفیت و پشتیبانی لحظه‌ای</h3>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                پرداخت امن از طریق شبکه شتاب، فعال‌سازی آنی اکانت و تیم پشتیبانی در دسترس برای پاسخ به هرگونه سوال.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handlePurchase(selectedPlan)}
            className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black transition shrink-0 shadow-[0_0_20px_rgba(251,191,36,0.3)] cursor-pointer"
          >
            شروع ارتقای حساب
          </button>
        </section>

        {/* FAQs Section */}
        <section className="space-y-6 pt-4 max-w-3xl mx-auto">
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-white">سوالات متداول</h2>
            <p className="text-xs text-gray-400">پاسخ به سوالات پرتکرار شما در مورد اشتراک ویژه بینجر</p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-[#0b0b0b] border border-white/5 overflow-hidden transition"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between text-right text-xs sm:text-sm font-bold text-white hover:text-amber-300 transition cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180 text-amber-400' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-gray-400 leading-relaxed border-t border-white/5 pt-3 animate-in fade-in duration-200">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
