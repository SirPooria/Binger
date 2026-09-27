import React from 'react';
import Link from 'next/link';
import { verifyAdminSession } from '@/lib/adminAuth';
import SmsLogsTableClient, { SmsLogRecord } from './SmsLogsTableClient';
import { MessageSquare, Send, AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import { toPersianDigits } from '@/lib/subscription';

export const metadata = {
  title: 'مانیتورینگ لاگ‌های پیامک | Binger Admin',
  description: 'رهگیری و پایش وضعیت ارسال کدهای تایید و پیامک‌های ارسالی سیستم',
};

export const dynamic = 'force-dynamic';

export default async function AdminSmsLogsPage() {
  const { authorized, supabase } = await verifyAdminSession();

  let logs: SmsLogRecord[] = [];
  let totalCount = 0;
  let sentCount = 0;
  let failedCount = 0;

  if (authorized && supabase) {
    try {
      const { data, error } = await supabase
        .from('sms_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (!error && data) {
        logs = data as SmsLogRecord[];
        totalCount = logs.length;
        sentCount = logs.filter((l) => l.status === 'sent').length;
        failedCount = logs.filter((l) => l.status === 'failed').length;
      } else if (error) {
        console.error('Error querying sms_logs:', error);
      }
    } catch (err) {
      console.error('Unexpected error loading sms_logs for admin:', err);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header and Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Link href="/admin" className="hover:text-gray-300 transition">داشبورد ادمین</Link>
            <span>/</span>
            <span className="text-[#ccff00] font-medium">لاگ پیامک‌ها</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-[#ccff00]" />
            <span>مانیتورینگ و لاگ‌های پیامک (SMS Logs)</span>
          </h1>
          <p className="text-xs text-gray-400">
            پایش بلادرنگ وضعیت تحویل کدهای ورود و پیامک‌های ارسالی از طریق ملی‌پیامک (۲۰۰ رکورد اخیر)
          </p>
        </div>

        {/* Quick Stats Summary Badges */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-gray-300 flex items-center gap-1.5">
            <span>کل:</span>
            <span className="text-white font-bold">{toPersianDigits(totalCount)}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>موفق:</span>
            <span className="font-bold">{toPersianDigits(sentCount)}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-mono text-rose-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>خطا:</span>
            <span className="font-bold">{toPersianDigits(failedCount)}</span>
          </div>
        </div>
      </div>

      {/* SMS Logs Data Table */}
      <SmsLogsTableClient initialLogs={logs} />
    </div>
  );
}
