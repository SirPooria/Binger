"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { getShowDetails, getImageUrl, getGlobalAiringShows, getBackdropUrl } from '@/lib/tmdbClient';
import { useRouter } from 'next/navigation';
import { Loader2, Calendar as CalIcon, ArrowRight, Clock, Zap, AlertCircle, CheckCircle, PlayCircle } from 'lucide-react';
import EpisodeModal from '../components/EpisodeModal';

export default function CalendarPage() {
  const router = useRouter();
  const supabase = createClient() as any;
  
  const [loading, setLoading] = useState(true);
  const [myEpisodes, setMyEpisodes] = useState<any[]>([]);
  const [globalEpisodes, setGlobalEpisodes] = useState<any[]>([]);
  const [selectedEpData, setSelectedEpData] = useState<any>(null);
  
  // State جدید برای مدیریت تب‌های فعال (پیش‌فرض: سریال‌های من)
  const [activeTab, setActiveTab] = useState<'mine' | 'all'>('mine');

  useEffect(() => {
    const fetchCalendar = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }

      const p1 = supabase.from('watched').select('show_id').eq('user_id', user.id);
      const p2 = supabase.from('watchlist').select('show_id').eq('user_id', user.id);
      const [wRes, lRes] = await Promise.all([p1, p2]);

      const myShowIds = new Set<number>();
      wRes.data?.forEach((i: any) => myShowIds.add(i.show_id));
      lRes.data?.forEach((i: any) => myShowIds.add(i.show_id));
      
      const uniqueMyIds = Array.from(myShowIds);

      let myUpcoming: any[] = [];
      if (uniqueMyIds.length > 0) {
        const recentIds = uniqueMyIds.slice(0, 20);
        const showsData = await Promise.all(recentIds.map(async (id) => await getShowDetails(String(id))));
        
        myUpcoming = showsData
          .filter((s: any) => s && s.next_episode_to_air && new Date(s.next_episode_to_air.air_date) >= new Date())
          .map((s: any) => ({ ...s, isMine: true }));
      }

      const globalData = await getGlobalAiringShows();
      const trending = globalData
        .filter((s: any) => !myShowIds.has(s.id))
        .map((s: any) => ({ ...s, isMine: false }));
      
      const sortFn = (a: any, b: any) => new Date(a.next_episode_to_air.air_date).getTime() - new Date(b.next_episode_to_air.air_date).getTime();

      setMyEpisodes(myUpcoming.sort(sortFn));
      setGlobalEpisodes(trending.sort(sortFn));
      setLoading(false);
    };

    fetchCalendar();
  }, []);

  const openModal = (item: any) => {
    setSelectedEpData({
        showId: item.id,
        season: item.next_episode_to_air.season_number,
        number: item.next_episode_to_air.episode_number
    });
  };

  if (loading) {
    return (
        <div className="min-h-screen bg-[#050505] flex justify-center items-center pt-20 text-[#ccff00]">
            <Loader2 className="animate-spin" size={40} />
        </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] p-4 md:p-8 pb-20 pt-28 md:pt-32">
      
      {/* MODAL */}
      {selectedEpData && (
        <EpisodeModal 
            showId={selectedEpData.showId}
            seasonNum={selectedEpData.season}
            episodeNum={selectedEpData.number}
            onClose={() => setSelectedEpData(null)}
            onWatchedChange={() => {}}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.back()} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-all cursor-pointer">
              <ArrowRight size={20} />
          </button>
          <div>
              <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
                  <CalIcon className="text-[#ccff00]" />
                  تقویم پخش
              </h1>
              <p className="text-xs text-gray-400 mt-1">برنامه زمانی پخش سریال‌های شما و جهان</p>
          </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-6 mb-8 border-b border-white/10 px-2 max-w-5xl mx-auto">
          <button
              onClick={() => setActiveTab('mine')}
              className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === 'mine'
                      ? 'border-[#ccff00] text-[#ccff00] font-bold'
                      : 'border-transparent text-gray-400 hover:text-white'
              }`}
          >
              <CheckCircle size={18} className={activeTab === 'mine' ? 'text-[#ccff00]' : 'text-gray-500'} />
              سریال‌های من
          </button>
          <button
              onClick={() => setActiveTab('all')}
              className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === 'all'
                      ? 'border-red-500 text-red-500 font-bold'
                      : 'border-transparent text-gray-400 hover:text-white'
              }`}
          >
              <Zap size={18} className={activeTab === 'all' ? 'text-red-500 fill-red-500' : 'text-gray-500'} />
              همه سریال‌ها
          </button>
      </div>

      <div className="max-w-5xl mx-auto space-y-12">
          {/* Tab Content: My Episodes */}
          {activeTab === 'mine' && (
              <section className="animate-in fade-in zoom-in-95 duration-300">
                  {myEpisodes.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                          {myEpisodes.map((item) => (
                              <LandscapeCard key={item.id} item={item} onClick={() => openModal(item)} isMine={true} />
                          ))}
                      </div>
                  ) : (
                      <div className="flex flex-col items-center justify-center mt-10 text-gray-500 gap-4 text-center bg-white/5 p-10 rounded-3xl border border-white/5 border-dashed">
                          <AlertCircle size={64} strokeWidth={1} />
                          <p className="text-lg">سریال‌های شما در حال حاضر قسمت جدیدی ندارند!</p>
                          <button 
                              onClick={() => setActiveTab('all')}
                              className="bg-[#ccff00] text-black px-6 py-2 rounded-xl font-bold hover:bg-[#b3e600] transition-colors mt-4 cursor-pointer"
                          >
                              جستجو در سریال‌های جهانی
                          </button>
                      </div>
                  )}
              </section>
          )}

          {/* Tab Content: All Episodes */}
          {activeTab === 'all' && (
              <section className="animate-in fade-in zoom-in-95 duration-300">
                  {globalEpisodes.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {globalEpisodes.map((item) => (
                              <LandscapeCard key={item.id} item={item} onClick={() => openModal(item)} isMine={false} />
                          ))}
                      </div>
                  ) : (
                      <div className="flex flex-col items-center justify-center mt-10 text-gray-500 gap-4 text-center bg-white/5 p-10 rounded-3xl border border-white/5 border-dashed">
                          <AlertCircle size={64} strokeWidth={1} />
                          <p className="text-lg">در حال حاضر سریال جدیدی در جهان در حال پخش نیست!</p>
                      </div>
                  )}
              </section>
          )}
      </div>

    </div>
  );
}

