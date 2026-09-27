// Binger TMDB Client
// All requests are routed through the secure server-only TMDB gateway (/api/tmdb/...)
// No secret API keys are bundled or exposed to the client.

import { createBrowserClient } from '@supabase/ssr';

export interface TMDBShow {
  id: number;
  name: string;
  name_en?: string;
  name_fa?: string;
  original_name?: string;
  overview?: string;
  overview_en?: string;
  overview_fa?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average?: number;
  vote_count?: number;
  first_air_date?: string;
  genre_ids?: number[];
  origin_country?: string[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  genres?: { id: number; name: string }[];
  status?: string;
  tagline?: string;
  next_episode_to_air?: {
    id: number;
    name: string;
    air_date: string;
    episode_number: number;
    season_number: number;
  } | null;
  episode_run_time?: number[];
  created_by?: {
    id: number;
    name: string;
    profile_path: string | null;
  }[];
  networks?: {
    id: number;
    name: string;
    logo_path: string | null;
  }[];
  credits?: {
    cast: {
      id: number;
      name: string;
      character?: string;
      profile_path: string | null;
      order?: number;
    }[];
    crew: {
      id: number;
      name: string;
      job?: string;
      department?: string;
      profile_path: string | null;
    }[];
  };
  seasons?: {
    id: number;
    name: string;
    season_number: number;
    episode_count: number;
    poster_path: string | null;
    air_date?: string;
  }[];
}

export interface TMDBEpisode {
  id: number;
  name: string;
  overview?: string;
  air_date?: string;
  episode_number: number;
  season_number: number;
  still_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  runtime?: number;
}

export interface TMDBSeason {
  id: number;
  name: string;
  season_number: number;
  overview?: string;
  poster_path: string | null;
  episodes: TMDBEpisode[];
}

export interface TMDBPerson {
  id: number;
  name: string;
  biography?: string;
  profile_path?: string | null;
  known_for_department?: string;
  tv_credits?: {
    cast?: (TMDBShow & { character?: string })[];
    crew?: TMDBShow[];
  };
}

export interface TMDBReview {
  id: string;
  author: string;
  content: string;
  created_at: string;
  author_details?: {
    rating?: number | null;
    avatar_path?: string | null;
  };
}

/**
 * Calculates the total number of episodes that have actually aired/released to date.
 * Excludes:
 * - Specials (season_number === 0)
 * - Future seasons whose air_date is in the future
 * - Unannounced / unreleased seasons with no air_date on continuing shows
 * - Future episodes of an in-progress season (if next_episode_to_air is in the future)
 */
export function getReleasedEpisodeCount(show: Partial<TMDBShow> | null | undefined): number {
  if (!show) return 0;

  const now = new Date();
  const nowTime = now.getTime();

  if (show.seasons && Array.isArray(show.seasons) && show.seasons.length > 0) {
    const nextEp = show.next_episode_to_air;
    const nextEpAirTime = nextEp?.air_date ? new Date(nextEp.air_date).getTime() : null;
    const isNextEpInFuture = nextEpAirTime !== null && nextEpAirTime > nowTime;

    let releasedCount = 0;
    const isEnded = show.status === 'Ended' || show.status === 'Canceled';

    for (const season of show.seasons) {
      if (!season || season.season_number === 0) continue;
      const epCount = season.episode_count || 0;
      if (epCount <= 0) continue;

      if (season.air_date) {
        const seasonAirTime = new Date(season.air_date).getTime();
        if (seasonAirTime > nowTime) {
          // Future season that hasn't aired yet (e.g. Stick Season 2)
          continue;
        }

        // Season air_date is in past or today. Check if only some episodes have aired:
        if (isNextEpInFuture && nextEp && nextEp.season_number === season.season_number) {
          const airedInThisSeason = Math.max(0, nextEp.episode_number - 1);
          releasedCount += Math.min(epCount, airedInThisSeason);
        } else {
          releasedCount += epCount;
        }
      } else {
        // Season has no air_date
        if (isEnded) {
          releasedCount += epCount;
        } else if (season.season_number === 1 && show.first_air_date) {
          const firstAirTime = new Date(show.first_air_date).getTime();
          if (firstAirTime <= nowTime) {
            releasedCount += epCount;
          }
        }
      }
    }

    if (releasedCount > 0) {
      return releasedCount;
    }
  }

  // Fallback: If seasons array not available or calculated 0, use number_of_episodes
  return show.number_of_episodes || 0;
}

const liteDetailsCache = new Map<string, TMDBShow>();

function getBaseApiUrl(): string {
  if (typeof window !== 'undefined') {
    return '/api/tmdb';
  }
  // Server-side fallback for internal fetch
  const port = process.env.PORT || '3001';
  const host = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`;
  return `${host}/api/tmdb`;
}

async function fetchFromGateway<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T | null> {
  try {
    const searchParams = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        searchParams.set(k, String(v));
      }
    }
    const queryStr = searchParams.toString();
    const url = `${getBaseApiUrl()}/${path}${queryStr ? `?${queryStr}` : ''}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch (error) {
    console.error(`TMDB Gateway client error (${path}):`, error);
    return null;
  }
}

// 1. Image URL builders (pure CDN URLs, no secrets required)
export type TMDBPosterSize = 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original';
export type TMDBBackdropSize = 'w300' | 'w780' | 'w1280' | 'original';
export type TMDBStillSize = 'w92' | 'w185' | 'w300' | 'original';
export type TMDBProfileSize = 'w45' | 'w185' | 'h632' | 'original';

const TMDB_CDN_BASE = 'https://white-disk-01cc.prafooseh.workers.dev/t/p';

/**
 * Generates optimized poster image URLs.
 * Default is w342 (crisp on mobile and desktop card grids with ~50% lower weight than w500).
 * Never serves raw/original sizes to prevent bandwidth waste.
 */
export const getImageUrl = (path: string | null, size: TMDBPosterSize = 'w342'): string => {
  if (!path) return '/placeholder.png';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const effectiveSize = size === 'original' ? 'w500' : size;
  return `${TMDB_CDN_BASE}/${effectiveSize}${cleanPath}`;
};

/**
 * Generates optimized backdrop image URLs.
 * Default is w1280 (high definition for hero backdrops, saving 90%+ bandwidth compared to multi-megabyte /original/).
 */
export const getBackdropUrl = (path: string | null, size: TMDBBackdropSize = 'w1280'): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const effectiveSize = size === 'original' ? 'w1280' : size;
  return `${TMDB_CDN_BASE}/${effectiveSize}${cleanPath}`;
};

