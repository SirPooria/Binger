"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Tv, MessageSquare, Flame, 
  Trash2, Search, ArrowRight, ShieldAlert, CheckCircle2, 
  Loader2, Sparkles, Shield
} from 'lucide-react';
import Link from 'next/link';

interface AdminStats {
  totalUsers: number;
  totalWatched: number;
  totalComments: number;
  totalReactions: number;
}

interface AdminUserItem {
  id: string;
  username: string;
  avatar_url: string;
  role: string;
  is_vip: boolean;
  created_at: string;
  phone: string;
  watchedCount: number;
}

interface AdminCommentItem {
  id: number;
  user_id: string;
  show_id: number | null;
  episode_id: number | null;
  content: string | null;
  created_at: string;
  authorName: string;
  authorAvatar: string;
}

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'comments'>('stats');

  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalWatched: 0,
    totalComments: 0,
    totalReactions: 0,
  });

  const [usersList, setUsersList] = useState<AdminUserItem[]>([]);
  const [userSearch, setUserSearch] = useState('');

  const [commentsList, setCommentsList] = useState<AdminCommentItem[]>([]);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) throw new Error('Stats fetch failed');
      const data = await res.json() as AdminStats;
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Users fetch failed');
      const data = await res.json() as { users: AdminUserItem[] };
      setUsersList(data.users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  }, []);

  const loadComments = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/comments');
      if (!res.ok) throw new Error('Comments fetch failed');
      const data = await res.json() as { comments: AdminCommentItem[] };
      setCommentsList(data.comments || []);
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  }, []);

  useEffect(() => {
    const initAdmin = async () => {
      try {
        setLoading(true);
        // Verify admin access through server API
        const statsRes = await fetch('/api/admin/stats');
        if (statsRes.status === 401 || statsRes.status === 403) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        if (!statsRes.ok) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        setIsAdmin(true);
        const statsData = await statsRes.json() as AdminStats;
        setStats(statsData);

        await Promise.all([loadUsers(), loadComments()]);
      } catch (err) {
        console.error('Admin init error:', err);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    initAdmin();
  }, [loadUsers, loadComments]);

  const handleDeleteComment = async (commentId: number) => {
    if (!window.confirm('آیا از حذف این نظر مطمئن هستید؟')) return;

    setDeletingCommentId(commentId);
    try {
      const res = await fetch(`/api/admin/comments?id=${commentId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete comment');

      setCommentsList((prev) => prev.filter((c) => c.id !== commentId));
      showToast('نظر با موفقیت حذف شد.');
    } catch (err) {
      console.error(err);
      showToast('خطا در حذف نظر.');
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleToggleRole = async (targetUserId: string, currentRole: string) => {
    const nextRole = currentRole === 'vip' ? 'user' : 'vip';
    try {
      const res = await fetch('/api/admin/toggle-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, nextRole }),
      });

      if (!res.ok) throw new Error('Failed to update role');

      setUsersList((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, role: nextRole, is_vip: nextRole === 'vip' } : u))
      );
      showToast(`نقش کاربر به ${nextRole === 'vip' ? 'ویژه (VIP)' : 'عادی'} تغییر یافت.`);
    } catch (err) {
      console.error(err);
      showToast('خطا در تغییر نقش کاربر.');
    }
  };

  const filteredUsers = usersList.filter((u) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    const name = (u.username || '').toLowerCase();
    const phone = (u.phone || '').toLowerCase();
    return name.includes(q) || phone.includes(q);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-[#ccff00]">
        <Loader2 className="animate-spin" size={44} aria-label="در حال بارگذاری..." />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#050505] flex items-center justify-center p-4 font-['Vazirmatn'] text-white">
        <div className="bg-[#121212] border border-red-500/30 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-400 mx-auto mb-4 shadow-inner">
            <ShieldAlert size={32} />
          </div>
          <h1 className="text-xl font-black mb-2 text-white">عدم دسترسی به پنل مدیریت</h1>
          <p className="text-xs text-gray-400 mb-6 leading-relaxed">
            این بخش فقط مخصوص مدیران سیستم است و دسترسی شما مجاز شناخته نشد.
          </p>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ccff00]"
          >
            <span>بازگشت به داشبورد</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] selection:bg-[#ccff00] selection:text-black pb-24">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 left-6 z-50 bg-[#ccff00] text-black font-bold text-xs px-5 py-3 rounded-2xl shadow-[0_0_30px_rgba(204,255,0,0.3)] flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-40 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ccff00]/10 border border-[#ccff00]/20 flex items-center justify-center text-[#ccff00]">
              <Shield size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight">پنل مدیریت بینجر</h1>
                <span className="text-[10px] bg-[#ccff00] text-black font-black px-2 py-0.5 rounded-full uppercase">Admin</span>
              </div>
              <p className="text-[11px] text-gray-500">نظارت بر آمار، کاربران و دیدگاه‌ها</p>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white px-3 sm:px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-[#ccff00]"
          >
            <span>داشبورد</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8">
        {/* Navigation Tabs */}
        <nav aria-label="تب‌های پنل ادمین" className="flex items-center gap-2 mb-8 bg-[#111] p-1.5 rounded-2xl border border-white/5 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('stats')}
            className={`px-4 sm:px-6 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ccff00] ${
              activeTab === 'stats'
                ? 'bg-[#ccff00] text-black shadow-lg shadow-[#ccff00]/10'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Flame size={14} />
            <span>آمار کلی</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-4 sm:px-6 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ccff00] ${
              activeTab === 'users'
                ? 'bg-[#ccff00] text-black shadow-lg shadow-[#ccff00]/10'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users size={14} />
            <span>کاربران ({usersList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('comments')}
            className={`px-4 sm:px-6 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ccff00] ${
              activeTab === 'comments'
                ? 'bg-[#ccff00] text-black shadow-lg shadow-[#ccff00]/10'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageSquare size={14} />
            <span>دیدگاه‌ها ({commentsList.length})</span>
          </button>
        </nav>

        {/* Tab 1: Stats */}
        {activeTab === 'stats' && (
          <section aria-labelledby="stats-heading" className="space-y-6">
            <h2 id="stats-heading" className="sr-only">آمار کلی سامانه</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#101010] border border-white/5 rounded-3xl p-5 relative overflow-hidden group hover:border-[#ccff00]/30 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-gray-400 font-medium">کل کاربران</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Users size={16} />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black tracking-tight">{stats.totalUsers.toLocaleString('fa-IR')}</div>
              </div>

              <div className="bg-[#101010] border border-white/5 rounded-3xl p-5 relative overflow-hidden group hover:border-[#ccff00]/30 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-gray-400 font-medium">اپیزودهای دیده‌شده</span>
                  <div className="w-8 h-8 rounded-lg bg-[#ccff00]/10 text-[#ccff00] flex items-center justify-center">
                    <Tv size={16} />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black tracking-tight">{stats.totalWatched.toLocaleString('fa-IR')}</div>
              </div>

              <div className="bg-[#101010] border border-white/5 rounded-3xl p-5 relative overflow-hidden group hover:border-[#ccff00]/30 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-gray-400 font-medium">کل دیدگاه‌ها</span>
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <MessageSquare size={16} />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black tracking-tight">{stats.totalComments.toLocaleString('fa-IR')}</div>
              </div>

              <div className="bg-[#101010] border border-white/5 rounded-3xl p-5 relative overflow-hidden group hover:border-[#ccff00]/30 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-gray-400 font-medium">لایک و تعاملات</span>
                  <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center">
                    <Flame size={16} />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black tracking-tight">{stats.totalReactions.toLocaleString('fa-IR')}</div>
              </div>
            </div>
          </section>
        )}

        {/* Tab 2: Users */}
        {activeTab === 'users' && (
          <section aria-labelledby="users-heading" className="space-y-4">
            <h2 id="users-heading" className="sr-only">مدیریت کاربران</h2>
            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input
                type="text"
                placeholder="جستجو بر اساس نام کاربری یا شماره تماس..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full bg-[#101010] border border-white/10 rounded-2xl py-3 pr-11 pl-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#ccff00] transition-colors"
              />
            </div>

            <div className="bg-[#101010] border border-white/5 rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#151515] text-gray-400 font-bold border-b border-white/5">
                    <tr>
                      <th className="p-4">کاربر</th>
                      <th className="p-4">شماره تماس (ماسک‌شده)</th>
                      <th className="p-4">اپیزودهای تماشا شده</th>
                      <th className="p-4">نقش فعلی</th>
                      <th className="p-4 text-left">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500">
                          کاربری یافت نشد.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-base">
                              {u.avatar_url || '😎'}
                            </span>
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{u.username}</span>
                                {u.role === 'admin' && (
                                  <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.2 rounded font-black">
                                    ADMIN
                                  </span>
                                )}
                                {u.is_vip && (
                                  <span className="text-[9px] bg-[#ccff00]/20 text-[#ccff00] border border-[#ccff00]/30 px-1.5 py-0.2 rounded font-black">
                                    VIP
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-500 font-mono">{u.id.slice(0, 8)}...</span>
                            </div>
                          </td>
                          <td className="p-4 font-mono text-gray-400 ltr text-right">{u.phone || '—'}</td>
                          <td className="p-4 font-bold">{u.watchedCount.toLocaleString('fa-IR')} اپیزود</td>
                          <td className="p-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                u.role === 'vip' || u.is_vip
                                  ? 'bg-[#ccff00]/10 text-[#ccff00] border border-[#ccff00]/20'
                                  : u.role === 'admin'
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                  : 'bg-white/5 text-gray-400'
                              }`}
                            >
                              {u.role === 'vip' || u.is_vip ? 'ویژه (VIP)' : u.role === 'admin' ? 'مدیر' : 'عادی'}
                            </span>
                          </td>
                          <td className="p-4 text-left">
                            <button
                              type="button"
                              onClick={() => handleToggleRole(u.id, u.role)}
                              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5 text-[11px] font-bold transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ccff00]"
                            >
                              {u.role === 'vip' || u.is_vip ? 'تنزیل به عادی' : 'ارتقا به VIP'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Tab 3: Comments */}
        {activeTab === 'comments' && (
          <section aria-labelledby="comments-heading" className="space-y-4">
            <h2 id="comments-heading" className="sr-only">مدیریت دیدگاه‌ها</h2>
            <div className="bg-[#101010] border border-white/5 rounded-3xl p-6">
              {commentsList.length === 0 ? (
                <p className="text-gray-500 text-center py-8 text-xs">هیچ دیدگاهی برای نمایش وجود ندارد.</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {commentsList.map((c) => (
                    <div key={c.id} className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-sm shrink-0">
                          {c.authorAvatar || '😎'}
                        </span>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-xs text-white">{c.authorName}</span>
                            <span className="text-[10px] text-gray-500">
                              {new Date(c.created_at).toLocaleDateString('fa-IR')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-300 leading-relaxed max-w-2xl">{c.content}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteComment(c.id)}
                        disabled={deletingCommentId === c.id}
                        aria-label={`حذف نظر کاربر ${c.authorName}`}
                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors shrink-0 disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400"
                      >
                        {deletingCommentId === c.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}