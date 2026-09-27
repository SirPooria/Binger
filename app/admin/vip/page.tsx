import React from 'react';
import Link from 'next/link';
import { verifyAdminSession } from '@/lib/adminAuth';
import VipTableClient, { VipUserRecord } from './VipTableClient';
import { Crown, ShieldAlert, Sparkles, CreditCard, Users } from 'lucide-react';
import { toPersianDigits } from '@/lib/subscription';

export const metadata = {
  title: 'مدیریت کاربران ویژه (VIP) | Binger Admin',
  description: 'نظارت بر اعضای فعال VIP، اعطای سریع اشتراک ویژه و لغو دسترسی‌های ویژه در Binger',
};

export const dynamic = 'force-dynamic';

export default async function AdminVipManagementPage() {
  const { authorized, supabase } = await verifyAdminSession();

  if (!authorized || !supabase) {
    return (
      <div className="p-8 rounded-3xl bg-red-500/10 border border-red-500/20 text-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">دسترسی غیرمجاز</h2>
        <p className="text-sm text-gray-400">
          فقط مدیران سیستم مجاز به دسترسی به بخش مدیریت کاربران ویژه هستند.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/15 transition"
        >
          بازگشت به داشبورد
        </Link>
      </div>
    );
  }

  let vips: VipUserRecord[] = [];
  const VIP_PRICE_TOMANS = 149_000;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, phone, avatar_url, role, is_vip, created_at')
      .eq('is_vip', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching VIP profiles:', error);
    } else if (data) {
      vips = data as VipUserRecord[];
    }
  } catch (err) {
    console.error('Unexpected error loading VIP profiles:', err);
  }

  const totalVips = vips.length;
  const estimatedRevenue = totalVips * VIP_PRICE_TOMANS;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header and Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Link href="/admin" className="hover:text-gray-300 transition">داشبورد ادمین</Link>
            <span>/</span>
            <span className="text-amber-400 font-medium">مدیریت اعضای ویژه</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <Crown className="w-6 h-6 text-amber-400" />
            <span>مدیریت کاربران ویژه (VIP Management)</span>
          </h1>
          <p className="text-xs text-gray-400">
            لیست اعضای فعال اشتراک VIP، قابلیت اعطای سریع و مدیریت لغو اشتراک‌ها
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/20 text-xs text-amber-300 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>VIP Cloud Sync</span>
          </div>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Total VIP Members */}
        <div className="p-5 rounded-2xl bg-[#0e0e0e] border border-white/10 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-bold block">مجموع اعضای ویژه فعال</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                {toPersianDigits(totalVips)}
              </span>
              <span className="text-xs text-gray-400">کاربر</span>
            </div>
            <p className="text-[11px] text-gray-400">
              کاربران دارای دسترسی نامحدود به تمامی امکانات اختصاصی
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
            <Crown className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Estimated Monthly VIP Revenue */}
        <div className="p-5 rounded-2xl bg-[#0e0e0e] border border-white/10 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-bold block">ارزش ناخالص اشتراک‌ها</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[#ccff00] font-mono">
                {toPersianDigits(estimatedRevenue.toLocaleString('en-US'))}
              </span>
              <span className="text-xs text-gray-400 font-bold">تومان</span>
            </div>
            <p className="text-[11px] text-gray-400">
              بر مبنای تعرفه استاندارد ۱۴۹,۰۰۰ تومان به‌ازای هر اشتراک ماهانه
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#ccff00]/10 border border-[#ccff00]/20 text-[#ccff00] flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main VIP Table with Quick Grant Form */}
      <VipTableClient initialVips={vips} />
    </div>
  );
}
