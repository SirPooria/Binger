import type { TMDBShow } from './tmdbClient';
import type { Database } from './database.types';

export const PROFILE_CACHE_VERSION = 2;
export const PROFILE_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export interface ProfileStatsPayload {
  watchedRows: Array<{ show_id: number; episode_id: number | null; created_at: string }>;
  comments: Array<{ id: number; show_id: number | null; episode_id: number | null; parent_id: number | null; created_at: string }>;
  followingIds: string[];
  followerIds: string[];
  favoriteIds: number[];
  episodeRatings: Array<{ rating: number }>;
  commentLikeCount: number;
  savedListCount: number;
  eventTypes: string[];
}

export interface ProfileCacheData {
  version: number;
  cachedAt: number;
  profileInfo: {
    username: string;
    bio: string;
    avatar_url: string;
    is_vip: boolean;
  };
  timeStats: {
    months: number;
    days: number;
    hours: number;
  };
  totalEpisodes: number;
  socialStats: {
    followers: number;
    following: number;
    comments: number;
  };
  achievementStats: ProfileStatsPayload;
  favorites: TMDBShow[];
  watchedShows: TMDBShow[];
  customLists: Array<Database['public']['Tables']['user_lists']['Row']>;
  savedLists: Array<Database['public']['Tables']['user_lists']['Row']>;
  coverImage: string | null;
}

export function getProfileCacheKey(userId: string): string {
  return `binger_profile_v${PROFILE_CACHE_VERSION}_${userId}`;
}

export function readProfileCache(userId: string): ProfileCacheData | null {
  if (typeof window === 'undefined' || !userId) return null;

  try {
    const raw = sessionStorage.getItem(getProfileCacheKey(userId));
    if (!raw) return null;

    const data = JSON.parse(raw) as ProfileCacheData;
    if (!data || data.version !== PROFILE_CACHE_VERSION) {
      sessionStorage.removeItem(getProfileCacheKey(userId));
      return null;
    }

    const age = Date.now() - data.cachedAt;
    if (age > PROFILE_CACHE_TTL_MS) {
      sessionStorage.removeItem(getProfileCacheKey(userId));
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export function writeProfileCache(
  userId: string,
  data: Omit<ProfileCacheData, 'version' | 'cachedAt'>
): void {
  if (typeof window === 'undefined' || !userId) return;

  try {
    const payload: ProfileCacheData = {
      ...data,
      version: PROFILE_CACHE_VERSION,
      cachedAt: Date.now(),
    };
    sessionStorage.setItem(getProfileCacheKey(userId), JSON.stringify(payload));
  } catch {
    // sessionStorage quota exceeded or blocked; graceful degradation
  }
}

export function invalidateProfileCache(userId: string): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    sessionStorage.removeItem(getProfileCacheKey(userId));
  } catch {
    // ignore
  }
}

export function clearAllProfileCaches(): void {
  if (typeof window === 'undefined') return;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith('binger_profile_') || key.startsWith('binger_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => sessionStorage.removeItem(k));

    // Also clean any dev bypass cookies or localStorage keys
    const localKeysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('binger_profile_')) {
        localKeysToRemove.push(key);
      }
    }
    localKeysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

export const clearProfileCache = invalidateProfileCache;
export type CachedProfileData = ProfileCacheData;

