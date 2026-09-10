"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link'; 
import { 
  Home, Search, List, User, LogOut, Calendar as CalIcon, 
  X, Sparkles, Menu, Loader2, Star, ChevronRight, SlidersHorizontal, 
  RotateCcw, Globe, Flame, Film, ChevronDown, Plus, Check
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { searchShows, advancedDiscoverShows, getPopularShows, getImageUrl } from '@/lib/tmdbClient';

// ژانرهای برتر برای فیلتر سریع
const QUICK_GENRES = [
  { id: 10759, name: 'اکشن' },
  { id: 35, name: 'کمدی' },
  { id: 80, name: 'جنایی' },
  { id: 9648, name: 'معمایی' },
  { id: 10765, name: 'علمی‌تخیلی' },
  { id: 18, name: 'درام' },
  { id: 16, name: 'انیمیشن' },
  { id: 10766, name: 'عاشقانه' },
];

const QUICK_COUNTRIES = [
  { code: 'KR', label: '🇰🇷 کره‌ای (کی‌دراما)' },
  { code: 'JP', label: '🇯🇵 ژاپنی (انیمه)' },
  { code: 'IR', label: '🇮🇷 ایرانی' },
  { code: 'US', label: '🇺🇸 هالیوود/جهانی' },
];

const MIN_RATINGS = [
  { value: 7, label: '★ بالای ۷' },
  { value: 8, label: '★ بالای ۸' },
  { value: 8.5, label: '★ شاهکار (+۸.۵)' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);

  // استیت‌های جستجو
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMoreResults, setHasMoreResults] = useState(true);
  // ذخیره و خواندن واچ‌لیست برای دکمه کارت‌ها
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchUserWatchlist = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('watchlist').select('show_id').eq('user_id', user.id);
        if (data) setWatchlistIds(new Set(data.map((item: any) => Number(item.show_id))));
      }
    };
    fetchUserWatchlist();
  }, []);

  const toggleWatchlist = async (e: React.MouseEvent, showId: number) => {
    e.stopPropagation(); // جلوگیری از باز شدن ناخواسته صفحه سریال
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const nextSet = new Set(watchlistIds);
    if (nextSet.has(showId)) {
      nextSet.delete(showId);
      setWatchlistIds(nextSet);
      await supabase.from('watchlist').delete().eq('user_id', user.id).eq('show_id', showId);
    } else {
      nextSet.add(showId);
      setWatchlistIds(nextSet);
      await supabase.from('watchlist').insert([{ user_id: user.id, show_id: showId }]);
    }
  };

  // فیلترهای پیشرفته
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedSort, setSelectedSort] = useState<string>('popularity.desc');

  const isMainPage = pathname === '/dashboard';
  const hasActiveFilters = selectedGenre !== null || selectedRating !== null || selectedCountry !== null || selectedSort !== 'popularity.desc';

  const resetFilters = () => {
    setSelectedGenre(null);
    setSelectedRating(null);
    setSelectedCountry(null);
    setSelectedSort('popularity.desc');
    setSearchQuery('');
    setSearchPage(1);
    setHasMoreResults(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  // کلید میانبر Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchOverlay(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // بارگذاری هوشمند: اگر چیزی سرچ نشده، بهترین سریال‌های تاریخ به صورت رندوم لود شوند
  useEffect(() => {
    if (!showSearchOverlay) return;

    const loadInitialOrFiltered = async () => {
      setSearchPage(1);
      setHasMoreResults(true);

      // حالت ۱: هیچ متنی و هیچ فیلتری زده نشده -> لود رندوم بهترین سریال‌های تاریخ
      if (!hasActiveFilters && searchQuery.trim().length === 0) {
        setIsSearching(true);
        const randomPage = Math.floor(Math.random() * 4) + 1;
        const topShows = await getPopularShows(randomPage);
        setSearchResults(topShows || []);
        setIsSearching(false);
        return;
      }

      // حالت ۲: فیلتر پیشرفته فعال است (بدون متن)
      if (hasActiveFilters && searchQuery.trim().length === 0) {
        setIsSearching(true);
        const results = await advancedDiscoverShows({
          genreId: selectedGenre,
          minRating: selectedRating,
          originCountry: selectedCountry,
          sortBy: selectedSort,
          page: 1
        });
        setSearchResults(results || []);
        setIsSearching(false);
        return;
      }

      // حالت ۳: کاربر اسم سریال تایپ کرده
      if (searchQuery.trim().length > 1) {
        setIsSearching(true);
        let results = await searchShows(searchQuery);

        if (results && results.length > 0) {
          if (selectedGenre) {
            results = results.filter((s: any) => s.genre_ids?.includes(selectedGenre));
          }
          if (selectedRating) {
            results = results.filter((s: any) => (s.vote_average || 0) >= selectedRating);
          }
          if (selectedCountry) {
            results = results.filter((s: any) => s.origin_country?.includes(selectedCountry));
          }
        }

        setSearchResults(results || []);
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    };

    const delayDebounceFn = setTimeout(loadInitialOrFiltered, 350);
    return () => clearTimeout(delayDebounceFn);
  }, [showSearchOverlay, searchQuery, selectedGenre, selectedRating, selectedCountry, selectedSort, hasActiveFilters]);

  // لود ۲۰ سریال بعدی با کلیک روی دکمه "نمایش سریال‌های بیشتر"
  const handleLoadMore = async () => {
    if (loadingMore || !hasMoreResults) return;

    setLoadingMore(true);
    const nextPage = searchPage + 1;

    try {
      let newBatch: any[] = [];

      if (!hasActiveFilters && searchQuery.trim().length === 0) {
        newBatch = await getPopularShows(nextPage);
      } else {
        newBatch = await advancedDiscoverShows({
          genreId: selectedGenre,
          minRating: selectedRating,
          originCountry: selectedCountry,
          sortBy: selectedSort,
          page: nextPage
        });
      }

      if (!newBatch || newBatch.length === 0) {
        setHasMoreResults(false);
      } else {
        setSearchResults(prev => [...prev, ...newBatch]);
        setSearchPage(nextPage);
        if (newBatch.length < 20) setHasMoreResults(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setIsSidebarOpen(false);
    setShowSearchOverlay(false);
  }, [pathname]);

  const isShowingPopularPicks = !hasActiveFilters && searchQuery.trim().length === 0;

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] flex flex-col relative overflow-x-hidden">
      
      {/* ================= پنجره سرچ پیشرفته ================= */}
      {showSearchOverlay && (
        <div className="fixed inset-0 z-[200] bg-[#050505]/95 backdrop-blur-2xl p-4 sm:p-6 animate-in fade-in duration-200 overflow-y-auto">
          <div className="max-w-4xl mx-auto pt-2 sm:pt-6">

            {/* نوار سرچ */}
            <div className="bg-[#121212] p-4 sm:p-5 rounded-3xl border border-white/10 shadow-2xl sticky top-2 z-20">
              <div className="flex items-center gap-3">
                <Search className="text-[#ccff00] shrink-0" size={22} />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="نام سریال را تایپ کنید..." 
                  className="bg-transparent text-white text-base sm:text-lg font-bold flex-1 outline-none placeholder:text-gray-600"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2 sm:px-3.5 sm:py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    hasActiveFilters || showFilters
                      ? 'bg-[#ccff00] text-black border-[#ccff00] shadow-[0_0_15px_rgba(204,255,0,0.3)]'
                      : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border-white/10'
                  }`}
                >
                  <SlidersHorizontal size={16} />
                  <span className="hidden sm:inline">فیلترهای پیشرفته</span>
                  {hasActiveFilters && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                </button>

                <button 
                  onClick={() => {
                    setShowSearchOverlay(false); 
                    resetFilters();
                  }} 
                  className="bg-white/5 hover:bg-white/10 p-2 rounded-xl text-gray-400 hover:text-white transition-all cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* پنل فیلترها */}
              {showFilters && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
                  <div>
                    <span className="text-[11px] font-bold text-gray-400 block mb-2">انتخاب سبک و ژانر:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_GENRES.map((g) => {
                        const isSelected = selectedGenre === g.id;
                        return (
                          <button
                            key={g.id}
                            onClick={() => setSelectedGenre(isSelected ? null : g.id)}
                            className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#ccff00] text-black shadow-md'
                                : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5'
                            }`}
                          >
                            {g.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[11px] font-bold text-gray-400 block mb-2 flex items-center gap-1">
                        <Globe size={13} /> کشور و منطقه:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_COUNTRIES.map((c) => {
                          const isSelected = selectedCountry === c.code;
                          return (
                            <button
                              key={c.code}
                              onClick={() => setSelectedCountry(isSelected ? null : c.code)}
                              className={`text-xs px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-cyan-400 text-black shadow-md'
                                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5'
                              }`}
                            >
                              {c.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-gray-400 block mb-2 flex items-center gap-1">
                        <Star size={13} className="text-[#ccff00]" /> حداقل نمره:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {MIN_RATINGS.map((r) => {
                          const isSelected = selectedRating === r.value;
                          return (
                            <button
                              key={r.value}
                              onClick={() => setSelectedRating(isSelected ? null : r.value)}
                              className={`text-xs px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-400 text-black shadow-md'
                                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5'
                              }`}
                            >
                              {r.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-400">مرتب‌سازی:</span>
                      <select
                        value={selectedSort}
                        onChange={(e) => setSelectedSort(e.target.value)}
                        className="bg-[#0a0a0a] border border-white/15 text-white rounded-lg px-2.5 py-1 text-xs outline-none focus:border-[#ccff00]"
                      >
                        <option value="popularity.desc">محبوب‌ترین‌ها</option>
                        <option value="vote_average.desc">بالاترین امتیاز</option>
                        <option value="first_air_date.desc">جدیدترین انتشار</option>
                      </select>
                    </div>

                    {hasActiveFilters && (
                      <button
                        onClick={resetFilters}
                        className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw size={12} />
                        <span>پاکسازی فیلترها</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* نتایج زنده */}
            <div className="mt-6">
              {isSearching ? (
                <div className="flex flex-col items-center justify-center py-20 text-[#ccff00] gap-3">
                  <Loader2 className="animate-spin" size={36} />
                  <span className="text-xs text-gray-400 font-bold">در حال جستجوی هوشمند بینجر...</span>
                </div>
              ) : searchResults.length > 0 ? (
                <div>
                  <div className="flex justify-between items-center mb-4 px-2">
                    <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                      {isShowingPopularPicks ? (
                        <>
                          <Flame size={16} className="text-[#ccff00]" />
                          <span>شاهکارهای پرطرفدار تاریخ (پیشنهاد بینجر)</span>
                        </>
                      ) : (
                        <span>{searchResults.length} سریال پیدا شد</span>
                      )}
                    </span>
                    {hasActiveFilters && (
                      <span className="text-[11px] text-[#ccff00] font-bold">
                        فیلترهای پیشرفته فعال است
                      </span>
                    )}
                  </div>

                  {/* گرید سریال‌ها */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6 pb-8">
                    {searchResults.map((show, idx) => (
                      <div 
                        key={`${show.id}-${idx}`} 
                        onClick={() => { 
                          setShowSearchOverlay(false); 
                          router.push(`/dashboard/tv/${show.id}`); 
                        }} 
                        className="group relative aspect-[2/3] bg-[#1a1a1a] rounded-2xl overflow-hidden cursor-pointer border border-white/5 hover:border-[#ccff00]/50 transition-all hover:scale-105 shadow-xl"
                      >
                        <img 
                          src={getImageUrl(show.poster_path)} 
                          className="w-full h-full object-cover" 
                          alt={show.name}
                        />
                        <button
                          onClick={(e) => toggleWatchlist(e, Number(show.id))}
                          className={`absolute top-2 left-2 p-2 rounded-full backdrop-blur-md transition-all shadow-md cursor-pointer z-10 ${
                            watchlistIds.has(Number(show.id))
                              ? 'bg-[#ccff00] text-black shadow-[0_0_12px_rgba(204,255,0,0.6)]'
                              : 'bg-black/60 text-white hover:bg-[#ccff00] hover:text-black border border-white/15 opacity-80 sm:opacity-0 group-hover:opacity-100'
                          }`}
                          title={watchlistIds.has(Number(show.id)) ? "در لیست شماست" : "افزودن به لیست من"}
                        >
                          {watchlistIds.has(Number(show.id)) ? <Check size={14} strokeWidth={3} /> : <Plus size={14} strokeWidth={2.5} />}
                        </button>
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col justify-end p-3 opacity-90 group-hover:opacity-100 transition-opacity">
                          <h3 className="text-xs font-bold text-white line-clamp-1">{show.name}</h3>
                          <div className="flex items-center justify-between mt-1 text-[10px] text-gray-400">
                            <span className="text-[#ccff00] font-bold flex items-center gap-1">
                              <Star size={10} fill="currentColor"/> {show.vote_average ? show.vote_average.toFixed(1) : '-'}
                            </span>
                            <span>{show.first_air_date ? show.first_air_date.substring(0, 4) : ''}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* دکمه لود بیشتر (+۲۰ سریال) */}
                  {hasMoreResults && (
                    <div className="flex justify-center pb-20 pt-2">
                      <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="bg-white/10 hover:bg-[#ccff00] hover:text-black text-white font-bold text-xs px-6 py-3.5 rounded-2xl border border-white/10 transition-all active:scale-95 flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                      >
                        {loadingMore ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>در حال دریافت ۲۰ سریال بعدی...</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown size={16} />
                            <span>نمایش ۲۰ سریال بیشتر</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-20 text-gray-500">
                  <Film size={48} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-bold text-gray-400">سریالی با این مشخصات یافت نشد!</p>
                  <p className="text-xs text-gray-600 mt-1">می‌توانید فیلترها را تغییر دهید یا نام دیگری را جستجو کنید.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* SIDEBAR OVERLAY */}
      <div 
        className={`fixed inset-0 bg-black/90 backdrop-blur-sm z-[150] transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* SIDEBAR */}
      <aside 
        className={`fixed top-0 right-0 h-full w-72 bg-[#0a0a0a] border-l border-white/10 z-[160] shadow-2xl transform transition-transform duration-300 ease-out flex flex-col py-6 px-4 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="flex items-center gap-3">
            <img src="/Logo.png" alt="Binger Logo" className="w-20 h-20 object-contain" />
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-full border border-white/5 cursor-pointer">
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 w-full space-y-2">
          <MenuItem icon={<Home size={20} />} label="صفحه اصلی" active={pathname === '/dashboard'} onClick={() => router.push('/dashboard')} />
          <MenuItem icon={<CalIcon size={20} />} label="تقویم پخش" active={pathname === '/dashboard/calendar'} onClick={() => router.push('/dashboard/calendar')} />
          <MenuItem icon={<List size={20} />} label="سریال های من" active={pathname === '/dashboard/lists'} onClick={() => router.push('/dashboard/lists')} />
          <MenuItem icon={<Sparkles size={20} className="text-purple-400" />} label=" پیشنهاد سریال " active={pathname === '/dashboard/mood'} onClick={() => router.push('/dashboard/mood')} />
          <MenuItem icon={<User size={20} />} label="پروفایل" active={pathname === '/dashboard/profile'} onClick={() => router.push('/dashboard/profile')} />
        </nav>

        <div className="mt-auto pt-6 border-t border-white/5">
          <button onClick={handleLogout} className="flex items-center gap-3 text-red-400 hover:bg-white/5 w-full p-3 rounded-xl transition-all font-bold text-sm bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 cursor-pointer">
            <LogOut size={18} /> خروج از حساب
          </button>
        </div>
      </aside>

      {/* TOP HEADER */}
      <header className="fixed top-0 left-0 right-0 z-[100] w-full px-4 py-4 md:px-8 md:py-6 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/60 to-transparent transition-all h-24 pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          {!isMainPage && (
            <button onClick={() => router.back()} className="md:hidden p-2.5 bg-black/40 hover:bg-white/10 backdrop-blur-md rounded-xl border border-white/10 transition-all active:scale-95 group shadow-lg cursor-pointer">
              <ChevronRight size={24} className="text-white group-hover:text-[#ccff00]" />
            </button>
          )}
          <button onClick={() => setIsSidebarOpen(true)} className={`p-2.5 bg-black/40 hover:bg-white/10 backdrop-blur-md rounded-xl border border-white/10 transition-all active:scale-95 group shadow-lg cursor-pointer ${!isMainPage ? 'hidden md:block' : 'block'}`}>
            <Menu size={24} className="text-white group-hover:text-[#ccff00]" />
          </button>
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => router.push('/dashboard')}>
            <img src="/Logo.png" alt="Binger Logo" className="w-20 h-20 object-contain" />
          </div>
        </div>
        
        <div className="pointer-events-auto">
          <button 
            onClick={() => setShowSearchOverlay(true)} 
            className="flex items-center gap-2 px-4 py-3 bg-black/40 hover:bg-white/10 backdrop-blur-md rounded-full border border-white/10 hover:border-[#ccff00]/50 transition-all group cursor-pointer shadow-lg"
          >
            <Search size={20} className="text-gray-400 group-hover:text-[#ccff00] transition-colors" />
            <span className="text-xs text-gray-400 font-bold hidden md:inline group-hover:text-white">جستجوی سریال...</span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full relative">
        {children}
      </main>

      {/* --- MOBILE NAVIGATION --- */}
      <div className="md:hidden fixed bottom-0 w-full z-[120]">
        <div className="bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/10 h-20 pb-6 safe-area-pb grid grid-cols-5 items-center relative">
          <Link href="/dashboard" className={`flex flex-col items-center justify-center h-full transition-all active:scale-90 ${pathname === '/dashboard' ? "text-[#ccff00]" : "text-gray-500"}`}>
            <Home size={22} />
          </Link>
          <Link href="/dashboard/calendar" className={`flex flex-col items-center justify-center h-full transition-all active:scale-90 ${pathname === '/dashboard/calendar' ? "text-[#ccff00]" : "text-gray-500"}`}>
            <CalIcon size={22} />
          </Link>
          <div className="h-full"></div>
          <Link href="/dashboard/lists" className={`flex flex-col items-center justify-center h-full transition-all active:scale-90 ${pathname === '/dashboard/lists' ? "text-[#ccff00]" : "text-gray-500"}`}>
            <List size={22} />
          </Link>
          <Link href="/dashboard/profile" className={`flex flex-col items-center justify-center h-full transition-all active:scale-90 ${pathname === '/dashboard/profile' ? "text-[#ccff00]" : "text-gray-500"}`}>
            <User size={22} />
          </Link>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 bottom-8 z-10">
          <Link 
            href="/dashboard/mood" 
            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
              pathname === '/dashboard/mood' 
                ? "bg-[#ccff00] text-black shadow-[0_0_20px_rgba(204,255,0,0.5)] scale-110" 
                : "bg-[#1a1a1a] text-[#ccff00] border border-[#ccff00]/30 shadow-lg hover:border-[#ccff00]"
            }`}
          >
            <Sparkles size={28} strokeWidth={pathname === '/dashboard/mood' ? 2.5 : 2} />
          </Link>
        </div>
      </div>

    </div>
  );
}

function MenuItem({ icon, label, active = false, onClick }: any) {
  return (
    <div onClick={onClick} className={`flex items-center gap-3 p-3 mx-2 rounded-xl cursor-pointer transition-all duration-200 group ${active ? 'bg-[#ccff00] text-black font-bold shadow-lg shadow-[#ccff00]/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
      <span className={`transition-transform group-hover:scale-110 ${active ? 'scale-110' : ''}`}>{icon}</span>
      <span className="text-sm">{label}</span>
      {active && <div className="mr-auto w-1.5 h-1.5 rounded-full bg-black"></div>}
    </div>
  );
}