/**
 * Generates optimized episode screenshot / still image URLs.
 * Default is w300.
 */
export const getStillUrl = (path: string | null, size: TMDBStillSize = 'w300'): string => {
  if (!path) return '/placeholder.png';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const effectiveSize = size === 'original' ? 'w300' : size;
  return `${TMDB_CDN_BASE}/${effectiveSize}${cleanPath}`;
};

/**
 * Generates optimized cast / crew profile avatar URLs.
 * Default is w185.
 */
export const getProfileUrl = (path: string | null, size: TMDBProfileSize = 'w185'): string => {
  if (!path) return '/placeholder.png';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const effectiveSize = size === 'original' ? 'w185' : size;
  return `${TMDB_CDN_BASE}/${effectiveSize}${cleanPath}`;
};

// 2. Trending & Popular Shows
export const getTrendingShows = async (page: number = 1): Promise<TMDBShow[]> => {
  const data = await fetchFromGateway<{ results: TMDBShow[] }>('trending/tv/week', {
    language: 'en-US',
    page,
  });
  return data?.results || [];
};

export const getPopularShows = async (page: number = 1): Promise<TMDBShow[]> => {
  const data = await fetchFromGateway<{ results: TMDBShow[] }>('discover/tv', {
    language: 'en-US',
    sort_by: 'vote_count.desc',
    page,
    'vote_count.gte': 1000,
  });
  return data?.results || [];
};

