import { NextRequest, NextResponse } from 'next/server';

// Server-only TMDB configuration
const TMDB_API_KEY = process.env.TMDB_API_KEY?.trim() || 'f474d12230f4cf16e1cabdd5d2b59cf8';
const TMDB_BASE_URL = (process.env.TMDB_BASE_URL || 'https://empty-frog-082d.prafooseh.workers.dev/3').replace(/\/+$/, '');

// Rate limiting in-memory store (sliding window per IP)
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 600; // 600 requests per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    // Opportunistic cleanup
    if (rateLimitMap.size > 2000) {
      for (const [k, v] of rateLimitMap.entries()) {
        if (now > v.resetAt) rateLimitMap.delete(k);
      }
    }
    return false;
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  entry.count++;
  return false;
}

// ==========================================
// IN-MEMORY LRU CACHE IMPLEMENTATION
// ==========================================
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class InProcessLRUCache<T> {
  private readonly max: number;
  private readonly cache = new Map<string, CacheEntry<T>>();

  constructor(max = 3000) {
    this.max = max;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Refresh LRU order (delete & re-insert)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  set(key: string, data: T, ttlMs: number): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.max) {
      // Evict least recently used item (the oldest insertion in Map)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  get size(): number {
    return this.cache.size;
  }
}

// Preserve cache across Next.js dev reloads via globalThis
const globalForCache = globalThis as unknown as {
  __bingerTmdbLruCache?: InProcessLRUCache<any>;
};
const tmdbLruCache = globalForCache.__bingerTmdbLruCache || new InProcessLRUCache<any>(3000);
if (process.env.NODE_ENV !== 'production') {
  globalForCache.__bingerTmdbLruCache = tmdbLruCache;
}

// TTL determination helper
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;      // 7 days for standard show & season details
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;         // 12 hours for trending, airing & discover data
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;             // 6 hours for search queries

function getTtlForPath(fullPath: string): { ttlMs: number; cacheControlHeader: string } {
  // 1. Search queries (6 hours)
  if (fullPath.startsWith('search/')) {
    return {
      ttlMs: SIX_HOURS_MS,
      cacheControlHeader: 'public, max-age=21600, stale-while-revalidate=43200',
    };
  }

  // 2. Trending, airing & discover queries (12 hours)
  if (
    fullPath.startsWith('trending/') ||
    fullPath.startsWith('discover/') ||
    fullPath === 'tv/on_the_air' ||
    fullPath === 'tv/top_rated' ||
    fullPath === 'movie/now_playing' ||
    fullPath === 'movie/popular' ||
    fullPath === 'movie/top_rated' ||
    fullPath === 'movie/upcoming'
  ) {
    return {
      ttlMs: TWELVE_HOURS_MS,
      cacheControlHeader: 'public, max-age=43200, stale-while-revalidate=86400',
    };
  }

  // 3. Standard static show details, seasons, episodes, credits, people, similar, recommendations (7 days)
  return {
    ttlMs: SEVEN_DAYS_MS,
    cacheControlHeader: 'public, max-age=604800, stale-while-revalidate=1209600',
  };
}

// Strict path allowlist validation
const ALLOWED_PATH_PATTERNS = [
  // TV endpoints
  /^trending\/tv\/week$/,
  /^discover\/tv$/,
  /^search\/tv$/,
  /^tv\/on_the_air$/,
  /^tv\/top_rated$/,
  /^tv\/\d+$/,
  /^tv\/\d+\/credits$/,
  /^tv\/\d+\/season\/\d+$/,
  /^tv\/\d+\/season\/\d+\/episode\/\d+$/,
  /^tv\/\d+\/recommendations$/,
  /^tv\/\d+\/similar$/,
  /^tv\/\d+\/reviews$/,

  // Movie endpoints
  /^trending\/movie\/week$/,
  /^trending\/movie\/day$/,
  /^discover\/movie$/,
  /^search\/movie$/,
  /^search\/multi$/,
  /^movie\/now_playing$/,
  /^movie\/popular$/,
  /^movie\/top_rated$/,
  /^movie\/upcoming$/,
  /^movie\/\d+$/,
  /^movie\/\d+\/credits$/,
  /^movie\/\d+\/recommendations$/,
  /^movie\/\d+\/similar$/,
  /^movie\/\d+\/reviews$/,

  // Person
  /^person\/\d+$/,
];

