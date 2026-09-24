"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { getShowDetailsLite } from '@/lib/tmdbClient';

export interface WatchedShowProgress {
  isWatched: boolean;
  watchedCount: number;
  totalEpisodes: number;
  progress: number; // 0 to 100
  isCompleted: boolean;
}

interface WatchedShowSummary {
  showId: number;
  watchedCount: number;
  totalEpisodes?: number;
}

interface WatchedContextType {
  watchedMap: Map<number, WatchedShowSummary>;
  isLoaded: boolean;
  getShowProgress: (showId: number | string | undefined, showTotalEpisodes?: number) => WatchedShowProgress;
  refreshWatched: () => Promise<void>;
}

const defaultProgress: WatchedShowProgress = {
  isWatched: false,
  watchedCount: 0,
  totalEpisodes: 0,
  progress: 0,
  isCompleted: false,
};

const WatchedContext = createContext<WatchedContextType>({
  watchedMap: new Map(),
  isLoaded: false,
  getShowProgress: () => defaultProgress,
  refreshWatched: async () => {},
});

// Cache for total episodes fetched from TMDB
const totalEpisodesCache = new Map<number, number>();

export function WatchedProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient() as any;
  const [watchedMap, setWatchedMap] = useState<Map<number, WatchedShowSummary>>(new Map());
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchWatchedData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setWatchedMap(new Map());
        setIsLoaded(true);
        return;
      }

      // Fetch all user's watched records in chunks if needed
      let allRecords: Array<{ show_id: number; episode_id: number | null }> = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('watched')
          .select('show_id, episode_id')
          .eq('user_id', user.id)
          .range(page * 1000, (page + 1) * 1000 - 1);

        if (error || !data || data.length === 0) {
          hasMore = false;
        } else {
          allRecords = [...allRecords, ...data];
          if (data.length < 1000) hasMore = false;
          else page++;
        }
      }

      // Group records by show_id
      const counts = new Map<number, number>();
      allRecords.forEach((row) => {
        const sid = Number(row.show_id);
        if (sid) {
          counts.set(sid, (counts.get(sid) || 0) + 1);
        }
      });

      const nextMap = new Map<number, WatchedShowSummary>();
      counts.forEach((count, showId) => {
        nextMap.set(showId, {
          showId,
          watchedCount: count,
          totalEpisodes: totalEpisodesCache.get(showId),
        });
      });

      setWatchedMap(nextMap);
      setIsLoaded(true);

      // Lazy-load missing totalEpisodes in background for watched shows
      const missingTotalIds = Array.from(counts.keys()).filter(
        (id) => !totalEpisodesCache.has(id)
      );

      if (missingTotalIds.length > 0) {
        // Fetch up to 15 in parallel
        Promise.all(
          missingTotalIds.slice(0, 20).map(async (id) => {
            try {
              const details = await getShowDetailsLite(String(id));
              if (details?.number_of_episodes) {
                totalEpisodesCache.set(id, details.number_of_episodes);
              }
            } catch {
              // ignore background fetch error
            }
          })
        ).then(() => {
          // Update map with newly loaded totals
          setWatchedMap((prev) => {
            const updated = new Map(prev);
            updated.forEach((val, id) => {
              const cachedTotal = totalEpisodesCache.get(id);
              if (cachedTotal && (!val.totalEpisodes || val.totalEpisodes !== cachedTotal)) {
                updated.set(id, { ...val, totalEpisodes: cachedTotal });
              }
            });
            return updated;
          });
        });
      }
    } catch (err) {
      console.error('Error fetching watched shows in WatchedProvider:', err);
      setIsLoaded(true);
    }
  }, [supabase]);

  useEffect(() => {
    fetchWatchedData();

    // Listen to real-time custom events when episodes are marked/unmarked
    const handleWatchedUpdate = () => {
      fetchWatchedData();
    };

    window.addEventListener('binger:watched-updated', handleWatchedUpdate);
    return () => {
      window.removeEventListener('binger:watched-updated', handleWatchedUpdate);
    };
  }, [fetchWatchedData]);

  const getShowProgress = useCallback(
    (showId: number | string | undefined, showTotalEpisodes?: number): WatchedShowProgress => {
      if (!showId) return defaultProgress;
      const numId = Number(showId);
      if (!numId) return defaultProgress;

      const summary = watchedMap.get(numId);
      if (!summary || summary.watchedCount <= 0) {
        return defaultProgress;
      }

      // Determine total episodes
      const total = showTotalEpisodes || summary.totalEpisodes || totalEpisodesCache.get(numId) || 0;

      // If total is known
      if (total > 0) {
        const progress = Math.min(100, Math.round((summary.watchedCount / total) * 100));
        const isCompleted = progress >= 100;
        return {
          isWatched: true,
          watchedCount: summary.watchedCount,
          totalEpisodes: total,
          progress,
          isCompleted,
        };
      }

      // If total episodes not yet loaded from TMDB, trigger a background fetch
      if (!totalEpisodesCache.has(numId)) {
        totalEpisodesCache.set(numId, 0); // mark in-flight
        getShowDetailsLite(String(numId)).then((details) => {
          if (details?.number_of_episodes) {
            totalEpisodesCache.set(numId, details.number_of_episodes);
            setWatchedMap((prev) => {
              const prevItem = prev.get(numId);
              if (prevItem) {
                const updated = new Map(prev);
                updated.set(numId, { ...prevItem, totalEpisodes: details.number_of_episodes });
                return updated;
              }
              return prev;
            });
          }
        }).catch(() => {});
      }

      // Fallback when total is unknown: mark as started with minimum progress
      return {
        isWatched: true,
        watchedCount: summary.watchedCount,
        totalEpisodes: 0,
        progress: Math.min(100, summary.watchedCount * 10 || 10),
        isCompleted: false,
      };
    },
    [watchedMap]
  );

  const contextValue = useMemo(() => ({
    watchedMap,
    isLoaded,
    getShowProgress,
    refreshWatched: fetchWatchedData,
  }), [watchedMap, isLoaded, getShowProgress, fetchWatchedData]);

  return (
    <WatchedContext.Provider value={contextValue}>
      {children}
    </WatchedContext.Provider>
  );
}

export function useWatched() {
  return useContext(WatchedContext);
}
