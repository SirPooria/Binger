"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { searchShows, getImageUrl } from '@/lib/tmdbClient';
import Link from 'next/link';
import { 
  Plus, MoreVertical, Trash2, Edit3, Share2, Globe, 
  Lock, ArrowUp, ArrowDown, Search, X, Loader2, ArrowRight, ArrowLeft,
  Check, Film, Layers, CheckCircle2, Compass, Pin, Crown, Sparkles, AlertCircle
} from 'lucide-react';
import { ShowCardProgress } from '../components/ShowProgressBar';
import ConfirmModal from '../components/ConfirmModal';

export default function CustomListsPage() {
  const router = useRouter();
  const supabase = createClient() as any;

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isVip, setIsVip] = useState(false);
  const [lists, setLists] = useState<any[]>([]);

  // استیت‌های مدال ساخت / ویرایش لیست
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<any>(null);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [newSelectedShows, setNewSelectedShows] = useState<any[]>([]);
  const [createSearchQuery, setCreateSearchQuery] = useState('');
  const [createSearchResults, setCreateSearchResults] = useState<any[]>([]);
  const [createSearching, setCreateSearching] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [savingList, setSavingList] = useState(false);
  const [deleteConfirmList, setDeleteConfirmList] = useState<any | null>(null);
  const [isDeletingList, setIsDeletingList] = useState(false);

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

      // خواندن وضعیت VIP کاربر
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_vip, role')
        .eq('id', user.id)
        .single();
      const userIsVip = profile?.is_vip === true || profile?.role === 'admin';
      setIsVip(userIsVip);

      // خواندن لیست‌ها مرتب شده بر اساس رتبه اولویت
      let listsData: any[] | null = null;
      let listsError: any = null;

      const resWithPin = await supabase
        .from('user_lists')
        .select(`
          *,
          list_items ( id, show_id, show_name, poster_path )
        `)
        .eq('user_id', user.id)
        .order('is_pinned', { ascending: false })
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: false });

      if (resWithPin.error && (resWithPin.error.message?.includes('is_pinned') || resWithPin.error.code === '42703')) {
        // اگر ستون is_pinned هنوز در دیتابیس ایجاد نشده باشد، با اولویت عادی فراخوانی می‌کنیم
        const resFallback = await supabase
          .from('user_lists')
          .select(`
            *,
            list_items ( id, show_id, show_name, poster_path )
          `)
          .eq('user_id', user.id)
          .order('order_index', { ascending: true })
          .order('created_at', { ascending: false });
        listsData = resFallback.data;
        listsError = resFallback.error;
      } else {
        listsData = resWithPin.data;
        listsError = resWithPin.error;
      }

      if (listsError) throw listsError;
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

  // ۲.۵ سنجاق کردن یا لغو سنجاق لیست در بالای پروفایل (مخصوص VIP)
  const handleTogglePin = async (list: any) => {
    if (!isVip) {
      setIsUpgradeModalOpen(true);
      return;
    }

    const nextPinned = !list.is_pinned;
    try {
      if (nextPinned) {
        // برای داشتن یک لیست پین‌شده شاخص، بقیه را آن‌پین می‌کنیم
        await supabase.from('user_lists').update({ is_pinned: false }).eq('user_id', user.id);
      }
      const { error } = await supabase
        .from('user_lists')
        .update({ is_pinned: nextPinned })
        .eq('id', list.id);

      if (error) {
        if (error.message?.includes('is_pinned')) {
          showToast('ستون is_pinned در دیتابیس یافت نشد. لطفاً دستور SQL مایگریشن را اجرا کنید.');
          return;
        }
        throw error;
      }
      setLists(lists.map(l => ({
        ...l,
        is_pinned: l.id === list.id ? nextPinned : false
      })));
      showToast(nextPinned ? 'لیست در بالای پروفایل شما سنجاق (پین) شد! 📌' : 'پین لیست از بالای پروفایل برداشته شد.');
    } catch (err) {
      console.error(err);
      showToast('خطا در تغییر وضعیت پین.');
    }
  };

  // کمکی: باز و بسته کردن مدال ساخت / ویرایش
  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setCreateStep(1);
    setTitle('');
    setDescription('');
    setIsPublic(true);
    setNewSelectedShows([]);
    setCreateSearchQuery('');
    setCreateSearchResults([]);
    setEditingList(null);
  };

  const openCreateModal = () => {
    if (!isVip && lists.length >= 3) {
      setIsUpgradeModalOpen(true);
      return;
    }
    setEditingList(null);
    setCreateStep(1);
    setTitle('');
    setDescription('');
    setIsPublic(true);
    setNewSelectedShows([]);
    setCreateSearchQuery('');
    setCreateSearchResults([]);
    setIsFormModalOpen(true);
  };

  // سرچ زنده سریال برای مدال مرحله ۲ ساخت لیست
  const handleSearchTMDBForCreate = async (q: string) => {
    setCreateSearchQuery(q);
    if (!q.trim()) {
      setCreateSearchResults([]);
      return;
    }
    setCreateSearching(true);
    try {
      const results = await searchShows(q);
      setCreateSearchResults(results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCreateSearching(false);
    }
  };

  const handleAddShowToNewList = (show: any) => {
    if (newSelectedShows.some(s => s.id === show.id)) return;
    setNewSelectedShows([
      {
        id: show.id,
        name: show.name || show.original_name,
        poster_path: show.poster_path,
        first_air_date: show.first_air_date,
      },
      ...newSelectedShows,
    ]);
    showToast(`«${show.name || show.original_name}» به لیست اضافه شد.`);
  };

  const handleRemoveShowFromNewList = (showId: number) => {
    setNewSelectedShows(newSelectedShows.filter(s => s.id !== showId));
  };

  // ۳. ذخیره یا ویرایش مشخصات لیست
  const handleSaveList = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || !user) return;

    // بررسی سقف ۳ لیست برای کاربران عادی
    if (!editingList && !isVip && lists.length >= 3) {
      closeFormModal();
      setIsUpgradeModalOpen(true);
      return;
    }

    // اگر در مرحله اول ساخت لیست جدید هستیم، مستقیم به مرحله ۲ (افزودن سریال‌ها) هدایت می‌شود
    if (!editingList && createStep === 1) {
      setCreateStep(2);
      return;
    }

    // شرط بسیار مهم: لیست بدون سریال ثبت نمی‌شود (حداقل ۱ سریال اجباری است)
    if (!editingList && newSelectedShows.length === 0) {
      showToast('برای ثبت لیست، باید حداقل ۱ سریال به آن اضافه کنید.');
      return;
    }

    setSavingList(true);
    try {
      if (editingList) {
        // ویرایش مشخصات لیست موجود
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
        showToast('اطلاعات لیست با موفقیت ویرایش شد.');
      } else {
        // ساخت جدید هم‌زمان با تمام سریال‌های انتخاب‌شده (حداقل ۱ سریال)
        const nextOrderIndex = lists.length;
        const { data: newListData, error: listError } = await supabase
          .from('user_lists')
          .insert({
            user_id: user.id,
            title: title.trim(),
            description: description.trim(),
            is_public: isPublic,
            order_index: nextOrderIndex,
          })
          .select()
          .single();

        if (listError) throw listError;

        // درج هم‌زمان تمام سریال‌های اضافه شده در list_items
        const itemsToInsert = newSelectedShows.map((s) => ({
          list_id: newListData.id,
          show_id: s.id,
          show_name: s.name,
          poster_path: s.poster_path,
        }));

        const { error: itemsError } = await supabase
          .from('list_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;

        showToast(`لیست «${title.trim()}» با موفقیت همراه با ${itemsToInsert.length} سریال ایجاد شد! 🎉`);
      }

      closeFormModal();
      await fetchUserLists();

    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'خطا در ثبت لیست.');
    } finally {
      setSavingList(false);
    }
  };

  // ۴. حذف لیست با مدال اختصاصی
  const handleConfirmDeleteList = async () => {
    if (!deleteConfirmList) return;
    setIsDeletingList(true);
    try {
      const { error } = await supabase.from('user_lists').delete().eq('id', deleteConfirmList.id);
      if (error) throw error;
      setLists(lists.filter((l) => l.id !== deleteConfirmList.id));
      showToast(`لیست «${deleteConfirmList.title}» با موفقیت حذف شد.`);
      setDeleteConfirmList(null);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'خطا در حذف لیست.');
    } finally {
      setIsDeletingList(false);
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
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white p-4 md:p-8 pb-28 md:pb-12">
      <div className="max-w-5xl mx-auto">

        {/* هدر بالای صفحه */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
                  <Layers className="text-[#ccff00]" size={26} /> لیست‌های سفارشی من
                </h1>
                {isVip ? (
                  <span className="bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                    <Crown size={14} className="fill-amber-300" /> کاربر ویژه VIP (نامحدود)
                  </span>
                ) : (
                  <span className="bg-white/5 border border-white/10 text-gray-300 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <span>ظرفیت لیست‌ها:</span>
                    <strong className={lists.length >= 3 ? "text-amber-400 font-black" : "text-[#ccff00] font-black"}>
                      {lists.length} از ۳ (عادی)
                    </strong>
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                لیست‌های اختصاصی بسازید، اولویت آن‌ها را مشخص کنید و لیست‌های منتخب را در بالای پروفایل‌تان سنجاق (پین) کنید.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openCreateModal}
              className="bg-[#ccff00] hover:bg-[#b3e600] text-black font-black text-xs px-5 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(204,255,0,0.25)] active:scale-95 cursor-pointer"
            >
              <Plus size={18} />
              <span>ساخت لیست جدید</span>
            </button>
            <Link
              href="/dashboard/custom-lists/explore"
              className="bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold text-xs px-5 py-3 rounded-2xl flex items-center gap-2 transition-all cursor-pointer"
            >
              <Compass size={18} /> کشف لیست‌ها
            </Link>
          </div>
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
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {/* بج پین در بالای پروفایل */}
                        {list.is_pinned && (
                          <span className="bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-md flex items-center gap-1 shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                            <Pin size={11} className="fill-amber-300" /> سنجاق در بالای پروفایل
                          </span>
                        )}

                        {/* بج اولویت نمایش */}
                        <span className="bg-white/10 border border-white/10 text-[10px] font-bold px-2 py-0.5 rounded-md text-gray-300 shrink-0">
                          اولویت {index + 1}
                        </span>

                        {/* بج وضعیت عمومی/خصوصی */}
                        {list.is_public ? (
                          <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                            <Globe size={11} /> عمومی
                          </span>
                        ) : (
                          <span className="bg-gray-500/10 border border-gray-500/30 text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                            <Lock size={11} /> خصوصی
                          </span>
                        )}

                        <span className="text-xs text-gray-500 shrink-0">• {items.length} سریال</span>
                      </div>

                      <h3 className="text-lg md:text-xl font-black text-white truncate">
                        {list.title}
                      </h3>

                      {list.description && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed max-w-2xl">
                          {list.description}
                        </p>
                      )}
                    </div>

                    {/* دکمه‌های جابجایی اولویت (Swap) + دکمه پین + منوی سه نقطه */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                      
                      {/* دکمه پین سریع */}
                      <button
                        onClick={() => handleTogglePin(list)}
                        className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                          list.is_pinned
                            ? 'bg-amber-500/20 border-amber-400/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                        title={list.is_pinned ? 'لغو سنجاق از بالای پروفایل' : 'سنجاق به عنوان لیست منتخب در بالای پروفایل (مخصوص VIP)'}
                      >
                        <Pin size={14} className={list.is_pinned ? 'fill-amber-300' : ''} />
                        <span className="hidden sm:inline">{list.is_pinned ? 'پین‌شده' : 'پین به پروفایل'}</span>
                      </button>

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
                        className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Search size={14} className="text-[#ccff00]" />
                        <span className="hidden sm:inline">افزودن / مدیریت سریال‌ها</span>
                        <span className="sm:hidden">مدیریت سریال‌ها</span>
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
                            className="absolute left-0 mt-2 w-52 bg-[#181818] border border-white/15 rounded-2xl p-1.5 shadow-2xl z-30 space-y-1 animate-in fade-in zoom-in-95 duration-150"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => {
                                handleTogglePin(list);
                                setOpenMenuId(null);
                              }}
                              className={`w-full text-right px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer ${
                                list.is_pinned
                                  ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                                  : 'text-gray-300 hover:text-white hover:bg-white/10'
                              }`}
                            >
                              <Pin size={14} className={list.is_pinned ? 'fill-amber-400' : ''} />
                              <span>{list.is_pinned ? 'لغو سنجاق از بالای پروفایل' : '📌 سنجاق در بالای پروفایل (VIP)'}</span>
                            </button>
                            <button
                              onClick={() => {
                                setEditingList(list);
                                setCreateStep(1);
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
                                setDeleteConfirmList(list);
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
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto mb-5">
              لیست‌های دلخواه بسازید، سریال‌های محبوب جهان را در آن جمع‌آوری کنید و به دیگران پیشنهاد دهید.
            </p>
            <button
              onClick={openCreateModal}
              className="bg-[#ccff00] hover:bg-[#b3e600] text-black font-black text-xs px-5 py-3 rounded-2xl inline-flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(204,255,0,0.25)] active:scale-95 cursor-pointer"
            >
              <Plus size={18} />
              <span>ساخت اولین لیست</span>
            </button>
          </div>
        )}

      </div>

      {/* --- ۱. مدال ساخت چندمرحله‌ای یا ویرایش لیست --- */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`bg-[#141414] border border-white/15 w-full ${!editingList && createStep === 2 ? 'max-w-2xl' : 'max-w-md'} rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[90vh] transition-all`}>
            <button 
              onClick={closeFormModal}
              className="absolute top-4 left-4 p-2 text-gray-400 hover:text-white rounded-full bg-white/5 cursor-pointer z-10"
            >
              <X size={18} />
            </button>

            {/* Stepper برای ساخت لیست جدید */}
            {!editingList && (
              <div className="flex items-center justify-between mb-4 bg-white/[0.03] border border-white/10 p-2.5 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setCreateStep(1)}
                  className={`flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer ${
                    createStep === 1 ? 'text-[#ccff00]' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                    createStep === 1 ? 'bg-[#ccff00] text-black' : 'bg-white/10 text-white'
                  }`}>
                    ۱
                  </div>
                  <span>مشخصات لیست</span>
                </button>

                <div className={`h-[2px] flex-1 mx-3 rounded-full transition-colors ${
                  createStep === 2 ? 'bg-[#ccff00]' : 'bg-white/10'
                }`} />

                <div className={`flex items-center gap-2 text-xs font-bold ${
                  createStep === 2 ? 'text-[#ccff00]' : 'text-gray-500'
                }`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                    createStep === 2 ? 'bg-[#ccff00] text-black' : 'bg-white/10 text-gray-400'
                  }`}>
                    ۲
                  </div>
                  <span>افزودن سریال‌ها ({newSelectedShows.length})</span>
                </div>
              </div>
            )}

            {/* عنوان مدال */}
            <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
              <Layers size={20} className="text-[#ccff00]" />
              <span>
                {editingList 
                  ? 'ویرایش لیست' 
                  : createStep === 1 
                    ? 'ساخت لیست جدید' 
                    : `افزودن سریال‌ها به «${title}»`
                }
              </span>
            </h3>

            {/* گام ۱: مشخصات اولیه لیست */}
            {(editingList || createStep === 1) && (
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
                    className="flex-1 bg-[#ccff00] hover:bg-[#b3e600] text-black font-black py-3 rounded-xl transition-all active:scale-95 text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#ccff00]/10"
                  >
                    {savingList ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : editingList ? (
                      <Check size={16} />
                    ) : (
                      <ArrowLeft size={16} />
                    )}
                    <span>{editingList ? 'ثبت ویرایش' : 'مرحله بعد: افزودن سریال‌ها'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={closeFormModal}
                    className="px-4 py-3 bg-white/5 text-gray-400 hover:text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            )}

            {/* گام ۲: جستجو و افزودن سریال‌ها (فقط برای ساخت لیست جدید) */}
            {!editingList && createStep === 2 && (
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* کادر سرچ زنده کل سریال‌ها در TMDB */}
                <div className="py-2">
                  <div className="relative">
                    <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={createSearchQuery}
                      onChange={(e) => handleSearchTMDBForCreate(e.target.value)}
                      placeholder="جستجوی نام هر سریالی در جهان (فارسی یا انگلیسی)..."
                      className="w-full bg-[#0a0a0a] border border-white/15 rounded-xl pr-11 pl-4 py-3 text-white text-xs focus:border-[#ccff00] focus:outline-none placeholder-gray-500"
                      autoFocus
                    />
                    {createSearching && (
                      <Loader2 size={16} className="animate-spin text-[#ccff00] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    )}
                  </div>

                  {/* نتایج زنده سرچ TMDB */}
                  {createSearchResults.length > 0 && (
                    <div className="mt-2 bg-[#181818] border border-white/15 rounded-2xl p-2 max-h-48 overflow-y-auto space-y-1.5 shadow-2xl custom-scrollbar">
                      {createSearchResults.slice(0, 6).map((show) => {
                        const isAdded = newSelectedShows.some(s => s.id === show.id);
                        return (
                          <div key={show.id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="relative w-10 h-14 shrink-0 rounded-lg overflow-hidden bg-black">
                                <img 
                                  src={getImageUrl(show.poster_path)} 
                                  alt={show.name} 
                                  className="w-full h-full object-cover"
                                />
                                <ShowCardProgress showId={show.id} showPercentageBadge={false} />
                              </div>
                              <div>
                                <h5 className="text-xs font-bold text-white">{show.name}</h5>
                                <span className="text-[10px] text-gray-400 ltr block text-right">
                                  {show.first_air_date?.split('-')[0] || ''}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleAddShowToNewList(show)}
                              disabled={isAdded}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                isAdded 
                                  ? 'bg-white/10 text-gray-400 cursor-not-allowed'
                                  : 'bg-[#ccff00] hover:bg-[#b3e600] text-black'
                              }`}
                            >
                              {isAdded ? <Check size={14} /> : <Plus size={14} />}
                              <span>{isAdded ? 'اضافه شد' : 'افزودن'}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* بخش نمایش سریال‌های انتخاب‌شده */}
                <div className="flex-1 overflow-y-auto pt-2 border-t border-white/5 space-y-2 custom-scrollbar my-2">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-400 px-1">
                    <span>سریال‌های انتخاب‌شده ({newSelectedShows.length})</span>
                    {newSelectedShows.length === 0 && (
                      <span className="text-amber-400 text-[11px] font-medium flex items-center gap-1">
                        <AlertCircle size={13} />
                        حداقل ۱ سریال الزامی است
                      </span>
                    )}
                  </div>

                  {newSelectedShows.length > 0 ? (
                    newSelectedShows.map((show) => (
                      <div key={show.id} className="flex items-center justify-between bg-white/[0.03] border border-white/5 p-2 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="relative w-9 h-12 shrink-0 rounded-lg overflow-hidden bg-black">
                            <img 
                              src={getImageUrl(show.poster_path)} 
                              alt={show.name} 
                              className="w-full h-full object-cover"
                            />
                            <ShowCardProgress showId={show.id} showPercentageBadge={false} />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block">{show.name}</span>
                            {show.first_air_date && (
                              <span className="text-[10px] text-gray-400 ltr block text-right">
                                {show.first_air_date.split('-')[0]}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveShowFromNewList(show.id)}
                          className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                          title="حذف از لیست"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 bg-amber-500/5 border border-dashed border-amber-500/20 rounded-2xl p-4">
                      <Film size={32} className="text-amber-400/60 mx-auto mb-2" />
                      <p className="text-xs font-bold text-amber-300">هنوز هیچ سریالی انتخاب نکرده‌اید</p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        برای ثبت و ساخت این لیست، حداقل ۱ سریال را از کادر بالا جستجو و اضافه کنید.
                      </p>
                    </div>
                  )}
                </div>

                {/* دکمه‌های اقدام نهایی مرحله ۲ */}
                <div className="pt-3 border-t border-white/10 flex gap-3 mt-auto">
                  <button
                    type="button"
                    onClick={() => setCreateStep(1)}
                    className="px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowRight size={14} />
                    <span>مرحله قبل</span>
                  </button>

                  <button
                    type="button"
                    disabled={newSelectedShows.length === 0 || savingList}
                    onClick={() => handleSaveList()}
                    className={`flex-1 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      newSelectedShows.length === 0
                        ? 'bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed'
                        : 'bg-[#ccff00] hover:bg-[#b3e600] text-black active:scale-95 shadow-lg shadow-[#ccff00]/20'
                    }`}
                  >
                    {savingList ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Check size={16} />
                    )}
                    <span>
                      {newSelectedShows.length === 0 
                        ? 'حداقل ۱ سریال اضافه کنید تا ثبت شود' 
                        : `ثبت و ساخت لیست (${newSelectedShows.length} سریال)`
                      }
                    </span>
                  </button>
                </div>
              </div>
            )}
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
                          <div className="relative w-10 h-14 shrink-0 rounded-lg overflow-hidden bg-black">
                            <img 
                              src={getImageUrl(show.poster_path)} 
                              alt={show.name} 
                              className="w-full h-full object-cover"
                            />
                            <ShowCardProgress showId={show.id} showPercentageBadge={false} />
                          </div>
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
                      <div className="relative w-10 h-14 shrink-0 rounded-lg overflow-hidden bg-black">
                        <img 
                          src={getImageUrl(item.poster_path)} 
                          alt={item.show_name} 
                          className="w-full h-full object-cover"
                        />
                        <ShowCardProgress showId={item.show_id} showPercentageBadge={false} />
                      </div>
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

      {/* مدال ارتقا به VIP برای سقف لیست‌ها و قابلیت پین */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#121212] border border-amber-400/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-[0_0_50px_rgba(245,158,11,0.25)] text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />
            
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-300 flex items-center justify-center mx-auto mb-4 shadow-[0_0_25px_rgba(245,158,11,0.3)]">
              <Crown size={32} />
            </div>

            <h3 className="text-xl font-black text-white mb-2">
              دسترسی اختصاصی کاربران VIP
            </h3>
            
            <p className="text-xs text-gray-300 leading-relaxed mb-6">
              کاربران عادی حداکثر می‌توانند <span className="text-amber-400 font-bold">۳ لیست سفارشی</span> بسازند.
              با تهیه اشتراک <span className="text-amber-300 font-bold">Binger VIP</span>، قابلیت ساخت <span className="text-[#ccff00] font-bold">نامحدود لیست</span>، سنجاق کردن کالکشن در بالای پروفایل، و دسترسی به آمار پیشرفته و سالنامه Binger Wrapped برای شما فعال می‌شود.
            </p>

            <div className="space-y-2.5">
              <Link
                href="/dashboard/subscription"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all"
              >
                <Sparkles size={16} />
                <span>مشاهده پلن‌ها و خرید اشتراک VIP</span>
              </Link>

              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(false)}
                className="w-full py-2.5 text-xs text-gray-400 hover:text-white font-bold transition-colors cursor-pointer"
              >
                فعلاً نه، متوجه شدم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مدال اختصاصی تأیید حذف لیست */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirmList)}
        onClose={() => {
          if (!isDeletingList) setDeleteConfirmList(null);
        }}
        onConfirm={handleConfirmDeleteList}
        title="حذف کامل لیست"
        description={`آیا از حذف کامل لیست «${deleteConfirmList?.title || ''}» اطمینان دارید؟ تمامی سریال‌های داخل این لیست نیز برداشته خواهند شد و این عملیات قابل بازگشت نیست.`}
        confirmText="بله، حذف این لیست"
        cancelText="انصراف"
        variant="danger"
        loading={isDeletingList}
      />

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