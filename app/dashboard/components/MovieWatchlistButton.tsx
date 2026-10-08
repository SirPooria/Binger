"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, Check, Loader2 } from 'lucide-react';
import { useMovie } from '@/lib/movieContext';
import type { TMDBMovie } from '@/lib/tmdbClient';

interface MovieWatchlistButtonProps {
  movieId: number | string;
  movie?: Partial<TMDBMovie>;
  className?: string;
  iconSize?: number;
  stopPropagation?: boolean;
}

export function MovieWatchlistButton({
  movieId,
  movie,
  className = "",
  iconSize = 13,
  stopPropagation = true,
}: MovieWatchlistButtonProps) {
  const router = useRouter();
  const { isMovieInWatchlist, toggleMovieWatchlist } = useMovie();
  const [loading, setLoading] = useState(false);
  const inWatchlist = isMovieInWatchlist(movieId);

  const handleToggle = async (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (loading) return;

    try {
      setLoading(true);
      await toggleMovieWatchlist(movieId, movie);
    } catch (err) {
      console.error('Error toggling movie watchlist:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      type="button"
      title={inWatchlist ? "حذف از لیست انتظار فیلم‌ها" : "افزودن به لیست انتظار فیلم‌ها"}
      aria-label={inWatchlist ? "حذف از لیست انتظار فیلم‌ها" : "افزودن به لیست انتظار فیلم‌ها"}
      className={`relative p-2 rounded-xl border backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
        inWatchlist
          ? 'bg-[#ccff00] text-black border-[#ccff00] shadow-[0_0_12px_rgba(204,255,0,0.4)]'
          : 'bg-black/60 hover:bg-black/80 text-white/80 hover:text-white border-white/15 hover:border-white/30'
      } ${className}`}
    >
      {loading ? (
        <Loader2 size={iconSize} className="animate-spin" />
      ) : inWatchlist ? (
        <Check size={iconSize} strokeWidth={3} />
      ) : (
        <Bookmark size={iconSize} strokeWidth={2} />
      )}
    </button>
  );
}
