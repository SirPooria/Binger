"use client";

import React, { useState } from 'react';
import { Check, CheckCircle2, Eye, Loader2 } from 'lucide-react';
import { useMovie } from '@/lib/movieContext';
import type { TMDBMovie } from '@/lib/tmdbClient';

interface MovieWatchedButtonProps {
  movieId: number | string;
  movie?: Partial<TMDBMovie>;
  className?: string;
  iconSize?: number;
  showText?: boolean;
  stopPropagation?: boolean;
}

export function MovieWatchedButton({
  movieId,
  movie,
  className = "",
  iconSize = 14,
  showText = false,
  stopPropagation = true,
}: MovieWatchedButtonProps) {
  const { isMovieWatched, toggleMovieWatched } = useMovie();
  const [loading, setLoading] = useState(false);
  const watched = isMovieWatched(movieId);

  const handleToggle = async (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (loading) return;

    try {
      setLoading(true);
      await toggleMovieWatched(movieId, movie);
    } catch (err) {
      console.error('Error toggling movie watched status:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      type="button"
      title={watched ? "علامت زدن به عنوان ندیده" : "تماشا کردم (دیدم)"}
      aria-label={watched ? "علامت زدن به عنوان ندیده" : "تماشا کردم (دیدم)"}
      className={`relative rounded-xl border backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 select-none ${
        watched
          ? 'bg-emerald-500 text-black border-emerald-400 font-black shadow-[0_0_15px_rgba(16,185,129,0.35)]'
          : 'bg-black/60 hover:bg-black/85 text-white/80 hover:text-white border-white/15 hover:border-[#ccff00]/50'
      } ${showText ? 'px-3 py-1.5 text-xs font-bold' : 'p-2'} ${className}`}
    >
      {loading ? (
        <Loader2 size={iconSize} className="animate-spin" />
      ) : watched ? (
        <>
          <CheckCircle2 size={iconSize} strokeWidth={2.5} />
          {showText && <span>دیده‌شده</span>}
        </>
      ) : (
        <>
          <Eye size={iconSize} strokeWidth={2} />
          {showText && <span>دیدم</span>}
        </>
      )}
    </button>
  );
}
