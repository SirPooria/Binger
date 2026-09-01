"use client";

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { 
  getTrendingShows, getImageUrl, getBackdropUrl, 
  getShowDetails, getIranianShows, getNewestIranianShows,
  getNewestGlobal, getRecommendations
} from '@/lib/tmdbClient';
import { 
  AlertTriangle, Plus, Info, Check, Bookmark, 
  Activity, ChevronLeft, ChevronRight, Twitter, Instagram, Sparkles,
  Trash2, ArrowLeft, Flame, Star
} from 'lucide-react';

// --- SKELETON LOADER ---
const DashboardSkeleton = () => (
  <div className="w-full min-h-screen bg-[#050505] p-6 space-y-10 animate-pulse pt-24">
     <div className="w-full h-[30vh] bg-white/5 rounded-3xl relative overflow-hidden" />
     {[1, 2].map((i) => (
         <div key={i} className="space-y-4">
             <div className="w-48 h-6 bg-white/10 rounded-lg"></div>
             <div className="flex gap-4 overflow-hidden">
               {[1, 2, 3, 4, 5].map((j) => (
                     <div key={j} className="w-40 h-60 bg-white/5 rounded-2xl shrink-0"></div>
                 ))}
             </div>
         </div>
     ))}
  </div>
);

export default function Dashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
       <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  
  // States برای مدیریت دیتا و Onboarding
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set());
  const [watchedIds, setWatchedIds] = useState<number[]>([]);
  const [allShowIds, setAllShowIds] = useState<number[]>([]);
  
  const [myFeed, setMyFeed] = useState<any[]>([]);
  const [categories, setCategories] = useState<any>({});
  const [aiRecs, setAiRecs] = useState<any[]>([]);
  const [aiSourceShow, setAiSourceShow] = useState<string | null>(null); 

  // --- Main Data Logic ---
  useEffect(() => {
    const initData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { 
            router.replace('/login'); 
            return; 
        }
        setUser(user);

        // ۱. دریافت دیتای کاربر از دیتابیس
        const { data: wList } = await supabase.from('watchlist').select('show_id').eq('user_id', user.id);
        const { data: watched } = await supabase.from('watched').select('show_id').eq('user_id', user.id);

        const wIds = wList?.map((i: any) => i.show_id) || [];
        const wEdIds = watched?.map((i: any) => i.show_id) || [];
        
        // تفکیک آیدی‌ها برای منطق‌های مختلف
        const uniqueWatchedIds = Array.from(new Set(wEdIds));
        const allUserShowIds = Array.from(new Set([...wIds, ...wEdIds]));
        const allUserShowIdsSet = new Set(allUserShowIds); 
        
        // ذخیره استیت‌ها برای Onboarding Steps
        setWatchlistIds(new Set(wIds));
        setWatchedIds(uniqueWatchedIds);
        setAllShowIds(allUserShowIds);

        // ۲. منطق "ادامه تماشا"
        if (uniqueWatchedIds.length > 0) {
            const recentWatchedIds = uniqueWatchedIds.reverse().slice(0, 20);
            
            const myShowsRaw = await Promise.all(
                recentWatchedIds.map(id => getShowDetails(String(id)).catch(() => null))
            );
            
            const validShows = myShowsRaw.filter(s => s !== null);
            const continueWatchingShows: any[] = [];

            validShows.forEach(show => {
                const totalReleasedEps = show.seasons?.reduce((sum: number, season: any) => {
                    if (season.season_number === 0) return sum;
                    if (season.air_date && new Date(season.air_date) <= new Date()) {
                        return sum + season.episode_count;
                    }
                    return sum;
                }, 0) || 0;
                
                let watchedCount = wEdIds.filter((id: number) => id === show.id).length;
                watchedCount = Math.min(watchedCount, totalReleasedEps);
                
                const percentage = totalReleasedEps > 0 ? Math.round((watchedCount / totalReleasedEps) * 100) : 0;
                const isCompleted = percentage >= 100 && totalReleasedEps > 0;
                const isEnded = show.status === 'Ended' || show.status === 'Canceled';

                if (!(isCompleted && isEnded)) {
                    continueWatchingShows.push(show);
                }
            });

            setMyFeed(continueWatchingShows.slice(0, 10));

            // ۳. منطق سیستم پیشنهاد دهنده هوشمند
            const randomSeedId = uniqueWatchedIds[Math.floor(Math.random() * uniqueWatchedIds.length)];
            
            const [seedDetails, recs] = await Promise.all([
                getShowDetails(String(randomSeedId)),
                getRecommendations(randomSeedId)
            ]);

            if (recs && recs.length > 0) {
                const filteredRecs = recs.filter((show: any) => !allUserShowIdsSet.has(show.id));
                
                if (filteredRecs.length > 0) {
                    setAiRecs(filteredRecs);
                    setAiSourceShow(seedDetails?.name || "سلیقه شما");
                } else {
                    setAiRecs([]);
                }
            }
        }

        // ۴. دریافت دسته‌بندی‌های عمومی
        const fetchSafely = async (fn: () => Promise<any>, fallback: any[]) => {
            try { return await fn(); } catch (e) { return fallback; }
        };

        const [trend, global, popIr, newIr] = await Promise.all([
            fetchSafely(getTrendingShows, []),
            fetchSafely(getNewestGlobal, []),
            fetchSafely(getIranianShows, []),
            fetchSafely(getNewestIranianShows, [])
        ]);

        setCategories({
            newIranian: newIr || [],
            popularIranian: popIr || [],
            trending: trend ? trend.slice(0, 10) : [],
            newGlobal: global || [],
        });
      } catch (err: any) {
          console.error(err);
          setErrorMsg("خطا در بارگذاری.");
      } finally {
          setLoading(false);
      }
    };
    initData();
  }, []);

  const toggleWatchlist = async (showId: number) => {
      const isAdded = watchlistIds.has(showId);
      setWatchlistIds(prev => {
          const next = new Set(prev);
          if (isAdded) next.delete(showId);
          else next.add(showId);
          return next;
      });
      setToastMsg(isAdded ? "حذف شد 🗑️" : "اضافه شد ✅");
      setTimeout(() => setToastMsg(null), 3000);
      
      if (user) {
          if (isAdded) await supabase.from('watchlist').delete().eq('user_id', user.id).eq('show_id', showId);
          else await supabase.from('watchlist').insert([{ user_id: user.id, show_id: showId }] as any);
      }
  };

  if (loading) return <DashboardSkeleton />;
  if (errorMsg) return <div className="h-full flex flex-col items-center justify-center text-red-500 gap-4 pt-20"><AlertTriangle size={48} /><p>{errorMsg}</p></div>;

  return (
    <div className="animate-in fade-in duration-700 relative w-full overflow-hidden flex flex-col min-h-screen bg-[#050505] pt-24 md:pt-32">
        
        {toastMsg && (
            <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[200] bg-[#ccff00] text-black px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-5">
                <Info size={20} /> {toastMsg}
            </div>
        )}

        <div className="relative z-10 px-4 md:px-8 pb-10 space-y-12 md:space-y-16 flex-1">
            
            {/* 1. ONBOARDING GAMIFICATION (جایگزین اسلایدر) */}
            <OnboardingSteps 
                wIds={Array.from(watchlistIds)} 
                wEdIds={watchedIds} 
                allUserShowIds={allShowIds} 
                router={router} 
            />
            <CinematicHero 
                recommendedShow={aiRecs[0] || (categories.trending && categories.trending[0])} 
                router={router} 
            />
            {myFeed.length > 0 && (
                <div className="relative animate-in slide-in-from-bottom-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="text-[#ccff00] animate-pulse" size={24} />
                        <h2 className="text-lg md:text-2xl font-black text-white">ادامه تماشا</h2>
                    </div>
                    <CarouselSection items={myFeed} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} />
                </div>
            )}

            {/* 3. هوش مصنوعی و پیشنهادهای هوشمند */}
            {aiRecs.length > 0 && (
                <div className="relative bg-gradient-to-r from-[#ccff00]/5 to-transparent border border-[#ccff00]/10 rounded-3xl p-6 md:p-8 animate-in slide-in-from-bottom-6">
                    <div className="flex items-center gap-2 mb-6">
                        <Sparkles size={24} className="text-[#ccff00]" />
                        <h2 className="text-lg md:text-2xl font-black text-white">
                             چون <span className="text-[#ccff00] underline decoration-wavy underline-offset-4">{aiSourceShow}</span> رو دیدی:
                        </h2>
                    </div>
                    <CarouselSection items={aiRecs} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} />
                </div>
            )}
            
            <CarouselSection title="تازه‌های نمایش خانگی ایران" items={categories.newIranian} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} categoryId="new-iranian" />
            <CarouselSection title="پرطرفدارترین‌های ایرانی" items={categories.popularIranian} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} categoryId="pop-iranian" />
            
            <div className="bg-white/5 p-6 rounded-3xl border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[50px] rounded-full"></div>
                <div className="flex items-center gap-2 mb-4 relative z-10">
                    <Flame className="text-red-500 fill-red-500" />
                    <h2 className="text-xl font-black text-white">ترندهای جهانی</h2>
                </div>
                <CarouselSection items={categories.trending} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} categoryId="trending" />
            </div>

            <CarouselSection title="جدیدترین‌های دنیا" items={categories.newGlobal} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} categoryId="new-global" />
        </div>

        <DashboardFooter />
    </div>
  );
}

