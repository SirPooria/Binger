"use client";

import React, { useState, useMemo, useCallback } from 'react';
import {
  Search,
  Users,
  Shield,
  Crown,
  Calendar,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
} from 'lucide-react';
import { toPersianDigits, formatPersianDate } from '@/lib/subscription';
import { toggleUserVip, toggleUserAdmin } from '../actions';

export interface AdminUserRecord {
  id: string;
  username: string | null;
  full_name?: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: string | null;
  is_vip: boolean | null;
  created_at: string;
}

interface UsersTableClientProps {
  initialUsers: AdminUserRecord[];
}

export default function UsersTableClient({ initialUsers }: UsersTableClientProps) {
  // Local state for optimistic UI updates
  const [users, setUsers] = useState<AdminUserRecord[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'vip'>('all');

  // Loading states per user ID
  const [loadingVipUserId, setLoadingVipUserId] = useState<string | null>(null);
  const [loadingAdminUserId, setLoadingAdminUserId] = useState<string | null>(null);

  // Toast feedback state
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, []);

  // Action: Toggle VIP
  const handleToggleVip = async (user: AdminUserRecord) => {
    if (loadingVipUserId || loadingAdminUserId) return;
    setLoadingVipUserId(user.id);
    try {
      const currentVip = user.is_vip === true;
      const res = await toggleUserVip(user.id, currentVip);
      if (res.success && typeof res.is_vip === 'boolean') {
        // Optimistic UI state update
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, is_vip: res.is_vip! } : u))
        );
        showToast(
          res.is_vip
            ? `اشتراک ویژه (VIP) برای «${user.username || 'کاربر'}» با موفقیت فعال شد.`
            : `اشتراک ویژه (VIP) برای «${user.username || 'کاربر'}» لغو شد.`,
          'success'
        );
      } else {
        showToast(res.error || 'خطا در تغییر وضعیت VIP کاربر', 'error');
      }
    } catch {
      showToast('خطای شبکه در ارتباط با سرور', 'error');
    } finally {
      setLoadingVipUserId(null);
    }
  };

  // Action: Toggle Admin Role
  const handleToggleAdmin = async (user: AdminUserRecord) => {
    if (loadingAdminUserId || loadingVipUserId) return;
    setLoadingAdminUserId(user.id);
    try {
      const currentRole = user.role || 'user';
      const res = await toggleUserAdmin(user.id, currentRole);
      if (res.success && res.role) {
        // Optimistic UI state update
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, role: res.role! } : u))
        );
        showToast(
          res.role === 'admin'
            ? `نقش «${user.username || 'کاربر'}» به سطح مدیر (Admin) ارتقا یافت.`
            : `دسترسی مدیریت از «${user.username || 'کاربر'}» سلب شد.`,
          'success'
        );
      } else {
        showToast(res.error || 'خطا در تغییر نقش کاربری', 'error');
      }
    } catch {
      showToast('خطای شبکه در ارتباط با سرور', 'error');
    } finally {
      setLoadingAdminUserId(null);
    }
  };

  // Client-side search and filtering
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Role & VIP filter
      if (filterRole === 'admin' && user.role !== 'admin') return false;
      if (filterRole === 'vip' && user.is_vip !== true) return false;

      // Text search filter (username, full_name, phone, id)
      if (!searchTerm.trim()) return true;

      const query = searchTerm.trim().toLowerCase();
      const matchUsername = user.username?.toLowerCase().includes(query) ?? false;
      const matchFullName = user.full_name?.toLowerCase().includes(query) ?? false;
      const matchPhone = user.phone?.toLowerCase().includes(query) ?? false;
      const matchId = user.id.toLowerCase().includes(query);

      return matchUsername || matchFullName || matchPhone || matchId;
    });
  }, [users, searchTerm, filterRole]);

  // Action: Export currently filtered users to CSV
  const handleExportCsv = () => {
    if (filteredUsers.length === 0) {
      showToast('هیچ کاربری برای دریافت فایل CSV یافت نشد', 'error');
      return;
    }

    const headers = [
      'نام و نام خانوادگی (Name)',
      'شماره تماس (Phone)',
      'نقش کاربری (Role)',
      'وضعیت اشتراک (VIP Status)',
      'تاریخ عضویت (Join Date)',
    ];

    const escapeCsv = (val: string | null | undefined): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredUsers.map((user) => {
      const name = user.full_name || user.username || 'کاربر بدون نام';
      const phone = user.phone || 'ثبت نشده';
      const role = user.role === 'admin' ? 'مدیر سیستم (Admin)' : 'کاربر عادی (User)';
      const vipStatus = user.is_vip ? 'ویژه (VIP)' : 'عادی (Standard)';
      const joinDate = user.created_at ? formatPersianDate(new Date(user.created_at)) : 'ثبت نشده';

      return [
        escapeCsv(name),
        escapeCsv(phone),
        escapeCsv(role),
        escapeCsv(vipStatus),
        escapeCsv(joinDate),
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `binger_users_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`فایل CSV شامل ${toPersianDigits(filteredUsers.length)} کاربر با موفقیت دانلود شد.`, 'success');
  };

  return (
    <div className="space-y-4 relative">
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

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0e0e0e] border border-white/10 rounded-2xl p-3 sm:p-4">
        {/* Search Input & CSV Export Button */}
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="جستجو بر اساس نام کاربری، شناسه یا شماره تلفن..."
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#ccff00]/50 transition"
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

          {/* Export to CSV Button */}
          <button
            onClick={handleExportCsv}
            title="دریافت فایل اکسل و CSV از کاربران فیلتر شده"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-[#ccff00] text-gray-300 hover:text-black border border-white/10 hover:border-[#ccff00] transition font-bold text-xs shrink-0 group cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4 text-gray-400 group-hover:text-black transition" />
            <span className="hidden sm:inline">خروجی CSV</span>
            <span className="sm:hidden">CSV</span>
          </button>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 self-start sm:self-center overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterRole('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
              filterRole === 'all'
                ? 'bg-[#ccff00] text-black font-bold'
                : 'text-gray-400 hover:text-white bg-white/5'
            }`}
          >
            همه ({toPersianDigits(users.length)})
          </button>
          <button
            onClick={() => setFilterRole('vip')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-1.5 ${
              filterRole === 'vip'
                ? 'bg-amber-400 text-black font-bold'
                : 'text-gray-400 hover:text-white bg-white/5'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>ویژه VIP</span>
          </button>
          <button
            onClick={() => setFilterRole('admin')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-1.5 ${
              filterRole === 'admin'
                ? 'bg-emerald-400 text-black font-bold'
                : 'text-gray-400 hover:text-white bg-white/5'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>مدیران</span>
          </button>
        </div>
      </div>

      {/* Results Count Header */}
      <div className="flex items-center justify-between px-1 text-xs text-gray-400">
        <span>
          نمایش {toPersianDigits(filteredUsers.length)} از {toPersianDigits(users.length)} کاربر
        </span>
        {searchTerm && <span>فیلتر شده بر اساس: &quot;{searchTerm}&quot;</span>}
      </div>

      {/* Data Table Container */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0e0e0e] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-gray-400 select-none">
                <th className="py-3.5 px-4 font-bold">کاربر (User)</th>
                <th className="py-3.5 px-4 font-bold">نقش (Role)</th>
                <th className="py-3.5 px-4 font-bold">وضعیت اشتراک</th>
                <th className="py-3.5 px-4 font-bold">شماره تماس</th>
                <th className="py-3.5 px-4 font-bold">تاریخ عضویت</th>
                <th className="py-3.5 px-4 font-bold text-center">عملیات (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 opacity-40" />
                      <p className="text-sm">کاربری با این مشخصات یافت نشد.</p>
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="text-xs text-[#ccff00] underline mt-1"
                        >
                          پاک کردن فیلتر جستجو
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isAdmin = user.role === 'admin';
                  const isVip = user.is_vip === true;
                  const displayName = user.full_name || user.username || 'کاربر بینجر';
                  const createdAtDate = user.created_at ? new Date(user.created_at) : null;
                  const formattedDate = createdAtDate ? formatPersianDate(createdAtDate) : '—';

                  const isTogglingVip = loadingVipUserId === user.id;
                  const isTogglingAdmin = loadingAdminUserId === user.id;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-white/[0.03] transition-colors"
                    >
                      {/* User Column */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-lg shrink-0 border border-white/5">
                            {user.avatar_url || '😎'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white truncate">
                                {displayName}
                              </span>
                              {isAdmin && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-gray-500 block truncate">
                              ID: {user.id.slice(0, 8)}...{user.id.slice(-4)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-4">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs">
                            <Shield className="w-3 h-3" />
                            <span>مدیر (Admin)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 text-gray-400 text-xs">
                            <span>کاربر (User)</span>
                          </span>
                        )}
                      </td>

                      {/* VIP Status Badge */}
                      <td className="py-3 px-4">
                        {isVip ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-300 font-bold text-xs">
                            <Crown className="w-3 h-3 text-amber-400" />
                            <span>ویژه VIP</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-gray-500 text-xs">
                            <span>استاندارد</span>
                          </span>
                        )}
                      </td>

                      {/* Phone Column */}
                      <td className="py-3 px-4">
                        {user.phone ? (
                          <span className="font-mono text-xs text-gray-300 direction-ltr text-left inline-block">
                            {toPersianDigits(user.phone)}
                          </span>
                        ) : (
                          <span className="text-gray-600 text-xs">—</span>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="py-3 px-4 text-xs text-gray-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-500" />
                          <span>{toPersianDigits(formattedDate)}</span>
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {/* Toggle VIP Button */}
                          <button
                            onClick={() => handleToggleVip(user)}
                            disabled={isTogglingVip || isTogglingAdmin}
                            title={isVip ? 'لغو اشتراک ویژه (VIP)' : 'ارتقا به کاربر ویژه (VIP)'}
                            className={`p-2 rounded-xl transition border text-xs flex items-center justify-center gap-1.5 ${
                              isVip
                                ? 'bg-amber-400/15 border-amber-400/30 text-amber-300 hover:bg-amber-400/25 shadow-sm shadow-amber-400/10'
                                : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-amber-300 hover:bg-amber-400/10 hover:border-amber-400/20'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {isTogglingVip ? (
                              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                            ) : (
                              <Crown
                                className={`w-4 h-4 ${
                                  isVip ? 'fill-amber-400 text-amber-400' : 'text-gray-400'
                                }`}
                              />
                            )}
                            <span className="hidden lg:inline text-[11px] font-medium">
                              {isVip ? 'لغو VIP' : 'اعطای VIP'}
                            </span>
                          </button>

                          {/* Toggle Admin Button */}
                          <button
                            onClick={() => handleToggleAdmin(user)}
                            disabled={isTogglingAdmin || isTogglingVip}
                            title={isAdmin ? 'خلع دسترسی مدیر (Admin)' : 'ارتقا به مدیر (Admin)'}
                            className={`p-2 rounded-xl transition border text-xs flex items-center justify-center gap-1.5 ${
                              isAdmin
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 shadow-sm shadow-emerald-500/10'
                                : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/20'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {isTogglingAdmin ? (
                              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                            ) : (
                              <Shield
                                className={`w-4 h-4 ${
                                  isAdmin ? 'fill-emerald-400 text-emerald-400' : 'text-gray-400'
                                }`}
                              />
                            )}
                            <span className="hidden lg:inline text-[11px] font-medium">
                              {isAdmin ? 'خلع ادمین' : 'ارتقا ادمین'}
                            </span>
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
