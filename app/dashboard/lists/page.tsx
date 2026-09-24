"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { getShowDetails, getImageUrl } from '@/lib/tmdbClient';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight, ListChecks, Bookmark, Eye, Clock, Tv, CheckCircle } from 'lucide-react';

export default function MyListsPage() {
  const supabase = createClient() as any;
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'completed' | 'watched' | 'watchlist'>('watched');
  const [tabInitialized, setTabInitialized] = useState(false);
  const [completedFilter, setCompletedFilter] = useState<'all' | 'upcoming' | 'ended'>('all');
  const [shows, setShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [watchedStatus, setWatchedStatus] = useState<any>({});
  const [myShowsCount, setMyShowsCount] = useState({ completed: 0, watched: 0, watchlist: 0 });

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab === 'completed' || tab === 'watched' || tab === 'watchlist') {
      setActiveTab(tab);
    }
    setTabInitialized(true);
  }, []);

  useEffect(() => {
    if (!tabInitialized) return;

    const fetchData = async () => {
      setLoading(true);
      setShows([]); 
      setWatchedStatus({});

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = '/login'; return; }

        // ۱. دریافت نامحدود تمام اپیزودهای تماشا شده (شکستن سقف ۱۰۰۰تایی)
        let allWatchedData: any[] = [];
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
            allWatchedData = [...allWatchedData, ...data];
            if (data.length < 1000) hasMore = false;
            else page++;
          }
        }

        // ۲. دریافت واچ‌لیست کاربر
        const { data: watchlistData } = await supabase
          .from('watchlist')
          .select('show_id')
          .eq('user_id', user.id);
        
        const watchedIds = allWatchedData;
        const watchlistIds = watchlistData || [];

        // ۳. تفکیک دقیق با تبدیل همه آیدی‌ها به عدد
        // سریال‌هایی که حداقل یک قسمت از آن‌ها دیده شده است
        const uniqueWatchedShowIds = Array.from(new Set(watchedIds.map((item: any) => Number(item.show_id))));
        // لیست انتظار: فقط آثاری که در واچ‌لیست هستند ولی حتی ۱ اپیزود هم از آنها دیده نشده
        const waitingShowIds: number[] = Array.from(new Set<number>(watchlistIds.map((item: any) => Number(item.show_id))))
          .filter((id: any) => !uniqueWatchedShowIds.includes(Number(id)));

        setMyShowsCount(prev => ({ ...prev, watchlist: waitingShowIds.length }));

        // ۴. دریافت اطلاعات از TMDB
        const loadShowDetails = async (ids: number[]) => {
          const results: any[] = [];
          const batchSize = 6;

          for (let index = 0; index < ids.length; index += batchSize) {
            const batch = ids.slice(index, index + batchSize);
            const batchResults = await Promise.all(batch.map(async (id) => {
              for (let attempt = 0; attempt < 3; attempt++) {
                const show = await getShowDetails(String(id));
                if (show) return show;
              }
              return null;
            }));
            results.push(...batchResults);
          }

          return results;
        };

        if (uniqueWatchedShowIds.length > 0 || waitingShowIds.length > 0) {
          const watchedDetails = await loadShowDetails(uniqueWatchedShowIds);
          const waitingDetails = activeTab === 'watchlist' ? await loadShowDetails(waitingShowIds) : [];
          const validShows = [...watchedDetails, ...waitingDetails].filter(Boolean);

          const statusMap: any = {};
          const finalWatchingShows: any[] = [];
          const completedShows: any[] = [];
          const watchedShows = validShows.filter(show => uniqueWatchedShowIds.includes(Number(show.id)));
          const waitingShows = validShows.filter(show => waitingShowIds.includes(Number(show.id)));

          watchedShows.forEach(show => {
              // محاسبه مجموع اپیزودهای منتشر شده (بدون فصل صفر)
              const nextEpisode = show.next_episode_to_air;
              const nextEpisodeIsUpcoming = nextEpisode?.air_date && new Date(nextEpisode.air_date) > new Date();
              const totalReleasedEps = show.seasons?.reduce((sum: number, season: any) => {
                if (season.season_number === 0) return sum;
                if (!season.air_date || new Date(season.air_date) > new Date()) {
                  return sum;
                }
                if (nextEpisodeIsUpcoming && season.season_number === nextEpisode.season_number) {
                  // اگر قسمت بعدی داخل همین فصل است، قسمت‌های اعلام‌شده اما پخش‌نشده هم باید در مخرج باشند.
                  // قسمت اول فصل آینده هنوز بخشی از فصل فعلی کاربر محسوب نمی‌شود.
                  return nextEpisode.episode_number > 1 ? sum + season.episode_count : sum;
                }
                return sum + season.episode_count;
              }, 0) || 0;
              
              // تعداد اپیزودهای تماشا شده کاربر
              let watchedCount = watchedIds.filter((ep: any) => Number(ep.show_id) === Number(show.id)).length;
              watchedCount = Math.min(watchedCount, totalReleasedEps);
              
              const percentage = totalReleasedEps > 0 ? Math.round((watchedCount / totalReleasedEps) * 100) : 0;
              const isCompleted = percentage >= 100 && totalReleasedEps > 0;
              const isEnded = show.status === 'Ended' || show.status === 'Canceled';

              statusMap[show.id] = {
                watchedCount,
                totalReleasedEps,
                percentage,
                isCompleted,
                isEnded
              };

              // هر سریالی که تمام قسمت‌های منتشرشده‌اش دیده شده، کامل محسوب می‌شود.
              if (!isCompleted) {
                finalWatchingShows.push(show);
              } else {
                completedShows.push(show);
              }
            });

          setWatchedStatus(statusMap);
          setShows(activeTab === 'watchlist'
            ? waitingShows
            : activeTab === 'completed' ? completedShows : finalWatchingShows);
          setMyShowsCount(prev => ({
            ...prev,
            completed: completedShows.length,
            watched: finalWatchingShows.length,
          }));
        }
      } catch (err) {
        console.error("Error loading my lists:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, tabInitialized]);

  const changeTab = (tab: 'completed' | 'watched' | 'watchlist') => {
    setActiveTab(tab);
    router.replace(`/dashboard/lists?tab=${tab}`, { scroll: false });
  };

  const RenderShowCard = (show: any) => {
    const status = watchedStatus[show.id] || { watchedCount: 0, totalReleasedEps: 0, percentage: 0, isCompleted: false, isEnded: false };
    
    let statusText = 'در حال تماشا';
    let statusColor = 'text-cyan-400';
    let barColor = 'bg-cyan-400';

    if (status.isCompleted) {
      if (status.isEnded) {
        statusText = 'پایان یافته';
        statusColor = 'text-emerald-400';
        barColor = 'bg-emerald-400';
      } else {
        statusText = 'منتظر فصل جدید';
        statusColor = 'text-[#ccff00]';
        barColor = 'bg-[#ccff00]';
      }
    }

    return (
      <div 
        key={show.id}
        onClick={() => router.push(`/dashboard/tv/${show.id}`)}
        className="group relative aspect-[2/3] bg-white/5 rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform duration-300 border border-white/5 hover:border-[#ccff00]/50 shadow-xl"
      >
        <img 
          src={getImageUrl(show.poster_path)} 
          alt={show.name}
          className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
        
        <div className="absolute bottom-0 p-4 w-full">
          <h3 className="text-lg font-bold text-white line-clamp-1 ltr text-left">{show.name}</h3>
          
          {status && status.watchedCount > 0 ? (
            <div className="mt-2">
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden mb-1.5">
                <div 
                  className={`h-full ${barColor} transition-all duration-500`} 
                  style={{ width: `${status.percentage}%` }} 
                />
              </div>
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span className={`font-bold ${statusColor}`}>
                  {statusText}
                </span>
                <span className="ltr font-mono bg-black/40 px-1.5 py-0.5 rounded">
                  {status.watchedCount} / {status.totalReleasedEps}
                </span>
              </div>
            </div>
          ) : activeTab === 'watchlist' ? (
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 mt-2">
              <span className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-md">
                <Clock size={12} className="text-[#ccff00]" />
                {show.number_of_seasons} فصل
              </span>
              <span className="bg-white/10 px-2 py-1 rounded-md line-clamp-1">
                {show.status === 'Ended' ? 'تمام شده' : 
                 show.status === 'Returning Series' ? 'در حال پخش' : 
                 show.status === 'Canceled' ? 'کنسل شده' : 
                 show.status}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const visibleShows = activeTab === 'completed'
    ? shows
        .filter(show => completedFilter === 'all' || (completedFilter === 'upcoming' ? !watchedStatus[show.id]?.isEnded : watchedStatus[show.id]?.isEnded))
        .sort((firstShow, secondShow) => Number(watchedStatus[firstShow.id]?.isEnded) - Number(watchedStatus[secondShow.id]?.isEnded))
    : shows;
  const upcomingCompletedCount = shows.filter(show => !watchedStatus[show.id]?.isEnded).length;
  const endedCompletedCount = shows.filter(show => watchedStatus[show.id]?.isEnded).length;

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] p-4 md:p-8 pb-28 md:pb-20">
      
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-all cursor-pointer">
          <ArrowRight size={20} />
        </button>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <ListChecks className="text-[#ccff00]" />
          سریال‌های من
        </h1>
      </div>

      {/* تب‌ها */}
      <div className="flex gap-4 sm:gap-6 mb-8 border-b border-white/10 px-2 max-w-5xl mx-auto w-full overflow-x-auto no-scrollbar whitespace-nowrap">
        <button
          onClick={() => changeTab('completed')}
          className={`pb-3 shrink-0 flex items-center gap-2 border-b-2 text-sm sm:text-base transition-all cursor-pointer ${
            activeTab === 'completed'
              ? 'border-emerald-400 text-emerald-400 font-bold'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <CheckCircle size={18} className={activeTab === 'completed' ? 'text-emerald-400' : 'text-gray-500'} />
          سریال‌های تمام شده ({myShowsCount.completed})
        </button>
        <button
          onClick={() => changeTab('watched')}
          className={`pb-3 shrink-0 flex items-center gap-2 border-b-2 text-sm sm:text-base transition-all cursor-pointer ${
            activeTab === 'watched'
              ? 'border-[#ccff00] text-[#ccff00] font-bold'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Eye size={18} className={activeTab === 'watched' ? 'text-[#ccff00]' : 'text-gray-500'} />
          در حال تماشا ({myShowsCount.watched})
        </button>
        <button
          onClick={() => changeTab('watchlist')}
          className={`pb-3 shrink-0 flex items-center gap-2 border-b-2 text-sm sm:text-base transition-all cursor-pointer ${
            activeTab === 'watchlist'
              ? 'border-purple-500 text-purple-500 font-bold'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Bookmark size={18} className={activeTab === 'watchlist' ? 'text-purple-500' : 'text-gray-500'} />
          لیست انتظار ({myShowsCount.watchlist})
        </button>
      </div>

      <div className="max-w-5xl mx-auto">
        {activeTab === 'completed' && !loading && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-sm text-gray-400 ml-2">نمایش:</span>
            {([
              ['all', 'همه'],
              ['upcoming', `منتظر فصل جدید (${upcomingCompletedCount})`],
              ['ended', `پایان یافته (${endedCompletedCount})`],
            ] as const).map(([filter, label]) => (
              <button
                key={filter}
                onClick={() => setCompletedFilter(filter)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  completedFilter === filter
                    ? 'bg-[#ccff00] text-black border-[#ccff00]'
                    : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {loading ? (
          <div className="flex justify-center mt-20 text-[#ccff00]">
            <Loader2 className="animate-spin" size={40} />
          </div>
        ) : visibleShows.length > 0 ? (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {visibleShows.map(RenderShowCard)}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center justify-center mt-20 text-gray-500 gap-4 bg-white/5 p-10 rounded-3xl border border-white/5 border-dashed max-w-2xl mx-auto text-center">
            <Tv size={64} strokeWidth={1} className="opacity-50" />
            <p className="text-lg text-gray-400">
              {activeTab === 'completed'
                ? completedFilter === 'upcoming'
                  ? 'سریالی منتظر قسمت جدید نیست.'
                  : completedFilter === 'ended'
                    ? 'هنوز سریال پایان‌یافته‌ای نداری!'
                    : 'هنوز سریال تمام‌شده‌ای نداری!'
                : activeTab === 'watched'
                ? 'سریال در حال تماشایی نداری! (سریال‌های تمام شده مخفی می‌شوند)' 
                : 'لیست انتظارت خالیه!'}
            </p>
            <button 
              onClick={() => router.push('/dashboard')}
              className="bg-[#ccff00] text-black px-6 py-2 rounded-xl font-bold hover:bg-[#b3e600] transition-colors cursor-pointer mt-2"
            >
              پیدا کردن سریال جدید
            </button>
          </div>
        )}
      </div>

    </div>
  );
}