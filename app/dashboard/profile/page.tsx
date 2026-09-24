"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { getShowDetailsLite, getBackdropUrl, getImageUrl } from '@/lib/tmdbClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Loader2, Zap, MessageSquare, Heart, 
  Plus, Award, X, Clock, Play, User as UserIcon, 
  Lock, CheckCircle, LogOut, Share2, Trophy, Instagram, Twitter, Github, BookmarkPlus, BookmarkCheck, Tv, Layers, BadgeCheck
} from 'lucide-react';
import { 
  ALL_ACHIEVEMENTS, 
  getBadgeProgress as calculateBadgeProgress, 
  type AchievementBadge, 
  type AchievementUserStats 
} from '@/lib/achievements';
import { 
  readProfileCache, 
  writeProfileCache, 
  clearProfileCache, 
  clearAllProfileCaches,
  type CachedProfileData 
} from '@/lib/profileCache';

export default function ProfilePage() {
  const supabase = createClient() as any; 
  const router = useRouter();
  
  const [user, setUser] = useState<any>(null);
  const [profileInfo, setProfileInfo] = useState({ username: '', bio: '', avatar_url: '😎', is_vip: false });
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(true);
  
  // Stats
  const [timeStats, setTimeStats] = useState({ months: 0, days: 0, hours: 0 });
  const [totalEpisodes, setTotalEpisodes] = useState(0);
  const [socialStats, setSocialStats] = useState({ followers: 0, following: 0, comments: 0 });
  const [achievementStats, setAchievementStats] = useState({
    watchedRows: [] as any[],
    comments: [] as any[],
    followingIds: [] as string[],
    followerIds: [] as string[],
    favoriteIds: [] as number[],
    episodeRatings: [] as any[],
    commentLikeCount: 0,
    savedListCount: 0,
    eventTypes: [] as string[],
  });
  
  // Lists
  const [favorites, setFavorites] = useState<any[]>([]);
  const [watchedShows, setWatchedShows] = useState<any[]>([]);
  const [customLists, setCustomLists] = useState<any[]>([]);
  const [savedLists, setSavedLists] = useState<any[]>([]);
  const [coverImage, setCoverImage] = useState<string | null>(null);

  // Modals
  const [activeModal, setActiveModal] = useState<'followers' | 'following' | 'comments' | null>(null);
  const [modalList, setModalList] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('همه');

  // Fast path for profile data that does not depend on TMDB.
  useEffect(() => {
    let cancelled = false;
    const loadFastProfileData = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser || cancelled) return;

      const [profileRes, followersRes, followingRes, commentsRes, listsRes, savedRowsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', currentUser.id).single(),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', currentUser.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', currentUser.id),
        supabase.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', currentUser.id),
        supabase.from('user_lists').select('*, list_items ( id, show_id, show_name, poster_path )').eq('user_id', currentUser.id).order('order_index', { ascending: true }).order('created_at', { ascending: false }),
        supabase.from('list_saves').select('list_id, created_at').eq('user_id', currentUser.id).order('created_at', { ascending: false }),
      ]);

      if (cancelled) return;
      if (profileRes.data) {
        setProfileInfo({
          username: profileRes.data.username || '',
          bio: profileRes.data.bio || '',
          avatar_url: profileRes.data.avatar_url || currentUser.user_metadata?.avatar_url || '😎',
          is_vip: profileRes.data.is_vip === true,
        });
      }
      setSocialStats({ followers: followersRes.count || 0, following: followingRes.count || 0, comments: commentsRes.count || 0 });
      setCustomLists(listsRes.data || []);

      const savedIds = (savedRowsRes.data || []).map((row: any) => String(row.list_id));
      if (savedIds.length > 0) {
        const { data: savedData } = await supabase.from('user_lists').select('*, list_items ( id, show_id, show_name, poster_path )').in('id', savedIds).eq('is_public', true);
        const order = new Map<string, number>(savedIds.map((id: string, index: number) => [id, index]));
        setSavedLists((savedData || []).sort((first: any, second: any) => (order.get(String(first.id)) || 0) - (order.get(String(second.id)) || 0)));
      } else {
        setSavedLists([]);
      }
    };

    loadFastProfileData();
    return () => { cancelled = true; };
  }, [supabase.auth]);

  useEffect(() => {
    const fetchProfileData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      setUser(user);

      try {
        const cachedProfile = readProfileCache(user.id);
        if (cachedProfile) {
          setProfileInfo(cachedProfile.profileInfo);
          setTimeStats(cachedProfile.timeStats);
          setTotalEpisodes(cachedProfile.totalEpisodes);
          setSocialStats(cachedProfile.socialStats);
          setAchievementStats(cachedProfile.achievementStats);
          setFavorites(cachedProfile.favorites);
          setWatchedShows(cachedProfile.watchedShows);
          setCustomLists(cachedProfile.customLists);
          setSavedLists(cachedProfile.savedLists);
          setCoverImage(cachedProfile.coverImage);
          setLoading(false);
          setContentLoading(false);
          return;
        }

        const payload: Omit<CachedProfileData, 'version' | 'cachedAt'> = {
          profileInfo: { username: '', bio: '', avatar_url: '😎', is_vip: false },
          timeStats: { months: 0, days: 0, hours: 0 },
          totalEpisodes: 0,
          socialStats: { followers: 0, following: 0, comments: 0 },
          achievementStats: {
            watchedRows: [],
            comments: [],
            followingIds: [],
            followerIds: [],
            favoriteIds: [],
            episodeRatings: [],
            commentLikeCount: 0,
            savedListCount: 0,
            eventTypes: [],
          },
          favorites: [],
          watchedShows: [],
          customLists: [],
          savedLists: [],
          coverImage: null,
        };

        // ۱. واکشی اطلاعات پروفایل (نام کاربری و بیو)
        const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();
              
          if (profileData) {
              const nextProfileInfo = {
                  username: profileData.username || '',
                  bio: profileData.bio || '',
                  avatar_url: profileData.avatar_url || user?.user_metadata?.avatar_url || '😎',
                  is_vip: profileData.is_vip === true,
              };
              payload.profileInfo = nextProfileInfo;
              setProfileInfo(nextProfileInfo);
          }

        // ۲. دریافت اطلاعات تماشا شده‌ها و محاسبه پروگرس‌بارها
        // ۲. دریافت نامحدود تمام اپیزودهای تماشا شده (شکستن سقف ۱۰۰۰تایی سوپابیس)
          let allWatchedData: any[] = [];
          let page = 0;
          const pageSize = 1000;
          let hasMore = true;

          while (hasMore) {
            const { data, error } = await supabase
              .from('watched')
              .select('show_id, episode_id, created_at')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error || !data || data.length === 0) {
              hasMore = false;
            } else {
              allWatchedData = [...allWatchedData, ...data];
              if (data.length < pageSize) {
                hasMore = false;
              } else {
                page++;
              }
            }
          }

          const watchedData = allWatchedData;
        const [commentsRes, followingRes, followersRes, favoritesRes] = await Promise.all([
          supabase.from('comments').select('id, show_id, episode_id, parent_id, created_at').eq('user_id', user.id).order('created_at', { ascending: true }),
          supabase.from('follows').select('following_id, created_at').eq('follower_id', user.id),
          supabase.from('follows').select('follower_id, created_at').eq('following_id', user.id),
          supabase.from('favorites').select('show_id').eq('user_id', user.id),
        ]);
        const commentIds = (commentsRes.data || []).map((comment: any) => comment.id);
        const [episodeRatingsRes, commentLikesRes, eventsRes] = await Promise.all([
          supabase.from('episode_ratings').select('episode_id, show_id, rating').eq('user_id', user.id),
          commentIds.length > 0 ? supabase.from('comment_likes').select('comment_id').in('comment_id', commentIds) : Promise.resolve({ data: [] }),
          supabase.from('achievement_events').select('event_type').eq('user_id', user.id),
        ]);
        setAchievementStats({
          watchedRows: watchedData,
          comments: commentsRes.data || [],
          followingIds: (followingRes.data || []).map((item: any) => item.following_id),
          followerIds: (followersRes.data || []).map((item: any) => item.follower_id),
          favoriteIds: (favoritesRes.data || []).map((item: any) => Number(item.show_id)),
          episodeRatings: episodeRatingsRes.data || [],
          commentLikeCount: (commentLikesRes.data || []).length,
          savedListCount: 0,
          eventTypes: (eventsRes.data || []).map((item: any) => item.event_type),
        });
        payload.achievementStats = {
          watchedRows: watchedData,
          comments: commentsRes.data || [],
          followingIds: (followingRes.data || []).map((item: any) => item.following_id),
          followerIds: (followersRes.data || []).map((item: any) => item.follower_id),
          favoriteIds: (favoritesRes.data || []).map((item: any) => Number(item.show_id)),
          episodeRatings: episodeRatingsRes.data || [],
          commentLikeCount: (commentLikesRes.data || []).length,
          savedListCount: 0,
          eventTypes: (eventsRes.data || []).map((item: any) => item.event_type),
        };
        
        const showsDetailsMap: any = {};

        if (watchedData && watchedData.length > 0) {
          setTotalEpisodes(watchedData.length);
          payload.totalEpisodes = watchedData.length;

          // مرتب‌سازی سریال‌ها از جدیدترین به قدیمی‌ترین
        const sortedWatched = [...watchedData].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const uniqueShowIds = Array.from(new Set(sortedWatched.map((i: any) => i.show_id)));
          
          await Promise.all(uniqueShowIds.map(async (id) => {
            const d = await getShowDetailsLite(String(id));
            if (d) showsDetailsMap[String(id)] = d;
          }));

          // محاسبه زمان کل تماشا
          let totalMinutes = 0;
          watchedData.forEach((item: any) => {
            const show = showsDetailsMap[String(item.show_id)];
            const runtime = show?.episode_run_time?.length > 0 
              ? (show.episode_run_time.reduce((a: number, b: number) => a + b, 0) / show.episode_run_time.length) 
              : 45; 
            totalMinutes += runtime;
          });

          const daysTotal = Math.floor(totalMinutes / (24 * 60));
          const hoursTotal = Math.floor((totalMinutes % (24 * 60)) / 60);
          const months = Math.floor(daysTotal / 30);
          const days = daysTotal % 30;

          setTimeStats({ months, days, hours: hoursTotal });
          payload.timeStats = { months, days, hours: hoursTotal };

          // تصویر کاور بر اساس آخرین اثر تماشا شده
          const lastShowId = sortedWatched[0]?.show_id;
          if (showsDetailsMap[String(lastShowId)]?.backdrop_path) {
            const nextCoverImage = getBackdropUrl(showsDetailsMap[String(lastShowId)].backdrop_path);
            payload.coverImage = nextCoverImage;
            setCoverImage(nextCoverImage);
          }

          // آماده‌سازی تمام سریال‌های تماشا شده به همراه پروگرس‌بار
          const allWatchedList = uniqueShowIds.map((id) => {
            const d = showsDetailsMap[String(id)];
            if (!d) return null;

            const totalEps = d.number_of_episodes || 1;
            const watchedCount = watchedData.filter((w: any) => String(w.show_id) === String(id)).length;
            const progress = Math.min(100, Math.round((watchedCount / totalEps) * 100));

            return { ...d, progress, watchedCount, totalEps };
          }).filter(Boolean);

          setWatchedShows(allWatchedList);
          payload.watchedShows = allWatchedList;
        }

        // ۳. آمارهای اجتماعی
        const { count: followers } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id);
        const { count: following } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id);
        const { count: comments } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
        setSocialStats({ followers: followers || 0, following: following || 0, comments: comments || 0 });
        payload.socialStats = { followers: followers || 0, following: following || 0, comments: comments || 0 };

        // ۴. سریال‌های محبوب به همراه محاسبه پروگرس‌بار
        const { data: favData } = await supabase.from('favorites').select('show_id').eq('user_id', user.id);
        if (favData && favData.length > 0) {
          const favs = await Promise.all(favData.map(async (f: any) => {
            let d = showsDetailsMap[String(f.show_id)];
            if (!d) {
              d = await getShowDetailsLite(String(f.show_id));
            }
            if (!d) return null;

            const totalEps = d.number_of_episodes || 1;
            const watchedCount = watchedData ? watchedData.filter((w: any) => String(w.show_id) === String(f.show_id)).length : 0;
            const progress = Math.min(100, Math.round((watchedCount / totalEps) * 100));

            return { ...d, progress, watchedCount, totalEps };
          }));
          setFavorites(favs.filter(Boolean));
          payload.favorites = favs.filter(Boolean);
        }
        // ۵. خواندن لیست‌های اختصاصی کاربر با اولویت تعیین‌شده
        const { data: listsData } = await supabase
          .from('user_lists')
          .select(`
            *,
            list_items ( id, show_id, show_name, poster_path )
          `)
          .eq('user_id', user.id)
          .order('order_index', { ascending: true })
          .order('created_at', { ascending: false });

        setCustomLists(listsData || []);
        payload.customLists = listsData || [];
        if (listsData?.length > 0) {
          const listIds = listsData.map((list: any) => String(list.id));
          const { data: savedLists } = await supabase.from('list_saves').select('list_id').in('list_id', listIds);
          setAchievementStats(prev => ({ ...prev, savedListCount: savedLists?.length || 0 }));
          payload.achievementStats.savedListCount = savedLists?.length || 0;
        }

        const { data: savedListRows } = await supabase
          .from('list_saves')
          .select('list_id, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        const savedListIds = (savedListRows || []).map((row: any) => String(row.list_id));
        if (savedListIds.length > 0) {
          const { data: savedListData } = await supabase
            .from('user_lists')
            .select('*, list_items ( id, show_id, show_name, poster_path )')
            .in('id', savedListIds)
            .eq('is_public', true);
          const savedOrder = new Map<string, number>(savedListIds.map((id: string, index: number) => [id, index]));
          const sortedSavedLists = (savedListData || []).sort((first: any, second: any) => (savedOrder.get(String(first.id)) || 0) - (savedOrder.get(String(second.id)) || 0));
          payload.savedLists = sortedSavedLists;
          setSavedLists(sortedSavedLists);
        } else {
          payload.savedLists = [];
          setSavedLists([]);
        }
        writeProfileCache(user.id, payload);
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setContentLoading(false);
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [supabase.auth]);

  const openListModal = async (type: 'followers' | 'following' | 'comments') => {
    setActiveModal(type);
    setModalLoading(true);
    setModalList([]);
    let data: any[] = [];

    try {
      if (type === 'followers') {
        const res = await supabase.from('follows').select('follower_id, follower_email').eq('following_id', user.id);
        data = res.data?.map((d: any) => ({ id: d.follower_id, title: d.follower_email?.split('@')[0] || 'User', subtitle: 'Follower' })) || [];
      } else if (type === 'following') {
        const res = await supabase.from('follows').select('following_id, following_email').eq('follower_id', user.id);
        data = res.data?.map((d: any) => ({ id: d.following_id, title: d.following_email?.split('@')[0] || 'User', subtitle: 'Following' })) || [];
      } else if (type === 'comments') {
        const res = await supabase.from('comments').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        if (res.data) {
          data = res.data.map((c: any) => ({
            title: 'کامنت شما',
            subtitle: new Date(c.created_at).toLocaleDateString('fa-IR'),
            content: c.content
          }));
        }
      }
    } catch (err) {
      console.error("Error fetching modal data:", err);
    }
    setModalList(data);
    setModalLoading(false);
  };

  const badgeStats: AchievementUserStats = {
    totalEpisodes,
    watchedRows: achievementStats.watchedRows.map((r: any) => ({
      show_id: Number(r.show_id),
      episode_id: r.episode_id ? Number(r.episode_id) : null,
      created_at: String(r.created_at || ''),
    })),
    watchedShows: watchedShows.map((s: any) => ({
      id: Number(s.id),
      number_of_seasons: s.number_of_seasons,
      progress: s.progress,
      genres: s.genres,
      status: s.status,
      first_air_date: s.first_air_date,
    })),
    comments: achievementStats.comments.map((c: any) => ({
      id: Number(c.id),
      show_id: c.show_id ? Number(c.show_id) : null,
      parent_id: c.parent_id ? Number(c.parent_id) : null,
      created_at: String(c.created_at || ''),
    })),
    followingIds: achievementStats.followingIds,
    followerIds: achievementStats.followerIds,
    favoriteIds: achievementStats.favoriteIds,
    episodeRatings: achievementStats.episodeRatings,
    commentLikeCount: achievementStats.commentLikeCount,
    savedListCount: achievementStats.savedListCount,
    eventTypes: achievementStats.eventTypes,
    accountCreatedAt: user?.created_at,
    followersCount: socialStats.followers,
  };

  const getBadgeProgress = (badge: AchievementBadge) => {
    return calculateBadgeProgress(badge, badgeStats);
  };

  const handleLogout = async () => {
    clearAllProfileCaches();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const recordAchievementEvent = async (eventType: string) => {
    if (!user) return;
    try {
      await fetch('/api/achievements/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType }),
      });
      clearProfileCache(user.id);
      setAchievementStats(prev => ({
        ...prev,
        eventTypes: prev.eventTypes.includes(eventType) ? prev.eventTypes : [...prev.eventTypes, eventType],
      }));
    } catch (err) {
      console.error('Failed to record achievement event:', err);
    }
  };

  const handleEasterEggClick = () => {
    recordAchievementEvent('easter_egg_found');
  };

  const handleShareProfile = () => {
    recordAchievementEvent('profile_shared');
    if (navigator.share) {
      navigator.share({
        title: `پروفایل ${profileInfo.username || 'کاربر'} در بینجر`,
        text: `من ${totalEpisodes} اپیزود سریال دیدم! پروفایل من رو در بینجر چک کن.`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("لینک پروفایل کپی شد!");
    }
  };

  if (loading) return <div className="h-screen bg-[#050505] flex items-center justify-center text-[#ccff00]"><Loader2 className="animate-spin" size={48} /></div>;

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] pb-0 overflow-x-hidden flex flex-col">
      
      {/* --- BADGE MODAL --- */}
      {selectedBadge && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-6 animate-in zoom-in-95 duration-200" onClick={() => setSelectedBadge(null)}>
          <div className="bg-[#1a1a1a] border border-white/10 w-full max-w-sm rounded-3xl p-8 flex flex-col items-center text-center relative shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedBadge(null)} className="absolute top-4 left-4 bg-white/5 p-2 rounded-full hover:bg-white/10 cursor-pointer"><X size={20} /></button>
            
            <div className={`w-32 h-32 rounded-full flex items-center justify-center text-6xl mb-6 border-4 ${getBadgeProgress(selectedBadge).isUnlocked ? 'bg-[#ccff00]/10 border-[#ccff00] shadow-[0_0_30px_rgba(204,255,0,0.3)]' : 'bg-white/5 border-white/10 grayscale opacity-50'}`}>
              {selectedBadge.icon}
            </div>
            
            <h3 className="text-2xl font-black mb-2">{selectedBadge.title}</h3>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">{selectedBadge.desc}</p>
            
            {getBadgeProgress(selectedBadge).isUnlocked ? (
              <div className="bg-[#ccff00]/10 text-[#ccff00] px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
                <CheckCircle size={18} /> دریافت شده
              </div>
            ) : (
              <div className="w-full flex flex-col items-center gap-2">
                <div className="flex justify-between w-full text-xs font-bold text-gray-400 px-1">
                  <span>{getBadgeProgress(selectedBadge).current}</span>
                  <span>{selectedBadge.threshold} هدف</span>
                </div>
                <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gray-500 rounded-full" style={{ width: `${getBadgeProgress(selectedBadge).percentage}%` }}></div>
                </div>
                <span className="text-[10px] text-gray-500 mt-1 flex items-center gap-1"><Lock size={12} /> قفل است</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1">
        {/* --- HERO HEADER --- */}
        <div className="relative w-full min-h-[480px] sm:min-h-[450px] md:h-[60vh]">
          <div className="absolute inset-0">
            {coverImage ? <img src={coverImage} className="w-full h-full object-cover opacity-60" alt="Cover" /> : <div className="w-full h-full bg-gradient-to-br from-purple-900 to-black"></div>}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-transparent"></div>
          </div>

          <div className="absolute top-4 sm:top-8 w-full px-4 sm:px-6 flex justify-end items-center z-20">
            <button onClick={handleLogout} className="bg-white/10 hover:bg-red-500/20 hover:text-red-400 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition-all border border-white/5 flex items-center gap-1.5 sm:gap-2 text-xs font-bold cursor-pointer">
              <LogOut size={15} /> خروج
            </button>
          </div>

          <div className="absolute bottom-0 w-full px-4 sm:px-6 pb-4 sm:pb-6 flex flex-col items-center z-20 translate-y-6 sm:translate-y-8">
            <div className="relative group cursor-pointer">
              {/* قاب طلایی درخشان دور آواتار مخصوص کاربر VIP */}
              <div className={`rounded-full transition-all relative z-10 ${
                ((profileInfo as any)?.is_vip || (profileInfo as any)?.role === 'admin')
                  ? 'p-1 bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 shadow-[0_0_35px_rgba(245,158,11,0.6)]'
                  : 'p-0'
              }`}>
                <button 
                  onClick={handleEasterEggClick} 
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-[#050505] bg-gradient-to-tr from-gray-800 to-gray-600 shadow-2xl flex items-center justify-center text-4xl md:text-5xl overflow-hidden cursor-pointer" 
                  title="آواتار پروفایل"
                >
                  {profileInfo.avatar_url || '😎'}
                </button>
              </div>

              {/* هاله نور پس‌زمینه (طلایی درخشان برای VIP و سبز نئونی برای عادی) */}
              <div className={`absolute inset-0 blur-2xl rounded-full transition-opacity ${
                ((profileInfo as any)?.is_vip || (profileInfo as any)?.role === 'admin')
                  ? 'bg-amber-400 opacity-40 group-hover:opacity-70'
                  : 'bg-[#ccff00] opacity-20 group-hover:opacity-40'
              }`}></div>
            </div>
            
            {/* نمایش نام کاربری و بیو */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <h1 className={`text-2xl md:text-3xl font-black ltr tracking-tight ${
                ((profileInfo as any)?.is_vip || (profileInfo as any)?.role === 'admin')
                  ? 'bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(245,158,11,0.4)]'
                  : 'text-white'
              }`}>
                {profileInfo.username || user?.phone || user?.email?.split('@')[0] || 'کاربر بینجر'}
              </h1>

              {/* تیک آبی مخصوص کاربر VIP */}
              {((profileInfo as any)?.is_vip || (profileInfo as any)?.role === 'admin') && (
                <span title="حساب تایید شده VIP" className="inline-flex items-center text-sky-400">
                  <BadgeCheck size={24} className="fill-sky-400 text-white drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
                </span>
              )}
            </div>
            
            {profileInfo.bio && (
              <p className="text-sm text-gray-400 mt-2 max-w-md max-h-12 overflow-hidden text-center leading-relaxed px-4 line-clamp-2">
                {profileInfo.bio.slice(0, 120)}
              </p>
            )}
            
            {/* دکمه‌های مدیریتی */}
            <div className="flex items-center gap-2 mt-4">
              <button onClick={handleShareProfile} className="w-9 h-9 bg-[#ccff00] text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_15px_rgba(204,255,0,0.4)] cursor-pointer" title="اشتراک گذاری پروفایل">
                <Share2 size={18} />
              </button>
              
              <Link href="/dashboard/settings" className="text-gray-300 text-xs font-bold bg-white/10 px-6 py-2.5 rounded-full border border-white/10 backdrop-blur-sm hover:bg-white/20 transition-all text-center">
                ویرایش پروفایل
              </Link>

              <Link href="/dashboard/leaderboard" className="w-9 h-9 bg-purple-600 text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_15px_rgba(147,51,234,0.4)] cursor-pointer border border-purple-400" title="جدول امتیازات">
                <Trophy size={18} />
              </Link>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 mt-4 sm:mt-6 bg-[#1a1a1a]/80 border border-white/10 backdrop-blur-xl p-1 sm:p-1.5 rounded-2xl shadow-xl max-w-[95vw]">
              {loading ? <ProfileBoxLoading /> : <>
                <SocialItem count={socialStats.followers} label="Followers" onClick={() => openListModal('followers')} />
                <div className="w-px h-8 bg-white/10"></div>
                <SocialItem count={socialStats.following} label="Following" onClick={() => openListModal('following')} />
                <div className="w-px h-8 bg-white/10"></div>
                <SocialItem count={socialStats.comments} label="Comments" onClick={() => openListModal('comments')} />
              </>}
            </div>
          </div>
        </div>

        {/* --- CONTENT --- */}
        <div className="max-w-5xl mx-auto px-4 mt-16 sm:mt-20 space-y-8 sm:space-y-12 mb-20">
          
          {/* STATS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Clock size={100} /></div>
              <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2"><Zap className="text-[#ccff00]" size={14} /> زمانی که برای تماشای سریال صرف کردید: </h3>
              {contentLoading ? <ProfileBoxLoading /> : (
                <div className="flex items-end gap-4 ltr">
                  <div className="flex flex-col"><span className="text-3xl md:text-5xl font-black text-white leading-none">{timeStats.months}</span><span className="text-[10px] text-gray-500 uppercase font-bold">ماه</span></div>
                  <div className="flex flex-col"><span className="text-3xl md:text-5xl font-black text-white leading-none">{timeStats.days}</span><span className="text-[10px] text-gray-500 uppercase font-bold">روز</span></div>
                  <div className="flex flex-col"><span className="text-3xl md:text-5xl font-black text-white/50 leading-none">{timeStats.hours}</span><span className="text-[10px] text-gray-500 uppercase font-bold">ساعت</span></div>
                </div>
              )}
            </div>

            <div className="bg-[#ccff00] text-black rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group shadow-[0_0_40px_rgba(204,255,0,0.1)]">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-transform group-hover:scale-110"><Play size={120} fill="black" /></div>
              {contentLoading ? <div className="h-16 w-24 bg-black/10 rounded-xl animate-pulse" /> : <>
                <h3 className="text-black/60 text-xs font-bold uppercase tracking-wider">شما تا به امروز </h3>
                <div className="text-4xl md:text-5xl font-black mt-2">{totalEpisodes}</div>
                <p className="text-[10px] font-bold mt-1 opacity-60">اپیروز سریال تماشا کردید</p>
              </>}
            </div>

            {/* ویترین افتخارات با تب‌های فیلتر */}
                <div className="md:col-span-3 bg-white/5 border border-white/10 rounded-3xl p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                      <Award className="text-pink-500" size={16} /> ویترین افتخارات {loading ? '' : `(${ALL_ACHIEVEMENTS.filter(b => getBadgeProgress(b).isUnlocked).length} از ${ALL_ACHIEVEMENTS.length})`}
                    </h3>

                    {/* دکمه‌های فیلتر دسته‌بندی */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                      {['همه', 'محتوا', 'وفاداری', 'چالشی', 'اجتماعی'].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                            selectedCategory === cat
                              ? 'bg-[#ccff00] text-black shadow-[0_0_12px_rgba(204,255,0,0.3)]'
                              : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* گرید اسکرول مدال‌ها */}
                  {contentLoading ? <ProfileBoxLoading /> : (
                    <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                      {ALL_ACHIEVEMENTS
                        .filter(b => selectedCategory === 'همه' || b.category === selectedCategory)
                        .map((badge) => (
                          <BadgeItem
                            key={badge.id}
                            badge={badge}
                            progress={getBadgeProgress(badge)}
                            onClick={() => setSelectedBadge(badge)}
                          />
                      ))}
                    </div>
                  )}
                </div>
          </div>
          {/* بخش لیست‌های اختصاصی کاربر با اولویت‌بندی */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black flex items-center gap-2">
                <Layers size={20} className="text-[#ccff00]" /> لیست‌های اختصاصی من {loading ? '' : `(${customLists.length})`}
              </h2>
              <Link 
                href="/dashboard/custom-lists" 
                className="text-xs bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all flex items-center gap-2 border border-white/10"
              >
                <Plus size={14} /> مدیریت و ساخت لیست
              </Link>
            </div>

            {loading ? <ProfileBoxLoading /> : customLists.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customLists.map((list, idx) => {
                  const items = list.list_items || [];
                  return (
                    <Link
                      key={list.id}
                      href={`/dashboard/custom-lists/${list.id}`}
                      className="bg-white/5 border border-white/10 hover:border-[#ccff00]/40 rounded-3xl p-5 transition-all block group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-md text-gray-300">
                            اولویت {idx + 1}
                          </span>
                          <span className="text-xs text-gray-400">
                            {list.is_public ? '🌐 عمومی' : '🔒 خصوصی'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 font-bold">{items.length} سریال</span>
                      </div>

                      <h4 className="text-base font-black text-white group-hover:text-[#ccff00] transition-colors">
                        {list.title}
                      </h4>

                      {list.description && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                          {list.description}
                        </p>
                      )}

                      {/* پیش‌نمایش پوسترها */}
                      {items.length > 0 && (
                        <div className="mt-3 flex gap-2 overflow-hidden">
                          {items.slice(0, 5).map((item: any) => (
                            <div key={item.id} className="w-10 h-14 rounded-md overflow-hidden bg-black shrink-0 border border-white/10">
                              <img src={getImageUrl(item.poster_path)} alt={item.show_name} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="w-full py-8 bg-white/5 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-2 text-gray-500">
                <Layers size={28} strokeWidth={1.5} />
                <p className="text-xs">هنوز هیچ لیستی نساخته‌اید.</p>
                <Link href="/dashboard/custom-lists" className="text-xs text-[#ccff00] font-bold hover:underline mt-1">
                  ساخت اولین لیست
                </Link>
              </div>
            )}
          </div>
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black flex items-center gap-2">
                <BookmarkCheck size={20} className="text-[#ccff00]" /> لیست‌های ذخیره‌شده {loading ? '' : `(${savedLists.length})`}
              </h2>
              <Link href="/dashboard/custom-lists/explore" className="text-xs bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all flex items-center gap-2 border border-white/10">
                <BookmarkPlus size={14} /> کشف لیست‌ها
              </Link>
            </div>

            {loading ? <ProfileBoxLoading /> : savedLists.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedLists.map((list) => {
                  const items = list.list_items || [];
                  return (
                    <Link
                      key={list.id}
                      href={`/dashboard/custom-lists/${list.id}`}
                      className="bg-white/5 border border-white/10 hover:border-[#ccff00]/40 rounded-3xl p-5 transition-all block group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold bg-[#ccff00]/10 text-[#ccff00] px-2 py-1 rounded-md flex items-center gap-1">
                          <BookmarkCheck size={12} /> ذخیره‌شده
                        </span>
                        <span className="text-xs text-gray-500 font-bold">{items.length} سریال</span>
                      </div>
                      <h4 className="text-base font-black text-white group-hover:text-[#ccff00] transition-colors">{list.title}</h4>
                      {list.description && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{list.description}</p>}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="w-full py-8 bg-white/5 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-2 text-gray-500">
                <BookmarkPlus size={28} strokeWidth={1.5} />
                <p className="text-xs">هنوز لیستی ذخیره نکرده‌اید.</p>
              </div>
            )}
          </div>
          {/* ۱. سریال‌های محبوب من (با پروگرس‌بار زیر هر اثر) */}
          <div>
            <div className="flex justify-between items-end mb-6">
              <h2 className="text-xl font-black flex items-center gap-2">
                <Heart className="text-red-500 fill-red-500" size={20} /> محبوب ترین سریال ها {loading ? '' : `(${favorites.length})`}
              </h2>
              <Link href="/dashboard/favorites" className="text-xs bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all flex items-center gap-2 border border-white/10">
                <Plus size={14} /> مدیریت
              </Link>
            </div>
            {contentLoading ? <ProfileBoxLoading /> : favorites.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {favorites.map((s) => (
                  <ShowCard key={s.id} show={s} router={router} />
                ))}
              </div>
            ) : (
              <div className="w-full py-12 bg-white/5 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-3 text-gray-500">
                <Heart size={32} strokeWidth={1.5} />
                <p className="text-xs">هنوز هیچ سریالی را به محبوب‌ها اضافه نکرده‌اید.</p>
              </div>
            )}
          </div>

          {/* ۲. سریال‌های تماشا شده (کاروسل ۲۰ اثر اخیر با پروگرس‌بار) */}
          <div className="pb-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black flex items-center gap-2">
                <Tv size={20} className="text-[#ccff00]" /> آخرین سریال های تماشا شده
              </h2>
              
              <Link
                href="/dashboard/lists"
                className="text-xs bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all border border-white/10"
              >
                مشاهده همه
              </Link>
            </div>

            {contentLoading ? <ProfileBoxLoading /> : watchedShows.length > 0 ? (
              <div 
                id="watched-carousel"
                dir="rtl"
                onMouseDown={(e) => {
                  const slider = e.currentTarget;
                  slider.dataset.isDown = 'true';
                  slider.dataset.startX = `${e.pageX - slider.offsetLeft}`;
                  slider.dataset.scrollLeft = `${slider.scrollLeft}`;
                }}
                onMouseLeave={(e) => {
                  delete e.currentTarget.dataset.isDown;
                }}
                onMouseUp={(e) => {
                  delete e.currentTarget.dataset.isDown;
                }}
                onMouseMove={(e) => {
                  const slider = e.currentTarget;
                  if (slider.dataset.isDown !== 'true') return;
                  e.preventDefault();
                  const x = e.pageX - slider.offsetLeft;
                  const startX = Number(slider.dataset.startX);
                  const scrollLeft = Number(slider.dataset.scrollLeft);
                  const walk = (x - startX) * 1.5;
                  slider.scrollLeft = scrollLeft - walk;
                }}
                className="flex gap-4 overflow-x-auto pb-4 no-scrollbar cursor-grab active:cursor-grabbing select-none scroll-smooth"
              >
                {watchedShows.slice(0, 20).map((s) => (
                  <div key={s.id} className="w-[130px] md:w-[150px] shrink-0">
                    <ShowCard show={s} router={router} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full py-12 bg-white/5 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-3 text-gray-500">
                <Tv size={32} strokeWidth={1.5} />
                <p className="text-xs">هنوز هیچ سریالی در لیست تماشا شده‌های شما ثبت نشده است.</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* --- ALL MODALS (FOLLOWERS / COMMENTS) --- */}
      {activeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 animate-in fade-in duration-300" onClick={() => setActiveModal(null)}>
          <div className="bg-[#0f0f0f] border border-white/10 w-full max-w-2xl rounded-[2rem] overflow-hidden flex flex-col shadow-2xl max-h-[80vh]" onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#141414]">
              <h3 className="font-black text-xl text-white flex items-center gap-2">
                {activeModal === 'followers' && 'دنبال‌کنندگان شما'}
                {activeModal === 'following' && 'کسانی که دنبال می‌کنید'}
                {activeModal === 'comments' && 'نظرات ارسالی شما'}
              </h3>
              <button onClick={() => setActiveModal(null)} className="bg-white/5 p-2 rounded-full hover:bg-white/10 hover:text-red-400 transition-all cursor-pointer"><X size={20} /></button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-2">
              {modalLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#ccff00]" size={32} /></div>
              ) : modalList.length > 0 ? (
                modalList.map((item, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => { if (item.id) router.push(`/dashboard/user/${item.id}`); }}
                    className="p-4 rounded-2xl flex items-center gap-4 border transition-colors bg-white/[0.03] hover:bg-white/[0.06] border-white/5 cursor-pointer hover:border-white/20"
                  >
                    {activeModal === 'comments' ? (
                      <>
                        <div className="bg-white/10 p-3 rounded-xl"><MessageSquare size={20} className="text-[#ccff00]" /></div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-2">
                            <span className="text-xs font-bold text-[#ccff00] bg-[#ccff00]/10 px-2 py-1 rounded-md">{item.title}</span>
                            <span className="text-[10px] text-gray-500">{item.subtitle}</span>
                          </div>
                          <p className="text-sm text-gray-300 leading-relaxed">{item.content}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center text-xl shadow-inner border border-white/10">👤</div>
                        <div className="flex-1 flex flex-col justify-center h-12">
                          <span className="text-base font-bold text-white ltr text-left">{item.title}</span>
                          <span className="text-xs text-gray-500 ltr text-left">{item.subtitle}</span>
                        </div>
                        <button className="text-xs border border-white/20 px-4 py-2 rounded-full hover:bg-[#ccff00] hover:text-black hover:border-[#ccff00] transition-all font-bold">مشاهده</button>
                      </>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-gray-600 gap-4"><UserIcon size={48} strokeWidth={1} /><p>لیست خالی است.</p></div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <DashboardFooter />
    </div>
  );
}

// --- زیر کامپوننت‌ها ---

function SocialItem({ count, label, onClick }: { count: number, label: string, onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center w-16 sm:w-20 py-1.5 sm:py-2 hover:bg-white/5 rounded-xl transition-all cursor-pointer group">
      <span className="text-base sm:text-lg font-black text-white group-hover:text-[#ccff00] transition-colors">{count}</span>
      <span className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-500 tracking-wide">{label}</span>
    </button>
  );
}

function ProfileBoxLoading() {
  return (
    <div className="flex items-center gap-3 min-h-16 text-xs text-gray-500">
      <Loader2 size={18} className="animate-spin text-[#ccff00]" />
      <span>در حال بارگذاری...</span>
    </div>
  );
}

interface BadgeItemProps {
  badge: AchievementBadge;
  progress: { isUnlocked: boolean; percentage: number; current: number };
  onClick: () => void;
}

function BadgeItem({ badge, progress, onClick }: BadgeItemProps) {
  const { isUnlocked, percentage } = progress;
  return (
    <button 
      type="button"
      onClick={onClick} 
      aria-label={`مدال ${badge.title}`}
      className={`shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl border min-w-[110px] cursor-pointer transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#ccff00] ${isUnlocked ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5 opacity-50 grayscale'}`}
    >
      <div className="text-4xl drop-shadow-md mb-1">{badge.icon}</div>
      <span className={`text-[10px] font-bold ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>{badge.title}</span>
      
      {!isUnlocked && (
        <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden mt-1">
          <div className="h-full bg-gray-400 rounded-full" style={{ width: `${percentage}%` }}></div>
        </div>
      )}
    </button>
  );
}

// کامپوننت کارت سریال به همراه نوار پیشرفت و جزئیات دقیق تماشا
function ShowCard({ show, router }: any) {
  const getSafeImageUrl = (path: string | null) => {
    if (!path) return '/placeholder-poster.jpg';
    return getImageUrl(path);
  };

  const progress = show.progress ?? 0;
  const isCompleted = progress === 100;

  return (
    <div 
      onClick={() => router.push(`/dashboard/tv/${show.id}`)} 
      className="group cursor-pointer flex flex-col transition-all duration-300 hover:-translate-y-1.5"
    >
      {/* پوستر سریال */}
      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-2 ring-1 ring-white/10 group-hover:ring-[#ccff00]/50 transition-all shadow-lg bg-white/5">
        <img 
          src={getSafeImageUrl(show.poster_path)} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          alt={show.name} 
        />
        
        {/* بج درصد در بالای پوستر */}
        <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md border border-white/10 rounded-lg px-2 py-0.5 text-[10px] font-black ltr">
          {isCompleted ? (
            <span className="text-[#ccff00]">۱۰۰٪</span>
          ) : (
            <span className="text-cyan-400">{progress}٪</span>
          )}
        </div>
      </div>

      {/* نوار پیشرفت دقیق زیر هر پوستر */}
      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-1.5">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${
            isCompleted 
              ? 'bg-[#ccff00] shadow-[0_0_8px_rgba(204,255,0,0.6)]' 
              : 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* عنوان و وضعیت تماشا */}
      <h4 className="text-xs font-bold text-gray-200 group-hover:text-[#ccff00] transition-colors truncate px-0.5">
        {show.name}
      </h4>
      <div className="flex items-center justify-between text-[10px] text-gray-400 px-0.5 mt-0.5">
        {isCompleted ? (
          <span className="text-[#ccff00] font-bold flex items-center gap-1">
            <CheckCircle size={11} /> کامل شده
          </span>
        ) : (
          <span className="text-gray-400">
            {show.watchedCount} از {show.totalEps} اپیزود
          </span>
        )}
      </div>
    </div>
  );
}

function DashboardFooter() {
  return (
    <footer className="mt-20 border-t border-white/5 bg-[#080808] relative z-10">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#ccff00] rounded-lg flex items-center justify-center text-black font-black">B</div>
              <span className="text-xl font-black text-white">Binger</span>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed max-w-sm text-justify">
              بینجر پلتفرم هوشمند مدیریت و کشف سریال است. با بینجر همیشه می‌دونی چی ببینی و تا کجا دیدی.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4">دسترسی سریع</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/dashboard/explore" className="hover:text-[#ccff00] transition-colors">تازه‌ترین‌ها</Link></li>
              <li><Link href="/dashboard/top-rated" className="hover:text-[#ccff00] transition-colors">برترین‌های IMDB</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4">ما را دنبال کنید</h4>
            <div className="flex gap-4">
              <Link href="#" className="p-2 bg-white/5 rounded-full hover:bg-[#ccff00] hover:text-black transition-all cursor-pointer"><Twitter size={18} /></Link>
              <Link href="#" className="p-2 bg-white/5 rounded-full hover:bg-[#ccff00] hover:text-black transition-all cursor-pointer"><Instagram size={18} /></Link>
              <Link href="#" className="p-2 bg-white/5 rounded-full hover:bg-[#ccff00] hover:text-black transition-all cursor-pointer"><Github size={18} /></Link>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500">
            © ۲۰۲۶ تمامی حقوق برای <span className="text-[#ccff00]">Binger</span> محفوظ است.
          </p>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            Made with <Heart size={12} className="text-red-500 fill-red-500 animate-pulse" /> for Movie Lovers
          </div>
        </div>
      </div>
    </footer>
  );
}