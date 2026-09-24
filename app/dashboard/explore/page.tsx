"use client";

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { 
  getTrendingShows, getImageUrl, getBackdropUrl, 
  getShowDetails, getIranianShows, getTopRatedShows,
  getKoreanShows, getTeenShows, getMiniSeries,
  searchShows, advancedDiscoverShows,
  getShowsByGenre
} from '@/lib/tmdbClient';
import { 
  AlertTriangle, Plus, Info, Check, Bookmark, 
  Activity, ChevronLeft, ChevronRight, Twitter, Instagram, Sparkles,
  ArrowLeft, Flame, Star, Search, SlidersHorizontal, RotateCcw,
  X, Layers, Globe, Eye, Tv, Share2, Lock, Clapperboard, Loader2
} from 'lucide-react';

// --- GENRE TRANSLATIONS ---
const GENRE_MAP: Record<number, string> = {
  10759: 'اکشن و ماجراجویی',
  16: 'انیمیشن',
  35: 'کمدی',
  80: 'جنایی',
  99: 'مستند',
  18: 'درام',
  10751: 'خانوادگی',
  10762: 'کودک و نوجوان',
  9648: 'معمایی و رازآلود',
  10765: 'علمی‌تخیلی و فانتزی',
  10766: 'عاشقانه',
  10768: 'جنگی و تاریخی',
  37: 'وسترن',
};

const FILTER_GENRES = [
  { id: 18, name: 'درام' },
  { id: 35, name: 'کمدی' },
  { id: 80, name: 'جنایی' },
  { id: 9648, name: 'معمایی' },
  { id: 10765, name: 'علمی‌تخیلی' },
  { id: 10759, name: 'اکشن' },
  { id: 16, name: 'انیمیشن' },
  { id: 10766, name: 'عاشقانه' },
  { id: 99, name: 'مستند' },
];

const FILTER_COUNTRIES = [
  { code: 'IR', label: '🇮🇷 ایران' },
  { code: 'KR', label: '🇰🇷 کره جنوبی (کی‌دراما)' },
  { code: 'US', label: '🇺🇸 آمریکا / هالیوود' },
  { code: 'JP', label: '🇯🇵 ژاپن (انیمه)' },
  { code: 'GB', label: '🇬🇧 انگلستان' },
  { code: 'TR', label: '🇹🇷 ترکیه' },
];

const FILTER_RATINGS = [
  { value: 7, label: '★ بالای ۷' },
  { value: 8, label: '★ بالای ۸' },
  { value: 8.5, label: '★ شاهکار (+۸.۵)' },
];

