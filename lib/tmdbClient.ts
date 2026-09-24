// Binger TMDB Client
// All requests are routed through the secure server-only TMDB gateway (/api/tmdb/...)
// No secret API keys are bundled or exposed to the client.

export interface TMDBShow {
  id: number;
  name: string;
  original_name?: string;
  overview?: string;
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

const liteDetailsCache = new Map<string, TMDBShow>();

function getBaseApiUrl(): string {
  if (typeof window !== 'undefined') {
    return '/api/tmdb';
  }
  // Server-side fallback for internal fetch
  const host = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
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
export const getImageUrl = (path: string | null): string => {
  if (!path) return '/placeholder.png';
  return `https://white-disk-01cc.prafooseh.workers.dev/t/p/w500${path}`;
};

export const getBackdropUrl = (path: string | null): string => {
  if (!path) return '';
  return `https://white-disk-01cc.prafooseh.workers.dev/t/p/original${path}`;
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

// 4. Show Details
export const getShowDetails = async (id: string): Promise<TMDBShow | null> => {
  const showEn = await fetchFromGateway<TMDBShow>(`tv/${id}`, { language: 'en-US' });
  if (!showEn) return null;

  try {
    const showFa = await fetchFromGateway<TMDBShow>(`tv/${id}`, { language: 'fa-IR' });
    if (showFa?.overview && showFa.overview.trim() !== '') {
      showEn.overview = showFa.overview;
    }
  } catch {
    // English fallback is preserved
  }

  return showEn;
};

// 5. Season Details
export const getSeasonDetails = async (id: string, seasonNumber: number): Promise<TMDBSeason | null> => {
  const dataFa = await fetchFromGateway<TMDBSeason>(`tv/${id}/season/${seasonNumber}`, { language: 'fa-IR' });
  if (dataFa && dataFa.episodes && dataFa.episodes.length > 0 && !dataFa.episodes[0].overview) {
    const dataEn = await fetchFromGateway<TMDBSeason>(`tv/${id}/season/${seasonNumber}`, { language: 'en-US' });
    return dataEn || dataFa;
  }
  return dataFa;
};

// 6. Episode Details
export const getEpisodeDetails = async (showId: string, seasonNum: string, episodeNum: string): Promise<TMDBEpisode | null> => {
  return await fetchFromGateway<TMDBEpisode>(`tv/${showId}/season/${seasonNum}/episode/${episodeNum}`, {
    language: 'en-US',
    append_to_response: 'credits,images',
  });
};

// 7. Person Details
export const getPersonDetails = async (id: string): Promise<TMDBPerson | null> => {
  const data = await fetchFromGateway<TMDBPerson>(`person/${id}`, {
    language: 'fa-IR',
    append_to_response: 'tv_credits',
  });
  if (!data) return null;

  if (!data.biography || !data.biography.trim()) {
    const fallback = await fetchFromGateway<TMDBPerson>(`person/${id}`, {
      language: 'en-US',
      append_to_response: 'tv_credits',
    });
    if (fallback) {
      data.biography = fallback.biography || '';
      data.tv_credits = data.tv_credits || fallback.tv_credits;
    }
  }

  return data;
};

// 8. Global Airing Shows
export const getGlobalAiringShows = async (): Promise<TMDBShow[]> => {
  try {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 90);

    const todayStr = today.toISOString().split('T')[0];
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const [p1, p2, p3] = await Promise.all([
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
      fetchFromGateway<{ results: TMDBShow[] }>('discover/tv', {
        language: 'en-US',
        sort_by: 'popularity.desc',
        'air_date.gte': todayStr,
        'air_date.lte': futureDateStr,
        page: 3,
      }),
    ]);

    const combinedData = [...(p1?.results || []), ...(p2?.results || []), ...(p3?.results || [])];
    const uniqueMap = new Map<number, TMDBShow>();
    combinedData.forEach((s) => {
      if (!uniqueMap.has(s.id)) uniqueMap.set(s.id, s);
    });

    const detailedShows = await Promise.all(
      Array.from(uniqueMap.keys()).map((id) => getShowDetails(String(id)))
    );

    return detailedShows.filter(
      (s): s is TMDBShow =>
        Boolean(s && s.next_episode_to_air && new Date(s.next_episode_to_air.air_date) >= new Date() && s.poster_path)
    );
  } catch (err) {
    console.error('Global Airing Shows Error:', err);
    return [];
  }
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

export const getTopRatedShows = async (page: number = 1): Promise<TMDBShow[]> => {
  const data = await fetchFromGateway<{ results: TMDBShow[] }>('tv/top_rated', {
    language: 'en-US',
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
  const data = await fetchFromGateway<{ results: TMDBShow[] }>('discover/tv', {
    language: 'en-US',
    sort_by: 'popularity.desc',
    with_keywords: '155986|210024|242|10183',
    page,
  });
  if (data?.results && data.results.length >= 5) {
    return data.results.filter((s) => Boolean(s.poster_path));
  }
  const fallback = await fetchFromGateway<{ results: TMDBShow[] }>('discover/tv', {
    language: 'en-US',
    sort_by: 'popularity.desc',
    with_genres: '18,10765',
    'vote_count.gte': 50,
    page,
  });
  return (fallback?.results || []).filter((s) => Boolean(s.poster_path));
};

export const getMiniSeries = async (page: number = 1): Promise<TMDBShow[]> => {
  const data = await fetchFromGateway<{ results: TMDBShow[] }>('discover/tv', {
    language: 'en-US',
    sort_by: 'vote_average.desc',
    with_type: 1,
    'vote_count.gte': 200,
    page,
  });
  return (data?.results || []).filter((s) => Boolean(s.poster_path));
};