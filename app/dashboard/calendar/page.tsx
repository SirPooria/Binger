"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { getShowDetails, getSeasonDetails, getImageUrl } from '@/lib/tmdbClient';
import { useRouter } from 'next/navigation';
import { 
  Loader2, 
  Calendar as CalIcon, 
  ArrowRight, 
  Clock, 
  CheckCircle, 
  Check, 
  Filter, 
  PlayCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Flame
} from 'lucide-react';
import EpisodeModal from '../components/EpisodeModal';

export default function TrackerMainPage() {
  const router = useRouter();
  const supabase = createClient() as any;

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // حالت فعال: تقویم پخش یا ادامه تماشا
  const [isCalendarMode, setIsCalendarMode] = useState<boolean>(false);

  // فیلتر در حالت تقویم: همه سریال‌های من / فقط سریال‌هایی که تماشا کردم
  const [calendarFilter, setCalendarFilter] = useState<'all_my' | 'watched_only'>('all_my');

  // باز یا بسته بودن بخش روزهای گذشته در تقویم
  const [showPastDays, setShowPastDays] = useState<boolean>(false);

  // منوی بازشوی فیلتر
  const [showFilterDropdown, setShowFilterDropdown] = useState<boolean>(false);

  // دیتای سریال‌ها و رکوردهای تماشا شده از دیتابیس
  const [trackedShows, setTrackedShows] = useState<any[]>([]);
  const [watchedRecords, setWatchedRecords] = useState<any[]>([]);

  // کش برای جزئیات قسمت‌های فصل‌های جاری جهت دریافت episode_id
  const [seasonEpisodesMap, setSeasonEpisodesMap] = useState<Record<string, any[]>>({});

  // کارت در حال انیمیشن خروج (برای افکت روان رفتن به قسمت بعد)
  const [animatingCardId, setAnimatingCardId] = useState<number | null>(null);

  // مودال جزئیات قسمت
  const [selectedEpData, setSelectedEpData] = useState<any>(null);

  // ۱. واکشی اطلاعات واقعی کاربر از دیتابیس
  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }
      setCurrentUser(user);

      // خواندن واچ‌لیست
      const { data: watchlistData } = await supabase
        .from('watchlist')
        .select('show_id')
        .eq('user_id', user.id);

      // خواندن دقیق رکوردهای جدول watched با ستون‌های واقعی (show_id و episode_id)
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

      // دریافت مشخصات سریال‌ها از TMDB
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

      // واکشی فصل‌های جاری و پیش‌رو برای دسترسی به همه قسمت‌های آینده
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

          // دانلود تمام فصل‌هایی که قسمت پیش‌رو یا جاری دارند
          const seasonsToFetch = new Set<number>();
          seasonsToFetch.add(targetSeason);
          if (show.next_episode_to_air?.season_number) {
            seasonsToFetch.add(show.next_episode_to_air.season_number);
          }
          if (show.last_episode_to_air?.season_number) {
            seasonsToFetch.add(show.last_episode_to_air.season_number);
          }

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
      console.error("Error loading tracker data:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  // هر وقت قسمتی تیک خورد، اگر فصل بعدی دانلود نشده بود، خودکار دانلودش کن
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

  // ثبت و حذف تماشا مستقیماً در دیتابیس Supabase با episode_id
  const handleToggleWatched = async (
    e: React.MouseEvent,
    showId: number,
    episodeId: number,
    isAlreadyWatched: boolean
  ) => {
    e.stopPropagation();
    if (!currentUser || !episodeId) return;

    if (isAlreadyWatched) {
      // حذف از جدول watched
      const { error } = await supabase
        .from('watched')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('show_id', Number(showId))
        .eq('episode_id', Number(episodeId));

      if (error) {
        console.error("خطا در حذف از دیتابیس:", error);
      } else {
        setWatchedRecords(prev => prev.filter(w => Number(w.episode_id) !== Number(episodeId)));
      }
    } else {
      // انیمیشن نرم خروج کارت
      setAnimatingCardId(showId);

      setTimeout(async () => {
        // ثبت ۱۰۰٪ واقعی در جدول watched با ساختار اختصاصی پروژه Binger
        const { error } = await supabase
          .from('watched')
          .upsert([{
            user_id: currentUser.id,
            show_id: Number(showId),
            episode_id: Number(episodeId)
          }], { onConflict: 'user_id, episode_id' });

        if (error) {
          console.error("خطا در ثبت در دیتابیس:", error);
        } else {
          setWatchedRecords(prev => [...prev, { show_id: Number(showId), episode_id: Number(episodeId) }]);
        }
        setAnimatingCardId(null);
      }, 300);
    }
  };

// محاسبه دقیق قسمت بعدی آماده تماشا و فرستادن پخش‌نشده‌ها به انتهای لیست
  const watchNextList = useMemo(() => {
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

      if (!isCompleted) {
        const seasonEps = seasonEpisodesMap[`${show.id}_${targetSeason}`] || [];
        const epData = seasonEps.find((e: any) => e.episode_number === targetEpisodeNum);

        let finalEpId = epData?.id;
        let epTitle = epData?.name || `قسمت ${targetEpisodeNum}`;
        let epRuntime = epData?.runtime || show.episode_run_time?.[0] || 45;
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

        // بررسی اینکه آیا این فصل قبلاً پخش شده است یا نه
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
            countdownBadge = `پخش: ${airDateObj.toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' })}`;
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
          runtime: epRuntime,
          isReleased,
          airDate: epAirDate,
          countdownBadge,
          watchedCount: showWatched.length,
          totalEpisodes: totalEpisodesCount || show.number_of_episodes || 0,
        });
      }
    });

    // مرتب‌سازی: سریال‌های آماده تماشا اول بیایند، و سریال‌های پخش‌نشده بروند پایین لیست
    list.sort((a, b) => {
      if (a.isReleased && !b.isReleased) return -1;
      if (!a.isReleased && b.isReleased) return 1;
      return 0;
    });

    return list;
  }, [trackedShows, watchedRecords, seasonEpisodesMap]);

