"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Film, Star, Clock, Calendar, Globe, Heart, Bookmark,
  CheckCircle2, Share2, ArrowRight, MessageSquare,
  Sparkles, AlertCircle, Send, Loader2, ChevronLeft, User
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  getImageUrl,
  getBackdropUrl,
  getRelatedMovies,
  getProfileUrl,
  type TMDBMovie
} from '@/lib/tmdbClient';
import { MovieCard } from '../../components/MovieCard';
import { MovieWatchedButton } from '../../components/MovieWatchedButton';
import { MovieWatchlistButton } from '../../components/MovieWatchlistButton';
import { MovieFavoriteButton } from '../../components/MovieFavoriteButton';
import { useMovie } from '@/lib/movieContext';
import { createClient } from '@/lib/supabase';
import { VipUsername } from '../../components/VipBadge';

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

export default function MovieDetailsClient({ initialMovie, movieId }: MovieDetailsClientProps) {
  const router = useRouter();
  const supabase = createClient() as any;
  const { isMovieWatched, isMovieInWatchlist, isMovieFavorite } = useMovie();

  const [movie, setMovie] = useState<TMDBMovie | null>(initialMovie);
  const [relatedMovies, setRelatedMovies] = useState<TMDBMovie[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(true);
  const [synopsisLang, setSynopsisLang] = useState<'fa' | 'en'>('fa');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Comments state
  const [comments, setComments] = useState<MovieCommentItem[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    // 1. Load user
    supabase.auth.getUser().then(({ data: { user } }: any) => {
      setCurrentUser(user);
    });

    // 2. Load related movies
    getRelatedMovies(movieId).then((related) => {
      setRelatedMovies(related);
      setLoadingRelated(false);
    }).catch(() => {
      setLoadingRelated(false);
    });

    // 3. Load comments
    loadComments();
  }, [movieId, supabase]);

  const loadComments = async () => {
    try {
      const { data: commentsData } = await supabase
        .from('movie_comments')
        .select('id, user_id, content, created_at')
        .eq('movie_id', Number(movieId))
        .order('created_at', { ascending: false });

      if (commentsData && commentsData.length > 0) {
        const userIds = Array.from(new Set(commentsData.map((c: any) => c.user_id)));
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, is_vip, role')
          .in('id', userIds);

        const profileMap = new Map((profiles || []).map((p: any) => [p.id, {
          username: p.username,
          avatar_url: p.avatar_url,
          is_vip: p.is_vip === true || p.role === 'admin'
        }]));

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

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;

    if (!currentUser) {
      router.push('/login');
      return;
    }

    try {
      setSubmittingComment(true);
      const { data, error } = await supabase
        .from('movie_comments')
        .insert({
          user_id: currentUser.id,
          movie_id: Number(movieId),
          content: newComment.trim(),
        })
        .select()
        .single();

      if (!error && data) {
        setNewComment('');
        showToast('نظر شما با موفقیت ثبت شد ✨');
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

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      showToast('لینک صفحه فیلم در کلیپ‌بورد کپی شد 📋');
    }
  };

  if (!movie) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4 text-center">
        <Film size={48} className="text-gray-600 mb-4 animate-pulse" />
        <h1 className="text-xl font-black text-white mb-2">اطلاعات فیلم یافت نشد</h1>
        <p className="text-xs text-gray-400 mb-6">احتمالاً فیلم مورد نظر در دسترس نیست یا ارتباط با سرور برقرار نشد.</p>
        <Link
          href="/dashboard/explore"
          className="px-4 py-2 rounded-xl bg-[#ccff00] text-black font-black text-xs hover:bg-[#b3e600] transition-all"
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
  const isWatched = isMovieWatched(movie.id);

  // Format runtime
  const hours = movie.runtime ? Math.floor(movie.runtime / 60) : 0;
  const minutes = movie.runtime ? movie.runtime % 60 : 0;
  const formattedRuntime = movie.runtime
    ? hours > 0
      ? `${hours} ساعت ${minutes > 0 ? `و ${minutes} دقیقه` : ''}`
      : `${minutes} دقیقه`
    : null;

  const castList = movie.credits?.cast?.slice(0, 12) || [];
  const directors = movie.credits?.crew?.filter(c => c.job === 'Director') || [];

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] pb-24 relative selection:bg-[#ccff00] selection:text-black">

      {/* نوتیفیکیشن تست */}
      {toastMessage && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#111] border border-[#ccff00]/50 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-2xl animate-in fade-in flex items-center gap-2">
          <Sparkles size={14} className="text-[#ccff00]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* --- HERO BACKDROP HEADER --- */}
      <div className="relative w-full h-[45vh] md:h-[55vh] min-h-[320px] overflow-hidden">
        {movie.backdrop_path ? (
          <img
            src={getBackdropUrl(movie.backdrop_path, 'w1280')}
            alt={titleFa}
            className="w-full h-full object-cover object-top opacity-35 filter blur-[1px] scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-[#151515] to-[#050505]" />
        )}

        {/* Gradient Masking */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/80 via-transparent to-[#050505]/80" />

        {/* دکمه بازگشت */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={() => router.back()}
            className="px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/90 backdrop-blur-md border border-white/10 hover:border-[#ccff00]/40 text-xs font-bold text-gray-300 hover:text-white flex items-center gap-1.5 transition-all shadow-lg cursor-pointer"
          >
            <ArrowRight size={14} />
            <span>بازگشت</span>
          </button>
        </div>
      </div>

      {/* --- MAIN MOVIE CONTENT CONTAINER --- */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-36 md:-mt-48 relative z-30 space-y-10">

        {/* Header Block: Poster + Info + Quick Actions */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">

          {/* پوستر فیلم */}
          <div className="relative w-40 sm:w-48 md:w-56 shrink-0 aspect-[2/3] rounded-2xl overflow-hidden border border-white/15 bg-white/5 shadow-2xl mx-auto md:mx-0">
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

          {/* مشخصات اصلی فیلم */}
          <div className="flex-1 space-y-4 text-center md:text-right w-full">

            {/* عنوان فیلم و نسخه انگلیسی */}
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight">
                {titleFa}
              </h1>
              {titleEn && titleEn !== titleFa && (
                <p className="text-sm md:text-base text-gray-400 font-mono mt-1" dir="ltr">
                  {titleEn}
                </p>
              )}
              {movie.tagline && (
                <p className="text-xs sm:text-sm text-amber-300/80 italic mt-1.5 font-medium">
                  «{movie.tagline}»
                </p>
              )}
            </div>

            {/* نوار متادیتا: امتیاز، زمان، سال، ژانرها */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-1">
              {/* امتیاز */}
              <div className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-black flex items-center gap-1.5 shadow-sm">
                <Star size={13} className="fill-amber-400 shrink-0" />
                <span>{rating || 'N/A'}</span>
                {movie.vote_count ? (
                  <span className="text-[10px] text-amber-400/60 font-mono">({movie.vote_count.toLocaleString()})</span>
                ) : null}
              </div>

              {/* زمان فیلم */}
              {formattedRuntime && (
                <div className="px-3 py-1 rounded-xl bg-white/[0.05] border border-white/10 text-gray-300 text-xs font-bold flex items-center gap-1.5">
                  <Clock size={13} className="text-[#ccff00]" />
                  <span>{formattedRuntime}</span>
                </div>
              )}

              {/* سال انتشار */}
              {releaseYear && (
                <div className="px-3 py-1 rounded-xl bg-white/[0.05] border border-white/10 text-gray-300 text-xs font-mono">
                  {releaseYear}
                </div>
              )}

              {/* کارگردان */}
              {directors.length > 0 && (
                <div className="px-3 py-1 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-300 text-xs font-bold">
                  کارگردان: {directors.map(d => d.name).join(', ')}
                </div>
              )}
            </div>

            {/* ژانرها */}
            {movie.genres && movie.genres.length > 0 && (
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 pt-1">
                {movie.genres.map(g => (
                  <span
                    key={g.id}
                    className="px-2.5 py-0.5 rounded-lg bg-white/[0.04] border border-white/10 text-[11px] text-gray-400"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            {/* نوار دکمه‌های اقدام (Action Bar) */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-3 border-t border-white/10">
              {/* دکمه تک‌کلیکه تماشا کردم */}
              <MovieWatchedButton
                movieId={movie.id}
                movie={movie}
                showText={true}
                className="px-4 py-2.5"
              />

              {/* دکمه لیست انتظار */}
              <div className="flex items-center gap-2">
                <MovieWatchlistButton
                  movieId={movie.id}
                  movie={movie}
                  className="p-2.5"
                  iconSize={16}
                />
                <MovieFavoriteButton
                  movieId={movie.id}
                  movie={movie}
                  className="p-2.5"
                  iconSize={16}
                />
                <button
                  onClick={handleShare}
                  type="button"
                  title="اشتراک‌گذاری"
                  className="p-2.5 rounded-xl border border-white/15 bg-black/60 hover:bg-black/90 text-white/80 hover:text-white transition-all active:scale-95 cursor-pointer"
                >
                  <Share2 size={16} />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* --- خلاصه داستان (SYNOPSIS) --- */}
        <section className="bg-white/[0.02] border border-white/10 rounded-3xl p-5 md:p-6 space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Film size={18} className="text-[#ccff00]" />
              <span>خلاصه داستان</span>
            </h2>
            {movie.overview_en && movie.overview_fa && (
              <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-xl border border-white/10 text-[11px] font-bold">
                <button
                  onClick={() => setSynopsisLang('fa')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${synopsisLang === 'fa' ? 'bg-[#ccff00] text-black font-black' : 'text-gray-400 hover:text-white'}`}
                >
                  فارسی
                </button>
                <button
                  onClick={() => setSynopsisLang('en')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${synopsisLang === 'en' ? 'bg-[#ccff00] text-black font-black' : 'text-gray-400 hover:text-white'}`}
                >
                  English
                </button>
              </div>
            )}
          </div>

          <p className="text-sm md:text-base text-gray-300 leading-relaxed font-light">
            {synopsisLang === 'en'
              ? (movie.overview_en || movie.overview || 'No synopsis available in English.')
              : (movie.overview_fa || movie.overview || 'خلاصه داستانی برای این فیلم ثبت نشده است.')
            }
          </p>
        </section>

        {/* --- بازیگران فیلم (CAST) --- */}
        {castList.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <User size={18} className="text-amber-400" />
                <span>بازیگران اصلی</span>
              </h2>
              <span className="text-xs text-gray-400 font-mono">{castList.length} بازیگر</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {castList.map((actor) => (
                <div
                  key={actor.id}
                  className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-2xl p-2.5 flex flex-col items-center text-center gap-2 transition-all group"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-white/5 border border-white/10 shrink-0">
                    <img
                      src={getProfileUrl(actor.profile_path, 'w185')}
                      alt={actor.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="min-w-0 w-full">
                    <span className="text-xs font-bold text-white truncate block group-hover:text-[#ccff00] transition-colors">
                      {actor.name}
                    </span>
                    {actor.character && (
                      <span className="text-[10px] text-gray-400 truncate block mt-0.5">
                        {actor.character}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* --- فیلم‌های پیشنهادی و مشابه (RELATED MOVIES) --- */}
        {relatedMovies.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Sparkles size={18} className="text-[#ccff00]" />
                <span>فیلم‌های پیشنهادی و مشابه</span>
              </h2>
              <span className="text-xs text-gray-400">آثاری که شاید دوست داشته باشید</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
              {relatedMovies.map((relMovie) => (
                <MovieCard key={relMovie.id} movie={relMovie} />
              ))}
            </div>
          </section>
        )}

        {/* --- نظرات کاربران (COMMENTS) --- */}
        <section className="space-y-6 pt-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <MessageSquare size={18} className="text-emerald-400" />
              <span>دیدگاه کاربران بینجر</span>
            </h2>
            <span className="text-xs text-gray-400 font-mono">{comments.length} نظر</span>
          </div>

          {/* فرم ارسال نظر */}
          <form onSubmit={handleAddComment} className="space-y-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={currentUser ? "نظر یا تحلیل خود درباره این اثر سینمایی را بنویسید..." : "جهت ثبت نظر ابتدا وارد حساب خود شوید"}
              rows={3}
              disabled={!currentUser || submittingComment}
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#ccff00]/60 resize-none transition-colors"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!currentUser || !newComment.trim() || submittingComment}
                className="bg-[#ccff00] hover:bg-[#b3e600] disabled:opacity-40 text-black font-black text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                {submittingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                <span>ارسال دیدگاه</span>
              </button>
            </div>
          </form>

          {/* لیست نظرات */}
          {comments.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-xs rounded-2xl bg-white/[0.02] border border-white/5">
              هنوز نظری برای این فیلم ثبت نشده است. اولین نفری باشید که نظر خود را به اشتراک می‌گذارد!
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-sm">
                        {comment.user?.avatar_url || '😎'}
                      </div>
                      <VipUsername
                        username={comment.user?.username || 'کاربر بینجر'}
                        isVip={comment.user?.is_vip === true}
                        className="text-xs font-bold"
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {new Date(comment.created_at).toLocaleDateString('fa-IR')}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed pr-10">
                    {comment.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
