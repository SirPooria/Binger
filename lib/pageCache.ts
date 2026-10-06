// Binger Client Page Cache
// Keeps state in memory across client-side navigations (e.g. entering a TV show and coming back)
// Prevents full re-fetches and skeleton flashing on back navigation.

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes freshness

// --- 1. Explore Page Cache ---
export interface ExploreCacheData {
  categories: {
    iranian: any[];
    trending: any[];
    topRated: any[];
    korean: any[];
    anime: any[];
    teen: any[];
    miniSeries: any[];
  };
  userCustomLists: any[];
  spotlightShow: any | null;
  spotlightReason: string;
  relatedCarousel: any | null;
  watchlistIds: Set<number>;
  watchedIds: number[];
  allShowIds: number[];
  myFeed: any[];
  timestamp: number;
}

let exploreCache: ExploreCacheData | null = null;

export function getExploreCache(): ExploreCacheData | null {
  if (!exploreCache) return null;
  return exploreCache;
}

export function hasExploreCache(): boolean {
  return exploreCache !== null && Array.isArray(exploreCache.categories?.trending) && exploreCache.categories.trending.length > 0;
}

export function setExploreCache(data: Omit<ExploreCacheData, 'timestamp'>): void {
  exploreCache = {
    ...data,
    timestamp: Date.now(),
  };
}

export function isExploreCacheStale(): boolean {
  if (!exploreCache) return true;
  return Date.now() - exploreCache.timestamp > CACHE_TTL_MS;
}

// --- 2. Dashboard Home Screen Cache ---
export interface HomeCacheData {
  currentUser: any;
  userProfile: any;
  trackedShows: any[];
  watchedRecords: any[];
  seasonEpisodesMap: Record<string, any[]>;
  globalAiringShows: any[];
  timestamp: number;
}

let homeCache: HomeCacheData | null = null;

export function getHomeCache(): HomeCacheData | null {
  if (!homeCache) return null;
  return homeCache;
}

export function hasHomeCache(): boolean {
  return homeCache !== null && (homeCache.trackedShows.length > 0 || homeCache.globalAiringShows.length > 0);
}

export function setHomeCache(data: Omit<HomeCacheData, 'timestamp'>): void {
  homeCache = {
    ...data,
    timestamp: Date.now(),
  };
}

export function isHomeCacheStale(): boolean {
  if (!homeCache) return true;
  return Date.now() - homeCache.timestamp > CACHE_TTL_MS;
}

// --- 3. My Lists Page Cache ---
export interface ListsCacheData {
  shows: any[];
  watchedStatus: any;
  myShowsCount: { completed: number; watched: number; watchlist: number };
  timestamp: number;
}

const listsCacheMap = new Map<string, ListsCacheData>();

export function getListsCache(tab: string): ListsCacheData | null {
  return listsCacheMap.get(tab) || null;
}

export function hasListsCache(tab: string): boolean {
  const cached = listsCacheMap.get(tab);
  return Boolean(cached && cached.shows && cached.shows.length >= 0);
}

export function setListsCache(tab: string, data: Omit<ListsCacheData, 'timestamp'>): void {
  listsCacheMap.set(tab, {
    ...data,
    timestamp: Date.now(),
  });
}

// --- 4. Favorites Page Cache ---
export interface FavoritesCacheData {
  favoriteShows: any[];
  watchedShows: any[];
  favoriteIds: Set<number>;
  timestamp: number;
}

let favoritesCache: FavoritesCacheData | null = null;

export function getFavoritesCache(): FavoritesCacheData | null {
  return favoritesCache;
}

export function hasFavoritesCache(): boolean {
  return favoritesCache !== null;
}

export function setFavoritesCache(data: Omit<FavoritesCacheData, 'timestamp'>): void {
  favoritesCache = {
    ...data,
    timestamp: Date.now(),
  };
}

// --- Clear All Caches ---
export function clearAllPageCaches(): void {
  exploreCache = null;
  homeCache = null;
  listsCacheMap.clear();
  favoritesCache = null;
}