// 3. Search
export const searchShows = async (query: string): Promise<TMDBShow[]> => {
  if (!query || !query.trim()) return [];
  const data = await fetchFromGateway<{ results: TMDBShow[] }>('search/tv', {
    language: 'en-US',
    query: query.trim(),
  });
  return data?.results || [];
};

// Supabase client helper (modular & fail-safe across server, client, and test environments)
function getSupabaseClient() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return null;
    }
    return createBrowserClient(supabaseUrl, supabaseAnonKey) as any;
  } catch {
    return null;
  }
}

// 7-day TTL for Database Mirroring of TV show metadata
export const SHOW_DB_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// 4. Show Details (Database Mirroring + Concurrent dual-language fetch)
export const getShowDetails = async (id: string): Promise<TMDBShow | null> => {
  const numId = Number(id);

  // --- Step A: Query Supabase cached_shows by ID (Instant Cache Hit) ---
  if (!isNaN(numId)) {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data: row, error } = await supabase
          .from('cached_shows')
          .select('data, updated_at')
          .eq('id', numId)
          .maybeSingle();

        if (!error && row && row.data) {
          const updatedAt = row.updated_at ? new Date(row.updated_at).getTime() : 0;
          const isFresh = Date.now() - updatedAt < SHOW_DB_CACHE_TTL_MS;
          if (isFresh) {
            return row.data as TMDBShow;
          }
        }
      }
    } catch (dbErr) {
      // Non-blocking fail-safe: log warning and proceed to TMDB fetch
      console.warn(`[getShowDetails] Supabase cache read skipped for show ${id}:`, dbErr);
    }
  }

  // --- Step B: If not found (or too old), fetch from TMDB concurrently ---
  const [showEn, showFa] = await Promise.all([
    fetchFromGateway<TMDBShow>(`tv/${id}`, { language: 'en-US' }).catch(() => null),
    fetchFromGateway<TMDBShow>(`tv/${id}`, { language: 'fa-IR' }).catch(() => null),
  ]);

  const baseShow = showEn || showFa;
  if (!baseShow) return null;

  // Preserve English metadata for dual-language display / fallbacks
  if (showEn) {
    baseShow.name_en = showEn.name;
    baseShow.overview_en = showEn.overview;
  }

  // Preserve Persian metadata and apply Persian overview if available
  if (showFa) {
    baseShow.name_fa = showFa.name;
    baseShow.overview_fa = showFa.overview;

    if (showFa.overview && showFa.overview.trim() !== '') {
      baseShow.overview = showFa.overview;
    }
  }

  // --- Step C: Asynchronously UPSERT this new data into cached_shows (Background) ---
  if (!isNaN(numId)) {
    (async () => {
      try {
        const supabase = getSupabaseClient();
        if (supabase) {
          await supabase
            .from('cached_shows')
            .upsert(
              {
                id: numId,
                data: baseShow,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'id' }
            );
        }
      } catch (upsertErr) {
        // Fail-safe: DB failure should never break the client application
        console.warn(`[getShowDetails] Background cache upsert failed for show ${id}:`, upsertErr);
      }
    })();
  }

  return baseShow;
};

const seasonCacheMap = new Map<string, TMDBSeason>();

