"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import {
  getShowDetails,
  getSeasonDetails,
  getImageUrl,
  getGlobalAiringShows,
  getBackdropUrl,
  getReleasedEpisodeCount
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
import { VipUsername } from './components/VipBadge';
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

  // هایلایت موقت اپیزودهای امروز هنگام کلیک روی زنگوله
  const [highlightToday, setHighlightToday] = useState(false);

  // هدایت مستقیم و اسکرول به اپیزود امروز
  const handleScrollToTodayEpisodes = () => {
    if (calendarData.totalTodayCount === 0) return;
    setCalendarTab('today');

    setTimeout(() => {
      const element = document.getElementById('release-calendar');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setHighlightToday(true);
        setTimeout(() => setHighlightToday(false), 2500);
      }
    }, 60);
  };
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
              } catch { }
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
        } catch { }
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

      const totalEpisodesCount = getReleasedEpisodeCount(show);

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
          watchedCount: Math.min(showWatched.length, totalEpisodesCount),
          totalEpisodes: totalEpisodesCount || 0,
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
      <div className="min-h-screen bg-[#050505] flex flex-col justify-center items-center gap-4 text-[#ccff00] relative overflow-hidden">
        <div className="absolute top-1/3 w-80 h-80 bg-[#ccff00]/10 blur-[140px] rounded-full pointer-events-none" />
        <div className="relative flex flex-col items-center gap-3 z-10">
          <Loader2 className="animate-spin text-[#ccff00]" size={40} />
          <span className="text-xs font-bold text-gray-400 tracking-wide">در حال آماده‌سازی مرکز تماشای Binger...</span>
        </div>
      </div>
    );
  }

  // انتخاب لیست نمایشی تقویم بر اساس تب فعال
  const currentCalendarDisplay =
    calendarTab === 'today' ? calendarData.todayList :
      calendarTab === 'this_week' ? calendarData.thisWeekList :
        calendarData.upcomingList;

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] pb-32 relative selection:bg-[#ccff00] selection:text-black">

      {/* --- AMBIENT NEON GLOWS (ایجاد عمق نوری ملایم بدون هیچ شلوغی) --- */}
      <div className="fixed top-12 right-1/4 w-[480px] h-[480px] bg-[#ccff00]/[0.035] blur-[160px] rounded-full pointer-events-none -z-10" />
      <div className="fixed top-2/3 left-10 w-[420px] h-[420px] bg-purple-600/[0.04] blur-[170px] rounded-full pointer-events-none -z-10" />

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
      {/* بخش اول: هدر مدرن شیشه‌ای هویت و وضعیت (Compact Identity Bar) */}
      {/* ========================================================================= */}
      <header className="sticky top-20 md:top-24 z-40 bg-[#050505]/85 backdrop-blur-xl border-b border-white/10 px-4 md:px-8 py-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">

          {/* هویت کاربر و تگ تخصص */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative group">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/[0.06] border border-white/15 flex items-center justify-center text-lg sm:text-xl shadow-inner shrink-0 group-hover:border-[#ccff00]/40 transition-colors">
                {userProfile?.avatar_url || '😎'}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#050505]" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <VipUsername
                  username={userProfile?.username || currentUser?.user_metadata?.full_name || 'کاربر بینجر'}
                  isVip={userProfile?.is_vip === true || userProfile?.role === 'admin'}
                  badgeSize={15}
                  className="text-xs sm:text-sm md:text-base font-black truncate"
                />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-[#ccff00] flex items-center gap-1 truncate mt-0.5">
                <Award size={12} className="shrink-0" />
                <span className="truncate">{userSpecialty}</span>
              </span>
            </div>
          </div>

          {/* نوتیفیکیشن عددی قسمت‌های امروز (کلیک‌پذیر برای هدایت مستقیم به اپیزود امروز) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleScrollToTodayEpisodes}
              disabled={calendarData.totalTodayCount === 0}
              className={`px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-black flex items-center gap-2 shadow-sm transition-all select-none text-right ${
                calendarData.totalTodayCount > 0
                  ? 'bg-[#ccff00]/10 border-[#ccff00]/30 text-[#ccff00] hover:bg-[#ccff00]/25 hover:border-[#ccff00]/60 shadow-[0_0_15px_rgba(204,255,0,0.15)] cursor-pointer active:scale-95'
                  : 'bg-white/[0.04] border-white/10 text-gray-400 cursor-default'
              }`}
              title={calendarData.totalTodayCount > 0 ? "کلیک کنید تا اپیزود امروز را ببینید" : undefined}
            >
              {calendarData.totalTodayCount > 0 ? (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ccff00] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ccff00]"></span>
                </span>
              ) : (
                <Bell size={13} className="shrink-0 text-gray-500" />
              )}
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
            </button>
          </div>

        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-8 mt-6 space-y-10">

        {/* ========================================================================= */}
        {/* نوار خلاصه آمار تماشا (Quick Stats Strip - بسیار شیک و خلوت) */}
        {/* ========================================================================= */}
        {trackedShows.length > 0 && (
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            <div className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-2xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 transition-all">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                <Tv size={16} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] sm:text-xs text-gray-400 truncate">سریال‌های من</span>
                <span className="text-xs sm:text-sm font-black font-mono text-white mt-0.5">
                  {trackedShows.length} <span className="text-[10px] font-sans text-gray-500 font-normal">عنوان</span>
                </span>
              </div>
            </div>

            <div className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-2xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 transition-all">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={16} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] sm:text-xs text-gray-400 truncate">اپیزودهای دیده</span>
                <span className="text-xs sm:text-sm font-black font-mono text-white mt-0.5">
                  {watchedRecords.length} <span className="text-[10px] font-sans text-gray-500 font-normal">قسمت</span>
                </span>
              </div>
            </div>

            <div className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-2xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 transition-all">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#ccff00]/10 border border-[#ccff00]/20 text-[#ccff00] flex items-center justify-center shrink-0">
                <Flame size={16} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] sm:text-xs text-gray-400 truncate">نوبت تماشا</span>
                <span className="text-xs sm:text-sm font-black font-mono text-[#ccff00] mt-0.5">
                  {upNextQueue.length} <span className="text-[10px] font-sans text-gray-500 font-normal">آماده</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* مدیریت حالت کاربر جدید (Cold Start Fallback) */}
        {/* ========================================================================= */}
        {trackedShows.length === 0 ? (
          <section className="bg-gradient-to-b from-white/[0.06] via-white/[0.02] to-transparent border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-[#ccff00]/10 border border-[#ccff00]/20 text-[#ccff00] flex items-center justify-center mb-1 shadow-[0_0_20px_rgba(204,255,0,0.15)]">
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
                  className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-3 hover:border-white/20 transition-all shadow-md"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative w-11 h-15 rounded-xl overflow-hidden shrink-0 bg-white/5 border border-white/10">
                      <img
                        src={getImageUrl(show.poster_path)}
                        alt={show.name}
                        className="w-full h-full object-cover"
                      />
                      <ShowCardProgress showId={show.id} showPercentageBadge={false} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white truncate">{show.name}</span>
                      <span className="text-[10px] text-amber-400 mt-0.5 font-mono">⭐ {show.vote_average?.toFixed(1) || 'N/A'}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleFollowShow(show.id)}
                    className="bg-[#ccff00] hover:bg-[#b3e600] text-black text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1 shrink-0 transition-transform active:scale-95 cursor-pointer shadow-sm"
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
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#ccff00]/10 border border-[#ccff00]/20 text-[#ccff00] flex items-center justify-center">
                    <PlayCircle size={18} />
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>نوبت تماشا</span>
                    {upNextQueue.length > 0 && (
                      <span className="text-xs font-mono text-[#ccff00] bg-[#ccff00]/10 border border-[#ccff00]/25 px-2 py-0.5 rounded-full font-black">
                        {upNextQueue.length}
                      </span>
                    )}
                  </h2>
                </div>
                <span className="text-[11px] sm:text-xs text-gray-400">اپیزودهای بعدی سریال‌های شما</span>
              </div>

              {upNextQueue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3 bg-gradient-to-b from-white/[0.04] to-transparent rounded-3xl border border-white/10 shadow-lg">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
                    <CheckCircle2 size={32} />
                  </div>
                  <span className="text-sm font-black text-white">تمام قسمت‌های در دسترس را تماشا کرده‌اید!</span>
                  <p className="text-xs text-gray-400 max-w-sm">
                    هیچ اپیزود ندیده‌ای باقی نمانده است. می‌توانید در بخش اکسپلور سریال‌های جدیدی پیدا کنید.
                  </p>
                  <button
                    onClick={() => router.push('/dashboard/explore')}
                    className="mt-1 text-xs font-black text-black bg-[#ccff00] hover:bg-[#b3e600] px-4 py-2 rounded-xl transition-all active:scale-95 cursor-pointer shadow-md"
                  >
                    کشف سریال‌های جدید
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {upNextQueue.map((item) => {
                    const { show, seasonNumber, episodeNumber, episodeId, episodeTitle, isReleased, countdownBadge, watchedCount, totalEpisodes } = item;
                    const isCardLeaving = animatingCardId === show.id;
                    const progressPercent = totalEpisodes > 0 ? Math.min(100, Math.round((watchedCount / totalEpisodes) * 100)) : 0;

                    return (
                      <div
                        key={`queue-${show.id}`}
                        onClick={() => setSelectedEpData({
                          showId: show.id,
                          season: seasonNumber,
                          number: episodeNumber
                        })}
                        className={`group relative flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-[#ccff00]/40 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-[0_8px_30px_rgba(0,0,0,0.6)] ${
                          isCardLeaving ? '-translate-x-full opacity-0 scale-90 pointer-events-none' : 'translate-x-0 opacity-100 scale-100'
                        }`}
                      >
                        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                          <div className="w-13 h-19 sm:w-15 sm:h-21 rounded-xl overflow-hidden shrink-0 bg-white/5 border border-white/10 shadow-md relative group-hover:border-white/20 transition-all">
                            <img
                              src={getImageUrl(show.poster_path)}
                              alt={show.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>

                          <div className="flex flex-col min-w-0">
                            <span className="text-sm sm:text-base font-black text-white truncate group-hover:text-[#ccff00] transition-colors">
                              {show.name}
                            </span>

                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 rounded-lg bg-[#ccff00]/10 border border-[#ccff00]/25 text-[#ccff00] font-mono font-bold text-xs ltr">
                                S{String(seasonNumber).padStart(2, '0')}E{String(episodeNumber).padStart(2, '0')}
                              </span>
                              <span className="text-gray-600 text-xs">•</span>
                              <span className="text-[11px] text-gray-400 font-mono">
                                {watchedCount}/{totalEpisodes} قسمت
                              </span>
                            </div>

                            <span className="text-xs text-gray-300 font-medium truncate mt-1">
                              {episodeTitle}
                            </span>

                            {/* نوار باریک و ظریف پیشرفت سریال */}
                            <div className="w-24 sm:w-36 h-1 bg-white/10 rounded-full overflow-hidden mt-2">
                              <div
                                className="h-full bg-[#ccff00] rounded-full transition-all duration-500"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* دکمه ثبت آنی تماشا یا برچسب زمان پخش */}
                        {!isReleased ? (
                          <div
                            className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-bold flex items-center gap-1.5 shrink-0 ml-1 select-none"
                            title="این قسمت هنوز پخش نشده است"
                          >
                            <Clock size={13} />
                            <span>{countdownBadge}</span>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => handleToggleWatched(e, show.id, episodeId, false)}
                            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border border-white/15 bg-white/[0.04] text-gray-400 hover:bg-[#ccff00] hover:text-black hover:border-[#ccff00] hover:shadow-[0_0_20px_rgba(204,255,0,0.35)] transition-all cursor-pointer shrink-0 ml-1 shadow-md active:scale-90"
                            title="دیدم (ثبت آنی و رفتن به قسمت بعد)"
                          >
                            <Check size={20} strokeWidth={2.5} />
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
            <section
              id="release-calendar"
              className={`space-y-4 pt-2 scroll-mt-28 md:scroll-mt-36 transition-all duration-500 rounded-3xl ${
                highlightToday ? 'p-3 bg-[#ccff00]/[0.03] ring-2 ring-[#ccff00]/40 shadow-[0_0_30px_rgba(204,255,0,0.15)]' : ''
              }`}
            >

              {/* هدر تقویم با فیلتر سریع (سریال‌های من / ترند جهان) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                    <CalIcon size={18} />
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-white">تقویم پخش اپیزودها</h2>
                </div>

                {/* دکمه سوییچ بین سریال‌های من و ترندهای جهان */}
                <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/10 self-start sm:self-auto shadow-inner">
                  <button
                    onClick={() => setCalendarScope('mine')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      calendarScope === 'mine'
                        ? 'bg-[#ccff00] text-black font-black shadow-md'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    فقط سریال‌های من
                  </button>
                  <button
                    onClick={() => setCalendarScope('global')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      calendarScope === 'global'
                        ? 'bg-[#ccff00] text-black font-black shadow-md'
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
                  className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    calendarTab === 'today'
                      ? 'bg-[#ccff00] text-black font-black shadow-[0_0_20px_rgba(204,255,0,0.25)]'
                      : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-white border border-white/5'
                  }`}
                >
                  <Flame size={14} className={calendarTab === 'today' ? 'text-black' : 'text-amber-500'} />
                  <span>امروز</span>
                  <span className={`text-[11px] font-mono px-1.5 py-0.2 rounded-md ${calendarTab === 'today' ? 'bg-black/20 text-black font-black' : 'bg-white/10 text-gray-300'}`}>
                    {calendarData.todayList.length}
                  </span>
                </button>

                <button
                  onClick={() => setCalendarTab('this_week')}
                  className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    calendarTab === 'this_week'
                      ? 'bg-[#ccff00] text-black font-black shadow-[0_0_20px_rgba(204,255,0,0.25)]'
                      : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-white border border-white/5'
                  }`}
                >
                  <Clock size={14} className={calendarTab === 'this_week' ? 'text-black' : 'text-gray-400'} />
                  <span>این هفته</span>
                  <span className={`text-[11px] font-mono px-1.5 py-0.2 rounded-md ${calendarTab === 'this_week' ? 'bg-black/20 text-black font-black' : 'bg-white/10 text-gray-300'}`}>
                    {calendarData.thisWeekList.length}
                  </span>
                </button>

                <button
                  onClick={() => setCalendarTab('upcoming')}
                  className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    calendarTab === 'upcoming'
                      ? 'bg-[#ccff00] text-black font-black shadow-[0_0_20px_rgba(204,255,0,0.25)]'
                      : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-white border border-white/5'
                  }`}
                >
                  <Sparkles size={14} className={calendarTab === 'upcoming' ? 'text-black' : 'text-[#ccff00]'} />
                  <span>به‌زودی</span>
                  <span className={`text-[11px] font-mono px-1.5 py-0.2 rounded-md ${calendarTab === 'upcoming' ? 'bg-black/20 text-black' : 'bg-white/10 text-gray-300'}`}>
                    {calendarData.upcomingList.length}
                  </span>
                </button>
              </div>

              {/* لیست کارت‌های تقویم */}
              {currentCalendarDisplay.length === 0 ? (
                <div className="py-14 flex flex-col items-center justify-center text-center text-gray-400 gap-2.5 bg-white/[0.02] rounded-3xl border border-white/5 border-dashed">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500">
                    <AlertCircle size={26} strokeWidth={1.5} />
                  </div>
                  <span className="text-xs font-bold text-gray-300">قسمتی در این بازه زمانی برای نمایش وجود ندارد.</span>
                  <span className="text-[11px] text-gray-500">می‌توانید به تب «سریال‌های ترند جهان» سر بزنید.</span>
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
                          diffDays === 0 && highlightToday
                            ? 'bg-[#ccff00]/15 border-[#ccff00] ring-2 ring-[#ccff00] shadow-[0_0_25px_rgba(204,255,0,0.35)] scale-[1.01]'
                            : isWatched
                              ? 'bg-[#0a0a0a] border-white/5 opacity-50 hover:opacity-80'
                              : isAired
                                ? 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10 hover:border-[#ccff00]/40 shadow-md'
                                : 'bg-white/[0.02] border-white/5 hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                          <div className="w-12 h-16 sm:w-13 sm:h-18 rounded-xl overflow-hidden shrink-0 bg-white/5 border border-white/10 shadow-sm">
                            <img
                              src={getImageUrl(show.poster_path)}
                              alt={show.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>

                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-black truncate ${
                                isWatched ? 'text-gray-400' : 'text-white group-hover:text-[#ccff00] transition-colors'
                              }`}>
                                {show.name}
                              </span>
                              {isWatched && (
                                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                  دیده شده
                                </span>
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

                        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                            diffDays === 0
                              ? 'bg-[#ccff00] text-black font-black shadow-[0_0_15px_rgba(204,255,0,0.3)] animate-pulse'
                              : 'bg-white/10 text-white'
                          }`}>
                            {badgeLabel}
                          </span>

                          {/* دکمه تیک فقط برای پخش‌شده‌ها یا امروز */}
                          {isAired && (
                            <button
                              onClick={(e) => handleToggleWatched(e, show.id, episode.id, isWatched)}
                              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                                isWatched
                                  ? 'bg-emerald-500 border-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                  : 'border-white/20 text-gray-400 hover:border-[#ccff00] hover:text-[#ccff00] hover:bg-[#ccff00]/10'
                              }`}
                              title={isWatched ? "دیده‌شده" : "ثبت دیدن"}
                            >
                              <Check size={16} strokeWidth={2.5} />
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