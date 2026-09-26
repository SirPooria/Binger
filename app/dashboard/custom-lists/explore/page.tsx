"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getImageUrl } from '@/lib/tmdbClient';
import { 
  ArrowRight, BookmarkCheck, BookmarkPlus, Layers, 
  Loader2, Search, Users, CheckCircle2, Flame, Clock 
} from 'lucide-react';
import { VipUsername } from '@/app/dashboard/components/VipBadge';

const PAGE_SIZE = 12;
 
type PublicList = {
  id: string | number;
  title: string;
  description: string | null;
  user_id: string;
  created_at?: string;
  list_items?: any[];
  saveCount?: number;
  creator?: { username?: string | null; avatar_url?: string | null; is_vip?: boolean | null } | null;
};

export default function ExploreListsPage() {
  const router = useRouter();
  const supabase = createClient() as any;
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allFetchedLists, setAllFetchedLists] = useState<PublicList[]>([]);
  const [lists, setLists] = useState<PublicList[]>([]);
  const [savedListIds, setSavedListIds] = useState<Set<string>>(new Set());
  const [savingListId, setSavingListId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'newest'>('popular');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const sortListItems = (items: PublicList[], sortMode: 'popular' | 'newest') => {
    const sorted = [...items];
    if (sortMode === 'popular') {
      sorted.sort((a, b) => {
        const countDiff = (b.saveCount || 0) - (a.saveCount || 0);
        if (countDiff !== 0) return countDiff;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
    } else {
      sorted.sort((a, b) => {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
    }
    return sorted;
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadLists(query.trim());
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [query]);

  const loadLists = async (searchQuery = query.trim()) => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      let request = supabase
        .from('user_lists')
        .select(`
          id,
          title,
          description,
          user_id,
          created_at,
          list_items ( id, show_id, show_name, poster_path )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(200);

      if (searchQuery) request = request.ilike('title', `%${searchQuery}%`);
      const { data, error } = await request;
      if (error) throw error;

      const rows = data || [];
      const userIds = Array.from(new Set(rows.map((list: PublicList) => list.user_id)));
      const listIds = rows.map((list: PublicList) => String(list.id));

      const [profilesRes, savesRes, mySavesRes] = await Promise.all([
        userIds.length > 0
          ? supabase.from('profiles').select('id, username, avatar_url, is_vip, role').in('id', userIds)
          : Promise.resolve({ data: [] }),
        listIds.length > 0
          ? supabase.from('list_saves').select('list_id').in('list_id', listIds)
          : Promise.resolve({ data: [] }),
        user && listIds.length > 0
          ? supabase.from('list_saves').select('list_id').eq('user_id', user.id).in('list_id', listIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profiles = profilesRes.data || [];
      const saveCounts: Record<string, number> = {};
      (savesRes.data || []).forEach((save: any) => {
        const id = String(save.list_id);
        saveCounts[id] = (saveCounts[id] || 0) + 1;
      });

      const mySavedSet = new Set<string>((mySavesRes.data || []).map((s: any) => String(s.list_id)));
      setSavedListIds(mySavedSet);

      const enrichedRows: PublicList[] = rows.map((list: PublicList) => {
        const prof = profiles.find((profile: any) => profile.id === list.user_id);
        return {
          ...list,
          creator: prof ? {
            username: prof.username,
            avatar_url: prof.avatar_url,
            is_vip: prof.is_vip === true || prof.role === 'admin'
          } : null,
          saveCount: saveCounts[String(list.id)] || 0,
        };
      });

      const sorted = sortListItems(enrichedRows, sortBy);
      setAllFetchedLists(sorted);
      setDisplayCount(PAGE_SIZE);
      setLists(sorted.slice(0, PAGE_SIZE));
      setHasMore(sorted.length > PAGE_SIZE);
    } catch (error) {
      console.error('Explore lists error:', error);
      setLists([]);
      setAllFetchedLists([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = (newSort: 'popular' | 'newest') => {
    if (newSort === sortBy) return;
    setSortBy(newSort);
    const sorted = sortListItems(allFetchedLists, newSort);
    setAllFetchedLists(sorted);
    setDisplayCount(PAGE_SIZE);
    setLists(sorted.slice(0, PAGE_SIZE));
    setHasMore(sorted.length > PAGE_SIZE);
  };

  const handleLoadMore = () => {
    setLoadingMore(true);
    const nextCount = displayCount + PAGE_SIZE;
    setLists(allFetchedLists.slice(0, nextCount));
    setDisplayCount(nextCount);
    setHasMore(allFetchedLists.length > nextCount);
    setLoadingMore(false);
  };

  const handleToggleSave = async (e: React.MouseEvent, list: PublicList) => {
    e.stopPropagation(); // جلوگیری از باز شدن لینک کارت لیست

    if (!currentUser) {
      router.push('/login');
      return;
    }

    const listIdStr = String(list.id);
    const isCurrentlySaved = savedListIds.has(listIdStr);

    // Optimistic UI update
    setSavingListId(listIdStr);
    setSavedListIds((prev) => {
      const next = new Set(prev);
      if (isCurrentlySaved) next.delete(listIdStr);
      else next.add(listIdStr);
      return next;
    });

    const updateItem = (l: PublicList) => {
      if (String(l.id) === listIdStr) {
        const currentCount = l.saveCount || 0;
        return {
          ...l,
          saveCount: isCurrentlySaved ? Math.max(0, currentCount - 1) : currentCount + 1,
        };
      }
      return l;
    };

    setLists((prevLists) => prevLists.map(updateItem));
    setAllFetchedLists((prevAll) => prevAll.map(updateItem));

    try {
      if (isCurrentlySaved) {
        const { error } = await supabase
          .from('list_saves')
          .delete()
          .eq('list_id', listIdStr)
          .eq('user_id', currentUser.id);
        if (error) throw error;
        showToast(`لیست «${list.title}» از ذخیره‌ها برداشته شد.`);
      } else {
        const { error } = await supabase
          .from('list_saves')
          .insert({ list_id: listIdStr, user_id: currentUser.id });
        if (error) throw error;
        showToast(`لیست «${list.title}» ذخیره شد! در پروفایل شما قرار گرفت 📌`);
      }
    } catch (err) {
      console.error('Save toggle error:', err);
      // Revert optimistic update on error
      setSavedListIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlySaved) next.add(listIdStr);
        else next.delete(listIdStr);
        return next;
      });
      const revertItem = (l: PublicList) => {
        if (String(l.id) === listIdStr) {
          const currentCount = l.saveCount || 0;
          return {
            ...l,
            saveCount: isCurrentlySaved ? currentCount + 1 : Math.max(0, currentCount - 1),
          };
        }
        return l;
      };
      setLists((prevLists) => prevLists.map(revertItem));
      setAllFetchedLists((prevAll) => prevAll.map(revertItem));
      showToast('خطا در تغییر وضعیت ذخیره لیست.');
    } finally {
      setSavingListId(null);
    }
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] p-4 md:p-8 pb-20">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
                <Layers className="text-[#ccff00]" /> کشف لیست‌ها
              </h1>
              <p className="text-xs text-gray-500 mt-1">لیست‌های عمومی ساخته‌شده توسط جامعه بینجر</p>
            </div>
          </div>
          <button 
            onClick={() => router.push('/dashboard/custom-lists')} 
            className="text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2.5 rounded-xl cursor-pointer transition-colors"
          >
            مدیریت لیست‌های من
          </button>
        </header>

        {/* نوار جست‌وجو و کنترل‌های مرتب‌سازی (Sort) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8">
          {/* نوار جست‌وجو */}
          <div className="relative flex-1">
            <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="جست‌وجو بین نام لیست‌ها..."
              className="w-full bg-white/5 border border-white/10 focus:border-[#ccff00]/60 outline-none rounded-2xl py-3.5 pr-12 pl-4 text-sm text-white placeholder:text-gray-600 transition-colors"
            />
          </div>

          {/* تب‌های مرتب‌سازی (سورت بر اساس پرطرفدارترین یا جدیدترین) */}
          <div className="flex items-center gap-1.5 bg-white/5 p-1.5 rounded-2xl border border-white/10 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleSortChange('popular')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sortBy === 'popular'
                  ? 'bg-[#ccff00] text-black shadow-[0_0_15px_rgba(204,255,0,0.3)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Flame size={15} className={sortBy === 'popular' ? 'fill-black text-black' : 'text-gray-400'} />
              <span>پرطرفدارترین</span>
            </button>

            <button
              type="button"
              onClick={() => handleSortChange('newest')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sortBy === 'newest'
                  ? 'bg-[#ccff00] text-black shadow-[0_0_15px_rgba(204,255,0,0.3)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Clock size={15} className={sortBy === 'newest' ? 'text-black' : 'text-gray-400'} />
              <span>جدیدترین</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24 text-[#ccff00]"><Loader2 size={38} className="animate-spin" /></div>
        ) : lists.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {lists.map((list) => {
                const items = list.list_items || [];
                const isSaved = savedListIds.has(String(list.id));
                const isSaving = savingListId === String(list.id);

                return (
                  <div
                    key={list.id}
                    onClick={() => router.push(`/dashboard/custom-lists/${list.id}`)}
                    className="text-right bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-[#ccff00]/50 rounded-3xl p-5 transition-all duration-300 group cursor-pointer flex flex-col justify-between hover:shadow-[0_10px_35px_rgba(0,0,0,0.4)]"
                  >
                    <div>
                      {/* هدر کارت: برچسب عمومی + تعداد سریال‌ها + دکمه ذخیره مستقیم */}
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-1 rounded-md">
                            لیست عمومی
                          </span>
                          <span className="text-xs text-gray-500">{items.length} سریال</span>
                        </div>

                        {/* دکمه ذخیره مستقیم در همین صفحه */}
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={(e) => handleToggleSave(e, list)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                            isSaved
                              ? 'bg-amber-500/15 border-amber-400/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                              : 'bg-white/5 hover:bg-white/15 border-white/10 text-gray-300 hover:text-white'
                          }`}
                          title={isSaved ? 'حذف از ذخیره‌ها' : 'ذخیره این لیست'}
                        >
                          {isSaving ? (
                            <Loader2 size={14} className="animate-spin text-amber-400" />
                          ) : isSaved ? (
                            <BookmarkCheck size={14} className="text-amber-400" />
                          ) : (
                            <BookmarkPlus size={14} className="text-gray-400 group-hover:text-white" />
                          )}
                          <span>{isSaved ? 'ذخیره شده' : 'ذخیره'}</span>
                        </button>
                      </div>

                      <h2 className="text-lg font-black text-white group-hover:text-[#ccff00] transition-colors line-clamp-1">
                        {list.title}
                      </h2>
                      <p className="text-xs text-gray-400 mt-2 min-h-8 line-clamp-2 leading-relaxed">
                        {list.description || 'بدون توضیح'}
                      </p>
                    </div>

                    <div>
                      {/* پوسترهای پیش‌نمایش سریال‌ها با افکت هاور روی باکس کاور */}
                      {items.length > 0 && (
                        <div className="flex gap-2 mt-4 overflow-hidden p-2 rounded-2xl bg-black/40 border border-white/5 group-hover:border-[#ccff00]/30 group-hover:bg-[#121212] transition-all duration-300">
                          {items.slice(0, 6).map((item: any) => (
                            <div key={item.id} className="w-10 h-14 shrink-0 rounded-lg overflow-hidden bg-black border border-white/10 group-hover:border-[#ccff00]/40 transition-colors shadow-sm">
                              {item.poster_path && (
                                <img 
                                  src={getImageUrl(item.poster_path)} 
                                  alt={item.show_name} 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                />
                              )}
                            </div>
                          ))}
                          {items.length > 6 && (
                            <div className="w-10 h-14 shrink-0 rounded-lg bg-white/5 border border-white/10 group-hover:border-[#ccff00]/30 flex items-center justify-center text-[10px] text-gray-400 group-hover:text-[#ccff00] font-bold transition-colors">
                              +{items.length - 6}
                            </div>
                          )}
                        </div>
                      )}

                      {/* فوتر کارت: نام سازنده و آمار ذخیره */}
                      <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/10 text-[10px] text-gray-500">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <Users size={13} className="shrink-0" />
                          <VipUsername username={list.creator?.username} isVip={list.creator?.is_vip} badgeSize={12} className="text-[11px]" />
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                          <BookmarkCheck size={13} className={isSaved ? 'text-amber-400' : ''} /> 
                          <span>{list.saveCount || 0} ذخیره</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-8">
                <button 
                  onClick={handleLoadMore} 
                  disabled={loadingMore} 
                  className="bg-[#ccff00] text-black font-black text-sm px-6 py-3 rounded-xl hover:bg-[#b3e600] disabled:opacity-50 cursor-pointer flex items-center gap-2 transition-all active:scale-95"
                >
                  {loadingMore && <Loader2 size={16} className="animate-spin" />}
                  <span>نمایش لیست‌های بیشتر</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="py-24 text-center border border-dashed border-white/10 rounded-3xl text-gray-500">
            <Layers size={44} className="mx-auto mb-3 opacity-50" />
            <p>{query.trim() ? 'لیستی با این نام پیدا نشد.' : 'هنوز لیست عمومی‌ای ساخته نشده است.'}</p>
          </div>
        )}
      </div>

      {/* اعلان تستی ساده (Toast) */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1c1c1c] text-[#ccff00] border border-[#ccff00]/40 px-5 py-2.5 rounded-full text-xs font-bold shadow-2xl z-50 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}
    </main>
  );
}
