"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import type { TMDBMovie } from '@/lib/tmdbClient';

export interface WatchedMovieRecord {
  movie_id: number;
  movie_title?: string | null;
  poster_path?: string | null;
  runtime_minutes?: number | null;
  created_at: string;
}

export interface MovieContextType {
  isLoaded: boolean;
  watchedMovies: WatchedMovieRecord[];
  watchlistMovies: WatchedMovieRecord[];
  favoriteMovies: WatchedMovieRecord[];
  watchedMovieIds: Set<number>;
  watchlistMovieIds: Set<number>;
  favoriteMovieIds: Set<number>;

  // Synchronous O(1) query helpers
  isMovieWatched: (movieId: number | string | undefined) => boolean;
  isMovieInWatchlist: (movieId: number | string | undefined) => boolean;
  isMovieFavorite: (movieId: number | string | undefined) => boolean;

  // Optimistic mutation actions
  toggleMovieWatched: (movieId: number | string, movieData?: Partial<TMDBMovie>) => Promise<boolean>;
  toggleMovieWatchlist: (movieId: number | string, movieData?: Partial<TMDBMovie>) => Promise<boolean>;
  toggleMovieFavorite: (movieId: number | string, movieData?: Partial<TMDBMovie>) => Promise<boolean>;

  // Aggregated quick statistics
  totalWatchedMoviesCount: number;
  totalMovieWatchTimeMinutes: number;

  // Refresh
  refreshMovies: (force?: boolean) => Promise<void>;
}

const MovieContext = createContext<MovieContextType>({
  isLoaded: false,
  watchedMovies: [],
  watchlistMovies: [],
  favoriteMovies: [],
  watchedMovieIds: new Set(),
  watchlistMovieIds: new Set(),
  favoriteMovieIds: new Set(),
  isMovieWatched: () => false,
  isMovieInWatchlist: () => false,
  isMovieFavorite: () => false,
  toggleMovieWatched: async () => false,
  toggleMovieWatchlist: async () => false,
  toggleMovieFavorite: async () => false,
  totalWatchedMoviesCount: 0,
  totalMovieWatchTimeMinutes: 0,
  refreshMovies: async () => {},
});

// In-memory module-level cache for single-fetch across component mounts
let memoryWatchedMovies: WatchedMovieRecord[] | null = null;
let memoryWatchlistMovies: WatchedMovieRecord[] | null = null;
let memoryFavoriteMovies: WatchedMovieRecord[] | null = null;
let memoryWatchlistMovieIds: Set<number> | null = null;
let memoryFavoriteMovieIds: Set<number> | null = null;
let memoryUserId: string | null = null;
let activeFetchPromise: Promise<void> | null = null;

