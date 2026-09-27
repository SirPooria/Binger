"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getShowDetails, getSeasonDetails, getImageUrl, getBackdropUrl,
  getSimilarShows, getReleasedEpisodeCount, getShowDetailsLite
} from '@/lib/tmdbClient';
import { getShowSpinOffs, SpinOffItem } from '@/lib/spinOffs';
import { createClient } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import {
  Star, Loader2, Check, Plus, Share2, Play, Info, RotateCcw,
  ChevronDown, ChevronUp, Tag, CheckCircle2, Search, Users,
  Feather, Award, GitFork
} from 'lucide-react';
import { ShowCardProgress } from '../../components/ShowProgressBar';
import { WatchlistButton } from '../../components/WatchlistButton';
import confetti from 'canvas-confetti';
import { useWatched } from '@/lib/watchedContext';

// Dynamic imports with lightweight loading fallbacks for heavy modals and sections
const EpisodeModal = dynamic(() => import('../../components/EpisodeModal'), {
  loading: () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="flex flex-col items-center gap-3 bg-[#111] p-6 rounded-2xl border border-white/10 shadow-2xl">
        <Loader2 className="w-8 h-8 text-[#ccff00] animate-spin" />
        <span className="text-xs font-bold text-gray-300">در حال بارگذاری جزئیات قسمت...</span>
      </div>
    </div>
  ),
  ssr: false,
});

const CriticReviewsSection = dynamic(() => import('./CriticReviewsSection'), {
  loading: () => (
    <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-400">
      <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      <span className="text-xs font-bold">در حال بارگذاری نقد منتقدین...</span>
    </div>
  ),
  ssr: false,
});

// --- اسکلت لودینگ پیشرفته و ماژولار (Progressive Skeleton Loader) ---
const SkeletonPage = () => (
  <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] pb-32 md:pb-20 animate-pulse">
    {/* Hero Skeleton */}
    <div className="relative w-full min-h-[55vh] md:h-[75vh] bg-white/[0.04] flex flex-col justify-end">
      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent"></div>
      <div className="relative w-full p-4 sm:p-6 md:p-12 flex flex-col gap-4 z-10 pt-20 pb-8 md:pb-16 max-w-7xl mx-auto">
        <div className="w-24 h-6 bg-white/10 rounded-md"></div>
        <div className="w-3/4 sm:w-1/2 h-10 sm:h-14 bg-white/15 rounded-2xl"></div>
        <div className="w-1/3 sm:w-1/4 h-6 bg-white/10 rounded-xl"></div>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <div className="w-32 h-11 bg-white/15 rounded-xl"></div>
          <div className="w-36 h-11 bg-white/10 rounded-xl"></div>
          <div className="w-11 h-11 bg-white/10 rounded-xl"></div>
        </div>
      </div>
    </div>

    {/* Tabs Bar Skeleton */}
    <div className="border-b border-white/10 bg-[#0a0a0a]/60 backdrop-blur-md sticky top-16 md:top-20 z-30">
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex gap-8">
        <div className="w-24 h-12 border-b-2 border-[#ccff00]/40 flex items-center">
          <div className="w-16 h-4 bg-white/15 rounded"></div>
        </div>
        <div className="w-20 h-12 flex items-center">
          <div className="w-14 h-4 bg-white/10 rounded"></div>
        </div>
        <div className="w-24 h-12 flex items-center">
          <div className="w-16 h-4 bg-white/10 rounded"></div>
        </div>
      </div>
    </div>

    {/* Content Skeleton */}
    <div className="max-w-7xl mx-auto px-4 md:px-6 mt-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Overview Skeleton */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-3">
            <div className="w-28 h-5 bg-white/15 rounded"></div>
            <div className="w-full h-4 bg-white/10 rounded"></div>
            <div className="w-5/6 h-4 bg-white/10 rounded"></div>
            <div className="w-2/3 h-4 bg-white/10 rounded"></div>
          </div>

          {/* Cast Row Skeleton */}
          <div>
            <div className="w-20 h-5 bg-white/15 rounded mb-4"></div>
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="flex flex-col items-center gap-2 shrink-0 w-20">
                  <div className="w-16 h-16 rounded-full bg-white/10"></div>
                  <div className="w-14 h-3 bg-white/10 rounded"></div>
                  <div className="w-10 h-2 bg-white/5 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 h-64"></div>
        </div>
      </div>
    </div>
  </div>
);

// کامپوننت پلتفرم‌های پخش
const PlatformIcon = ({ name, color, icon }: any) => (
  <div className="flex flex-col items-center gap-2 group cursor-pointer transition-all active:scale-95">
    <div className={`w-12 h-12 md:w-14 md:h-14 ${color} rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-105 group-hover:shadow-xl border border-white/5 relative overflow-hidden`}>
      {icon ? icon : <span className="font-black text-[10px] uppercase tracking-wider">{name.substring(0, 3)}</span>}
    </div>
    <span className="text-[9px] md:text-[10px] text-gray-400 font-medium group-hover:text-white transition-colors">{name}</span>
  </div>
);

const getGenreColor = (index: number) => {
  const colors = [
    'from-pink-500 to-rose-500',
    'from-purple-500 to-indigo-500',
    'from-cyan-500 to-blue-500',
    'from-emerald-500 to-green-500',
    'from-amber-500 to-orange-500'
  ];
  return colors[index % colors.length];
};

const getInitials = (name: string) => {
  if (!name) return "";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
};

