"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { getShowDetails, getImageUrl } from '@/lib/tmdbClient';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight, ListChecks, Bookmark, Eye, Clock, Tv } from 'lucide-react';

export default function MyListsPage() {
  const supabase = createClient() as any;
  const router = useRouter();
  
  // نام watchlist را در کد حفظ کردیم اما در UI نامش "لیست انتظار" است
  const [activeTab, setActiveTab] = useState<'watched' | 'watchlist'>('watched');
  const [shows, setShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [watchedStatus, setWatchedStatus] = useState<any>({});
  const [myShowsCount, setMyShowsCount] = useState({ watched: 0, watchlist: 0 });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setShows([]); 
      setWatchedStatus({});

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }

      // 1. دریافت دیتای خام از دیتابیس
      const { data: watchedData } = await supabase.from('watched').select('show_id, episode_id').eq('user_id', user.id);
      const { data: watchlistData } = await supabase.from('watchlist').select('show_id').eq('user_id', user.id);
      
      const watchedIds = watchedData || [];
      const watchlistIds = watchlistData || [];

      // ۲. تفکیک هوشمندانه آیدی‌ها بر اساس منطق جدید
      // سریال‌هایی که حداقل یک قسمت از آن‌ها دیده شده
      const uniqueWatchedShowIds = Array.from(new Set(watchedIds.map((item: any) => item.show_id)));
      
      // لیست انتظار: سریال‌هایی که به لیست اضافه شده‌اند اما هیچ قسمتی از آن‌ها دیده نشده
      const waitingShowIds = Array.from(new Set(watchlistIds.map((item: any) => item.show_id)))
        .filter(id => !uniqueWatchedShowIds.includes(id));

      // آپدیت اولیه تعداد تب‌ها (تعداد تب در حال تماشا بعد از فیلتر پایان‌یافته‌ها دقیق‌تر می‌شود)
      setMyShowsCount({ watched: uniqueWatchedShowIds.length, watchlist: waitingShowIds.length });

      const idsToFetch = activeTab === 'watched' ? uniqueWatchedShowIds : waitingShowIds;

      // 3. دریافت اطلاعات از TMDB و اعمال فیلترها
      if (idsToFetch.length > 0) {
        const showsData = await Promise.all(
          idsToFetch.map(async (id) => await getShowDetails(String(id)))
        );
        
        const validShows = showsData.filter(s => s !== null);

        if (activeTab === 'watched') {
            const statusMap: any = {};
            const finalWatchingShows: any[] = [];

            validShows.forEach(show => {
                // ۱. محاسبه دقیق مجموع اپیزودهای منتشر شده (حذف کامل فصل 0)
                const totalReleasedEps = show.seasons?.reduce((sum: number, season: any) => {
                    // اگر فصل 0 (اسپشال‌ها) بود، کلاً نادیده بگیر
                    if (season.season_number === 0) return sum;
                    
                    // فقط فصل‌هایی که تاریخ پخششون گذشته یا امروزه رو جمع کن
                    if (season.air_date && new Date(season.air_date) <= new Date()) {
                        return sum + season.episode_count;
                    }
                    return sum;
                }, 0) || 0;
                
                // ۲. تعداد اپیزودهای دیده شده کاربر از دیتابیس
                let watchedCount = watchedIds.filter((ep: any) => ep.show_id === show.id).length;
                
                // ترفند هوشمندانه: اگر احیاناً اپیزودهای فصل 0 هم در دیتابیس ثبت شده بودن،
                // عدد دیده‌شده رو محدود می‌کنیم که هرگز از کل قسمت‌های اصلی بیشتر نشه (مثلا همون 26 بشه)
                watchedCount = Math.min(watchedCount, totalReleasedEps);
                
                // ۳. محاسبه درصد پیشرفت دقیق
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

                // فیلتر نهایی برای نمایش یا عدم نمایش در تب «در حال تماشا»
                if (!(isCompleted && isEnded)) {
                    finalWatchingShows.push(show);
                }
            });

            setWatchedStatus(statusMap);
            setShows(finalWatchingShows);
            // آپدیت دقیق تعداد سریال‌های در حال تماشا (بعد از حذف پایان‌یافته‌ها)
            setMyShowsCount(prev => ({ ...prev, watched: finalWatchingShows.length }));
            
        } else {
            // برای تب لیست انتظار نیازی به فیلتر اضافی نیست
            setShows(validShows);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [activeTab]);

  const RenderShowCard = (show: any) => {
    const status = watchedStatus[show.id] || { watchedCount: 0, totalReleasedEps: 0, percentage: 0, isCompleted: false, isEnded: false };
    
    // تعیین متن و رنگ نوار وضعیت بر اساس قوانین جدید
    let statusText = 'در حال تماشا';
    let statusColor = 'text-cyan-400';
    let barColor = 'bg-cyan-400';

    if (status.isCompleted && !status.isEnded) {
        statusText = 'منتظر قسمت جدید';
        statusColor = 'text-[#ccff00]';
        barColor = 'bg-[#ccff00]';
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
                
                {activeTab === 'watched' && (
                    <div className="mt-2">
                        <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden mb-1.5">
                            <div 
                                className={`h-full ${barColor} transition-all duration-500`} 
                                style={{ width: `${status.percentage}%` }}
                            ></div>
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
                )}

                {activeTab === 'watchlist' && (
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
                )}
            </div>
        </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] p-4 md:p-8 pb-20 pt-28 md:pt-32">
      
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-all cursor-pointer">
            <ArrowRight size={20} />
        </button>
        <h1 className="text-2xl font-black flex items-center gap-2">
            <ListChecks className="text-[#ccff00]" />
            سریال‌های من
        </h1>
      </div>

      {/* TABS - شبیه به صفحه تقویم پخش */}
      <div className="flex gap-6 mb-8 border-b border-white/10 px-2 max-w-5xl mx-auto w-full">
          <button
              onClick={() => setActiveTab('watched')}
              className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === 'watched'
                      ? 'border-[#ccff00] text-[#ccff00] font-bold'
                      : 'border-transparent text-gray-400 hover:text-white'
              }`}
          >
              <Eye size={18} className={activeTab === 'watched' ? 'text-[#ccff00]' : 'text-gray-500'} />
              در حال تماشا ({myShowsCount.watched})
          </button>
          <button
              onClick={() => setActiveTab('watchlist')}
              className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === 'watchlist'
                      ? 'border-purple-500 text-purple-500 font-bold'
                      : 'border-transparent text-gray-400 hover:text-white'
              }`}
          >
              <Bookmark size={18} className={activeTab === 'watchlist' ? 'text-purple-500' : 'text-gray-500'} />
              لیست انتظار ({myShowsCount.watchlist})
          </button>
      </div>

      {/* Content Container - مشابه کادر تقویم پخش */}
      <div className="max-w-5xl mx-auto">
          {loading ? (
            <div className="flex justify-center mt-20 text-[#ccff00]">
                <Loader2 className="animate-spin" size={40} />
            </div>
          ) : shows.length > 0 ? (
            <div className="animate-in fade-in zoom-in-95 duration-300">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                    {shows.map(RenderShowCard)}
                </div>
            </div>
          ) : (
            <div className="animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center justify-center mt-20 text-gray-500 gap-4 bg-white/5 p-10 rounded-3xl border border-white/5 border-dashed max-w-2xl mx-auto text-center">
                <Tv size={64} strokeWidth={1} className="opacity-50" />
                <p className="text-lg text-gray-400">
                    {activeTab === 'watched' 
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