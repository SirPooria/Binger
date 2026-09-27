"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { getShowDetailsLite, getReleasedEpisodeCount, type TMDBShow } from '@/lib/tmdbClient';

export interface WatchedShowProgress {
  isWatched: boolean;
  watchedCount: number;
  totalEpisodes: number;
  progress: number; // 0 to 100
  isCompleted: boolean;
}

export interface WatchedShowSummary {
  showId: number;
  watchedCount: number;
  totalEpisodes?: number;
}

export interface WatchedRecord {
  show_id: number;
  episode_id: number;
  created_at: string;
}

export interface WatchedContextType {
  // Backwards-compatible properties
  watchedMap: Map<number, WatchedShowSummary>;
  isLoaded: boolean;
  getShowProgress: (showId: number | string | undefined, showOrTotal?: number | Partial<TMDBShow>) => WatchedShowProgress;
  refreshWatched: (force?: boolean) => Promise<void>;

  // Unified global records & fast lookup
  watchedRecords: WatchedRecord[];
  watchedShowIds: number[];
  watchedEpisodeSet: Set<number>;

  // Synchronous O(1) query helpers
  isEpisodeWatched: (episodeId: number | string | undefined) => boolean;
  getShowWatchedEpisodes: (showId: number | string | undefined) => number[];
  isShowWatched: (showId: number | string | undefined) => boolean;

  // Async helper that guarantees records are available (waiting on single in-flight fetch if needed)
  getWatchedRecords: () => Promise<WatchedRecord[]>;

  // Optimistic mutations
  toggleWatchedEpisode: (showId: number | string, episodeId: number, isAlreadyWatched?: boolean) => Promise<boolean>;
  toggleSeasonEpisodes: (showId: number | string, episodeIds: number[], action: 'mark' | 'unmark') => Promise<boolean>;
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
  watchedRecords: [],
  watchedShowIds: [],
  watchedEpisodeSet: new Set(),
  isEpisodeWatched: () => false,
  getShowWatchedEpisodes: () => [],
  isShowWatched: () => false,
  getWatchedRecords: async () => [],
  toggleWatchedEpisode: async () => false,
  toggleSeasonEpisodes: async () => false,
});

// TMDB Total Episodes Cache
const totalEpisodesCache = new Map<number, number>();

// In-memory module-level cache for single-fetch across all component mounts
let memoryCacheRecords: WatchedRecord[] | null = null;
let memoryCacheUserId: string | null = null;
let activeFetchPromise: Promise<WatchedRecord[]> | null = null;

// Helper to build derived data structures from a flat array of records
function buildDerivedData(records: WatchedRecord[]) {
  const episodeSet = new Set<number>();
  const showEpisodesMap = new Map<number, number[]>();
  const counts = new Map<number, number>();
  const showOrder: number[] = [];
  const seenShows = new Set<number>();

  for (const row of records) {
    const sid = Number(row.show_id);
    const eid = Number(row.episode_id);

    if (eid) {
      episodeSet.add(eid);
    }

    if (sid) {
      counts.set(sid, (counts.get(sid) || 0) + 1);

      if (!seenShows.has(sid)) {
        seenShows.add(sid);
        showOrder.push(sid);
      }

      if (eid) {
        let epList = showEpisodesMap.get(sid);
        if (!epList) {
          epList = [];
          showEpisodesMap.set(sid, epList);
        }
        epList.push(eid);
      }
    }
  }

  const nextMap = new Map<number, WatchedShowSummary>();
  counts.forEach((count, showId) => {
    nextMap.set(showId, {
      showId,
      watchedCount: count,
      totalEpisodes: totalEpisodesCache.get(showId),
    });
  });

  return {
    episodeSet,
    showEpisodesMap,
    showOrder,
    nextMap,
  };
}

