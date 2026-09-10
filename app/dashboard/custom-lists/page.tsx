"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { searchShows, getImageUrl } from '@/lib/tmdbClient';
import Link from 'next/link';
import { 
  Plus, MoreVertical, Trash2, Edit3, Share2, Globe, 
  Lock, ArrowUp, ArrowDown, Search, X, Loader2, ArrowRight, 
  Check, Film, Layers, CheckCircle2 
} from 'lucide-react';

export default function CustomListsPage() {
  const router = useRouter();
  const supabase = createClient() as any;

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [lists, setLists] = useState<any[]>([]);

  // استیت‌های مدال ساخت / ویرایش لیست
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [savingList, setSavingList] = useState(false);

  // استیت‌های مدال مدیریت سریال‌ها و جستجو در TMDB
  const [activeListForShows, setActiveListForShows] = useState<any>(null);
  const [listShows, setListShows] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingShowId, setAddingShowId] = useState<number | null>(null);

  // منوی ۳ نقطه
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // پیام اعلان
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ۱. دریافت تمام لیست‌های کاربر به ترتیب اولویت (order_index)
  const fetchUserLists = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      setUser(user);

      // خواندن لیست‌ها مرتب شده بر اساس رتبه اولویت
      const { data: listsData, error } = await supabase
        .from('user_lists')
        .select(`
          *,
          list_items ( id, show_id, show_name, poster_path )
        `)
        .eq('user_id', user.id)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLists(listsData || []);

    } catch (err) {
      console.error("Error fetching lists:", err);
      showToast('خطا در بارگذاری لیست‌ها.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserLists();
  }, []);

  // ۲. جابجایی اولویت‌ها (Swap Order)
  const handleSwapPriority = async (currentIndex: number, targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= lists.length) return;

    const currentList = lists[currentIndex];
    const targetList = lists[targetIndex];

    // جابجایی سریع در فرانت‌اند
    const updatedLists = [...lists];
    updatedLists[currentIndex] = targetList;
    updatedLists[targetIndex] = currentList;
    setLists(updatedLists);

    try {
      // ذخیره اولویت جدید در دیتابیس
      await Promise.all([
        supabase.from('user_lists').update({ order_index: targetIndex }).eq('id', currentList.id),
        supabase.from('user_lists').update({ order_index: currentIndex }).eq('id', targetList.id)
      ]);
      showToast('اولویت نمایش تغییر کرد!');
    } catch (err) {
      console.error(err);
      showToast('خطا در ذخیره ترتیب اولویت.');
      fetchUserLists(); // بازگردانی در صورت خطا
    }
  };

  // ۳. ذخیره یا ویرایش مشخصات لیست
  const handleSaveList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;

    setSavingList(true);
    try {
      if (editingList) {
        // ویرایش
        const { error } = await supabase
          .from('user_lists')
          .update({
            title: title.trim(),
            description: description.trim(),
            is_public: isPublic,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingList.id);

        if (error) throw error;
        showToast('اطلاعات لیست ویرایش شد.');
      } else {
        // ساخت جدید
        const nextOrderIndex = lists.length;
        const { error } = await supabase
          .from('user_lists')
          .insert({
            user_id: user.id,
            title: title.trim(),
            description: description.trim(),
            is_public: isPublic,
            order_index: nextOrderIndex
          });

        if (error) throw error;
        showToast('لیست جدید با موفقیت ساخته شد!');
      }

      setIsFormModalOpen(false);
      setTitle('');
      setDescription('');
      setIsPublic(true);
      setEditingList(null);
      fetchUserLists();

    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'خطا در ثبت لیست.');
    } finally {
      setSavingList(false);
    }
  };

  // ۴. حذف لیست
  const handleDeleteList = async (listId: string) => {
    if (!confirm('آیا از حذف کامل این لیست مطمئن هستید؟')) return;

    try {
      const { error } = await supabase.from('user_lists').delete().eq('id', listId);
      if (error) throw error;
      setLists(lists.filter(l => l.id !== listId));
      showToast('لیست حذف شد.');
    } catch (err) {
      console.error(err);
      showToast('خطا در حذف لیست.');
    }
  };

  // ۵. تغییر وضعیت عمومی / خصوصی
  const handleTogglePrivacy = async (list: any) => {
    try {
      const newStatus = !list.is_public;
      const { error } = await supabase
        .from('user_lists')
        .update({ is_public: newStatus })
        .eq('id', list.id);

      if (error) throw error;
      setLists(lists.map(l => l.id === list.id ? { ...l, is_public: newStatus } : l));
      showToast(newStatus ? 'لیست عمومی شد.' : 'لیست خصوصی شد.');
    } catch (err) {
      console.error(err);
      showToast('خطا در تغییر وضعیت.');
    }
  };

  // ۶. جستجوی زنده در TMDB برای اضافه کردن به لیست
  const handleSearchTMDB = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await searchShows(q);
      setSearchResults(results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  // ۷. باز کردن مدال مدیریت سریال‌های داخل یک لیست
  const openShowsManager = (list: any) => {
    setActiveListForShows(list);
    setListShows(list.list_items || []);
    setSearchQuery('');
    setSearchResults([]);
    setOpenMenuId(null);
  };

  // ۸. افزودن سریال به لیست
  const handleAddShowToList = async (show: any) => {
    if (!activeListForShows) return;

    setAddingShowId(show.id);
    try {
      const { data, error } = await supabase
        .from('list_items')
        .insert({
          list_id: activeListForShows.id,
          show_id: show.id,
          show_name: show.name || show.original_name,
          poster_path: show.poster_path
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          showToast('این سریال قبلاً در لیست وجود دارد.');
        } else {
          throw error;
        }
      } else {
        setListShows([data, ...listShows]);
        showToast(`«${show.name}» به لیست اضافه شد.`);
        fetchUserLists();
      }
    } catch (err) {
      console.error(err);
      showToast('خطا در افزودن سریال.');
    } finally {
      setAddingShowId(null);
    }
  };

  // ۹. حذف سریال از لیست
  const handleRemoveShowFromList = async (itemId: number) => {
    try {
      const { error } = await supabase.from('list_items').delete().eq('id', itemId);
      if (error) throw error;
      setListShows(listShows.filter(item => item.id !== itemId));
      showToast('سریال از لیست برداشته شد.');
      fetchUserLists();
    } catch (err) {
      console.error(err);
      showToast('خطا در حذف سریال.');
    }
  };

  // ۱۰. کپی لینک اشتراک‌گذاری
  const handleShareList = (list: any) => {
    const url = `${window.location.origin}/dashboard/lists/${list.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      showToast('لینک اشتراک‌گذاری کپی شد!');
    }
  };

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
                <Layers className="text-[#ccff00]" size={26} /> لیست‌های سفارشی من
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                لیست‌های عمومی و پیشنهادی بسازید و اولویت نمایش آن‌ها را در پروفایل با دکمه‌های جابجایی تعیین کنید.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setEditingList(null);
              setTitle('');
              setDescription('');
              setIsPublic(true);
              setIsFormModalOpen(true);
            }}
            className="bg-[#ccff00] hover:bg-[#b3e600] text-black font-black text-xs px-5 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(204,255,0,0.25)] active:scale-95 cursor-pointer"
          >
            <Plus size={18} />
            <span>ساخت لیست جدید</span>
          </button>
        </div>

        {/* کارت‌های لیست‌ها */}
        {lists.length > 0 ? (
          <div className="space-y-4">
            {lists.map((list, index) => {
              const items = list.list_items || [];
              const isFirst = index === 0;
              const isLast = index === lists.length - 1;

              return (
                <div 
                  key={list.id} 
                  className="bg-[#121212] border border-white/10 hover:border-white/20 rounded-3xl p-5 md:p-6 transition-all shadow-xl relative group"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    {/* اطلاعات اصلی لیست */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2.5 mb-2">
                        {/* بج اولویت نمایش */}
                        <span className="bg-white/10 border border-white/10 text-[10px] font-bold px-2 py-0.5 rounded-md text-gray-300">
                          اولویت {index + 1}
                        </span>

                        {/* بج وضعیت عمومی/خصوصی */}
                        {list.is_public ? (
                          <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Globe size={11} /> عمومی
                          </span>
                        ) : (
                          <span className="bg-gray-500/10 border border-gray-500/30 text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Lock size={11} /> خصوصی
                          </span>
                        )}

                        <span className="text-xs text-gray-500">• {items.length} سریال</span>
                      </div>

                      <h3 className="text-lg md:text-xl font-black text-white">
                        {list.title}
                      </h3>

                      {list.description && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed max-w-2xl">
                          {list.description}
                        </p>
                      )}
                    </div>

                    {/* دکمه‌های جابجایی اولویت (Swap) + منوی سه نقطه */}
                    <div className="flex items-center gap-2 shrink-0">
                      
                      {/* دکمه‌های جابجایی رتبه و اولویت */}
                      <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1">
                        <button
                          disabled={isFirst}
                          onClick={() => handleSwapPriority(index, index - 1)}
                          className="p-2 text-gray-400 hover:text-[#ccff00] disabled:opacity-20 disabled:hover:text-gray-400 transition-colors cursor-pointer"
                          title="انتقال به اولویت بالاتر"
                        >
                          <ArrowUp size={16} />
                        </button>
                        <div className="w-px h-4 bg-white/10" />
                        <button
                          disabled={isLast}
                          onClick={() => handleSwapPriority(index, index + 1)}
                          className="p-2 text-gray-400 hover:text-[#ccff00] disabled:opacity-20 disabled:hover:text-gray-400 transition-colors cursor-pointer"
                          title="انتقال به اولویت پایین‌تر"
                        >
                          <ArrowDown size={16} />
                        </button>
                      </div>

                      {/* دکمه مدیریت و افزودن سریال */}
                      <button
                        onClick={() => openShowsManager(list)}
                        className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Search size={14} className="text-[#ccff00]" />
                        <span>افزودن / مدیریت سریال‌ها</span>
                      </button>

                      {/* منوی ۳ نقطه */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === list.id ? null : list.id)}
                          className="p-2.5 bg-white/5 hover:bg-white/15 rounded-xl border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {openMenuId === list.id && (
                          <div 
                            className="absolute left-0 mt-2 w-48 bg-[#181818] border border-white/15 rounded-2xl p-1.5 shadow-2xl z-30 space-y-1 animate-in fade-in zoom-in-95 duration-150"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => {
                                setEditingList(list);
                                setTitle(list.title);
                                setDescription(list.description || '');
                                setIsPublic(list.is_public);
                                setIsFormModalOpen(true);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-right px-3 py-2 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 rounded-xl flex items-center gap-2 cursor-pointer"
                            >
                              <Edit3 size={14} /> ویرایش مشخصات
                            </button>

                            <button
                              onClick={() => {
                                handleTogglePrivacy(list);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-right px-3 py-2 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 rounded-xl flex items-center gap-2 cursor-pointer"
                            >
                              {list.is_public ? <Lock size={14} /> : <Globe size={14} />}
                              <span>{list.is_public ? 'خصوصی کردن' : 'عمومی کردن'}</span>
                            </button>

                            <button
                              onClick={() => {
                                handleShareList(list);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-right px-3 py-2 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 rounded-xl flex items-center gap-2 cursor-pointer"
                            >
                              <Share2 size={14} /> کپی لینک اشتراک
                            </button>

                            <div className="border-t border-white/10 my-1" />

                            <button
                              onClick={() => {
                                handleDeleteList(list.id);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-right px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10 rounded-xl flex items-center gap-2 cursor-pointer"
                            >
                              <Trash2 size={14} /> حذف لیست
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>

                  {/* پیش‌نمایش پوسترهای داخل لیست */}
                  {items.length > 0 ? (
                    <div className="mt-4 pt-4 border-t border-white/5 flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                      {items.slice(0, 8).map((item: any) => (
                        <div key={item.id} className="w-14 h-20 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-black/40">
                          <img 
                            src={getImageUrl(item.poster_path)} 
                            alt={item.show_name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {items.length > 8 && (
                        <div className="w-14 h-20 rounded-lg shrink-0 bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-gray-400">
                          +{items.length - 8}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-500 mt-3 italic">
                      این لیست هنوز هیچ سریالی ندارد؛ با زدن «افزودن سریال‌ها» هر سریالی را اضافه کنید.
                    </p>
                  )}

                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-3xl p-8">
            <Layers size={48} className="text-gray-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-300">هنوز هیچ لیستی نساخته‌اید</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              لیست‌های دلخواه بسازید، سریال‌های محبوب جهان را در آن جمع‌آوری کنید و به دیگران پیشنهاد دهید.
            </p>
          </div>
        )}

      </div>

      {/* --- ۱. مدال ساخت یا ویرایش لیست --- */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/15 w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
            <button 
              onClick={() => setIsFormModalOpen(false)}
              className="absolute top-4 left-4 p-2 text-gray-400 hover:text-white rounded-full bg-white/5 cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
              <Layers size={20} className="text-[#ccff00]" />
              <span>{editingList ? 'ویرایش لیست' : 'ساخت لیست جدید'}</span>
            </h3>

            <form onSubmit={handleSaveList} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">نام لیست *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثلاً: ۱۰ مینی‌سریال معمایی شاهکار"
                  className="w-full bg-[#0a0a0a] border border-white/15 rounded-xl p-3 text-white focus:border-[#ccff00] focus:outline-none text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">توضیحات لیست (اختیاری)</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="دلیل معرفی این لیست یا توضیحی برای بقیه کاربران..."
                  className="w-full bg-[#0a0a0a] border border-white/15 rounded-xl p-3 text-white focus:border-[#ccff00] focus:outline-none text-sm resize-none"
                />
              </div>

              {/* سوییچ عمومی / خصوصی */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">وضعیت نمایش لیست</span>
                  <span className="text-[10px] text-gray-400">
                    {isPublic ? 'عمومی (نمایش در پروفایل و برای دیگران)' : 'خصوصی (فقط برای خودم)'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPublic(!isPublic)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                    isPublic ? 'bg-[#ccff00]' : 'bg-gray-700'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-black transition-transform ${isPublic ? 'translate-x-0' : '-translate-x-6'}`} />
                </button>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={savingList}
                  className="flex-1 bg-[#ccff00] hover:bg-[#b3e600] text-black font-black py-3 rounded-xl transition-all active:scale-95 text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  {savingList ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  <span>{editingList ? 'ثبت ویرایش' : 'ساخت لیست'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-3 bg-white/5 text-gray-400 hover:text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ۲. مدال مدیریت سریال‌ها و سرچ زنده در کل TMDB --- */}
      {activeListForShows && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/15 w-full max-w-2xl rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh] relative">
            
            {/* هدر مدال */}
            <div className="flex justify-between items-start pb-4 border-b border-white/10">
              <div>
                <span className="text-[10px] text-[#ccff00] font-bold block">افزودن و مدیریت سریال‌ها</span>
                <h3 className="text-lg font-black text-white">{activeListForShows.title}</h3>
              </div>
              <button 
                onClick={() => setActiveListForShows(null)}
                className="p-2 text-gray-400 hover:text-white rounded-full bg-white/5 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* کادر سرچ زنده کل سریال‌های دنیا در TMDB */}
            <div className="py-4">
              <div className="relative">
                <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchTMDB(e.target.value)}
                  placeholder="جستجوی نام هر سریالی در جهان (فارسی یا انگلیسی)..."
                  className="w-full bg-[#0a0a0a] border border-white/15 rounded-xl pr-11 pl-4 py-3 text-white text-xs focus:border-[#ccff00] focus:outline-none placeholder-gray-500"
                  autoFocus
                />
                {searching && (
                  <Loader2 size={16} className="animate-spin text-[#ccff00] absolute left-3.5 top-1/2 -translate-y-1/2" />
                )}
              </div>

              {/* نتایج زنده سرچ TMDB */}
              {searchResults.length > 0 && (
                <div className="mt-2 bg-[#181818] border border-white/15 rounded-2xl p-2 max-h-56 overflow-y-auto space-y-1.5 shadow-2xl custom-scrollbar">
                  {searchResults.slice(0, 6).map((show) => {
                    const isAdded = listShows.some(item => item.show_id === show.id);
                    return (
                      <div key={show.id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl transition-colors">
                        <div className="flex items-center gap-3">
                          <img 
                            src={getImageUrl(show.poster_path)} 
                            alt={show.name} 
                            className="w-10 h-14 object-cover rounded-lg bg-black"
                          />
                          <div>
                            <h5 className="text-xs font-bold text-white">{show.name}</h5>
                            <span className="text-[10px] text-gray-400 ltr block text-right">{show.first_air_date?.split('-')[0] || ''}</span>
                          </div>
                        </div>

                        <button
                          disabled={isAdded || addingShowId === show.id}
                          onClick={() => handleAddShowToList(show)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            isAdded 
                              ? 'bg-white/10 text-gray-400 cursor-not-allowed'
                              : 'bg-[#ccff00] hover:bg-[#b3e600] text-black'
                          }`}
                        >
                          {isAdded ? <Check size={14} /> : <Plus size={14} />}
                          <span>{isAdded ? 'اضافه شده' : 'افزودن'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* لیست سریال‌های فعلی این لیست */}
            <div className="flex-1 overflow-y-auto pt-2 border-t border-white/5 space-y-2 custom-scrollbar">
              <div className="flex justify-between items-center text-xs font-bold text-gray-400 px-1 mb-2">
                <span>سریال‌های داخل این لیست ({listShows.length})</span>
              </div>

              {listShows.length > 0 ? (
                listShows.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-white/[0.03] border border-white/5 p-2.5 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <img 
                        src={getImageUrl(item.poster_path)} 
                        alt={item.show_name} 
                        className="w-10 h-14 object-cover rounded-lg bg-black"
                      />
                      <span className="text-xs font-bold text-white">{item.show_name}</span>
                    </div>

                    <button
                      onClick={() => handleRemoveShowFromList(item.id)}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                      title="حذف از لیست"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500 text-xs">
                  هنوز هیچ سریالی اضافه نشده است. با کادر بالا اسم هر سریالی را سرچ کنید.
                </div>
              )}
            </div>

            {/* دکمه اتمام */}
            <div className="pt-4 border-t border-white/10 mt-2">
              <button
                onClick={() => setActiveListForShows(null)}
                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                بستن و بازگشت
              </button>
            </div>

          </div>
        </div>
      )}

      {/* اعلان تستی ساده (Toast) */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1c1c1c] text-[#ccff00] border border-[#ccff00]/40 px-5 py-2.5 rounded-full text-xs font-bold shadow-2xl z-50 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}