// 5. Season Details (Concurrent dual-language fetch)
export const getSeasonDetails = async (id: string, seasonNumber: number): Promise<TMDBSeason | null> => {
  const cacheKey = `${id}_${seasonNumber}`;
  if (seasonCacheMap.has(cacheKey)) {
    return seasonCacheMap.get(cacheKey)!;
  }

  const [dataFa, dataEn] = await Promise.all([
    fetchFromGateway<TMDBSeason>(`tv/${id}/season/${seasonNumber}`, { language: 'fa-IR' }).catch(() => null),
    fetchFromGateway<TMDBSeason>(`tv/${id}/season/${seasonNumber}`, { language: 'en-US' }).catch(() => null),
  ]);

  let result = dataFa;
  if (dataFa && dataFa.episodes && dataFa.episodes.length > 0 && !dataFa.episodes[0].overview) {
    result = dataEn || dataFa;
  } else if (!dataFa) {
    result = dataEn;
  }

  if (result) {
    seasonCacheMap.set(cacheKey, result);
  }
  return result;
};

// 6. Episode Details
export const getEpisodeDetails = async (showId: string, seasonNum: string, episodeNum: string): Promise<TMDBEpisode | null> => {
  return await fetchFromGateway<TMDBEpisode>(`tv/${showId}/season/${seasonNum}/episode/${episodeNum}`, {
    language: 'en-US',
    append_to_response: 'credits,images',
  });
};

// 7. Person Details (Concurrent dual-language fetch)
export const getPersonDetails = async (id: string): Promise<TMDBPerson | null> => {
  const [dataFa, dataEn] = await Promise.all([
    fetchFromGateway<TMDBPerson>(`person/${id}`, {
      language: 'fa-IR',
      append_to_response: 'tv_credits',
    }).catch(() => null),
    fetchFromGateway<TMDBPerson>(`person/${id}`, {
      language: 'en-US',
      append_to_response: 'tv_credits',
    }).catch(() => null),
  ]);

  const data = dataFa || dataEn;
  if (!data) return null;

  if (!data.biography || !data.biography.trim()) {
    if (dataEn) {
      data.biography = dataEn.biography || '';
      data.tv_credits = data.tv_credits || dataEn.tv_credits;
    }
  }

  return data;
};

// 8. Global Airing Shows (24-Hour Persistent Multi-Layer Cache)
const GLOBAL_AIRING_CACHE_KEY = 'binger_global_airing_shows_cache_v2';
const GLOBAL_AIRING_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours (fetch once per day)

interface GlobalAiringCacheEntry {
  timestamp: number;
  data: TMDBShow[];
}

let memoryGlobalAiringCache: GlobalAiringCacheEntry | null = null;
let globalAiringFetchPromise: Promise<TMDBShow[]> | null = null;

function readStoredGlobalAiring(): TMDBShow[] | null {
  const now = Date.now();

  // 1. Check in-process RAM cache
  if (memoryGlobalAiringCache && (now - memoryGlobalAiringCache.timestamp < GLOBAL_AIRING_TTL_MS)) {
    return memoryGlobalAiringCache.data;
  }

  // 2. Check localStorage in browser
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(GLOBAL_AIRING_CACHE_KEY);
      if (stored) {
        const parsed: GlobalAiringCacheEntry = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.data) && (now - parsed.timestamp < GLOBAL_AIRING_TTL_MS)) {
          memoryGlobalAiringCache = parsed;
          return parsed.data;
        }
      }
    } catch {
      // Storage unavailable or quota exceeded
    }
  }

  return null;
}

function writeStoredGlobalAiring(data: TMDBShow[]): void {
  const entry: GlobalAiringCacheEntry = {
    timestamp: Date.now(),
    data,
  };
  memoryGlobalAiringCache = entry;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(GLOBAL_AIRING_CACHE_KEY, JSON.stringify(entry));
    } catch {
      // Storage unavailable or quota exceeded
    }
  }
}

