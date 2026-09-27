"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Edit3,
  Save,
  RotateCcw,
  Tv,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ExternalLink,
  ImageIcon,
  Sparkles,
  Database,
  Globe,
  Film,
} from 'lucide-react';
import { fetchShowData, updateShowData } from '../actions';
import { toPersianDigits } from '@/lib/subscription';
import { getImageUrl, type TMDBShow } from '@/lib/tmdbClient';

export default function ContentEditorClient() {
  const [showIdInput, setShowIdInput] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Loaded Show state
  const [loadedShow, setLoadedShow] = useState<TMDBShow | null>(null);
  const [loadedSource, setLoadedSource] = useState<'cache' | 'tmdb' | null>(null);
  const [loadedUpdatedAt, setLoadedUpdatedAt] = useState<string | null>(null);

  // Form Fields
  const [nameFa, setNameFa] = useState('');
  const [overviewFa, setOverviewFa] = useState('');
  const [posterPath, setPosterPath] = useState('');

  // Toast feedback state
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  };

  // Quick Preset Samples
  const quickSamples = [
    { id: 1399, name: 'Game of Thrones' },
    { id: 1668, name: 'Friends' },
    { id: 1429, name: 'Attack on Titan' },
    { id: 76479, name: 'The Boys' },
    { id: 2288, name: 'Prison Break' },
  ];

  // Action: Fetch Show
  const handleFetch = async (targetId?: number) => {
    const rawId = targetId !== undefined ? String(targetId) : showIdInput.trim();
    const id = parseInt(rawId, 10);

    if (isNaN(id) || id <= 0) {
      showToast('لطفاً یک شناسه معتبر عددی (TMDB Show ID) وارد کنید', 'error');
      return;
    }

    setIsFetching(true);
    try {
      const res = await fetchShowData(id);
      if (res.success && res.show) {
        setLoadedShow(res.show);
        setLoadedSource(res.source || 'cache');
        setLoadedUpdatedAt(res.updated_at || null);
        setNameFa(res.show.name_fa || '');
        setOverviewFa(res.show.overview_fa || res.show.overview || '');
        setPosterPath(res.show.poster_path || '');
        setShowIdInput(String(id));
        showToast(
          `اطلاعات سریال «${res.show.name || res.show.name_fa}» با موفقیت فراخوانی شد.`,
          'success'
        );
      } else {
        showToast(res.error || 'خطا در واکشی سریال', 'error');
      }
    } catch {
      showToast('خطای شبکه در ارتباط با سرور', 'error');
    } finally {
      setIsFetching(false);
    }
  };

  // Action: Save Overrides
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loadedShow) return;

    setIsSaving(true);
    try {
      const res = await updateShowData(loadedShow.id, {
        name_fa: nameFa,
        overview_fa: overviewFa,
        poster_path: posterPath,
      });

      if (res.success && res.show) {
        setLoadedShow(res.show);
        setLoadedSource('cache');
        setLoadedUpdatedAt(new Date().toISOString());
        showToast(
          `تغییرات سریال «${res.show.name_fa || res.show.name}» با موفقیت در دیتابیس ثبت شد.`,
          'success'
        );
      } else {
        showToast(res.error || 'خطا در ذخیره‌سازی داده‌های سریال', 'error');
      }
    } catch {
      showToast('خطای سرور در ثبت اطلاعات', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Action: Reset Form to initial loaded values
  const handleReset = () => {
    if (!loadedShow) return;
    setNameFa(loadedShow.name_fa || '');
    setOverviewFa(loadedShow.overview_fa || loadedShow.overview || '');
    setPosterPath(loadedShow.poster_path || '');
    showToast('مقادیر فرم به حالت پیشین بازگردانده شدند.', 'success');
  };

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 left-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border text-xs sm:text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-200 ${
            toast.type === 'success'
              ? 'bg-[#121c12] border-emerald-500/30 text-emerald-300 shadow-emerald-950/40'
              : 'bg-[#1c1212] border-red-500/30 text-red-300 shadow-red-950/40'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{toast.text}</span>
          <button
            onClick={() => setToast(null)}
            className="text-gray-400 hover:text-white p-0.5 rounded-lg transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search & Fetch Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#0e0e0e] border border-white/10 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-[#ccff00]" />
              <span>جستجو و فراخوانی سریال با شناسه TMDB</span>
            </h2>
            <p className="text-xs text-gray-400">
              شناسه TMDB سریال مورد نظر را وارد کرده و دکمه «دریافت اطلاعات» را کلیک کنید.
            </p>
          </div>

          <div className="text-[11px] text-gray-400 font-mono">
            Direct Database Mirroring
          </div>
        </div>

        {/* Input Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={showIdInput}
              onChange={(e) => setShowIdInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
              placeholder="شناسه TMDB سریال (مثال: 1399)..."
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#ccff00]/50 transition font-mono direction-ltr text-right"
            />
          </div>

          <button
            type="button"
            onClick={() => handleFetch()}
            disabled={isFetching || !showIdInput.trim()}
            className="px-5 py-2.5 rounded-xl bg-[#ccff00] hover:bg-[#b8e600] text-black font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#ccff00]/10 shrink-0 cursor-pointer"
          >
            {isFetching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>در حال فراخوانی...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>دریافت اطلاعات سریال</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Suggestions Chips */}
        <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
          <span className="text-gray-400 text-[11px] font-medium">نمونه‌های سریع:</span>
          {quickSamples.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => handleFetch(sample.id)}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-[11px] transition flex items-center gap-1.5 cursor-pointer font-mono"
            >
              <span>{sample.name}</span>
              <span className="text-gray-400 text-[10px]">({sample.id})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Editor Form Section */}
      {loadedShow && (
        <form onSubmit={handleSave} className="space-y-6 animate-in fade-in duration-300">
          {/* Show Identity Banner */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              {/* Thumbnail */}
              <div className="w-14 h-20 sm:w-16 sm:h-24 rounded-2xl overflow-hidden bg-white/5 border border-white/10 shrink-0 relative shadow-md">
                {posterPath ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={getImageUrl(posterPath, 'w185')}
                    alt={loadedShow.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    <Tv className="w-6 h-6 opacity-40" />
                  </div>
                )}
              </div>

              {/* Title & Metadata Info */}
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg sm:text-xl font-black text-white truncate">
                    {loadedShow.name}
                  </h3>
                  {loadedShow.original_name && loadedShow.original_name !== loadedShow.name && (
                    <span className="text-xs text-gray-400 font-sans">
                      ({loadedShow.original_name})
                    </span>
                  )}
                  {loadedSource === 'cache' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                      <Database className="w-3 h-3" />
                      <span>ذخیره‌شده در دیتابیس Supabase</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold">
                      <Globe className="w-3 h-3" />
                      <span>واکشی جدید از TMDB</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                  <span>شناسه TMDB: <strong className="text-white font-mono">{loadedShow.id}</strong></span>
                  <span>•</span>
                  <span>فصل‌ها: <strong className="text-white">{toPersianDigits(loadedShow.number_of_seasons || 1)}</strong></span>
                  <span>•</span>
                  <span>قسمت‌ها: <strong className="text-white">{toPersianDigits(loadedShow.number_of_episodes || 0)}</strong></span>
                  {loadedShow.first_air_date && (
                    <>
                      <span>•</span>
                      <span>سال: <strong className="text-white font-mono">{new Date(loadedShow.first_air_date).getFullYear()}</strong></span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Live Link Button */}
            <div className="flex items-center gap-2 self-start md:self-center shrink-0">
              <Link
                href={`/dashboard/tv/${loadedShow.id}`}
                target="_blank"
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition text-xs flex items-center gap-1.5"
              >
                <span>مشاهده در سایت</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Form Fields Card */}
          <div className="p-6 rounded-3xl bg-[#0e0e0e] border border-white/10 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#ccff00]" />
                <span>فیلدهای سفارشی‌سازی محتوا (Content Overrides)</span>
              </h3>
              <span className="text-xs text-gray-400">
                این مقادیر مستقیماً در دیتابیس ذخیره و در تمام بخش‌های بینجر اعمال می‌شوند.
              </span>
            </div>

            {/* 1. Persian Title (name_fa) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                <span>عنوان فارسی سریال (Persian Title)</span>
                <span className="text-[11px] text-gray-400 font-mono">name_fa</span>
              </label>
              <input
                type="text"
                value={nameFa}
                onChange={(e) => setNameFa(e.target.value)}
                placeholder="عنوان سریال به فارسی (مثال: بازی تاج‌وتخت)..."
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#ccff00]/50 transition"
              />
              <p className="text-[11px] text-gray-400">
                عنوان اصلی لاتین: <span className="text-gray-300 font-sans">{loadedShow.name}</span>
              </p>
            </div>

            {/* 2. Persian Overview (overview_fa) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                <span>خلاصه داستان به فارسی (Persian Overview)</span>
                <span className="text-[11px] text-gray-400 font-mono">overview_fa</span>
              </label>
              <textarea
                rows={5}
                value={overviewFa}
                onChange={(e) => setOverviewFa(e.target.value)}
                placeholder="خلاصه کامل، جذاب و خواندنی داستان سریال به زبان فارسی..."
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#ccff00]/50 transition resize-y leading-relaxed"
              />
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>در صورت پر بودن، به عنوان خلاصه اصلی به تمام کاربران نمایش داده می‌شود.</span>
                <span>{toPersianDigits(overviewFa.length)} کاراکتر</span>
              </div>
            </div>

            {/* 3. Poster Image Path / URL & Live Preview */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                <span>آدرس تصویر پوستر (Poster Path / URL)</span>
                <span className="text-[11px] text-gray-400 font-mono">poster_path</span>
              </label>

              <div className="flex flex-col sm:flex-row items-start gap-4">
                {/* Poster Input */}
                <div className="flex-1 w-full space-y-2">
                  <div className="relative">
                    <ImageIcon className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={posterPath}
                      onChange={(e) => setPosterPath(e.target.value)}
                      placeholder="/example_poster.jpg یا لینک کامل https://..."
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl pr-10 pl-4 py-3 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#ccff00]/50 transition font-mono direction-ltr text-right"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400">
                    می‌توانید مسیر پوستر TMDB (مانند <code className="text-gray-300 font-mono">/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg</code>) یا لینک مستقیم تصویر CDN را وارد نمایید.
                  </p>
                </div>

                {/* Live Preview Box */}
                <div className="w-24 sm:w-28 shrink-0 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] text-gray-400 font-medium">پیش‌نمایش پوستر:</span>
                  <div className="w-24 h-36 rounded-xl overflow-hidden bg-white/5 border border-white/10 relative shadow-lg flex items-center justify-center">
                    {posterPath ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={getImageUrl(posterPath, 'w342')}
                        alt="پیش‌نمایش پوستر"
                        className="w-full h-full object-cover transition-opacity duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1 text-gray-500 text-[10px] p-2 text-center">
                        <Film className="w-6 h-6 opacity-30" />
                        <span>بدون پوستر</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={handleReset}
                disabled={isSaving}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>بازنشانی به مقادیر اولیه</span>
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#ccff00] hover:bg-[#b8e600] text-black font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-[#ccff00]/15 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>در حال ذخیره‌سازی...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>ذخیره تغییرات در دیتابیس (Save Overrides)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
