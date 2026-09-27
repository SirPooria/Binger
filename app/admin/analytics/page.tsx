import React from 'react';
import Link from 'next/link';
import { verifyAdminSession } from '@/lib/adminAuth';
import AnalyticsClient, {
  GrowthRecord,
  PowerUserRecord,
  DiscussedShowRecord,
  ChurningUserRecord,
} from './AnalyticsClient';
import { getShowDetails } from '@/lib/tmdbClient';
import { ShieldAlert, LineChart, Sparkles, Database } from 'lucide-react';

export const metadata = {
  title: 'تحلیل عمیق داده‌ها و هوش آماری | Binger Admin',
  description: 'داشبورد پیشرفته داده‌کاوی، تحلیل ۳۰ روزه رشد، کاربران لیدر و ریتنشن پلتفرم بینجر',
};

export const dynamic = 'force-dynamic';

export default async function AdminDeepAnalyticsPage() {
  const { authorized, supabase } = await verifyAdminSession();

  if (!authorized || !supabase) {
    return (
      <div className="p-8 rounded-3xl bg-red-500/10 border border-red-500/20 text-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">دسترسی غیرمجاز</h2>
        <p className="text-sm text-gray-400">
          فقط مدیران ارشد سیستم مجاز به مشاهده داده‌های عمیق تحلیلی هستند.
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

  let growthData: GrowthRecord[] = [];
  let powerUsers: PowerUserRecord[] = [];
  let discussedShows: DiscussedShowRecord[] = [];
  let churningUsers: ChurningUserRecord[] = [];

  try {
    // Execute all 4 analytics RPCs in parallel
    const [growthRes, powerRes, discussedRes, churnRes] = await Promise.all([
      supabase.rpc('get_30_day_growth'),
      supabase.rpc('get_power_users', { p_limit: 15 }),
      supabase.rpc('get_most_discussed_shows', { p_limit: 15 }),
      supabase.rpc('get_churning_users', { p_limit: 100 }),
    ]);

    if (growthRes.data) {
      growthData = growthRes.data as GrowthRecord[];
    }
    if (powerRes.data) {
      powerUsers = powerRes.data as PowerUserRecord[];
    }
    if (churnRes.data) {
      churningUsers = churnRes.data as ChurningUserRecord[];
    }

    // Enrich most discussed shows with TMDB metadata & Persian titles
    if (discussedRes.data && Array.isArray(discussedRes.data) && discussedRes.data.length > 0) {
      discussedShows = await Promise.all(
        discussedRes.data.map(async (item: { show_id: number; comment_count: number }) => {
          try {
            const show = await getShowDetails(String(item.show_id));
            return {
              show_id: item.show_id,
              comment_count: Number(item.comment_count),
              show,
            };
          } catch {
            return {
              show_id: item.show_id,
              comment_count: Number(item.comment_count),
              show: null,
            };
          }
        })
      );
    }
  } catch (err) {
    console.error('Error fetching deep analytics RPCs:', err);
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Link href="/admin" className="hover:text-gray-300 transition">داشبورد ادمین</Link>
            <span>/</span>
            <span className="text-[#ccff00] font-medium">تحلیل عمیق و داده‌کاوی</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <LineChart className="w-6 h-6 text-[#ccff00]" />
            <span>تحلیل عمیق داده‌ها (Deep Analytics & Data Mining)</span>
          </h1>
          <p className="text-xs text-gray-400">
            بررسی الگوهای رفتاری کاربران، ترندهای ۳۰ روزه، کاربران لیدر و پایش نرخ ریزش
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-[#ccff00]/10 border border-[#ccff00]/25 text-xs text-[#ccff00] flex items-center gap-2 font-mono">
            <Database className="w-3.5 h-3.5" />
            <span>PostgreSQL RPC Engine</span>
          </div>
        </div>
      </div>

      {/* Main Analytics Client Dashboard */}
      <AnalyticsClient
        growthData={growthData}
        powerUsers={powerUsers}
        discussedShows={discussedShows}
        churningUsers={churningUsers}
      />
    </div>
  );
}
