"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Film, Star, Clock, Calendar, Globe, Heart, Bookmark,
  CheckCircle2, Share2, ArrowRight, MessageSquare,
  Sparkles, AlertTriangle, Send, Loader2, ChevronLeft,
  User, Check, Plus, Info, Feather, Award, Play, Tag,
  Search, Lock, Eye, X, Image as ImageIcon, Users
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  getImageUrl,
  getBackdropUrl,
  getRelatedMovies,
  getMovieDetails,
  getProfileUrl,
  type TMDBMovie
} from '@/lib/tmdbClient';
import { MovieCard } from '../../components/MovieCard';
import { useMovie } from '@/lib/movieContext';
import { createClient } from '@/lib/supabase';
import { VipUsername } from '../../components/VipBadge';
import GifPickerModal from '../../components/GifPickerModal';
import CommentRenderer from '../../components/CommentRenderer';
import { formatCommentWithGif } from '@/lib/klipyClient';

// Dynamic import for CriticReviewsSection with lazy loading fallback
const CriticReviewsSection = dynamic(
  () => import('@/app/dashboard/tv/[id]/CriticReviewsSection'),
  {
    loading: () => (
      <div className="py-16 flex flex-col items-center justify-center gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        <span className="text-xs font-bold">در حال بارگذاری نقد منتقدین...</span>
      </div>
    ),
    ssr: false,
  }
);

interface MovieDetailsClientProps {
  initialMovie: TMDBMovie | null;
  movieId: string;
}

interface MovieCommentItem {
  id: number;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    username?: string | null;
    avatar_url?: string | null;
    is_vip?: boolean | null;
  };
}

const REACTIONS = [
  { emoji: '🤯', label: 'شوکه شدم' },
  { emoji: '🔥', label: 'شاهکار' },
  { emoji: '😭', label: 'اشکم دراومد' },
  { emoji: '🤩', label: 'هیجان‌زده' },
  { emoji: '😴', label: 'خسته‌کننده' },
  { emoji: '💩', label: 'افتضاح' },
];

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

const isPersianText = (text?: string | null) => {
  if (!text) return true;
  return /[\u0600-\u06FF]/.test(text);
};

// Platform Icon Button
const PlatformIcon = ({ name, color, icon }: any) => (
  <div className="flex flex-col items-center gap-2 group cursor-pointer transition-all active:scale-95">
    <div className={`w-12 h-12 md:w-14 md:h-14 ${color} rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-105 group-hover:shadow-xl border border-white/5 relative overflow-hidden`}>
      {icon ? icon : <span className="font-black text-[10px] uppercase tracking-wider">{name.substring(0, 3)}</span>}
    </div>
    <span className="text-[9px] md:text-[10px] text-gray-400 font-medium group-hover:text-white transition-colors">{name}</span>
  </div>
);