export const getGlobalAiringShows = async (): Promise<TMDBShow[]> => {
  // 1. FAST PATH: Return cached result instantly if valid (< 24h)
  const cached = readStoredGlobalAiring();
  if (cached && cached.length > 0) {
    return cached;
  }

  // 2. Prevent duplicate concurrent fetches
  if (globalAiringFetchPromise) {
    return globalAiringFetchPromise;
  }

  globalAiringFetchPromise = (async () => {
    try {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + 90);

      const todayStr = today.toISOString().split('T')[0];
      const futureDateStr = futureDate.toISOString().split('T')[0];

      // Fetch top popular airing candidates (at most 2 pages instead of 3)
      const [p1, p2] = await Promise.all([
        fetchFromGateway<{ results: TMDBShow[] }>('discover/tv', {
          language: 'en-US',
          sort_by: 'popularity.desc',
          'air_date.gte': todayStr,
          'air_date.lte': futureDateStr,
          page: 1,
        }),
        fetchFromGateway<{ results: TMDBShow[] }>('discover/tv', {
          language: 'en-US',
          sort_by: 'popularity.desc',
          'air_date.gte': todayStr,
          'air_date.lte': futureDateStr,
          page: 2,
        }),
      ]);

      const candidates = [...(p1?.results || []), ...(p2?.results || [])];
      const uniqueCandidateIds: number[] = [];
      const seen = new Set<number>();

      for (const s of candidates) {
        if (s && s.id && !seen.has(s.id) && s.poster_path) {
          seen.add(s.id);
          uniqueCandidateIds.push(s.id);
        }
      }

      // Limit to top 20 candidate shows and use getShowDetailsLite (1 single request per show + hits Step 1 server LRU cache)
      const topIds = uniqueCandidateIds.slice(0, 20);
      const detailedShows = await Promise.all(
        topIds.map((id) => getShowDetailsLite(String(id)))
      );

      const validAiringShows = detailedShows.filter(
        (s): s is TMDBShow =>
          Boolean(s && s.next_episode_to_air && new Date(s.next_episode_to_air.air_date) >= new Date() && s.poster_path)
      );

      if (validAiringShows.length > 0) {
        writeStoredGlobalAiring(validAiringShows);
      }

      return validAiringShows;
    } catch (err) {
      console.error('Global Airing Shows Error:', err);
      return [];
    } finally {
      globalAiringFetchPromise = null;
    }
  })();

  return globalAiringFetchPromise;
};

// 9. Similar & Recommendations
export const getSimilarShows = async (id: string): Promise<TMDBShow[]> => {
  const [recData, simData] = await Promise.all([
    fetchFromGateway<{ results: TMDBShow[] }>(`tv/${id}/recommendations`, { language: 'en-US', page: 1 }),
    fetchFromGateway<{ results: TMDBShow[] }>(`tv/${id}/similar`, { language: 'en-US', page: 1 }),
  ]);

  const numId = Number(id);
  const recommendations = (recData?.results || []).filter((s) => s.id !== numId);
  const similar = (simData?.results || []).filter((s) => s.id !== numId);
  const unique = new Map<number, TMDBShow>();

  [...recommendations, ...similar].forEach((s) => {
    if (s.poster_path && s.name && !unique.has(s.id)) {
      unique.set(s.id, s);
    }
  });

  return Array.from(unique.values()).slice(0, 5);
};

// 10. Curated Discoveries
export const getLatestAnime = async (): Promise<TMDBShow[]> => {
  const todayStr = new Date().toISOString().split('T')[0];
  const data = await fetchFromGateway<{ results: TMDBShow[] }>('discover/tv', {
    language: 'en-US',
    sort_by: 'first_air_date.desc',
    with_genres: 16,
    with_origin_country: 'JP',
    'air_date.lte': todayStr,
  });
  return data?.results || [];
};

export const getAsianDramas = async (): Promise<TMDBShow[]> => {
  const todayStr = new Date().toISOString().split('T')[0];
  const data = await fetchFromGateway<{ results: TMDBShow[] }>('discover/tv', {
    language: 'en-US',
    sort_by: 'first_air_date.desc',
    with_origin_country: 'KR|CN|TW',
    without_genres: 16,
    'air_date.lte': todayStr,
  });
  return data?.results || [];
};