// ریفرنس برای اسکرول به امروز یا اولین تاریخ آینده
  const firstUpcomingRef = useRef<HTMLDivElement>(null);

  // دسته‌بندی تقویم: نمایش تمام قسمت‌های آینده + اسکرول هوشمند به تاریخ حال
  const { groups: calendarGroups, firstUpcomingKey } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const allEpisodes: any[] = [];
    const addedKeys = new Set<string>();

    trackedShows.forEach(show => {
      if (!show) return;

      if (calendarFilter === 'watched_only' && !show.hasWatched) {
        return;
      }

      // خواندن تمام قسمت‌های فصل‌های لود شده (برای نمایش قسمت ۴، ۵، ۶ و بعدی‌ها)
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

          // فقط تا ۳۶۵ روز آینده و تاریخ‌های گذشته
          if (diffDays <= 365) {
            addedKeys.add(key);
            allEpisodes.push({
              show,
              episode: ep,
              airDate,
              diffDays
            });
          }
        });
      });

      // اگر قسمتی در next_episode_to_air بود و هنوز در لیست نیامده
      if (show.next_episode_to_air && show.next_episode_to_air.air_date) {
        const ep = show.next_episode_to_air;
        const key = `${show.id}_${ep.id}`;
        if (!addedKeys.has(key)) {
          const airDate = new Date(ep.air_date);
          airDate.setHours(0, 0, 0, 0);
          const diffDays = Math.round((airDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays <= 365) {
            addedKeys.add(key);
            allEpisodes.push({ show, episode: ep, airDate, diffDays });
          }
        }
      }
    });

    // مرتب‌سازی از گذشته تا دورترین آینده
    allEpisodes.sort((a, b) => a.airDate.getTime() - b.airDate.getTime());

    const groups: { [key: string]: any[] } = {};
    let firstUpcoming: string | null = null;

    allEpisodes.forEach(item => {
      const { diffDays, airDate } = item;
      let label = "";
      let badge = "";

      if (diffDays < 0) {
        const absDays = Math.abs(diffDays);
        if (absDays === 1) {
          label = "دیروز (Yesterday)";
        } else if (absDays === 2) {
          label = "۲ روز قبل";
        } else if (absDays === 3) {
          label = "۳ روز قبل";
        } else if (absDays <= 7) {
          label = "هفته گذشته";
        } else {
          label = airDate.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
        }
        badge = `${absDays} روز قبل`;
      } else if (diffDays === 0) {
        label = "امروز (Today)";
        badge = "امروز! 🔥";
      } else if (diffDays === 1) {
        label = "فردا (Tomorrow)";
        badge = "۱ روز دیگر";
      } else if (diffDays <= 7) {
        const dayName = airDate.toLocaleDateString('fa-IR', { weekday: 'long' });
        label = dayName;
        badge = `${diffDays} روز دیگر`;
      } else {
        label = "در آینده (In the future)";
        badge = `${diffDays} روز دیگر`;
      }

      if (!groups[label]) groups[label] = [];
      groups[label].push({ ...item, badge });

      // مشخص کردن اولین گروهِ زمان حال یا آینده برای اسکرول اولیه
      if (diffDays >= 0 && !firstUpcoming) {
        firstUpcoming = label;
      }
    });

    return { groups, firstUpcomingKey: firstUpcoming };
  }, [trackedShows, calendarFilter, seasonEpisodesMap]);

  // اسکرول هوشمند به امروز، یا اگر امروز چیزی نبود به اولین پخش آینده (مثلاً فردا)
  useEffect(() => {
    if (isCalendarMode && firstUpcomingRef.current) {
      setTimeout(() => {
        firstUpcomingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }, [isCalendarMode, firstUpcomingKey]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col justify-center items-center gap-3 text-[#ccff00]">
        <Loader2 className="animate-spin" size={42} />
        <span className="text-sm font-medium text-gray-400">در حال چیدمان سریال‌های شما...</span>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] pb-28">
      
      {/* مودال اصلی جزئیات قسمت */}
      {selectedEpData && (
        <EpisodeModal 
          showId={selectedEpData.showId}
          seasonNum={selectedEpData.season}
          episodeNum={selectedEpData.number}
          onClose={() => setSelectedEpData(null)}
          onWatchedChange={() => loadUserData()}
        />
      )}

      {/* هدر بالایی */}
      <header className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-md border-b border-white/5 px-4 md:px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()} 
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer text-gray-400 hover:text-white"
            >
              <ArrowRight size={18} />
            </button>

            {isCalendarMode ? (
              <div>
                <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                  <CalIcon size={22} className="text-[#ccff00]" />
                  تقویم پخش سریال‌ها
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">برنامه زمانی پخش تا ۳۶۵ روز آینده</p>
              </div>
            ) : (
              <div>
                <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                  <PlayCircle size={24} className="text-[#ccff00]" />
                  ادامه تماشا
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">قسمت‌های بعدی آماده برای دیدن</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 relative">
            
            {/* فیلتر اختصاصی در تقویم */}
            {isCalendarMode && (
              <>
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
                  title="فیلتر تقویم"
                >
                  <Filter size={18} />
                </button>

                {showFilterDropdown && (
                  <div className="absolute left-0 top-12 w-56 bg-[#141414] border border-white/15 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                    <span className="text-xs text-gray-400 px-3 py-1.5 font-bold block">نمایش تقویم:</span>
                    <button
                      onClick={() => { setCalendarFilter('all_my'); setShowFilterDropdown(false); }}
                      className={`w-full text-right px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        calendarFilter === 'all_my' ? 'bg-[#ccff00] text-black' : 'text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      همه سریال‌های من
                    </button>
                    <button
                      onClick={() => { setCalendarFilter('watched_only'); setShowFilterDropdown(false); }}
                      className={`w-full text-right px-3 py-2 rounded-xl text-xs font-bold transition-all mt-1 cursor-pointer ${
                        calendarFilter === 'watched_only' ? 'bg-[#ccff00] text-black' : 'text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      فقط سریال‌هایی که تماشا کردم
                    </button>
                  </div>
                )}
              </>
            )}

            {/* سوییچ تقویم */}
            <button
              onClick={() => setIsCalendarMode(!isCalendarMode)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                isCalendarMode 
                  ? 'bg-[#ccff00] text-black border-[#ccff00] shadow-[0_0_15px_rgba(204,255,0,0.3)]' 
                  : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
              title={isCalendarMode ? "بازگشت به ادامه تماشا" : "مشاهده تقویم پخش"}
            >
              <CalIcon size={18} />
            </button>

          </div>
        </div>
      </header>

      {/* بدنه محتوا */}
      <main className="max-w-4xl mx-auto px-4 md:px-8 mt-6">

        {/* ۱. تقویم پخش */}
        {/* ۱. تقویم پخش یکپارچه (گذشته در بالا، امروز در وسط با فوکوس خودکار، آینده در پایین) */}
        {isCalendarMode ? (
          <div className="space-y-8 animate-in fade-in duration-300">
            {Object.keys(calendarGroups).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500 gap-3 bg-white/5 rounded-3xl border border-white/5 border-dashed">
                <AlertCircle size={44} strokeWidth={1.5} />
                <p className="text-sm font-medium">هیچ قسمتی برای پخش در سریال‌های شما یافت نشد.</p>
              </div>
            ) : (
              Object.entries(calendarGroups).map(([groupTitle, items]) => {
                const isToday = groupTitle.includes("امروز");
                const isPast = groupTitle.includes("قبل") || groupTitle.includes("دیروز") || groupTitle.includes("هفته گذشته") || groupTitle.includes("۱۴") || groupTitle.includes("۱۳");
                const isTargetToScroll = groupTitle === firstUpcomingKey;

                return (
                  <div 
                    key={groupTitle} 
                    ref={isTargetToScroll ? firstUpcomingRef : null}
                    className={`space-y-3 scroll-mt-24 ${isToday ? 'bg-[#ccff00]/[0.03] p-4 rounded-3xl border border-[#ccff00]/20 shadow-[0_0_20px_rgba(204,255,0,0.05)]' : ''}`}
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <h2 className={`text-sm font-black flex items-center gap-2 ${
                        isToday 
                          ? 'text-[#ccff00]' 
                          : isPast 
                          ? 'text-gray-400' 
                          : 'text-white'
                      }`}>
                        {isToday ? <Flame size={18} className="text-[#ccff00]" /> : <Clock size={16} className={isPast ? 'text-gray-500' : 'text-[#ccff00]'} />}
                        {groupTitle}
                      </h2>
                      <span className="text-xs text-gray-500 font-mono">
                        {items.length} قسمت
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {items.map((entry: any) => {
                        const { show, episode, badge, diffDays } = entry;
                        const isWatched = watchedRecords.some(w => Number(w.episode_id) === Number(episode.id));

                        return (
                          <div
                            key={`${show.id}-${episode.id}`}
                            onClick={() => setSelectedEpData({
                              showId: show.id,
                              season: episode.season_number,
                              number: episode.episode_number
                            })}
                            className={`group flex items-center justify-between p-3 rounded-2xl bg-[#121212] hover:bg-[#181818] border transition-all cursor-pointer shadow-md ${
                              diffDays === 0 
                                ? 'border-[#ccff00]/40' 
                                : isPast 
                                ? 'border-white/5 opacity-80 hover:opacity-100' 
                                : 'border-white/5 hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-12 h-16 rounded-xl overflow-hidden shrink-0 bg-white/5 border border-white/10">
                                <img src={getImageUrl(show.poster_path)} alt={show.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              </div>

                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-black text-white truncate group-hover:text-[#ccff00] transition-colors">
                                  {show.name}
                                </span>
                                <span className="text-xs font-mono text-gray-400 mt-0.5 ltr text-right">
                                  S{String(episode.season_number).padStart(2, '0')} E{String(episode.episode_number).padStart(2, '0')}
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
                                  : isPast 
                                  ? 'bg-white/5 text-gray-500' 
                                  : 'bg-white/10 text-white'
                              }`}>
                                {badge}
                              </span>

                              {/* دکمه تیک فقط برای قسمت‌های پخش‌شده و امروز فعال است */}
                              {diffDays <= 0 && (
                                <button
                                  onClick={(e) => handleToggleWatched(e, show.id, episode.id, isWatched)}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                                    isWatched 
                                      ? 'bg-emerald-500 border-emerald-500 text-black' 
                                      : 'border-white/20 text-gray-500 hover:border-[#ccff00] hover:text-[#ccff00]'
                                  }`}
                                  title={isWatched ? "علامت‌گذاری به عنوان دیده نشده" : "دیدم"}
                                >
                                  <Check size={14} strokeWidth={3} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* ۲. ادامه تماشا با ثبت واقعی در دیتابیس و انیمیشن جذاب */
          <div className="space-y-4 animate-in fade-in duration-300">
            {watchNextList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500 gap-3 bg-white/5 rounded-3xl border border-white/5 border-dashed">
                <CheckCircle size={48} className="text-emerald-500" strokeWidth={1.5} />
                <p className="text-base font-bold text-gray-300">عالیه! همه سریال‌هات به‌روز هستن.</p>
                <p className="text-xs text-gray-500">قسمت دیده‌نشده‌ای در لیست شما باقی نمانده است.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {watchNextList.map((item: any) => {
                  const { show, seasonNumber, episodeNumber, episodeId, episodeTitle, runtime, watchedCount, totalEpisodes } = item;
                  const isCardLeaving = animatingCardId === show.id;
                  
                  return (
                    <div
                      key={`next-${show.id}`}
                      onClick={() => setSelectedEpData({
                        showId: show.id,
                        season: seasonNumber,
                        number: episodeNumber
                      })}
                      className={`group flex items-center justify-between p-3.5 rounded-2xl bg-[#141414] hover:bg-[#1a1a1a] border border-white/5 hover:border-[#ccff00]/40 transition-all duration-300 cursor-pointer shadow-lg ${
                        isCardLeaving 
                          ? '-translate-x-full opacity-0 scale-90 pointer-events-none' 
                          : 'translate-x-0 opacity-100 scale-100'
                      }`}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-14 h-20 rounded-xl overflow-hidden shrink-0 bg-white/5 border border-white/10 shadow-md">
                          <img 
                            src={getImageUrl(show.poster_path)} 
                            alt={show.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span className="text-base font-black text-white truncate group-hover:text-[#ccff00] transition-colors">
                            {show.name}
                          </span>

                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-mono font-bold text-[#ccff00] ltr">
                              S{String(seasonNumber).padStart(2, '0')} E{String(episodeNumber).padStart(2, '0')}
                            </span>
                            <span className="text-gray-600 text-xs">•</span>
                            <span className="text-xs text-gray-400 font-mono">
                              {watchedCount}/{totalEpisodes}
                            </span>
                            <span className="text-gray-600 text-xs">•</span>
                            <span className="text-xs text-gray-400">
                              {runtime} دقیقه
                            </span>
                          </div>

                          <span className="text-xs text-gray-300 font-medium truncate mt-1.5">
                            {episodeTitle}
                          </span>
                        </div>
                      </div>

                      {/* دکمه تیک تماشا یا نمایش زمان باقیمانده تا پخش */}
                      {!item.isReleased ? (
                        <div 
                          className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold flex items-center gap-1.5 shrink-0 ml-1 select-none"
                          title={item.airDate ? `تاریخ پخش: ${item.airDate}` : 'هنوز پخش نشده است'}
                        >
                          <Clock size={14} />
                          <span>{item.countdownBadge}</span>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => handleToggleWatched(e, show.id, episodeId, false)}
                          className="w-11 h-11 rounded-full flex items-center justify-center border border-white/20 text-gray-400 hover:bg-[#ccff00] hover:text-black hover:border-[#ccff00] transition-all cursor-pointer shrink-0 ml-1"
                          title="دیدم (ثبت در دیتابیس و رفتن به قسمت بعد)"
                        >
                          <Check size={18} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </main>

    </div>
  );
}