export function WatchedProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient() as any;
  const [watchedRecords, setWatchedRecords] = useState<WatchedRecord[]>([]);
  const [watchedMap, setWatchedMap] = useState<Map<number, WatchedShowSummary>>(new Map());
  const [isLoaded, setIsLoaded] = useState(false);

  // Derived state refs & state for synchronous lookups
  const recordsRef = useRef<WatchedRecord[]>([]);
  const [watchedEpisodeSet, setWatchedEpisodeSet] = useState<Set<number>>(new Set());
  const [showEpisodesMap, setShowEpisodesMap] = useState<Map<number, number[]>>(new Map());
  const [watchedShowIds, setWatchedShowIds] = useState<number[]>([]);

  // Apply records and update all derived structures
  const applyRecords = useCallback((records: WatchedRecord[]) => {
    recordsRef.current = records;
    setWatchedRecords(records);

    const derived = buildDerivedData(records);
    setWatchedEpisodeSet(derived.episodeSet);
    setShowEpisodesMap(derived.showEpisodesMap);
    setWatchedShowIds(derived.showOrder);
    setWatchedMap(derived.nextMap);
  }, []);

  // Fetch watched records ONCE, with in-flight deduplication
  const fetchWatchedData = useCallback(async (force = false): Promise<WatchedRecord[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        memoryCacheRecords = [];
        memoryCacheUserId = null;
        applyRecords([]);
        setIsLoaded(true);
        return [];
      }

      // Return memory cache if already fetched for this user and not forced
      if (!force && memoryCacheRecords && memoryCacheUserId === user.id) {
        applyRecords(memoryCacheRecords);
        setIsLoaded(true);
        return memoryCacheRecords;
      }

      // Deduplicate concurrent in-flight fetches
      if (activeFetchPromise && !force) {
        const records = await activeFetchPromise;
        applyRecords(records);
        setIsLoaded(true);
        return records;
      }

      activeFetchPromise = (async () => {
        let allRecords: WatchedRecord[] = [];
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
            for (let i = 0; i < data.length; i++) {
              const row = data[i];
              allRecords.push({
                show_id: Number(row.show_id),
                episode_id: Number(row.episode_id),
                created_at: row.created_at || new Date().toISOString(),
              });
            }
            if (data.length < pageSize) {
              hasMore = false;
            } else {
              page++;
            }
          }
        }

        memoryCacheRecords = allRecords;
        memoryCacheUserId = user.id;
        return allRecords;
      })();

      const finalRecords = await activeFetchPromise;
      activeFetchPromise = null;

      applyRecords(finalRecords);
      setIsLoaded(true);

      // Lazy-load missing totalEpisodes in background for watched shows
      const missingTotalIds = Array.from(new Set(finalRecords.map(r => r.show_id))).filter(
        (id) => !totalEpisodesCache.has(id)
      );

      if (missingTotalIds.length > 0) {
        Promise.all(
          missingTotalIds.slice(0, 20).map(async (id) => {
            try {
              const details = await getShowDetailsLite(String(id));
              const released = getReleasedEpisodeCount(details);
              if (released > 0) {
                totalEpisodesCache.set(id, released);
              }
            } catch {
              // ignore background fetch error
            }
          })
        ).then(() => {
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

      return finalRecords;
    } catch (err) {
      console.error('Error in WatchedProvider fetchWatchedData:', err);
      activeFetchPromise = null;
      setIsLoaded(true);
      return [];
    }
  }, [supabase, applyRecords]);

  // Initial load on mount
  useEffect(() => {
    fetchWatchedData();

    // Listen to real-time custom events when episodes are marked/unmarked externally
    const handleWatchedUpdate = (e: any) => {
      // If event was triggered by our own optimistic mutation, skip DB re-fetch
      if (e?.detail?.fromWatchedProvider) return;
      fetchWatchedData(true);
    };

    window.addEventListener('binger:watched-updated', handleWatchedUpdate);
    return () => {
      window.removeEventListener('binger:watched-updated', handleWatchedUpdate);
    };
  }, [fetchWatchedData]);

  // Public async method to get records, waiting for in-flight fetch if necessary
  const getWatchedRecords = useCallback(async (): Promise<WatchedRecord[]> => {
    if (isLoaded && memoryCacheRecords) {
      return memoryCacheRecords;
    }
    return fetchWatchedData();
  }, [isLoaded, fetchWatchedData]);

  // Optimistic Toggle Episode
  const toggleWatchedEpisode = useCallback(async (
    showId: number | string,
    episodeId: number,
    isAlreadyWatched?: boolean
  ): Promise<boolean> => {
    const numShowId = Number(showId);
    const numEpId = Number(episodeId);
    if (!numShowId || !numEpId) return false;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const previousRecords = [...recordsRef.current];
    const currentlyWatched = isAlreadyWatched !== undefined 
      ? isAlreadyWatched 
      : watchedEpisodeSet.has(numEpId);

    let nextRecords: WatchedRecord[];

    if (currentlyWatched) {
      // Remove episode
      nextRecords = previousRecords.filter(r => Number(r.episode_id) !== numEpId);
    } else {
      // Add episode
      nextRecords = [
        { show_id: numShowId, episode_id: numEpId, created_at: new Date().toISOString() },
        ...previousRecords
      ];
    }

    // Apply optimistic update immediately
    memoryCacheRecords = nextRecords;
    applyRecords(nextRecords);

    // Broadcast event with internal flag
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('binger:watched-updated', {
        detail: { showId: numShowId, episodeId: numEpId, action: currentlyWatched ? 'remove' : 'add', fromWatchedProvider: true }
      }));
    }

    try {
      if (currentlyWatched) {
        const { error } = await supabase
          .from('watched')
          .delete()
          .eq('user_id', user.id)
          .eq('show_id', numShowId)
          .eq('episode_id', numEpId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('watched')
          .upsert([{
            user_id: user.id,
            show_id: numShowId,
            episode_id: numEpId
          }], { onConflict: 'user_id, episode_id' });

        if (error) throw error;
      }
      return true;
    } catch (err) {
      console.error('Optimistic toggleWatchedEpisode failed, rolling back:', err);
      memoryCacheRecords = previousRecords;
      applyRecords(previousRecords);
      return false;
    }
  }, [supabase, watchedEpisodeSet, applyRecords]);

  // Optimistic Toggle / Mark Season Episodes
  const toggleSeasonEpisodes = useCallback(async (
    showId: number | string,
    episodeIds: number[],
    action: 'mark' | 'unmark'
  ): Promise<boolean> => {
    const numShowId = Number(showId);
    if (!numShowId || !episodeIds || episodeIds.length === 0) return false;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const previousRecords = [...recordsRef.current];
    const epIdSet = new Set(episodeIds.map(Number));

    let nextRecords: WatchedRecord[];

    if (action === 'unmark') {
      nextRecords = previousRecords.filter(r => !epIdSet.has(Number(r.episode_id)));
    } else {
      const existingEpIds = new Set(previousRecords.map(r => Number(r.episode_id)));
      const newItems: WatchedRecord[] = episodeIds
        .filter(id => !existingEpIds.has(Number(id)))
        .map(id => ({
          show_id: numShowId,
          episode_id: Number(id),
          created_at: new Date().toISOString()
        }));

      nextRecords = [...newItems, ...previousRecords];
    }

    memoryCacheRecords = nextRecords;
    applyRecords(nextRecords);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('binger:watched-updated', {
        detail: { showId: numShowId, action, fromWatchedProvider: true }
      }));
    }

    try {
      if (action === 'unmark') {
        const { error } = await supabase
          .from('watched')
          .delete()
          .eq('user_id', user.id)
          .eq('show_id', numShowId)
          .in('episode_id', episodeIds);

        if (error) throw error;
      } else {
        const insertRows = episodeIds.map(id => ({
          user_id: user.id,
          show_id: numShowId,
          episode_id: Number(id)
        }));

        // Batch in 500 if large
        for (let i = 0; i < insertRows.length; i += 500) {
          const chunk = insertRows.slice(i, i + 500);
          const { error } = await supabase
            .from('watched')
            .upsert(chunk, { onConflict: 'user_id, episode_id' });

          if (error) throw error;
        }
      }
      return true;
    } catch (err) {
      console.error('Optimistic toggleSeasonEpisodes failed, rolling back:', err);
      memoryCacheRecords = previousRecords;
      applyRecords(previousRecords);
      return false;
    }
  }, [supabase, applyRecords]);

  // Synchronous helpers
  const isEpisodeWatched = useCallback((episodeId: number | string | undefined): boolean => {
    if (!episodeId) return false;
    return watchedEpisodeSet.has(Number(episodeId));
  }, [watchedEpisodeSet]);

  const getShowWatchedEpisodes = useCallback((showId: number | string | undefined): number[] => {
    if (!showId) return [];
    return showEpisodesMap.get(Number(showId)) || [];
  }, [showEpisodesMap]);

  const isShowWatched = useCallback((showId: number | string | undefined): boolean => {
    if (!showId) return false;
    return (showEpisodesMap.get(Number(showId))?.length || 0) > 0;
  }, [showEpisodesMap]);

  const getShowProgress = useCallback(
    (showId: number | string | undefined, showOrTotal?: number | Partial<TMDBShow>): WatchedShowProgress => {
      if (!showId) return defaultProgress;
      const numId = Number(showId);
      if (!numId) return defaultProgress;

      const summary = watchedMap.get(numId);
      if (!summary || summary.watchedCount <= 0) {
        return defaultProgress;
      }

      let passedTotal = 0;
      if (typeof showOrTotal === 'object' && showOrTotal !== null) {
        passedTotal = getReleasedEpisodeCount(showOrTotal);
      } else if (typeof showOrTotal === 'number' && showOrTotal > 0) {
        passedTotal = showOrTotal;
      }

      const cachedTotal = totalEpisodesCache.get(numId) || summary.totalEpisodes || 0;
      const total = cachedTotal > 0 && passedTotal > 0
        ? Math.min(passedTotal, cachedTotal)
        : (passedTotal || cachedTotal || 0);

      if (total > 0) {
        const clampedWatched = Math.min(summary.watchedCount, total);
        const progress = Math.min(100, Math.round((clampedWatched / total) * 100));
        const isCompleted = progress >= 100;
        return {
          isWatched: true,
          watchedCount: clampedWatched,
          totalEpisodes: total,
          progress,
          isCompleted,
        };
      }

      if (!totalEpisodesCache.has(numId)) {
        totalEpisodesCache.set(numId, 0);
        getShowDetailsLite(String(numId)).then((details) => {
          const released = getReleasedEpisodeCount(details);
          if (released > 0) {
            totalEpisodesCache.set(numId, released);
            setWatchedMap((prev) => {
              const prevItem = prev.get(numId);
              if (prevItem) {
                const updated = new Map(prev);
                updated.set(numId, { ...prevItem, totalEpisodes: released });
                return updated;
              }
              return prev;
            });
          }
        }).catch(() => {});
      }

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
    refreshWatched: () => fetchWatchedData(true).then(() => {}),
    watchedRecords,
    watchedShowIds,
    watchedEpisodeSet,
    isEpisodeWatched,
    getShowWatchedEpisodes,
    isShowWatched,
    getWatchedRecords,
    toggleWatchedEpisode,
    toggleSeasonEpisodes,
  }), [
    watchedMap,
    isLoaded,
    getShowProgress,
    fetchWatchedData,
    watchedRecords,
    watchedShowIds,
    watchedEpisodeSet,
    isEpisodeWatched,
    getShowWatchedEpisodes,
    isShowWatched,
    getWatchedRecords,
    toggleWatchedEpisode,
    toggleSeasonEpisodes,
  ]);

  return (
    <WatchedContext.Provider value={contextValue}>
      {children}
    </WatchedContext.Provider>
  );
}

export function useWatched() {
  return useContext(WatchedContext);
}
