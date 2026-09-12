"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { 
  Users, Tv, MessageSquare, Flame, 
  Trash2, Search, ArrowRight, ShieldAlert, CheckCircle2, 
  Loader2, ExternalLink, Sparkles, Shield
} from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient() as any;

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // تب فعال در پنل ادمین
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'comments'>('stats');

  // داده‌های آماری
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalWatched: 0,
    totalComments: 0,
    totalReactions: 0
  });

  // لیست کاربران
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');

  // لیست کامنت‌ها
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);

  // پیام اعلان (Toast)
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  useEffect(() => {
    const initAdmin = async () => {
      try {
        setLoading(true);
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
          router.replace('/login');
          return;
        }
        setUser(currentUser);

        // بررسی نقش ادمین در جدول profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', currentUser.id)
          .maybeSingle();

        const userRole = profile?.role || currentUser.user_metadata?.role;

        // اگر نقش ادمین نبود
        if (userRole !== 'admin') {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        setIsAdmin(true);

        // دریافت آمار کلی و لیست‌ها
        await Promise.all([
          loadStats(),
          loadUsers(),
          loadComments()
        ]);

      } catch (err) {
        console.error("Admin init error:", err);
      } finally {
        setLoading(false);
      }
    };

    initAdmin();
  }, [router, supabase]);

  // ۱. دریافت آمار کلی سامانه
  const loadStats = async () => {
    try {
      const [usersRes, watchedRes, commentsRes, reactionsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('watched').select('id', { count: 'exact', head: true }),
        supabase.from('comments').select('id', { count: 'exact', head: true }),
        supabase.from('episode_reactions').select('id', { count: 'exact', head: true })
      ]);

      setStats({
        totalUsers: usersRes.count || 0,
        totalWatched: watchedRes.count || 0,
        totalComments: commentsRes.count || 0,
        totalReactions: reactionsRes.count || 0
      });
    } catch (err) {
      console.error(err);
    }
  };

  // ۲. دریافت لیست کاربران و تعداد تماشای هر کاربر
  const loadUsers = async () => {
    try {
      const [profilesRes, watchedRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('watched').select('user_id')
      ]);

      const profiles = profilesRes.data || [];
      const watched = watchedRes.data || [];

      const watchedMap: Record<string, number> = {};
      watched.forEach((w: any) => {
        if (w.user_id) watchedMap[w.user_id] = (watchedMap[w.user_id] || 0) + 1;
      });

      const formatted = profiles.map((p: any) => ({
        ...p,
        watchedCount: watchedMap[p.id] || 0
      }));

      setUsersList(formatted);
    } catch (err) {
      console.error(err);
    }
  };

  // ۳. دریافت نظرات برای مدیریت و حذف
  const loadComments = async () => {
    try {
      const { data: comments } = await supabase
        .from('comments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (comments && comments.length > 0) {
        const userIds = Array.from(new Set(comments.map((c: any) => c.user_id)));
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        const profMap: Record<string, any> = {};
        (profiles || []).forEach((p: any) => { profMap[p.id] = p; });

        const formatted = comments.map((c: any) => ({
          ...c,
          authorName: profMap[c.user_id]?.username || 'کاربر بینجر',
          authorAvatar: profMap[c.user_id]?.avatar_url || '😎'
        }));

        setCommentsList(formatted);
      } else {
        setCommentsList([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // حذف نظر توسط ادمین
  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('آیا از حذف این نظر مطمئن هستید؟')) return;

    setDeletingCommentId(commentId);
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      setCommentsList(prev => prev.filter(c => c.id !== commentId));
      showToast('نظر با موفقیت حذف شد.');
    } catch (err: any) {
      console.error(err);
      showToast('خطا در حذف نظر.');
    } finally {
      setDeletingCommentId(null);
    }
  };

  // تغییر نقش کاربر (تبدیل به VIP یا عادی)
  const handleToggleRole = async (targetUserId: string, currentRole: string) => {
    const nextRole = currentRole === 'vip' ? 'user' : 'vip';
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: nextRole })
        .eq('id', targetUserId);

      if (error) throw error;

      setUsersList(prev => prev.map(u => u.id === targetUserId ? { ...u, role: nextRole } : u));
      showToast(`نقش کاربر به ${nextRole === 'vip' ? 'ویژه (VIP)' : 'عادی'} تغییر یافت.`);
    } catch (err: any) {
      console.error(err);
      showToast('خطا در تغییر نقش کاربر.');
    }
  };

  // فیلتر کاربران در کادر جستجو
  const filteredUsers = usersList.filter(u => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    const name = (u.username || '').toLowerCase();
    const phone = (u.phone || '').toLowerCase();
    return name.includes(q) || phone.includes(q);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-[#ccff00]">
        <Loader2 className="animate-spin" size={44} />
      </div>
    );
  }

  // اگر کاربر ادمین نباشد
  if (!isAdmin) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#050505] flex items-center justify-center p-4 font-['Vazirmatn'] text-white">
        <div className="bg-[#121212] border border-red-500/30 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-400 mx-auto mb-4 shadow-inner">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-xl font-black text-white mb-2">دسترسی غیرمجاز</h2>
          <p className="text-xs text-gray-400 leading-relaxed mb-6">
            این بخش فقط مخصوص مدیریت پلتفرم بینجر است. برای فعال‌سازی دسترسی مدیریت، نقش اکانت خود را در دیتابیس روی admin بگذارید.
          </p>
          <Link
            href="/dashboard"
            className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-6 rounded-xl transition-colors block text-xs"
          >
            بازگشت به پنل کاربری
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] p-4 md:p-8 pb-24">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* هدر بالای پنل مدیریت */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#ccff00] text-black flex items-center justify-center shadow-[0_0_25px_rgba(204,255,0,0.3)]">
              <Shield size={24} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white">اتاق فرمان بینجر</h1>
                <span className="text-[10px] bg-[#ccff00] text-black font-black px-2 py-0.5 rounded-full uppercase">
                  ADMIN
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                مدیریت کاربران، نظارت بر محتوا و آمار لحظه‌ای کل سامانه
              </p>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-xl border border-white/10 transition-all cursor-pointer"
          >
            <span>ورود به محیط کاربری</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* دکمه‌های جابجایی بین تب‌ها */}
        <div className="flex gap-2 p-1.5 bg-[#121212] border border-white/10 rounded-2xl max-w-md">
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'stats'
                ? 'bg-[#ccff00] text-black shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Flame size={15} />
            <span>آمار کل</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'users'
                ? 'bg-[#ccff00] text-black shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users size={15} />
            <span>کاربران</span>
          </button>

          <button
            onClick={() => setActiveTab('comments')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'comments'
                ? 'bg-[#ccff00] text-black shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <MessageSquare size={15} />
            <span>نظرات</span>
          </button>
        </div>

        {/* ================= تب ۱: آمار کلی سیستم ================= */}
        {activeTab === 'stats' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-[#121212] border border-white/10 p-5 rounded-3xl shadow-xl relative overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center mb-3">
                  <Users size={20} />
                </div>
                <span className="text-xs text-gray-400 font-bold block">تعداد کل کاربران</span>
                <span className="text-2xl sm:text-3xl font-black text-white ltr mt-1 block">
                  {stats.totalUsers.toLocaleString()}
                </span>
              </div>

              <div className="bg-[#121212] border border-white/10 p-5 rounded-3xl shadow-xl relative overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-[#ccff00]/15 text-[#ccff00] flex items-center justify-center mb-3">
                  <Tv size={20} />
                </div>
                <span className="text-xs text-gray-400 font-bold block">مجموع اپیزودهای تماشا شده</span>
                <span className="text-2xl sm:text-3xl font-black text-[#ccff00] ltr mt-1 block">
                  {stats.totalWatched.toLocaleString()}
                </span>
              </div>

              <div className="bg-[#121212] border border-white/10 p-5 rounded-3xl shadow-xl relative overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center mb-3">
                  <MessageSquare size={20} />
                </div>
                <span className="text-xs text-gray-400 font-bold block">نظرات و بحث‌ها</span>
                <span className="text-2xl sm:text-3xl font-black text-cyan-400 ltr mt-1 block">
                  {stats.totalComments.toLocaleString()}
                </span>
              </div>

              <div className="bg-[#121212] border border-white/10 p-5 rounded-3xl shadow-xl relative overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-3">
                  <Flame size={20} />
                </div>
                <span className="text-xs text-gray-400 font-bold block">ری‌اکشن‌ها و آرا</span>
                <span className="text-2xl sm:text-3xl font-black text-amber-400 ltr mt-1 block">
                  {stats.totalReactions.toLocaleString()}
                </span>
              </div>

            </div>

            <div className="bg-[#121212] border border-white/10 rounded-3xl p-6 shadow-xl">
              <h3 className="text-sm font-black text-white flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-[#ccff00]" /> سلامت فنی و وضعیت سرورها
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-300">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <span className="text-gray-500 block mb-1">دیتابیس PostgreSQL:</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    آنلاین و پایدار (Supabase)
                  </span>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <span className="text-gray-500 block mb-1">ورکر کلودفلر (TMDB):</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    فعال و پرسرعت
                  </span>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <span className="text-gray-500 block mb-1">میزبانی سرورلس:</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    دیپلوی آنلاین (Vercel)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= تب ۲: مدیریت کاربران ================= */}
        {activeTab === 'users' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="جستجوی نام یا شماره کاربر..."
                  className="w-full bg-[#121212] border border-white/15 rounded-2xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-gray-500 focus:border-[#ccff00] focus:outline-none"
                />
              </div>
              <span className="text-xs text-gray-400 self-center">
                نمایش {filteredUsers.length} از {usersList.length} کاربر
              </span>
            </div>

            <div className="bg-[#121212] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-white/5 text-gray-400 border-b border-white/5">
                    <tr>
                      <th className="p-4">کاربر</th>
                      <th className="p-4">شماره تماس</th>
                      <th className="p-4">اپیزودها</th>
                      <th className="p-4">سطح کاربری</th>
                      <th className="p-4">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-lg shrink-0">
                            {u.avatar_url || '😎'}
                          </div>
                          <div>
                            <span className="font-bold text-white block">{u.username || 'کاربر بینجر'}</span>
                            <span className="text-[10px] text-gray-500 ltr font-mono">{u.id.substring(0, 8)}...</span>
                          </div>
                        </td>
                        <td className="p-4 ltr font-mono text-gray-400">{u.phone || '-'}</td>
                        <td className="p-4 font-black text-[#ccff00] ltr">{u.watchedCount} قسمت</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            u.role === 'admin' 
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                              : u.role === 'vip' 
                              ? 'bg-[#ccff00]/20 text-[#ccff00] border border-[#ccff00]/30' 
                              : 'bg-white/10 text-gray-400'
                          }`}>
                            {u.role === 'admin' ? 'مدیر ارشد' : u.role === 'vip' ? 'ویژه (VIP)' : 'عادی'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {u.role !== 'admin' && (
                              <button
                                onClick={() => handleToggleRole(u.id, u.role || 'user')}
                                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-[11px] font-bold text-gray-300 hover:text-white transition-colors cursor-pointer"
                              >
                                {u.role === 'vip' ? 'لغو VIP' : 'ارتقا به VIP'}
                              </button>
                            )}
                            <Link
                              href={`/dashboard/user/${u.id}`}
                              target="_blank"
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition-colors"
                              title="مشاهده پروفایل عمومی"
                            >
                              <ExternalLink size={14} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= تب ۳: نظارت بر نظرات ================= */}
        {activeTab === 'comments' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-bold">
                آخرین ۵۰ نظر ثبت شده در سامانه (مرتب شده از جدیدترین)
              </span>
            </div>

            <div className="space-y-3">
              {commentsList.length > 0 ? (
                commentsList.map((c) => (
                  <div key={c.id} className="bg-[#121212] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg hover:border-white/20 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm shrink-0 mt-0.5">
                        {c.authorAvatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-white">{c.authorName}</span>
                          <span className="text-[10px] text-gray-500 ltr font-mono">
                            {new Date(c.created_at).toLocaleDateString('fa-IR')}
                          </span>
                          {c.episode_id && (
                            <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded font-mono ltr">
                              اپیزود {c.episode_id}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed max-w-2xl">
                          {c.content}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        disabled={deletingCommentId === c.id}
                        className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        title="حذف این نظر"
                      >
                        {deletingCommentId === c.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        <span>حذف</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 text-gray-500 text-xs bg-[#121212] rounded-3xl border border-white/10">
                  هنوز نظری در سامانه ثبت نشده است.
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1c1c1c] text-[#ccff00] border border-[#ccff00]/40 px-5 py-2.5 rounded-full text-xs font-bold shadow-2xl z-50 flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}