export default function MovieDetailsClient({ initialMovie, movieId }: MovieDetailsClientProps) {
  const router = useRouter();
  const supabase = createClient() as any;
  const {
    isMovieWatched,
    isMovieInWatchlist,
    isMovieFavorite,
    toggleMovieWatched,
    toggleMovieWatchlist,
    toggleMovieFavorite,
  } = useMovie();

  const [movie, setMovie] = useState<TMDBMovie | null>(initialMovie);
  const [loadingMovie, setLoadingMovie] = useState<boolean>(!initialMovie);
  const [activeTab, setActiveTab] = useState<'about' | 'critics' | 'similar'>('about');
  const [relatedMovies, setRelatedMovies] = useState<TMDBMovie[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(true);
  const [synopsisLang, setSynopsisLang] = useState<'fa' | 'en'>('fa');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [watchedLoading, setWatchedLoading] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Ratings state
  const [myRating, setMyRating] = useState<number>(0);
  const [bingerStats, setBingerStats] = useState<{ avg: number; count: number }>({ avg: 0, count: 0 });

  // Reactions & Character Polls state
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [reactionVotes, setReactionVotes] = useState<Record<string, number>>({});
  const [totalReactionVotes, setTotalReactionVotes] = useState<number>(0);

  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);
  const [characterVotes, setCharacterVotes] = useState<Record<number, number>>({});
  const [totalCharacterVotes, setTotalCharacterVotes] = useState<number>(0);

  // Comments & Spoiler Shield state
  const [comments, setComments] = useState<MovieCommentItem[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showSpoilerModal, setShowSpoilerModal] = useState(false);
  const [forceUnlockedComments, setForceUnlockedComments] = useState(false);
  const [likedCommentIds, setLikedCommentIds] = useState<number[]>([]);
  const [commentLikeCounts, setCommentLikeCounts] = useState<Record<number, number>>({});

  // Klipy GIF Picker state
  const [isGifPickerOpen, setIsGifPickerOpen] = useState(false);
  const [selectedGif, setSelectedGif] = useState<{ url: string; previewUrl: string; title: string } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const isWatched = isMovieWatched(movieId);
  const inWatchlist = isMovieInWatchlist(movieId);
  const isFav = isMovieFavorite(movieId);

  // Confetti celebration trigger
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
      } catch {}
    }, 250);
  };

  // Initial data loading
  useEffect(() => {
    let isMounted = true;

    // 1. Current user
    supabase.auth.getUser().then(({ data: { user } }: any) => {
      if (isMounted) setCurrentUser(user);
      if (user) {
        fetchRatings(user.id);
        fetchUserReaction(user.id);
      }
    });

    // 2. Movie details if not loaded
    if (!initialMovie) {
      setLoadingMovie(true);
      getMovieDetails(movieId)
        .then((res) => {
          if (isMounted && res) {
            setMovie(res);
          }
        })
        .catch((err) => {
          console.warn('[MovieDetailsClient] Client fetch error:', err);
        })
        .finally(() => {
          if (isMounted) setLoadingMovie(false);
        });
    }

    // 3. Related movies
    getRelatedMovies(movieId)
      .then((related) => {
        if (isMounted) {
          setRelatedMovies(related || []);
          setLoadingRelated(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoadingRelated(false);
      });

    // 4. Comments & Community reactions
    loadComments();
    fetchLiveCommunityStats();

    return () => {
      isMounted = false;
    };
  }, [movieId, initialMovie]);

  // Load ratings
  const fetchRatings = async (userId: string) => {
    try {
      const [myR, allR] = await Promise.all([
        supabase.from('movie_ratings').select('rating').eq('user_id', userId).eq('movie_id', Number(movieId)).maybeSingle(),
        supabase.from('movie_ratings').select('rating').eq('movie_id', Number(movieId))
      ]);

      if (myR.data) setMyRating(myR.data.rating);
      if (allR.data && allR.data.length > 0) {
        const sum = allR.data.reduce((acc: number, curr: any) => acc + curr.rating, 0);
        setBingerStats({ avg: sum / allR.data.length, count: allR.data.length });
      }
    } catch {
      // Safe fallback if movie_ratings doesn't exist yet
    }
  };

  // Rate movie (1 to 5 stars)
  const handleRateMovie = async (rating: number) => {
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setMyRating(rating);
    try {
      await supabase.from('movie_ratings').upsert(
        { user_id: currentUser.id, movie_id: Number(movieId), rating },
        { onConflict: 'user_id, movie_id' }
      );
      showToast('امتیاز شما به فیلم با موفقیت ثبت شد ⭐');
      fetchRatings(currentUser.id);
    } catch {
      showToast('امتیاز ثبت شد.');
    }
  };

  // Load user reaction & character vote
  const fetchUserReaction = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('movie_reactions')
        .select('reaction, character_id')
        .eq('user_id', userId)
        .eq('movie_id', Number(movieId))
        .maybeSingle();

      if (data) {
        setSelectedReaction(data.reaction || null);
        setSelectedCharacterId(data.character_id ? Number(data.character_id) : null);
      }
    } catch {
      // Graceful fallback
    }
  };

  // Live community statistics for emoji reactions & character polls
  const fetchLiveCommunityStats = async () => {
    try {
      const { data: records } = await supabase
        .from('movie_reactions')
        .select('reaction, character_id')
        .eq('movie_id', Number(movieId));

      const rows = records || [];

      // Emoji stats
      const reactionRecords = rows.filter((r: any) => r.reaction);
      const totalR = reactionRecords.length;
      setTotalReactionVotes(totalR);

      if (totalR > 0) {
        const rCounts: Record<string, number> = {};
        reactionRecords.forEach((r: any) => {
          rCounts[r.reaction] = (rCounts[r.reaction] || 0) + 1;
        });

        const rPercentMap: Record<string, number> = {};
        REACTIONS.forEach((r) => {
          rPercentMap[r.emoji] = Math.round(((rCounts[r.emoji] || 0) / totalR) * 100);
        });
        setReactionVotes(rPercentMap);
      } else {
        setReactionVotes({});
      }

      // Character stats
      const characterRecords = rows.filter((r: any) => r.character_id);
      const totalC = characterRecords.length;
      setTotalCharacterVotes(totalC);

      if (totalC > 0) {
        const cCounts: Record<number, number> = {};
        characterRecords.forEach((r: any) => {
          const cId = Number(r.character_id);
          cCounts[cId] = (cCounts[cId] || 0) + 1;
        });

        const cPercentMap: Record<number, number> = {};
        const cast = movie?.credits?.cast?.slice(0, 8) || [];
        cast.forEach((actor) => {
          const count = cCounts[actor.id] || 0;
          cPercentMap[actor.id] = Math.round((count / totalC) * 100);
        });
        setCharacterVotes(cPercentMap);
      } else {
        setCharacterVotes({});
      }
    } catch {
      // Graceful fallback
    }
  };

  // Select emoji reaction
  const handleSelectReaction = async (emoji: string) => {
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setSelectedReaction(emoji);
    setReactionVotes((prev) => ({ ...prev, [emoji]: 100 }));
    setTotalReactionVotes((prev) => Math.max(prev, 1));

    try {
      const payload: any = {
        user_id: currentUser.id,
        movie_id: Number(movieId),
        reaction: emoji,
      };
      if (selectedCharacterId) {
        payload.character_id = selectedCharacterId;
      }
      await supabase.from('movie_reactions').upsert(payload, { onConflict: 'user_id, movie_id' });
      showToast(`حس شما ثبت شد: ${emoji}`);
      fetchLiveCommunityStats();
    } catch {
      showToast(`حس شما ثبت شد: ${emoji}`);
    }
  };

  // Vote for favorite character
  const handleVoteCharacter = async (actor: any) => {
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setSelectedCharacterId(actor.id);
    setCharacterVotes((prev) => ({ ...prev, [actor.id]: 100 }));
    setTotalCharacterVotes((prev) => Math.max(prev, 1));

    try {
      const payload: any = {
        user_id: currentUser.id,
        movie_id: Number(movieId),
        character_id: actor.id,
        character_name: actor.character || actor.name,
      };
      if (selectedReaction) {
        payload.reaction = selectedReaction;
      }
      await supabase.from('movie_reactions').upsert(payload, { onConflict: 'user_id, movie_id' });
      showToast(`رای شما برای ${actor.character || actor.name} ثبت شد! 🌟`);
      fetchLiveCommunityStats();
    } catch {
      showToast(`رای شما برای ${actor.character || actor.name} ثبت شد! 🌟`);
    }
  };

  // Load comments
  const loadComments = async () => {
    try {
      const { data: commentsData } = await supabase
        .from('movie_comments')
        .select('id, user_id, content, created_at')
        .eq('movie_id', Number(movieId))
        .order('created_at', { ascending: false });

      if (commentsData && commentsData.length > 0) {
        const userIds = Array.from(new Set(commentsData.map((c: any) => c.user_id)));
        const commentIds = commentsData.map((c: any) => c.id);

        const [profilesRes, likesRes] = await Promise.all([
          supabase.from('profiles').select('id, username, avatar_url, is_vip, role').in('id', userIds),
          supabase.from('movie_comment_likes').select('comment_id, user_id').in('comment_id', commentIds).catch(() => ({ data: [] }))
        ]);

        const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, {
          username: p.username,
          avatar_url: p.avatar_url,
          is_vip: p.is_vip === true || p.role === 'admin'
        }]));

        const likeCounts: Record<number, number> = {};
        const userLikedIds: number[] = [];
        (likesRes?.data || []).forEach((like: any) => {
          likeCounts[like.comment_id] = (likeCounts[like.comment_id] || 0) + 1;
          if (like.user_id === currentUser?.id) userLikedIds.push(like.comment_id);
        });
        setCommentLikeCounts(likeCounts);
        setLikedCommentIds(userLikedIds);

        setComments(commentsData.map((c: any) => ({
          ...c,
          user: profileMap.get(c.user_id) || { username: 'کاربر بینجر', avatar_url: '😎', is_vip: false }
        })));
      } else {
        setComments([]);
      }
    } catch (err) {
      console.warn('Error loading movie comments:', err);
    }
  };

  // Submit comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newComment.trim() && !selectedGif) || submittingComment) return;

    if (!currentUser) {
      router.push('/login');
      return;
    }

    try {
      setSubmittingComment(true);
      let contentToSave = newComment.trim();
      if (selectedGif) {
        contentToSave = formatCommentWithGif(contentToSave, selectedGif.url);
      }

      const { data, error } = await supabase
        .from('movie_comments')
        .insert({
          user_id: currentUser.id,
          movie_id: Number(movieId),
          content: contentToSave,
        })
        .select()
        .single();

      if (!error && data) {
        setNewComment('');
        setSelectedGif(null);
        showToast('دیدگاه شما با موفقیت ثبت شد ✨');
        loadComments();
      } else {
        showToast('خطا در ثبت نظر. لطفاً دوباره تلاش کنید.');
      }
    } catch {
      showToast('خطا در اتصال به سرور');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Toggle comment like
  const handleToggleCommentLike = async (commentId: number) => {
    if (!currentUser) return;
    const isLiked = likedCommentIds.includes(commentId);
    try {
      if (isLiked) {
        setLikedCommentIds((prev) => prev.filter((id) => id !== commentId));
        setCommentLikeCounts((prev) => ({ ...prev, [commentId]: Math.max(0, (prev[commentId] || 1) - 1) }));
        await supabase.from('movie_comment_likes').delete().eq('comment_id', commentId).eq('user_id', currentUser.id);
      } else {
        setLikedCommentIds((prev) => [...prev, commentId]);
        setCommentLikeCounts((prev) => ({ ...prev, [commentId]: (prev[commentId] || 0) + 1 }));
        await supabase.from('movie_comment_likes').insert({ comment_id: commentId, user_id: currentUser.id });
      }
    } catch {
      // Local optimistic update remains intact
    }
  };

  // Watch actions
  const handleToggleWatched = async () => {
    if (watchedLoading || !movie) return;
    setWatchedLoading(true);
    try {
      const willBeWatched = !isWatched;
      await toggleMovieWatched(movie.id, movie);
      if (willBeWatched) {
        triggerCelebration();
        showToast('تبریک! فیلم به عنوان دیده‌شده ثبت شد 🎉');
        setForceUnlockedComments(false);
      } else {
        showToast('فیلم از وضعیت دیده‌شده خارج شد.');
      }
    } finally {
      setWatchedLoading(false);
    }
  };

  const handleToggleWatchlist = async () => {
    if (watchlistLoading || !movie) return;
    setWatchlistLoading(true);
    try {
      const added = await toggleMovieWatchlist(movie.id, movie);
      showToast(added ? 'به لیست انتظار اضافه شد' : 'از لیست انتظار حذف شد');
    } finally {
      setWatchlistLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (favoriteLoading || !movie) return;
    setFavoriteLoading(true);
    try {
      const added = await toggleMovieFavorite(movie.id, movie);
      showToast(added ? 'به علاقه‌مندی‌ها اضافه شد ❤️' : 'از علاقه‌مندی‌ها حذف شد');
    } finally {
      setFavoriteLoading(false);
    }
  };

  // Option 1 from modal: Mark as watched and unlock everything
  const handleModalMarkWatched = async () => {
    setShowSpoilerModal(false);
    if (!isWatched && movie) {
      await handleToggleWatched();
    }
  };

  // Share handler
  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      showToast('لینک صفحه فیلم در کلیپ‌بورد کپی شد 📋');
    }
  };

  // Platform click handler
  const handlePlatformClick = (platform: 'filimo' | 'namava' | 'filmnet' | 'google') => {
    const movieTitle = movie?.title_fa || movie?.title || '';
    if (platform === 'filimo') {
      window.open(`https://www.filimo.com/search/${encodeURIComponent(movieTitle)}`, '_blank');
    } else if (platform === 'namava') {
      window.open(`https://www.namava.ir/search?q=${encodeURIComponent(movieTitle)}`, '_blank');
    } else if (platform === 'filmnet') {
      window.open(`https://filmnet.ir/search?q=${encodeURIComponent(movieTitle)}`, '_blank');
    } else {
      window.open(`https://www.google.com/search?q=تماشای+فیلم+${encodeURIComponent(movieTitle)}`, '_blank');
    }
  };

  // Loading Skeleton matching ShowDetailsClient
  if (loadingMovie && !movie) {
    return (
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
            <div className="w-24 h-12 flex items-center">
              <div className="w-16 h-4 bg-white/10 rounded"></div>
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
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-3">
                <div className="w-28 h-5 bg-white/15 rounded"></div>
                <div className="w-full h-4 bg-white/10 rounded"></div>
                <div className="w-5/6 h-4 bg-white/10 rounded"></div>
                <div className="w-2/3 h-4 bg-white/10 rounded"></div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 h-64"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4 text-center">
        <Film size={48} className="text-gray-600 mb-4 animate-pulse" />
        <h1 className="text-xl font-black text-white mb-2">اطلاعات فیلم یافت نشد</h1>
        <p className="text-xs text-gray-400 mb-6">احتمالاً فیلم مورد نظر در دسترس نیست یا ارتباط با سرور برقرار نشد.</p>
        <Link
          href="/dashboard/explore"
          className="px-5 py-2.5 rounded-xl bg-[#ccff00] text-black font-black text-xs hover:bg-[#b3e600] transition-all cursor-pointer shadow-lg"
        >
          بازگشت به اکسپلور
        </Link>
      </div>
    );
  }

  const titleFa = movie.title_fa || movie.title;
  const titleEn = movie.title_en || (movie.title !== movie.title_fa ? movie.title : movie.original_title);
  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : null;

  // Format runtime in Persian
  const hours = movie.runtime ? Math.floor(movie.runtime / 60) : 0;
  const minutes = movie.runtime ? movie.runtime % 60 : 0;
  const formattedRuntime = movie.runtime
    ? hours > 0
      ? `${hours} ساعت ${minutes > 0 ? `و ${minutes} دقیقه` : ''}`
      : `${minutes} دقیقه`
    : null;

  const castList = movie.credits?.cast?.slice(0, 10) || [];
  const directors = movie.credits?.crew?.filter((c) => c.job === 'Director') || [];
  const isCommentsUnlocked = isWatched || forceUnlockedComments;

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] pb-32 md:pb-20 relative selection:bg-[#ccff00] selection:text-black">

      {/* نوتیفیکیشن تست / اکشن */}
      {toastMessage && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#111] border border-[#ccff00]/50 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-2xl animate-in fade-in flex items-center gap-2">
          <Sparkles size={14} className="text-[#ccff00]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* پاپ‌آپ اخطار اسپویل نظرات (Spoiler Warning Modal with 3 Clear Options) */}
      {/* ========================================================================= */}
      {showSpoilerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#121215] border border-white/15 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 text-center relative animate-in zoom-in-95">
            <button
              onClick={() => setShowSpoilerModal(false)}
              className="absolute top-4 left-4 p-1.5 rounded-xl text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle size={32} />
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                شما هنوز این فیلم را ندیده‌اید!
              </h3>
              <p className="text-xs sm:text-sm text-gray-300 mt-2 leading-relaxed">
                خواندن نظرات کاربران ممکن است داستان، پایان‌بندی و اتفاقات غافلگیرکننده فیلم را برای شما لو دهد (اسپویل). چطور مایلید ادامه دهید؟
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              {/* گزینه ۱: فیلم رو دیدم */}
              <button
                onClick={handleModalMarkWatched}
                className="w-full py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm bg-[#ccff00] hover:bg-[#b3e600] text-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95"
              >
                <CheckCircle2 size={18} />
                <span>فیلم رو دیدم (ثبت تماشا و باز شدن کامل نظرات)</span>
              </button>

              {/* گزینه ۲: خواندن کامنت‌ها */}
              <button
                onClick={() => {
                  setForceUnlockedComments(true);
                  setShowSpoilerModal(false);
                  showToast('نظرات به صورت موقت برای این نشست باز شد 🔓');
                }}
                className="w-full py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Eye size={18} className="text-cyan-400" />
                <span>خواندن کامنت‌ها (حتی با ریسک اسپویل)</span>
              </button>

              {/* گزینه ۳: پشیمون شدم */}
              <button
                onClick={() => setShowSpoilerModal(false)}
                className="w-full py-3 px-4 rounded-2xl font-bold text-xs text-gray-400 hover:text-white bg-transparent hover:bg-white/5 transition-all cursor-pointer"
              >
                پشیمون شدم (بستن و عدم نمایش)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HERO SECTION (كاملاً منطبق بر ساختار شیک و سینمایی ShowDetailsClient) */}
      {/* ========================================================================= */}
      <div className="relative w-full min-h-[55vh] h-auto md:h-[75vh] flex flex-col justify-end">
        <div className="absolute inset-0">
          <img
            src={getBackdropUrl(movie.backdrop_path || null)}
            className="w-full h-full object-cover opacity-60"
            alt={titleFa}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-transparent"></div>
        </div>

        {/* دکمه بازگشت */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={() => router.back()}
            className="px-3.5 py-2 rounded-xl bg-black/60 hover:bg-black/90 backdrop-blur-md border border-white/10 hover:border-[#ccff00]/40 text-xs font-bold text-gray-300 hover:text-white flex items-center gap-1.5 transition-all shadow-lg cursor-pointer active:scale-95"
          >
            <ArrowRight size={14} />
            <span>بازگشت</span>
          </button>
        </div>

        {/* محتوای هدر هیرو */}
        <div className="relative w-full p-4 sm:p-6 md:p-12 flex flex-col md:flex-row gap-6 md:gap-8 items-start md:items-end z-10 pt-20 pb-8 md:pb-16 max-w-7xl mx-auto">
          {/* پوستر گوشه چپ در دسکتاپ */}
          <div className="relative w-36 sm:w-44 md:w-52 aspect-[2/3] shrink-0 rounded-2xl overflow-hidden border border-white/15 bg-white/5 shadow-2xl hidden sm:block">
            <img
              src={getImageUrl(movie.poster_path, 'w500')}
              alt={titleFa}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md border border-white/15 text-[10px] font-black text-amber-300 flex items-center gap-1 shadow-md">
              <Film size={11} className="shrink-0" />
              <span>سینمایی</span>
            </div>
            {isWatched && (
              <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-emerald-500 text-black text-[10px] font-black shadow-[0_0_12px_rgba(16,185,129,0.5)]">
                دیده‌شده
              </div>
            )}
          </div>

          <div className="flex-1 space-y-3 sm:space-y-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="bg-[#ccff00] text-black text-[11px] sm:text-xs font-black px-2.5 py-1 rounded uppercase">
                سینمایی
              </span>
              {isWatched && (
                <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-bold">
                  <CheckCircle2 size={13} />
                  <span>این فیلم را تماشا کرده‌اید</span>
                </div>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-6xl font-black leading-tight text-white drop-shadow-2xl ltr text-right tracking-tighter">
              {titleEn}
            </h1>
            <h2 className="text-base sm:text-lg md:text-2xl text-gray-300 font-bold rtl text-right opacity-90">
              {titleFa !== titleEn ? titleFa : ''}
            </h2>

            {/* نوار اکشن‌ها و مشخصات */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 text-xs sm:text-sm text-gray-300 font-bold ltr">
              {/* دکمه لیست انتظار */}
              <button
                onClick={handleToggleWatchlist}
                disabled={watchlistLoading}
                className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold transition-all border cursor-pointer active:scale-95 text-xs sm:text-sm ${
                  inWatchlist
                    ? 'bg-[#ccff00] text-black border-[#ccff00]'
                    : 'bg-white/20 text-white border-white/30 hover:bg-white/30'
                }`}
              >
                {watchlistLoading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : inWatchlist ? (
                  <Check size={16} />
                ) : (
                  <Plus size={16} />
                )}
                <span>{inWatchlist ? 'در لیست انتظار' : 'افزودن به لیست'}</span>
              </button>

              {/* دکمه فیلم رو دیدم */}
              {isWatched ? (
                <button
                  onClick={handleToggleWatched}
                  disabled={watchedLoading}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl font-bold bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 transition-all active:scale-95 text-xs sm:text-sm cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  <span>دیده‌شده (حذف)</span>
                </button>
              ) : (
                <button
                  onClick={handleToggleWatched}
                  disabled={watchedLoading}
                  className="flex items-center gap-1.5 px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-xl font-black bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all active:scale-95 text-xs sm:text-sm cursor-pointer shadow-md"
                >
                  <CheckCircle2 size={16} className="text-[#ccff00]" />
                  <span>فیلم رو دیدم</span>
                </button>
              )}

              {/* دکمه علاقه‌مندی */}
              <button
                onClick={handleToggleFavorite}
                disabled={favoriteLoading}
                className={`flex items-center justify-center p-2.5 sm:px-3.5 sm:py-3 rounded-xl border transition-all active:scale-95 cursor-pointer ${
                  isFav
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                    : 'bg-white/10 hover:bg-white/20 text-gray-300 hover:text-rose-400 border-white/10'
                }`}
                title="علاقه‌مندی"
              >
                <Heart size={16} fill={isFav ? 'currentColor' : 'none'} />
              </button>

              {/* دکمه اشتراک‌گذاری */}
              <button
                onClick={handleShare}
                className="flex items-center justify-center p-2.5 sm:px-4 sm:py-3 rounded-xl font-bold bg-white/10 hover:bg-white/20 text-[#ccff00] border border-white/10 transition-all active:scale-95 cursor-pointer"
                title="اشتراک‌گذاری"
              >
                <Share2 size={16} />
              </button>

              {/* امتیاز TMDB */}
              <span className="flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded-full border border-white/10 text-xs">
                <Star size={13} fill="#ccff00" className="text-[#ccff00]" /> {rating || '-'}
              </span>

              {/* سال انتشار */}
              {releaseYear && <span className="text-xs font-mono">{releaseYear}</span>}

              {/* زمان فیلم */}
              {formattedRuntime && (
                <span className="text-xs font-bold text-gray-300 flex items-center gap-1">
                  <Clock size={12} className="text-[#ccff00]" />
                  <span>{formattedRuntime}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TABS HEADER (عیناً منطبق بر ShowDetailsClient بدون تب اپیزود) */}
      {/* ========================================================================= */}
      <div className="sticky top-16 md:top-20 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-6 sm:gap-8">
          <button
            onClick={() => setActiveTab('about')}
            className={`py-4 text-sm font-bold relative transition-colors cursor-pointer ${
              activeTab === 'about' ? 'text-[#ccff00]' : 'text-gray-400 hover:text-white'
            }`}
          >
            درباره فیلم
            {activeTab === 'about' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#ccff00] rounded-t-full"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab('critics')}
            className={`py-4 text-sm font-bold relative transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'critics' ? 'text-amber-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Feather size={15} className={activeTab === 'critics' ? 'text-amber-400' : 'text-gray-400'} />
            <span>نقد منتقدین</span>
            {activeTab === 'critics' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-yellow-300 rounded-t-full"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab('similar')}
            className={`py-4 text-sm font-bold relative transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'similar' ? 'text-[#ccff00]' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles size={15} className={activeTab === 'similar' ? 'text-[#ccff00]' : 'text-gray-400'} />
            <span>فیلم‌های مشابه و مرتبط</span>
            {activeTab === 'similar' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#ccff00] rounded-t-full"></div>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN CONTAINER */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 mt-8 pb-20">

        {/* ======================================================================= */}
        {/* TAB 1: درباره فیلم (ABOUT) */}
        {/* ======================================================================= */}
        {activeTab === 'about' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4">

            {/* ستون اصلی چپ (محتوا، بازیگران، ری‌اکشن‌ها و کامنت‌ها) */}
            <div className="lg:col-span-2 space-y-8 order-1 lg:order-1">

              {/* خلاصه داستان */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-200 flex items-center gap-2">
                    <Info className="text-[#ccff00]" size={18} /> خلاصه داستان
                  </h3>
                  {movie.overview_en && movie.overview_fa && (
                    <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-xl border border-white/10 text-[11px] font-bold">
                      <button
                        onClick={() => setSynopsisLang('fa')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          synopsisLang === 'fa' ? 'bg-[#ccff00] text-black font-black' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        فارسی
                      </button>
                      <button
                        onClick={() => setSynopsisLang('en')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          synopsisLang === 'en' ? 'bg-[#ccff00] text-black font-black' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        English
                      </button>
                    </div>
                  )}
                </div>

                <p className={`text-gray-300 leading-relaxed text-sm md:text-base ${
                  synopsisLang === 'en'
                    ? 'text-left dir-ltr font-sans opacity-90'
                    : isPersianText(movie.overview) ? 'text-justify dir-rtl' : 'text-left dir-ltr font-sans opacity-90'
                }`}>
                  {synopsisLang === 'en'
                    ? (movie.overview_en || movie.overview || 'No synopsis available in English.')
                    : (movie.overview_fa || movie.overview || 'توضیحی برای این فیلم ثبت نشده است.')
                  }
                </p>
              </div>

              {/* بازیگران اصلی */}
              <div>
                <h3 className="font-bold text-gray-200 mb-4 flex items-center gap-2">
                  <User size={18} className="text-amber-400" /> بازیگران اصلی
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                  {castList.map((actor: any) => (
                    <div
                      key={actor.id}
                      onClick={() => router.push(`/dashboard/actor/${actor.id}`)}
                      className="flex flex-col items-center w-20 shrink-0 cursor-pointer group"
                    >
                      {actor.profile_path ? (
                        <img
                          src={getImageUrl(actor.profile_path, 'w185')}
                          className="w-16 h-16 rounded-full object-cover mb-2 border border-white/10 group-hover:border-[#ccff00] group-hover:scale-105 transition-all"
                          alt={actor.name}
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full mb-2 border border-white/10 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-gray-400 font-black text-sm tracking-wider group-hover:border-[#ccff00] transition-all">
                          {getInitials(actor.name)}
                        </div>
                      )}
                      <span className="text-[10px] font-bold text-center line-clamp-1 group-hover:text-[#ccff00] transition-colors">
                        {actor.name}
                      </span>
                      <span className="text-[9px] text-gray-500 text-center line-clamp-1">
                        {actor.character}
                      </span>
                    </div>
                  ))}
                  {castList.length === 0 && (
                    <span className="text-xs text-gray-500">لیست بازیگران ثبت نشده است.</span>
                  )}
                </div>
              </div>

              {/* =================================================================== */}
              {/* بخش واکنش‌ها و نظرسنجی کاراکترها (REACTIONS & POLLS) */}
              {/* =================================================================== */}
              <div className="space-y-6">
                {!isWatched ? (
                  /* کارت قفل قبل از تماشای فیلم */
                  <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 text-center overflow-hidden">
                    <div className="flex flex-col items-center justify-center p-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-amber-400 mb-3 shadow-inner">
                        <Lock size={22} />
                      </div>
                      <h4 className="text-sm sm:text-base font-black text-white mb-1.5">
                        برای باز شدن ری‌اکشن‌ها و نظرسنجی بهترین کاراکتر، فیلم را تماشا کنید
                      </h4>
                      <p className="text-xs text-gray-400 max-w-md mb-4 leading-relaxed">
                        جهت جلوگیری از لو رفتن جذابیت فیلم، سیستم ثبت حس و نظرسنجی محبوب‌ترین کاراکتر پس از زدن دکمه «فیلم رو دیدم» در دسترس قرار می‌گیرد.
                      </p>
                      <button
                        onClick={handleToggleWatched}
                        className="px-5 py-2.5 rounded-xl bg-[#ccff00] text-black font-black text-xs hover:bg-[#b3e600] transition-all flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95"
                      >
                        <CheckCircle2 size={16} />
                        <span>همین حالا دیدم ✅</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* سیستم ری‌اکشن‌های زنده و نظرسنجی پس از تماشا */
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">

                    {/* ۱. ری‌اکشن حسی به فیلم با درصد زنده */}
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-5 sm:p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-black text-white block">
                            حس شما بعد از دیدن این فیلم چی بود؟
                          </span>
                          <span className="text-[11px] text-gray-400">
                            واکنش حسی خود را با بقیه مخاطبان بینجر به اشتراک بگذارید
                          </span>
                        </div>
                        {totalReactionVotes > 0 && (
                          <span className="text-[11px] text-gray-400 font-mono font-bold">
                            {totalReactionVotes} رای ثبت شده
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-2.5">
                        {REACTIONS.map((r) => {
                          const isSelected = selectedReaction === r.emoji;
                          const votePercent = reactionVotes[r.emoji] || 0;

                          return (
                            <button
                              key={r.emoji}
                              onClick={() => handleSelectReaction(r.emoji)}
                              className={`relative p-2.5 sm:p-3 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer overflow-hidden ${
                                isSelected
                                  ? 'bg-[#ccff00]/15 border-[#ccff00] scale-105 shadow-[0_0_15px_rgba(204,255,0,0.2)]'
                                  : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/15'
                              }`}
                            >
                              {selectedReaction && totalReactionVotes > 0 && (
                                <div
                                  className="absolute bottom-0 left-0 right-0 h-1 bg-[#ccff00] transition-all duration-700"
                                  style={{ width: `${votePercent}%` }}
                                />
                              )}

                              <span className="text-2xl sm:text-3xl">{r.emoji}</span>
                              <span className="text-[10px] text-gray-300 font-bold truncate max-w-full">
                                {r.label}
                              </span>

                              {selectedReaction && totalReactionVotes > 0 && (
                                <span className="text-[10px] font-black text-[#ccff00] font-mono mt-0.5">
                                  {votePercent}٪
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* ۲. نظرسنجی بهترین کاراکتر فیلم */}
                    {castList.length > 0 && (
                      <div className="bg-white/5 border border-white/10 rounded-3xl p-5 sm:p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                            <Award size={18} className="text-amber-400" />
                            <span>شخصیت یا بازیگر مورد علاقه شما در این اثر کی بود؟</span>
                          </h4>
                          {totalCharacterVotes > 0 && (
                            <span className="text-[11px] text-gray-400 font-mono font-bold">
                              {totalCharacterVotes} رای ثبت شده
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                          {castList.slice(0, 8).map((actor) => {
                            const isSelected = selectedCharacterId === actor.id;
                            const votePercent = characterVotes[actor.id] || 0;

                            return (
                              <div
                                key={actor.id}
                                onClick={() => handleVoteCharacter(actor)}
                                className={`relative rounded-2xl p-3 border transition-all cursor-pointer overflow-hidden flex flex-col items-center text-center group ${
                                  isSelected
                                    ? 'bg-[#ccff00]/10 border-[#ccff00] shadow-[0_0_15px_rgba(204,255,0,0.25)]'
                                    : 'bg-white/5 border-white/5 hover:border-white/20'
                                }`}
                              >
                                {totalCharacterVotes > 0 && (
                                  <div
                                    className="absolute bottom-0 left-0 right-0 h-1 bg-[#ccff00] transition-all duration-700"
                                    style={{ width: `${votePercent}%` }}
                                  />
                                )}

                                <div className="w-14 h-14 rounded-full overflow-hidden mb-2 border-2 border-white/10 group-hover:border-[#ccff00]/60 transition-colors bg-black shrink-0">
                                  {actor.profile_path ? (
                                    <img
                                      src={getImageUrl(actor.profile_path, 'w185')}
                                      className="w-full h-full object-cover"
                                      alt={actor.name}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs font-bold">
                                      👤
                                    </div>
                                  )}
                                </div>

                                <h5 className="text-xs font-bold text-white line-clamp-1 group-hover:text-[#ccff00] transition-colors">
                                  {actor.character || actor.name}
                                </h5>
                                <span className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">
                                  {actor.name}
                                </span>

                                {totalCharacterVotes > 0 && (
                                  <span className="mt-1.5 text-[11px] font-black text-[#ccff00] font-mono">
                                    {votePercent}٪ آرا
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>

              {/* =================================================================== */}
              {/* بخش کامنت‌ها و نظرات کاربران (COMMENTS SECTION) */}
              {/* =================================================================== */}
              <div className="space-y-6 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <MessageSquare size={18} className="text-emerald-400" />
                    <span>دیدگاه و تحلیل مخاطبان بینجر</span>
                  </h3>
                  <span className="text-xs text-gray-400 font-mono">{comments.length} نظر</span>
                </div>

                {/* وضعیت قفل بودن نظرات (اسپویل شیلد) */}
                {!isCommentsUnlocked ? (
                  <div
                    onClick={() => setShowSpoilerModal(true)}
                    className="relative rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.08] via-white/[0.02] to-transparent p-7 sm:p-9 text-center cursor-pointer group hover:border-amber-400/50 transition-all shadow-xl"
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner group-hover:scale-110 transition-transform">
                        <Lock size={26} />
                      </div>
                      <h4 className="text-base sm:text-lg font-black text-white">
                        تالار نظرات این فیلم قفل است (خطر اسپویل)
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-400 max-w-md leading-relaxed">
                        جهت جلوگیری از لو رفتن داستان، نظرات کاربران مخفی شده است. برای مشاهده نظرات یا ثبت نظر جدید، کلیک کنید.
                      </p>
                      <button
                        type="button"
                        className="mt-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs transition-all shadow-lg cursor-pointer"
                      >
                        مشاهده نظرات و باز کردن قفل اسپویل 🔓
                      </button>
                    </div>
                  </div>
                ) : (
                  /* تالار باز نظرات */
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-4">

                    {/* فرم ارسال نظر */}
                    <form onSubmit={handleAddComment} className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-3.5">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder={currentUser ? "نظر، حس و تحلیل خود درباره این اثر سینمایی را بنویسید..." : "جهت ثبت نظر ابتدا وارد حساب خود شوید"}
                        rows={3}
                        disabled={!currentUser || submittingComment}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-3.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#ccff00] resize-none transition-colors"
                      />

                      {/* پیش‌نمایش گیف Klipy انتخاب‌شده */}
                      {selectedGif && (
                        <div className="relative inline-flex items-center gap-2 p-1.5 pr-2.5 bg-black/60 border border-[#ccff00]/40 rounded-xl animate-in fade-in">
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black">
                            <img src={selectedGif.previewUrl || selectedGif.url} alt="GIF Preview" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex flex-col min-w-0 pr-1">
                            <span className="text-[11px] font-bold text-white flex items-center gap-1">
                              <Sparkles size={11} className="text-[#ccff00]" />
                              <span>گیف پیوست شد</span>
                            </span>
                            <span className="text-[10px] text-gray-400 truncate max-w-[140px] sm:max-w-[200px]">
                              {selectedGif.title || 'Klipy GIF'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedGif(null)}
                            className="p-1 text-gray-400 hover:text-red-400 rounded-lg hover:bg-white/10 transition-colors mr-2 cursor-pointer"
                            title="حذف گیف"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsGifPickerOpen(true)}
                            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl transition-all cursor-pointer border ${
                              selectedGif
                                ? 'bg-[#ccff00]/15 text-[#ccff00] border-[#ccff00]/40 shadow-sm'
                                : 'text-gray-300 hover:text-[#ccff00] bg-white/5 hover:bg-white/10 border-white/10'
                            }`}
                            title="افزودن گیف از Klipy"
                          >
                            <ImageIcon size={14} className={selectedGif ? 'text-[#ccff00]' : 'text-gray-400'} />
                            <span className="font-bold">GIF</span>
                          </button>
                          <span className="text-[10px] text-gray-500 hidden sm:inline">نقد محترمانه و تحلیل سینمایی</span>
                        </div>

                        <button
                          type="submit"
                          disabled={!currentUser || (!newComment.trim() && !selectedGif) || submittingComment}
                          className="bg-[#ccff00] hover:bg-[#b3e600] disabled:opacity-40 text-black font-black text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                        >
                          {submittingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                          <span>ارسال دیدگاه</span>
                        </button>
                      </div>
                    </form>

                    {/* لیست نظرات ثبت‌شده */}
                    {comments.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 text-xs rounded-2xl bg-white/[0.02] border border-white/5">
                        هنوز نظری برای این فیلم ثبت نشده است. اولین نفری باشید که دیدگاه خود را می‌نویسد!
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm">
                                  {comment.user?.avatar_url || '😎'}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <VipUsername
                                    username={comment.user?.username || 'کاربر بینجر'}
                                    isVip={comment.user?.is_vip === true}
                                    className="text-xs font-bold"
                                  />
                                  {comment.user_id === currentUser?.id && (
                                    <span className="text-[9px] bg-[#ccff00] text-black px-1.5 py-0.2 rounded font-black">
                                      شما
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-gray-500 font-mono">
                                  {new Date(comment.created_at).toLocaleDateString('fa-IR')}
                                </span>
                                <button
                                  onClick={() => handleToggleCommentLike(comment.id)}
                                  className={`text-xs flex items-center gap-1 transition-colors cursor-pointer px-2 py-1 rounded-lg ${
                                    likedCommentIds.includes(comment.id)
                                      ? 'text-red-400 bg-red-500/10'
                                      : 'text-gray-400 hover:text-red-400 hover:bg-white/5'
                                  }`}
                                  title="پسندیدن نظر"
                                >
                                  <Heart
                                    size={13}
                                    fill={likedCommentIds.includes(comment.id) ? 'currentColor' : 'none'}
                                  />
                                  <span>{commentLikeCounts[comment.id] || 0}</span>
                                </button>
                              </div>
                            </div>

                            <div className="pr-10">
                              <CommentRenderer content={comment.content} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                )}
              </div>

            </div>

            {/* سایدبار اطلاعات، نقد و پلتفرم‌ها (سایدبار راست) */}
            <div className="space-y-6 order-2 lg:order-2">

              {/* تالار نقد منتقدین بینجر (کارت دسترسی سریع به تب منتقدین) */}
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
                  مشاهده دیدگاه‌های تحلیلی، امتیازدهی و نقد تخصصی منتقدین رسمی بینجر →
                </p>
              </div>

              {/* بخش امتیازدهی شما و میانگین کاربران */}
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
                          fill={star <= myRating ? '#ccff00' : 'none'}
                          className={`cursor-pointer transition-all hover:scale-110 ${
                            star <= myRating ? 'text-[#ccff00]' : 'text-gray-600 hover:text-gray-400'
                          }`}
                          onClick={() => handleRateMovie(star)}
                        />
                      ))}
                    </div>
                    <span className="text-xl font-black text-[#ccff00]">
                      {myRating > 0 ? myRating : '-'}
                    </span>
                  </div>
                </div>

                <div className="w-full h-px bg-white/10 mb-6"></div>

                <div>
                  <p className="text-xs text-gray-400 mb-2 font-bold flex items-center gap-2">
                    میانگین کاربران Binger <Users size={14} />
                  </p>
                  <div className="flex items-center gap-4" dir="ltr">
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-black text-white">
                        {bingerStats.avg > 0 ? bingerStats.avg.toFixed(1) : (rating ? rating : '-')}
                      </span>
                      <span className="text-sm text-gray-500 mb-1">/ 5</span>
                    </div>
                    <div className="text-[10px] bg-white/10 px-2 py-1 rounded text-gray-400">
                      {bingerStats.count > 0 ? `${bingerStats.count} رای` : 'TMDB Rating'}
                    </div>
                  </div>
                </div>
              </div>

              {/* کجا ببینیم؟ (پلتفرم‌های پخش) */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                <h3 className="font-bold text-gray-200 mb-6 flex items-center gap-2">
                  <Play className="text-[#ccff00]" size={18} /> کجا ببینیم؟
                </h3>
                <div className="flex gap-4 justify-center flex-wrap">
                  <button
                    type="button"
                    onClick={() => handlePlatformClick('filimo')}
                    className="relative group focus:outline-none focus:ring-2 focus:ring-[#ccff00] rounded-2xl"
                    aria-label="تماشا در فیلیمو"
                  >
                    <PlatformIcon name="فیلیمو" color="bg-yellow-500 border-yellow-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePlatformClick('namava')}
                    className="relative group focus:outline-none focus:ring-2 focus:ring-[#ccff00] rounded-2xl"
                    aria-label="تماشا در نماوا"
                  >
                    <PlatformIcon name="نماوا" color="bg-blue-600 border-blue-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePlatformClick('filmnet')}
                    className="relative group focus:outline-none focus:ring-2 focus:ring-[#ccff00] rounded-2xl"
                    aria-label="تماشا در فیلم‌نت"
                  >
                    <PlatformIcon
                      name="فیلم‌نت"
                      color="bg-black border-white/20"
                      icon={<span className="text-[#e50914] font-black">FN</span>}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePlatformClick('google')}
                    className="relative group focus:outline-none focus:ring-2 focus:ring-[#ccff00] rounded-2xl"
                    aria-label="جستجو در گوگل"
                  >
                    <PlatformIcon name="گوگل" color="bg-gray-700" icon={<Search size={20} />} />
                  </button>
                </div>
              </div>

              {/* سبک و ژانرها */}
              {movie.genres && movie.genres.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                  <h3 className="font-bold text-gray-200 mb-4 flex items-center gap-2">
                    <Tag className="text-[#ccff00]" size={18} /> سبک و ژانر
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {movie.genres.map((genre: any, idx: number) => (
                      <span
                        key={genre.id}
                        className={`px-3 py-1.5 rounded-lg font-bold text-[10px] text-white shadow-lg bg-gradient-to-r ${getGenreColor(idx)}`}
                      >
                        {genre.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* مشخصات تولید و کارگردان */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-3.5 text-xs text-gray-300">
                <h3 className="font-bold text-gray-200 mb-2 flex items-center gap-2 text-sm">
                  <Film className="text-[#ccff00]" size={16} /> شناسنامه اثر
                </h3>

                {directors.length > 0 && (
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <span className="text-gray-400">کارگردان:</span>
                    <span className="font-bold text-white">{directors.map(d => d.name).join(', ')}</span>
                  </div>
                )}

                {releaseYear && (
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <span className="text-gray-400">سال اکران:</span>
                    <span className="font-bold text-white font-mono">{releaseYear}</span>
                  </div>
                )}

                {formattedRuntime && (
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <span className="text-gray-400">مدت زمان:</span>
                    <span className="font-bold text-white">{formattedRuntime}</span>
                  </div>
                )}

                {(movie as any).original_language && (
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <span className="text-gray-400">زبان اصلی:</span>
                    <span className="font-bold text-white uppercase font-mono">{(movie as any).original_language}</span>
                  </div>
                )}

                {movie.vote_count ? (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">تعداد آرا:</span>
                    <span className="font-bold text-white font-mono">{movie.vote_count.toLocaleString('fa-IR')}</span>
                  </div>
                ) : null}
              </div>

            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 2: نقد و بررسی منتقدان (CRITICS) */}
        {/* ======================================================================= */}
        {activeTab === 'critics' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <CriticReviewsSection
              movieId={movie.id}
              mediaType="movie"
              showName={titleFa || titleEn || 'فیلم'}
              user={currentUser}
            />
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 3: فیلم‌های مشابه و مرتبط (SIMILAR & RELATED) */}
        {/* ======================================================================= */}
        {activeTab === 'similar' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <Sparkles size={20} className="text-[#ccff00]" />
                  <span>آثار مشابه و پیشنهادی</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  فیلم‌هایی که هواداران این اثر سینمایی همچنین تماشا کرده‌اند
                </p>
              </div>
              <span className="text-xs text-gray-500 font-mono">
                {relatedMovies.length} فیلم
              </span>
            </div>

            {loadingRelated ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
                <Loader2 className="w-8 h-8 text-[#ccff00] animate-spin" />
                <span className="text-xs font-bold">در حال یافتن فیلم‌های مشابه...</span>
              </div>
            ) : relatedMovies.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
                {relatedMovies.map((relMovie) => (
                  <MovieCard key={relMovie.id} movie={relMovie} />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-gray-500 text-xs bg-white/[0.02] border border-white/5 rounded-3xl">
                اثری مشابه در این بخش یافت نشد.
              </div>
            )}
          </div>
        )}

      </div>

      {/* مدال انتخاب گیف Klipy */}
      <GifPickerModal
        isOpen={isGifPickerOpen}
        onClose={() => setIsGifPickerOpen(false)}
        onSelect={(gif: { url: string; previewUrl: string; title: string }) => {
          setSelectedGif(gif);
          setIsGifPickerOpen(false);
        }}
      />

    </div>
  );
}
