"use client";

import React, { useState, useMemo } from 'react';
import {
  Crown,
  Search,
  UserPlus,
  UserX,
  Shield,
  Calendar,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  Users,
  Sparkles,
} from 'lucide-react';
import { toggleUserVip, quickGrantVip } from '../actions';
import { toPersianDigits, formatPersianDate } from '@/lib/subscription';

export interface VipUserRecord {
  id: string;
  username: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string | null;
  is_vip: boolean | null;
  created_at: string;
}

interface VipTableClientProps {
  initialVips: VipUserRecord[];
}

export default function VipTableClient({ initialVips }: VipTableClientProps) {
  const [vips, setVips] = useState<VipUserRecord[]>(initialVips);
  const [searchTerm, setSearchTerm] = useState('');

  // Quick Grant VIP state
  const [grantInput, setGrantInput] = useState('');
  const [isGranting, setIsGranting] = useState(false);

  // Revoke state per user ID
  const [revokingUserId, setRevokingUserId] = useState<string | null>(null);

  // Toast feedback state
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  };

  // Filtered VIP list
  const filteredVips = useMemo(() => {
    if (!searchTerm.trim()) return vips;
    const q = searchTerm.trim().toLowerCase();

    return vips.filter((user) => {
      const matchUsername = user.username?.toLowerCase().includes(q) ?? false;
      const matchPhone = user.phone?.toLowerCase().includes(q) ?? false;
      const matchId = user.id.toLowerCase().includes(q);
      return matchUsername || matchPhone || matchId;
    });
  }, [vips, searchTerm]);

  // Action: Quick Grant VIP
  const handleQuickGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = grantInput.trim();
    if (!query) {
      showToast('لطفاً شماره تماس یا نام کاربری را وارد کنید.', 'error');
      return;
    }

    setIsGranting(true);
    try {
      const res = await quickGrantVip(query);
      if (res.success && res.user) {
        // Optimistic UI state update: add or update user in vips list
        setVips((prev) => {
          const exists = prev.some((u) => u.id === res.user!.id);
          if (exists) {
            return prev.map((u) => (u.id === res.user!.id ? res.user! : u));
          }
          return [res.user!, ...prev];
        });
        showToast(
          res.message || `اشتراک ویژه برای «${res.user.username || query}» با موفقیت فعال شد.`,
          'success'
        );
        setGrantInput('');
      } else {
        showToast(res.error || 'خطا در اعطای اشتراک ویژه', 'error');
      }
    } catch {
      showToast('خطای شبکه در ارتباط با سرور', 'error');
    } finally {
      setIsGranting(false);
    }
  };

  // Action: Revoke VIP
  const handleRevokeVip = async (user: VipUserRecord) => {
    const confirmRevoke = window.confirm(
      `آیا از لغو اشتراک ویژه (VIP) کاربر «${user.username || 'کاربر'}» اطمینان دارید؟`
    );
    if (!confirmRevoke) return;

    setRevokingUserId(user.id);
    try {
      // toggleUserVip with currentStatus = true toggles it to false
      const res = await toggleUserVip(user.id, true);
      if (res.success) {
        // Optimistic UI state update: remove from VIP list
        setVips((prev) => prev.filter((u) => u.id !== user.id));
        showToast(`اشتراک ویژه کاربر «${user.username || 'کاربر'}» لغو شد.`, 'success');
      } else {
        showToast(res.error || 'خطا در لغو اشتراک VIP', 'error');
      }
    } catch {
      showToast('خطای شبکه در ارتباط با سرور', 'error');
    } finally {
      setRevokingUserId(null);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 left-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border text-xs sm:text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-200 ${
            toast.type === 'success'
              ? 'bg-[#121c12] border-emerald-500/30 text-emerald-300 shadow-emerald-950/40'
              : 'bg-[#1c1212] border-red-500/30 text-red-300 shadow-red-950/40'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{toast.text}</span>
          <button
            onClick={() => setToast(null)}
            className="text-gray-400 hover:text-white p-0.5 rounded-lg transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Quick Grant VIP Feature Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-[#0e0e0e] to-[#0e0e0e] border border-amber-500/20 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <span>ارتقای سریع به اشتراک ویژه (Quick Grant VIP)</span>
            </h2>
            <p className="text-xs text-gray-400">
              شماره تلفن همراه (مثال: ۰۹۱۲۳۴۵۶۷۸۹) یا نام کاربری دقیق کاربر را جهت فعال‌سازی آنی VIP وارد کنید.
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs self-start sm:self-auto font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>فعال‌سازی آنی</span>
          </div>
        </div>

        {/* Quick Grant Form */}
        <form onSubmit={handleQuickGrant} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Phone className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={grantInput}
              onChange={(e) => setGrantInput(e.target.value)}
              placeholder="شماره تماس یا نام کاربری دقیق..."
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-400/50 transition font-mono direction-ltr text-right"
            />
          </div>

          <button
            type="submit"
            disabled={isGranting || !grantInput.trim()}
            className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-400/10 shrink-0 cursor-pointer"
          >
            {isGranting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>در حال فعال‌سازی...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>اعطای اشتراک VIP</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Search Bar for VIP Members */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0e0e0e] border border-white/10 rounded-2xl p-3 sm:p-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجو در میان اعضای VIP با نام، شناسه یا شماره تلفن..."
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-400/50 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white"
            >
              پاک کردن
            </button>
          )}
        </div>

        <div className="text-xs text-gray-400 px-2 shrink-0">
          تعداد اعضای فعال VIP: <strong className="text-amber-400 font-mono">{toPersianDigits(vips.length)}</strong>
        </div>
      </div>

      {/* VIP Data Table Container */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0e0e0e] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-gray-400 select-none">
                <th className="py-3.5 px-4 font-bold">عضو ویژه (VIP Member)</th>
                <th className="py-3.5 px-4 font-bold">شماره تماس</th>
                <th className="py-3.5 px-4 font-bold">نقش کاربری</th>
                <th className="py-3.5 px-4 font-bold">تاریخ عضویت</th>
                <th className="py-3.5 px-4 font-bold text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {filteredVips.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Crown className="w-8 h-8 opacity-40 text-amber-400" />
                      <p className="text-sm">کاربر دارای اشتراک ویژه‌ای یافت نشد.</p>
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="text-xs text-amber-400 underline mt-1 cursor-pointer"
                        >
                          پاک کردن فیلتر جستجو
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredVips.map((user) => {
                  const isAdmin = user.role === 'admin';
                  const displayName = user.username || 'کاربر بدون نام';
                  const isRevoking = revokingUserId === user.id;
                  const dateObj = user.created_at ? new Date(user.created_at) : null;
                  const persianDate = dateObj ? formatPersianDate(dateObj) : '—';

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-white/[0.03] transition-colors"
                    >
                      {/* User Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 text-lg flex items-center justify-center shrink-0">
                            {user.avatar_url || '👑'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white truncate">
                                {displayName}
                              </span>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 text-[10px] font-bold">
                                <Crown className="w-3 h-3 text-amber-400" />
                                <span>VIP</span>
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-gray-500 block truncate">
                              ID: {user.id.slice(0, 8)}...{user.id.slice(-4)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Phone Column */}
                      <td className="py-3.5 px-4">
                        {user.phone ? (
                          <span className="font-mono text-xs text-gray-300 direction-ltr text-left inline-block">
                            {toPersianDigits(user.phone)}
                          </span>
                        ) : (
                          <span className="text-gray-600 text-xs">—</span>
                        )}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs">
                            <Shield className="w-3 h-3" />
                            <span>مدیر (Admin)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 text-gray-400 text-xs">
                            <span>کاربر عادی</span>
                          </span>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-4 text-xs text-gray-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-500" />
                          <span>{toPersianDigits(persianDate)}</span>
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => handleRevokeVip(user)}
                            disabled={isRevoking}
                            title="لغو اشتراک ویژه (VIP)"
                            className="px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                          >
                            {isRevoking ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>در حال لغو...</span>
                              </>
                            ) : (
                              <>
                                <UserX className="w-3.5 h-3.5" />
                                <span>لغو VIP</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
