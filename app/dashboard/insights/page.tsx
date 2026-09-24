"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  BarChart3, Crown, Sparkles, ArrowRight, Lock, Clock, Calendar, 
  Film, Award, Tv, Zap, Share2, Check, TrendingUp, Users, 
  Play, ShieldCheck, Dna, Star, Compass, Layers, Heart, Info
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { getShowWithCredits, getImageUrl, type TMDBShow } from '@/lib/tmdbClient';

interface WatchedRow {
  show_id: number;
  episode_id: number;
  created_at: string;
}

interface ActorStat {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  episodeCount: number;
  shows: string[];
}

interface DirectorStat {
  id: number;
  name: string;
  profile_path: string | null;
  episodeCount: number;
  shows: string[];
}

interface GenreStat {
  name: string;
  count: number;
  percentage: number;
}

interface MonthStat {
  monthName: string;
  key: string;
  episodes: number;
  hours: number;
}

interface YearStat {
  year: string;
  episodes: number;
  hours: number;
}

const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

export default function InsightsPage() {
  const router = useRouter();
  const supabase = createClient() as any;

  const [loading, setLoading] = useState(true);
  const [dataProgress, setDataProgress] = useState({ current: 0, total: 0 });
  const [user, setUser] = useState<any>(null);
  const [isVip, setIsVip] = useState(false);
  const [profile, setProfile] = useState<{ username: string; avatar_url: string }>({
    username: '',
    avatar_url: '😎'
  });

  const [watchedList, setWatchedList] = useState<WatchedRow[]>([]);
  const [showsMap, setShowsMap] = useState<Record<string, TMDBShow>>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'actors' | 'directors' | 'dna' | 'wrapped'>('overview');
  const [copiedWrapped, setCopiedWrapped] = useState(false);

  // ۱. دریافت اطلاعات کاربر و سابقه نامحدود تماشا
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
          router.replace('/login');
          return;
        }
        if (cancelled) return;
        setUser(currentUser);

        // خواندن پروفایل و وضعیت VIP
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, avatar_url, is_vip, role')
          .eq('id', currentUser.id)
          .single();

        const userIsVip = profileData?.is_vip === true || profileData?.role === 'admin';
        if (!cancelled) {
          setIsVip(userIsVip);
          setProfile({
            username: profileData?.username || currentUser.phone || 'کاربر بینجر',
            avatar_url: profileData?.avatar_url || currentUser.user_metadata?.avatar_url || '😎'
          });
        }

        // دریافت نامحدود تمامی اپیزودهای تماشاشده
        let allWatched: WatchedRow[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('watched')
            .select('show_id, episode_id, created_at')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (error || !data || data.length === 0) {
            hasMore = false;
          } else {
            allWatched = [...allWatched, ...data];
            if (data.length < pageSize) {
              hasMore = false;
            } else {
              page++;
            }
          }
        }

        if (cancelled) return;
        setWatchedList(allWatched);

        // واکشی جزئیات سریال‌ها و عوامل از TMDB
        const uniqueShowIds = Array.from(new Set(allWatched.map(w => String(w.show_id))));
        setDataProgress({ current: 0, total: uniqueShowIds.length });

        const loadedShows: Record<string, TMDBShow> = {};
        const batchSize = 6;
        for (let i = 0; i < uniqueShowIds.length; i += batchSize) {
          if (cancelled) return;
          const chunk = uniqueShowIds.slice(i, i + batchSize);
          await Promise.all(
            chunk.map(async (id) => {
              try {
                const showDetails = await getShowWithCredits(id);
                if (showDetails) {
                  loadedShows[id] = showDetails;
                }
              } catch (e) {
                console.error(`Error loading show ${id}`, e);
              }
            })
          );
          if (!cancelled) {
            setDataProgress({ current: Math.min(i + batchSize, uniqueShowIds.length), total: uniqueShowIds.length });
          }
        }

        if (!cancelled) {
          setShowsMap(loadedShows);
        }

      } catch (err) {
        console.error('Error loading insights data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, [router, supabase]);

  // ۲. محاسبات آماری پیشرفته
  const analytics = useMemo(() => {
    const totalEpisodes = watchedList.length;
    
    // میانگین زمان اپیزود بر حسب دقیقه
    let totalMinutes = 0;
    const episodesPerShow: Record<number, number> = {};

    watchedList.forEach(w => {
      episodesPerShow[w.show_id] = (episodesPerShow[w.show_id] || 0) + 1;
      const s = showsMap[String(w.show_id)];
      const runtime = (s?.episode_run_time && s.episode_run_time[0]) || 48;
      totalMinutes += runtime;
    });

    const totalHours = Math.round(totalMinutes / 60);
    const totalDays = (totalHours / 24).toFixed(1);
    const totalMonths = (totalHours / (24 * 30.5)).toFixed(1);

    // محاسبه آمار سال جاری و ماه جاری
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const thisYearEpisodes = watchedList.filter(w => new Date(w.created_at).getFullYear() === currentYear).length;
    const thisMonthEpisodes = watchedList.filter(w => {
      const d = new Date(w.created_at);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }).length;

    // توزیع ماهانه (۱۲ ماه اخیر)
    const monthlyStats: Record<string, { episodes: number; minutes: number }> = {};
    const yearlyStats: Record<string, { episodes: number; minutes: number }> = {};
    const weekdayStats: number[] = [0, 0, 0, 0, 0, 0, 0]; // 0=Sunday... 6=Saturday
    const timeOfDayStats = { morning: 0, afternoon: 0, evening: 0, night: 0 };

    watchedList.forEach(w => {
      const date = new Date(w.created_at);
      const year = String(date.getFullYear());
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const hour = date.getHours();

      const s = showsMap[String(w.show_id)];
      const run = (s?.episode_run_time && s.episode_run_time[0]) || 48;

      // ماهانه
      if (!monthlyStats[monthKey]) monthlyStats[monthKey] = { episodes: 0, minutes: 0 };
      monthlyStats[monthKey].episodes += 1;
      monthlyStats[monthKey].minutes += run;

      // سالانه
      if (!yearlyStats[year]) yearlyStats[year] = { episodes: 0, minutes: 0 };
      yearlyStats[year].episodes += 1;
      yearlyStats[year].minutes += run;

      // روز هفته
      weekdayStats[date.getDay()] += 1;

      // بازه ساعت شبانه‌روز
      if (hour >= 6 && hour < 12) timeOfDayStats.morning += 1;
      else if (hour >= 12 && hour < 18) timeOfDayStats.afternoon += 1;
      else if (hour >= 18 && hour < 24) timeOfDayStats.evening += 1;
      else timeOfDayStats.night += 1;
    });

    const formattedMonthly: MonthStat[] = Object.entries(monthlyStats)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 12)
      .reverse()
      .map(([key, val]) => {
        const [, m] = key.split('-');
        const monthIndex = (parseInt(m, 10) - 1) % 12;
        return {
          key,
          monthName: PERSIAN_MONTHS[monthIndex] || key,
          episodes: val.episodes,
          hours: Math.round(val.minutes / 60)
        };
      });

    const formattedYearly: YearStat[] = Object.entries(yearlyStats)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([year, val]) => ({
        year,
        episodes: val.episodes,
        hours: Math.round(val.minutes / 60)
      }));

    // محاسبه محبوب‌ترین بازیگران (Top Actors)
    const actorCounts: Record<number, { actor: any; count: number; shows: Set<string> }> = {};
    
    Object.entries(episodesPerShow).forEach(([showId, epCount]) => {
      const show = showsMap[showId];
      if (!show || !show.credits?.cast) return;

      // ۱۰ بازیگر اصلی هر سریال
      show.credits.cast.slice(0, 8).forEach(actor => {
        if (!actorCounts[actor.id]) {
          actorCounts[actor.id] = { actor, count: 0, shows: new Set() };
        }
        actorCounts[actor.id].count += epCount;
        actorCounts[actor.id].shows.add(show.name);
      });
    });

    const topActors: ActorStat[] = Object.values(actorCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(({ actor, count, shows }) => ({
        id: actor.id,
        name: actor.name,
        character: actor.character || '',
        profile_path: actor.profile_path,
        episodeCount: count,
        shows: Array.from(shows)
      }));

    // محاسبه بیشترین کارگردان‌ها و سازندگان (Top Directors / Creators)
    const directorCounts: Record<number, { director: any; count: number; shows: Set<string> }> = {};

    Object.entries(episodesPerShow).forEach(([showId, epCount]) => {
      const show = showsMap[showId];
      if (!show) return;

      // سازندگان (created_by)
      (show.created_by || []).forEach(creator => {
        if (!directorCounts[creator.id]) {
          directorCounts[creator.id] = { director: creator, count: 0, shows: new Set() };
        }
        directorCounts[creator.id].count += epCount;
        directorCounts[creator.id].shows.add(show.name);
      });

      // کارگردانان از crew
      (show.credits?.crew || [])
        .filter(c => c.job === 'Director' || c.department === 'Directing')
        .slice(0, 5)
        .forEach(dir => {
          if (!directorCounts[dir.id]) {
            directorCounts[dir.id] = { director: dir, count: 0, shows: new Set() };
          }
          directorCounts[dir.id].count += epCount;
          directorCounts[dir.id].shows.add(show.name);
        });
    });

    const topDirectors: DirectorStat[] = Object.values(directorCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map(({ director, count, shows }) => ({
        id: director.id,
        name: director.name,
        profile_path: director.profile_path,
        episodeCount: count,
        shows: Array.from(shows)
      }));

    // تحلیل ژنتیک سریالی (Series DNA)
    const genreFreq: Record<string, number> = {};
    const decadeFreq: Record<string, number> = { 'کلاسیک (قبل ۲۰۰۰)': 0, 'دهه ۲۰۰۰': 0, 'دهه ۲۰۱۰': 0, 'عصر جدید (۲۰۲۰+)': 0 };
    const networkFreq: Record<string, number> = {};
    let totalRatingsSum = 0;
    let totalRatedShows = 0;

    Object.entries(episodesPerShow).forEach(([showId, epCount]) => {
      const show = showsMap[showId];
      if (!show) return;

      if (show.vote_average) {
        totalRatingsSum += show.vote_average * epCount;
        totalRatedShows += epCount;
      }

      (show.genres || []).forEach(g => {
        genreFreq[g.name] = (genreFreq[g.name] || 0) + epCount;
      });

      (show.networks || []).forEach(net => {
        networkFreq[net.name] = (networkFreq[net.name] || 0) + epCount;
      });

      if (show.first_air_date) {
        const airYear = parseInt(show.first_air_date.split('-')[0], 10);
        if (airYear < 2000) decadeFreq['کلاسیک (قبل ۲۰۰۰)'] += epCount;
        else if (airYear < 2010) decadeFreq['دهه ۲۰۰۰'] += epCount;
        else if (airYear < 2020) decadeFreq['دهه ۲۰۱۰'] += epCount;
        else decadeFreq['عصر جدید (۲۰۲۰+)'] += epCount;
      }
    });

    const totalGenreHits = Object.values(genreFreq).reduce((acc, c) => acc + c, 0) || 1;
    const topGenres: GenreStat[] = Object.entries(genreFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / totalGenreHits) * 100)
      }));

    const topNetworks = Object.entries(networkFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const tasteQualityScore = totalRatedShows > 0 ? (totalRatingsSum / totalRatedShows).toFixed(1) : '8.1';

    // کهن‌الگوی سینمایی (Cinematic Archetype)
    let archetype = {
      title: 'خوره سریال جامع‌نگر (Universal Cinephile)',
      desc: 'سلیقه‌ای متعادل با تمایل به داستان‌های چندلایه، پرپیچ‌وخم و استاندارد بالا.',
      icon: '🎬'
    };

    const leadGenre = topGenres[0]?.name?.toLowerCase() || '';
    if (leadGenre.includes('crime') || leadGenre.includes('mystery')) {
      archetype = {
        title: 'کارآگاه شب‌گرد (Night-Owl Detective)',
        desc: 'عاشق پرونده‌های تاریک، تعلیق نفس‌گیر و کاوش در رازهای پنهان روان انسان.',
        icon: '🕵️‍♂️'
      };
    } else if (leadGenre.includes('sci-fi') || leadGenre.includes('fantasy')) {
      archetype = {
        title: 'مسافر جهان‌های موازی (Multiverse Voyager)',
        desc: 'مجذوب تئوری‌های کیهانی، خطوط زمانی پیچیده و دنیاسازی‌های تخیلی بی‌انتها.',
        icon: '🛸'
      };
    } else if (leadGenre.includes('drama')) {
      archetype = {
        title: 'فیلسوف درام (Dramatic Philosopher)',
        desc: 'دنبال شخصیت‌پردازی‌های عمیق، بحران‌های اخلاقی و روایت‌های تکان‌دهنده انسانی.',
        icon: '🎭'
      };
    } else if (leadGenre.includes('comedy')) {
      archetype = {
        title: 'ضد افسردگی و طناز تیزبین (The Mood Lifter)',
        desc: 'همراه همیشگی شوخی‌های کنایه‌آمیز، سیتکام‌های آرامش‌بخش و طنز هوشمندانه.',
        icon: '🍿'
      };
    }

    return {
      totalEpisodes,
      totalHours,
      totalDays,
      totalMonths,
      thisYearEpisodes,
      thisMonthEpisodes,
      uniqueShowsCount: Object.keys(episodesPerShow).length,
      monthlyStats: formattedMonthly,
      yearlyStats: formattedYearly,
      topActors,
      topDirectors,
      topGenres,
      topNetworks,
      decadeFreq,
      timeOfDayStats,
      tasteQualityScore,
      archetype
    };
  }, [watchedList, showsMap]);

  // اشتراک‌گذاری سالنامه (Binger Wrapped)
  const handleCopyWrapped = () => {
    const text = `🌟 سالنامه تماشای من در بینجر (Binger Wrapped)\n\n` +
      `📺 مجموع تماشا: ${analytics.totalEpisodes} اپیزود (${analytics.totalHours} ساعت)\n` +
      `🎭 محبوب‌ترین بازیگر: ${analytics.topActors[0]?.name || '---'}\n` +
      `🎬 بیشترین کارگردان: ${analytics.topDirectors[0]?.name || '---'}\n` +
      `🧬 ژانر غالب: ${analytics.topGenres[0]?.name || '---'}\n` +
      `👑 کهن‌الگو: ${analytics.archetype.title}\n\n` +
      `🔗 بینجر: دستیار هوشمند خوره‌های سریال`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedWrapped(true);
      setTimeout(() => setCopiedWrapped(false), 2500);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] p-4 md:p-8 pb-28 md:pb-16 relative overflow-x-hidden">
      
      {/* هاله‌های پس‌زمینه */}
      <div className="pointer-events-none absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute top-40 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />

      <div className="max-w-5xl mx-auto relative z-10">

        {/* هدر ناوبری */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/profile"
              className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
              title="بازگشت به پروفایل"
            >
              <ArrowRight size={18} />
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
                  <BarChart3 className="text-cyan-400" size={28} />
                  <span>آمار پیشرفته و سالنامه تماشا</span>
                </h1>
                {isVip ? (
                  <span className="bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
                    <Crown size={14} className="fill-amber-300" />
                    <span>مشترک ویژه VIP — تمام بخش‌ها باز است</span>
                  </span>
                ) : (
                  <span className="bg-white/5 border border-white/10 text-gray-400 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Lock size={12} />
                    <span>حساب عادی — آمار پیشرفته قفل است</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                ساعات دقیق تماشا در ماه و سال، محبوب‌ترین بازیگران، کارگردان‌ها، شناسنامه سلیقه و کارت سالنامه Binger Wrapped.
              </p>
            </div>
          </div>

          {!isVip && (
            <Link
              href="/dashboard/subscription"
              className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-black text-xs px-5 py-3 rounded-2xl flex items-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.35)] transition-all hover:scale-105 active:scale-95"
            >
              <Crown size={16} />
              <span>ارتقا به VIP و بازگشایی همه آمارها</span>
            </Link>
          )}
        </div>

        {/* لودینگ اولیه */}
        {loading && (
          <div className="bg-[#121212] border border-white/10 rounded-3xl p-8 text-center my-8 shadow-xl">
            <div className="w-12 h-12 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mx-auto mb-4" />
            <h3 className="text-base font-black text-white">در حال استخراج و تحلیل داده‌های TMDB...</h3>
            <p className="text-xs text-gray-400 mt-1">
              تحلیل بازیگران، کارگردانان و شناسنامه سریال‌های دیده‌شده ({dataProgress.current} از {dataProgress.total})
            </p>
          </div>
        )}

        {/* تب‌های دسته‌بندی آمار */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 no-scrollbar">
          {[
            { id: 'overview', label: 'خلاصه و ساعات تماشا', icon: <Clock size={15} /> },
            { id: 'actors', label: 'محبوب‌ترین بازیگران', icon: <Users size={15} />, vipOnly: true },
            { id: 'directors', label: 'بیشترین کارگردان‌ها', icon: <Film size={15} />, vipOnly: true },
            { id: 'dna', label: 'ژنتیک و DNA سریالی', icon: <Dna size={15} />, vipOnly: true },
            { id: 'wrapped', label: 'سالنامه Binger Wrapped', icon: <Sparkles size={15} />, vipOnly: true },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                activeTab === tab.id
                  ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.2)]'
                  : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.vipOnly && !isVip && (
                <Lock size={12} className="text-amber-400/80 mr-1" />
              )}
            </button>
          ))}
        </div>

        {/* ========================================================================= */}
        {/* ۱. بخش خلاصه تماشا (پایه - قابل رویت برای همه کاربران، با جزئیات کامل ماه و سال) */}
        {/* ========================================================================= */}
        <section className="space-y-6 mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* کارت تعداد کل اپیزودها */}
            <div className="bg-[#121212] border border-white/10 rounded-3xl p-5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Play size={80} className="text-[#ccff00]" />
              </div>
              <span className="text-xs font-bold text-gray-400 block mb-2">کل اپیزودهای تماشاشده</span>
              <strong className="text-3xl md:text-4xl font-black text-[#ccff00]">
                {analytics.totalEpisodes.toLocaleString('fa-IR')}
              </strong>
              <span className="text-[11px] text-gray-500 block mt-1">
                از {analytics.uniqueShowsCount.toLocaleString('fa-IR')} سریال متفاوت
              </span>
            </div>

            {/* کارت ساعات دقیق کل */}
            <div className="bg-[#121212] border border-white/10 rounded-3xl p-5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Clock size={80} className="text-cyan-400" />
              </div>
              <span className="text-xs font-bold text-gray-400 block mb-2">مجموع زمان تماشا</span>
              <strong className="text-3xl md:text-4xl font-black text-cyan-300">
                {analytics.totalHours.toLocaleString('fa-IR')} <span className="text-sm text-gray-400 font-bold">ساعت</span>
              </strong>
              <span className="text-[11px] text-gray-500 block mt-1">
                معادل {analytics.totalDays} روز ({analytics.totalMonths} ماه پیوسته)
              </span>
            </div>

            {/* کارت تماشای سال جاری */}
            <div className="bg-[#121212] border border-white/10 rounded-3xl p-5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Calendar size={80} className="text-amber-400" />
              </div>
              <span className="text-xs font-bold text-gray-400 block mb-2">تماشای امسال ({new Date().getFullYear()})</span>
              <strong className="text-3xl md:text-4xl font-black text-amber-300">
                {analytics.thisYearEpisodes.toLocaleString('fa-IR')} <span className="text-sm text-gray-400 font-bold">قسمت</span>
              </strong>
              <span className="text-[11px] text-gray-500 block mt-1">
                پیشرفت سالانه با ریتم منظم
              </span>
            </div>

            {/* کارت تماشای ماه جاری */}
            <div className="bg-[#121212] border border-white/10 rounded-3xl p-5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingUp size={80} className="text-pink-500" />
              </div>
              <span className="text-xs font-bold text-gray-400 block mb-2">تماشای ماه جاری</span>
              <strong className="text-3xl md:text-4xl font-black text-pink-400">
                {analytics.thisMonthEpisodes.toLocaleString('fa-IR')} <span className="text-sm text-gray-400 font-bold">قسمت</span>
              </strong>
              <span className="text-[11px] text-gray-500 block mt-1">
                میانگین روزانه: {(analytics.thisMonthEpisodes / 30).toFixed(1)} اپیزود
              </span>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* ۲. نمودارهای گرافیکی تعاملی ساعات تماشا در ماه و سال (Free vs VIP) */}
        {/* ========================================================================= */}
        <section className="mb-12 relative">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
              <BarChart3 className="text-cyan-400" size={20} />
              <span>نمودار دقیق ساعات تماشا در ماه و سال</span>
            </h2>
            <span className="text-xs text-gray-400">تفکیک دوره‌ای زمان صرف‌شده</span>
          </div>

          {/* اگر کاربر عادی باشد، این بخش بلور شده و پی‌وال روی آن می‌افتد */}
          <div className={`transition-all ${!isVip ? 'filter blur-sm select-none pointer-events-none opacity-60' : ''}`}>
            
            {/* نمودار میله‌ای ماه‌ها */}
            <div className="bg-[#121212] border border-white/10 rounded-3xl p-6 mb-4">
              <h3 className="text-xs font-bold text-gray-400 mb-6 flex items-center gap-2">
                <Calendar size={14} className="text-cyan-400" /> روند ساعات تماشا در ماه‌های اخیر:
              </h3>

              {analytics.monthlyStats.length > 0 ? (
                <div className="h-48 flex items-end justify-between gap-2 pt-6 px-2">
                  {(() => {
                    const maxHours = Math.max(...analytics.monthlyStats.map(m => m.hours), 1);
                    return analytics.monthlyStats.map((item, idx) => {
                      const heightPercent = Math.max(10, Math.round((item.hours / maxHours) * 100));
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group/bar">
                          <span className="text-[10px] text-cyan-300 font-bold opacity-0 group-hover/bar:opacity-100 transition-opacity">
                            {item.hours}h
                          </span>
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className="w-full max-w-[28px] rounded-t-xl bg-gradient-to-t from-cyan-600 via-cyan-400 to-cyan-300 group-hover/bar:brightness-125 transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                          />
                          <span className="text-[10px] text-gray-400 font-bold truncate max-w-full text-center">
                            {item.monthName}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-xs text-gray-500">
                  داده‌ای برای ماه‌های اخیر ثبت نشده است.
                </div>
              )}
            </div>

            {/* تفکیک سالانه و ساعات روزانه */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* سال‌ها */}
              <div className="bg-[#121212] border border-white/10 rounded-3xl p-6">
                <h3 className="text-xs font-bold text-gray-400 mb-4 flex items-center gap-2">
                  <TrendingUp size={14} className="text-amber-400" /> سالنامه تماشا بر اساس سال:
                </h3>
                <div className="space-y-3">
                  {analytics.yearlyStats.map(y => {
                    const maxYearHours = Math.max(...analytics.yearlyStats.map(item => item.hours), 1);
                    const widthPercent = Math.max(12, Math.round((y.hours / maxYearHours) * 100));
                    return (
                      <div key={y.year}>
                        <div className="flex justify-between text-xs font-bold text-gray-300 mb-1">
                          <span>سال {y.year}</span>
                          <span className="text-amber-300">{y.hours} ساعت ({y.episodes} قسمت)</span>
                        </div>
                        <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${widthPercent}%` }}
                            className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* بازه‌های ساعت شبانه‌روز */}
              <div className="bg-[#121212] border border-white/10 rounded-3xl p-6">
                <h3 className="text-xs font-bold text-gray-400 mb-4 flex items-center gap-2">
                  <Clock size={14} className="text-purple-400" /> عادت تماشای شما در ساعات شبانه‌روز:
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 p-3 rounded-2xl text-center">
                    <span className="text-xs text-gray-400 block mb-1">🌅 صبح (۶ تا ۱۲)</span>
                    <strong className="text-base font-black text-white">{analytics.timeOfDayStats.morning} قسمت</strong>
                  </div>
                  <div className="bg-white/5 p-3 rounded-2xl text-center">
                    <span className="text-xs text-gray-400 block mb-1">☀️ ظهر و عصر (۱۲ تا ۱۸)</span>
                    <strong className="text-base font-black text-white">{analytics.timeOfDayStats.afternoon} قسمت</strong>
                  </div>
                  <div className="bg-white/5 p-3 rounded-2xl text-center">
                    <span className="text-xs text-gray-400 block mb-1">🌆 سرشب (۱۸ تا ۲۴)</span>
                    <strong className="text-base font-black text-cyan-400">{analytics.timeOfDayStats.evening} قسمت</strong>
                  </div>
                  <div className="bg-white/5 p-3 rounded-2xl text-center">
                    <span className="text-xs text-gray-400 block mb-1">🌙 پاسی از شب (۰ تا ۶)</span>
                    <strong className="text-base font-black text-purple-400">{analytics.timeOfDayStats.night} قسمت</strong>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* پی‌وال مخصوص کاربر عادی */}
          {!isVip && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-3xl border border-amber-400/30 flex flex-col items-center justify-center p-6 text-center z-20">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-300 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                <Lock size={26} />
              </div>
              <h3 className="text-lg font-black text-white mb-1">
                نمودارهای گرافیکی ساعات ماه و سال (مخصوص VIP)
              </h3>
              <p className="text-xs text-gray-300 max-w-md leading-relaxed mb-4">
                برای مشاهده نمودارهای تفکیکی ساعات تماشا در تک‌تک ماه‌های سال، عادات تماشا در طول شبانه‌روز و مقایسه سالانه، اشتراک VIP خود را فعال کنید.
              </p>
              <Link
                href="/dashboard/subscription"
                className="bg-amber-400 hover:bg-amber-300 text-black font-black text-xs px-6 py-3 rounded-xl flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all"
              >
                <Crown size={15} />
                <span>ارتقا به اشتراک VIP</span>
              </Link>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* ۳. محبوب‌ترین بازیگران من (Top Actors) */}
        {/* ========================================================================= */}
        <section className="mb-12 relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                <Users className="text-yellow-400" size={20} />
                <span>محبوب‌ترین بازیگران من (Top Actors)</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">ستارگانی که بیشترین اپیزود و اثر را از آن‌ها تماشا کرده‌اید</p>
            </div>
          </div>

          <div className={`transition-all ${!isVip ? 'filter blur-sm select-none pointer-events-none opacity-60' : ''}`}>
            {analytics.topActors.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
                {analytics.topActors.map((actor, idx) => (
                  <div
                    key={actor.id}
                    className={`bg-[#121212] border rounded-3xl p-4 flex flex-col items-center text-center relative overflow-hidden transition-all hover:scale-105 ${
                      idx === 0
                        ? 'border-amber-400/50 shadow-[0_0_30px_rgba(245,158,11,0.2)] bg-gradient-to-b from-amber-500/10 to-[#121212]'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* رتبه */}
                    <span className={`absolute top-2.5 right-2.5 text-[10px] font-black px-2 py-0.5 rounded-full ${
                      idx === 0 ? 'bg-amber-400 text-black shadow-md' : 'bg-white/10 text-gray-400'
                    }`}>
                      #{idx + 1}
                    </span>

                    {/* عکس بازیگر */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-white/10 bg-black/50 mb-3 shadow-md">
                      <img
                        src={getImageUrl(actor.profile_path)}
                        alt={actor.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <h4 className="text-xs sm:text-sm font-black text-white truncate max-w-full">
                      {actor.name}
                    </h4>

                    {actor.character && (
                      <span className="text-[10px] text-gray-400 truncate max-w-full block mt-0.5">
                        در نقش {actor.character}
                      </span>
                    )}

                    <div className="mt-3 pt-2.5 border-t border-white/5 w-full flex items-center justify-between text-[10px]">
                      <span className="text-gray-500">حضور:</span>
                      <strong className="text-cyan-300 font-black">{actor.episodeCount} قسمت</strong>
                    </div>

                    <span className="text-[9px] text-gray-400 truncate max-w-full mt-1">
                      {actor.shows.slice(0, 2).join('، ')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 bg-white/5 border border-white/10 rounded-3xl text-center text-xs text-gray-500">
                سریالی برای استخراج بازیگران ثبت نشده است.
              </div>
            )}
          </div>

          {!isVip && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-3xl border border-amber-400/30 flex flex-col items-center justify-center p-6 text-center z-20">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-300 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                <Users size={26} />
              </div>
              <h3 className="text-lg font-black text-white mb-1">
                تحلیل محبوب‌ترین بازیگران (مخصوص VIP)
              </h3>
              <p className="text-xs text-gray-300 max-w-md leading-relaxed mb-4">
                با عضویت در VIP، متوجه شوید کدام هنرپیشه‌ها بیشترین زمان را روی صفحه نمایش شما گذرانده‌اند و با کاراکترهای آن‌ها آشنا شوید.
              </p>
              <Link
                href="/dashboard/subscription"
                className="bg-amber-400 hover:bg-amber-300 text-black font-black text-xs px-6 py-3 rounded-xl flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all"
              >
                <Crown size={15} />
                <span>باز کردن لیست بازیگران با VIP</span>
              </Link>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* ۴. بیشترین کارگردان‌ها و سازندگان (Top Directors) */}
        {/* ========================================================================= */}
        <section className="mb-12 relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                <Film className="text-purple-400" size={20} />
                <span>بیشترین کارگردانی که کارهایش را دیدم (Top Creators)</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">معماران و خالقان دنیای سریال‌های محبوب شما</p>
            </div>
          </div>

          <div className={`transition-all ${!isVip ? 'filter blur-sm select-none pointer-events-none opacity-60' : ''}`}>
            {analytics.topDirectors.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {analytics.topDirectors.map((dir, idx) => (
                  <div
                    key={dir.id}
                    className={`bg-[#121212] border rounded-3xl p-5 flex items-center gap-4 transition-all hover:scale-105 ${
                      idx === 0
                        ? 'border-purple-400/50 shadow-[0_0_30px_rgba(168,85,247,0.2)] bg-gradient-to-r from-purple-950/20 to-[#121212]'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-white/10 bg-black/40">
                      <img
                        src={getImageUrl(dir.profile_path)}
                        alt={dir.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-purple-400 font-bold">سازنده #{idx + 1}</span>
                        <strong className="text-xs text-white font-black">{dir.episodeCount} قسمت</strong>
                      </div>
                      <h4 className="text-sm font-black text-white truncate">{dir.name}</h4>
                      <p className="text-[10px] text-gray-400 truncate mt-1">
                        آثار: {dir.shows.join('، ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 bg-white/5 border border-white/10 rounded-3xl text-center text-xs text-gray-500">
                کارگردانی برای نمایش یافت نشد.
              </div>
            )}
          </div>

          {!isVip && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-3xl border border-amber-400/30 flex flex-col items-center justify-center p-6 text-center z-20">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-300 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                <Film size={26} />
              </div>
              <h3 className="text-lg font-black text-white mb-1">
                کشف معماران و کارگردان‌های محبوب (مخصوص VIP)
              </h3>
              <p className="text-xs text-gray-300 max-w-md leading-relaxed mb-4">
                ببینید کدام نویسنده یا کارگردان بیشترین امضا را در سابقه سریال‌بینی شما ثبت کرده است.
              </p>
              <Link
                href="/dashboard/subscription"
                className="bg-amber-400 hover:bg-amber-300 text-black font-black text-xs px-6 py-3 rounded-xl flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all"
              >
                <Crown size={15} />
                <span>دسترسی به بخش کارگردان‌ها با VIP</span>
              </Link>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* ۵. بخش تحلیل ژنتیک و DNA سریالی (Series DNA) */}
        {/* ========================================================================= */}
        <section className="mb-12 relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                <Dna className="text-emerald-400" size={20} />
                <span>تحلیل ژنتیک سلیقه و DNA سریالی (Series DNA)</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">شناسنامه سلیقه، کهن‌الگوی شخصیتی، توزیع ژانرها و دهه‌ها</p>
            </div>
          </div>

          <div className={`transition-all ${!isVip ? 'filter blur-sm select-none pointer-events-none opacity-60' : ''}`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              
              {/* کارت کهن‌الگوی شخصیتی تماشاچی */}
              <div className="md:col-span-1 bg-gradient-to-br from-emerald-950/30 via-[#121212] to-black border border-emerald-500/30 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">کهن‌الگوی سینمایی شما</span>
                    <span className="text-3xl">{analytics.archetype.icon}</span>
                  </div>
                  <h3 className="text-lg font-black text-white mb-2 leading-tight">
                    {analytics.archetype.title}
                  </h3>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {analytics.archetype.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-gray-400">میانگین امتیاز سلیقه:</span>
                  <strong className="text-amber-300 font-black flex items-center gap-1">
                    <Star size={14} className="fill-amber-300" />
                    <span>{analytics.tasteQualityScore} از ۱۰</span>
                  </strong>
                </div>
              </div>

              {/* توزیع ژانرها */}
              <div className="md:col-span-2 bg-[#121212] border border-white/10 rounded-3xl p-6">
                <h3 className="text-xs font-bold text-gray-400 mb-4 flex items-center gap-2">
                  <Layers size={14} className="text-emerald-400" /> توزیع درصدی ژانرهای محبوب:
                </h3>
                <div className="space-y-3">
                  {analytics.topGenres.map((g, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-xs font-bold text-gray-300 mb-1">
                        <span>{g.name}</span>
                        <span className="text-emerald-400">{g.percentage}٪ ({g.count} قسمت)</span>
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${g.percentage}%` }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-300 rounded-full"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* خط زمانی دهه‌ها و شبکه‌ها */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* دهه‌ها */}
              <div className="bg-[#121212] border border-white/10 rounded-3xl p-6">
                <h3 className="text-xs font-bold text-gray-400 mb-4 flex items-center gap-2">
                  <Clock size={14} className="text-cyan-400" /> دهه‌های مورد علاقه:
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {Object.entries(analytics.decadeFreq).map(([dec, count]) => (
                    <div key={dec} className="p-3 bg-white/[0.03] border border-white/5 rounded-2xl">
                      <span className="text-[10px] text-gray-400 block mb-1">{dec}</span>
                      <strong className="text-sm font-black text-cyan-300">{count} قسمت</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* شبکه‌ها */}
              <div className="bg-[#121212] border border-white/10 rounded-3xl p-6">
                <h3 className="text-xs font-bold text-gray-400 mb-4 flex items-center gap-2">
                  <Tv size={14} className="text-pink-400" /> پلتفرم‌ها و شبکه‌های غالب:
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analytics.topNetworks.map((net, idx) => (
                    <div key={idx} className="px-3 py-2 bg-white/[0.03] border border-white/5 rounded-xl text-xs flex items-center gap-2">
                      <span className="font-bold text-white">{net.name}</span>
                      <span className="text-[10px] text-pink-400 font-bold">({net.count})</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {!isVip && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-3xl border border-amber-400/30 flex flex-col items-center justify-center p-6 text-center z-20">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-300 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                <Dna size={26} />
              </div>
              <h3 className="text-lg font-black text-white mb-1">
                شناسنامه و تحلیل ژنتیک سریالی (مخصوص VIP)
              </h3>
              <p className="text-xs text-gray-300 max-w-md leading-relaxed mb-4">
                کهن‌الگوی سینمایی خود را رمزگشایی کنید و ببینید سلیقه شما از نظر ژانر و دوره‌های زمانی چقدر خاص و منحصربه‌فرد است.
              </p>
              <Link
                href="/dashboard/subscription"
                className="bg-amber-400 hover:bg-amber-300 text-black font-black text-xs px-6 py-3 rounded-xl flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all"
              >
                <Crown size={15} />
                <span>مشاهده Series DNA با VIP</span>
              </Link>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* ۶. سالنامه تماشا (Binger Wrapped Card) */}
        {/* ========================================================================= */}
        <section className="mb-12 relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                <Sparkles className="text-amber-300" size={20} />
                <span>سالنامه تماشا (Binger Wrapped)</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">کارت خلاصه سالانه تماشای شما برای استوری و اشتراک‌گذاری</p>
            </div>
          </div>

          <div className={`transition-all ${!isVip ? 'filter blur-sm select-none pointer-events-none opacity-60' : ''}`}>
            <div className="max-w-md mx-auto bg-gradient-to-br from-[#1c160b] via-[#101010] to-[#080808] border-2 border-amber-400/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(245,158,11,0.25)] relative overflow-hidden text-center">
              
              {/* نشان آب‌علامت */}
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-black flex items-center justify-center text-lg font-bold">
                    {profile.avatar_url || '😎'}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block">پروفایل بینجر</span>
                    <strong className="text-xs text-white font-black">{profile.username}</strong>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-black">
                  <Crown size={12} /> BINGER WRAPPED
                </div>
              </div>

              {/* آمار بزرگ وسط */}
              <div className="my-6">
                <span className="text-xs text-gray-400 block mb-1">شما تا این لحظه</span>
                <strong className="text-5xl font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                  {analytics.totalHours}
                </strong>
                <span className="text-sm font-black text-amber-300 block mt-1">ساعت سریال غرق شده‌اید!</span>
                <span className="text-xs text-gray-400 block mt-0.5">({analytics.totalEpisodes} اپیزود تماشا شده)</span>
              </div>

              {/* ۴ ستون اطلاعات کلیدی */}
              <div className="grid grid-cols-2 gap-3 text-right bg-white/[0.03] border border-white/5 p-4 rounded-2xl mb-6">
                <div>
                  <span className="text-[10px] text-gray-500 block">ستاره محبوب:</span>
                  <strong className="text-xs text-white truncate block">{analytics.topActors[0]?.name || '---'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">معمار سریال‌ها:</span>
                  <strong className="text-xs text-white truncate block">{analytics.topDirectors[0]?.name || '---'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">ژانر اصلی:</span>
                  <strong className="text-xs text-emerald-400 truncate block">{analytics.topGenres[0]?.name || '---'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">کهن‌الگو:</span>
                  <strong className="text-xs text-amber-300 truncate block">{analytics.archetype.title.split(' ')[0]}</strong>
                </div>
              </div>

              {/* دکمه کپی و اشتراک‌گذاری */}
              <button
                onClick={handleCopyWrapped}
                className="w-full py-3 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all cursor-pointer"
              >
                {copiedWrapped ? <Check size={16} /> : <Share2 size={16} />}
                <span>{copiedWrapped ? 'متن سالنامه کپی شد!' : 'کپی و اشتراک‌گذاری سالنامه'}</span>
              </button>
            </div>
          </div>

          {!isVip && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-3xl border border-amber-400/30 flex flex-col items-center justify-center p-6 text-center z-20">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-300 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                <Sparkles size={26} />
              </div>
              <h3 className="text-lg font-black text-white mb-1">
                کارت سالنامه Binger Wrapped (مخصوص VIP)
              </h3>
              <p className="text-xs text-gray-300 max-w-md leading-relaxed mb-4">
                کارت خلاصه سالانه تماشای خود را با اشتراک VIP بازگشایی و با دوستان خود در شبکه‌های اجتماعی به اشتراک بگذارید.
              </p>
              <Link
                href="/dashboard/subscription"
                className="bg-amber-400 hover:bg-amber-300 text-black font-black text-xs px-6 py-3 rounded-xl flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all"
              >
                <Crown size={15} />
                <span>دریافت کارت Binger Wrapped با VIP</span>
              </Link>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
