"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { 
  getShowDetails, 
  getSeasonDetails, 
  getImageUrl, 
  getGlobalAiringShows,
  getBackdropUrl 
} from '@/lib/tmdbClient';
import { useRouter } from 'next/navigation';
import { 
  Loader2, 
  Calendar as CalIcon, 
  Clock, 
  Check, 
  PlayCircle, 
  AlertCircle, 
  Flame, 
  Sparkles, 
  Bell, 
  Plus, 
  CheckCircle2, 
  Tv, 
  Film,
  TrendingUp,
  Award
} from 'lucide-react';
import EpisodeModal from './components/EpisodeModal';
import { ShowCardProgress } from './components/ShowProgressBar';
// لیست ۱۶ تخصص پزشکی-سینمایی اختصاصی بینجر
const SPECIALTIES = [
  { id: 'comedy', name: 'فوق تخصص قهقهه', genreId: 35 },
  { id: 'mystery', name: 'متخصص مغز و اعصاب', genreId: 9648 },
  { id: 'kdrama', name: 'دکتر کیدراما', isKdrama: true },
  { id: 'horror', name: 'فوق تخصص ترس', genreId: 27 },
  { id: 'crime', name: 'متخصص پزشکی قانونی', genreId: 80 },
  { id: 'epic', name: 'دکتر اپیک', genreId: 10765 },
  { id: 'mini', name: 'مینی دکتر', isMini: true },
  { id: 'action', name: 'دکتر آدرنالین', genreId: 10759 },
  { id: 'teen', name: 'دکتر تین', isTeen: true },
  { id: 'romance', name: 'دکتر رومنس', genreId: 10766 },
  { id: 'scifi', name: 'دکتر خیالباف', genreId: 10765 },
  { id: 'western', name: 'دکتر کابوی', genreId: 37 },
  { id: 'musical', name: 'متخصص موزیکولوژی', genreId: 10402 },
  { id: 'doc', name: 'متخصص فکتولوژی', genreId: 99 },
  { id: 'biography', name: 'مدیر بایگانی', isBio: true },
];  
export default function BingerHomeScreen() {
  const router = useRouter();
  const supabase = createClient() as any;

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  // دیتای سریال‌ها و رکوردهای تماشا
  const [trackedShows, setTrackedShows] = useState<any[]>([]);
  const [watchedRecords, setWatchedRecords] = useState<any[]>([]);
  const [seasonEpisodesMap, setSeasonEpisodesMap] = useState<Record<string, any[]>>({});

  // تب‌های تقویم: امروز / این هفته / به‌زودی
  const [calendarTab, setCalendarTab] = useState<'today' | 'this_week' | 'upcoming'>('today');

  // سوییچ منبع تقویم: سریال‌های من یا ترندهای جهانی
  const [calendarScope, setCalendarScope] = useState<'mine' | 'global'>('mine');
  const [globalAiringShows, setGlobalAiringShows] = useState<any[]>([]);

  // کارت در حال انیمیشن خروج در نوبت تماشا
  const [animatingCardId, setAnimatingCardId] = useState<number | null>(null);

  // مودال جزئیات قسمت
  const [selectedEpData, setSelectedEpData] = useState<any>(null);
// محاسبه ۱۰۰٪ زنده هویت و تخصص سینمایی بر اساس سریال‌های تماشا شده کاربر
  const userSpecialty = useMemo(() => {
    const watchedShowIds = Array.from(new Set(watchedRecords.map(w => Number(w.show_id))));
    const count = watchedShowIds.length;

    // اگر کاربر کمتر از ۵ سریال دیده باشد
    if (count < 5) {
      return `در حال رمزگشایی هویت (${count}/5)`;
    }

    const watchedShows = trackedShows.filter(s => watchedShowIds.includes(Number(s.id)));
    if (watchedShows.length === 0) return 'سینمافیل بینجر';

    const genreHoursMap: Record<number, number> = {};
    let kdramaCount = 0;
    let miniCount = 0;

    watchedShows.forEach((show: any) => {
      const episodeCount = show.number_of_episodes || 10;
      const avgRuntime = show.episode_run_time?.[0] || 45;
      const showHours = Math.round((episodeCount * avgRuntime) / 60) || 8;

      if (show.origin_country?.includes('KR')) kdramaCount++;
      if (episodeCount <= 8) miniCount++;

      show.genres?.forEach((g: any) => {
        if (g.id === 18) return; // درام را برای تخصص اصلی رد می‌کنیم
        genreHoursMap[g.id] = (genreHoursMap[g.id] || 0) + showHours;
      });
    });

    if (kdramaCount >= watchedShows.length * 0.4) {
      return SPECIALTIES.find(s => s.id === 'kdrama')?.name || 'دکتر کیدراما';
    }
    if (miniCount >= watchedShows.length * 0.5) {
      return SPECIALTIES.find(s => s.id === 'mini')?.name || 'مینی دکتر';
    }

    const sortedGenres = Object.entries(genreHoursMap).sort(([, a], [, b]) => b - a);
    const topGenreId = sortedGenres[0] ? Number(sortedGenres[0][0]) : 35;

    const assigned = SPECIALTIES.find(s => s.genreId === topGenreId) || SPECIALTIES[0];
    return assigned.name;
  }, [trackedShows, watchedRecords]);

  // ۱. واکشی اطلاعات جامع کاربر و دیتابیس
  const loadInitialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }
      setCurrentUser(user);

      // خواندن پروفایل کاربری
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      setUserProfile(profile);

      // خواندن سریال‌های واچ‌لیست
      const { data: watchlistData } = await supabase
        .from('watchlist')
        .select('show_id')
        .eq('user_id', user.id);

      // خواندن تمام قسمت‌های دیده‌شده
      const allWatched: any[] = [];
      let page = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('watched')
          .select('show_id, episode_id')
          .eq('user_id', user.id)
          .range(page * 1000, (page + 1) * 1000 - 1);

        if (error || !data || data.length === 0) {
          hasMore = false;
        } else {
          allWatched.push(...data);
          hasMore = data.length === 1000;
          page++;
        }
      }

      setWatchedRecords(allWatched);

      const watchedShowIds = new Set<number>(allWatched.map(w => Number(w.show_id)));
      const watchlistShowIds = new Set<number>((watchlistData || []).map((w: any) => Number(w.show_id)));
      const allShowIds = Array.from(new Set([...watchedShowIds, ...watchlistShowIds]));

      // واکشی سریال‌های جهانی برای تقویم و کلد استارت
      const globalShows = await getGlobalAiringShows();
      setGlobalAiringShows(globalShows || []);

      // واکشی مشخصات سریال‌های کاربر از TMDB
      const showsDetails: any[] = [];
      const batchSize = 6;
      for (let i = 0; i < allShowIds.length; i += batchSize) {
        const chunk = allShowIds.slice(i, i + batchSize);
        const chunkData = await Promise.all(
          chunk.map(async (id) => {
            const show = await getShowDetails(String(id));
            return show ? { ...show, hasWatched: watchedShowIds.has(Number(id)) } : null;
          })
        );
        showsDetails.push(...chunkData.filter(Boolean));
      }

      setTrackedShows(showsDetails);

      // واکشی فصل‌های جاری برای دسترسی سریع به شناسه‌ها و عناوین
      const seasonCache: Record<string, any[]> = {};
      await Promise.all(
        showsDetails.map(async (show) => {
          const showWatchedCount = allWatched.filter(w => Number(w.show_id) === Number(show.id)).length;
          const validSeasons = (show.seasons || [])
            .filter((s: any) => s && s.season_number > 0)
            .sort((a: any, b: any) => a.season_number - b.season_number);

          let cumulative = 0;
          let targetSeason = 1;
          for (const s of validSeasons) {
            const count = s.episode_count || 0;
            if (showWatchedCount < cumulative + count) {
              targetSeason = s.season_number;
              break;
            }
            cumulative += count;
          }

          const seasonsToFetch = new Set<number>();
          seasonsToFetch.add(targetSeason);
          if (show.next_episode_to_air?.season_number) seasonsToFetch.add(show.next_episode_to_air.season_number);
          if (show.last_episode_to_air?.season_number) seasonsToFetch.add(show.last_episode_to_air.season_number);

          await Promise.all(
            Array.from(seasonsToFetch).map(async (sNum) => {
              try {
                const sData = await getSeasonDetails(String(show.id), sNum);
                if (sData?.episodes) {
                  seasonCache[`${show.id}_${sNum}`] = sData.episodes;
                }
              } catch {}
            })
          );
        })
      );

      setSeasonEpisodesMap(seasonCache);
      setLoading(false);
    } catch (err) {
      console.error("Home screen init error:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // واکشی پویا برای فصل‌های جدید حین تماشا
  useEffect(() => {
    if (!trackedShows.length) return;
    trackedShows.forEach(async (show) => {
      const showWatched = watchedRecords.filter(w => Number(w.show_id) === Number(show.id));
      const validSeasons = (show.seasons || [])
        .filter((s: any) => s && s.season_number > 0)
        .sort((a: any, b: any) => a.season_number - b.season_number);

      let cumulative = 0;
      let targetSeason = 1;
      for (const s of validSeasons) {
        const count = s.episode_count || 0;
        if (showWatched.length < cumulative + count) {
          targetSeason = s.season_number;
          break;
        }
        cumulative += count;
      }

      const cacheKey = `${show.id}_${targetSeason}`;
      if (!seasonEpisodesMap[cacheKey]) {
        try {
          const sData = await getSeasonDetails(String(show.id), targetSeason);
          if (sData?.episodes) {
            setSeasonEpisodesMap(prev => ({ ...prev, [cacheKey]: sData.episodes }));
          }
        } catch {}
      }
    });
  }, [watchedRecords, trackedShows]);

  // ثبت تماشا به صورت Optimistic Update (آنی و بدون لودینگ بلاک‌کننده)
  const handleToggleWatched = async (
    e: React.MouseEvent,
    showId: number,
    episodeId: number,
    isAlreadyWatched: boolean
  ) => {
    e.stopPropagation();
    if (!currentUser || !episodeId) return;

    if (isAlreadyWatched) {
      // آپدیت آنی لوکال (حذف)
      setWatchedRecords(prev => prev.filter(w => Number(w.episode_id) !== Number(episodeId)));

      const { error } = await supabase
        .from('watched')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('show_id', Number(showId))
        .eq('episode_id', Number(episodeId));

      if (error) {
        // بازگرداندن در صورت خطا
        setWatchedRecords(prev => [...prev, { show_id: Number(showId), episode_id: Number(episodeId) }]);
      }
    } else {
      // فعال‌سازی انیمیشن اسلاید خروج کارت در نوبت تماشا
      setAnimatingCardId(showId);

      // آپدیت آنی استیت لوکال
      setTimeout(() => {
        setWatchedRecords(prev => [...prev, { show_id: Number(showId), episode_id: Number(episodeId) }]);
        setAnimatingCardId(null);
      }, 260);

      // ثبت در پس‌زمینه دیتابیس
      const { error } = await supabase
        .from('watched')
        .upsert([{
          user_id: currentUser.id,
          show_id: Number(showId),
          episode_id: Number(episodeId)
        }], { onConflict: 'user_id, episode_id' });

      if (error) {
        console.error("Optimistic insert failed:", error);
        setWatchedRecords(prev => prev.filter(w => Number(w.episode_id) !== Number(episodeId)));
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('binger:watched-updated', { detail: { showId: Number(showId) } }));
    }
  };

  // افزودن سریع سریال به واچ‌لیست برای کاربر جدید (Cold Start)
  const handleFollowShow = async (showId: number) => {
    if (!currentUser) return;
    const { error } = await supabase
      .from('watchlist')
      .insert([{ user_id: currentUser.id, show_id: showId }]);

    if (!error) {
      const show = await getShowDetails(String(showId));
      if (show) {
        setTrackedShows(prev => [...prev, show]);
      }
    }
  };

  // ۲. محاسبه لیست نوبت تماشا (Up Next Queue): همه سریال‌های ناتمام کاربر
  const upNextQueue = useMemo(() => {
    const list: any[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    trackedShows.forEach(show => {
      if (!show) return;

      const showWatched = watchedRecords.filter(w => Number(w.show_id) === Number(show.id));
      const validSeasons = (show.seasons || [])
        .filter((s: any) => s && s.season_number > 0)
        .sort((a: any, b: any) => a.season_number - b.season_number);

      let totalEpisodesCount = 0;
      validSeasons.forEach((s: any) => {
        totalEpisodesCount += (s.episode_count || 0);
      });

      let cumulative = 0;
      let targetSeason = 1;
      let targetEpisodeNum = 1;
      let isCompleted = false;

      if (showWatched.length >= totalEpisodesCount && totalEpisodesCount > 0) {
        isCompleted = true;
      } else {
        for (const s of validSeasons) {
          const count = s.episode_count || 0;
          if (showWatched.length < cumulative + count) {
            targetSeason = s.season_number;
            targetEpisodeNum = showWatched.length - cumulative + 1;
            break;
          }
          cumulative += count;
        }
      }

      // سریال‌های تمام‌شده‌ای که کاربر همه قسمت‌هایشان را دیده حذف می‌شوند
      if (!isCompleted) {
        const seasonEps = seasonEpisodesMap[`${show.id}_${targetSeason}`] || [];
        const epData = seasonEps.find((e: any) => e.episode_number === targetEpisodeNum);

        let finalEpId = epData?.id;
        let epTitle = epData?.name || `قسمت ${targetEpisodeNum}`;
        let epAirDate = epData?.air_date;

        if (!finalEpId) {
          if (show.next_episode_to_air && show.next_episode_to_air.season_number === targetSeason && show.next_episode_to_air.episode_number === targetEpisodeNum) {
            finalEpId = show.next_episode_to_air.id;
            epTitle = show.next_episode_to_air.name || epTitle;
            epAirDate = show.next_episode_to_air.air_date;
          } else if (show.last_episode_to_air && show.last_episode_to_air.season_number === targetSeason && show.last_episode_to_air.episode_number === targetEpisodeNum) {
            finalEpId = show.last_episode_to_air.id;
            epTitle = show.last_episode_to_air.name || epTitle;
            epAirDate = show.last_episode_to_air.air_date;
          }
        }

        const targetSeasonInfo = validSeasons.find((s: any) => s.season_number === targetSeason);
        const seasonAlreadyAired = targetSeasonInfo?.air_date ? new Date(targetSeasonInfo.air_date) <= now : false;

        let isReleased = false;
        let countdownBadge = "پخش‌نشده";

        if (epAirDate) {
          const airDateObj = new Date(epAirDate);
          airDateObj.setHours(0, 0, 0, 0);
          const diffDays = Math.round((airDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays <= 0) {
            isReleased = true;
          } else if (diffDays === 1) {
            countdownBadge = "پخش: فردا";
          } else if (diffDays <= 7) {
            countdownBadge = `پخش: ${diffDays} روز دیگر`;
          } else {
            countdownBadge = `پخش: ${diffDays} روز دیگر`;
          }
        } else if (seasonAlreadyAired) {
          isReleased = true;
        }

        list.push({
          show,
          seasonNumber: targetSeason,
          episodeNumber: targetEpisodeNum,
          episodeId: finalEpId,
          episodeTitle: epTitle,
          isReleased,
          countdownBadge,
          watchedCount: showWatched.length,
          totalEpisodes: totalEpisodesCount || show.number_of_episodes || 0,
        });
      }
    });

    // سورت: قسمت‌های آماده تماشا در صدر، موارد منتظر پخش در انتها
    list.sort((a, b) => {
      if (a.isReleased && !b.isReleased) return -1;
      if (!a.isReleased && b.isReleased) return 1;
      return 0;
    });

    return list;
  }, [trackedShows, watchedRecords, seasonEpisodesMap]);

  // ۳. تقویم پخش با تب‌بندی سه‌گانه: امروز، این هفته، به‌زودی
  const calendarData = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const sourceShows = calendarScope === 'mine' ? trackedShows : globalAiringShows;
    const episodesList: any[] = [];
    const addedKeys = new Set<string>();

    sourceShows.forEach(show => {
      if (!show) return;

      // سریال‌های تمام‌شده یا کنسل‌شده نباید در تقویم زنده بیایند
      if (show.status === 'Ended' || show.status === 'Canceled') {
        return;
      }

      // ۱. اگر فصل‌های سریال لود شده‌اند، اپیزودهای آینده‌اش خوانده می‌شوند
      const validSeasons = (show.seasons || []).filter((s: any) => s && s.season_number > 0);
      validSeasons.forEach((season: any) => {
        const seasonEps = seasonEpisodesMap[`${show.id}_${season.season_number}`] || [];
        seasonEps.forEach((ep: any) => {
          if (!ep || !ep.air_date) return;
          const key = `${show.id}_${ep.id}`;
          if (addedKeys.has(key)) return;

          const airDate = new Date(ep.air_date);
          airDate.setHours(0, 0, 0, 0);
          const diffDays = Math.round((airDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          // فقط از امروز تا ۳۶۵ روز آینده
          if (diffDays >= 0 && diffDays <= 365) {
            addedKeys.add(key);
            episodesList.push({
              show,
              episode: ep,
              airDate,
              diffDays
            });
          }
        });
      });

      // ۲. اضافه کردن هوشمند next_episode_to_air در صورت جا ماندن
      if (show.next_episode_to_air && show.next_episode_to_air.air_date) {
        const ep = show.next_episode_to_air;
        const key = `${show.id}_${ep.id}`;
        if (!addedKeys.has(key)) {
          const airDate = new Date(ep.air_date);
          airDate.setHours(0, 0, 0, 0);
          const diffDays = Math.round((airDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays >= 0 && diffDays <= 365) {
            addedKeys.add(key);
            episodesList.push({ show, episode: ep, airDate, diffDays });
          }
        }
      }
    });

    // سورت زمانی از امروز به آینده
    episodesList.sort((a, b) => a.airDate.getTime() - b.airDate.getTime());

    // تقسیم به ۳ تب استاندارد
    const todayList = episodesList.filter(e => e.diffDays === 0);
    const thisWeekList = episodesList.filter(e => e.diffDays >= 1 && e.diffDays <= 7);
    const upcomingList = episodesList.filter(e => e.diffDays > 7);

    return {
      todayList,
      thisWeekList,
      upcomingList,
      totalTodayCount: todayList.length
    };
  }, [trackedShows, globalAiringShows, calendarScope, seasonEpisodesMap]);

  // سریال‌های پیشنهادی ترند برای کاربر جدید (Cold Start Fallback)
  const coldStartTrendingShows = useMemo(() => {
    const trackedIds = new Set(trackedShows.map(s => Number(s.id)));
    return (globalAiringShows || [])
      .filter(s => !trackedIds.has(Number(s.id)))
      .slice(0, 5);
  }, [globalAiringShows, trackedShows]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col justify-center items-center gap-3 text-[#ccff00]">
        <Loader2 className="animate-spin" size={42} />
        <span className="text-sm font-bold text-gray-400">در حال لود مرکز تماشای Binger...</span>
      </div>
    );
  }

  // انتخاب لیست نمایشی تقویم بر اساس تب فعال
  const currentCalendarDisplay = 
    calendarTab === 'today' ? calendarData.todayList :
    calendarTab === 'this_week' ? calendarData.thisWeekList :
    calendarData.upcomingList;

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] pb-32">
      
      {/* مودال مشاهده جزئیات اپیزود */}
      {selectedEpData && (
        <EpisodeModal 
          showId={selectedEpData.showId}
          seasonNum={selectedEpData.season}
          episodeNum={selectedEpData.number}
          onClose={() => setSelectedEpData(null)}
          onWatchedChange={() => loadInitialData()}
        />
      )}

      {/* ========================================================================= */}
      {/* بخش اول: هدر مینیمال هویت (Compact Identity Header) */}
      {/* ========================================================================= */}
      <header className="sticky top-20 md:top-24 z-40 bg-[#050505]/95 backdrop-blur-md border-b border-white/10 px-4 md:px-8 py-3.5 shadow-2xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          
          {/* هویت کاربر و تگ تخصص */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-lg sm:text-xl shadow-inner shrink-0">
              {userProfile?.avatar_url || '😎'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs sm:text-sm md:text-base font-black text-white truncate flex items-center gap-1.5">
                {userProfile?.username || currentUser?.user_metadata?.full_name || 'کاربر بینجر'}
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-[#ccff00] flex items-center gap-1 truncate">
                <Award size={12} className="shrink-0" />
                <span className="truncate">{userSpecialty}</span>
              </span>
            </div>
          </div>

          {/* نوتیفیکیشن عددی قسمت‌های امروز */}
          <div className="flex items-center gap-2 shrink-0">
            <div className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-black flex items-center gap-1.5 shadow-md ${
              calendarData.totalTodayCount > 0
                ? 'bg-[#ccff00]/15 border-[#ccff00]/40 text-[#ccff00]'
                : 'bg-white/5 border-white/10 text-gray-400'
            }`}>
              <Bell size={13} className={`shrink-0 ${calendarData.totalTodayCount > 0 ? 'text-[#ccff00] animate-pulse' : 'text-gray-500'}`} />
              <span className="hidden sm:inline">
                {calendarData.totalTodayCount > 0 
                  ? `${calendarData.totalTodayCount} قسمت جدید امروز داری`
                  : 'امروز قسمت جدیدی نداری'}
              </span>
              <span className="sm:hidden font-mono">
                {calendarData.totalTodayCount > 0 
                  ? `${calendarData.totalTodayCount} جدید`
                  : '۰ جدید'}
              </span>
            </div>
          </div>

        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-8 mt-6 space-y-12">

        {/* ========================================================================= */}
        {/* مدیریت حالت کاربر جدید (Cold Start Fallback) */}
        {/* ========================================================================= */}
        {trackedShows.length === 0 ? (
          <section className="bg-gradient-to-b from-[#141414] to-transparent border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-[#ccff00]/10 text-[#ccff00] flex items-center justify-center mb-1">
                <Tv size={28} />
              </div>
              <h2 className="text-lg md:text-xl font-black text-white">هنوز سریالی به لیستت اضافه نکردی!</h2>
              <p className="text-xs text-gray-400 max-w-md">
                برای اینکه نوبت تماشا و تقویم اختصاصی خودت رو داشته باشی، یکی از سریال‌های ترند این هفته رو دنبال کن:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {coldStartTrendingShows.map(show => (
                <div 
                  key={show.id}
                  className="bg-[#181818] border border-white/5 rounded-2xl p-3 flex items-center justify-between gap-3 hover:border-white/20 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative w-10 h-14 rounded-xl overflow-hidden shrink-0 bg-white/5">
                      <img 
                        src={getImageUrl(show.poster_path)} 
                        alt={show.name} 
                        className="w-full h-full object-cover" 
                      />
                      <ShowCardProgress showId={show.id} showPercentageBadge={false} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white truncate">{show.name}</span>
                      <span className="text-[10px] text-gray-400 mt-0.5 font-mono">⭐ {show.vote_average?.toFixed(1) || 'N/A'}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleFollowShow(show.id)}
                    className="bg-[#ccff00] hover:bg-[#b3e600] text-black text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1 shrink-0 transition-transform active:scale-95 cursor-pointer"
                  >
                    <Plus size={14} strokeWidth={3} />
                    <span>دنبال کردن</span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <>
            {/* ========================================================================= */}
            {/* بخش دوم: نوبت تماشا (Up Next Queue) */}
            {/* ========================================================================= */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h2 className="text-base md:text-lg font-black text-white flex items-center gap-2">
                  <PlayCircle size={20} className="text-[#ccff00]" />
                  <span>نوبت تماشا</span>
                  <span className="text-xs font-mono text-gray-500 font-bold">({upNextQueue.length} قسمت)</span>
                </h2>
                <span className="text-[11px] text-gray-400">اپیزودهای بعدی سریال‌های شما</span>
              </div>

              {upNextQueue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500 gap-2 bg-white/[0.02] rounded-3xl border border-white/5 border-dashed">
                  <CheckCircle2 size={38} className="text-emerald-500" />
                  <span className="text-xs font-bold text-gray-300">تمام قسمت‌های در دسترس را تماشا کرده‌اید!</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {upNextQueue.map((item) => {
                    const { show, seasonNumber, episodeNumber, episodeId, episodeTitle, isReleased, countdownBadge, watchedCount, totalEpisodes } = item;
                    const isCardLeaving = animatingCardId === show.id;

                    return (
                      <div
                        key={`queue-${show.id}`}
                        onClick={() => setSelectedEpData({
                          showId: show.id,
                          season: seasonNumber,
                          number: episodeNumber
                        })}
                        className={`group flex items-center justify-between p-3 rounded-2xl bg-[#121212] hover:bg-[#181818] border border-white/5 hover:border-[#ccff00]/40 transition-all duration-300 cursor-pointer shadow-lg ${
                          isCardLeaving ? '-translate-x-full opacity-0 scale-90 pointer-events-none' : 'translate-x-0 opacity-100 scale-100'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-13 h-19 rounded-xl overflow-hidden shrink-0 bg-white/5 border border-white/10 shadow-md">
                            <img 
                              src={getImageUrl(show.poster_path)} 
                              alt={show.name} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                            />
                          </div>

                          <div className="flex flex-col min-w-0">
                            <span className="text-sm md:text-base font-black text-white truncate group-hover:text-[#ccff00] transition-colors">
                              {show.name}
                            </span>

                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-mono font-bold text-[#ccff00] ltr">
                                S{String(seasonNumber).padStart(2, '0')}E{String(episodeNumber).padStart(2, '0')}
                              </span>
                              <span className="text-gray-600 text-xs">•</span>
                              <span className="text-[11px] text-gray-400 font-mono">
                                {watchedCount}/{totalEpisodes} دیده شده
                              </span>
                            </div>

                            <span className="text-xs text-gray-300 font-medium truncate mt-1">
                              {episodeTitle}
                            </span>
                          </div>
                        </div>

                        {/* دکمه ثبت آنی تماشا یا برچسب زمان پخش */}
                        {!isReleased ? (
                          <div 
                            className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold flex items-center gap-1.5 shrink-0 ml-1 select-none"
                            title="این قسمت هنوز پخش نشده است"
                          >
                            <Clock size={13} />
                            <span>{countdownBadge}</span>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => handleToggleWatched(e, show.id, episodeId, false)}
                            className="w-11 h-11 rounded-full flex items-center justify-center border border-white/20 text-gray-400 hover:bg-[#ccff00] hover:text-black hover:border-[#ccff00] transition-all cursor-pointer shrink-0 ml-1 shadow-md"
                            title="دیدم (ثبت آنی و رفتن به قسمت بعد)"
                          >
                            <Check size={18} strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ========================================================================= */}
            {/* بخش سوم: تقویم پخش اپیزودها (Release Calendar) */}
            {/* ========================================================================= */}
            <section className="space-y-4 pt-4">
              
              {/* هدر تقویم با فیلتر سریع (سریال‌های من / ترند جهان) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <CalIcon size={20} className="text-[#ccff00]" />
                  <h2 className="text-base md:text-lg font-black text-white">تقویم پخش اپیزودها</h2>
                </div>

                {/* دکمه سوییچ بین سریال‌های من و ترندهای جهان */}
                <div className="flex items-center p-1 rounded-xl bg-white/5 border border-white/10 self-start sm:self-auto">
                  <button
                    onClick={() => setCalendarScope('mine')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      calendarScope === 'mine' 
                        ? 'bg-[#ccff00] text-black shadow-md' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    فقط سریال‌های من
                  </button>
                  <button
                    onClick={() => setCalendarScope('global')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      calendarScope === 'global' 
                        ? 'bg-[#ccff00] text-black shadow-md' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <TrendingUp size={13} />
                    <span>سریال‌های ترند جهان</span>
                  </button>
                </div>
              </div>

              {/* تب‌بندی سه‌گانه زمانی: امروز / این هفته / به‌زودی */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <button
                  onClick={() => setCalendarTab('today')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    calendarTab === 'today'
                      ? 'bg-white text-black font-black'
                      : 'bg-[#141414] text-gray-400 hover:bg-[#1a1a1a] hover:text-white border border-white/5'
                  }`}
                >
                  <Flame size={14} className={calendarTab === 'today' ? 'text-amber-500' : 'text-[#ccff00]'} />
                  <span>امروز ({calendarData.todayList.length})</span>
                </button>

                <button
                  onClick={() => setCalendarTab('this_week')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    calendarTab === 'this_week'
                      ? 'bg-white text-black font-black'
                      : 'bg-[#141414] text-gray-400 hover:bg-[#1a1a1a] hover:text-white border border-white/5'
                  }`}
                >
                  <Clock size={14} />
                  <span>این هفته ({calendarData.thisWeekList.length})</span>
                </button>

                <button
                  onClick={() => setCalendarTab('upcoming')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    calendarTab === 'upcoming'
                      ? 'bg-white text-black font-black'
                      : 'bg-[#141414] text-gray-400 hover:bg-[#1a1a1a] hover:text-white border border-white/5'
                  }`}
                >
                  <Sparkles size={14} />
                  <span>به‌زودی ({calendarData.upcomingList.length})</span>
                </button>
              </div>

              {/* لیست کارت‌های تقویم */}
              {currentCalendarDisplay.length === 0 ? (
                <div className="py-14 flex flex-col items-center justify-center text-center text-gray-500 gap-2 bg-white/[0.02] rounded-3xl border border-white/5 border-dashed">
                  <AlertCircle size={36} strokeWidth={1.5} />
                  <span className="text-xs font-medium">قسمتی در این بازه زمانی برای نمایش وجود ندارد.</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {currentCalendarDisplay.map((entry) => {
                    const { show, episode, diffDays, airDate } = entry;
                    const isWatched = watchedRecords.some(w => Number(w.episode_id) === Number(episode.id));
                    const isAired = diffDays <= 0;

                    // عنوان تاریخ و روز
                    let badgeLabel = "";
                    if (diffDays === 0) badgeLabel = "امروز! 🔥";
                    else if (diffDays === 1) badgeLabel = "فردا";
                    else if (diffDays <= 7) {
                      const dayName = airDate.toLocaleDateString('fa-IR', { weekday: 'long' });
                      badgeLabel = `${dayName} (${diffDays} روز دیگر)`;
                    } else {
                      badgeLabel = `${diffDays} روز دیگر`;
                    }

                    return (
                      <div
                        key={`cal-${show.id}-${episode.id}`}
                        onClick={() => setSelectedEpData({
                          showId: show.id,
                          season: episode.season_number,
                          number: episode.episode_number
                        })}
                        className={`group flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                          isWatched
                            ? 'bg-[#0a0a0a] border-white/5 opacity-50 hover:opacity-80'
                            : isAired
                            ? 'bg-[#161616] border-white/10 hover:border-[#ccff00]/40 shadow-md'
                            : 'bg-[#121212] border-white/5 hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-12 h-16 rounded-xl overflow-hidden shrink-0 bg-white/5 border border-white/10">
                            <img 
                              src={getImageUrl(show.poster_path)} 
                              alt={show.name} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                            />
                          </div>

                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-black truncate ${
                                isWatched ? 'text-gray-400' : 'text-white group-hover:text-[#ccff00]'
                              }`}>
                                {show.name}
                              </span>
                              {isWatched && (
                                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded">دیده شده</span>
                              )}
                            </div>

                            <span className="text-xs font-mono text-gray-400 mt-0.5 ltr text-right">
                              S{String(episode.season_number).padStart(2, '0')}E{String(episode.episode_number).padStart(2, '0')}
                            </span>
                            <span className="text-xs text-gray-300 truncate mt-0.5 font-medium">
                              {episode.name || `قسمت ${episode.episode_number}`}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                            diffDays === 0 
                              ? 'bg-[#ccff00] text-black font-black' 
                              : 'bg-white/10 text-white'
                          }`}>
                            {badgeLabel}
                          </span>

                          {/* دکمه تیک فقط برای پخش‌شده‌ها یا امروز */}
                          {isAired && (
                            <button
                              onClick={(e) => handleToggleWatched(e, show.id, episode.id, isWatched)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                                isWatched 
                                  ? 'bg-emerald-500 border-emerald-500 text-black' 
                                  : 'border-white/20 text-gray-500 hover:border-[#ccff00] hover:text-[#ccff00]'
                              }`}
                              title={isWatched ? "دیده‌شده" : "ثبت دیدن"}
                            >
                              <Check size={14} strokeWidth={3} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

      </main>

    </div>
  );
}