export const getNewestGlobal = async (): Promise<TMDBShow[]> => {
  const data = await fetchFromGateway<{ results: TMDBShow[] }>('tv/on_the_air', {
    language: 'en-US',
    sort_by: 'popularity.desc',
    page: 1,
  });
  return data?.results || [];
};

export const getIranianShows = async (): Promise<TMDBShow[]> => {
  const data = await fetchFromGateway<{ results: TMDBShow[] }>('discover/tv', {
    language: 'fa-IR',
    sort_by: 'popularity.desc',
    with_origin_country: 'IR',
  });
  return (data?.results || []).filter((s) => Boolean(s.poster_path));
};

export const getNewestIranianShows = async (): Promise<TMDBShow[]> => {
  const todayStr = new Date().toISOString().split('T')[0];
  const data = await fetchFromGateway<{ results: TMDBShow[] }>('discover/tv', {
    language: 'fa-IR',
    sort_by: 'first_air_date.desc',
    with_origin_country: 'IR',
    'air_date.lte': todayStr,
  });
  return (data?.results || []).filter((s) => Boolean(s.poster_path));
};

export const getShowReviews = async (id: string): Promise<TMDBReview[]> => {
  const data = await fetchFromGateway<{ results: TMDBReview[] }>(`tv/${id}/reviews`, {
    language: 'en-US',
    page: 1,
  });
  return data?.results || [];
};

export const getShowsByGenre = async (genreId: number | null, page: number = 1): Promise<TMDBShow[]> => {
  if (genreId) {
    const data = await fetchFromGateway<{ results: TMDBShow[] }>('discover/tv', {
      with_genres: genreId,
      sort_by: 'popularity.desc',
      page,
    });
    return data?.results || [];
  }
  return getTrendingShows(page);
};

export const getRecommendations = async (showId: number): Promise<TMDBShow[]> => {
  const data = await fetchFromGateway<{ results: TMDBShow[] }>(`tv/${showId}/recommendations`, {
    language: 'en-US',
    page: 1,
  });
  return data?.results || [];
};

export const advancedDiscoverShows = async (filters: {
  genreId?: number | null;
  minRating?: number | null;
  originCountry?: string | null;
  yearFrom?: number | null;
  yearTo?: number | null;
  sortBy?: string;
  page?: number;
}): Promise<TMDBShow[]> => {
  const params: Record<string, string | number | undefined> = {
    language: 'en-US',
    page: filters.page || 1,
    sort_by: filters.sortBy || 'popularity.desc',
    'vote_count.gte': 30,
  };

  if (filters.genreId) params.with_genres = filters.genreId;
  if (filters.minRating) params['vote_average.gte'] = filters.minRating;
  if (filters.originCountry) params.with_origin_country = filters.originCountry;
  if (filters.yearFrom) params['first_air_date.gte'] = `${filters.yearFrom}-01-01`;
  if (filters.yearTo) params['first_air_date.lte'] = `${filters.yearTo}-12-31`;

  const data = await fetchFromGateway<{ results: TMDBShow[] }>('discover/tv', params);
  return data?.results || [];
};

export const getShowDetailsLite = async (id: string): Promise<TMDBShow | null> => {
  const cached = liteDetailsCache.get(id);
  if (cached) return cached;

  const data = await fetchFromGateway<TMDBShow>(`tv/${id}`, { language: 'en-US' });
  if (data) {
    liteDetailsCache.set(id, data);
  }
  return data;
};

export const getShowWithCredits = async (id: string): Promise<TMDBShow | null> => {
  const cacheKey = `credits_${id}`;
  const cached = liteDetailsCache.get(cacheKey);
  if (cached) return cached;

  const data = await fetchFromGateway<TMDBShow>(`tv/${id}`, {
    language: 'en-US',
    append_to_response: 'credits',
  });
  if (data) {
    liteDetailsCache.set(cacheKey, data);
  }
  return data;
};

