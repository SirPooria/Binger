"use client";

import React from 'react';
import Link from 'next/link';
import { Film, Star, Clock, Calendar } from 'lucide-react';
import { getImageUrl, type TMDBMovie } from '@/lib/tmdbClient';
import { MovieWatchlistButton } from './MovieWatchlistButton';
import { MovieWatchedButton } from './MovieWatchedButton';
import { MovieFavoriteButton } from './MovieFavoriteButton';
import { useMovie } from '@/lib/movieContext';

interface MovieCardProps {
  movie: TMDBMovie;
  className?: string;
  showQuickActions?: boolean;
}

export function MovieCard({
  movie,
  className = "",
  showQuickActions = true,
}: MovieCardProps) {
  const { isMovieWatched } = useMovie();
  const watched = isMovieWatched(movie.id);

  const displayTitle = movie.title_fa || movie.title || 'بدون عنوان';
  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : null;

  return (
    <div
      className={`group relative flex flex-col rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-[#ccff00]/40 transition-all duration-300 overflow-hidden shadow-lg hover:shadow-[0_10px_30px_rgba(0,0,0,0.6)] ${className}`}
    >
      {/* پوستر فیلم */}
      <Link
        href={`/dashboard/movie/${movie.id}`}
        onClick={() => {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('binger_explore_scroll', String(window.scrollY));
          }
        }}
        className="relative aspect-[2/3] w-full overflow-hidden bg-white/5 block"
      >
        <img
          src={getImageUrl(movie.poster_path, 'w342')}
          alt={displayTitle}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* گرادینت مشکی ملایم پایین پوستر */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 pointer-events-none" />

        {/* بج نوع اثر: سینمایی */}
        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md border border-white/15 text-[10px] font-black text-amber-300 flex items-center gap-1 shadow-md">
          <Film size={11} className="shrink-0" />
          <span>سینمایی</span>
        </div>

        {/* وضعیت تماشا (اگر دیده‌شده باشد) */}
        {watched && (
          <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-emerald-500 text-black text-[10px] font-black flex items-center gap-1 shadow-[0_0_12px_rgba(16,185,129,0.5)]">
            <span>دیده‌شده</span>
          </div>
        )}

        {/* دکمه‌های اقدام سریع در هاور یا کارت (Quick Actions) */}
        {showQuickActions && (
          <div className="absolute bottom-2.5 right-2.5 left-2.5 flex items-center justify-between gap-1.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
            <div className="flex items-center gap-1.5">
              <MovieWatchedButton movieId={movie.id} movie={movie} iconSize={13} />
              <MovieWatchlistButton movieId={movie.id} movie={movie} iconSize={13} />
            </div>
            <MovieFavoriteButton movieId={movie.id} movie={movie} iconSize={13} />
          </div>
        )}
      </Link>

      {/* اطلاعات متنی زیر کارت */}
      <div className="p-3 flex flex-col flex-1 justify-between gap-1.5">
        <Link
          href={`/dashboard/movie/${movie.id}`}
          className="text-xs sm:text-sm font-black text-white hover:text-[#ccff00] transition-colors truncate"
          title={displayTitle}
        >
          {displayTitle}
        </Link>

        <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono mt-auto">
          {/* امتیاز */}
          <div className="flex items-center gap-1 text-amber-400 font-bold">
            <Star size={12} className="fill-amber-400 shrink-0" />
            <span>{rating || 'N/A'}</span>
          </div>

          {/* سال ساخت و زمان */}
          <div className="flex items-center gap-2 text-gray-500 text-[10px]">
            {movie.runtime ? (
              <span className="flex items-center gap-0.5">
                <Clock size={10} />
                <span>{movie.runtime} دقیقه</span>
              </span>
            ) : null}
            {releaseYear && <span>{releaseYear}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
