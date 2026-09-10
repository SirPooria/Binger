"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getShowDetails, getImageUrl } from '@/lib/tmdbClient';
import Link from 'next/link';
import { 
  Heart, ArrowRight, Search, Loader2, CheckCircle2, Tv
} from 'lucide-react';

export default function ManageFavoritesPage() {
  const router = useRouter();
  const supabase = createClient() as any;

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
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

        const favSet = new Set<number>((favData || []).map((f: any) => Number(f.show_id)));
        setFavoriteIds(favSet);

        // ۲. دریافت سریال‌های تماشا شده کاربر
        // ۲. دریافت نامحدود تمام سریال‌های تماشا شده کاربر (شکستن سقف ۱۰۰۰تایی)
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

        const watchedData = allWatchedData;

        if (watchedData && watchedData.length > 0) {
          // مرتب‌سازی از جدیدترین
          const sortedWatched = [...watchedData].sort(
            (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          const uniqueShowIds = Array.from(new Set(sortedWatched.map((i: any) => Number(i.show_id))));

          // دریافت مشخصات کامل سریال‌ها از TMDB
          const shows = await Promise.all(
            uniqueShowIds.map(async (id) => {
              const details = await getShowDetails(String(id));
              return details ? { ...details, id: Number(details.id) } : null;
            })
          );

          setWatchedShows(shows.filter(Boolean));
        }

      } catch (err) {
        console.error("Error loading favorites manager:", err);
        showToast('خطا در دریافت اطلاعات.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, supabase]);

  // تاگل آنلاین وضعیت محبوب بودن (قرمز شدن / خاکستری شدن قلب)
  const handleToggleFavorite = async (e: React.MouseEvent, show: any) => {
    e.stopPropagation(); // جلوگیری از رفتن ناخواسته به صفحه سریال
    if (!user) return;

    const showId = Number(show.id);
    const isFav = favoriteIds.has(showId);

    // تغییر آنی رنگ قلب در صفحه
    const nextSet = new Set(favoriteIds);
    if (isFav) {
      nextSet.delete(showId);
      showToast(`«${show.name}» از محبوب‌ها حذف شد.`);
    } else {
      nextSet.add(showId);
      showToast(`«${show.name}» به محبوب‌ها اضافه شد! ❤️`);
    }
    setFavoriteIds(nextSet);

    try {
      if (isFav) {
        // حذف از جدول favorites در سوپابیس
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('show_id', showId);

        if (error) throw error;
      } else {
        // افزودن به جدول favorites در سوپابیس
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            show_id: showId
          });

        if (error) throw error;
      }
    } catch (err) {
      console.error("Error toggling favorite:", err);
      showToast('خطا در ذخیره تغییرات دیتابیس.');
      setFavoriteIds(favoriteIds); // بازگردانی در صورت بروز خطا
    }
  };

  // فیلتر سریال‌ها بر اساس جستجوی کاربر
  const filteredShows = watchedShows.filter((s) => {
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
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white p-4 md:p-8 pt-24 md:pt-28">
      <div className="max-w-5xl mx-auto">

        {/* هدر بالای صفحه */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
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
                <Heart className="text-red-500 fill-red-500" size={26} /> مدیریت محبوب‌ترین‌های من
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                سریال‌های تماشا شده خود را ببینید و با کلیک روی قلب، آن‌ها را به بخش محبوب‌های پروفایل اضافه کنید.
              </p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-2">
            <span className="text-xs text-gray-400">تعداد محبوب‌ها:</span>
            <span className="text-sm font-black text-[#ccff00] ltr">{favoriteIds.size} اثر</span>
          </div>
        </div>

        {/* کادر جستجو در میان سریال‌های دیده شده */}
        {watchedShows.length > 0 && (
          <div className="mb-6 relative">
            <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در میان سریال‌های دیده‌شده شما..."
              className="w-full bg-[#0d0d0d] border border-white/15 rounded-2xl pr-11 pl-4 py-3 text-white text-xs focus:border-[#ccff00] focus:outline-none placeholder-gray-500"
            />
          </div>
        )}

        {/* گرید سریال‌های دیده شده */}
        {filteredShows.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredShows.map((show) => {
              const isFav = favoriteIds.has(Number(show.id));
              return (
                <div
                  key={show.id}
                  onClick={() => router.push(`/dashboard/tv/${show.id}`)}
                  className="group relative flex flex-col bg-[#111] border border-white/10 hover:border-white/25 rounded-2xl p-2.5 transition-all duration-300 hover:-translate-y-1.5 cursor-pointer shadow-lg"
                >
                  {/* پوستر */}
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-2 bg-black">
                    <img 
                      src={getImageUrl(show.poster_path)} 
                      alt={show.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />

                    {/* دکمه قلب آنلاین روی پوستر */}
                    <button
                      onClick={(e) => handleToggleFavorite(e, show)}
                      className={`absolute top-2 left-2 p-2 rounded-full backdrop-blur-md transition-all shadow-lg cursor-pointer ${
                        isFav 
                          ? 'bg-black/70 border border-red-500/50 shadow-red-500/20' 
                          : 'bg-black/50 border border-white/10 hover:bg-black/80'
                      }`}
                      title={isFav ? 'حذف از محبوب‌ها' : 'افزودن به محبوب‌ها'}
                    >
                      <Heart 
                        size={18} 
                        className={`transition-all ${
                          isFav 
                            ? 'text-red-500 fill-red-500 scale-110' 
                            : 'text-gray-300 group-hover:text-red-400'
                        }`} 
                      />
                    </button>
                  </div>

                  {/* عنوان سریال */}
                  <h4 className="text-xs font-bold text-gray-200 group-hover:text-[#ccff00] transition-colors truncate px-1">
                    {show.name}
                  </h4>

                  {/* وضعیت */}
                  <div className="flex items-center justify-between text-[10px] text-gray-400 px-1 mt-1">
                    <span className="ltr text-gray-500">{show.first_air_date ? show.first_air_date.substring(0, 4) : ''}</span>
                    <span className={isFav ? "text-red-400 font-bold" : "text-gray-500"}>
                      {isFav ? 'محبوب شما ❤️' : 'کلیک روی قلب'}
                    </span>
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
          <div className="text-center py-16 text-gray-500 text-xs">
            سریالی با این نام در میان سریال‌های دیده‌شده شما یافت نشد.
          </div>
        )}

      </div>

      {/* اعلان Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1c1c1c] text-[#ccff00] border border-[#ccff00]/40 px-5 py-2.5 rounded-full text-xs font-bold shadow-2xl z-50 flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}