const LEGENDARY_MASTERPIECE_IDS = [
  1396,  // Breaking Bad
  1399,  // Game of Thrones
  87108, // Chernobyl
  850,   // The Wire
  60059, // Better Call Saul
  1398,  // The Sopranos
  4613,  // Band of Brothers
  94605, // Arcane
  19885, // Sherlock
  60574, // Peaky Blinders
  70523, // Dark
  66732, // Stranger Things
  100088,// The Last of Us
  63351, // Narcos
  1668,  // Friends
  60625, // Rick and Morty
  246,   // Avatar: The Last Airbender
  46952, // The Blacklist
];

export const getTopRatedShows = async (page: number = 1): Promise<TMDBShow[]> => {
  // Use discover/tv with high vote count threshold (2500+) so only true global masterpieces
  // (Breaking Bad, Game of Thrones, Chernobyl, The Wire, etc.) appear at the top,
  // completely eliminating temporary obscure 2-week-old shows with low votes.
  const data = await fetchFromGateway<{ results: TMDBShow[] }>('discover/tv', {
    language: 'en-US',
    sort_by: 'vote_average.desc',
    'vote_count.gte': 2500,
    page,
  });

  const valid = (data?.results || []).filter((s) => Boolean(s.poster_path));
  if (valid.length >= 5) {
    return valid;
  }

  // Safety fallback: if discover fails or returns fewer shows, fetch legendary masterpieces
  const fallbackShows = await Promise.all(
    LEGENDARY_MASTERPIECE_IDS.map((id) => getShowDetailsLite(String(id)))
  );
  return fallbackShows.filter((s): s is TMDBShow => Boolean(s && s.poster_path));
};

export const getAnimeShows = async (page: number = 1): Promise<TMDBShow[]> => {
  // Anime: Genre 16 (Animation) with original language Japanese ('ja') & origin country JP
  // sorted by popularity to get the most trending anime worldwide (Attack on Titan, Demon Slayer, Jujutsu Kaisen, etc.)
  const data = await fetchFromGateway<{ results: TMDBShow[] }>('discover/tv', {
    language: 'en-US',
    sort_by: 'popularity.desc',
    with_genres: '16',
    with_original_language: 'ja',
    with_origin_country: 'JP',
    'vote_count.gte': 50,
    page,
  });
  return (data?.results || []).filter((s) => Boolean(s.poster_path));
};

export const getKoreanShows = async (page: number = 1): Promise<TMDBShow[]> => {
  const data = await fetchFromGateway<{ results: TMDBShow[] }>('discover/tv', {
    language: 'en-US',
    sort_by: 'popularity.desc',
    with_origin_country: 'KR',
    page,
  });
  return (data?.results || []).filter((s) => Boolean(s.poster_path));
};

export const getTeenShows = async (page: number = 1): Promise<TMDBShow[]> => {
  // TMDB Keywords: 193400 (teen drama), 6270 (high school), 296608 (teenager), 10683 (coming of age)
  // Exclude genre 16 (Animation) so it targets authentic live-action teen dramas
  const data = await fetchFromGateway<{ results: TMDBShow[] }>('discover/tv', {
    language: 'en-US',
    sort_by: 'popularity.desc',
    with_keywords: '193400|6270|296608|10683',
    without_genres: '16',
    'vote_count.gte': 40,
    page,
  });
  return (data?.results || []).filter((s) => Boolean(s.poster_path));
};

export const getMiniSeries = async (page: number = 1): Promise<TMDBShow[]> => {
  // In TMDB with_type: 2 is Miniseries (2 = Miniseries, 1 = News/Talk Show)
  const data = await fetchFromGateway<{ results: TMDBShow[] }>('discover/tv', {
    language: 'en-US',
    sort_by: 'popularity.desc',
    with_type: 2,
    'vote_count.gte': 80,
    page,
  });
  return (data?.results || []).filter((s) => Boolean(s.poster_path));
};