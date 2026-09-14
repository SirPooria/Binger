"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { ArrowRight, BookmarkCheck, Layers, Loader2, Search, Users } from 'lucide-react';

const PAGE_SIZE = 12;
 
type PublicList = {
  id: string | number;
  title: string;
  description: string | null;
  user_id: string;
  list_items?: any[];
  saveCount?: number;
  creator?: { username?: string | null; avatar_url?: string | null } | null;
};

export default function ExploreListsPage() {
  const router = useRouter();
  const supabase = createClient() as any;
  const [lists, setLists] = useState<PublicList[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadLists(true, query.trim());
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [query]);

  const loadLists = async (reset = false, searchQuery = query.trim()) => {
    const nextPage = reset ? 0 : page + 1;
    if (reset) setLoading(true);
    else setLoadingMore(true);

    try {
      let request = supabase
        .from('user_lists')
        .select(`
          id,
          title,
          description,
          user_id,
          list_items ( id, show_id, show_name, poster_path )
        `, { count: 'exact' })
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .range(nextPage * PAGE_SIZE, (nextPage + 1) * PAGE_SIZE - 1);

      if (searchQuery) request = request.ilike('title', `%${searchQuery}%`);
      const { data, count, error } = await request;
      if (error) throw error;

      const rows = data || [];
      const userIds = Array.from(new Set(rows.map((list: PublicList) => list.user_id)));
      const listIds = rows.map((list: PublicList) => String(list.id));

      const [profilesRes, savesRes] = await Promise.all([
        userIds.length > 0
          ? supabase.from('profiles').select('id, username, avatar_url').in('id', userIds)
          : Promise.resolve({ data: [] }),
        listIds.length > 0
          ? supabase.from('list_saves').select('list_id').in('list_id', listIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profiles = profilesRes.data || [];
      const saveCounts: Record<string, number> = {};
      (savesRes.data || []).forEach((save: any) => {
        const id = String(save.list_id);
        saveCounts[id] = (saveCounts[id] || 0) + 1;
      });

      const enrichedRows = rows.map((list: PublicList) => ({
        ...list,
        creator: profiles.find((profile: any) => profile.id === list.user_id) || null,
        saveCount: saveCounts[String(list.id)] || 0,
      }));

      setLists((previous) => reset ? enrichedRows : [...previous, ...enrichedRows]);
      setPage(nextPage);
      setHasMore((nextPage + 1) * PAGE_SIZE < (count || 0));
    } catch (error) {
      console.error('Explore lists error:', error);
      if (reset) setLists([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] p-4 md:p-8 pb-20 pt-36 md:pt-40">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-gray-300 cursor-pointer">
              <ArrowRight size={20} />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2"><Layers className="text-[#ccff00]" /> کشف لیست‌ها</h1>
              <p className="text-xs text-gray-500 mt-1">لیست‌های عمومی ساخته‌شده توسط جامعه بینجر</p>
            </div>
          </div>
          <button onClick={() => router.push('/dashboard/custom-lists')} className="text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2.5 rounded-xl cursor-pointer">
            مدیریت لیست‌های من
          </button>
        </header>

        <div className="relative mb-8">
          <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جست‌وجو بین نام لیست‌ها..."
            className="w-full bg-white/5 border border-white/10 focus:border-[#ccff00]/60 outline-none rounded-2xl py-4 pr-12 pl-4 text-sm text-white placeholder:text-gray-600"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-24 text-[#ccff00]"><Loader2 size={38} className="animate-spin" /></div>
        ) : lists.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {lists.map((list) => {
                const items = list.list_items || [];
                return (
                  <button
                    key={list.id}
                    onClick={() => router.push(`/dashboard/custom-lists/${list.id}`)}
                    className="text-right bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-[#ccff00]/50 rounded-3xl p-5 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-1 rounded-md">لیست عمومی</span>
                      <span className="text-xs text-gray-500">{items.length} سریال</span>
                    </div>
                    <h2 className="text-lg font-black text-white group-hover:text-[#ccff00] transition-colors line-clamp-1">{list.title}</h2>
                    <p className="text-xs text-gray-400 mt-2 min-h-8 line-clamp-2">{list.description || 'بدون توضیح'}</p>
                    <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/10 text-[10px] text-gray-500">
                      <span className="flex items-center gap-1"><Users size={13} /> {list.creator?.username || 'کاربر بینجر'}</span>
                      <span className="flex items-center gap-1"><BookmarkCheck size={13} /> {list.saveCount || 0} ذخیره</span>
                    </div>
                    {items.length > 0 && (
                      <div className="flex gap-2 mt-4 overflow-hidden">
                        {items.slice(0, 6).map((item: any) => (
                          <div key={item.id} className="w-10 h-14 shrink-0 rounded-lg overflow-hidden bg-black border border-white/10">
                            {item.poster_path && <img src={`https://white-disk-01cc.prafooseh.workers.dev/t/p/w500${item.poster_path}`} alt={item.show_name} className="w-full h-full object-cover" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button onClick={() => loadLists(false)} disabled={loadingMore} className="bg-[#ccff00] text-black font-black text-sm px-6 py-3 rounded-xl hover:bg-[#b3e600] disabled:opacity-50 cursor-pointer flex items-center gap-2">
                  {loadingMore && <Loader2 size={16} className="animate-spin" />}
                  نمایش لیست‌های بیشتر
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
    </main>
  );
}
