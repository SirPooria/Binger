"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getShowDetails, getImageUrl } from '@/lib/tmdbClient';
import Link from 'next/link';
import { 
  Heart, ArrowRight, Search, Loader2, CheckCircle2, Tv, Trash2, Plus, Sparkles
} from 'lucide-react';
import { ShowCardProgress } from '../components/ShowProgressBar';
import { MAX_FAVORITES } from '@/lib/favoritesLimit';

export { MAX_FAVORITES };

export default function ManageFavoritesPage() {
  const router = useRouter();
  const supabase = createClient() as any;

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [favoriteShows, setFavoriteShows] = useState<any[]>([]);
  const [watchedShows, setWatchedShows] = useState<any[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/login');
          return;
        }
        setUser(user);

        // ۱. دریافت آیدی‌های سریال‌های محبوب کاربر از دیتابیس
        const { data: favData } = await supabase
          .from('favorites')
          .select('show_id')
          .eq('user_id', user.id);

        const favIds: number[] = (favData || []).map((f: any) => Number(f.show_id));
        const favSet = new Set<number>(favIds);
        setFavoriteIds(favSet);

        // ۲. دریافت تمام رکوردهای تماشاشده کاربر بدون محدودیت
        let allWatchedData: any[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('watched')
            .select('show_id, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (error || !data || data.length === 0) {
            hasMore = false;
          } else {
            allWatchedData = [...allWatchedData, ...data];
            if (data.length < pageSize) {
              hasMore = false;
            } else {
              page++;
            }
          }
        }

        const sortedWatched = [...allWatchedData].sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const uniqueWatchedShowIds: number[] = Array.from(new Set(sortedWatched.map((i: any) => Number(i.show_id))));

        // دریافت تمام مشخصات موردنیاز هم برای محبوب‌ها و هم برای دیده‌شده‌ها به صورت موازی
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

      } catch (err) {
        console.error("Error loading favorites manager:", err);
        showToast('خطا در دریافت اطلاعات.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, supabase]);

  // حذف مستقیم از بخش محبوب‌های بالا
  const handleRemoveFavorite = async (showId: number, showName?: string) => {
    if (!user) return;

    // آپدیت سریع استیت‌های حافظه
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

  // تاگل آنلاین وضعیت محبوب بودن در لیست دیده‌شده‌ها
  const handleToggleFavorite = async (e: React.MouseEvent, show: any) => {
    e.stopPropagation();
    if (!user) return;

    const showId = Number(show.id);
    const isFav = favoriteIds.has(showId);

    if (isFav) {
      handleRemoveFavorite(showId, show.name);
      return;
    }

    // بررسی سقف مجاز (حداکثر ۱۰ سریال در محبوب‌ها)
    if (favoriteIds.size >= MAX_FAVORITES) {
      showToast(`⚠️ سقف مجاز تکمیل است! حداکثر می‌توانید ${MAX_FAVORITES} سریال در محبوب‌ها داشته باشید.`);
      return;
    }

    // اضافه به محبوب‌ها
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

  // فیلتر سریال‌های دیده‌شده بر اساس جستجوی کاربر
  const filteredWatchedShows = watchedShows.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameFa = (s.name || '').toLowerCase();
    const nameEn = (s.original_name || '').toLowerCase();
    return nameFa.includes(q) || nameEn.includes(q);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-[#ccff00]">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

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
                <Heart className="text-red-500 fill-red-500" size={26} /> مدیریت سریال‌های محبوب من
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                سریال‌های برگزیده شما در ویترین بالای پروفایل نمایش داده می‌شوند.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-red-500/10 border border-red-500/25 px-4 py-2 rounded-2xl flex items-center gap-2">
              <span className="text-xs text-gray-400">محبوب‌های فعال:</span>
              <span className="text-sm font-black text-red-400 ltr">{favoriteShows.length} / {MAX_FAVORITES} اثر</span>
            </div>
            <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-2">
              <span className="text-xs text-gray-400">دیده‌شده‌ها:</span>
              <span className="text-sm font-black text-[#ccff00] ltr">{watchedShows.length} اثر</span>
            </div>
          </div>
        </div>

        {/* ================= ۱. بخش سریال‌های فعلی در لیست محبوب‌ها ================= */}
        <section className="bg-gradient-to-br from-red-500/10 via-[#111] to-[#0a0a0a] border border-red-500/30 rounded-3xl p-5 sm:p-7 shadow-[0_0_40px_rgba(239,68,68,0.08)] relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <div className="flex items-center gap-2 text-red-400">
                <Heart size={20} className="fill-red-500 text-red-500" />
                <h2 className="text-lg font-black text-white">سریال‌های محبوب شما ({favoriteShows.length} از {MAX_FAVORITES})</h2>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                این سریال‌ها در پروفایل عمومی شما به عنوان برترین‌ها نمایش داده می‌شوند (حداکثر {MAX_FAVORITES} اثر). برای حذف هر مورد، روی آیکون سطل زباله کلیک کنید.
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
                  {/* پوستر */}
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-2 bg-black">
                    <img 
                      src={getImageUrl(show.poster_path)} 
                      alt={show.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />

                    {/* دکمه حذف سریع از محبوب‌ها */}
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

                    {/* نشانگر درصد پیشرفت در بالای پوستر */}
                    <ShowCardProgress showId={show.id} show={show} showBar={false} />
                  </div>

                  {/* نوار پیشرفت زیر پوستر */}
                  <ShowCardProgress showId={show.id} show={show} showBadge={false} />

                  {/* عنوان سریال */}
                  <h4 className="text-xs font-bold text-gray-200 group-hover:text-red-400 transition-colors truncate px-1 mt-1">
                    {show.name}
                  </h4>

                  {/* مشخصات و دکمه حذف */}
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
                از لیست سریال‌های دیده‌شده در پایین صفحه، سریال‌های مورد علاقه خود را انتخاب کنید تا در ویترین پروفایلتان بدرخشند!
              </p>
            </div>
          )}
        </section>

        {/* ================= ۲. بخش افزودن از میان سریال‌های دیده‌شده ================= */}
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

            {/* کادر جستجو در میان سریال‌های دیده شده */}
            {watchedShows.length > 0 && (
              <div className="w-full sm:w-72 relative">
                <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو در دیده‌شده‌ها..."
                  className="w-full bg-[#111] border border-white/15 rounded-xl pr-10 pl-3 py-2 text-white text-xs focus:border-[#ccff00] focus:outline-none placeholder-gray-500"
                />
              </div>
            )}
          </div>

          {/* گرید سریال‌های دیده شده */}
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
                    {/* پوستر */}
                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-2 bg-black">
                      <img 
                        src={getImageUrl(show.poster_path)} 
                        alt={show.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />

                      {/* دکمه قلب روی پوستر */}
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

                      {/* نشانگر درصد پیشرفت در بالای پوستر */}
                      <ShowCardProgress showId={show.id} show={show} showBar={false} />
                    </div>

                    {/* نوار پیشرفت زیر پوستر */}
                    <ShowCardProgress showId={show.id} show={show} showBadge={false} />

                    {/* عنوان سریال */}
                    <h4 className={`text-xs font-bold truncate px-1 mt-1 transition-colors ${
                      isFav ? 'text-red-300 group-hover:text-red-400' : 'text-gray-200 group-hover:text-[#ccff00]'
                    }`}>
                      {show.name}
                    </h4>

                    {/* وضعیت */}
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