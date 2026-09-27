"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  Crown,
  Trophy,
  Users,
  Film,
  TrendingUp,
  Download,
  Search,
  MessageSquare,
  AlertTriangle,
  Flame,
  Calendar,
  Sparkles,
  Tv,
  CheckCircle2,
  X,
  Eye,
  UserX,
  ExternalLink,
} from 'lucide-react';
import { toPersianDigits, formatPersianDate } from '@/lib/subscription';
import type { TMDBShow } from '@/lib/tmdbClient';

export interface PowerUserRecord {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  phone: string | null;
  watched_count: number;
}

export interface DiscussedShowRecord {
  show_id: number;
  comment_count: number;
  show?: TMDBShow | null;
}

export interface GrowthRecord {
  date: string;
  new_users: number;
  episodes_watched: number;
}

export interface ChurningUserRecord {
  user_id: string;
  username: string | null;
  phone: string | null;
  last_active: string;
}

interface AnalyticsClientProps {
  growthData: GrowthRecord[];
  powerUsers: PowerUserRecord[];
  discussedShows: DiscussedShowRecord[];
  churningUsers: ChurningUserRecord[];
}

export default function AnalyticsClient({
  growthData,
  powerUsers,
  discussedShows,
  churningUsers,
}: AnalyticsClientProps) {
  // Search & Filter States
  const [churnSearch, setChurnSearch] = useState('');
  const [chartMetric, setChartMetric] = useState<'all' | 'watched' | 'users'>('all');
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  };

  // Filter churning users
  const filteredChurning = useMemo(() => {
    if (!churnSearch.trim()) return churningUsers;
    const q = churnSearch.toLowerCase().trim();
    return churningUsers.filter((u) => {
      const matchName = (u.username || '').toLowerCase().includes(q);
      const matchPhone = (u.phone || '').includes(q);
      return matchName || matchPhone;
    });
  }, [churningUsers, churnSearch]);

  // Export SMS List CSV
  const handleExportChurnSmsList = () => {
    if (churningUsers.length === 0) {
      showToast('کاربر بدون فعالیتی برای خروجی یافت نشد.', 'error');
      return;
    }

    try {
      const headers = ['شماره موبایل', 'نام کاربری', 'آخرین فعالیت', 'روزهای عدم فعالیت'];
      const now = new Date().getTime();

      const rows = churningUsers.map((u) => {
        const lastActiveDate = new Date(u.last_active);
        const daysDiff = Math.max(
          1,
          Math.floor((now - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24))
        );
        const formattedDate = formatPersianDate(lastActiveDate);

        return [
          `"${u.phone || ''}"`,
          `"${(u.username || 'کاربر').replace(/"/g, '""')}"`,
          `"${formattedDate}"`,
          daysDiff,
        ].join(',');
      });

      // Include UTF-8 BOM (\uFEFF) for perfect Persian rendering in Excel
      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `binger-churning-sms-list-${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`لیست پیامک شامل ${churningUsers.length} کاربر دانلود شد.`, 'success');
    } catch (err) {
      console.error('Export CSV error:', err);
      showToast('خطا در ایجاد و دانلود فایل CSV', 'error');
    }
  };

  // Format short date for X-Axis (e.g. 09/25)
  const formattedChartData = useMemo(() => {
    return growthData.map((d) => {
      const parts = d.date.split('-');
      const shortLabel = parts.length === 3 ? `${parts[1]}/${parts[2]}` : d.date;
      return {
        ...d,
        shortLabel,
      };
    });
  }, [growthData]);

  // Compute total aggregates for summary cards
  const totalWatched30Days = useMemo(
    () => growthData.reduce((acc, curr) => acc + Number(curr.episodes_watched || 0), 0),
    [growthData]
  );
  const totalNewUsers30Days = useMemo(
    () => growthData.reduce((acc, curr) => acc + Number(curr.new_users || 0), 0),
    [growthData]
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 left-6 z-50 px-4 py-3 rounded-2xl border text-sm font-semibold flex items-center gap-2.5 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
              : 'bg-red-950/90 border-red-500/30 text-red-300'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* High-Level Analytics KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: 30-Day Watched Episodes */}
        <div className="p-5 rounded-3xl bg-[#0e0e0e] border border-white/10 flex items-center justify-between shadow-xl">
          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-bold block">قسمت‌های تماشا شده (۳۰ روز)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[#ccff00] font-mono">
                {toPersianDigits(totalWatched30Days)}
              </span>
              <span className="text-xs text-gray-400">قسمت</span>
            </div>
            <p className="text-[11px] text-gray-500">حجم تعامل سریال‌بازها در ماه اخیر</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#ccff00]/10 border border-[#ccff00]/20 flex items-center justify-center text-[#ccff00]">
            <Flame className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: 30-Day New Users */}
        <div className="p-5 rounded-3xl bg-[#0e0e0e] border border-white/10 flex items-center justify-between shadow-xl">
          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-bold block">کاربران جدید (۳۰ روز)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">
                {toPersianDigits(totalNewUsers30Days)}
              </span>
              <span className="text-xs text-gray-400">عضو جدید</span>
            </div>
            <p className="text-[11px] text-gray-500">روند جذب عضو در پلتفرم</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Top Watchers Count */}
        <div className="p-5 rounded-3xl bg-[#0e0e0e] border border-white/10 flex items-center justify-between shadow-xl">
          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-bold block">کاربران فوق‌فعال (Power Users)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                {toPersianDigits(powerUsers.length)}
              </span>
              <span className="text-xs text-gray-400">کاربر لیدر</span>
            </div>
            <p className="text-[11px] text-gray-500">بینجرهای پرچم‌دار با صدها اپیزود</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Trophy className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: Churning Users Count */}
        <div className="p-5 rounded-3xl bg-[#0e0e0e] border border-white/10 flex items-center justify-between shadow-xl">
          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-bold block">کاربران در معرض ریزش (Sleeper)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-rose-400 font-mono">
                {toPersianDigits(churningUsers.length)}
              </span>
              <span className="text-xs text-gray-400">کاربر غیرفعال</span>
            </div>
            <p className="text-[11px] text-gray-500">فاقد فعالیت در ۷ روز اخیر</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <UserX className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 30-Day Growth Interactive Chart */}
      <div className="p-5 sm:p-7 rounded-3xl bg-[#0e0e0e] border border-white/10 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#ccff00]" />
              <h2 className="text-base sm:text-lg font-black text-white">
                روند رشد و تعامل کاربران در ۳۰ روز اخیر
              </h2>
            </div>
            <p className="text-xs text-gray-400">
              نمودار مقایسه‌ای اپیزودهای تماشا شده و ثبت‌نام کاربران جدید به تفکیک روز
            </p>
          </div>

          {/* Metric Selector Filter */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10 self-start sm:self-auto">
            <button
              onClick={() => setChartMetric('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                chartMetric === 'all'
                  ? 'bg-white text-black font-bold shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              هر دو معیار
            </button>
            <button
              onClick={() => setChartMetric('watched')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                chartMetric === 'watched'
                  ? 'bg-[#ccff00] text-black font-bold shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              فقط تماشا
            </button>
            <button
              onClick={() => setChartMetric('users')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                chartMetric === 'users'
                  ? 'bg-cyan-400 text-black font-bold shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              فقط اعضای جدید
            </button>
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div className="h-72 sm:h-80 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradientWatched" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ccff00" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ccff00" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="gradientUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis
                dataKey="shortLabel"
                stroke="#666"
                tick={{ fill: '#888', fontSize: 10, fontFamily: 'monospace' }}
                tickLine={false}
              />
              <YAxis
                stroke="#666"
                tick={{ fill: '#888', fontSize: 10, fontFamily: 'monospace' }}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const rowData = payload[0].payload as GrowthRecord;
                    return (
                      <div className="p-3 rounded-2xl bg-[#121212]/95 border border-white/10 shadow-2xl backdrop-blur-md text-right text-xs space-y-2 font-['Vazirmatn']">
                        <p className="font-mono text-gray-400 border-b border-white/10 pb-1 text-[11px]">
                          تاریخ: {rowData.date}
                        </p>
                        {(chartMetric === 'all' || chartMetric === 'watched') && (
                          <div className="flex items-center justify-between gap-4 text-[#ccff00]">
                            <span className="font-bold">اپیزودهای تماشا شده:</span>
                            <span className="font-mono font-black text-sm">
                              {toPersianDigits(rowData.episodes_watched)}
                            </span>
                          </div>
                        )}
                        {(chartMetric === 'all' || chartMetric === 'users') && (
                          <div className="flex items-center justify-between gap-4 text-cyan-400">
                            <span className="font-bold">ثبت‌نام جدید:</span>
                            <span className="font-mono font-black text-sm">
                              {toPersianDigits(rowData.new_users)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                formatter={(value) => {
                  if (value === 'episodes_watched') return 'اپیزودهای تماشا شده (Episodes Watched)';
                  if (value === 'new_users') return 'کاربران جدید (New Users)';
                  return value;
                }}
                wrapperStyle={{ paddingTop: 10, fontSize: 11, fontFamily: 'Vazirmatn' }}
              />
              {(chartMetric === 'all' || chartMetric === 'watched') && (
                <Area
                  type="monotone"
                  dataKey="episodes_watched"
                  stroke="#ccff00"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#gradientWatched)"
                  name="episodes_watched"
                />
              )}
              {(chartMetric === 'all' || chartMetric === 'users') && (
                <Area
                  type="monotone"
                  dataKey="new_users"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#gradientUsers)"
                  name="new_users"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: Power Users Leaderboard & Most Discussed Shows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Power Users Leaderboard */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#0e0e0e] border border-white/10 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-1 pb-3 border-b border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  کاربران فوق‌فعال (Power Users)
                </h3>
              </div>
              <span className="text-[11px] text-gray-500 font-mono">
                Top {powerUsers.length}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              اعضایی که بیشترین تعداد قسمت‌های سریال را در پلتفرم بینجر ثبت کرده‌اند
            </p>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[460px] pr-1">
            {powerUsers.map((user, idx) => {
              const rank = idx + 1;
              const isTop1 = rank === 1;
              const isTop2 = rank === 2;
              const isTop3 = rank === 3;

              return (
                <div
                  key={user.user_id}
                  className={`p-3.5 rounded-2xl border transition flex items-center justify-between ${
                    isTop1
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : isTop2
                      ? 'bg-slate-300/10 border-slate-300/20'
                      : isTop3
                      ? 'bg-amber-700/10 border-amber-700/20'
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank Badge */}
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black font-mono shrink-0 ${
                        isTop1
                          ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
                          : isTop2
                          ? 'bg-slate-300 text-black'
                          : isTop3
                          ? 'bg-amber-700 text-white'
                          : 'bg-white/10 text-gray-400'
                      }`}
                    >
                      {toPersianDigits(rank)}
                    </div>

                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-sm font-bold text-white overflow-hidden shrink-0">
                      {user.avatar_url && user.avatar_url.length <= 4 ? (
                        <span>{user.avatar_url}</span>
                      ) : user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{user.username?.charAt(0) || 'U'}</span>
                      )}
                    </div>

                    {/* Username & Phone */}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate max-w-[140px] sm:max-w-[180px]">
                        {user.username || 'کاربر بینجر'}
                      </p>
                      <p className="text-[10px] text-gray-500 font-mono">
                        {user.phone ? user.phone : 'بدون شماره'}
                      </p>
                    </div>
                  </div>

                  {/* Watched Count Badge */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ccff00]/10 border border-[#ccff00]/25 text-[#ccff00] text-xs font-mono font-black shrink-0">
                    <Flame className="w-3.5 h-3.5" />
                    <span>{toPersianDigits(user.watched_count)}</span>
                    <span className="text-[10px] font-sans opacity-70">اپیزود</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Most Discussed Shows */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#0e0e0e] border border-white/10 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-1 pb-3 border-b border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">
                  پربحث‌ترین سریال‌ها (Most Discussed)
                </h3>
              </div>
              <span className="text-[11px] text-gray-500 font-mono">
                Top {discussedShows.length}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              سریال‌هایی که بیشترین تعداد کامنت و تعامل را از سمت کاربران دریافت کرده‌اند
            </p>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[460px] pr-1">
            {discussedShows.map((item, idx) => {
              const rank = idx + 1;
              const titleFa = item.show?.name_fa;
              const titleEn = item.show?.name || `Show #${item.show_id}`;
              const poster = item.show?.poster_path
                ? `https://image.tmdb.org/t/p/w200${item.show.poster_path}`
                : null;

              return (
                <Link
                  key={item.show_id}
                  href={`/dashboard/tv/${item.show_id}`}
                  target="_blank"
                  className="p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-blue-500/30 transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Rank */}
                    <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-xs font-mono font-bold text-gray-400 shrink-0">
                      {toPersianDigits(rank)}
                    </div>

                    {/* Poster */}
                    <div className="w-9 h-12 rounded-lg bg-black/60 overflow-hidden border border-white/10 shrink-0 flex items-center justify-center">
                      {poster ? (
                        <img src={poster} alt={titleEn} className="w-full h-full object-cover" />
                      ) : (
                        <Tv className="w-4 h-4 text-gray-600" />
                      )}
                    </div>

                    {/* Titles */}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white group-hover:text-blue-400 transition truncate max-w-[140px] sm:max-w-[200px]">
                        {titleFa || titleEn}
                      </p>
                      {titleFa && (
                        <p className="text-[10px] text-gray-500 font-mono truncate max-w-[140px] sm:max-w-[200px]">
                          {titleEn}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Comment Count Badge */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-mono font-black shrink-0">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{toPersianDigits(item.comment_count)}</span>
                    <span className="text-[10px] font-sans opacity-70">نظر</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Churning Users (Retention & Sleeper Users) */}
      <div className="p-5 sm:p-7 rounded-3xl bg-[#0e0e0e] border border-white/10 space-y-5 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <UserX className="w-5 h-5 text-rose-400" />
              <h3 className="text-base sm:text-lg font-black text-white">
                کاربران در معرض ریزش (Churn Risk & Sleeper Users)
              </h3>
            </div>
            <p className="text-xs text-gray-400">
              کاربرانی که بیش از ۱۴ روز از ثبت‌نام آنها گذشته اما در ۷ روز اخیر هیچ قسمتی تماشا نکرده‌اند
            </p>
          </div>

          {/* Action: Export SMS Campaign List */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportChurnSmsList}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 text-xs font-bold transition shadow-lg shadow-rose-500/10 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>خروجی پیامک (CSV Win-Back)</span>
            </button>
          </div>
        </div>

        {/* Search Bar for Churning Users */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={churnSearch}
            onChange={(e) => setChurnSearch(e.target.value)}
            placeholder="جستجو در میان کاربران غیرفعال بر اساس نام کاربری یا شماره موبایل..."
            className="w-full bg-black/50 border border-white/10 rounded-2xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-400/60 focus:ring-1 focus:ring-rose-400/60 transition"
          />
          {churnSearch && (
            <button
              onClick={() => setChurnSearch('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Churning Users Data Table */}
        <div className="rounded-2xl border border-white/5 bg-black/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-gray-400 text-[11px] font-bold">
                  <th className="py-3 px-4 sm:px-6">کاربر</th>
                  <th className="py-3 px-4">شماره موبایل</th>
                  <th className="py-3 px-4">آخرین فعالیت ثبت‌شده</th>
                  <th className="py-3 px-4">مدت بی‌فعالیتی</th>
                  <th className="py-3 px-4 text-center">وضعیت ریتنشن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                {filteredChurning.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-500">
                      کاربر غیرفعالی با مشخصات وارد شده یافت نشد.
                    </td>
                  </tr>
                ) : (
                  filteredChurning.slice(0, 50).map((u) => {
                    const lastActiveDate = new Date(u.last_active);
                    const now = new Date().getTime();
                    const daysInactive = Math.max(
                      1,
                      Math.floor((now - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24))
                    );

                    return (
                      <tr key={u.user_id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 px-4 sm:px-6">
                          <span className="font-bold text-white block">
                            {u.username || 'کاربر بدون نام'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-300">
                          {u.phone || 'بدون شماره'}
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-400">
                          {formatPersianDate(lastActiveDate)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-mono font-bold">
                            {toPersianDigits(daysInactive)} روز
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
                            <AlertTriangle className="w-3 h-3" />
                            <span>نیاز به کمپین بازگشت</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {filteredChurning.length > 50 && (
          <p className="text-[11px] text-gray-500 text-center font-mono">
            نمایش ۵۰ کاربر اول از مجموع {toPersianDigits(filteredChurning.length)} کاربر غیرفعال (از دکمه خروجی CSV برای دسترسی به لیست کامل استفاده کنید)
          </p>
        )}
      </div>
    </div>
  );
}