// --- کامپوننت کارت افقی (Landscape) بدون تغییر باقی می‌ماند ---
const LandscapeCard = ({ item, onClick, isMine }: any) => {
    const ep = item.next_episode_to_air;
    
    // محاسبه زمان باقی‌مانده (فقط بر اساس روز)
    const getDaysLeft = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        
        // صفر کردن ساعت‌ها برای اینکه اختلاف دقیقاً به روز محاسبه بشه
        date.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        
        const diffTime = date.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        if (diffDays === 0) return { text: "پخش: امروز! 🔥", color: "bg-[#ccff00] text-black" };
        if (diffDays === 1) return { text: "پخش: فردا", color: "bg-white text-black" };
        
        // حالا برای هر بازه زمانی بیشتر از ۱ روز، فقط عدد رو نشون میده
        return { text: `${diffDays} روز دیگر`, color: "bg-white/20 text-white" };
    };

    const status = getDaysLeft(ep.air_date);

    return (
        <div 
            onClick={onClick}
            className={`group relative aspect-video w-full rounded-2xl overflow-hidden cursor-pointer border transition-all duration-300 hover:scale-[1.02] shadow-xl ${isMine ? 'border-[#ccff00]/30 hover:border-[#ccff00]' : 'border-white/5 hover:border-white/20'}`}
        >
            <img 
                src={getBackdropUrl(item.backdrop_path || item.poster_path)} 
                alt={item.name} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90 group-hover:opacity-80 transition-opacity"></div>

            <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1 ${status.color}`}>
                <Clock size={12} /> {status.text}
            </div>

            <div className="absolute bottom-0 left-0 w-full p-4 md:p-5">
                <h3 className="text-lg md:text-xl font-black text-white leading-tight mb-1 drop-shadow-md group-hover:text-[#ccff00] transition-colors line-clamp-1">{item.name}</h3>
                
                <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-200 flex items-center gap-2">
                            {ep.name || `Episode ${ep.episode_number}`}
                        </span>
                        <span className="text-xs text-gray-400 ltr text-right font-mono mt-0.5">
                            S{ep.season_number} | E{ep.episode_number}
                        </span>
                    </div>

                    <div className="bg-white/10 p-2 rounded-full backdrop-blur-md group-hover:bg-[#ccff00] group-hover:text-black transition-colors">
                        <PlayCircle size={20} />
                    </div>
                </div>
            </div>
        </div>
    );
};