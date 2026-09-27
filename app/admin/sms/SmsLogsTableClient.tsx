"use client";

import React, { useState, useMemo } from 'react';
import {
  Search,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Clock,
  Phone,
  Calendar,
  Send,
  Hash,
  Copy,
  Check,
} from 'lucide-react';
import { toPersianDigits, formatPersianDate } from '@/lib/subscription';

export interface SmsLogRecord {
  id: number;
  phone: string;
  code: string | null;
  status: 'sent' | 'failed' | 'pending' | string;
  provider: string;
  rec_id: string | null;
  error_message: string | null;
  ip_address: string | null;
  created_at: string;
}

interface SmsLogsTableClientProps {
  initialLogs: SmsLogRecord[];
}

export default function SmsLogsTableClient({ initialLogs }: SmsLogsTableClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'sent' | 'failed'>('all');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopy = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Client-side search and filtering
  const filteredLogs = useMemo(() => {
    return initialLogs.filter((log) => {
      // Status filter
      if (filterStatus === 'sent' && log.status !== 'sent') return false;
      if (filterStatus === 'failed' && log.status !== 'failed') return false;

      // Text search filter (phone, rec_id, code, error_message)
      if (!searchTerm.trim()) return true;

      const query = searchTerm.trim().toLowerCase();
      const matchPhone = log.phone?.toLowerCase().includes(query) ?? false;
      const matchRecId = log.rec_id?.toLowerCase().includes(query) ?? false;
      const matchCode = log.code?.toLowerCase().includes(query) ?? false;
      const matchError = log.error_message?.toLowerCase().includes(query) ?? false;

      return matchPhone || matchRecId || matchCode || matchError;
    });
  }, [initialLogs, searchTerm, filterStatus]);

  // Counts
  const sentCount = useMemo(() => initialLogs.filter((l) => l.status === 'sent').length, [initialLogs]);
  const failedCount = useMemo(() => initialLogs.filter((l) => l.status === 'failed').length, [initialLogs]);

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0e0e0e] border border-white/10 rounded-2xl p-3 sm:p-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجو بر اساس شماره تلفن، کد پیگیری یا متن خطا..."
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

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 self-start sm:self-center overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
              filterStatus === 'all'
                ? 'bg-[#ccff00] text-black font-bold'
                : 'text-gray-400 hover:text-white bg-white/5'
            }`}
          >
            همه ({toPersianDigits(initialLogs.length)})
          </button>
          <button
            onClick={() => setFilterStatus('sent')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-1.5 ${
              filterStatus === 'sent'
                ? 'bg-emerald-400 text-black font-bold'
                : 'text-gray-400 hover:text-white bg-white/5'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>موفق ({toPersianDigits(sentCount)})</span>
          </button>
          <button
            onClick={() => setFilterStatus('failed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-1.5 ${
              filterStatus === 'failed'
                ? 'bg-rose-500 text-white font-bold'
                : 'text-gray-400 hover:text-white bg-white/5'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>ناموفق ({toPersianDigits(failedCount)})</span>
          </button>
        </div>
      </div>

      {/* Results Header Count */}
      <div className="flex items-center justify-between px-1 text-xs text-gray-400">
        <span>
          نمایش {toPersianDigits(filteredLogs.length)} از {toPersianDigits(initialLogs.length)} لاگ پیامک
        </span>
        {searchTerm && <span>فیلتر شده بر اساس: &quot;{searchTerm}&quot;</span>}
      </div>

      {/* Data Table Container */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0e0e0e] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-gray-400 select-none">
                <th className="py-3.5 px-4 font-bold">شماره همراه</th>
                <th className="py-3.5 px-4 font-bold">کد ارسالی</th>
                <th className="py-3.5 px-4 font-bold">وضعیت تحویل</th>
                <th className="py-3.5 px-4 font-bold">ارائه‌دهنده و شناسه پیگیری</th>
                <th className="py-3.5 px-4 font-bold">پیام / علت خطا</th>
                <th className="py-3.5 px-4 font-bold">زمان ارسال</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <MessageSquare className="w-8 h-8 opacity-40" />
                      <p className="text-sm">
                        {initialLogs.length === 0
                          ? 'هنوز هیچ لاگی در جدول ثبت نشده است. لاگ‌های بعدی در این بخش نمایش داده می‌شوند.'
                          : 'هیچ لاگی مطابق با فیلتر جستجو یافت نشد.'}
                      </p>
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
                filteredLogs.map((log) => {
                  const isSent = log.status === 'sent';
                  const isFailed = log.status === 'failed';
                  const createdDate = new Date(log.created_at);
                  const formattedDate = formatPersianDate(createdDate);
                  const formattedTime = createdDate.toLocaleTimeString('fa-IR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-white/[0.03] transition-colors"
                    >
                      {/* Phone Column */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 shrink-0">
                            <Phone className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-mono text-xs font-bold text-white block direction-ltr text-left">
                              {toPersianDigits(log.phone)}
                            </span>
                            <span className="text-[10px] font-mono text-gray-500 block">
                              #{log.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Masked Code Column */}
                      <td className="py-3 px-4">
                        {log.code ? (
                          <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/10 text-gray-200">
                            {log.code}
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>

                      {/* Status Column */}
                      <td className="py-3 px-4">
                        {isSent && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ارسال موفق</span>
                          </span>
                        )}
                        {isFailed && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold text-xs">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>خطا در ارسال</span>
                          </span>
                        )}
                        {!isSent && !isFailed && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{log.status}</span>
                          </span>
                        )}
                      </td>

                      {/* Provider & Rec ID */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <span className="text-xs text-gray-300 font-medium block">
                            {log.provider === 'melipayamak' ? 'ملی‌پیامک (Melipayamak)' : log.provider}
                          </span>
                          {log.rec_id ? (
                            <div className="flex items-center gap-1 text-[11px] font-mono text-gray-400">
                              <span>Ref: {log.rec_id}</span>
                              <button
                                onClick={() => handleCopy(log.rec_id!, log.id)}
                                title="کپی شناسه پیگیری"
                                className="text-gray-500 hover:text-white p-0.5"
                              >
                                {copiedId === log.id ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-600 font-mono">—</span>
                          )}
                        </div>
                      </td>

                      {/* Error Message */}
                      <td className="py-3 px-4 max-w-xs">
                        {log.error_message ? (
                          <span className="text-xs text-rose-400/90 font-mono block truncate" title={log.error_message}>
                            {log.error_message}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-600">—</span>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="py-3 px-4 text-xs text-gray-400 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-gray-500" />
                            <span>{toPersianDigits(formattedDate)}</span>
                          </div>
                          <span className="text-[10px] font-mono text-gray-500 direction-ltr text-right mt-0.5">
                            {toPersianDigits(formattedTime)}
                          </span>
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
