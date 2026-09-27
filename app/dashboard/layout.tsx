"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home, Search, List, User, LogOut, Crown,
  X, Sparkles, Menu, Loader2, Star, ChevronRight, SlidersHorizontal,
  RotateCcw, Globe, Flame, Film, ChevronDown, Plus, Check, Compass, Feather, BookOpen
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { searchShows, advancedDiscoverShows, getPopularShows, getImageUrl } from '@/lib/tmdbClient';
import { WatchedProvider } from '@/lib/watchedContext';
import { ShowCardProgress } from './components/ShowProgressBar';
import { WatchlistButton } from './components/WatchlistButton';
import { calculateSubscriptionDetails, SubscriptionStatus } from '@/lib/subscription';
import { SubscriptionBadge } from './components/SubscriptionComponents';

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

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const supabase = createClient() as any;
  const router = useRouter();
  const pathname = usePathname();

  // تب‌های اصلی اپلیکیشن (هیچ‌وقت دکمه برگشت ندارند)
  const ROOT_TABS = ['/dashboard', '/dashboard/explore', '/dashboard/lists', '/dashboard/mood', '/dashboard/profile'];
  const isRootTab = ROOT_TABS.includes(pathname);

  // بازگشت هوشمند با مقصد پشتیبان در صورت باز شدن مستقیم لینک
  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      if (pathname.startsWith('/dashboard/tv')) router.push('/dashboard/explore');
      else if (pathname.startsWith('/dashboard/custom-lists/')) router.push('/dashboard/custom-lists/explore');
      else if (pathname.startsWith('/dashboard/custom-lists')) router.push('/dashboard/profile');
      else if (pathname.startsWith('/dashboard/user/')) router.push('/dashboard/explore');
      else if (pathname.startsWith('/dashboard/category/')) router.push('/dashboard/explore');
      else if (pathname.startsWith('/dashboard/actor/')) router.push('/dashboard/explore');
      else router.push('/dashboard');
    }
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // استیت‌های جستجو
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMoreResults, setHasMoreResults] = useState(true);
  // ذخیره و خواندن واچ‌لیست برای دکمه کارت‌ها
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set());
  const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const [watchlistRes, profileRes] = await Promise.all([
          supabase.from('watchlist').select('show_id').eq('user_id', user.id),
          supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        ]);

        if (watchlistRes.data) {
          setWatchlistIds(new Set(watchlistRes.data.map((item: any) => Number(item.show_id))));
        }

        const status = calculateSubscriptionDetails({
          ...(profileRes.data || {}),
          user_metadata: user.user_metadata,
        });
        setSubStatus(status);
      }
    };
    fetchUserData();
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
      await supabase.from('watchlist').insert({ user_id: user.id, show_id: showId });
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
                  className={`p-2 sm:px-3.5 sm:py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${hasActiveFilters || showFilters
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
                            className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${isSelected
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
                              className={`text-xs px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${isSelected
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
                              className={`text-xs px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${isSelected
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
                        {/* دکمه افزودن به لیست انتظار */}
                        <WatchlistButton showId={show.id} showName={show.name} />

                        {/* نشانگر درصد پیشرفت در بالای پوستر */}
                        <ShowCardProgress showId={show.id} show={show} showBar={false} />

                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col justify-end p-3 opacity-90 group-hover:opacity-100 transition-opacity">
                          <h3 className="text-xs font-bold text-white line-clamp-1">{show.name}</h3>
                          <div className="flex items-center justify-between mt-1 text-[10px] text-gray-400">
                            <span className="text-[#ccff00] font-bold flex items-center gap-1">
                              <Star size={10} fill="currentColor" /> {show.vote_average ? show.vote_average.toFixed(1) : '-'}
                            </span>
                            <span>{show.first_air_date ? show.first_air_date.substring(0, 4) : ''}</span>
                          </div>
                          {/* نوار پیشرفت زیر کارت در بخش سرچ و پیشنهاد بینجر */}
                          <ShowCardProgress showId={show.id} show={show} showBadge={false} />
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
          <MenuItem icon={<Home size={20} />} label="صفحه اصلی" active={pathname === '/dashboard'} onClick={() => { setIsSidebarOpen(false); router.push('/dashboard'); }} />
          <MenuItem icon={<Compass size={20} />} label="اکسپلور" active={pathname === '/dashboard/explore'} onClick={() => { setIsSidebarOpen(false); router.push('/dashboard/explore'); }} />
          <MenuItem icon={<BookOpen size={20} className="text-[#ccff00]" />} label="مجله بینجر" active={pathname.startsWith('/blog')} onClick={() => { setIsSidebarOpen(false); router.push('/blog'); }} />
          <MenuItem icon={<Feather size={20} className="text-amber-400" />} label="باشگاه منتقدین" active={pathname === '/dashboard/critics'} onClick={() => { setIsSidebarOpen(false); router.push('/dashboard/critics'); }} />
          <MenuItem icon={<List size={20} />} label="سریال های من" active={pathname === '/dashboard/lists'} onClick={() => { setIsSidebarOpen(false); router.push('/dashboard/lists'); }} />
          <MenuItem icon={<Sparkles size={20} className="text-purple-400" />} label=" پیشنهاد سریال " active={pathname === '/dashboard/mood'} onClick={() => { setIsSidebarOpen(false); router.push('/dashboard/mood'); }} />
          <MenuItem icon={<User size={20} />} label="پروفایل" active={pathname === '/dashboard/profile'} onClick={() => { setIsSidebarOpen(false); router.push('/dashboard/profile'); }} />
          <MenuItem 
            icon={<Crown size={20} className={subStatus?.isActive ? "text-amber-400" : "text-gray-400"} />} 
            label="اشتراک VIP" 
            badge={subStatus?.isLifetime ? "VIP دائمی" : subStatus?.isActive ? `${subStatus.formattedDaysRemaining} مانده` : "ارتقا ✨"}
            active={pathname === '/dashboard/subscription'} 
            onClick={() => { setIsSidebarOpen(false); router.push('/dashboard/subscription'); }} 
          />
        </nav>

        <div className="mt-auto pt-6 border-t border-white/5">
          <button onClick={handleLogout} className="flex items-center gap-3 text-red-400 hover:bg-white/5 w-full p-3 rounded-xl transition-all font-bold text-sm bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 cursor-pointer">
            <LogOut size={18} /> خروج از حساب
          </button>
        </div>
      </aside>

      {/* TOP FLOATING / NO-BOX HEADER */}
      <header 
        className={`fixed top-0 left-0 right-0 z-[100] w-full px-3 py-3 md:px-8 md:py-4 flex items-center justify-between transition-all duration-300 pointer-events-none ${
          isScrolled 
            ? 'bg-gradient-to-b from-black/85 via-black/35 to-transparent' 
            : 'bg-transparent'
        }`}
      >
        {/* سمت راست: دکمه بازگشت (در صفحات داخلی)، منوی همبرگری و لوگو */}
        <div className="flex items-center gap-2.5 md:gap-3 pointer-events-auto">
          {!isRootTab && (
            <button 
              onClick={handleBack} 
              className="p-2.5 bg-black/40 hover:bg-black/70 backdrop-blur-md rounded-2xl border border-white/10 hover:border-[#ccff00]/50 transition-all active:scale-95 group shadow-lg cursor-pointer" 
              title="بازگشت"
              aria-label="بازگشت"
            >
              <ChevronRight size={20} className="text-white group-hover:text-[#ccff00] transition-colors" />
            </button>
          )}
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="p-2.5 bg-black/40 hover:bg-black/70 backdrop-blur-md rounded-2xl border border-white/10 transition-all active:scale-95 group shadow-lg cursor-pointer block" 
            title="منوی اصلی"
          >
            <Menu size={20} className="text-white group-hover:text-[#ccff00] md:w-5 md:h-5" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2 group focus:outline-none focus:ring-2 focus:ring-[#ccff00] rounded-xl" aria-label="صفحه اصلی بینجر">
            <img src="/Logo.png" alt="لوگوی بینجر" className="h-10 md:h-12 w-auto object-contain drop-shadow-lg" />
          </Link>
        </div>
        
        {/* سمت چپ: دکمه وضعیت اشتراک با روزهای مانده + دکمه سرچ شناور */}
        <div className="pointer-events-auto flex items-center gap-2">
          {subStatus && pathname !== '/dashboard' && (
            <SubscriptionBadge status={subStatus} />
          )}
          <button 
            type="button"
            onClick={() => setShowSearchOverlay(true)} 
            className="flex items-center gap-2 px-3.5 py-2.5 md:px-4 md:py-2.5 bg-black/40 hover:bg-black/70 backdrop-blur-md rounded-full border border-white/10 hover:border-[#ccff00]/50 transition-all group cursor-pointer shadow-lg focus:outline-none focus:ring-2 focus:ring-[#ccff00]"
          >
            <Search size={16} className="text-gray-300 group-hover:text-[#ccff00] transition-colors md:w-4 md:h-4" />
            <span className="text-xs text-gray-300 font-bold hidden md:inline group-hover:text-white">جستجوی سریال...</span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full relative pt-16 md:pt-20 pb-28 md:pb-12">
        {children}
      </main>

      {/* --- MOBILE NAVIGATION --- */}
      <div className="md:hidden fixed bottom-0 w-full z-[120]">
        <div className="bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/10 h-20 pb-6 safe-area-pb grid grid-cols-5 items-center relative">
          <Link href="/dashboard" className={`flex flex-col items-center justify-center h-full transition-all active:scale-90 ${pathname === '/dashboard' ? "text-[#ccff00]" : "text-gray-500"}`} aria-label="خانه">
            <Home size={22} />
          </Link>
          <Link href="/dashboard/explore" className={`flex flex-col items-center justify-center h-full transition-all active:scale-90 ${pathname === '/dashboard/explore' ? "text-[#ccff00]" : "text-gray-500"}`} aria-label="کاوش">
            <Compass size={22} />
          </Link>
          <div className="h-full"></div>
          <Link href="/dashboard/lists" className={`flex flex-col items-center justify-center h-full transition-all active:scale-90 ${pathname === '/dashboard/lists' ? "text-[#ccff00]" : "text-gray-500"}`} aria-label="لیست‌ها">
            <List size={22} />
          </Link>
          <Link href="/dashboard/profile" className={`flex flex-col items-center justify-center h-full transition-all active:scale-90 ${pathname === '/dashboard/profile' ? "text-[#ccff00]" : "text-gray-500"}`} aria-label="پروفایل">
            <User size={22} />
          </Link>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 bottom-8 z-10">
          <Link
            href="/dashboard/mood"
            aria-label="دستیار مود سینمایی"
            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#ccff00] ${pathname === '/dashboard/mood'
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

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: string;
  onClick: () => void;
}

function MenuItem({ icon, label, active = false, badge, onClick }: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between p-3 mx-2 rounded-xl text-right transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-[#ccff00] cursor-pointer ${
        active
          ? 'bg-[#ccff00] text-black font-bold shadow-lg shadow-[#ccff00]/20'
          : 'text-gray-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className={`transition-transform group-hover:scale-110 shrink-0 ${active ? 'scale-110' : ''}`}>{icon}</span>
        <span className="text-sm truncate">{label}</span>
      </div>
      {badge ? (
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 mr-2 ${
          active
            ? 'bg-black/20 text-black border-black/30'
            : 'bg-amber-400/15 text-amber-300 border-amber-400/30'
        }`}>
          {badge}
        </span>
      ) : active ? (
        <div className="mr-auto w-1.5 h-1.5 rounded-full bg-black shrink-0"></div>
      ) : null}
    </button>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WatchedProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </WatchedProvider>
  );
}