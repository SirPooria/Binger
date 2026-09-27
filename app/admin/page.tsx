import React from 'react';
import Link from 'next/link';
import {
  Users,
  Crown,
  ShieldCheck,
  Flame,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  Layers,
  Activity,
  CreditCard,
  Trophy,
  Medal,
  Award,
  Tv,
  MessageSquare,
} from 'lucide-react';
import { verifyAdminSession } from '@/lib/adminAuth';
import { toPersianDigits } from '@/lib/subscription';
import { getShowDetails, getImageUrl, type TMDBShow } from '@/lib/tmdbClient';

export const dynamic = 'force-dynamic';

interface TopWatchedShowRecord {
  show_id: number;
  view_count: number;
  show: TMDBShow | null;
}

export default async function AdminDashboardPage() {
  const { authorized, supabase } = await verifyAdminSession();

  // Metrics state
  let totalUsers = 0;
  let totalVips = 0;
  let totalAdmins = 0;
  let totalWatched = 0;
  let topWatchedShows: TopWatchedShowRecord[] = [];

  const VIP_PRICE_TOMANS = 149_000;

  if (authorized && supabase) {
    try {
      // 1. Fetch core high-level metrics & RPC in parallel
      const [usersRes, vipsRes, adminsRes, watchedRes, topShowsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_vip', true),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
        supabase.from('watched').select('id', { count: 'exact', head: true }),
        supabase.rpc('get_top_watched_shows', { p_limit: 10 }),
      ]);

      totalUsers = usersRes.count || 0;
      totalVips = vipsRes.count || 0;
      totalAdmins = adminsRes.count || 0;
      totalWatched = watchedRes.count || 0;

      // 2. Enrich top watched shows with Persian titles and posters via getShowDetails
      if (!topShowsRes.error && Array.isArray(topShowsRes.data) && topShowsRes.data.length > 0) {
        topWatchedShows = await Promise.all(
          topShowsRes.data.map(async (item: { show_id: number; view_count: number }) => {
            try {
              const show = await getShowDetails(String(item.show_id));
              return {
                show_id: item.show_id,
                view_count: Number(item.view_count),
                show,
              };
            } catch {
              return {
                show_id: item.show_id,
                view_count: Number(item.view_count),
                show: null,
              };
            }
          })
        );
      }
    } catch (err) {
      console.error('Error fetching admin metrics or leaderboard:', err);
    }
  }

  const vipPercentage = totalUsers > 0 ? Math.round((totalVips / totalUsers) * 100) : 0;
  const vipRevenue = totalVips * VIP_PRICE_TOMANS;
  const maxViews = topWatchedShows.length > 0 ? Math.max(...topWatchedShows.map((s) => s.view_count)) : 1;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-transparent border border-white/10 p-6 sm:p-8">
        <div className="absolute top-0 left-0 -translate-x-12 -translate-y-12 w-72 h-72 bg-[#ccff00]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ccff00]/10 border border-[#ccff00]/20 text-[#ccff00] text-xs font-bold">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              <span>داشبورد تحلیلی و مدیریتی Binger</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              نمای کلی سیستم، درآمد و رفتار کاربران
            </h1>
            <p className="text-sm text-gray-400 max-w-xl leading-relaxed">
              گزارش آمار بلادرنگ کاربران، درآمدهای اشتراک VIP، پرتماشاترین سریال‌های پلتفرم و شاخص‌های کلیدی تعامل.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/users"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ccff00] text-black font-bold text-xs hover:bg-[#b8e600] transition shadow-lg shadow-[#ccff00]/20"
            >
              <Users className="w-4 h-4" />
              <span>مشاهده و مدیریت کاربران</span>
            </Link>
          </div>
        </div>
      </div>

      {/* High-Level Metrics Grid (5 Stat Cards) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#ccff00]" />
            <span>شاخص‌های اصلی (Core Metrics)</span>
          </h2>
          <span className="text-xs text-gray-500 font-mono">Live DB Sync</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* 1. Total Users */}
          <div className="relative overflow-hidden p-5 rounded-2xl bg-[#0e0e0e] border border-white/10 hover:border-white/20 transition-all group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-blue-500/10 transition" />
            <div className="flex items-center justify-between text-gray-400 mb-3">
              <span className="text-xs font-bold">کاربران کل (Total Users)</span>
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                {toPersianDigits(totalUsers)}
              </p>
              <p className="text-[11px] text-gray-400 flex items-center gap-1">
                <span className="text-emerald-400 font-bold">۱۰۰٪</span>
                <span>پروفایل‌های ثبت‌شده</span>
              </p>
            </div>
          </div>

          {/* 2. Total VIPs */}
          <div className="relative overflow-hidden p-5 rounded-2xl bg-[#0e0e0e] border border-white/10 hover:border-amber-500/30 transition-all group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-amber-500/15 transition" />
            <div className="flex items-center justify-between text-gray-400 mb-3">
              <span className="text-xs font-bold">اعضای ویژه (Total VIPs)</span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Crown className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight">
                {toPersianDigits(totalVips)}
              </p>
              <p className="text-[11px] text-gray-400 flex items-center gap-1">
                <span className="text-amber-400 font-mono font-bold">{toPersianDigits(vipPercentage)}٪</span>
                <span>نرخ تبدیل به VIP</span>
              </p>
            </div>
          </div>

          {/* 3. VIP Revenue Stat Card */}
          <div className="relative overflow-hidden p-5 rounded-2xl bg-[#0e0e0e] border border-white/10 hover:border-[#ccff00]/40 transition-all group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#ccff00]/10 rounded-full blur-xl pointer-events-none group-hover:bg-[#ccff00]/20 transition" />
            <div className="flex items-center justify-between text-gray-400 mb-3">
              <span className="text-xs font-bold text-white">درآمد VIP (Revenue)</span>
              <div className="w-9 h-9 rounded-xl bg-[#ccff00]/15 border border-[#ccff00]/30 text-[#ccff00] flex items-center justify-center shadow-sm shadow-[#ccff00]/20">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <p className="text-2xl sm:text-3xl font-black text-[#ccff00] font-mono tracking-tight">
                  {toPersianDigits(vipRevenue.toLocaleString('en-US'))}
                </p>
                <span className="text-xs font-bold text-gray-400">تومان</span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-gray-400">
                مبنا: ۱۴۹,۰۰۰ تومان به‌ازای هر اشتراک
              </p>
            </div>
          </div>

          {/* 4. Total Admins */}
          <div className="relative overflow-hidden p-5 rounded-2xl bg-[#0e0e0e] border border-white/10 hover:border-emerald-500/30 transition-all group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/15 transition" />
            <div className="flex items-center justify-between text-gray-400 mb-3">
              <span className="text-xs font-bold">مدیران سیستم (Admins)</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
                {toPersianDigits(totalAdmins)}
              </p>
              <p className="text-[11px] text-gray-400 flex items-center gap-1">
                <span className="text-emerald-400 font-bold">Admin Roles</span>
                <span>دسترسی کامل مدیریتی</span>
              </p>
            </div>
          </div>

          {/* 5. Total Watched Records */}
          <div className="relative overflow-hidden p-5 rounded-2xl bg-[#0e0e0e] border border-white/10 hover:border-purple-500/30 transition-all group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-purple-500/15 transition" />
            <div className="flex items-center justify-between text-gray-400 mb-3">
              <span className="text-xs font-bold">تماشاها (Watched)</span>
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-black text-purple-400 font-mono tracking-tight">
                {toPersianDigits(totalWatched.toLocaleString('en-US'))}
              </p>
              <p className="text-[11px] text-gray-400 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                <span>کل لاگ‌های تماشای ثبت‌شده</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Top Watched Shows Leaderboard Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>پرتماشاترین سریال‌ها (Top Watched Shows Leaderboard)</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              رتبه‌بندی ۱۰ سریال با بیشترین دفعات تماشا توسط کاربران در Binger
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-xs self-start sm:self-auto font-mono">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Top 10 Leaderboard</span>
          </div>
        </div>

        {topWatchedShows.length === 0 ? (
          <div className="p-8 rounded-2xl border border-white/10 bg-[#0e0e0e] text-center text-gray-500">
            <Tv className="w-10 h-10 mx-auto opacity-30 mb-2" />
            <p className="text-sm">هنوز رکوردی در جدول تماشای کاربران ثبت نشده است.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0e0e0e] shadow-xl">
            <div className="divide-y divide-white/5">
              {topWatchedShows.map((item, index) => {
                const rank = index + 1;
                const show = item.show;
                const persianName = show?.name_fa || show?.name || `سریال #${item.show_id}`;
                const originalName = show?.name_en || show?.original_name || show?.name;
                const posterUrl = show?.poster_path ? getImageUrl(show.poster_path, 'w185') : null;
                const airYear = show?.first_air_date ? new Date(show.first_air_date).getFullYear() : null;
                const percentOfMax = Math.max(8, Math.round((item.view_count / maxViews) * 100));

                // Rank Badge Styling
                const getRankBadge = () => {
                  if (rank === 1) {
                    return (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-yellow-300 via-amber-400 to-amber-600 text-black font-black flex items-center justify-center text-xs shadow-md shadow-amber-500/25 shrink-0 ring-1 ring-amber-300">
                        <Trophy className="w-4 h-4" />
                      </div>
                    );
                  }
                  if (rank === 2) {
                    return (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-200 via-gray-300 to-slate-400 text-slate-900 font-black flex items-center justify-center text-xs shadow-md shadow-slate-400/20 shrink-0 ring-1 ring-slate-200">
                        <Medal className="w-4 h-4" />
                      </div>
                    );
                  }
                  if (rank === 3) {
                    return (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 text-amber-100 font-black flex items-center justify-center text-xs shadow-md shadow-amber-700/20 shrink-0 ring-1 ring-amber-500">
                        <Award className="w-4 h-4" />
                      </div>
                    );
                  }
                  return (
                    <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-gray-400 font-bold flex items-center justify-center text-xs font-mono shrink-0">
                      {toPersianDigits(rank)}
                    </div>
                  );
                };

                return (
                  <div
                    key={item.show_id}
                    className="p-3.5 sm:p-4 hover:bg-white/[0.03] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 group"
                  >
                    {/* Left/Start side: Rank + Poster + Title info */}
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      {/* Rank Badge */}
                      {getRankBadge()}

                      {/* Poster Thumbnail */}
                      <div className="w-11 h-16 sm:w-12 sm:h-18 rounded-xl overflow-hidden bg-white/5 border border-white/10 shrink-0 relative shadow-sm">
                        {posterUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={posterUrl}
                            alt={persianName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500">
                            <Tv className="w-5 h-5 opacity-40" />
                          </div>
                        )}
                      </div>

                      {/* Title & Metadata */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/dashboard/tv/${item.show_id}`}
                            className="font-bold text-white hover:text-[#ccff00] text-sm sm:base transition truncate"
                          >
                            {persianName}
                          </Link>
                          {airYear && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400 font-mono">
                              {toPersianDigits(airYear)}
                            </span>
                          )}
                          {show?.vote_average && show.vote_average > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 font-bold font-mono">
                              ★ {show.vote_average.toFixed(1)}
                            </span>
                          )}
                        </div>

                        {originalName && originalName !== persianName && (
                          <p className="text-xs text-gray-400 font-sans tracking-wide truncate mt-0.5">
                            {originalName}
                          </p>
                        )}

                        <span className="text-[10px] font-mono text-gray-500 block mt-0.5">
                          TMDB ID: {item.show_id}
                        </span>
                      </div>
                    </div>

                    {/* Right side: View count + Visual Proportional Bar + View Details Link */}
                    <div className="flex items-center gap-4 sm:gap-6 justify-between md:justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                      {/* Popularity Visual Bar & Count */}
                      <div className="flex flex-col items-start md:items-end gap-1.5 w-44 sm:w-56">
                        <div className="flex items-center justify-between w-full text-xs">
                          <span className="text-gray-400 font-medium">مجموع تماشا:</span>
                          <span className="font-mono font-bold text-[#ccff00] flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            {toPersianDigits(item.view_count.toLocaleString('en-US'))} قسمت
                          </span>
                        </div>

                        {/* Progress Bar Container */}
                        <div className="w-full h-2 rounded-full bg-white/5 border border-white/10 overflow-hidden relative">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              rank === 1
                                ? 'bg-gradient-to-r from-amber-500 to-[#ccff00]'
                                : rank <= 3
                                ? 'bg-gradient-to-r from-emerald-500 to-[#ccff00]'
                                : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                            }`}
                            style={{ width: `${percentOfMax}%` }}
                          />
                        </div>
                      </div>

                      {/* Link to Show */}
                      <Link
                        href={`/dashboard/tv/${item.show_id}`}
                        title="مشاهده صفحه سریال"
                        className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition text-xs flex items-center gap-1.5 shrink-0"
                      >
                        <span className="hidden sm:inline">مشاهده</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Quick Navigation Cards */}
      <section className="space-y-4">
        <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#ccff00]" />
          <span>بخش‌های مدیریت و نظارت سیستم</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Users Management */}
          <Link
            href="/admin/users"
            className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 hover:bg-white/[0.04] transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#ccff00]/10 border border-[#ccff00]/20 text-[#ccff00] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm group-hover:text-[#ccff00] transition">
                  جدول و مدیریت کاربران
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  جستجو و خروجی CSV از {toPersianDigits(totalUsers)} کاربر
                </p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-white transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>

          {/* VIP Management */}
          <Link
            href="/admin/vip"
            className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-amber-500/20 hover:bg-white/[0.04] transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm group-hover:text-amber-400 transition">
                  مدیریت اشتراک‌های ویژه
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  نظارت بر {toPersianDigits(totalVips)} کاربر فعال VIP
                </p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-white transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>

          {/* SMS Logs Monitoring */}
          <Link
            href="/admin/sms"
            className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-blue-500/20 hover:bg-white/[0.04] transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm group-hover:text-blue-400 transition">
                  گزارشات و لاگ‌های پیامک
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  نظارت بر وضعیت ارسال کدهای OTP و ملی پیامک
                </p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-white transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}