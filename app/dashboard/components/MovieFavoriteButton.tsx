"use client";

import React, { useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { useMovie } from '@/lib/movieContext';
import type { TMDBMovie } from '@/lib/tmdbClient';

interface MovieFavoriteButtonProps {
  movieId: number | string;
  movie?: Partial<TMDBMovie>;
  className?: string;
  iconSize?: number;
  stopPropagation?: boolean;
}

export function MovieFavoriteButton({
  movieId,
  movie,
  className = "",
  iconSize = 14,
  stopPropagation = true,
}: MovieFavoriteButtonProps) {
  const { isMovieFavorite, toggleMovieFavorite } = useMovie();
  const [loading, setLoading] = useState(false);
  const isFav = isMovieFavorite(movieId);

  const handleToggle = async (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (loading) return;

    try {
      setLoading(true);
      await toggleMovieFavorite(movieId, movie);
    } catch (err) {
      console.error('Error toggling movie favorite:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      type="button"
      title={isFav ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
      aria-label={isFav ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
      className={`relative p-2 rounded-xl border backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
        isFav
          ? 'bg-rose-500 text-white border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
          : 'bg-black/60 hover:bg-black/85 text-white/80 hover:text-rose-400 border-white/15 hover:border-rose-500/50'
      } ${className}`}
    >
      {loading ? (
        <Loader2 size={iconSize} className="animate-spin" />
      ) : (
        <Heart
          size={iconSize}
          className={isFav ? "fill-white" : ""}
          strokeWidth={2}
        />
      )}
    </button>
  );
}