// --- COMPONENTS ---

// 1. ONBOARDING STEPS COMPONENT
function OnboardingSteps({ wIds, wEdIds, allUserShowIds, router }: any) {
    const steps = [
        { 
            id: 1, 
            title: 'شروع مسیر: افزودن به لیست انتظار', 
            desc: 'یک سریال که دوست داری ببینی رو پیدا کن و دکمه + رو بزن.',
            completed: wIds.length > 0 
        },
        { 
            id: 2, 
            title: 'اولین تیکِ تماشا!', 
            desc: 'وارد صفحه یک سریال شو و تیک یکی از قسمت‌هایی که دیدی رو بزن.',
            completed: wEdIds.length > 0 
        },
        { 
            id: 3, 
            title: 'شکل‌گیری سلیقه', 
            desc: 'حداقل ۵ سریال به بینجر اضافه کن تا پیشنهادهای هوشمندت فعال بشن.',
            completed: allUserShowIds.length >= 5 
        }
    ];

    const completedCount = steps.filter(s => s.completed).length;
    const progress = Math.round((completedCount / steps.length) * 100);

    if (progress === 100) return null;

    return (
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-white/10 rounded-3xl p-6 md:p-8 relative overflow-hidden animate-in fade-in duration-500 shadow-2xl">
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#ccff00]/10 blur-[80px] rounded-full pointer-events-none"></div>

            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center">
                <div className="flex flex-col items-center justify-center shrink-0 w-full md:w-auto">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/10" />
                            <circle 
                                cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="6" fill="transparent" 
                                strokeDasharray={276} strokeDashoffset={276 - (276 * progress) / 100}
                                className="text-[#ccff00] transition-all duration-1000 ease-out" 
                            />
                        </svg>
                        <div className="absolute text-xl font-black text-white">{progress}%</div>
                    </div>
                    <p className="text-xs text-gray-400 mt-3 font-bold">راه‌اندازی بینجر</p>
                </div>

                <div className="flex-1 w-full space-y-4">
                    <h2 className="text-xl font-black text-white mb-4">برای تجربه بهتر، این مراحل رو طی کن:</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {steps.map((step) => (
                            <div key={step.id} className={`flex md:flex-col items-center md:items-start gap-4 md:gap-3 p-4 rounded-xl border transition-all ${step.completed ? 'bg-[#ccff00]/10 border-[#ccff00]/30' : 'bg-white/5 border-white/5'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${step.completed ? 'bg-[#ccff00] text-black' : 'bg-white/10 text-gray-400'}`}>
                                    {step.completed ? <Check size={16} strokeWidth={3} /> : <span className="text-sm font-bold">{step.id}</span>}
                                </div>
                                <div className="flex-1">
                                    <h3 className={`text-sm font-bold ${step.completed ? 'text-[#ccff00]' : 'text-white'}`}>{step.title}</h3>
                                    <p className="text-xs text-gray-400 mt-1 hidden md:block">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// 2. CAROUSEL SECTION
function CarouselSection({ title, items, router, watchlistIds, onToggle, categoryId }: any) {
    const rowRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    if (!items || items.length === 0) return null;

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!rowRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - rowRef.current.offsetLeft);
        setScrollLeft(rowRef.current.scrollLeft);
    };
    const handleMouseLeave = () => setIsDragging(false);
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !rowRef.current) return;
        e.preventDefault();
        const x = e.pageX - rowRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        rowRef.current.scrollLeft = scrollLeft - walk;
    };
    return (
        <div className="space-y-4 group/section relative z-0">
            {title && (
                <div className="flex items-center justify-between px-2 mr-2 border-r-4 border-[#ccff00] relative z-20">
                    <h2 className="text-lg md:text-xl font-black text-white/90 cursor-default">{title}</h2>
                    {categoryId && (
                        <button 
                            onClick={() => router.push(`/dashboard/category/${categoryId}`)}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#ccff00] transition-colors cursor-pointer px-2 py-1 z-30 pointer-events-auto"
                        >
                            <span>مشاهده همه</span>
                            <ArrowLeft size={14} />
                        </button>
                    )}
                </div>
            )}
            
            <div className="relative group">
                {!isDragging && (
                    <>
                        <button 
                            onClick={() => rowRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
                            className="absolute -left-6 top-1/2 -translate-y-1/2 bg-black/80 hover:bg-[#ccff00] hover:text-black text-white p-3 rounded-full border border-white/10 z-50 hidden md:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl active:scale-90"
                        >
                             <ChevronLeft size={20} />
                        </button>
                        <button 
                            onClick={() => rowRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
                            className="absolute -right-6 top-1/2 -translate-y-1/2 bg-black/80 hover:bg-[#ccff00] hover:text-black text-white p-3 rounded-full border border-white/10 z-50 hidden md:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl active:scale-90"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </>
                )}

                <div 
                    ref={rowRef} 
                    className={`flex gap-4 overflow-x-auto px-4 py-8 -my-8 no-scrollbar scroll-smooth cursor-grab relative z-10 ${isDragging ? 'cursor-grabbing snap-none' : 'snap-x'}`}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                >
                    {items.map((show: any) => (
                        <div key={show.id} className="snap-center shrink-0 w-[130px] md:w-[160px] pointer-events-auto">
                            <ShowCard 
                                show={show} 
                                isAdded={watchlistIds.has(show.id)} 
                                onClick={() => !isDragging && router.push(`/dashboard/tv/${show.id}`)} 
                                onToggle={() => onToggle(show.id)} 
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// 3. SHOW CARD
function ShowCard({ show, isAdded, onClick, onToggle }: any) {
    return (
        <div onClick={onClick} className="group relative aspect-[2/3] bg-[#1a1a1a] rounded-2xl overflow-hidden cursor-pointer border border-white/5 hover:border-[#ccff00]/50 transition-all duration-500 hover:scale-105 hover:shadow-[0_0_30px_rgba(204,255,0,0.15)] hover:z-30">
            <img 
                src={getImageUrl(show.poster_path)} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                loading="lazy"
                alt={show.name}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-[#000000]/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
            
            <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className={`absolute top-2 left-2 p-2 rounded-full backdrop-blur-md transition-all z-10 cursor-pointer shadow-lg hover:scale-110 active:scale-90 ${isAdded ? 'bg-[#ccff00] text-black' : 'bg-black/40 text-white hover:bg-white hover:text-black'}`}>
                {isAdded ? <Bookmark size={14} fill="black" /> : <Plus size={14} />}
            </button>
            
            <div className="absolute bottom-0 p-3 w-full translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                <h3 className="text-xs md:text-sm font-bold text-white line-clamp-1 text-right drop-shadow-md">{show.name}</h3>
                
                {show.vote_average > 0 && (
                    <div className="flex justify-end items-center mt-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] text-[#ccff00] flex items-center gap-0.5 bg-black/50 px-1.5 py-0.5 rounded border border-white/20 font-bold">
                            <Star size={8} fill="#ccff00" /> {show.vote_average?.toFixed(1)}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

// 4. CINEMATIC DNA & MAGIC TICKET HERO
function CinematicHero({ recommendedShow, router }: any) {
    
    // استخراج دیتای سریال برای بلیت طلایی
    const showImage = getBackdropUrl(recommendedShow?.backdrop_path || recommendedShow?.poster_path);
    const originalName = recommendedShow?.original_name || recommendedShow?.name || "The Last of Us";
    const rating = recommendedShow?.vote_average ? recommendedShow.vote_average.toFixed(1) : "N/A";
    const genres = recommendedShow?.genres?.map((g: any) => g.name).join(' • ') || "درام • هیجان‌انگیز";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 mb-12 animate-in slide-in-from-bottom-8 duration-700">
            
            {/* --- بخش DNA سینمایی --- */}
            <div className="lg:col-span-7 relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 md:p-8 overflow-visible shadow-2xl group">
                <div className="absolute -top-32 -right-32 w-64 h-64 bg-purple-600/30 blur-[100px] rounded-full mix-blend-screen group-hover:bg-purple-500/40 transition-colors duration-700 pointer-events-none z-0"></div>
                
                <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-right">
                    
                    {/* آواتار */}
                    <div className="relative shrink-0">
                        <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-br from-fuchsia-500 via-purple-600 to-cyan-400 animate-spin-slow shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                            <div className="w-full h-full bg-[#050505] rounded-full flex items-center justify-center overflow-hidden border-2 border-black">
                                <span className="text-4xl">🎬</span>
                            </div>
                        </div>
                        <div className="absolute -bottom-3 -right-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg border border-white/20 whitespace-nowrap">
                            VIP USER
                        </div>
                    </div>

                    {/* اطلاعات DNA */}
                    <div className="flex-1 space-y-3 w-full mt-2 sm:mt-0">
                        <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-cyan-200">
                            هویت سینمایی شما
                        </h2>
                        
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden flex shadow-inner">
                            <div className="h-full bg-gradient-to-r from-fuchsia-500 to-purple-500 w-[70%]"></div>
                            <div className="h-full bg-cyan-400 w-[30%]"></div>
                        </div>
                        
                        {/* تگ‌های هویتی با Tooltip */}
                        <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
                            
                            {/* تگ ۱ */}
                            <div className="relative group/tag cursor-help">
                                <span className="text-xs font-bold bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-lg text-gray-300 block">
                                    ۷۰٪ درام، ۳۰٪ هیجان‌انگیز
                                </span>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-[#111] text-gray-300 text-[10px] rounded-xl opacity-0 group-hover/tag:opacity-100 transition-opacity duration-300 pointer-events-none z-50 border border-white/10 shadow-2xl text-center leading-relaxed">
                                    <strong className="text-white block mb-1">ترکیب ژانرها</strong>
                                    بیشتر سریال‌هایی که تماشا کرده‌اید در این دو ژانر دسته‌بندی می‌شوند.
                                </div>
                            </div>

                            {/* تگ ۲ */}
                            <div className="relative group/tag cursor-help">
                                <span className="text-xs font-bold bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2.5 py-1.5 rounded-lg block">
                                    فاز: فضای تاریک
                                </span>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-[#111] text-gray-300 text-[10px] rounded-xl opacity-0 group-hover/tag:opacity-100 transition-opacity duration-300 pointer-events-none z-50 border border-white/10 shadow-2xl text-center leading-relaxed">
                                    <strong className="text-purple-400 block mb-1">اتمسفر غالب</strong>
                                    بر اساس دیتای TMDB، سلیقه فعلی شما به سمت سریال‌های رازآلود و تاریک گرایش دارد.
                                </div>
                            </div>

                            {/* تگ ۳ */}
                            <div className="relative group/tag cursor-help">
                                <span className="text-xs font-bold bg-pink-500/10 border border-pink-500/20 text-pink-300 px-2.5 py-1.5 rounded-lg block">
                                    دنبال‌کننده آثار ترند
                                </span>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-[#111] text-gray-300 text-[10px] rounded-xl opacity-0 group-hover/tag:opacity-100 transition-opacity duration-300 pointer-events-none z-50 border border-white/10 shadow-2xl text-center leading-relaxed">
                                    <strong className="text-pink-400 block mb-1">الگوی تماشا</strong>
                                    شما معمولاً سریال‌هایی را می‌بینید که در لیست پرمخاطب‌ترین‌های سال قرار دارند.
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            {/* --- بخش بلیت طلایی اختصاصی (ویرایش شده) --- */}
            <div className="lg:col-span-5 relative bg-[#111] border border-[#ccff00]/30 rounded-[2rem] p-1 overflow-hidden shadow-[0_0_40px_rgba(204,255,0,0.1)] group flex min-h-[220px]">
                
                {/* تصویر پس‌زمینه تار و بلار */}
                <div 
                    className="absolute inset-0 bg-cover bg-center opacity-40 blur-sm scale-110 group-hover:scale-100 transition-transform duration-1000"
                    style={{ backgroundImage: `url(${showImage})` }}
                ></div>
                
                {/* گرادینت برای خوانایی متن */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent z-0"></div>
                
                {/* بریدگی‌های بلیت */}
                <div className="absolute top-1/2 -left-3 w-6 h-6 bg-[#050505] rounded-full -translate-y-1/2 border-r border-[#ccff00]/30 z-20"></div>
                <div className="absolute top-1/2 -right-3 w-6 h-6 bg-[#050505] rounded-full -translate-y-1/2 border-l border-[#ccff00]/30 z-20"></div>
                
                <div className="relative z-10 w-full rounded-[1.8rem] p-6 flex flex-col justify-between h-full border border-dashed border-[#ccff00]/20 backdrop-blur-[2px]">
                    
                    <div>
                        <div className="flex justify-between items-start mb-3">
                            <h3 className="text-[#ccff00] text-sm font-black tracking-widest flex items-center gap-2 drop-shadow-md">
                                <Sparkles size={16} /> پیشنهاد طلایی
                            </h3>
                            
                            {/* نمره IMDB / TMDB */}
                            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                                <Star size={12} fill="#ccff00" className="text-[#ccff00]" />
                                <span className="text-xs font-bold text-white ltr">{rating}</span>
                            </div>
                        </div>
                        
                        {/* نام انگلیسی سریال */}
                        <h4 className="text-xl md:text-2xl font-black text-white line-clamp-1 leading-tight ltr text-left drop-shadow-lg font-sans mt-2">
                            {originalName}
                        </h4>
                        {/* 👇 این بخش اضافه شده 👇 */}
                        <p className="text-[11px] md:text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed opacity-80 italic">
                            {recommendedShow?.overview || "خلاصه‌ای برای این اثر در دسترس نیست."}
                        </p>
                        {/* 👆 پایان بخش اضافه شده 👆 */}
                        {/* ژانرها */}
                        <p className="text-xs font-bold text-gray-300 mt-2 opacity-90">
                            {genres}
                        </p>
                    </div>

                    <div className="mt-5">
                        <button 
                            onClick={() => recommendedShow?.id && router.push(`/dashboard/tv/${recommendedShow.id}`)}
                            className="w-full bg-[#ccff00] hover:bg-white text-black font-black text-sm py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(204,255,0,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            ورود به صفحه سریال
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
}

function DashboardFooter() {
    return (
        <footer className="mt-20 border-t border-white/5 bg-[#080808] relative z-10">
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    <div className="col-span-1 md:col-span-2 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#ccff00] rounded-lg flex items-center justify-center text-black font-black">B</div>
                            <span className="text-xl font-black text-white">Binger</span>
                        </div>
                        <p className="text-gray-400 text-xs leading-relaxed max-w-sm text-justify">
                            بینجر پلتفرم هوشمند مدیریت و کشف سریال است. با بینجر همیشه می‌دونی چی ببینی و تا کجا دیدی.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-bold text-white mb-4">دسترسی سریع</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><a href="#" className="hover:text-[#ccff00]">تازه ترین ها</a></li>
                            <li><a href="#" className="hover:text-[#ccff00]">برترین های IMDB</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-white mb-4">ما را دنبال کنید</h4>
                        <div className="flex gap-4">
                            <a href="#" className="p-2 bg-white/5 rounded-full hover:bg-[#ccff00] hover:text-black transition-all"><Twitter size={18} /></a>
                            <a href="#" className="p-2 bg-white/5 rounded-full hover:bg-[#ccff00] hover:text-black transition-all"><Instagram size={18} /></a>
                        </div>
                    </div>
                </div>
                <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-gray-500">© ۲۰۲۶ تمامی حقوق برای <span className="text-[#ccff00]">Binger</span> محفوظ است.</p>
                </div>
            </div>
        </footer>
    );
}