export function MovieProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient() as any;
  const [isLoaded, setIsLoaded] = useState(false);
  const [watchedMovies, setWatchedMovies] = useState<WatchedMovieRecord[]>([]);
  const [watchlistMovies, setWatchlistMovies] = useState<WatchedMovieRecord[]>([]);
  const [favoriteMovies, setFavoriteMovies] = useState<WatchedMovieRecord[]>([]);
  const [watchedMovieIds, setWatchedMovieIds] = useState<Set<number>>(new Set());
  const [watchlistMovieIds, setWatchlistMovieIds] = useState<Set<number>>(new Set());
  const [favoriteMovieIds, setFavoriteMovieIds] = useState<Set<number>>(new Set());

  const fetchMoviesData = useCallback(async (force = false): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        memoryWatchedMovies = [];
        memoryWatchlistMovies = [];
        memoryFavoriteMovies = [];
        memoryWatchlistMovieIds = new Set();
        memoryFavoriteMovieIds = new Set();
        memoryUserId = null;
        setWatchedMovies([]);
        setWatchlistMovies([]);
        setFavoriteMovies([]);
        setWatchedMovieIds(new Set());
        setWatchlistMovieIds(new Set());
        setFavoriteMovieIds(new Set());
        setIsLoaded(true);
        return;
      }

      if (!force && memoryWatchedMovies && memoryUserId === user.id) {
        setWatchedMovies(memoryWatchedMovies);
        setWatchlistMovies(memoryWatchlistMovies || []);
        setFavoriteMovies(memoryFavoriteMovies || []);
        setWatchedMovieIds(new Set(memoryWatchedMovies.map(m => m.movie_id)));
        setWatchlistMovieIds(memoryWatchlistMovieIds || new Set());
        setFavoriteMovieIds(memoryFavoriteMovieIds || new Set());
        setIsLoaded(true);
        return;
      }

      if (activeFetchPromise && !force) {
        await activeFetchPromise;
        return;
      }

      const fetchTask = (async () => {
        try {
          const [watchedRes, watchlistRes, favRes] = await Promise.all([
            supabase
              .from('watched_movies')
              .select('movie_id, movie_title, poster_path, runtime_minutes, created_at')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false }),
            supabase
              .from('watchlist_movies')
              .select('movie_id, movie_title, poster_path, created_at')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false }),
            supabase
              .from('favorite_movies')
              .select('movie_id, movie_title, poster_path, created_at')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false }),
          ]);

          const watchedData: WatchedMovieRecord[] = (watchedRes.data || []).map((row: any) => ({
            movie_id: Number(row.movie_id),
            movie_title: row.movie_title || null,
            poster_path: row.poster_path || null,
            runtime_minutes: row.runtime_minutes ? Number(row.runtime_minutes) : 0,
            created_at: row.created_at,
          }));

          const watchlistData: WatchedMovieRecord[] = (watchlistRes.data || []).map((row: any) => ({
            movie_id: Number(row.movie_id),
            movie_title: row.movie_title || null,
            poster_path: row.poster_path || null,
            runtime_minutes: 0,
            created_at: row.created_at,
          }));

          const favData: WatchedMovieRecord[] = (favRes.data || []).map((row: any) => ({
            movie_id: Number(row.movie_id),
            movie_title: row.movie_title || null,
            poster_path: row.poster_path || null,
            runtime_minutes: 0,
            created_at: row.created_at,
          }));

          const watchedIds = new Set<number>(watchedData.map(m => m.movie_id));
          const watchlistIds = new Set<number>(watchlistData.map(m => m.movie_id));
          const favIds = new Set<number>(favData.map(m => m.movie_id));

          memoryWatchedMovies = watchedData;
          memoryWatchlistMovies = watchlistData;
          memoryFavoriteMovies = favData;
          memoryWatchlistMovieIds = watchlistIds;
          memoryFavoriteMovieIds = favIds;
          memoryUserId = user.id;

          setWatchedMovies(watchedData);
          setWatchlistMovies(watchlistData);
          setFavoriteMovies(favData);
          setWatchedMovieIds(watchedIds);
          setWatchlistMovieIds(watchlistIds);
          setFavoriteMovieIds(favIds);
          setIsLoaded(true);
        } catch (err) {
          console.error('[MovieContext] Fetch error:', err);
          setIsLoaded(true);
        }
      })();

      activeFetchPromise = fetchTask;
      await fetchTask;
      activeFetchPromise = null;
    } catch (err) {
      console.error('[MovieContext] Outer fetch error:', err);
      setIsLoaded(true);
    }
  }, [supabase]);

  useEffect(() => {
    fetchMoviesData();

    // Listen to global movie events across components
    const handleMovieUpdated = () => {
      fetchMoviesData(true);
    };

    window.addEventListener('binger:movies-updated', handleMovieUpdated);
    return () => {
      window.removeEventListener('binger:movies-updated', handleMovieUpdated);
    };
  }, [fetchMoviesData]);

  // Synchronous query helpers
  const isMovieWatched = useCallback((movieId: number | string | undefined): boolean => {
    if (!movieId) return false;
    return watchedMovieIds.has(Number(movieId));
  }, [watchedMovieIds]);

  const isMovieInWatchlist = useCallback((movieId: number | string | undefined): boolean => {
    if (!movieId) return false;
    return watchlistMovieIds.has(Number(movieId));
  }, [watchlistMovieIds]);

  const isMovieFavorite = useCallback((movieId: number | string | undefined): boolean => {
    if (!movieId) return false;
    return favoriteMovieIds.has(Number(movieId));
  }, [favoriteMovieIds]);

  // Optimistic Toggle: Watched
  const toggleMovieWatched = useCallback(async (movieId: number | string, movieData?: Partial<TMDBMovie>): Promise<boolean> => {
    const numId = Number(movieId);
    if (!numId) return false;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const isCurrentlyWatched = watchedMovieIds.has(numId);
    const nextStatus = !isCurrentlyWatched;

    // 1. Optimistic Update
    setWatchedMovieIds(prev => {
      const next = new Set(prev);
      if (nextStatus) next.add(numId);
      else next.delete(numId);
      return next;
    });

    setWatchedMovies(prev => {
      if (nextStatus) {
        const newRecord: WatchedMovieRecord = {
          movie_id: numId,
          movie_title: movieData?.title_fa || movieData?.title || null,
          poster_path: movieData?.poster_path || null,
          runtime_minutes: movieData?.runtime || 0,
          created_at: new Date().toISOString(),
        };
        return [newRecord, ...prev.filter(m => m.movie_id !== numId)];
      } else {
        return prev.filter(m => m.movie_id !== numId);
      }
    });

    // If marked watched, optionally remove from watchlist
    if (nextStatus && watchlistMovieIds.has(numId)) {
      setWatchlistMovieIds(prev => {
        const next = new Set(prev);
        next.delete(numId);
        return next;
      });
      supabase.from('watchlist_movies').delete().eq('user_id', user.id).eq('movie_id', numId).then(() => {});
    }

    try {
      if (nextStatus) {
        await supabase.from('watched_movies').upsert({
          user_id: user.id,
          movie_id: numId,
          movie_title: movieData?.title_fa || movieData?.title || null,
          poster_path: movieData?.poster_path || null,
          runtime_minutes: movieData?.runtime || 0,
          created_at: new Date().toISOString(),
        }, { onConflict: 'user_id,movie_id' });
      } else {
        await supabase.from('watched_movies').delete().eq('user_id', user.id).eq('movie_id', numId);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('binger:movie-status-changed', {
          detail: { movieId: numId, isWatched: nextStatus }
        }));
      }

      return nextStatus;
    } catch (err) {
      console.error('[MovieContext] Toggle watched error:', err);
      // Rollback
      fetchMoviesData(true);
      return isCurrentlyWatched;
    }
  }, [supabase, watchedMovieIds, watchlistMovieIds, fetchMoviesData]);

  // Optimistic Toggle: Watchlist
  const toggleMovieWatchlist = useCallback(async (movieId: number | string, movieData?: Partial<TMDBMovie>): Promise<boolean> => {
    const numId = Number(movieId);
    if (!numId) return false;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const isCurrentlyIn = watchlistMovieIds.has(numId);
    const nextStatus = !isCurrentlyIn;

    // 1. Optimistic Update
    setWatchlistMovieIds(prev => {
      const next = new Set(prev);
      if (nextStatus) next.add(numId);
      else next.delete(numId);
      return next;
    });

    setWatchlistMovies(prev => {
      if (nextStatus) {
        const newRecord: WatchedMovieRecord = {
          movie_id: numId,
          movie_title: movieData?.title_fa || movieData?.title || null,
          poster_path: movieData?.poster_path || null,
          runtime_minutes: 0,
          created_at: new Date().toISOString(),
        };
        return [newRecord, ...prev.filter(m => m.movie_id !== numId)];
      } else {
        return prev.filter(m => m.movie_id !== numId);
      }
    });

    try {
      if (nextStatus) {
        await supabase.from('watchlist_movies').upsert({
          user_id: user.id,
          movie_id: numId,
          movie_title: movieData?.title_fa || movieData?.title || null,
          poster_path: movieData?.poster_path || null,
          created_at: new Date().toISOString(),
        }, { onConflict: 'user_id,movie_id' });
      } else {
        await supabase.from('watchlist_movies').delete().eq('user_id', user.id).eq('movie_id', numId);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('binger:movie-watchlist-changed', {
          detail: { movieId: numId, inWatchlist: nextStatus }
        }));
      }

      return nextStatus;
    } catch (err) {
      console.error('[MovieContext] Toggle watchlist error:', err);
      fetchMoviesData(true);
      return isCurrentlyIn;
    }
  }, [supabase, watchlistMovieIds, fetchMoviesData]);

  // Optimistic Toggle: Favorite
  const toggleMovieFavorite = useCallback(async (movieId: number | string, movieData?: Partial<TMDBMovie>): Promise<boolean> => {
    const numId = Number(movieId);
    if (!numId) return false;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const isCurrentlyFav = favoriteMovieIds.has(numId);
    const nextStatus = !isCurrentlyFav;

    // 1. Optimistic Update
    setFavoriteMovieIds(prev => {
      const next = new Set(prev);
      if (nextStatus) next.add(numId);
      else next.delete(numId);
      return next;
    });

    setFavoriteMovies(prev => {
      if (nextStatus) {
        const newRecord: WatchedMovieRecord = {
          movie_id: numId,
          movie_title: movieData?.title_fa || movieData?.title || null,
          poster_path: movieData?.poster_path || null,
          runtime_minutes: 0,
          created_at: new Date().toISOString(),
        };
        return [newRecord, ...prev.filter(m => m.movie_id !== numId)];
      } else {
        return prev.filter(m => m.movie_id !== numId);
      }
    });

    try {
      if (nextStatus) {
        await supabase.from('favorite_movies').upsert({
          user_id: user.id,
          movie_id: numId,
          movie_title: movieData?.title_fa || movieData?.title || null,
          poster_path: movieData?.poster_path || null,
          created_at: new Date().toISOString(),
        }, { onConflict: 'user_id,movie_id' });
      } else {
        await supabase.from('favorite_movies').delete().eq('user_id', user.id).eq('movie_id', numId);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('binger:movie-favorite-changed', {
          detail: { movieId: numId, isFavorite: nextStatus }
        }));
      }

      return nextStatus;
    } catch (err) {
      console.error('[MovieContext] Toggle favorite error:', err);
      fetchMoviesData(true);
      return isCurrentlyFav;
    }
  }, [supabase, favoriteMovieIds, fetchMoviesData]);

  // Calculate aggregated stats
  const totalWatchedMoviesCount = watchedMovies.length;
  const totalMovieWatchTimeMinutes = useMemo(() => {
    return watchedMovies.reduce((acc, m) => acc + (m.runtime_minutes || 0), 0);
  }, [watchedMovies]);

  const value = useMemo(() => ({
    isLoaded,
    watchedMovies,
    watchlistMovies,
    favoriteMovies,
    watchedMovieIds,
    watchlistMovieIds,
    favoriteMovieIds,
    isMovieWatched,
    isMovieInWatchlist,
    isMovieFavorite,
    toggleMovieWatched,
    toggleMovieWatchlist,
    toggleMovieFavorite,
    totalWatchedMoviesCount,
    totalMovieWatchTimeMinutes,
    refreshMovies: fetchMoviesData,
  }), [
    isLoaded,
    watchedMovies,
    watchlistMovies,
    favoriteMovies,
    watchedMovieIds,
    watchlistMovieIds,
    favoriteMovieIds,
    isMovieWatched,
    isMovieInWatchlist,
    isMovieFavorite,
    toggleMovieWatched,
    toggleMovieWatchlist,
    toggleMovieFavorite,
    totalWatchedMoviesCount,
    totalMovieWatchTimeMinutes,
    fetchMoviesData,
  ]);

  return <MovieContext.Provider value={value}>{children}</MovieContext.Provider>;
}

export function useMovie(): MovieContextType {
  const context = useContext(MovieContext);
  if (!context) {
    throw new Error('useMovie must be used within a MovieProvider');
  }
  return context;
}
