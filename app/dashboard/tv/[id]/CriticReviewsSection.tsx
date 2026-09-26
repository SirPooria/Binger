"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Star, Award, Feather, CheckCircle, Lock, AlertCircle, 
  Send, Sparkles, Eye, EyeOff, Trash2, Share2, ThumbsUp, 
  MessageSquare, Tv, Flame, Trophy, ShieldCheck
} from 'lucide-react';
import { 
  CriticReviewData, 
  CriticStatus, 
  fetchCriticReviewsForShow, 
  fetchUserCriticStatus, 
  submitCriticReview, 
  deleteCriticReview,
  canUserSubmitReview
} from '@/lib/criticReviews';
import { VipUsername, CriticBadge, VipCheckmark } from '../../components/VipBadge';
import ConfirmModal from '../../components/ConfirmModal';
import confetti from 'canvas-confetti';

interface CriticReviewsSectionProps {
  showId: number | string;
  showName: string;
  user: any;
}

const VERDICT_OPTIONS = [
  { value: 'masterpiece', label: 'شاهکار ماندگار 🏆', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { value: 'recommended', label: 'پیشنهاد قطعی تماشا 🔥', color: 'bg-[#ccff00]/15 text-[#ccff00] border-[#ccff00]/30' },
  { value: 'mixed', label: 'تماشای سلیقه‌ای ⚖️', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  { value: 'not_recommended', label: 'پیشنهاد نمی‌شود ⛔', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
] as const;

export default function CriticReviewsSection({ showId, showName, user }: CriticReviewsSectionProps) {
  const [reviews, setReviews] = useState<CriticReviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [criticStatus, setCriticStatus] = useState<CriticStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [deleteReviewId, setDeleteReviewId] = useState<number | null>(null);
  const [isDeletingReview, setIsDeletingReview] = useState(false);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [rating, setRating] = useState<number>(8);
  const [verdict, setVerdict] = useState<'masterpiece' | 'recommended' | 'mixed' | 'not_recommended'>('recommended');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [spoiler, setSpoiler] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<number>>(new Set());

  // Load reviews and user critic status
  const loadReviews = async () => {
    setLoading(true);
    const data = await fetchCriticReviewsForShow(showId);
    setReviews(data);
    setLoading(false);
  };

  useEffect(() => {
    loadReviews();
  }, [showId]);

  useEffect(() => {
    if (!user?.id) return;
    const checkStatus = async () => {
      setCheckingStatus(true);
      const status = await fetchUserCriticStatus(user.id);
      setCriticStatus(status);
      setCheckingStatus(false);
    };
    checkStatus();
  }, [user?.id]);

  const userExistingReview = user ? reviews.find((r) => r.user_id === user.id) : null;
  const hasWrittenReview = Boolean(userExistingReview);

  useEffect(() => {
    if (hasWrittenReview && isFormOpen) {
      setIsFormOpen(false);
    }
  }, [hasWrittenReview, isFormOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (hasWrittenReview) {
      setErrorMsg('شما قبلاً برای این سریال نقد ثبت کرده‌اید. هر منتقد فقط می‌تواند یک نقد برای هر سریال ثبت کند.');
      return;
    }
    if (!title.trim() || !text.trim()) {
      setErrorMsg('لطفاً عنوان و متن نقد تحلیلی خود را وارد کنید.');
      return;
    }
    if (text.trim().length < 30) {
      setErrorMsg('متن نقد تخصصی باید حداقل ۳۰ کاراکتر باشد.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const res = await submitCriticReview({
      userId: user.id,
      showId,
      rating,
      verdict,
      title,
      text,
      spoiler,
    });

    setSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.error || 'خطا در ثبت نقد تخصصی');
      return;
    }

    // Reset form and reload
    setTitle('');
    setText('');
    setRating(8);
    setVerdict('recommended');
    setSpoiler(false);
    setIsFormOpen(false);

    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#f59e0b', '#ccff00', '#38bdf8', '#ffffff'],
      });
    } catch {
      // Confetti fallback
    }

    loadReviews();
  };

  const handleConfirmDelete = async () => {
    if (!user?.id || !deleteReviewId) return;
    setIsDeletingReview(true);
    try {
      const success = await deleteCriticReview(deleteReviewId, user.id);
      if (success) {
        setReviews((prev) => prev.filter((r) => r.id !== deleteReviewId));
      }
      setDeleteReviewId(null);
    } finally {
      setIsDeletingReview(false);
    }
  };

  const toggleSpoilerReveal = (id: number) => {
    setRevealedSpoilers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Calculations for critics scoreboard
  const totalReviewsCount = reviews.length;
  const avgCriticsRating = totalReviewsCount > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviewsCount).toFixed(1)
    : null;
  const positiveCount = reviews.filter((r) => r.verdict === 'masterpiece' || r.verdict === 'recommended').length;
  const positivePercentage = totalReviewsCount > 0
    ? Math.round((positiveCount / totalReviewsCount) * 100)
    : null;

  return (
    <div className="space-y-8">
      {/* Header Banner & Scoreboard */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#1c1608] via-[#121212] to-[#0a0a0a] border border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.08)]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-black shadow-sm">
              <Feather size={14} className="text-amber-400" />
              <span>تالار نقد و بررسی منتقدین رسمی بینجر</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              تحلیل و امتیاز منتقدین تاییدشده به <span className="text-amber-400">{showName}</span>
            </h2>

            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              این نقدها منحصراً توسط اعضای VIP بینجر که بیش از ۳,۰۰۰ اپیزود تماشا کرده و حداقل ۱۰۰ نظر تحلیلی نوشته‌اند ثبت می‌شود.
            </p>
          </div>

          {/* نمره و شاخص رضایت منتقدین */}
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 backdrop-blur-md p-4 sm:p-5 rounded-2xl shrink-0 self-stretch md:self-auto justify-around">
            <div className="text-center">
              <span className="text-[11px] text-gray-400 block mb-1 font-bold">میانگین نمره منتقدین</span>
              <div className="flex items-center justify-center gap-1.5" dir="ltr">
                <span className="text-3xl sm:text-4xl font-black text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                  {avgCriticsRating || '-'}
                </span>
                <span className="text-xs text-gray-500 font-bold">/ ۱۰</span>
              </div>
              <span className="text-[10px] text-gray-500 mt-1 block">از {totalReviewsCount} نقد تخصصی</span>
            </div>

            <div className="w-px h-12 bg-white/10" />

            <div className="text-center">
              <span className="text-[11px] text-gray-400 block mb-1 font-bold">پیشنهاد تماشا</span>
              <div className="flex items-center justify-center gap-1">
                <span className="text-3xl sm:text-4xl font-black text-[#ccff00]">
                  {positivePercentage !== null ? `${positivePercentage}٪` : '-'}
                </span>
              </div>
              <span className="text-[10px] text-gray-500 mt-1 block">ارزیابی مثبت</span>
            </div>
          </div>
        </div>
      </div>

      {/* بخش بررسی صلاحیت منتقد یا فرم نوشتن نقد */}
      {user ? (
        criticStatus?.isCritic ? (
          <div className="bg-[#141414] border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-400/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                  <Feather size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-white">ثبت نقد تخصصی منتقد رسمی</h3>
                    <CriticBadge size="xs" />
                  </div>
                  <p className="text-xs text-gray-400">
                    {hasWrittenReview 
                      ? 'شما قبلاً نقد خود را برای این سریال ثبت کرده‌اید.' 
                      : 'دیدگاه تحلیلی خود را برای راهنمایی سایر کاربران به اشتراک بگذارید.'}
                  </p>
                </div>
              </div>

              {hasWrittenReview ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs font-bold shadow-sm">
                  <CheckCircle size={15} className="text-amber-400 shrink-0" />
                  <span>نقد شما ثبت شده است</span>
                </div>
              ) : (
                !isFormOpen && (
                  <button
                    onClick={() => setIsFormOpen(true)}
                    className="bg-amber-400 hover:bg-amber-300 text-black px-6 py-2.5 rounded-xl font-black text-xs transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
                  >
                    <Sparkles size={16} />
                    <span>نگارش نقد جدید</span>
                  </button>
                )
              )}
            </div>

            {/* در صورتی که کاربر قبلاً نقد ثبت کرده باشد: بنر اطلاع‌رسانی + دکمه اسکرول به نقد */}
            {hasWrittenReview && (
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
                <div className="flex items-start gap-3">
                  <ShieldCheck size={20} className="text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-amber-200">
                      هر منتقد تنها مجاز به ثبت یک نقد برای هر سریال است.
                    </p>
                    <p className="text-gray-400 leading-relaxed">
                      دیدگاه تحلیلی شما در بخش نقدها منتشر شده است. در صورت نیاز به ویرایش یا بازنویسی، می‌توانید از کارت نقد خود در پایین، نقد قبلی را حذف و نقد جدیدی ثبت کنید.
                    </p>
                  </div>
                </div>

                {userExistingReview && (
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById(`review-${userExistingReview.id}`);
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.classList.add('ring-2', 'ring-amber-400', 'shadow-[0_0_30px_rgba(245,158,11,0.3)]');
                        setTimeout(() => {
                          el.classList.remove('ring-2', 'ring-amber-400', 'shadow-[0_0_30px_rgba(245,158,11,0.3)]');
                        }, 2500);
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2"
                  >
                    <Eye size={15} className="text-amber-400" />
                    <span>مشاهده نقد من</span>
                  </button>
                )}
              </div>
            )}

            {isFormOpen && !hasWrittenReview && (
              <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in duration-200">
                {errorMsg && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* امتیاز و جهت‌گیری نظر */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
                    <label className="block text-xs font-bold text-gray-300 mb-2">
                      امتیاز شما به این سریال (از ۱۰): <span className="text-amber-400 font-mono text-base font-black mr-2">{rating}</span>
                    </label>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1" dir="ltr">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setRating(num)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                            rating === num
                              ? 'bg-amber-400 text-black shadow-[0_0_12px_rgba(245,158,11,0.6)] scale-110'
                              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
                    <label className="block text-xs font-bold text-gray-300 mb-2">نتیجه‌گیری و حکم نهایی:</label>
                    <div className="grid grid-cols-2 gap-2">
                      {VERDICT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setVerdict(opt.value)}
                          className={`p-2 rounded-xl text-[11px] font-bold border transition-all text-center ${
                            verdict === opt.value
                              ? opt.color + ' ring-2 ring-amber-400'
                              : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* عنوان نقد */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">عنوان نقد تخصصی</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: شاهکاری در پردازش شخصیت و تعلیق داستانی که بی‌نقص پیش می‌رود..."
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>

                {/* متن نقد */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">متن تفصیلی و نقد تحلیلی اثر</label>
                  <textarea
                    rows={6}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="تحلیل خود از کارگردانی، فیلمنامه، بازیگری، ریتم داستان، نقاط قوت و ضعف سریال را شرح دهید..."
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-amber-400 transition-colors leading-relaxed"
                  />
                  <span className="text-[10px] text-gray-500 block text-left mt-1">حداقل ۳۰ کاراکتر</span>
                </div>

                {/* تیک اسپویلر و دکمه‌های فرم */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-300">
                    <input
                      type="checkbox"
                      checked={spoiler}
                      onChange={(e) => setSpoiler(e.target.checked)}
                      className="rounded bg-black border-white/20 text-amber-500 focus:ring-amber-400 w-4 h-4 cursor-pointer"
                    />
                    <span className="flex items-center gap-1 text-amber-300/90 font-medium">
                      ⚠️ حاوی افشای بخش‌هایی از داستان (اسپویلر)
                    </span>
                  </label>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 sm:flex-none bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black px-6 py-2.5 rounded-xl font-black text-xs transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send size={14} />
                      <span>{submitting ? 'در حال ثبت نقد...' : 'انتشار نقد تخصصی'}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* کارت وضعیت و شرایط برای کاربرانی که هنوز منتقد نیستند */
          <div className="bg-[#121212]/90 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-md relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-amber-400">
                  <Lock size={18} />
                  <span className="text-sm font-black">می‌خواهید شما هم نقد تخصصی بنویسید؟</span>
                </div>
                <p className="text-xs text-gray-300 max-w-xl leading-relaxed">
                  بخش نقدهای تخصصی مختص <strong className="text-amber-300">منتقدین رسمی بینجر</strong> است. برای جلوگیری از نظرات غیرتخصصی و اسپم، کاربر باید ۳ شرط زیر را دارا باشد:
                </p>

                {/* پروگرس بارهای شروط منتقد شدن */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {/* ۱. VIP */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-bold text-gray-300">۱. اشتراک ویژه VIP</span>
                      {criticStatus?.vipPassed ? (
                        <CheckCircle size={15} className="text-green-400" />
                      ) : (
                        <Lock size={13} className="text-gray-500" />
                      )}
                    </div>
                    <span className={`text-[10px] font-bold ${criticStatus?.vipPassed ? 'text-green-400' : 'text-amber-400'}`}>
                      {criticStatus?.vipPassed ? 'فعال ✓' : 'نیاز به فعال‌سازی'}
                    </span>
                  </div>

                  {/* ۲. کامنت‌ها */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-bold text-gray-300">۲. ثبت ۱۰۰ نظر</span>
                      {criticStatus?.commentsPassed ? (
                        <CheckCircle size={15} className="text-green-400" />
                      ) : (
                        <span className="text-[10px] text-gray-400 font-mono">
                          {criticStatus?.commentsCount || 0} / ۱۰۰
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all"
                        style={{ width: `${criticStatus?.commentsProgress || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* ۳. اپیزودها */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-bold text-gray-300">۳. تماشای ۳۰۰۰ اپیزود</span>
                      {criticStatus?.watchedPassed ? (
                        <CheckCircle size={15} className="text-green-400" />
                      ) : (
                        <span className="text-[10px] text-gray-400 font-mono">
                          {criticStatus?.watchedCount || 0} / ۳۰۰۰
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-[#ccff00] rounded-full transition-all"
                        style={{ width: `${criticStatus?.watchedProgress || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {!criticStatus?.vipPassed && (
                <Link
                  href="/dashboard/subscription"
                  className="bg-gradient-to-r from-amber-400 to-yellow-300 text-black px-6 py-3 rounded-2xl font-black text-xs hover:scale-105 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] shrink-0 self-start md:self-center"
                >
                  ارتقا به حساب VIP
                </Link>
              )}
            </div>
          </div>
        )
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 text-center">
          <p className="text-xs text-gray-400 mb-3">برای ثبت نقد یا مشاهده وضعیت منتقد، وارد حساب کاربری خود شوید.</p>
          <Link href="/login" className="inline-block bg-[#ccff00] text-black px-5 py-2 rounded-xl text-xs font-bold">
            ورود به حساب
          </Link>
        </div>
      )}

      {/* لیست نقدهای منتقدین */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Award className="text-amber-400" size={20} />
            <span>تمام نقدهای ثبت‌شده</span>
            <span className="text-xs font-bold text-gray-500">({reviews.length})</span>
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500 text-xs">در حال واکشی نقدهای منتقدین...</div>
        ) : reviews.length > 0 ? (
          <div className="grid grid-cols-1 gap-5">
            {reviews.map((rev) => {
              const verdictObj = VERDICT_OPTIONS.find((o) => o.value === rev.verdict) || VERDICT_OPTIONS[1];
              const isSpoilerHidden = rev.spoiler && !revealedSpoilers.has(rev.id);
              const isAuthor = user?.id === rev.user_id;

              return (
                <div
                  key={rev.id}
                  id={`review-${rev.id}`}
                  className={`bg-white/5 border ${
                    isAuthor ? 'border-amber-400/40 bg-amber-500/[0.03]' : 'border-white/10'
                  } hover:border-amber-400/30 transition-all rounded-3xl p-5 sm:p-7 relative overflow-hidden group shadow-lg`}
                >
                  {/* Header of review card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                      <Link href={`/dashboard/user/${rev.user_id}`} className="shrink-0">
                        <div className="w-12 h-12 rounded-full border-2 border-amber-400/50 bg-gradient-to-tr from-gray-800 to-gray-700 flex items-center justify-center text-2xl shadow-md">
                          {rev.user?.avatar_url || '😎'}
                        </div>
                      </Link>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/dashboard/user/${rev.user_id}`}>
                            <VipUsername
                              username={rev.user?.username}
                              isVip={rev.user?.is_vip}
                              badgeSize={14}
                              className="text-sm sm:text-base font-black hover:underline"
                            />
                          </Link>
                          <CriticBadge size="xs" />
                          {isAuthor && (
                            <span className="text-[10px] font-bold text-amber-300 bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 rounded-lg">
                              نقد شما
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500 mt-0.5 block">
                          {new Date(rev.created_at).toLocaleDateString('fa-IR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-start sm:self-auto">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${verdictObj.color}`}>
                        {verdictObj.label}
                      </span>

                      <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-xl text-amber-400 font-mono font-black text-sm">
                        <Star size={14} className="fill-amber-400" />
                        <span>{rev.rating}</span>
                        <span className="text-[10px] text-gray-500 font-normal">/۱۰</span>
                      </div>

                      {isAuthor && (
                        <button
                          type="button"
                          onClick={() => setDeleteReviewId(rev.id)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="حذف نقد شما"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Review Title */}
                  <h4 className="text-base sm:text-lg font-black text-white mb-3 leading-snug">
                    {rev.title}
                  </h4>

                  {/* Review Text */}
                  {isSpoilerHidden ? (
                    <div className="relative py-6 px-4 bg-black/40 border border-amber-500/20 rounded-2xl text-center space-y-3">
                      <div className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-bold">
                        <AlertCircle size={15} />
                        <span>این نقد حاوی افشای داستان (اسپویلر) است</span>
                      </div>
                      <p className="text-[11px] text-gray-400 max-w-md mx-auto">
                        منتقد در متن این نقد بخش‌هایی از پلات و داستان اصلی سریال را لو داده است.
                      </p>
                      <button
                        type="button"
                        onClick={() => toggleSpoilerReveal(rev.id)}
                        className="bg-white/10 hover:bg-white/20 text-white text-xs px-4 py-1.5 rounded-xl font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Eye size={14} />
                        <span>نمایش متن نقد</span>
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs sm:text-sm text-gray-300 leading-relaxed text-justify whitespace-pre-line font-light">
                        {rev.text}
                      </p>
                      {rev.spoiler && (
                        <button
                          type="button"
                          onClick={() => toggleSpoilerReveal(rev.id)}
                          className="mt-3 text-[10px] text-gray-500 hover:text-gray-300 flex items-center gap-1 cursor-pointer"
                        >
                          <EyeOff size={12} />
                          <span>مخفی‌سازی مجدد اسپویلر</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="w-full py-16 bg-white/[0.02] border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center p-6 space-y-3 text-gray-500">
            <Feather size={36} strokeWidth={1.5} className="text-amber-500/40" />
            <h4 className="text-base font-bold text-gray-300">هنوز نقدی برای این سریال ثبت نشده است</h4>
            <p className="text-xs text-gray-500 max-w-sm">
              اگر منتقد رسمی بینجر هستید، اولین نفری باشید که تحلیل تخصصی و امتیاز خود را درباره این سریال می‌نویسد.
            </p>
          </div>
        )}
      </div>

      {/* مدال اختصاصی حذف نقد منتقد */}
      <ConfirmModal
        isOpen={Boolean(deleteReviewId)}
        onClose={() => {
          if (!isDeletingReview) setDeleteReviewId(null);
        }}
        onConfirm={handleConfirmDelete}
        title="حذف نقد تخصصی"
        description="آیا از حذف این نقد تخصصی اطمینان دارید؟ امتیاز و تحلیل شما از لیست منتقدین این سریال پاک خواهد شد."
        confirmText="بله، حذف نقد"
        cancelText="انصراف"
        variant="danger"
        loading={isDeletingReview}
      />
    </div>
  );
}