export default function ShowDetailsClient({ initialShow, showId: propShowId }: { initialShow?: any; showId?: string } = {}) {
  const supabase = createClient() as any;
  const params = useParams();
  const router = useRouter();
  const showId = propShowId || (params?.id as string);
  const {
    getShowWatchedEpisodes,
    getWatchedRecords,
    toggleWatchedEpisode,
    toggleSeasonEpisodes,
  } = useWatched();

  const isPersianText = (text: string) => {
    if (!text) return false;
    return /[\u0600-\u06FF]/.test(text);
  };

  // --- استیت‌های داده ---
  const [user, setUser] = useState<any>(null);
  const [show, setShow] = useState<any>(initialShow || null);
  const [showEn, setShowEn] = useState<any>(null);
  const [cast, setCast] = useState<any[]>([]);
  const [activeSeason, setActiveSeason] = useState(1);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [allSeasonsData, setAllSeasonsData] = useState<any>({});
  const [watchedEpisodes, setWatchedEpisodes] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'about' | 'episodes' | 'critics'>('about');
  const [loading, setLoading] = useState(true);

  // استیت‌های مدال گپ اپیزودها
  const [showGapModal, setShowGapModal] = useState(false);
  const [gapEpisodesToMark, setGapEpisodesToMark] = useState<number[]>([]);
  const [targetGapEpisode, setTargetGapEpisode] = useState<number | null>(null);

  // لینک‌های پلتفرم‌ها
  const [platformLinks, setPlatformLinks] = useState<any>(null);

  // استیت‌های UI
  const [selectedEp, setSelectedEp] = useState<any>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showConfirmAll, setShowConfirmAll] = useState(false);
  const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(new Set());
  const carouselRef = useRef<HTMLDivElement>(null);
  const watchedEpisodesRef = useRef<number[]>([]);
  const seasonActionInFlight = useRef<Set<number>>(new Set());
  const seasonActionQueue = useRef(Promise.resolve());

  // استیت‌های لودینگ
  const [seasonLoading, setSeasonLoading] = useState<{ [key: number]: boolean }>({});
  const [wholeShowLoading, setWholeShowLoading] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  // امتیازها و آثار مشابه
  const [similarShows, setSimilarShows] = useState<any[]>([]);
  const [spinOffs, setSpinOffs] = useState<SpinOffItem[]>([]);
  const [spinOffsLoading, setSpinOffsLoading] = useState(true);
  const [myRating, setMyRating] = useState(0);
  const [bingerStats, setBingerStats] = useState({ avg: 0, count: 0 });
  const [inWatchlist, setInWatchlist] = useState(false);

  const triggerCelebration = () => {
    const duration = 2500;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 40 * (timeLeft / duration);
      try {
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      } catch (e) { }
    }, 250);
  };

  const isReleased = (dateString: string) => {
    if (!dateString) return false;
    return new Date(dateString) <= new Date();
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "Ended": return "پایان یافته";
      case "Canceled": return "کنسل شده";
      case "Returning Series": return "در انتظار فصل جدید";
      default: return "در حال پخش";
    }
  };

  const scrollToActiveEpisode = () => {
    if (carouselRef.current) {
      const firstUnwatched = episodes.find(ep => !watchedEpisodes.includes(ep.id));
      const targetId = firstUnwatched ? `ep-${firstUnwatched.id}` : (episodes.length > 0 ? `ep-${episodes[episodes.length - 1].id}` : null);
      if (targetId) {
        const el = document.getElementById(targetId);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else {
        carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      }
    }
  };

  const refreshWatched = async (userId: string) => {
    await getWatchedRecords();
    const episodeIds = getShowWatchedEpisodes(showId);
    watchedEpisodesRef.current = episodeIds;
    setWatchedEpisodes(episodeIds);
  };

  useEffect(() => {
    watchedEpisodesRef.current = watchedEpisodes;
  }, [watchedEpisodes]);

  const fetchRatings = async (userId: string) => {
    const [myR, allR] = await Promise.all([
      supabase.from('show_ratings').select('rating').eq('user_id', userId).eq('show_id', showId),
      supabase.from('show_ratings').select('rating').eq('show_id', showId)
    ]);

    if (myR.data && myR.data.length > 0) setMyRating(myR.data[0].rating);
    if (allR.data && allR.data.length > 0) {
      const sum = allR.data.reduce((acc: any, curr: any) => acc + curr.rating, 0);
      setBingerStats({ avg: sum / allR.data.length, count: allR.data.length });
    }
  };

  const fetchCredits = async (id: string) => {
    try {
      const res = await fetch(`/api/tmdb/tv/${encodeURIComponent(id)}/credits`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.cast) setCast(data.cast.slice(0, 10));
    } catch (e) {
      console.error('Error fetching credits:', e);
    }
  };

  // --- بارگذاری موازی و پرسرعت (Parallel Fast Loading) ---
  useEffect(() => {
    const initData = async () => {
      if (!showId) return;

      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);

        // اجرای همزمان درخواست‌ها بدون واکشی تکراری
        const [
          details,
          similarData,
          spinOffsData,
          platformRes,
          watchlistRes
        ] = await Promise.all([
          getShowDetails(showId),
          getSimilarShows(showId),
          getShowSpinOffs(showId, undefined, undefined, getShowDetailsLite),
          supabase.from('show_platform_links').select('*').eq('show_id', showId).maybeSingle(),
          currentUser ? supabase.from('watchlist').select('id').eq('user_id', currentUser.id).eq('show_id', showId) : Promise.resolve({ data: [] })
        ]);

        const resolvedDetails = details || initialShow;
        setShow(resolvedDetails);
        // استفاده از اطلاعات انگلیسی کشف‌شده در getShowDetails بدون نیاز به واکشی دوباره
        setShowEn(resolvedDetails ? { ...resolvedDetails, overview: (resolvedDetails as any).overview_en || resolvedDetails.overview } : null);
        setSimilarShows(similarData || []);

        let finalSpinOffs = spinOffsData || [];
        if (finalSpinOffs.length === 0 && resolvedDetails?.name && Array.isArray(similarData) && similarData.length > 0) {
          finalSpinOffs = await getShowSpinOffs(showId, resolvedDetails.name, similarData, getShowDetailsLite);
        }
        setSpinOffs(finalSpinOffs);
        setSpinOffsLoading(false);

        if (platformRes.data) setPlatformLinks(platformRes.data);
        if (watchlistRes.data && watchlistRes.data.length > 0) setInWatchlist(true);

        if (resolvedDetails) {
          const firstSeason = resolvedDetails.seasons?.find((s: any) => s.season_number > 0)?.season_number || 1;
          setActiveSeason(firstSeason);
          setExpandedSeasons(new Set([firstSeason]));

          // Lazy load: On initial load, ONLY fetch Season 1 (or the first active season)
          const [initialSeasonData] = await Promise.all([
            getSeasonDetails(showId, firstSeason),
            fetchCredits(showId),
            currentUser ? refreshWatched(currentUser.id) : Promise.resolve(),
            currentUser ? fetchRatings(currentUser.id) : Promise.resolve()
          ]);

          const initialEpisodes = initialSeasonData?.episodes || [];
          setEpisodes(initialEpisodes);
          setAllSeasonsData({
            [firstSeason]: initialEpisodes
          });
        }

      } catch (error) {
        console.error("Error loading show:", error);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [showId]);

  useEffect(() => {
    if (activeTab === 'episodes' && episodes.length > 0) {
      setTimeout(scrollToActiveEpisode, 400);
    }
  }, [activeTab, episodes]);

  const handlePlatformClick = async (platform: string) => {
    supabase.from('outbound_clicks').insert({
      show_id: Number(showId),
      platform: platform
    } as any).then(() => { });

    if (platformLinks) {
      if (platform === 'filimo' && platformLinks.filimo_url) { window.open(platformLinks.filimo_url, '_blank'); return; }
      if (platform === 'namava' && platformLinks.namava_url) { window.open(platformLinks.namava_url, '_blank'); return; }
      if (platform === 'filmnet' && platformLinks.filmnet_url) { window.open(platformLinks.filmnet_url, '_blank'); return; }
    }

    const query = encodeURIComponent(show.name);
    let url = "";
    if (platform === 'filimo') url = `https://www.filimo.com/search/${query}`;
    if (platform === 'namava') url = `https://www.namava.ir/search?query=${query}`;
    if (platform === 'filmnet') url = `https://filmnet.ir/contents?query=${query}`;
    if (platform === 'google') url = `https://www.google.com/search?q=دانلود+سریال+${query}`;

    if (url) window.open(url, '_blank');
  };

  // On-demand lazy fetch when user switches season dropdown
  const handleSeasonChange = async (seasonNumber: number) => {
    setActiveSeason(seasonNumber);
    if (!allSeasonsData[seasonNumber]) {
      setSeasonLoading(prev => ({ ...prev, [seasonNumber]: true }));
      try {
        const seasonData = await getSeasonDetails(showId, seasonNumber);
        const epData = seasonData?.episodes || [];
        setAllSeasonsData((prev: any) => ({ ...prev, [seasonNumber]: epData }));
        setEpisodes(epData);
      } catch (err) {
        console.error(`Error lazy-loading season ${seasonNumber}:`, err);
      } finally {
        setSeasonLoading(prev => ({ ...prev, [seasonNumber]: false }));
      }
    } else {
      setEpisodes(allSeasonsData[seasonNumber]);
    }
  };

  // On-demand lazy fetch when user expands a season accordion
  const toggleAccordion = async (seasonNum: number) => {
    const newSet = new Set(expandedSeasons);
    if (newSet.has(seasonNum)) {
      newSet.delete(seasonNum);
    } else {
      newSet.add(seasonNum);
      if (!allSeasonsData[seasonNum]) {
        setSeasonLoading(prev => ({ ...prev, [seasonNum]: true }));
        try {
          const seasonData = await getSeasonDetails(showId, seasonNum);
          const epData = seasonData?.episodes || [];
          setAllSeasonsData((prev: any) => ({ ...prev, [seasonNum]: epData }));
        } catch (err) {
          console.error(`Error lazy-loading accordion season ${seasonNum}:`, err);
        } finally {
          setSeasonLoading(prev => ({ ...prev, [seasonNum]: false }));
        }
      }
    }
    setExpandedSeasons(newSet);
  };

  const toggleWatched = async (episodeId: number, forceSingle: boolean = false) => {
    if (!user) return;

    const isWatched = watchedEpisodes.includes(episodeId);

    if (isWatched || forceSingle) {
      let newWatchedList: number[];
      if (isWatched) {
        newWatchedList = watchedEpisodes.filter(id => id !== episodeId);
        setWatchedEpisodes(newWatchedList);
        await toggleWatchedEpisode(showId, episodeId, true);
      } else {
        newWatchedList = [...watchedEpisodes, episodeId];
        setWatchedEpisodes(newWatchedList);
        await toggleWatchedEpisode(showId, episodeId, false);

        const released = episodes.filter(ep => isReleased(ep.air_date)).map(e => e.id);
        if (released.every(id => newWatchedList.includes(id))) triggerCelebration();
      }
      return;
    }

    const currentIndex = episodes.findIndex(ep => ep.id === episodeId);
    if (currentIndex > 0) {
      const previousEpisodes = episodes.slice(0, currentIndex);
      const missingEpisodeIds = previousEpisodes
        .filter(ep => !watchedEpisodes.includes(ep.id) && isReleased(ep.air_date))
        .map(ep => ep.id);

      if (missingEpisodeIds.length > 0) {
        setGapEpisodesToMark(missingEpisodeIds);
        setTargetGapEpisode(episodeId);
        setShowGapModal(true);
        return;
      }
    }

    await toggleWatched(episodeId, true);
  };

  const handleGapConfirm = async () => {
    if (!user || !targetGapEpisode) return;

    const allIds = [...gapEpisodesToMark, targetGapEpisode];
    setShowGapModal(false);

    setWatchedEpisodes(prev => Array.from(new Set([...prev, ...allIds])));
    await toggleSeasonEpisodes(showId, allIds, 'mark');
    triggerCelebration();
  };

  const toggleSeasonWatched = async (seasonNum: number, seasonEpisodes: any[]) => {
    if (!user || seasonActionInFlight.current.has(seasonNum)) return;
    seasonActionInFlight.current.add(seasonNum);
    setSeasonLoading(prev => ({ ...prev, [seasonNum]: true }));

    const processSeason = async () => {
      try {
        let targetEpisodes = seasonEpisodes;
        if (!targetEpisodes) {
          const sData = await getSeasonDetails(showId, seasonNum);
          targetEpisodes = sData?.episodes || [];
          setAllSeasonsData((prev: any) => ({ ...prev, [seasonNum]: targetEpisodes }));
        }

        const seasonEpisodeIds = targetEpisodes
          .filter((ep: any) => isReleased(ep.air_date))
          .map((ep: any) => ep.id);
        if (seasonEpisodeIds.length === 0) return;

        const currentWatched = watchedEpisodesRef.current;
        const allWatched = seasonEpisodeIds.every((id: number) => currentWatched.includes(id));
        let newWatchedList: number[];

        if (allWatched) {
          newWatchedList = currentWatched.filter(id => !seasonEpisodeIds.includes(id));
          watchedEpisodesRef.current = newWatchedList;
          setWatchedEpisodes(newWatchedList);
          await toggleSeasonEpisodes(showId, seasonEpisodeIds, 'unmark');
        } else {
          newWatchedList = Array.from(new Set([...currentWatched, ...seasonEpisodeIds]));
          watchedEpisodesRef.current = newWatchedList;
          setWatchedEpisodes(newWatchedList);
          await toggleSeasonEpisodes(showId, seasonEpisodeIds, 'mark');
          triggerCelebration();
        }
      } catch (error) {
        console.error('Season watch update failed', error);
      } finally {
        seasonActionInFlight.current.delete(seasonNum);
        setSeasonLoading(prev => ({ ...prev, [seasonNum]: false }));
      }
    };

    seasonActionQueue.current = seasonActionQueue.current.then(processSeason, processSeason);
    await seasonActionQueue.current;
  };

  const handleMarkShowAsWatched = async () => {
    if (!user || !show) return;
    setWholeShowLoading(true);
    try {
      const seasonPromises = show.seasons.map((s: any) => getSeasonDetails(showId, s.season_number));
      const allSeasonsResults = await Promise.all(seasonPromises);
      const failedSeasonIndex = allSeasonsResults.findIndex((season: any, index: number) =>
        show.seasons[index]?.episode_count > 0 && !season
      );
      if (failedSeasonIndex !== -1) {
        throw new Error(`Season ${show.seasons[failedSeasonIndex].season_number} could not be loaded`);
      }

      const newSeasonsData = { ...allSeasonsData };
      allSeasonsResults.forEach((s: any) => {
        if (s?.season_number && s?.episodes) {
          newSeasonsData[s.season_number] = s.episodes;
        }
      });
      setAllSeasonsData(newSeasonsData);

      let allEpisodes: any[] = [];
      allSeasonsResults.forEach((s: any) => {
        if (s?.episodes) allEpisodes = [...allEpisodes, ...s.episodes];
      });

      const idsToMark = allEpisodes
        .filter(ep => isReleased(ep.air_date))
        .map(ep => ep.id);

      if (idsToMark.length === 0) {
        setWholeShowLoading(false);
        setShowConfirmAll(false);
        return;
      }

      setWatchedEpisodes(prev => Array.from(new Set([...prev, ...idsToMark])));
      await toggleSeasonEpisodes(showId, idsToMark, 'mark');
      triggerCelebration();

    } catch (err: any) {
      console.error("Bulk update failed", err);
    } finally {
      setWholeShowLoading(false);
      setShowConfirmAll(false);
    }
  };

  const toggleWatchlist = async () => {
    if (!user) return;
    setWatchlistLoading(true);
    const newStatus = !inWatchlist;
    setInWatchlist(newStatus);
    if (!newStatus) {
      await supabase.from('watchlist').delete().eq('user_id', user.id).eq('show_id', showId);
    } else {
      await supabase.from('watchlist').insert([{ user_id: user.id, show_id: Number(showId) }] as any);
    }
    setWatchlistLoading(false);
  };

  const handleRateShow = async (rating: number) => {
    if (!user) return;
    setMyRating(rating);
    await supabase.from('show_ratings').upsert({ user_id: user.id, show_id: Number(showId), rating: rating }, { onConflict: 'user_id, show_id' } as any);
    fetchRatings(user.id);
  };

  if (loading) return <SkeletonPage />;
  if (!show) return <div className="text-white text-center mt-28">سریال پیدا نشد!</div>;

  const totalReleasedEpisodes = getReleasedEpisodeCount(show) || 1;
  const clampedWatched = Math.min(watchedEpisodes.length, totalReleasedEpisodes);
  const progressPercent = Math.min(100, Math.round((clampedWatched / totalReleasedEpisodes) * 100)) || 0;
  const isShowCompleted = progressPercent === 100;

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] pb-32 md:pb-20">



      {selectedEp && (
        <EpisodeModal
          key={`${selectedEp.season_number ?? activeSeason}-${selectedEp.episode_number}`}
          showId={showId}
          seasonNum={selectedEp.season_number ?? activeSeason}
          episodeNum={selectedEp.episode_number}
          watchedEpisodeIds={watchedEpisodes} // 👈 ارسال لیست آماده برای سرعت برق‌آسا
          onClose={() => setSelectedEp(null)}
          onWatchedChange={() => user && refreshWatched(user.id)}
        />
      )}

      {showConfirmAll && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#1a1a1a] border border-[#ccff00]/30 w-full max-w-sm rounded-3xl p-6 text-center shadow-[0_0_50px_rgba(204,255,0,0.1)] relative">
            <div className="w-16 h-16 bg-[#ccff00]/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#ccff00]/20">
              <Check size={32} className="text-[#ccff00]" />
            </div>
            <h3 className="text-xl font-black text-white mb-2">مطمئنی همه‌شو دیدی؟</h3>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              این کار تمام فصل‌ها و اپیزودهای پخش‌شده‌ی <span className="text-[#ccff00] font-bold">{show.name}</span> رو به لیست دیده‌شده‌ها اضافه می‌کنه.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleMarkShowAsWatched}
                disabled={wholeShowLoading}
                className="flex-1 bg-[#ccff00] hover:bg-[#b3e600] text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {wholeShowLoading ? <Loader2 className="animate-spin" size={18} /> : 'آره، ثبت کن'}
              </button>
              <button onClick={() => setShowConfirmAll(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all border border-white/10 cursor-pointer">
                بی‌خیال
              </button>
            </div>
          </div>
        </div>
      )}

      {showGapModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#1a1a1a] border border-[#ccff00]/30 w-full max-w-sm rounded-3xl p-6 text-center shadow-[0_0_50px_rgba(204,255,0,0.1)] relative">
            <div className="w-16 h-16 bg-[#ccff00]/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#ccff00]/20">
              <Check size={32} className="text-[#ccff00]" />
            </div>
            <h3 className="text-xl font-black text-white mb-2">قبلی‌ها رو هم دیدی؟</h3>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              شما روی قسمت <span className="text-[#ccff00] font-bold">{episodes.find(e => e.id === targetGapEpisode)?.episode_number}</span> کلیک کردید، اما {gapEpisodesToMark.length} قسمت قبلی هنوز تیک نخورده. اون‌ها رو هم تیک بزنم؟
            </p>
            <div className="flex gap-3 flex-col">
              <button
                onClick={handleGapConfirm}
                className="w-full bg-[#ccff00] hover:bg-[#b3e600] text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                آره، همشو دیدم (ثبت {gapEpisodesToMark.length + 1} قسمت)
              </button>
              <button
                onClick={() => {
                  if (targetGapEpisode) toggleWatched(targetGapEpisode, true);
                  setShowGapModal(false);
                }}
                className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all border border-white/10 cursor-pointer"
              >
                نه، فقط همین قسمت رو تیک بزن
              </button>
              <button onClick={() => setShowGapModal(false)} className="text-xs text-gray-500 mt-2 hover:text-white cursor-pointer">
                کنسل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- HERO SECTION --- */}
      <div className="relative w-full min-h-[55vh] h-auto md:h-[75vh] flex flex-col justify-end">
        <div className="absolute inset-0">
          <img src={getBackdropUrl(show.backdrop_path)} className="w-full h-full object-cover opacity-60" alt={show.name} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-transparent"></div>
        </div>

        <div className="relative w-full p-4 sm:p-6 md:p-12 flex flex-col md:flex-row gap-6 md:gap-8 items-start md:items-end z-10 pt-20 pb-8 md:pb-16">
          <div className="flex-1 space-y-3 sm:space-y-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="bg-[#ccff00] text-black text-[11px] sm:text-xs font-black px-2.5 py-1 rounded uppercase">
                وضعیت: {getStatusText(show.status)}
              </span>
              {watchedEpisodes.length > 0 && (
                <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                  <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-[#ccff00]" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                  <span className="text-[10px] font-bold text-[#ccff00]">{progressPercent}٪ دیدی</span>
                </div>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-6xl font-black leading-tight text-white drop-shadow-2xl ltr text-right tracking-tighter">
              {showEn?.name || show.name}
            </h1>
            <h2 className="text-base sm:text-lg md:text-2xl text-gray-300 font-bold rtl text-right opacity-90">
              {show.name !== show.original_name ? show.name : ''}
            </h2>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 text-xs sm:text-sm text-gray-300 font-bold ltr">
              <button
                onClick={toggleWatchlist}
                disabled={watchlistLoading}
                className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold transition-all border cursor-pointer active:scale-95 text-xs sm:text-sm ${inWatchlist ? 'bg-[#ccff00] text-black border-[#ccff00]' : 'bg-white/20 text-white border-white/30 hover:bg-white/30'
                  }`}
              >
                {watchlistLoading ? <Loader2 className="animate-spin" size={16} /> : (inWatchlist ? <Check size={16} /> : <Plus size={16} />)}
                <span>{inWatchlist ? 'در لیست انتظار' : 'افزودن به لیست'}</span>
              </button>

              {progressPercent === 100 ? (
                <span className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl font-bold bg-green-500/20 text-green-400 border border-green-500/30 cursor-default select-none text-xs sm:text-sm">
                  <CheckCircle2 size={16} />
                  <span>کامل تماشا شده</span>
                </span>
              ) : (
                <button
                  onClick={() => setShowConfirmAll(true)}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all active:scale-95 text-xs sm:text-sm cursor-pointer"
                >
                  <CheckCircle2 size={16} className="text-gray-400" />
                  <span>کل سریال رو دیدم</span>
                </button>
              )}

              <button onClick={() => setShowShareModal(true)} className="flex items-center justify-center p-2.5 sm:px-4 sm:py-3 rounded-xl font-bold bg-white/10 hover:bg-white/20 text-[#ccff00] border border-white/10 transition-all active:scale-95 cursor-pointer">
                <Share2 size={16} />
              </button>

              <span className="flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded-full border border-white/10 text-xs">
                <Star size={13} fill="#ccff00" className="text-[#ccff00]" /> {show.vote_average ? show.vote_average.toFixed(1) : '-'}
              </span>
              <span className="text-xs">{show.first_air_date?.split('-')[0]}</span>
              <span className="text-xs">{show.number_of_seasons} فصل</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- TABS --- */}
      <div className="sticky top-20 md:top-24 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-6 sm:gap-8">
          <button
            onClick={() => setActiveTab('about')}
            className={`py-4 text-sm font-bold relative transition-colors cursor-pointer ${activeTab === 'about' ? 'text-[#ccff00]' : 'text-gray-400 hover:text-white'}`}
          >
            درباره سریال
            {activeTab === 'about' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#ccff00] rounded-t-full"></div>}
          </button>
          <button
            onClick={() => setActiveTab('episodes')}
            className={`py-4 text-sm font-bold relative transition-colors cursor-pointer ${activeTab === 'episodes' ? 'text-[#ccff00]' : 'text-gray-400 hover:text-white'}`}
          >
            اپیزودها
            {activeTab === 'episodes' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#ccff00] rounded-t-full"></div>}
          </button>
          <button
            onClick={() => setActiveTab('critics')}
            className={`py-4 text-sm font-bold relative transition-colors cursor-pointer flex items-center gap-1.5 ${activeTab === 'critics' ? 'text-amber-400' : 'text-gray-400 hover:text-white'}`}
          >
            <Feather size={15} className={activeTab === 'critics' ? 'text-amber-400' : 'text-gray-400'} />
            <span>نقد منتقدین</span>
            {activeTab === 'critics' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-yellow-300 rounded-t-full"></div>}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 mt-8 pb-20">

        {/* ================= TAB 1: ABOUT ================= */}
        {activeTab === 'about' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4">

            <div className="lg:col-span-2 space-y-8 order-1 lg:order-1">

              {/* خلاصه داستان */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                <h3 className="font-bold text-gray-200 mb-4 flex items-center gap-2">
                  <Info className="text-[#ccff00]" size={18} /> خلاصه داستان
                </h3>
                <p className={`text-gray-300 leading-relaxed text-sm md:text-base ${isPersianText(show.overview) ? 'text-justify dir-rtl' : 'text-left dir-ltr font-sans opacity-90'}`}>
                  {show.overview || showEn?.overview || "توضیحی برای این سریال ثبت نشده است."}
                </p>
              </div>

              {/* بازیگران */}
              <div>
                <h3 className="font-bold text-gray-200 mb-4">بازیگران</h3>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                  {cast.map((actor: any) => (
                    <div
                      key={actor.id}
                      onClick={() => router.push(`/dashboard/actor/${actor.id}`)}
                      className="flex flex-col items-center w-20 shrink-0 cursor-pointer group"
                    >
                      {actor.profile_path ? (
                        <img
                          src={getImageUrl(actor.profile_path, 'w185')}
                          className="w-16 h-16 rounded-full object-cover mb-2 border border-white/10 group-hover:border-[#ccff00] group-hover:scale-105 transition-all"
                          alt={actor.original_name}
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full mb-2 border border-white/10 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-gray-400 font-black text-sm tracking-wider group-hover:border-[#ccff00] transition-all">
                          {getInitials(actor.original_name)}
                        </div>
                      )}
                      <span className="text-[10px] font-bold text-center line-clamp-1">{actor.original_name}</span>
                      <span className="text-[9px] text-gray-500 text-center line-clamp-1">{actor.character}</span>
                    </div>
                  ))}
                  {cast.length === 0 && <span className="text-xs text-gray-500">لیست بازیگران ثبت نشده است.</span>}
                </div>
              </div>

              {/* بخش اسپین‌اف‌ها و آثار مرتبط */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <GitFork className="text-[#ccff00]" size={18} />
                    <span>اسپین‌اف‌ها و آثار مرتبط</span>
                  </h3>
                  {!spinOffsLoading && spinOffs.length > 0 && (
                    <span className="text-[10px] bg-[#ccff00]/10 text-[#ccff00] font-bold px-2.5 py-0.5 rounded-full border border-[#ccff00]/20">
                      {spinOffs.length} اثر مرتبط
                    </span>
                  )}
                </div>

                {spinOffsLoading ? (
                  <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="w-[125px] shrink-0 animate-pulse">
                        <div className="w-full aspect-[2/3] bg-white/5 rounded-xl mb-2"></div>
                        <div className="w-3/4 h-3 bg-white/5 rounded mx-auto mb-1"></div>
                        <div className="w-1/2 h-2 bg-white/5 rounded mx-auto"></div>
                      </div>
                    ))}
                  </div>
                ) : spinOffs.length > 0 ? (
                  <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                    {spinOffs.map((spin) => (
                      <Link
                        key={spin.id}
                        href={`/dashboard/tv/${spin.id}`}
                        className="group relative w-[130px] shrink-0 block focus:outline-none focus:ring-2 focus:ring-[#ccff00] rounded-xl transition-all"
                      >
                        <div className="relative rounded-xl overflow-hidden aspect-[2/3] bg-white/5 border border-white/10 group-hover:border-[#ccff00]/40 transition-colors shadow-md">
                          <img
                            src={getImageUrl(spin.poster_path || null)}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            alt={spin.name}
                            loading="lazy"
                          />
                          {/* برچسب رابطه */}
                          <div className="absolute top-2 right-2 z-10">
                            <span className="bg-black/80 backdrop-blur-md text-[9px] font-bold text-[#ccff00] px-2 py-0.5 rounded-md border border-[#ccff00]/30 shadow-sm">
                              {spin.relationLabel}
                            </span>
                          </div>
                          <WatchlistButton showId={spin.id} showName={spin.name} iconSize={11} className="p-1.5 top-1.5 left-1.5 z-10" />
                          <ShowCardProgress showId={spin.id} />
                        </div>
                        <h4 className="text-xs font-bold text-center mt-2.5 text-white group-hover:text-[#ccff00] transition-colors line-clamp-1">
                          {spin.faName || spin.name}
                        </h4>
                        {spin.faName && (
                          <p className="text-[10px] text-gray-500 text-center line-clamp-1 font-sans dir-ltr">
                            {spin.name}
                          </p>
                        )}
                        <div className="flex items-center justify-center gap-2 mt-1 text-[10px] text-gray-400">
                          {spin.vote_average ? (
                            <span className="flex items-center gap-0.5 text-yellow-400 font-bold">
                              <Star size={10} fill="currentColor" /> {spin.vote_average.toFixed(1)}
                            </span>
                          ) : null}
                          {spin.first_air_date && (
                            <span>{spin.first_air_date.split('-')[0]}</span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 px-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center flex flex-col items-center justify-center gap-1.5">
                    <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-gray-500 mb-1">
                      <GitFork size={16} className="opacity-50" />
                    </div>
                    <p className="text-gray-300 text-sm font-bold">
                      هنوز برای این سریال اسپین‌آفی تولید نشده است.
                    </p>
                    <p className="text-gray-500 text-[11px]">
                      در صورت ساخت یا معرفی اثر جدید از دنیای این سریال، در این بخش اضافه خواهد شد.
                    </p>
                  </div>
                )}
              </div>

              {/* سریال‌های مشابه */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                <h3 className="font-bold text-white mb-4">مشابه این سریال</h3>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                  {similarShows.map((sim) => (
                    <Link key={sim.id} href={`/dashboard/tv/${sim.id}`} className="group relative w-[120px] shrink-0 block focus:outline-none focus:ring-2 focus:ring-[#ccff00] rounded-xl">
                      <div className="relative rounded-lg overflow-hidden">
                        <img src={getImageUrl(sim.poster_path)} className="w-full rounded-lg shadow-md group-hover:scale-105 transition-transform" alt={sim.name} />
                        <WatchlistButton showId={sim.id} showName={sim.name} iconSize={11} className="p-1.5 top-1.5 left-1.5" />
                        <ShowCardProgress showId={sim.id} />
                      </div>
                      <h4 className="text-[10px] text-center mt-2 text-gray-400 line-clamp-1">{sim.name}</h4>
                    </Link>
                  ))}
                  {similarShows.length === 0 && <span className="text-xs text-gray-500">موردی یافت نشد.</span>}
                </div>
              </div>

            </div>

            {/* سایدبار اطلاعات، نقد و امتیازدهی */}
            <div className="space-y-6 order-2 lg:order-2">

              {/* تالار نقد منتقدین بینجر */}
              <div
                onClick={() => setActiveTab('critics')}
                className="bg-gradient-to-br from-amber-500/15 via-yellow-500/5 to-transparent border border-amber-500/30 hover:border-amber-400 rounded-3xl p-5 cursor-pointer transition-all hover:scale-[1.02] shadow-[0_0_25px_rgba(245,158,11,0.08)] group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Feather size={13} className="text-amber-400" />
                    <span>تالار نقد منتقدین</span>
                  </span>
                  <span className="text-[9px] bg-amber-400/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-400/30">
                    VIP Critics
                  </span>
                </div>
                <h4 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors">
                  نقد و ارزیابی منتقدین تاییدشده
                </h4>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                  مشاهده نظرات تحلیلی، امتیازدهی و نقد تخصصی منتقدین رسمی بینجر →
                </p>
              </div>

              {/* امتیازدهی */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                <h3 className="font-bold text-gray-200 mb-4 flex items-center gap-2">
                  <Star className="text-[#ccff00]" size={18} /> امتیازدهی
                </h3>

                <div className="mb-6">
                  <p className="text-xs text-gray-400 mb-2 font-bold">امتیاز شما:</p>
                  <div className="flex items-center justify-between" dir="ltr">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={24}
                          fill={star <= myRating ? "#ccff00" : "none"}
                          className={`cursor-pointer transition-all hover:scale-110 ${star <= myRating ? 'text-[#ccff00]' : 'text-gray-600 hover:text-gray-400'}`}
                          onClick={() => handleRateShow(star)}
                        />
                      ))}
                    </div>
                    <span className="text-xl font-black text-[#ccff00]">{myRating > 0 ? myRating : '-'}</span>
                  </div>
                </div>

                <div className="w-full h-px bg-white/10 mb-6"></div>

                <div>
                  <p className="text-xs text-gray-400 mb-2 font-bold flex items-center gap-2">
                    میانگین کاربران Binger <Users size={14} />
                  </p>
                  <div className="flex items-center gap-4" dir="ltr">
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-black text-white">{bingerStats.avg > 0 ? bingerStats.avg.toFixed(1) : '-'}</span>
                      <span className="text-sm text-gray-500 mb-1">/ 5</span>
                    </div>
                    <div className="text-[10px] bg-white/10 px-2 py-1 rounded text-gray-400">
                      {bingerStats.count} رای
                    </div>
                  </div>
                </div>
              </div>

              {/* کجا ببینیم؟ */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                <h3 className="font-bold text-gray-200 mb-6 flex items-center gap-2">
                  <Play className="text-[#ccff00]" size={18} /> کجا ببینیم؟
                </h3>
                <div className="flex gap-4 justify-center flex-wrap">
                  <button type="button" onClick={() => handlePlatformClick('filimo')} className="relative group focus:outline-none focus:ring-2 focus:ring-[#ccff00] rounded-2xl" aria-label="تماشا در فیلیمو">
                    <PlatformIcon name="فیلیمو" color={platformLinks?.filimo_url ? "bg-yellow-500 border-yellow-400" : "bg-gray-800 grayscale opacity-70 hover:grayscale-0 hover:opacity-100"} />
                    {platformLinks?.filimo_url && <span className="absolute -top-1 -right-1 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>}
                  </button>

                  <button type="button" onClick={() => handlePlatformClick('namava')} className="relative group focus:outline-none focus:ring-2 focus:ring-[#ccff00] rounded-2xl" aria-label="تماشا در نماوا">
                    <PlatformIcon name="نماوا" color={platformLinks?.namava_url ? "bg-blue-600 border-blue-400" : "bg-gray-800 grayscale opacity-70 hover:grayscale-0 hover:opacity-100"} />
                    {platformLinks?.namava_url && <span className="absolute -top-1 -right-1 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>}
                  </button>

                  <button type="button" onClick={() => handlePlatformClick('filmnet')} className="relative group focus:outline-none focus:ring-2 focus:ring-[#ccff00] rounded-2xl" aria-label="تماشا در فیلم‌نت">
                    <PlatformIcon name="فیلم‌نت" color={platformLinks?.filmnet_url ? "bg-black border-white/20" : "bg-gray-800 grayscale opacity-70 hover:grayscale-0 hover:opacity-100"} icon={<span className="text-[#e50914] font-black">FN</span>} />
                    {platformLinks?.filmnet_url && <span className="absolute -top-1 -right-1 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>}
                  </button>

                  <button type="button" onClick={() => handlePlatformClick('google')} className="relative group focus:outline-none focus:ring-2 focus:ring-[#ccff00] rounded-2xl" aria-label="جستجو در گوگل">
                    <PlatformIcon name="گوگل" color="bg-gray-700" icon={<Search size={20} />} />
                  </button>
                </div>
              </div>

              {/* سبک‌ها */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                <h3 className="font-bold text-gray-200 mb-6 flex items-center gap-2">
                  <Tag className="text-[#ccff00]" size={18} /> سبک
                </h3>
                <div className="flex flex-wrap gap-2">
                  {show.genres?.map((genre: any, idx: number) => (
                    <span key={genre.id} className={`px-3 py-1.5 rounded-lg font-bold text-[10px] text-white shadow-lg bg-gradient-to-r ${getGenreColor(idx)}`}>
                      {genre.name}
                    </span>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ================= TAB 2: EPISODES ================= */}
        {activeTab === 'episodes' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-12">

            {/* ادامه تماشا */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xl flex items-center gap-2">
                  <Play size={20} className="text-[#ccff00]" /> ادامه تماشا
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={scrollToActiveEpisode}
                    className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-[#ccff00] hover:border-[#ccff00] transition-all ml-2 cursor-pointer"
                    title="بازگشت به آخرین قسمت دیده شده"
                  >
                    <RotateCcw size={16} />
                  </button>
                  <div className="relative">
                    <select
                      value={activeSeason}
                      onChange={(e) => handleSeasonChange(Number(e.target.value))}
                      className="appearance-none bg-[#1a1a1a] border border-white/10 text-white text-xs font-bold py-1.5 pl-8 pr-3 rounded-lg cursor-pointer focus:outline-none focus:border-[#ccff00]"
                    >
                      {show.seasons?.slice().sort((a: any, b: any) => {
                        if (a.season_number === 0) return 1;
                        if (b.season_number === 0) return -1;
                        return a.season_number - b.season_number;
                      }).map((s: any) => (
                        <option key={s.id} value={s.season_number}>
                          {s.season_number === 0 ? "قسمت‌های ویژه" : `فصل ${s.season_number}`}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div ref={carouselRef} className="flex gap-4 overflow-x-auto pb-6 no-scrollbar snap-x px-1 items-center scroll-smooth">
                {episodes.map((ep: any) => {
                  const isWatched = watchedEpisodes.includes(ep.id);
                  return (
                    <div id={`ep-${ep.id}`} key={ep.id} className={`snap-start shrink-0 w-64 h-24 bg-[#1a1a1a] rounded-xl border flex items-center overflow-hidden transition-all group relative ${isWatched ? 'border-[#ccff00]/50' : 'border-white/10 hover:border-white/30'}`}>
                      <div className="w-24 h-full relative cursor-pointer bg-[#111]" onClick={() => setSelectedEp({ ...ep, season_number: ep.season_number ?? activeSeason })}>
                        {ep.still_path ? (
                          <img
                            src={getImageUrl(ep.still_path)}
                            className={`w-full h-full object-cover ${isWatched ? '' : 'grayscale opacity-60'}`}
                            loading="lazy"
                            alt={ep.name}
                          />
                        ) : (
                          <div className={`w-full h-full flex flex-col items-center justify-center ${isWatched ? 'bg-[#ccff00]/10' : 'bg-white/5'}`}>
                            <span className={`font-black text-[10px] tracking-widest ${isWatched ? 'text-[#ccff00]' : 'text-gray-600'}`}>بدون تصویر</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 px-3 flex flex-col justify-center cursor-pointer" onClick={() => setSelectedEp({ ...ep, season_number: ep.season_number ?? activeSeason })}>
                        <span className="text-[10px] text-gray-500 font-bold tracking-wider mb-1">E{ep.episode_number}</span>
                        <h4 className={`text-xs font-bold line-clamp-2 ${isWatched ? 'text-[#ccff00]' : 'text-gray-200'}`}>{ep.name}</h4>
                      </div>

                      {isReleased(ep.air_date) && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleWatched(ep.id); }}
                            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all active:scale-75 cursor-pointer ${isWatched ? 'bg-[#ccff00] border-[#ccff00]' : 'border-white/30 hover:border-white opacity-80 md:opacity-0 md:group-hover:opacity-100'}`}
                          >
                            {isWatched && <Check size={16} className="text-black" strokeWidth={3} />}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="snap-start shrink-0 w-48 h-24 bg-gradient-to-br from-gray-900 to-black rounded-xl border border-dashed border-white/20 flex flex-col items-center justify-center gap-2 text-center p-4">
                  {show.status === "Ended" && activeSeason === show.number_of_seasons ? (
                    <>
                      <div className="text-2xl animate-bounce">🥕</div>
                      <span className="text-xs font-bold text-[#ccff00]">تموم شد! خسته نباشید</span>
                    </>
                  ) : (
                    <>
                      <div className="text-2xl">⏳</div>
                      <span className="text-xs font-bold text-white">منتظر فصل بعد...</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* لیست کامل اپیزودها */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-xl">لیست کامل اپیزودها</h3>
              </div>

              <div className="space-y-4">
                {show.seasons?.slice().sort((a: any, b: any) => {
                  if (a.season_number === 0) return 1;
                  if (b.season_number === 0) return -1;
                  return a.season_number - b.season_number;
                }).map((season: any) => {
                  const isExpanded = expandedSeasons.has(season.season_number);
                  const isLoading = seasonLoading[season.season_number];
                  const loadedSeasonEpisodes = allSeasonsData[season.season_number] || [];

                  const releasedSeasonEpisodes = loadedSeasonEpisodes.filter((ep: any) => isReleased(ep.air_date));
                  const isFullyWatched = releasedSeasonEpisodes.length > 0 && releasedSeasonEpisodes.every((ep: any) => watchedEpisodes.includes(ep.id));

                  return (
                    <div key={season.id} className="border border-white/10 rounded-2xl overflow-hidden bg-[#111]">
                      <div
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                        onClick={() => toggleAccordion(season.season_number)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-14 bg-gray-800 rounded overflow-hidden">
                            {season.poster_path ? (
                              <img src={getImageUrl(season.poster_path)} className="w-full h-full object-cover" alt={season.name} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-white/10 text-[8px] text-gray-500">بدون تصویر</div>
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-white">
                              {season.season_number === 0 ? "پشت صحنه" : `فصل ${season.season_number}`}
                            </h4>
                            <span className="text-xs text-gray-500">{season.episode_count} قسمت</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-4">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleSeasonWatched(season.season_number, allSeasonsData[season.season_number]); }}
                            disabled={isLoading}
                            className={`text-xs font-bold border px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${isFullyWatched
                                ? 'bg-[#ccff00] text-black border-[#ccff00] shadow-[0_0_10px_rgba(204,255,0,0.2)]'
                                : 'text-gray-400 hover:text-[#ccff00] border-white/10 hover:border-[#ccff00]'
                              }`}
                          >
                            {isLoading ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : isFullyWatched ? (
                              <><Check size={14} strokeWidth={3} /> کامل دیدم</>
                            ) : (
                              <>
                                <span className="hidden sm:inline">شخم زدم (کل فصل)</span>
                                <span className="sm:hidden">ثبت فصل</span>
                              </>
                            )}
                          </button>
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-white/5 bg-black/20">
                          {isLoading ? (
                            <div className="py-8 flex flex-col items-center justify-center gap-2 text-gray-400">
                              <Loader2 className="animate-spin text-[#ccff00]" size={20} />
                              <span className="text-xs">در حال بارگذاری قسمت‌های این فصل...</span>
                            </div>
                          ) : allSeasonsData[season.season_number] ? (
                            allSeasonsData[season.season_number].map((ep: any) => {
                              const isWatched = watchedEpisodes.includes(ep.id);
                              return (
                                <div key={ep.id} className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-white/5 border-b border-white/5 last:border-0 group">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedEp({ ...ep, season_number: ep.season_number ?? season.season_number })}
                                    className="flex-1 flex items-center gap-3 sm:gap-4 text-right focus:outline-none focus:ring-1 focus:ring-[#ccff00] rounded-lg"
                                  >
                                    <div className="w-14 sm:w-16 h-9 sm:h-10 bg-gray-800 rounded overflow-hidden shrink-0">
                                      {ep.still_path ? (
                                        <img
                                          src={getImageUrl(ep.still_path)}
                                          className={`w-full h-full object-cover ${isWatched ? '' : 'grayscale'}`}
                                          loading="lazy"
                                          alt={ep.name}
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-white/5">
                                          <span className="text-[8px] font-black text-gray-600">NO IMG</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="w-6 sm:w-8 text-center text-xs sm:text-sm font-bold text-gray-500">{ep.episode_number}</div>
                                    <div className="flex-1 min-w-0">
                                      <h5 className={`text-xs sm:text-sm font-bold truncate ${isWatched ? 'text-[#ccff00]' : 'text-gray-200'}`}>{ep.name}</h5>
                                      <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
                                        <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-400">{ep.air_date}</span>
                                        <span className="text-[10px] text-gray-500">{ep.runtime}m</span>
                                      </div>
                                    </div>
                                  </button>
                                  <button
                                    type="button"
                                    aria-label="تغییر وضعیت تماشا"
                                    onClick={(e) => { e.stopPropagation(); toggleWatched(ep.id); }}
                                    className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all active:scale-90 cursor-pointer shrink-0 ${isWatched ? 'bg-[#ccff00] border-[#ccff00]' : 'border-white/30 hover:border-white opacity-80 md:opacity-0 md:group-hover:opacity-100'}`}
                                  >
                                    {isWatched && <Check size={16} className="text-black" />}
                                  </button>
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[#ccff00]" /></div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: CRITICS ================= */}
        {activeTab === 'critics' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <CriticReviewsSection
              showId={showId}
              showName={showEn?.name || show.name}
              user={user}
            />
          </div>
        )}

      </div>

      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-6 animate-in fade-in" onClick={() => setShowShareModal(false)}>
          <div className="bg-[#1a1a1a] border border-white/10 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="relative aspect-[9/16] bg-gray-900">
              <img src={getImageUrl(show.poster_path)} className="w-full h-full object-cover opacity-60" alt={show.name} />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
              <div className="absolute bottom-0 w-full p-8 flex flex-col items-center text-center">
                <img src={getImageUrl(show.poster_path)} className="w-24 h-24 rounded-full border-4 border-[#ccff00] mb-4 shadow-[0_0_20px_#ccff00]" alt={show.name} />
                <h3 className="text-2xl font-black text-white mb-2">{showEn?.name || show.name}</h3>
                <p className="text-[#ccff00] font-bold text-xs bg-[#ccff00]/10 px-4 py-1.5 rounded-full mb-6">مشاهده آنالیز و وضعیت تماشا در Binger 😎</p>
                <div className="grid grid-cols-2 gap-8 w-full border-t border-white/10 pt-4">
                  <div><span className="block text-xl font-black">{show.number_of_seasons}</span><span className="text-[9px] text-gray-500">SEASONS</span></div>
                  <div><span className="block text-xl font-black">{show.vote_average ? show.vote_average.toFixed(1) : '-'}</span><span className="text-[9px] text-gray-500">RATING</span></div>
                </div>
              </div>
            </div>
            <button onClick={() => setShowShareModal(false)} className="w-full bg-[#ccff00] text-black py-4 font-black text-sm hover:bg-[#b3e600] cursor-pointer">استوری کن</button>
          </div>
        </div>
      )}

    </div>
  );
}