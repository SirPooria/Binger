"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Feather, Award, Star, CheckCircle, Lock, ArrowRight, 
  Sparkles, Flame, Users, BookOpen, MessageSquare, Tv, Eye
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { 
  fetchRecentCriticReviews, 
  fetchUserCriticStatus, 
  type CriticReviewData, 
  type CriticStatus, 
  CRITIC_THRESHOLDS 
} from '@/lib/criticReviews';
import { getShowDetailsLite, getImageUrl } from '@/lib/tmdbClient';
import { VipUsername, CriticBadge } from '../components/VipBadge';

export default function CriticsClubPage() {
  const router = useRouter();
  const supabase = createClient() as any;

  const [user, setUser] = useState<any>(null);
  const [criticStatus, setCriticStatus] = useState<CriticStatus | null>(null);
  const [reviews, setReviews] = useState<CriticReviewData[]>([]);
  const [showMetadata, setShowMetadata] = useState<Record<number, { name: string; poster_path: string | null }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initPage = async () => {
      setLoading(true);
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);

        if (currentUser) {
          const status = await fetchUserCriticStatus(currentUser.id);
          setCriticStatus(status);
        }

        const recent = await fetchRecentCriticReviews(30);
        setReviews(recent);

        // Fetch show posters / titles for the shows in reviews
        const showIds = Array.from(new Set(recent.map((r) => r.show_id)));
        const metaMap: Record<number, { name: string; poster_path: string | null }> = {};
        await Promise.all(
          showIds.map(async (id) => {
            try {
              const d = await getShowDetailsLite(String(id));
              if (d) {
                metaMap[id] = {
                  name: d.name,
                  poster_path: d.poster_path,
                };
              }
            } catch {
              // ignore
            }
          })
        );
        setShowMetadata(metaMap);
      } catch (err) {
        console.error('Error loading critics hub:', err);
      } finally {
        setLoading(false);
      }
    };

    initPage();
  }, [supabase]);

  const verdictLabels: Record<string, { label: string; color: string }> = {
    masterpiece: { label: 'شاهکار ماندگار 🏆', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    recommended: { label: 'پیشنهاد تماشا 🔥', color: 'bg-[#ccff00]/15 text-[#ccff00] border-[#ccff00]/30' },
    mixed: { label: 'سلیقه‌ای ⚖️', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    not_recommended: { label: 'پیشنهاد نمی‌شود ⛔', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] pb-32 pt-8 sm:pt-12 px-4 sm:px-6 md:px-8">
      <div className="max-w-6xl mx-auto space-y-10">

        {/* هدر صفحه منتقدین */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-black">
            <Feather size={14} className="text-amber-400" />
            <span>باشگاه منتقدین رسمی بینجر</span>
          </div>
        </div>

        {/* HERO BANNER */}
        <div className="relative overflow-hidden rounded-[2.5rem] p-8 sm:p-12 bg-gradient-to-br from-[#241a06] via-[#121212] to-[#080808] border border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.12)]">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/15 rounded-full blur-[120px] pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-400/40 shadow-sm">
                <Award size={26} />
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                Binger Certified Critics Club
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight">
              نقد و ارزیابی موشکافانه سریال‌ها با قلم <span className="text-amber-400">منتقدین تاییدشده</span>
            </h1>

            <p className="text-sm sm:text-base text-gray-300 leading-relaxed font-light">
              در بینجر، هر کسی منتقد نیست! تنها اعضایی که زمان و عشق واقعی خود به دنیای سریال را با تماشای بیش از ۳,۰۰۰ اپیزود، ثبت بیش از ۱۰۰ تحلیل و اشتراک ویژه VIP به اثبات رسانده‌اند می‌توانند در تالار منتقدین قلم بزنند.
            </p>
          </div>
        </div>

        {/* کارت شرایط و وضعیت کاربر در انجمن منتقدین */}
        {user && criticStatus && (
          <div className={`rounded-3xl p-6 sm:p-8 border transition-all ${
            criticStatus.isCritic
              ? 'bg-gradient-to-r from-amber-500/15 via-yellow-500/5 to-transparent border-amber-400/40 shadow-[0_0_35px_rgba(245,158,11,0.15)]'
              : 'bg-white/5 border-white/10'
          }`}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border ${
                  criticStatus.isCritic
                    ? 'bg-amber-500/20 text-amber-400 border-amber-400/40 shadow-md'
                    : 'bg-white/10 text-gray-400 border-white/10'
                }`}>
                  <Feather size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-white">
                      {criticStatus.isCritic ? 'تبریک! شما منتقد رسمی بینجر هستید' : 'وضعیت شما برای پیوستن به منتقدین رسمی'}
                    </h3>
                    {criticStatus.isCritic && <CriticBadge size="xs" />}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {criticStatus.isCritic
                      ? 'شما مجاز به ثبت نقد تخصصی در صفحه اختصاصی تمامی سریال‌ها هستید.'
                      : 'برای نگارش نقد تخصصی و دریافت نشان منتقد رسمی در پروفایل، ۳ شرط زیر را تکمیل کنید:'}
                  </p>
                </div>
              </div>

              {!criticStatus.vipPassed && (
                <Link
                  href="/dashboard/subscription"
                  className="bg-gradient-to-r from-amber-400 to-yellow-300 text-black px-6 py-2.5 rounded-xl font-black text-xs hover:scale-105 transition-all shadow-md shrink-0"
                >
                  ارتقا به حساب VIP
                </Link>
              )}
            </div>

            {/* گیج‌های پیشرفت ۳ شرط */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* شرط ۱: VIP */}
              <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-gray-300">۱. اشتراک طلایی VIP</span>
                  {criticStatus.vipPassed ? (
                    <CheckCircle size={16} className="text-green-400" />
                  ) : (
                    <Lock size={14} className="text-gray-500" />
                  )}
                </div>
                <span className={`text-xs font-black ${criticStatus.vipPassed ? 'text-green-400' : 'text-amber-400'}`}>
                  {criticStatus.vipPassed ? 'تایید و فعال ✓' : 'غیرفعال (نیاز به ارتقا)'}
                </span>
                <p className="text-[10px] text-gray-500 mt-2">تایید هویت و تعهد منتقد</p>
              </div>

              {/* شرط ۲: کامنت‌ها */}
              <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-gray-300">۲. ثبت ۱۰۰ کامنت و تحلیل</span>
                  {criticStatus.commentsPassed ? (
                    <CheckCircle size={16} className="text-green-400" />
                  ) : (
                    <span className="text-[11px] font-mono text-gray-400">
                      {criticStatus.commentsCount} / ۱۰۰
                    </span>
                  )}
                </div>
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all"
                    style={{ width: `${criticStatus.commentsProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-2">سنجش فن‌بیان و دیدگاه سینمایی</p>
              </div>

              {/* شرط ۳: اپیزودها */}
              <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-gray-300">۳. تماشای ۳,۰۰۰ اپیزود</span>
                  {criticStatus.watchedPassed ? (
                    <CheckCircle size={16} className="text-green-400" />
                  ) : (
                    <span className="text-[11px] font-mono text-gray-400">
                      {criticStatus.watchedCount} / ۳,۰۰۰
                    </span>
                  )}
                </div>
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-[#ccff00] rounded-full transition-all"
                    style={{ width: `${criticStatus.watchedProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-2">رزومه سنگین و تجربه گسترده</p>
              </div>
            </div>
          </div>
        )}

        {/* لیست آخرین نقدهای منتقدین */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Sparkles className="text-amber-400" size={22} />
              <span>جدیدترین نقدهای تخصصی منتقدین</span>
              <span className="text-xs text-gray-500 font-bold">({reviews.length} نقد)</span>
            </h2>

            <Link href="/dashboard/explore" className="text-xs text-[#ccff00] font-bold hover:underline">
              کشف سریال‌ها →
            </Link>
          </div>

          {loading ? (
            <div className="py-20 text-center text-gray-500 text-xs">در حال بارگذاری تالار نقدها...</div>
          ) : reviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reviews.map((rev) => {
                const showInfo = showMetadata[rev.show_id];
                const verdict = verdictLabels[rev.verdict] || verdictLabels.recommended;

                return (
                  <div
                    key={rev.id}
                    className="bg-[#121212] border border-white/10 hover:border-amber-400/40 rounded-3xl p-6 transition-all shadow-lg flex flex-col justify-between group"
                  >
                    <div>
                      {/* هدر منتقد و سریال */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <Link href={`/dashboard/user/${rev.user_id}`}>
                            <div className="w-11 h-11 rounded-full border border-amber-400/40 bg-gray-800 flex items-center justify-center text-xl shadow-md">
                              {rev.user?.avatar_url || '😎'}
                            </div>
                          </Link>

                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Link href={`/dashboard/user/${rev.user_id}`}>
                                <VipUsername
                                  username={rev.user?.username}
                                  isVip={rev.user?.is_vip}
                                  badgeSize={13}
                                  className="text-xs sm:text-sm font-black"
                                />
                              </Link>
                              <CriticBadge size="xs" />
                            </div>
                            <span className="text-[10px] text-gray-500 block mt-0.5">
                              {new Date(rev.created_at).toLocaleDateString('fa-IR')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl text-amber-400 font-mono font-black text-xs shrink-0">
                          <Star size={13} className="fill-amber-400" />
                          <span>{rev.rating}</span>
                          <span className="text-[9px] text-gray-500 font-normal">/۱۰</span>
                        </div>
                      </div>

                      {/* اطلاعات اثر */}
                      <Link
                        href={`/dashboard/tv/${rev.show_id}`}
                        className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-all mb-4"
                      >
                        <div className="w-10 h-14 bg-gray-800 rounded-lg overflow-hidden shrink-0">
                          {showInfo?.poster_path ? (
                            <img
                              src={getImageUrl(showInfo.poster_path)}
                              alt={showInfo.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-600">
                              IMG
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] text-gray-400 block">نقد ثبت‌شده برای سریال:</span>
                          <h4 className="text-xs sm:text-sm font-black text-white truncate group-hover:text-amber-300 transition-colors">
                            {showInfo?.name || `سریال #${rev.show_id}`}
                          </h4>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${verdict.color}`}>
                          {verdict.label}
                        </span>
                      </Link>

                      {/* عنوان و گزیده نقد */}
                      <h3 className="text-sm sm:text-base font-black text-white mb-2 leading-snug">
                        {rev.title}
                      </h3>

                      <p className="text-xs text-gray-300 leading-relaxed font-light line-clamp-3 text-justify">
                        {rev.text}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[11px] text-gray-500">
                        {rev.spoiler ? '⚠️ شامل اسپویلر' : '✓ بدون اسپویلر'}
                      </span>

                      <Link
                        href={`/dashboard/tv/${rev.show_id}`}
                        className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                      >
                        <span>مطالعه کامل در صفحه سریال</span>
                        <ArrowRight size={13} className="rotate-180" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-20 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-3xl p-8 space-y-3 text-gray-500">
              <Feather size={40} className="mx-auto text-amber-500/40" />
              <h4 className="text-base font-bold text-gray-300">هنوز نقدی در باشگاه منتقدین ثبت نشده است</h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                اگر واجد شرایط هستید، به صفحه هر سریال مراجعه کنید و اولین نقد رسمی را با نام و نشان خود منتشر کنید!
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