// --- SKELETON LOADER ---
const DashboardSkeleton = () => (
  <div className="w-full min-h-screen bg-[#050505] p-4 md:p-8 space-y-10 animate-pulse">
    <div className="w-full h-16 bg-white/5 rounded-2xl" />
    <div className="w-full h-[32vh] bg-white/5 rounded-3xl" />
    {[1, 2, 3].map((i) => (
      <div key={i} className="space-y-4">
        <div className="w-48 h-6 bg-white/10 rounded-lg"></div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4, 5].map((j) => (
            <div key={j} className="w-36 h-52 bg-white/5 rounded-2xl shrink-0"></div>
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
  
  // Data States
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set());
  const [watchedIds, setWatchedIds] = useState<number[]>([]);
  const [allShowIds, setAllShowIds] = useState<number[]>([]);
  
  const [myFeed, setMyFeed] = useState<any[]>([]);
  const [categories, setCategories] = useState<{
    iranian: any[];
    trending: any[];
    topRated: any[];
    korean: any[];
    teen: any[];
    miniSeries: any[];
  }>({
    iranian: [],
    trending: [],
    topRated: [],
    korean: [],
    teen: [],
    miniSeries: [],
  });
  const [userCustomLists, setUserCustomLists] = useState<any[]>([]);

  // AI Spotlight State (Must have Persian overview)
  const [spotlightShow, setSpotlightShow] = useState<any | null>(null);
  const [spotlightReason, setSpotlightReason] = useState<string>('');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedSort, setSelectedSort] = useState<string>('popularity.desc');
  const [showFilters, setShowFilters] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    selectedGenre !== null ||
    selectedRating !== null ||
    selectedCountry !== null ||
    selectedSort !== 'popularity.desc'
  );

  const activeFilterCount = [
    selectedGenre !== null,
    selectedRating !== null,
    selectedCountry !== null,
    selectedSort !== 'popularity.desc',
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedGenre(null);
    setSelectedRating(null);
    setSelectedCountry(null);
    setSelectedSort('popularity.desc');
    setSearchResults([]);
  };

  // --- Search & Filter Effect ---
  useEffect(() => {
    if (!hasActiveFilters) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        if (searchQuery.trim()) {
          const results = await searchShows(searchQuery.trim());
          let filtered = results || [];

          if (selectedGenre) {
            filtered = filtered.filter((s: any) => s.genre_ids?.includes(selectedGenre));
          }
          if (selectedRating) {
            filtered = filtered.filter((s: any) => (s.vote_average || 0) >= selectedRating);
          }
          if (selectedCountry) {
            filtered = filtered.filter((s: any) => s.origin_country?.includes(selectedCountry));
          }
          setSearchResults(filtered.filter((s: any) => s.poster_path));
        } else {
          const results = await advancedDiscoverShows({
            genreId: selectedGenre,
            minRating: selectedRating,
            originCountry: selectedCountry,
            sortBy: selectedSort,
          });
          setSearchResults((results || []).filter((s: any) => s.poster_path));
        }
      } catch (err) {
        console.error('Search / Filter error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedGenre, selectedRating, selectedCountry, selectedSort, hasActiveFilters]);

  // --- Main Data Initialization ---
  useEffect(() => {
    let isCancelled = false;

    const initData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { 
          router.replace('/login'); 
          return; 
        }
        if (isCancelled) return;
        setUser(user);

        // ۱. دریافت دیتای کاربر از دیتابیس
        const { data: wList } = await supabase.from('favorites').select('show_id').eq('user_id', user.id);

        let allWatchedRows: any[] = [];
        let page = 0;
        let hasMore = true;

        while (hasMore) {
          const { data } = await supabase
            .from('watched')
            .select('show_id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .range(page * 1000, (page + 1) * 1000 - 1);

          if (!data || data.length === 0) {
            hasMore = false;
          } else {
            allWatchedRows = [...allWatchedRows, ...data];
            if (data.length < 1000) hasMore = false;
            else page++;
          }
        }

        const wIds: number[] = wList?.map((i: any) => Number(i.show_id)) || [];
        const wEdIds: number[] = allWatchedRows?.map((i: any) => Number(i.show_id)) || [];
        
        const uniqueWatchedIds: number[] = Array.from(new Set(wEdIds));
        const allUserShowIds: number[] = Array.from(new Set([...wIds, ...wEdIds]));
        const allUserShowIdsSet = new Set(allUserShowIds); 
        
        setWatchlistIds(new Set(wIds));
        setWatchedIds(uniqueWatchedIds);
        setAllShowIds(allUserShowIds);

        // ۲. محاسبه ادامه تماشا
        if (uniqueWatchedIds.length > 0) {
          const recentWatchedIds = uniqueWatchedIds.slice(0, 15);
          const myShowsRaw = await Promise.all(
            recentWatchedIds.map((id: number) => getShowDetails(String(id)).catch(() => null))
          );
          
          const validShows = myShowsRaw.filter(Boolean);
          const continueWatchingShows: any[] = [];

          validShows.forEach((show: any) => {
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

          if (!isCancelled) setMyFeed(continueWatchingShows.slice(0, 10));
        }

        // ۳. دریافت ۷ دسته‌بندی اصلی طبق خواسته کاربر:
        // - یک ردیف مخصوص سریال‌های ایرانی
        // - سریال‌های ترند
        // - برترین سریال‌ها
        // - سریال‌های کره‌ای جدید
        // - سریال‌های تینیجری
        // - بهترین مینی‌سریال‌ها
        // - لیست‌های برتری که کاربرا ساختن
        const fetchSafely = async (fn: () => Promise<any>, fallback: any[] = []) => {
          try { return await fn(); } catch (e) { return fallback; }
        };

        const [iranian, trending, topRated, korean, teen, miniSeries, customListsRes] = await Promise.all([
          fetchSafely(getIranianShows, []),
          fetchSafely(getTrendingShows, []),
          fetchSafely(getTopRatedShows, []),
          fetchSafely(getKoreanShows, []),
          fetchSafely(getTeenShows, []),
          fetchSafely(getMiniSeries, []),
          // دریافت لیست‌های عمومی کاربران از سوپابیس
          supabase
            .from('user_lists')
            .select(`
              id,
              title,
              description,
              user_id,
              is_public,
              created_at,
              list_items ( id, show_id, show_name, poster_path )
            `)
            .eq('is_public', true)
            .order('created_at', { ascending: false })
            .limit(10),
        ]);

        if (isCancelled) return;

        setCategories({
          iranian: iranian || [],
          trending: trending ? trending.slice(0, 15) : [],
          topRated: topRated ? topRated.slice(0, 15) : [],
          korean: korean ? korean.slice(0, 15) : [],
          teen: teen ? teen.slice(0, 15) : [],
          miniSeries: miniSeries ? miniSeries.slice(0, 15) : [],
        });

        // غنی‌سازی اطلاعات سازندگان لیست‌های عمومی
        const rawLists = customListsRes?.data || [];
        if (rawLists.length > 0) {
          const userIds = Array.from(new Set(rawLists.map((l: any) => l.user_id)));
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', userIds);

          const profileMap = new Map((profilesData || []).map((p: any) => [p.id, p]));
          const enrichedLists = rawLists.map((l: any) => ({
            ...l,
            creator: profileMap.get(l.user_id) || null,
          }));
          setUserCustomLists(enrichedLists);
        }

        // ۴. الگوریتم هوشمند پیشنهاد ویژه بالا کنار DNA سینمایی
        // شرط قطعی: فقط سریالی که برایش «توضیح فارسی» وجود دارد + یادداشت دلیل بر اساس ژانر
        await calculateSpotlightShow({
          uniqueWatchedIds,
          allUserShowIdsSet,
          trending: trending || [],
          topRated: topRated || [],
          iranian: iranian || [],
        });

      } catch (err: any) {
        console.error('Explore Init Error:', err);
        if (!isCancelled) setErrorMsg('خطا در بارگذاری محتوا.');
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    initData();

    return () => {
      isCancelled = true;
    };
  }, []);

  // محاسبه پیشنهاد ویژه با شرط توضیح فارسی و یادداشت دلیل
  const calculateSpotlightShow = async ({
    uniqueWatchedIds,
    allUserShowIdsSet,
    trending,
    topRated,
    iranian,
  }: any) => {
    try {
      const genreCounts: Record<number, number> = {};

      // دریافت سبک ژانرهای تماشا شده کاربر
      if (uniqueWatchedIds.length > 0) {
        const sampleWatchedIds = uniqueWatchedIds.slice(0, 12);
        const watchedDetails = await Promise.all(
          sampleWatchedIds.map((id: number) => getShowDetails(String(id)).catch(() => null))
        );

        watchedDetails.forEach((show: any) => {
          if (show?.genres) {
            show.genres.forEach((g: any) => {
              genreCounts[g.id] = (genreCounts[g.id] || 0) + 1;
            });
          }
        });
      }

      // یافتن بیشترین ژانر تماشا شده
      let topGenreId = 18;
      let maxCount = 0;
      Object.entries(genreCounts).forEach(([gId, count]) => {
        if (count > maxCount) {
          maxCount = count;
          topGenreId = Number(gId);
        }
      });

      const topGenreName = GENRE_MAP[topGenreId] || 'درام';

      // کاندیداهای پیشنهادی برای بررسی داشتن توضیح فارسی
      let candidatePool: any[] = [];

      if (maxCount > 0) {
        const genreShows = await getShowsByGenre(topGenreId, 1);
        candidatePool = genreShows || [];
      }

      candidatePool = [
        ...candidatePool,
        ...(trending || []),
        ...(topRated || []),
        ...(iranian || []),
      ];

      // فیلتر سریال‌هایی که کاربر قبلاً ندیده
      const unvisitedCandidates = candidatePool.filter(
        (show: any) => !allUserShowIdsSet.has(show.id) && show.poster_path
      );

      // بررسی سریال‌ها برای یافتن اثری با «خلاصه داستان فارسی» معتبر
      let selectedSpotlight: any = null;

      for (const candidate of unvisitedCandidates.slice(0, 15)) {
        const details = await getShowDetails(String(candidate.id));
        if (
          details &&
          details.overview &&
          /[\u0600-\u06FF]/.test(details.overview) &&
          details.overview.trim().length > 25
        ) {
          selectedSpotlight = details;
          break;
        }
      }

      // اگر در کاندیداها پیدا نشد، از سریال‌های ایرانی که حتماً فارسی دارند استفاده کن
      if (!selectedSpotlight && iranian && iranian.length > 0) {
        for (const irShow of iranian) {
          const details = await getShowDetails(String(irShow.id));
          if (details && details.overview && /[\u0600-\u06FF]/.test(details.overview)) {
            selectedSpotlight = details;
            break;
          }
        }
      }

      if (selectedSpotlight) {
        setSpotlightShow(selectedSpotlight);
        if (maxCount > 0) {
          setSpotlightReason(
            `چون ${maxCount} تا سریال از ژانر «${topGenreName}» تو سریال‌هایی که دیدید هست، پس اینم باید ببینید:`
          );
        } else {
          setSpotlightReason(
            'بر اساس شاهکارهای دارای شناسنامه و توضیح کامل فارسی در بینجر، این اثر فوق‌العاده برای شما گلچین شده:'
          );
        }
      }
    } catch (e) {
      console.error('Error calculating spotlight show:', e);
    }
  };

  const toggleWatchlist = async (showId: number) => {
    const isAdded = watchlistIds.has(showId);
    setWatchlistIds(prev => {
      const next = new Set(prev);
      if (isAdded) next.delete(showId);
      else next.add(showId);
      return next;
    });
    setToastMsg(isAdded ? "از لیست انتظار حذف شد 🗑️" : "به لیست انتظار اضافه شد ✅");
    setTimeout(() => setToastMsg(null), 3000);
    
    if (user) {
      if (isAdded) await supabase.from('favorites').delete().eq('user_id', user.id).eq('show_id', showId);
      else await supabase.from('favorites').insert({ user_id: user.id, show_id: showId });
    }
  };

  if (loading) return <DashboardSkeleton />;
  if (errorMsg) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-red-500 gap-4 bg-[#050505]">
      <AlertTriangle size={48} />
      <p>{errorMsg}</p>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-700 relative w-full overflow-hidden flex flex-col min-h-screen bg-[#050505] text-white font-['Vazirmatn'] pb-28 md:pb-12" dir="rtl">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[200] bg-[#ccff00] text-black px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-5">
          <Info size={20} /> {toastMsg}
        </div>
      )}

      <div className="relative z-10 px-4 md:px-8 space-y-10 md:space-y-14 flex-1 max-w-7xl mx-auto w-full pt-4">
        
        {/* ================= ۱. سیستم جستجو و فیلتر پیشرفته در بالای صفحه ================= */}
        <div className="bg-[#111] border border-white/10 rounded-3xl p-4 md:p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            
            {/* اینپوت سرچ زنده */}
            <div className="relative flex-1 w-full">
              <Search size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی سریع هر سریالی در جهان (فارسی، انگلیسی یا کلمات کلیدی)..."
                className="w-full bg-[#080808] border border-white/15 focus:border-[#ccff00] rounded-2xl pr-12 pl-10 py-3.5 text-sm text-white placeholder-gray-500 outline-none transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* دکمه باز و بسته کردن فیلترهای پیشرفته */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                  showFilters || activeFilterCount > 0
                    ? 'bg-[#ccff00] text-black border-[#ccff00] shadow-[0_0_15px_rgba(204,255,0,0.3)]'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                }`}
              >
                <SlidersHorizontal size={16} />
                <span>فیلترهای پیشرفته</span>
                {activeFilterCount > 0 && (
                  <span className="bg-black text-[#ccff00] px-1.5 py-0.5 rounded-full text-[10px] font-black">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1.5 px-3 py-3.5 rounded-2xl text-xs text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all cursor-pointer"
                  title="پاکسازی همه فیلترها"
                >
                  <RotateCcw size={14} />
                  <span className="hidden sm:inline">پاکسازی</span>
                </button>
              )}
            </div>
          </div>

          {/* پنل کشویی فیلترها */}
          {showFilters && (
            <div className="mt-5 pt-5 border-t border-white/10 space-y-4 animate-in fade-in duration-200">
              
              {/* فیلتر ژانرها */}
              <div>
                <span className="text-xs font-bold text-gray-400 block mb-2">دسته‌بندی و ژانر:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSelectedGenre(null)}
                    className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                      selectedGenre === null ? 'bg-[#ccff00] text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    همه ژانرها
                  </button>
                  {FILTER_GENRES.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGenre(selectedGenre === g.id ? null : g.id)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        selectedGenre === g.id ? 'bg-[#ccff00] text-black shadow-md' : 'bg-white/5 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* کشور و امتیاز */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* کشور سازنده */}
                <div>
                  <span className="text-xs font-bold text-gray-400 block mb-2 flex items-center gap-1">
                    <Globe size={13} className="text-[#ccff00]" /> کشور سازنده:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setSelectedCountry(null)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        selectedCountry === null ? 'bg-[#ccff00] text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      همه
                    </button>
                    {FILTER_COUNTRIES.map((c) => (
                      <button
                        key={c.code}
                        onClick={() => setSelectedCountry(selectedCountry === c.code ? null : c.code)}
                        className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                          selectedCountry === c.code ? 'bg-cyan-400 text-black shadow-md' : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* حداقل امتیاز */}
                <div>
                  <span className="text-xs font-bold text-gray-400 block mb-2 flex items-center gap-1">
                    <Star size={13} className="text-amber-400" /> حداقل امتیاز IMDB:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setSelectedRating(null)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        selectedRating === null ? 'bg-[#ccff00] text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      همه
                    </button>
                    {FILTER_RATINGS.map((r) => (
                      <button
                        key={r.value}
                        onClick={() => setSelectedRating(selectedRating === r.value ? null : r.value)}
                        className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                          selectedRating === r.value ? 'bg-amber-400 text-black shadow-md' : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* مرتب‌سازی */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400">مرتب‌سازی نتایج:</span>
                  <select
                    value={selectedSort}
                    onChange={(e) => setSelectedSort(e.target.value)}
                    className="bg-[#080808] border border-white/15 text-white rounded-xl px-3 py-1.5 text-xs outline-none focus:border-[#ccff00]"
                  >
                    <option value="popularity.desc">محبوب‌ترین‌ها</option>
                    <option value="vote_average.desc">بالاترین امتیاز IMDB</option>
                    <option value="first_air_date.desc">جدیدترین انتشار</option>
                  </select>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* ================= نتایج جستجو و فیلتر (در صورت فعال بودن) ================= */}
        {hasActiveFilters && (
          <div className="animate-in fade-in duration-300 space-y-4">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Sparkles size={18} className="text-[#ccff00]" />
                <span>
                  {searchQuery.trim()
                    ? `نتایج جستجو برای: «${searchQuery}»`
                    : 'سریال‌های منطبق بر فیلترهای انتخابی'}
                </span>
                <span className="text-xs text-gray-400 font-normal">
                  ({searchResults.length} اثر)
                </span>
              </h2>
            </div>

            {isSearching ? (
              <div className="flex flex-col items-center justify-center py-20 text-[#ccff00] gap-3">
                <div className="w-8 h-8 border-2 border-[#ccff00] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-gray-400">در حال جستجوی هوشمند...</span>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {searchResults.map((show) => (
                  <ShowCard
                    key={show.id}
                    show={show}
                    isAdded={watchlistIds.has(show.id)}
                    onClick={() => router.push(`/dashboard/tv/${show.id}`)}
                    onToggle={() => toggleWatchlist(show.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white/[0.02] border border-dashed border-white/10 rounded-3xl p-8">
                <Tv size={48} className="text-gray-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-gray-300">سریالی مطابق با این جستجو یا فیلتر یافت نشد</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  لطفاً فیلترها را تغییر داده یا از کلمات کلیدی دیگری استفاده کنید.
                </p>
                <button
                  onClick={resetFilters}
                  className="mt-4 px-4 py-2 bg-white/10 hover:bg-[#ccff00] hover:text-black rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  پاکسازی فیلترها
                </button>
              </div>
            )}
          </div>
        )}

        {/* اگر سرچ فعال نباشد، محتوای غنی کاروسلی اکسپلور نمایش داده می‌شود */}
        {!hasActiveFilters && (
          <>
            {/* ۱. راهنمای مراحل اولیه کاربر (Onboarding Gamification) */}
            <OnboardingSteps 
              wIds={Array.from(watchlistIds)} 
              wEdIds={watchedIds} 
              allUserShowIds={allShowIds} 
              router={router} 
            />

            {/* ۲. بخش بالایی: DNA سینمایی + کارت پیشنهاد ویژه با کاور، توضیح فارسی و دلیل */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              {/* ستون اول: کارت هویت و DNA سینمایی کاربر */}
              <div className="h-full">
                <CinematicIdentityCard 
                  uniqueWatchedIds={watchedIds}
                  allUserShowIds={allShowIds}
                />
              </div>

              {/* ستون دوم: کارت پیشنهاد ویژه هوشمند (فقط با توضیح فارسی و یادداشت دلیل) */}
              {spotlightShow && (
                <SpotlightShowCard
                  show={spotlightShow}
                  reason={spotlightReason}
                  isAdded={watchlistIds.has(spotlightShow.id)}
                  onToggle={() => toggleWatchlist(spotlightShow.id)}
                  router={router}
                />
              )}
            </div>

            {/* ادامه تماشا (اگر کاربر دیتای فعال دارد) */}
            {myFeed.length > 0 && (
              <div className="relative animate-in slide-in-from-bottom-6">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="text-[#ccff00] animate-pulse" size={24} />
                  <h2 className="text-lg md:text-2xl font-black text-white">ادامه تماشا</h2>
                </div>
                <CarouselSection items={myFeed} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} />
              </div>
            )}

            {/* ================= ردیف‌های کاروسلی ۷ گانه مشخص شده توسط کاربر ================= */}

            {/* ۱. فقط یک ردیف مخصوص سریال‌های ایرانی */}
            <CarouselSection 
              title="سریال‌های منتخب و محبوب ایرانی" 
              items={categories.iranian} 
              watchlistIds={watchlistIds} 
              router={router} 
              onToggle={toggleWatchlist} 
              badge="🇮🇷 ایرانی"
            />

            {/* ۲. سریال‌های ترند */}
            <div className="bg-white/[0.02] p-5 md:p-6 rounded-3xl border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/10 blur-[60px] rounded-full pointer-events-none"></div>
              <div className="flex items-center gap-2 mb-4 relative z-10">
                <Flame className="text-red-500 fill-red-500" />
                <h2 className="text-xl font-black text-white">سریال‌های ترند جهان</h2>
              </div>
              <CarouselSection items={categories.trending} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} />
            </div>

            {/* ۳. برترین سریال‌ها (Top Rated) */}
            <CarouselSection 
              title="شاهکارهای تاریخ (برترین سریال‌های IMDB)" 
              items={categories.topRated} 
              watchlistIds={watchlistIds} 
              router={router} 
              onToggle={toggleWatchlist} 
              badge="★ برترین‌ها"
            />

            {/* ۴. سریال‌های کره‌ای جدید */}
            <CarouselSection 
              title="جدیدترین سریال‌های کره‌ای (K-Drama)" 
              items={categories.korean} 
              watchlistIds={watchlistIds} 
              router={router} 
              onToggle={toggleWatchlist} 
              badge="🇰🇷 کره‌ای"
            />

            {/* ۵. سریال‌های تینیجری */}
            <CarouselSection 
              title="سریال‌های محبوب تینیجری و درام جوانان" 
              items={categories.teen} 
              watchlistIds={watchlistIds} 
              router={router} 
              onToggle={toggleWatchlist} 
              badge="✨ تینیجری"
            />

            {/* ۶. بهترین مینی‌سریال‌ها */}
            <CarouselSection 
              title="بهترین مینی‌سریال‌های شاهکار و کوتاه" 
              items={categories.miniSeries} 
              watchlistIds={watchlistIds} 
              router={router} 
              onToggle={toggleWatchlist} 
              badge="🎬 مینی‌سریال"
            />

            {/* ۷. لیست‌های برتری که کاربرا ساختن */}
            {userCustomLists.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2 mr-2 border-r-4 border-[#ccff00]">
                  <div>
                    <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                      <Layers className="text-[#ccff00]" size={20} />
                      <span>لیست‌های برتری که کاربران ساختند</span>
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">کالکشن‌های اختصاصی دست‌چین شده توسط جامعه بینجرها</p>
                  </div>

                  <Link 
                    href="/dashboard/custom-lists/explore"
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#ccff00] transition-colors cursor-pointer px-2 py-1"
                  >
                    <span>مشاهده همه</span>
                    <ArrowLeft size={14} />
                  </Link>
                </div>

                <div className="flex gap-4 overflow-x-auto px-2 py-2 no-scrollbar">
                  {userCustomLists.map((list) => {
                    const items = list.list_items || [];
                    return (
                      <Link
                        key={list.id}
                        href={`/dashboard/custom-lists/${list.id}`}
                        className="shrink-0 w-72 sm:w-80 bg-[#121212] border border-white/10 hover:border-[#ccff00]/40 rounded-3xl p-5 transition-all block group shadow-xl"
                      >
                        <div className="flex justify-between items-start mb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-white/10 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold">
                              {list.creator?.avatar_url || '😎'}
                            </span>
                            <span className="text-xs text-gray-300 font-bold truncate max-w-[120px]">
                              {list.creator?.username || 'کاربر بینجر'}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-400 font-bold bg-white/5 px-2 py-0.5 rounded-lg">
                            {items.length} سریال
                          </span>
                        </div>

                        <h4 className="text-sm font-black text-white group-hover:text-[#ccff00] transition-colors line-clamp-1 mb-1">
                          {list.title}
                        </h4>

                        {list.description && (
                          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-3">
                            {list.description}
                          </p>
                        )}

                        {/* پیش‌نمایش پوسترها */}
                        {items.length > 0 && (
                          <div className="flex gap-1.5 overflow-hidden mt-2">
                            {items.slice(0, 4).map((item: any) => (
                              <div key={item.id} className="w-12 h-16 rounded-lg overflow-hidden bg-black shrink-0 border border-white/10">
                                <img src={getImageUrl(item.poster_path)} alt={item.show_name} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

      </div>

      <DashboardFooter />
    </div>
  );
}

// ================= زیرکامپوننت‌ها =================

// لیست ۱۶ تخصص پزشکی-سینمایی بینجر
const SPECIALTIES = [
  { id: 'comedy', name: 'فوق تخصص قهقهه', genreId: 35, desc: 'عاشق کمدی و سیت‌کام' },
  { id: 'mystery', name: 'متخصص مغز و اعصاب', genreId: 9648, desc: 'عاشق معما، فضاهای دارک و روانشناختی' },
  { id: 'kdrama', name: 'دکتر کی‌دراما', isKdrama: true, desc: 'طرفدار پر و پا قرص سریال‌های کره‌ای' },
  { id: 'horror', name: 'فوق تخصص ترس', genreId: 27, desc: 'معتاد هیجان، ترس و زامبی' },
  { id: 'crime', name: 'متخصص پزشکی قانونی', genreId: 80, desc: 'عاشق پرونده‌های جنایی و کارآگاهی' },
  { id: 'epic', name: 'دکتر اپیک', genreId: 10765, desc: 'غرق در فانتزی، تاریخ و دنیاهای حماسی' },
  { id: 'mini', name: 'مینی دکتر', isMini: true, desc: 'متخصص مینی‌سریال‌های کوتاه و جمع‌وجور' },
  { id: 'action', name: 'دکتر آدرنالین', genreId: 10759, desc: 'عاشق اکشن، هیجان و بقا' },
  { id: 'teen', name: 'دکتر تین', isTeen: true, desc: 'علاقه‌مند به درام‌های دبیرستانی و تین‌ایجری' },
  { id: 'romance', name: 'دکتر رومنس', genreId: 10766, desc: 'پیگیر داستان‌های عاشقانه و رمانتیک' },
  { id: 'scifi', name: 'دکتر خیالباف', isScifi: true, genreId: 10765, desc: 'سفر در زمان و دنیاهای آینده' },
  { id: 'western', name: 'دکتر کابوی', genreId: 37, desc: 'طرفدار دوآتیشه وسترن' },
  { id: 'musical', name: 'متخصص موزیکولوژی', genreId: 10402, desc: 'عاشق موزیکال و موسیقی' },
  { id: 'doc', name: 'متخصص فکتولوژی', genreId: 99, desc: 'پیگیر مستندها و حقایق واقعی' },
  { id: 'biography', name: 'مدیر بایگانی', isBio: true, desc: 'علاقه‌مند به سرگذشت‌نامه و داستان‌های واقعی' },
];

// کارت هویت و تحلیل سلیقه و DNA سینمایی کاربر
function CinematicIdentityCard({ 
  uniqueWatchedIds: propsWatchedIds, 
  allUserShowIds: propsAllShowIds,
  userProfile: propsUserProfile
}: {
  uniqueWatchedIds?: number[];
  allUserShowIds?: number[];
  userProfile?: any;
}) {
  const supabase = createClient() as any;

  const [loading, setLoading] = useState(true);
  const [watchedCount, setWatchedCount] = useState(0);
  const [displayName, setDisplayName] = useState('کاربر بینجر');
  const [dnaData, setDnaData] = useState<any>(null);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!showStoryModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowStoryModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showStoryModal]);

  useEffect(() => {
    if (showStoryModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showStoryModal]);

  useEffect(() => {
    const fetchAndCalculate = async () => {
      try {
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'کاربر بینجر';
          setDisplayName(name);
        }

        let watchedIds: number[] = propsWatchedIds || [];
        let allShowIds: number[] = propsAllShowIds || [];

        // دریافت نامحدود تمام اپیزودهای تماشا شده از دیتابیس
        if (watchedIds.length === 0 && user) {
          let allWatchedRows: any[] = [];
          let page = 0;
          let hasMore = true;

          while (hasMore) {
            const { data } = await supabase
              .from('watched')
              .select('show_id')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .range(page * 1000, (page + 1) * 1000 - 1);

            if (!data || data.length === 0) {
              hasMore = false;
            } else {
              allWatchedRows = [...allWatchedRows, ...data];
              if (data.length < 1000) {
                hasMore = false;
              } else {
                page++;
              }
            }
          }

          const { data: watchlistRes } = await supabase
            .from('watchlist')
            .select('show_id')
            .eq('user_id', user.id);

          const rawWatched = allWatchedRows.map((i: any) => i.show_id);
          const rawWatchlist = watchlistRes?.map((i: any) => i.show_id) || [];

          watchedIds = Array.from(new Set(rawWatched));
          allShowIds = Array.from(new Set([...rawWatched, ...rawWatchlist]));
        }

        setWatchedCount(watchedIds.length);

        if (watchedIds.length < 5) {
          setLoading(false);
          return;
        }

        // ۱. دریافت مشخصات سریال‌های تماشا شده از TMDB
        const showsDetails = await Promise.all(
          watchedIds.slice(0, 30).map(id => getShowDetails(String(id)).catch(() => null))
        );
        const validShows = showsDetails.filter(Boolean);

        if (validShows.length === 0) {
          setLoading(false);
          return;
        }

        // ۲. پردازش آماری و دسته‌بندی
        const genreHoursMap: Record<string, { name: string; hours: number; count: number; id: number }> = {};
        const creatorsCountMap: Record<string, number> = {};
        const creatorsShowsMap: Record<string, string[]> = {};
        let kdramaCount = 0;
        let miniCount = 0;
        let recentCount = 0;
        let oldiesCount = 0;
        let totalRatingSum = 0;
        let totalWatchedHours = 0;

        const currentYear = new Date().getFullYear();

        validShows.forEach((show: any) => {
          const episodeCount = show.number_of_episodes || 10;
          const avgRuntime = show.episode_run_time?.[0] || 45;
          const showHours = Math.round((episodeCount * avgRuntime) / 60) || 8;
          totalWatchedHours += showHours;

          if (show.vote_average) totalRatingSum += show.vote_average;

          const airYear = show.first_air_date ? new Date(show.first_air_date).getFullYear() : currentYear;
          if (airYear >= currentYear - 3) recentCount++;
          if (airYear < 2015) oldiesCount++;

          if (show.origin_country?.includes('KR')) kdramaCount++;
          if (episodeCount <= 8) miniCount++;

          // ثبت دقیق سازندگان و نام سریال‌هایشان
          show.created_by?.forEach((c: any) => {
            if (c.name) {
              creatorsCountMap[c.name] = (creatorsCountMap[c.name] || 0) + 1;
              if (!creatorsShowsMap[c.name]) {
                creatorsShowsMap[c.name] = [];
              }
              const showTitle = show.name || show.original_name;
              if (showTitle && !creatorsShowsMap[c.name].includes(showTitle)) {
                creatorsShowsMap[c.name].push(showTitle);
              }
            }
          });

          show.genres?.forEach((g: any) => {
            if (g.id === 18) return; // جلوگیری از ثبت ژانر درام به عنوان تخصص اصلی
            if (!genreHoursMap[g.id]) {
              genreHoursMap[g.id] = { name: g.name, hours: 0, count: 0, id: g.id };
            }
            genreHoursMap[g.id].hours += showHours;
            genreHoursMap[g.id].count += 1;
          });
        });

        // ۳. انتخاب تخصص غالب
        const sortedGenres = Object.values(genreHoursMap).sort((a, b) => b.hours - a.hours);
        const topGenre = sortedGenres[0] || { name: 'کمدی', hours: 20, id: 35 };
        let assignedSpecialty = SPECIALTIES.find(s => s.genreId === topGenre.id) || SPECIALTIES.find(s => s.id === 'comedy') || SPECIALTIES[0];

        if (kdramaCount >= validShows.length * 0.4) {
          assignedSpecialty = SPECIALTIES.find(s => s.id === 'kdrama') || assignedSpecialty;
        } else if (miniCount >= validShows.length * 0.5) {
          assignedSpecialty = SPECIALTIES.find(s => s.id === 'mini') || assignedSpecialty;
        }

        // ۴. انتخاب تیپ رفتاری
        let archetype = 'خوش‌سلیقه';
        let archetypeDesc = 'شما گلچینی از بهترین آثار را با دقت انتخاب و تماشا می‌کنید.';
        const avgRating = totalRatingSum / validShows.length;

        if (recentCount / validShows.length > 0.65) {
          archetype = 'ترندباز';
          archetypeDesc = 'بیش از ۶۵٪ آثاری که دیده‌اید از سریال‌های داغ ۳ سال اخیر هستند.';
        } else if (oldiesCount / validShows.length > 0.45) {
          archetype = 'نوستالژی‌باز';
          archetypeDesc = 'بیش از ۴۵٪ از سلیقه شما به کلاسیک‌ها و آثار قبل از ۲۰۱۵ تعلق دارد.';
        } else if (avgRating >= 8.2) {
          archetype = 'شاهکارباز';
          archetypeDesc = 'میانگین نمره سریال‌های انتخابی شما بالای ۸.۲ است؛ فقط شاهکارها!';
        }

        // ۵. محاسبه ۳ ژانر برتر
        const top3Genres = sortedGenres.slice(0, 3);
        const top3TotalHours = top3Genres.reduce((acc, g) => acc + g.hours, 0) || 1;
        const spectrum = top3Genres.map((g, idx) => ({
          name: g.name,
          percent: Math.round((g.hours / top3TotalHours) * 100),
          color: idx === 0 ? 'from-fuchsia-500 to-purple-600' : idx === 1 ? 'from-cyan-400 to-blue-500' : 'from-emerald-400 to-teal-500'
        }));

        // ۶. بهترین سازنده و آثار مرتبط با او
        const sortedCreators = Object.entries(creatorsCountMap).sort(([nameA, countA], [nameB, countB]) => countB - countA);
        const [firstCreator] = sortedCreators;
        const topCreatorName = firstCreator ? firstCreator[0] : 'کارگردانان برجسته';
        const topCreatorShows = firstCreator ? (creatorsShowsMap[topCreatorName] || []) : [];

        setDnaData({
          specialty: assignedSpecialty,
          specialtyHours: topGenre.hours,
          archetype,
          archetypeDesc,
          spectrum,
          topCreator: topCreatorName,
          topCreatorShows: topCreatorShows,
          totalWatchedHours,
          favoriteShows: validShows.slice(0, 3)
        });
      } catch (err) {
        console.error("Error in DNA calculation:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAndCalculate();
  }, [propsWatchedIds, propsAllShowIds]);

  // حالت در حال لود
  if (loading) {
    return (
      <div className="w-full h-full min-h-[300px] bg-white/[0.02] rounded-[2rem] border border-white/10 animate-pulse flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-400" size={32} />
      </div>
    );
  }

  // حالت ۱: کمتر از ۵ سریال (قفل شده)
  if (watchedCount < 5) {
    return (
      <div className="w-full h-full relative bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 md:p-8 overflow-hidden shadow-2xl flex flex-col justify-center min-h-[300px]">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-purple-400 shadow-inner shrink-0">
              <Lock size={28} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                هویت سینمایی شما در حال رمزگشایی است...
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                برای کشف تخصص و DNA سینمایی خود، حداقل ۵ سریال ثبت کنید.
              </p>
            </div>
          </div>

          <div className="w-full md:w-72 bg-black/40 p-4 rounded-2xl border border-white/5">
            <div className="flex justify-between text-xs font-bold mb-2">
              <span className="text-gray-400">پیشرفت تحلیل</span>
              <span className="text-[#ccff00] ltr">{watchedCount} / 5</span>
            </div>
            <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-[#ccff00] transition-all duration-500" 
                style={{ width: `${Math.min((watchedCount / 5) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!dnaData) return null;

  // حالت ۲: فعال و محاسبه شده
  return (
    <div className="w-full h-full relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-4 sm:p-6 md:p-8 overflow-visible shadow-2xl group flex flex-col justify-between animate-in slide-in-from-bottom-8 duration-700">
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-purple-600/30 blur-[100px] rounded-full mix-blend-screen pointer-events-none z-0" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative shrink-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full p-1 bg-gradient-to-br from-fuchsia-500 via-purple-600 to-cyan-400 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                <div className="w-full h-full bg-[#050505] rounded-full flex items-center justify-center overflow-hidden border-2 border-black text-xl sm:text-2xl">
                  🎬
                </div>
              </div>
            </div>
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold text-purple-400 uppercase tracking-widest block">DNA سینمایی بینجر</span>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white mt-0.5">
                {dnaData.specialty.name}
              </h2>
            </div>
          </div>

          <button 
            onClick={() => setShowStoryModal(true)}
            className="p-2.5 sm:p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-gray-300 hover:text-white transition-all flex items-center gap-1.5 sm:gap-2 text-xs font-bold cursor-pointer"
          >
            <Share2 size={16} className="text-[#ccff00]" />
            <span className="hidden sm:inline">کارت استوری</span>
          </button>
        </div>

        <div className="space-y-1.5 mb-5">
          <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden flex shadow-inner">
            {dnaData.spectrum.map((item: any, i: number) => (
              <div 
                key={i} 
                style={{ width: `${item.percent}%` }} 
                className={`h-full bg-gradient-to-r ${item.color}`}
                title={`${item.name}: ${item.percent}%`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[11px] font-bold text-gray-400 px-1">
            {dnaData.spectrum.map((item: any, i: number) => (
              <span key={i}>{item.percent}٪ {item.name}</span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <div className="text-xs font-bold bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2.5 sm:px-3 py-1.5 rounded-xl">
            تخصص: {dnaData.specialty.name}
          </div>
          <div className="text-xs font-bold bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 px-2.5 sm:px-3 py-1.5 rounded-xl ltr">
            {dnaData.specialtyHours} ساعت در این ژانر
          </div>
          <div className="relative group/tag cursor-help">
            <span className="text-xs font-bold bg-pink-500/10 border border-pink-500/20 text-pink-300 px-2.5 sm:px-3 py-1.5 rounded-xl block">
              تیپ: {dnaData.archetype}
            </span>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2.5 bg-[#111] text-gray-300 text-[10px] rounded-xl opacity-0 group-hover/tag:opacity-100 transition-opacity duration-300 pointer-events-none z-50 border border-white/10 shadow-2xl text-center leading-relaxed">
              {dnaData.archetypeDesc}
            </div>
          </div>
        </div>
      </div>

      {/* خط سازنده محبوب با تولتیپ دلیل انتخاب */}
      <div className="mt-6 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <Clapperboard size={14} className="text-purple-400 shrink-0" />
          <span>سازنده محبوب شما:</span>
          <div className="relative group/creator cursor-help">
            <strong className="text-white hover:text-[#ccff00] transition-colors underline decoration-dotted decoration-white/40 underline-offset-4">
              {dnaData.topCreator}
            </strong>
            {dnaData.topCreatorShows?.length > 0 && (
              <div className="absolute bottom-full right-0 sm:right-1/2 sm:translate-x-1/2 mb-2 w-60 p-2.5 bg-[#111] text-gray-300 text-[10px] rounded-xl opacity-0 group-hover/creator:opacity-100 transition-opacity duration-300 pointer-events-none z-50 border border-white/10 shadow-2xl text-center leading-relaxed">
                <strong className="text-[#ccff00] block mb-1">دلیل انتخاب در هویت شما:</strong>
                به خاطر تماشای سریال‌های:
                <span className="text-white font-bold block mt-0.5">
                  {dnaData.topCreatorShows.join('، ')}
                </span>
              </div>
            )}
          </div>
        </div>
        {dnaData.topCreatorShows?.length > 0 && (
          <span className="text-[10px] text-gray-500 hidden sm:inline">
            ({dnaData.topCreatorShows.length} اثر در پرونده شما)
          </span>
        )}
      </div>

      {/* مدال استوری اینستاگرام (انتقال با createPortal به document.body تا روی کل صفحه نمایش داده شود) */}
      {showStoryModal && mounted && createPortal(
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowStoryModal(false);
          }}
          className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-[380px] my-auto">
            
            <button 
              onClick={() => setShowStoryModal(false)}
              className="absolute -top-11 left-0 p-2 text-gray-400 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-all cursor-pointer z-10"
              title="بستن"
            >
              <X size={18} />
            </button>

            <div 
              id="story-card"
              dir="rtl"
              className="w-full aspect-[9/16] bg-gradient-to-b from-[#0B0C10] via-[#151a24] to-[#0B0C10] rounded-[2rem] p-5 sm:p-6 flex flex-col justify-between border border-purple-500/30 relative overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.25)] text-center font-['Vazirmatn'] select-none"
            >
              <div className="absolute top-1/4 right-1/2 translate-x-1/2 w-64 h-64 bg-purple-600/20 blur-[90px] rounded-full pointer-events-none" />
              <div className="absolute bottom-1/4 right-1/2 translate-x-1/2 w-64 h-64 bg-[#ccff00]/10 blur-[90px] rounded-full pointer-events-none" />

              {/* ۱. هدر بالای استوری */}
              <div className="relative z-10 flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-fuchsia-500 flex items-center justify-center font-black text-sm text-white shadow-md shadow-purple-500/30">
                    B
                  </div>
                  <span className="text-xs font-black tracking-widest text-white uppercase">
                    BINGER <span className="text-[#ccff00]">DNA</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                  <div className="w-5 h-5 rounded-full bg-purple-500/30 border border-purple-400/50 flex items-center justify-center text-[10px]">
                    🎬
                  </div>
                  <span className="text-[11px] font-bold text-gray-200">
                    {displayName}
                  </span>
                </div>
              </div>

              {/* ۲. عنوان اصلی هویت سینمایی */}
              <div className="relative z-10 my-auto py-2">
                <p className="text-[11px] font-bold text-gray-400 mb-1">هویت سینمایی من در بینجر</p>
                <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  من یک <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ccff00] via-emerald-300 to-cyan-300 drop-shadow-[0_0_20px_rgba(204,255,0,0.3)]">{dnaData.specialty.name}</span> هستم!
                </h3>
                
                <div className="inline-flex items-center gap-1.5 mt-2.5 bg-purple-500/15 border border-purple-500/30 text-purple-300 px-3 py-1 rounded-full text-xs font-black">
                  <span>🔥</span>
                  <span>{dnaData.archetype}</span>
                </div>
              </div>

              {/* ۳. گرید ۳ سریال برتر */}
              <div className="relative z-10 my-auto">
                <p className="text-[10px] font-bold text-gray-400 mb-2">آثار منتخب این تخصص در پرونده من:</p>
                <div className="grid grid-cols-3 gap-2">
                  {dnaData.favoriteShows?.slice(0, 3).map((show: any, idx: number) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden aspect-[2/3] border border-white/15 shadow-xl shadow-black/80 bg-black/50">
                      <img 
                        src={getImageUrl(show.poster_path)} 
                        alt={show.name || 'سریال'} 
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* ۴. ردیف آمار ساعت تماشا */}
              <div className="relative z-10 space-y-2 my-auto">
                <div className="bg-white/5 border border-white/10 rounded-xl py-2 px-3 flex items-center justify-between text-xs">
                  <span className="text-gray-400">ساعت تماشای تخصصی:</span>
                  <span className="font-black text-[#ccff00] ltr">🔥 {dnaData.specialtyHours} ساعت</span>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl py-1.5 px-3 text-[11px] text-gray-300 truncate">
                  🎬 سازنده محبوب: <strong className="text-white">{dnaData.topCreator}</strong>
                </div>
              </div>

              {/* ۵. بخش استیکر لینک اینستاگرام */}
              <div className="relative z-10 pt-2 border-t border-white/10 space-y-2">
                <p className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-pink-200">
                  سلیقه سریالی تو چقدر با من مچِ؟ 🤔
                </p>

                <div className="bg-gradient-to-r from-purple-900/30 to-[#ccff00]/10 border border-dashed border-[#ccff00]/40 rounded-xl py-2 px-3 text-[10px] font-bold text-gray-300 flex items-center justify-center gap-1.5 shadow-inner">
                  <span>🔗</span>
                  <span>هویت سینمایی خودت رو کشف کن | <span className="text-[#ccff00] font-mono">Binger.app</span></span>
                </div>
              </div>

            </div>

            <p className="text-[11px] text-gray-400 text-center mt-3">
              از این کارت اسکرین‌شات بگیرید و در استوری اینستاگرام قرار دهید.
            </p>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}

// کارت پیشنهاد ویژه هوشمند (با شرط عکس کاور، توضیح فارسی و یادداشت دلیل انتخاب)
function SpotlightShowCard({ show, reason, isAdded, onToggle, router }: any) {
  const backdrop = getBackdropUrl(show.backdrop_path || show.poster_path);
  const rating = show.vote_average ? show.vote_average.toFixed(1) : '-';
  const year = show.first_air_date ? show.first_air_date.substring(0, 4) : '';
  const genres = show.genres?.slice(0, 3).map((g: any) => g.name).join(' • ') || '';

  return (
    <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#0f0f0f] flex flex-col justify-end min-h-[380px] p-6 group">
      {/* عکس کاور پس‌زمینه */}
      <div className="absolute inset-0 z-0">
        {backdrop ? (
          <img
            src={backdrop}
            alt={show.name}
            className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-[#1a1a1a] to-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#090909] via-[#090909]/80 to-transparent" />
        <div className="absolute inset-0 bg-radial from-transparent to-black/70" />
      </div>

      {/* محتوای روی کارت */}
      <div className="relative z-10 space-y-3">
        
        {/* نشان بج و امتیاز */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold bg-[#ccff00] text-black px-3 py-1 rounded-full shadow-[0_0_15px_rgba(204,255,0,0.4)] flex items-center gap-1.5">
            <Sparkles size={13} /> پیشنهاد ویژه بر اساس سلیقه شما
          </span>

          <span className="text-xs bg-black/60 backdrop-blur-md border border-white/15 px-2.5 py-1 rounded-full text-amber-400 font-black flex items-center gap-1">
            <Star size={13} fill="currentColor" /> {rating}
          </span>
        </div>

        {/* بنر توضیح دلیل انتخاب برای کاربر بر اساس ژانرهای تماشا شده */}
        {reason && (
          <div className="bg-[#ccff00]/15 border border-[#ccff00]/30 rounded-2xl p-3 text-xs text-[#ccff00] font-bold leading-relaxed flex items-start gap-2 shadow-inner">
            <Sparkles size={16} className="shrink-0 mt-0.5 text-[#ccff00]" />
            <span>{reason}</span>
          </div>
        )}

        {/* نام سریال و متادیتا */}
        <div>
          <h3 className="text-xl md:text-2xl font-black text-white drop-shadow-md">
            {show.name || show.original_name}
          </h3>
          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
            {year && <span>{year}</span>}
            {genres && <span>• {genres}</span>}
            <span className="text-emerald-400 text-[11px] font-bold">✓ دارای توضیح فارسی</span>
          </div>
        </div>

        {/* خلاصه داستان فارسی */}
        {show.overview && (
          <p className="text-xs text-gray-300 line-clamp-3 leading-relaxed text-justify">
            {show.overview}
          </p>
        )}

        {/* دکمه‌های اکشن */}
        <div className="pt-2 flex items-center gap-3">
          <button
            onClick={() => router.push(`/dashboard/tv/${show.id}`)}
            className="flex-1 bg-[#ccff00] hover:bg-[#b3e600] text-black font-black py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(204,255,0,0.3)] active:scale-95 cursor-pointer"
          >
            <Eye size={16} />
            <span>مشاهده و شروع سریال</span>
          </button>

          <button
            onClick={onToggle}
            className={`p-2.5 rounded-xl border backdrop-blur-md transition-all cursor-pointer ${
              isAdded
                ? 'bg-[#ccff00] text-black border-[#ccff00]'
                : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
            }`}
            title={isAdded ? 'در لیست شماست' : 'افزودن به لیست انتظار'}
          >
            {isAdded ? <Check size={16} strokeWidth={3} /> : <Plus size={16} />}
          </button>
        </div>

      </div>
    </div>
  );
}

// کاروسل نمایش سریال‌ها
function CarouselSection({ title, items, router, watchlistIds, onToggle, badge }: any) {
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
    <div className="space-y-3 group/section relative z-0">
      {title && (
        <div className="flex items-center justify-between px-2 mr-2 border-r-4 border-[#ccff00]">
          <div className="flex items-center gap-2">
            <h2 className="text-lg md:text-xl font-black text-white/95">{title}</h2>
            {badge && (
              <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-md text-gray-300">
                {badge}
              </span>
            )}
          </div>
        </div>
      )}
      
      <div className="relative group">
        {!isDragging && (
          <>
            <button 
              onClick={() => rowRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
              className="absolute -left-4 top-1/2 -translate-y-1/2 bg-black/80 hover:bg-[#ccff00] hover:text-black text-white p-2.5 rounded-full border border-white/10 z-30 hidden md:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl active:scale-90 cursor-pointer"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={() => rowRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
              className="absolute -right-4 top-1/2 -translate-y-1/2 bg-black/80 hover:bg-[#ccff00] hover:text-black text-white p-2.5 rounded-full border border-white/10 z-30 hidden md:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl active:scale-90 cursor-pointer"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        <div 
          ref={rowRef} 
          className={`flex gap-3.5 sm:gap-4 overflow-x-auto px-2 py-3 no-scrollbar scroll-smooth cursor-grab relative z-10 ${
            isDragging ? 'cursor-grabbing snap-none' : 'snap-x'
          }`}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          {items.map((show: any) => (
            <div key={show.id} className="snap-center shrink-0 w-[130px] sm:w-[150px] md:w-[165px]">
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

// کارت سریال استاندارد
function ShowCard({ show, isAdded, onClick, onToggle }: any) {
  return (
    <div 
      onClick={onClick} 
      className="group relative aspect-[2/3] bg-[#1a1a1a] rounded-2xl overflow-hidden cursor-pointer border border-white/5 hover:border-[#ccff00]/50 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_25px_rgba(204,255,0,0.15)] hover:z-20"
    >
      <img 
        src={getImageUrl(show.poster_path)} 
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
        loading="lazy"
        alt={show.name}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-70 group-hover:opacity-85 transition-opacity"></div>
      
      <button 
        onClick={(e) => { e.stopPropagation(); onToggle(); }} 
        className={`absolute top-2 left-2 p-2 rounded-full backdrop-blur-md transition-all z-10 cursor-pointer shadow-lg hover:scale-110 active:scale-90 ${
          isAdded ? 'bg-[#ccff00] text-black shadow-[0_0_12px_rgba(204,255,0,0.6)]' : 'bg-black/50 text-white hover:bg-white hover:text-black'
        }`}
        title={isAdded ? "در لیست شماست" : "افزودن به لیست من"}
      >
        {isAdded ? <Bookmark size={14} fill="black" /> : <Plus size={14} />}
      </button>
      
      <div className="absolute bottom-0 p-2.5 sm:p-3 w-full">
        <h3 className="text-xs font-bold text-white line-clamp-1 drop-shadow-md">{show.name}</h3>
        
        <div className="flex justify-between items-center mt-1 text-[10px] text-gray-400">
          <span className="ltr">{show.first_air_date ? show.first_air_date.substring(0, 4) : ''}</span>
          {show.vote_average > 0 && (
            <span className="text-[#ccff00] flex items-center gap-0.5 bg-black/60 px-1.5 py-0.5 rounded border border-white/10 font-bold">
              <Star size={9} fill="#ccff00" /> {show.vote_average?.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// مراحل آنبوردینگ
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
    <div className="bg-gradient-to-br from-[#161616] to-[#0a0a0a] border border-white/10 rounded-3xl p-5 md:p-7 relative overflow-hidden shadow-2xl">
      <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center">
        <div className="flex flex-col items-center justify-center shrink-0 w-full md:w-auto">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-white/10" />
              <circle 
                cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="5" fill="transparent" 
                strokeDasharray={226} strokeDashoffset={226 - (226 * progress) / 100}
                className="text-[#ccff00] transition-all duration-1000 ease-out" 
              />
            </svg>
            <div className="absolute text-lg font-black text-white">{progress}%</div>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 font-bold">راه‌اندازی بینجر</p>
        </div>

        <div className="flex-1 w-full space-y-3">
          <h2 className="text-base md:text-lg font-black text-white">برای تجربه بهتر، این مراحل را کامل کنید:</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {steps.map((step) => (
              <div 
                key={step.id} 
                className={`flex md:flex-col items-center md:items-start gap-3 p-3 rounded-2xl border transition-all ${
                  step.completed ? 'bg-[#ccff00]/10 border-[#ccff00]/30' : 'bg-white/5 border-white/5'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  step.completed ? 'bg-[#ccff00] text-black font-bold' : 'bg-white/10 text-gray-400'
                }`}>
                  {step.completed ? <Check size={14} strokeWidth={3} /> : <span className="text-xs">{step.id}</span>}
                </div>
                <div className="flex-1">
                  <h3 className={`text-xs font-bold ${step.completed ? 'text-[#ccff00]' : 'text-white'}`}>{step.title}</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5 hidden md:block">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// فوتر داشبورد
function DashboardFooter() {
  return (
    <footer className="mt-16 border-t border-white/5 bg-[#080808] relative z-10">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#ccff00] rounded-lg flex items-center justify-center text-black font-black">B</div>
              <span className="text-xl font-black text-white">Binger</span>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed max-w-sm text-justify">
              بینجر پلتفرم هوشمند مدیریت و کشف سریال است. با بینجر همیشه می‌دونی چی ببینی و تا کجا دیدی.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-white mb-3 text-sm">دسترسی سریع</h4>
            <ul className="space-y-2 text-xs text-gray-400">
              <li><Link href="/dashboard" className="hover:text-[#ccff00] transition-colors">داشبورد من</Link></li>
              <li><Link href="/dashboard/custom-lists/explore" className="hover:text-[#ccff00] transition-colors">کشف لیست‌ها</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-3 text-sm">ما را دنبال کنید</h4>
            <div className="flex gap-3">
              <Link href="#" className="p-2 bg-white/5 rounded-full hover:bg-[#ccff00] hover:text-black transition-all"><Twitter size={16} /></Link>
              <Link href="#" className="p-2 bg-white/5 rounded-full hover:bg-[#ccff00] hover:text-black transition-all"><Instagram size={16} /></Link>
            </div>
          </div>
        </div>
        <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[11px] text-gray-500">© ۲۰۲۶ تمامی حقوق برای <span className="text-[#ccff00]">Binger</span> محفوظ است.</p>
        </div>
      </div>
    </footer>
  );
}