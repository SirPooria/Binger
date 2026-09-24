"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getShowDetails, getBackdropUrl, getImageUrl, type TMDBShow } from '@/lib/tmdbClient';
import { ALL_ACHIEVEMENTS, getBadgeProgress, type AchievementBadge, type AchievementUserStats } from '@/lib/achievements';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Loader2, Zap, MessageSquare, Heart, Award, X, Clock, Play, 
  Lock, CheckCircle, Share2, Trophy, Tv, 
  Layers, ArrowRight, UserPlus, UserCheck, CheckCircle2, Pin
} from 'lucide-react';
import { ShowCardProgress } from '../../components/ShowProgressBar';
import type { Database } from '@/lib/database.types';

type PublicProfile = {
  id: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_vip: boolean | null;
  created_at: string;
};

interface WatchedShowWithProgress extends TMDBShow {
  progress: number;
  watchedCount: number;
  totalEps: number;
}

type PublicListWithItems = Database['public']['Tables']['user_lists']['Row'] & {
  list_items?: Database['public']['Tables']['list_items']['Row'][];
};

export default function UserPublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const targetUserId = params?.id as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [targetProfile, setTargetProfile] = useState<PublicProfile | null>(null);

  // Follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Stats
  const [timeStats, setTimeStats] = useState({ months: 0, days: 0, hours: 0 });
  const [totalEpisodes, setTotalEpisodes] = useState(0);
  const [socialStats, setSocialStats] = useState({ followers: 0, following: 0, comments: 0 });

  // Lists & Shows
  const [favorites, setFavorites] = useState<WatchedShowWithProgress[]>([]);
  const [watchedShows, setWatchedShows] = useState<WatchedShowWithProgress[]>([]);
  const [publicLists, setPublicLists] = useState<PublicListWithItems[]>([]);
  const [coverImage, setCoverImage] = useState<string | null>(null);

  // Badge filter & modal
  const [selectedCategory, setSelectedCategory] = useState<string>('همه');
  const [selectedBadge, setSelectedBadge] = useState<AchievementBadge | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [achievementStats, setAchievementStats] = useState<AchievementUserStats>({
    watchedRows: [],
    watchedShows: [],
    comments: [],
    followingIds: [],
    followerIds: [],
    favoriteIds: [],
    eventTypes: [],
  });

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  useEffect(() => {
    const fetchTargetUserData = async () => {
      if (!targetUserId) return;

      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser({ id: user.id });
          if (user.id === targetUserId) {
            router.replace('/dashboard/profile');
            return;
          }
        }

        // 1. Fetch public profile fields strictly without PII (no phone, no email, no select('*'))
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, bio, avatar_url, is_vip, created_at')
          .eq('id', targetUserId)
          .maybeSingle();

        setTargetProfile(profile || {
          id: targetUserId,
          username: 'کاربر بینجر',
          avatar_url: '😎',
          bio: '',
          is_vip: false,
          created_at: new Date().toISOString(),
        });

        // 2. Check if current user is following target user
        if (user) {
          const { data: followRecord } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', targetUserId)
            .maybeSingle();

          setIsFollowing(Boolean(followRecord));
        }

        // 3. Watched shows for target user
        let allTargetWatched: Array<{ show_id: number; episode_id: number | null; created_at: string }> = [];
        let page = 0;
        let hasMore = true;

        while (hasMore) {
          const { data } = await supabase
            .from('watched')
            .select('show_id, episode_id, created_at')
            .eq('user_id', targetUserId)
            .order('created_at', { ascending: false })
            .range(page * 1000, (page + 1) * 1000 - 1);

          if (!data || data.length === 0) {
            hasMore = false;
          } else {
            allTargetWatched = [...allTargetWatched, ...data];
            if (data.length < 1000) {
              hasMore = false;
            } else {
              page++;
            }
          }
        }

        const showsDetailsMap: Record<string, TMDBShow> = {};

        if (allTargetWatched.length > 0) {
          setTotalEpisodes(allTargetWatched.length);

          const sortedWatched = [...allTargetWatched].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          const uniqueShowIds = Array.from(new Set(sortedWatched.map((i) => i.show_id)));

          await Promise.all(
            uniqueShowIds.slice(0, 30).map(async (id) => {
              const d = await getShowDetails(String(id));
              if (d) showsDetailsMap[String(id)] = d;
            })
          );

          let totalMinutes = 0;
          allTargetWatched.forEach((item) => {
            const show = showsDetailsMap[String(item.show_id)];
            const runtime = 45;
            totalMinutes += runtime;
          });

          const daysTotal = Math.floor(totalMinutes / (24 * 60));
          const hoursTotal = Math.floor((totalMinutes % (24 * 60)) / 60);
          const months = Math.floor(daysTotal / 30);
          const days = daysTotal % 30;

          setTimeStats({ months, days, hours: hoursTotal });

          const lastShowId = sortedWatched[0]?.show_id;
          if (showsDetailsMap[String(lastShowId)]?.backdrop_path) {
            setCoverImage(getBackdropUrl(showsDetailsMap[String(lastShowId)].backdrop_path));
          }

          const allWatchedList: WatchedShowWithProgress[] = uniqueShowIds
            .map((id) => {
              const d = showsDetailsMap[String(id)];
              if (!d) return null;
              const totalEps = d.number_of_episodes || 1;
              const watchedCount = allTargetWatched.filter((w) => w.show_id === id).length;
              const progress = Math.min(100, Math.round((watchedCount / totalEps) * 100));
              return { ...d, progress, watchedCount, totalEps };
            })
            .filter((s): s is WatchedShowWithProgress => s !== null);

          setWatchedShows(allWatchedList);
        }

        // 4. Social stats (counts only, no emails or phone numbers)
        const [followersRes, followingRes, commentsRes, commentsListRes] = await Promise.all([
          supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', targetUserId),
          supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', targetUserId),
          supabase.from('comments').select('id', { count: 'exact', head: true }).eq('user_id', targetUserId),
          supabase.from('comments').select('id, show_id, episode_id, parent_id, created_at').eq('user_id', targetUserId),
        ]);

        const fCount = followersRes.count || 0;
        const folCount = followingRes.count || 0;
        const cCount = commentsRes.count || 0;

        setSocialStats({
          followers: fCount,
          following: folCount,
          comments: cCount,
        });

        // 5. User favorites
        const { data: favData } = await supabase.from('favorites').select('show_id').eq('user_id', targetUserId);
        const favoriteIds: number[] = favData ? favData.map((f) => f.show_id) : [];

        if (favoriteIds.length > 0) {
          const favs = await Promise.all(
            favoriteIds.map(async (showId) => {
              let d = showsDetailsMap[String(showId)];
              if (!d) d = (await getShowDetails(String(showId))) as TMDBShow;
              if (!d) return null;

              const totalEps = d.number_of_episodes || 1;
              const watchedCount = allTargetWatched.filter((w) => w.show_id === showId).length;
              const progress = Math.min(100, Math.round((watchedCount / totalEps) * 100));
              return { ...d, progress, watchedCount, totalEps };
            })
          );
          setFavorites(favs.filter((f): f is WatchedShowWithProgress => f !== null));
        }

        // 6. Public user lists
        const { data: listsData } = await supabase
          .from('user_lists')
          .select('*, list_items(*)')
          .eq('user_id', targetUserId)
          .eq('is_public', true)
          .order('is_pinned', { ascending: false })
          .order('order_index', { ascending: true })
          .order('created_at', { ascending: false });

        setPublicLists((listsData as unknown as PublicListWithItems[]) || []);

        setAchievementStats({
          watchedRows: allTargetWatched,
          watchedShows: watchedShows,
          comments: commentsListRes.data || [],
          followingIds: [],
          followerIds: [],
          favoriteIds,
          eventTypes: [],
          totalEpisodes: allTargetWatched.length,
          followersCount: fCount,
          followingCount: folCount,
          commentsCount: cCount,
        });
      } catch (err) {
        console.error('Error loading user profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTargetUserData();
  }, [targetUserId, supabase, router]);

  // Follow / Unfollow action
  const handleToggleFollow = async () => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', targetUserId);

        if (error) throw error;
        setIsFollowing(false);
        setSocialStats((prev) => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
        showToast('دنبال کردن لغو شد.');
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: currentUser.id,
            following_id: targetUserId,
          });

        if (error) throw error;
        setIsFollowing(true);
        setSocialStats((prev) => ({ ...prev, followers: prev.followers + 1 }));
        showToast('کاربر به لیست دنبال‌شوندگان شما اضافه شد.');
      }
    } catch (err) {
      console.error('Follow toggle error:', err);
      showToast('خطا در تغییر وضعیت دنبال کردن.');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      showToast('لینک پروفایل کپی شد! 📋');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-[#ccff00]">
        <Loader2 className="animate-spin" size={48} aria-label="در حال بارگذاری پروفایل..." />
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] pb-12 overflow-x-hidden flex flex-col selection:bg-[#ccff00] selection:text-black">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-[#ccff00] text-black font-bold text-xs px-5 py-3 rounded-2xl shadow-[0_0_30px_rgba(204,255,0,0.3)] flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Badge Modal */}
      {selectedBadge && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-6" 
          onClick={() => setSelectedBadge(null)}
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="bg-[#1a1a1a] border border-white/10 w-full max-w-sm rounded-3xl p-8 flex flex-col items-center text-center relative shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              type="button"
              onClick={() => setSelectedBadge(null)} 
              className="absolute top-4 left-4 bg-white/5 p-2 rounded-full hover:bg-white/10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ccff00]"
              aria-label="بستن"
            >
              <X size={20} />
            </button>
            <div className={`w-32 h-32 rounded-full flex items-center justify-center text-6xl mb-6 border-4 ${
              getBadgeProgress(selectedBadge, achievementStats, targetProfile?.created_at).isUnlocked 
                ? 'bg-[#ccff00]/10 border-[#ccff00] shadow-[0_0_30px_rgba(204,255,0,0.3)]' 
                : 'bg-white/5 border-white/10 grayscale opacity-50'
            }`}>
              {selectedBadge.icon}
            </div>
            <h3 className="text-2xl font-black mb-2">{selectedBadge.title}</h3>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">{selectedBadge.desc}</p>
            {getBadgeProgress(selectedBadge, achievementStats, targetProfile?.created_at).isUnlocked ? (
              <div className="bg-[#ccff00]/10 text-[#ccff00] px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
                <CheckCircle size={18} /> دریافت شده توسط کاربر
              </div>
            ) : (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Lock size={14} /> هنوز قفل است
              </span>
            )}
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative w-full h-[55vh] min-h-[420px]">
        <div className="absolute inset-0">
          {coverImage ? (
            <Image src={coverImage} alt="تصویر کاور پروفایل" fill className="object-cover opacity-50" priority />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-900 to-black" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-transparent" />
        </div>

        <div className="absolute top-20 md:top-24 w-full px-6 flex justify-between items-center z-20">
          <button 
            type="button"
            onClick={() => router.back()}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-full transition-all border border-white/10 flex items-center gap-2 text-xs font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ccff00]"
          >
            <ArrowRight size={16} /> بازگشت
          </button>

          <button 
            type="button"
            onClick={handleShare}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-2.5 rounded-full transition-all border border-white/10 flex items-center text-gray-300 hover:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ccff00]"
            title="اشتراک‌گذاری پروفایل"
            aria-label="اشتراک‌گذاری پروفایل"
          >
            <Share2 size={16} className="text-[#ccff00]" />
          </button>
        </div>

        {/* Profile Info Overlay */}
        <div className="absolute bottom-0 w-full px-6 pb-6 flex flex-col items-center z-20 translate-y-8">
          <div className="relative group">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-[#050505] bg-gradient-to-tr from-gray-800 to-gray-600 shadow-2xl flex items-center justify-center text-4xl md:text-5xl overflow-hidden relative z-10">
              {targetProfile?.avatar_url || '😎'}
            </div>
            <div className="absolute inset-0 bg-[#ccff00] blur-2xl opacity-20 rounded-full" />
          </div>
          
          <div className="flex items-center gap-2 mt-4">
            <h1 className="text-2xl md:text-3xl font-black ltr tracking-tight text-white">
              {targetProfile?.username || 'کاربر بینجر'}
            </h1>
            {targetProfile?.is_vip && (
              <span className="text-[10px] bg-[#ccff00] text-black font-black px-2 py-0.5 rounded-full">
                VIP
              </span>
            )}
          </div>
          
          {targetProfile?.bio && (
            <p className="text-sm text-gray-400 mt-2 max-w-md text-center leading-relaxed px-4">
              {targetProfile.bio}
            </p>
          )}

          {/* Follow Button */}
          <div className="flex items-center gap-3 mt-4">
            <button
              type="button"
              disabled={followLoading}
              onClick={handleToggleFollow}
              className={`px-6 py-2.5 rounded-full font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ccff00] ${
                isFollowing 
                  ? 'bg-white/10 hover:bg-red-500/20 text-white hover:text-red-400 border border-white/20 hover:border-red-500/30' 
                  : 'bg-[#ccff00] hover:bg-[#b3e600] text-black shadow-[#ccff00]/20'
              }`}
            >
              {followLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : isFollowing ? (
                <>
                  <UserCheck size={16} />
                  <span>دنبال می‌کنید</span>
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  <span>دنبال کردن</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 mt-16 space-y-12">
        {/* Stats Grid */}
        <section aria-label="آمار کاربر" className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#121212] border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
            <Tv className="text-[#ccff00] mb-2" size={24} />
            <span className="text-xl md:text-2xl font-black">{totalEpisodes.toLocaleString('fa-IR')}</span>
            <span className="text-[11px] text-gray-400 mt-1">قسمت‌های دیده‌شده</span>
          </div>

          <div className="bg-[#121212] border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
            <Clock className="text-cyan-400 mb-2" size={24} />
            <span className="text-xl md:text-2xl font-black">
              {timeStats.months > 0 && `${timeStats.months}م `}{timeStats.days}ر {timeStats.hours}س
            </span>
            <span className="text-[11px] text-gray-400 mt-1">زمان صرف‌شده</span>
          </div>

          <div className="bg-[#121212] border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
            <MessageSquare className="text-purple-400 mb-2" size={24} />
            <span className="text-xl md:text-2xl font-black">{socialStats.comments.toLocaleString('fa-IR')}</span>
            <span className="text-[11px] text-gray-400 mt-1">نقد و نظر</span>
          </div>

          <div className="bg-[#121212] border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
            <Trophy className="text-amber-400 mb-2" size={24} />
            <span className="text-xl md:text-2xl font-black">{socialStats.followers.toLocaleString('fa-IR')}</span>
            <span className="text-[11px] text-gray-400 mt-1">دنبال‌کننده</span>
          </div>
        </section>

        {/* Showcase / Achievements */}
        <section aria-labelledby="badges-heading" className="bg-[#121212] border border-white/5 rounded-3xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 id="badges-heading" className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <Award className="text-pink-500" size={16} /> 
              ویترین افتخارات ({ALL_ACHIEVEMENTS.filter((b) => getBadgeProgress(b, achievementStats, targetProfile?.created_at).isUnlocked).length} از {ALL_ACHIEVEMENTS.length})
            </h2>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {['همه', 'محتوا', 'وفاداری', 'چالشی', 'اجتماعی'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#ccff00] ${
                    selectedCategory === cat 
                      ? 'bg-[#ccff00] text-black shadow-md' 
                      : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {ALL_ACHIEVEMENTS
              .filter((b) => selectedCategory === 'همه' || b.category === selectedCategory)
              .map((badge) => {
                const { isUnlocked, progressPercent } = getBadgeProgress(badge, achievementStats, targetProfile?.created_at);
                return (
                  <button 
                    key={badge.id}
                    type="button"
                    onClick={() => setSelectedBadge(badge)}
                    className={`shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl border min-w-[110px] cursor-pointer transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#ccff00] ${
                      isUnlocked ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5 opacity-50 grayscale'
                    }`}
                  >
                    <div className="text-4xl drop-shadow-md mb-1">{badge.icon}</div>
                    <span className={`text-[10px] font-bold ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>
                      {badge.title}
                    </span>
                    {!isUnlocked && (
                      <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-gray-400 rounded-full" style={{ width: `${progressPercent}%` }} />
                      </div>
                    )}
                  </button>
                );
              })}
          </div>
        </section>

        {/* Public Custom Lists */}
        {publicLists.length > 0 && (
          <section aria-labelledby="lists-heading">
            <div className="flex justify-between items-center mb-6">
              <h2 id="lists-heading" className="text-xl font-black flex items-center gap-2">
                <Layers size={20} className="text-[#ccff00]" /> لیست‌های پیشنهادی ({publicLists.length})
              </h2>
              <span className="text-xs text-gray-500">لیست‌های عمومی ایجاد شده توسط این کاربر</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {publicLists.map((list) => {
                const items = list.list_items || [];
                return (
                  <Link
                    key={list.id}
                    href={`/dashboard/custom-lists/${list.id}`}
                    className="bg-white/5 border border-white/10 hover:border-[#ccff00]/40 rounded-3xl p-5 transition-all block group focus:outline-none focus:ring-2 focus:ring-[#ccff00]"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {list.is_pinned && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 shadow-sm">
                            <Pin size={10} className="fill-amber-300" /> سنجاق‌شده در بالای پروفایل
                          </span>
                        )}
                        <span className="text-xs text-emerald-400 font-bold">🌐 عمومی</span>
                      </div>
                      <span className="text-xs text-gray-500 font-bold">{items.length} سریال</span>
                    </div>

                    <h3 className="text-base font-black text-white group-hover:text-[#ccff00] transition-colors">
                      {list.title}
                    </h3>

                    {list.description && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-1 leading-relaxed">
                        {list.description}
                      </p>
                    )}

                    {items.length > 0 && (
                      <div className="mt-3 flex gap-2 overflow-hidden">
                        {items.slice(0, 5).map((item) => (
                          <div key={item.id} className="w-10 h-14 rounded-md overflow-hidden bg-black shrink-0 border border-white/10 relative">
                            {item.poster_path ? (
                              <Image 
                                src={getImageUrl(item.poster_path)} 
                                alt={item.show_name || 'پوستر سریال'} 
                                fill 
                                sizes="40px"
                                className="object-cover" 
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-800" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Favorites */}
        {favorites.length > 0 && (
          <section aria-labelledby="favs-heading">
            <h2 id="favs-heading" className="text-xl font-black flex items-center gap-2 mb-6">
              <Heart className="text-red-500 fill-red-500" size={20} /> سریال‌های مورد علاقه ({favorites.length})
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {favorites.map((show) => (
                <Link
                  key={show.id}
                  href={`/dashboard/tv/${show.id}`}
                  className="bg-[#121212] border border-white/5 rounded-2xl overflow-hidden group hover:border-[#ccff00]/40 transition-all block focus:outline-none focus:ring-2 focus:ring-[#ccff00]"
                >
                  <div className="aspect-[2/3] relative w-full overflow-hidden bg-black">
                    {show.poster_path ? (
                      <Image 
                        src={getImageUrl(show.poster_path)} 
                        alt={show.name} 
                        fill 
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500 text-xs">
                        بدون پوستر
                      </div>
                    )}
                    <ShowCardProgress showId={show.id} totalEpisodes={show.number_of_episodes} />
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-xs text-white truncate group-hover:text-[#ccff00] transition-colors">
                      {show.name}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}