function isPathAllowed(pathSegments: string[]): boolean {
  const fullPath = pathSegments.join('/');
  // Prevent directory traversal or suspicious tokens
  if (fullPath.includes('..') || fullPath.includes('\\') || fullPath.includes('//')) {
    return false;
  }
  return ALLOWED_PATH_PATTERNS.some((pattern) => pattern.test(fullPath));
}

// Allowed query parameter keys
const ALLOWED_QUERY_PARAMS = new Set([
  'page',
  'language',
  'query',
  'sort_by',
  'with_genres',
  'without_genres',
  'with_origin_country',
  'with_original_language',
  'vote_count.gte',
  'vote_average.gte',
  'first_air_date.gte',
  'first_air_date.lte',
  'air_date.gte',
  'air_date.lte',
  'primary_release_date.gte',
  'primary_release_date.lte',
  'release_date.gte',
  'release_date.lte',
  'primary_release_year',
  'append_to_response',
  'with_keywords',
  'with_type',
]);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  try {
    const { path } = await context.params;
    if (!path || !Array.isArray(path) || path.length === 0) {
      return NextResponse.json({ error: 'مسیر نامعتبر است' }, { status: 400 });
    }

    if (!isPathAllowed(path)) {
      return NextResponse.json({ error: 'مسیر درخواست‌شده در دسترس نیست' }, { status: 403 });
    }

    const fullPath = path.join('/');

    // IP extraction for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown-ip';

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    // Build safe upstream URL and normalized cache key
    const searchParams = request.nextUrl.searchParams;
    const sanitizedParams = new URLSearchParams();

    // Injected server-side only for upstream call
    sanitizedParams.set('api_key', TMDB_API_KEY);

    // Collect and sort query params for canonical cache key
    const cacheParams = new URLSearchParams();
    const sortedKeys = Array.from(searchParams.keys()).sort();

    for (const key of sortedKeys) {
      if (ALLOWED_QUERY_PARAMS.has(key)) {
        const value = searchParams.get(key) || '';
        if (value.length <= 200) {
          sanitizedParams.set(key, value);
          cacheParams.set(key, value);
        }
      }
    }

    const cacheKey = `${fullPath}?${cacheParams.toString()}`;
    const { ttlMs, cacheControlHeader } = getTtlForPath(fullPath);

    // 1. FAST PATH: Check In-Memory LRU Cache (HIT)
    const cachedData = tmdbLruCache.get(cacheKey);
    if (cachedData !== null) {
      return NextResponse.json(cachedData, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': cacheControlHeader,
        },
      });
    }

    // 2. SLOW PATH: Fetch from upstream (MISS)
    const upstreamUrl = `${TMDB_BASE_URL}/${fullPath}?${sanitizedParams.toString()}`;

    // 8-second timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const upstreamRes = await fetch(upstreamUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Binger/1.0',
        },
      });

      clearTimeout(timeoutId);

      if (!upstreamRes.ok) {
        return NextResponse.json(
          { error: 'خطا در دریافت اطلاعات از سرور فیلم و سریال' },
          { status: upstreamRes.status >= 500 ? 502 : upstreamRes.status }
        );
      }

      const data = await upstreamRes.json();

      // Store in In-Memory LRU Cache with specified TTL
      tmdbLruCache.set(cacheKey, data, ttlMs);

      return NextResponse.json(data, {
        headers: {
          'X-Cache': 'MISS',
          'Cache-Control': cacheControlHeader,
        },
      });
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId);
      if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
        return NextResponse.json({ error: 'زمان اتصال به سرور فیلم و سریال به پایان رسید' }, { status: 504 });
      }
      throw fetchErr;
    }
  } catch (error: unknown) {
    console.error('TMDB Gateway Error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'خطای داخلی در پردازش درخواست' }, { status: 500 });
  }
}
