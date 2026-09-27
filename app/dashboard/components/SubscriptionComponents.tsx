"use client";

import React from 'react';
import Link from 'next/link';
import { Crown, Sparkles, Clock, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
import { SubscriptionStatus, toPersianDigits } from '@/lib/subscription';

/**
 * بج کوچک وضعیت اشتراک با نمایش روزهای باقی‌مانده (مناسب برای هدر و سایدبار)
 */
export function SubscriptionBadge({
  status,
  className = '',
  showCrown = true,
}: {
  status: SubscriptionStatus;
  className?: string;
  showCrown?: boolean;
}) {
  if (status.isLifetime) {
    return (
      <Link
        href="/dashboard/subscription"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-600/20 text-amber-300 border border-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.25)] hover:border-amber-300 transition-all ${className}`}
        title="عضویت ویژه نامحدود مدیر سیستم"
      >
        {showCrown && <Crown size={12} className="text-amber-400 shrink-0" />}
        <span>VIP دائمی</span>
      </Link>
    );
  }

  if (status.isActive) {
    const isWarning = status.isExpiringSoon;
    return (
      <Link
        href="/dashboard/subscription"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black transition-all ${
          isWarning
            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/40 shadow-[0_0_14px_rgba(244,63,94,0.3)] animate-pulse'
            : 'bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-600/20 text-amber-300 border border-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.25)] hover:border-amber-300'
        } ${className}`}
        title={`اشتراک ماهانه VIP فعال: ${status.formattedDaysRemaining} مانده (تا ${status.formattedExpiration})`}
      >
        {showCrown && <Crown size={12} className={isWarning ? 'text-rose-400 shrink-0' : 'text-amber-400 shrink-0'} />}
        <span>{status.formattedDaysRemaining} مانده</span>
      </Link>
    );
  }

  return (
    <Link
      href="/dashboard/subscription"
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-white/5 hover:bg-amber-400/10 text-gray-300 hover:text-amber-300 border border-white/10 hover:border-amber-400/40 transition-all ${className}`}
      title="ارتقا به اشتراک ویژه بینجر"
    >
      <Crown size={12} className="text-amber-400 shrink-0" />
      <span>ارتقا به VIP</span>
    </Link>
  );
}

/**
 * کارت جامع نمایش وضعیت و شمارش معکوس اشتراک (مخصوص صفحه اشتراک و پروفایل)
 */
export function SubscriptionStatusCard({
  status,
  onRenewClick,
}: {
  status: SubscriptionStatus;
  onRenewClick?: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-400/30 bg-gradient-to-br from-[#1c160c] via-[#12110e] to-[#0a0a0a] p-5 sm:p-7 shadow-2xl">
      {/* هاله نور پس‌زمینه */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-amber-400/15 blur-3xl" />
      
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        
        {/* سمت راست: آیکون، عنوان و اطلاعات روزهای مانده */}
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 text-black shadow-[0_0_25px_rgba(245,158,11,0.4)]">
            <Crown size={28} />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 border border-amber-400/30 px-2.5 py-0.5 text-[11px] font-black text-amber-300">
                <Sparkles size={11} />
                <span>{status.statusLabel}</span>
              </span>
              {status.isExpiringSoon && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-[10px] font-black text-rose-300">
                  <AlertTriangle size={11} />
                  <span>نیاز به تمدید</span>
                </span>
              )}
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <h3 className="text-2xl sm:text-3xl font-black text-white">
                {status.isLifetime ? (
                  <span className="bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                    دسترسی نامحدود دائمی
                  </span>
                ) : status.isActive ? (
                  <>
                    <span className="text-amber-300 font-mono text-3xl sm:text-4xl">{toPersianDigits(status.daysRemaining)}</span>
                    <span className="text-sm font-bold text-gray-300">روز از اشتراک ماهانه باقی‌مانده</span>
                  </>
                ) : (
                  <span className="text-gray-400 text-lg">اشتراک شما به اتمام رسیده است</span>
                )}
              </h3>
            </div>

            {/* تاریخ انقضا و اطلاعات دوره */}
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
              <Clock size={13} className="text-amber-400" />
              <span>
                {status.isLifetime
                  ? 'اشتراک ویژه سازمانی و مدیریتی بدون تاریخ انقضا'
                  : status.isActive
                    ? `تاریخ پایان دوره: ${status.formattedExpiration}`
                    : 'جهت دسترسی مجدد به آمار و ابزارهای پیشرفته، اشتراک خود را تمدید کنید'}
              </span>
            </div>
          </div>
        </div>

        {/* سمت چپ: دکمه اقدام / تمدید */}
        <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
          {status.isLifetime ? (
            <div className="flex items-center gap-2 rounded-xl bg-amber-400/10 border border-amber-400/30 px-4 py-2.5 text-xs font-bold text-amber-300">
              <ShieldCheck size={16} />
              <span>حساب تایید شده دائمی</span>
            </div>
          ) : (
            <Link
              href="/dashboard/subscription"
              onClick={onRenewClick}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-5 py-3 text-xs sm:text-sm font-black text-black shadow-[0_0_25px_rgba(245,158,11,0.35)] hover:from-amber-300 hover:to-yellow-400 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Zap size={16} className="fill-black" />
              <span>{status.isActive ? 'تمدید اشتراک ماهانه' : 'خرید اشتراک ماهانه'}</span>
            </Link>
          )}
        </div>
      </div>

      {/* نوار پیشرفت ۳۰ روزه (اگر اشتراک ماهانه فعال است) */}
      {status.isActive && !status.isLifetime && (
        <div className="mt-5 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5 font-bold">
            <span>روند مصرف دوره ۳۰ روزه</span>
            <span className="text-amber-300 font-mono">{toPersianDigits(status.daysRemaining)} از ۳۰ روز باقی‌مانده</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-black/60 border border-white/10">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                status.isExpiringSoon
                  ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                  : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
              }`}
              style={{ width: `${Math.max(5, status.percentRemaining)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
