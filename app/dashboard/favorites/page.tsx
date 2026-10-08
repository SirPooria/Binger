"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getShowDetails, getImageUrl } from '@/lib/tmdbClient';
import Link from 'next/link';
import { 
  Heart, ArrowRight, Search, Loader2, CheckCircle2, Tv, Trash2, Plus, Sparkles, Film
} from 'lucide-react';
import { ShowCardProgress } from '../components/ShowProgressBar';
import { MAX_FAVORITES } from '@/lib/favoritesLimit';
import { useWatched } from '@/lib/watchedContext';
import { useMovie } from '@/lib/movieContext';
import { getFavoritesCache, setFavoritesCache, hasFavoritesCache } from '@/lib/pageCache';

export { MAX_FAVORITES };

export default function ManageFavoritesPage() {
  const router = useRouter();
  const supabase = createClient() as any;
  const { getWatchedRecords } = useWatched();
  const {
    favoriteMovies,
    watchedMovies,
    favoriteMovieIds,
    toggleMovieFavorite,
  } = useMovie();

  const [mediaType, setMediaType] = useState<'shows' | 'movies'>('shows');
  const cached = getFavoritesCache();
  const [loading, setLoading] = useState(!cached);
  const [user, setUser] = useState<any>(null);
  const [favoriteShows, setFavoriteShows] = useState<any[]>(() => cached?.favoriteShows || []);
  const [watchedShows, setWatchedShows] = useState<any[]>(() => cached?.watchedShows || []);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(() => cached?.favoriteIds || new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [movieSearchQuery, setMovieSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const typeParam = params.get('type');
    if (typeParam === 'movies' || typeParam === 'shows') {
      setMediaType(typeParam);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!hasFavoritesCache()) {
          setLoading(true);
        }
        let activeUser: any = null;
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          activeUser = userData.user;
        } else {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user) {
            activeUser = sessionData.session.user;
          }
        }

        if (!activeUser) {
          window.location.href = '/login';
          return;
        }
        setUser(activeUser);
        const user = activeUser;

        // ۱. دریافت آیدی‌های سریال‌های محبوب کاربر از دیتابیس
        const { data: favData } = await supabase
          .from('favorites')
          .select('show_id')
          .eq('user_id', user.id);

        const favIds: number[] = (favData || []).map((f: any) => Number(f.show_id));
        const favSet = new Set<number>(favIds);
        setFavoriteIds(favSet);

        // ۲. دریافت تمام رکوردهای تماشاشده از کانتکست یکپارچه سراسری
        const allWatchedData = await getWatchedRecords();
        const sortedWatched = [...allWatchedData].sort(
          (a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
        const uniqueWatchedShowIds: number[] = Array.from(new Set(sortedWatched.map((i: any) => Number(i.show_id))));

        const allNeededIds = Array.from(new Set([...favIds, ...uniqueWatchedShowIds]));
        const showsMap = new Map<number, any>();

        await Promise.all(
          allNeededIds.map(async (id) => {
            try {
              const details = await getShowDetails(String(id));
              if (details) {
                showsMap.set(Number(details.id), { ...details, id: Number(details.id) });
              }
            } catch (err) {
              console.error(`Error loading show ${id}:`, err);
            }
          })
        );

        const favList = favIds.map((id) => showsMap.get(id)).filter(Boolean);
        const watchedList = uniqueWatchedShowIds.map((id) => showsMap.get(id)).filter(Boolean);

        setFavoriteShows(favList);
        setWatchedShows(watchedList);
        setFavoritesCache({
          favoriteShows: favList,
          watchedShows: watchedList,
          favoriteIds: favSet,
        });

      } catch (err) {
        console.error("Error loading favorites manager:", err);
        showToast('خطا در دریافت اطلاعات.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, supabase]);

  const handleMediaTypeChange = (type: 'shows' | 'movies') => {
    setMediaType(type);
    router.replace(`/dashboard/favorites?type=${type}`, { scroll: false });
  };

  // حذف مستقیم از بخش محبوب‌های سریال
  const handleRemoveFavorite = async (showId: number, showName?: string) => {
    if (!user) return;

    const nextSet = new Set(favoriteIds);
    nextSet.delete(showId);
    setFavoriteIds(nextSet);
    setFavoriteShows(prev => prev.filter(s => Number(s.id) !== showId));

    showToast(`«${showName || 'سریال'}» از لیست محبوب‌ها حذف شد.`);

    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('show_id', showId);

      if (error) throw error;
    } catch (err) {
      console.error("Error removing favorite:", err);
      showToast('خطا در حذف از محبوب‌ها.');
    }
  };

  // تاگل آنلاین وضعیت محبوب بودن در سریال‌های دیده‌شده
  const handleToggleFavorite = async (e: React.MouseEvent, show: any) => {
    e.stopPropagation();
    if (!user) return;

    const showId = Number(show.id);
    const isFav = favoriteIds.has(showId);

    if (isFav) {
      handleRemoveFavorite(showId, show.name);
      return;
    }

    if (favoriteIds.size >= MAX_FAVORITES) {
      showToast(`⚠️ سقف مجاز تکمیل است! حداکثر می‌توانید ${MAX_FAVORITES} سریال در محبوب‌ها داشته باشید.`);
      return;
    }

    const nextSet = new Set(favoriteIds);
    nextSet.add(showId);
    setFavoriteIds(nextSet);
    setFavoriteShows(prev => [show, ...prev]);

    showToast(`«${show.name}» به محبوب‌ها اضافه شد! ❤️`);

    try {
      const { error } = await supabase
        .from('favorites')
        .insert({
          user_id: user.id,
          show_id: showId
        });

      if (error) throw error;
    } catch (err) {
      console.error("Error adding favorite:", err);
      showToast('خطا در ثبت محبوبیت سریال.');
    }
  };

  // حذف مستقیم فیلم از محبوب‌ها
  const handleRemoveFavoriteMovie = async (movieId: number, title?: string) => {
    await toggleMovieFavorite(movieId);
    showToast(`«${title || 'فیلم'}» از لیست محبوب‌ها حذف شد.`);
  };

  // تاگل محبوبیت فیلم از میان فیلم‌های دیده‌شده
  const handleToggleFavoriteMovie = async (e: React.MouseEvent, movie: any) => {
    e.stopPropagation();
    const movieId = Number(movie.movie_id || movie.id);
    const isFav = favoriteMovieIds.has(movieId);

    if (!isFav && favoriteMovieIds.size >= MAX_FAVORITES) {
      showToast(`⚠️ سقف مجاز تکمیل است! حداکثر می‌توانید ${MAX_FAVORITES} فیلم در محبوب‌ها داشته باشید.`);
      return;
    }

    await toggleMovieFavorite(movieId, {
      title: movie.movie_title || movie.title,
      poster_path: movie.poster_path,
    });

    showToast(isFav ? `«${movie.movie_title || movie.title || 'فیلم'}» از محبوب‌ها حذف شد.` : `«${movie.movie_title || movie.title || 'فیلم'}» به محبوب‌ها اضافه شد! ❤️`);
  };

  // فیلتر سریال‌های دیده‌شده بر اساس جستجوی کاربر
  const filteredWatchedShows = watchedShows.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameFa = (s.name || '').toLowerCase();
    const nameEn = (s.original_name || '').toLowerCase();
    return nameFa.includes(q) || nameEn.includes(q);
  });

  // فیلتر فیلم‌های دیده‌شده بر اساس جستجو
  const filteredWatchedMovies = watchedMovies.filter((m) => {
    if (!movieSearchQuery.trim()) return true;
    const q = movieSearchQuery.toLowerCase();
    const title = (m.movie_title || '').toLowerCase();
    return title.includes(q);
  });

  if (loading && mediaType === 'shows') {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-[#ccff00]">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  const activeFavCount = mediaType === 'shows' ? favoriteShows.length : favoriteMovies.length;
  const activeWatchedCount = mediaType === 'shows' ? watchedShows.length : watchedMovies.length;

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white p-4 md:p-8 pb-28 md:pb-12 font-['Vazirmatn']">
      <div className="max-w-5xl mx-auto space-y-10">

        {/* هدر بالای صفحه */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard/profile"
              className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
              title="بازگشت به پروفایل"
            >
              <ArrowRight size={18} />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
                <Heart className="text-red-500 fill-red-500" size={26} />
                {mediaType === 'shows' ? 'مدیریت سریال‌های محبوب من' : 'مدیریت فیلم‌های محبوب من'}
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                آثار برگزیده شما در ویترین بالای پروفایل نمایش داده می‌شوند.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-red-500/10 border border-red-500/25 px-4 py-2 rounded-2xl flex items-center gap-2">
              <span className="text-xs text-gray-400">محبوب‌های فعال:</span>
              <span className="text-sm font-black text-red-400 ltr">{activeFavCount} / {MAX_FAVORITES} اثر</span>
            </div>
            <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-2">
              <span className="text-xs text-gray-400">دیده‌شده‌ها:</span>
              <span className="text-sm font-black text-[#ccff00] ltr">{activeWatchedCount} اثر</span>
            </div>
          </div>
        </div>

        {/* سوییچر بین سریال و فیلم */}
        <div className="flex items-center bg-white/5 p-1 rounded-2xl border border-white/10 w-fit">
          <button
            onClick={() => handleMediaTypeChange('shows')}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
              mediaType === 'shows'
                ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Tv size={16} />
            <span>سریال‌های محبوب ({favoriteShows.length})</span>
          </button>
          <button
            onClick={() => handleMediaTypeChange('movies')}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
              mediaType === 'movies'
                ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Film size={16} />
            <span>فیلم‌های سینمایی محبوب ({favoriteMovies.length})</span>
          </button>
        </div>

        {/* ================= نسخه سریال‌ها ================= */}
        {mediaType === 'shows' && (
          <>
            {/* ۱. بخش سریال‌های فعلی در لیست محبوب‌ها */}
            <section className="bg-gradient-to-br from-red-500/10 via-[#111] to-[#0a0a0a] border border-red-500/30 rounded-3xl p-5 sm:p-7 shadow-[0_0_40px_rgba(239,68,68,0.08)] relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div>
                  <div className="flex items-center gap-2 text-red-400">
                    <Heart size={20} className="fill-red-500 text-red-500" />
                    <h2 className="text-lg font-black text-white">سریال‌های محبوب شما ({favoriteShows.length} از {MAX_FAVORITES})</h2>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    این سریال‌ها در پروفایل عمومی شما به عنوان برترین‌ها نمایش داده می‌شوند (حداکثر {MAX_FAVORITES} اثر).
                  </p>
                </div>
              </div>

              {favoriteShows.length >= MAX_FAVORITES && (
                <div className="mb-6 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-3 rounded-2xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-sm animate-in fade-in">
                  <span className="font-medium">⚠️ سقف مجاز {MAX_FAVORITES} سریال محبوب تکمیل شده است. برای افزودن سریال جدید، ابتدا یکی از موارد بالا را حذف کنید.</span>
                  <span className="font-bold text-[11px] bg-amber-500/20 px-2.5 py-1 rounded-xl border border-amber-500/30 shrink-0">
                    {MAX_FAVORITES} از {MAX_FAVORITES} تکمیل
                  </span>
                </div>
              )}

              {favoriteShows.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {favoriteShows.map((show) => (
                    <div
                      key={`fav-${show.id}`}
                      onClick={() => router.push(`/dashboard/tv/${show.id}`)}
                      className="group relative flex flex-col bg-[#161616] border border-red-500/40 hover:border-red-400 rounded-2xl p-2.5 transition-all duration-300 hover:-translate-y-1.5 cursor-pointer shadow-lg hover:shadow-red-500/10"
                    >
                      <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-2 bg-black">
                        <img 
                          src={getImageUrl(show.poster_path)} 
                          alt={show.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFavorite(Number(show.id), show.name);
                          }}
                          className="absolute top-2 left-2 p-2 rounded-full bg-black/80 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/40 hover:border-red-600 transition-all shadow-xl cursor-pointer group/btn"
                          title="حذف از لیست محبوب‌ها"
                        >
                          <Trash2 size={16} className="group-hover/btn:scale-110 transition-transform" />
                        </button>
                        <ShowCardProgress showId={show.id} show={show} showBar={false} />
                      </div>
                      <ShowCardProgress showId={show.id} show={show} showBadge={false} />
                      <h4 className="text-xs font-bold text-gray-200 group-hover:text-red-400 transition-colors truncate px-1 mt-1">
                        {show.name}
                      </h4>
                      <div className="flex items-center justify-between text-[10px] text-gray-400 px-1 mt-1">
                        <span className="ltr text-gray-500">{show.first_air_date ? show.first_air_date.substring(0, 4) : ''}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFavorite(Number(show.id), show.name);
                          }}
                          className="text-red-400 hover:text-red-300 font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <span>حذف</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-black/30 border border-dashed border-red-500/20 rounded-2xl p-6">
                  <Heart size={36} className="text-red-500/40 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-gray-300">هنوز سریالی در لیست محبوب‌های خود ندارید</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    از لیست سریال‌های دیده‌شده در پایین صفحه، سریال‌های مورد علاقه خود را انتخاب کنید.
                  </p>
                </div>
              )}
            </section>

            {/* ۲. بخش افزودن از میان سریال‌های دیده‌شده */}
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-[#ccff00]">
                    <Plus size={20} className="text-[#ccff00]" />
                    <h2 className="text-lg font-black text-white">افزودن به محبوب‌ها از میان دیده‌شده‌ها</h2>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    با کلیک روی آیکون قلب هر سریال، آن را به لیست محبوب‌های بالا اضافه یا حذف کنید.
                  </p>
                </div>

                {watchedShows.length > 0 && (
                  <div className="w-full sm:w-72 relative">
                    <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="جستجو در سریال‌های دیده‌شده..."
                      className="w-full bg-[#111] border border-white/15 rounded-xl pr-10 pl-3 py-2 text-white text-xs focus:border-[#ccff00] focus:outline-none placeholder-gray-500"
                    />
                  </div>
                )}
              </div>

              {filteredWatchedShows.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredWatchedShows.map((show) => {
                    const isFav = favoriteIds.has(Number(show.id));
                    return (
                      <div
                        key={`watched-${show.id}`}
                        onClick={() => router.push(`/dashboard/tv/${show.id}`)}
                        className={`group relative flex flex-col bg-[#111] border rounded-2xl p-2.5 transition-all duration-300 hover:-translate-y-1.5 cursor-pointer shadow-lg ${
                          isFav 
                            ? 'border-red-500/40 bg-gradient-to-b from-red-500/5 to-transparent' 
                            : 'border-white/10 hover:border-white/25'
                        }`}
                      >
                        <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-2 bg-black">
                          <img 
                            src={getImageUrl(show.poster_path)} 
                            alt={show.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          />
                          <button
                            onClick={(e) => handleToggleFavorite(e, show)}
                            className={`absolute top-2 left-2 p-2 rounded-full backdrop-blur-md transition-all shadow-lg cursor-pointer ${
                              isFav 
                                ? 'bg-black/70 border border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.3)]' 
                                : favoriteIds.size >= MAX_FAVORITES
                                  ? 'bg-black/40 border border-white/10 opacity-40 hover:opacity-100'
                                  : 'bg-black/50 border border-white/15 hover:bg-black/80'
                            }`}
                            title={isFav ? 'حذف از محبوب‌ها' : (favoriteIds.size >= MAX_FAVORITES ? `سقف ${MAX_FAVORITES} سریال تکمیل است` : 'افزودن به محبوب‌ها')}
                          >
                            <Heart 
                              size={18} 
                              className={`transition-all ${
                                isFav 
                                  ? 'text-red-500 fill-red-500 scale-110' 
                                  : 'text-gray-300 group-hover:text-red-400 group-hover:scale-110'
                              }`} 
                            />
                          </button>
                          <ShowCardProgress showId={show.id} show={show} showBar={false} />
                        </div>
                        <ShowCardProgress showId={show.id} show={show} showBadge={false} />
                        <h4 className={`text-xs font-bold truncate px-1 mt-1 transition-colors ${
                          isFav ? 'text-red-300 group-hover:text-red-400' : 'text-gray-200 group-hover:text-[#ccff00]'
                        }`}>
                          {show.name}
                        </h4>
                        <div className="flex items-center justify-between text-[10px] text-gray-400 px-1 mt-1">
                          <span className="ltr text-gray-500">{show.first_air_date ? show.first_air_date.substring(0, 4) : ''}</span>
                          <button
                            onClick={(e) => handleToggleFavorite(e, show)}
                            className={`font-bold cursor-pointer transition-colors ${
                              isFav ? 'text-red-400 hover:text-red-300' : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            {isFav ? 'محبوب شما ❤️' : '+ افزودن'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : watchedShows.length === 0 ? (
                <div className="text-center py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-3xl p-8">
                  <Tv size={48} className="text-gray-600 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-gray-300">هنوز سریالی تماشا نکرده‌اید</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    سریال‌هایی که تماشا می‌کنید اینجا قرار می‌گیرند تا بتوانید برترین‌های آن‌ها را به لیست محبوب‌ها اضافه کنید.
                  </p>
                </div>
              ) : (
                <div className="text-center py-16 text-gray-500 text-xs bg-white/[0.02] rounded-2xl border border-white/5">
                  سریالی با نام «{searchQuery}» در میان سریال‌های دیده‌شده شما یافت نشد.
                </div>
              )}
            </section>
          </>
        )}

        {/* ================= نسخه فیلم‌های سینمایی ================= */}
        {mediaType === 'movies' && (
          <>
            {/* ۱. بخش فیلم‌های فعلی در لیست محبوب‌ها */}
            <section className="bg-gradient-to-br from-red-500/10 via-[#111] to-[#0a0a0a] border border-red-500/30 rounded-3xl p-5 sm:p-7 shadow-[0_0_40px_rgba(239,68,68,0.08)] relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div>
                  <div className="flex items-center gap-2 text-red-400">
                    <Heart size={20} className="fill-red-500 text-red-500" />
                    <h2 className="text-lg font-black text-white">فیلم‌های محبوب شما ({favoriteMovies.length} از {MAX_FAVORITES})</h2>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    فیلم‌های برگزیده سینمایی شما در ویترین پروفایلتان به نمایش درمی‌آیند (حداکثر {MAX_FAVORITES} فیلم).
                  </p>
                </div>
              </div>

              {favoriteMovies.length >= MAX_FAVORITES && (
                <div className="mb-6 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-3 rounded-2xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-sm animate-in fade-in">
                  <span className="font-medium">⚠️ سقف مجاز {MAX_FAVORITES} فیلم محبوب تکمیل شده است. برای افزودن فیلم جدید، ابتدا یکی از موارد بالا را حذف کنید.</span>
                  <span className="font-bold text-[11px] bg-amber-500/20 px-2.5 py-1 rounded-xl border border-amber-500/30 shrink-0">
                    {MAX_FAVORITES} از {MAX_FAVORITES} تکمیل
                  </span>
                </div>
              )}

              {favoriteMovies.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {favoriteMovies.map((movie) => (
                    <div
                      key={`fav-movie-${movie.movie_id}`}
                      onClick={() => router.push(`/dashboard/movie/${movie.movie_id}`)}
                      className="group relative flex flex-col bg-[#161616] border border-red-500/40 hover:border-red-400 rounded-2xl p-2.5 transition-all duration-300 hover:-translate-y-1.5 cursor-pointer shadow-lg hover:shadow-red-500/10"
                    >
                      <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-2 bg-black">
                        <img 
                          src={getImageUrl(movie.poster_path || null)} 
                          alt={movie.movie_title || 'فیلم سینمایی'} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFavoriteMovie(movie.movie_id, movie.movie_title || undefined);
                          }}
                          className="absolute top-2 left-2 p-2 rounded-full bg-black/80 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/40 hover:border-red-600 transition-all shadow-xl cursor-pointer group/btn"
                          title="حذف از لیست محبوب‌ها"
                        >
                          <Trash2 size={16} className="group-hover/btn:scale-110 transition-transform" />
                        </button>
                      </div>

                      <h4 className="text-xs font-bold text-gray-200 group-hover:text-red-400 transition-colors truncate px-1 mt-1">
                        {movie.movie_title || 'بدون عنوان'}
                      </h4>

                      <div className="flex items-center justify-between text-[10px] text-gray-400 px-1 mt-1">
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <Film size={11} /> سینمایی
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFavoriteMovie(movie.movie_id, movie.movie_title || undefined);
                          }}
                          className="text-red-400 hover:text-red-300 font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <span>حذف</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-black/30 border border-dashed border-red-500/20 rounded-2xl p-6">
                  <Film size={36} className="text-red-500/40 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-gray-300">هنوز فیلمی در لیست محبوب‌های خود ندارید</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    از لیست فیلم‌های دیده‌شده در پایین صفحه، فیلم‌های مورد علاقه خود را به لیست محبوب‌ها اضافه کنید.
                  </p>
                </div>
              )}
            </section>

            {/* ۲. بخش افزودن از میان فیلم‌های دیده‌شده */}
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-[#ccff00]">
                    <Plus size={20} className="text-[#ccff00]" />
                    <h2 className="text-lg font-black text-white">افزودن به محبوب‌ها از میان فیلم‌های دیده‌شده</h2>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    با کلیک روی آیکون قلب هر فیلم، آن را به لیست محبوب‌های بالا اضافه یا حذف کنید.
                  </p>
                </div>

                {watchedMovies.length > 0 && (
                  <div className="w-full sm:w-72 relative">
                    <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={movieSearchQuery}
                      onChange={(e) => setMovieSearchQuery(e.target.value)}
                      placeholder="جستجو در فیلم‌های دیده‌شده..."
                      className="w-full bg-[#111] border border-white/15 rounded-xl pr-10 pl-3 py-2 text-white text-xs focus:border-[#ccff00] focus:outline-none placeholder-gray-500"
                    />
                  </div>
                )}
              </div>

              {filteredWatchedMovies.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredWatchedMovies.map((movie) => {
                    const isFav = favoriteMovieIds.has(movie.movie_id);
                    return (
                      <div
                        key={`watched-movie-${movie.movie_id}`}
                        onClick={() => router.push(`/dashboard/movie/${movie.movie_id}`)}
                        className={`group relative flex flex-col bg-[#111] border rounded-2xl p-2.5 transition-all duration-300 hover:-translate-y-1.5 cursor-pointer shadow-lg ${
                          isFav 
                            ? 'border-red-500/40 bg-gradient-to-b from-red-500/5 to-transparent' 
                            : 'border-white/10 hover:border-white/25'
                        }`}
                      >
                        <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-2 bg-black">
                          <img 
                            src={getImageUrl(movie.poster_path || null)} 
                            alt={movie.movie_title || 'فیلم سینمایی'} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          />
                          <button
                            onClick={(e) => handleToggleFavoriteMovie(e, movie)}
                            className={`absolute top-2 left-2 p-2 rounded-full backdrop-blur-md transition-all shadow-lg cursor-pointer ${
                              isFav 
                                ? 'bg-black/70 border border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.3)]' 
                                : favoriteMovieIds.size >= MAX_FAVORITES
                                  ? 'bg-black/40 border border-white/10 opacity-40 hover:opacity-100'
                                  : 'bg-black/50 border border-white/15 hover:bg-black/80'
                            }`}
                            title={isFav ? 'حذف از محبوب‌ها' : (favoriteMovieIds.size >= MAX_FAVORITES ? `سقف ${MAX_FAVORITES} اثر تکمیل است` : 'افزودن به محبوب‌ها')}
                          >
                            <Heart 
                              size={18} 
                              className={`transition-all ${
                                isFav 
                                  ? 'text-red-500 fill-red-500 scale-110' 
                                  : 'text-gray-300 group-hover:text-red-400 group-hover:scale-110'
                              }`} 
                            />
                          </button>
                        </div>

                        <h4 className={`text-xs font-bold truncate px-1 mt-1 transition-colors ${
                          isFav ? 'text-red-300 group-hover:text-red-400' : 'text-gray-200 group-hover:text-[#ccff00]'
                        }`}>
                          {movie.movie_title || 'بدون عنوان'}
                        </h4>

                        <div className="flex items-center justify-between text-[10px] text-gray-400 px-1 mt-1">
                          <span className="text-gray-500 font-mono">
                            {movie.runtime_minutes ? `${movie.runtime_minutes} دقیقه` : 'سینمایی'}
                          </span>
                          <button
                            onClick={(e) => handleToggleFavoriteMovie(e, movie)}
                            className={`font-bold cursor-pointer transition-colors ${
                              isFav ? 'text-red-400 hover:text-red-300' : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            {isFav ? 'محبوب شما ❤️' : '+ افزودن'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : watchedMovies.length === 0 ? (
                <div className="text-center py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-3xl p-8">
                  <Film size={48} className="text-gray-600 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-gray-300">هنوز فیلمی تماشا نکرده‌اید</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    فیلم‌هایی که تماشا می‌کنید اینجا قرار می‌گیرند تا بتوانید برترین‌های آن‌ها را به لیست محبوب‌های پروفایلتان اضافه کنید.
                  </p>
                </div>
              ) : (
                <div className="text-center py-16 text-gray-500 text-xs bg-white/[0.02] rounded-2xl border border-white/5">
                  فیلمی با نام «{movieSearchQuery}» در میان فیلم‌های دیده‌شده شما یافت نشد.
                </div>
              )}
            </section>
          </>
        )}

      </div>

      {/* اعلان Toast */}
      {toastMessage && (
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 bg-[#1c1c1c] text-[#ccff00] border border-[#ccff00]/40 px-5 py-2.5 rounded-full text-xs font-bold shadow-2xl z-50 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}