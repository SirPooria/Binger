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
const MAX_REQUESTS_PER_WINDOW = 120; // 120 requests per minute per IP

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

// Strict path allowlist validation
const ALLOWED_PATH_PATTERNS = [
  /^trending\/tv\/week$/,
  /^discover\/tv$/,
  /^search\/tv$/,
  /^tv\/on_the_air$/,
  /^tv\/top_rated$/,
  /^tv\/\d+$/,
  /^tv\/\d+\/season\/\d+$/,
  /^tv\/\d+\/season\/\d+\/episode\/\d+$/,
  /^tv\/\d+\/recommendations$/,
  /^tv\/\d+\/similar$/,
  /^tv\/\d+\/reviews$/,
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
  'vote_count.gte',
  'vote_average.gte',
  'first_air_date.gte',
  'first_air_date.lte',
  'air_date.gte',
  'air_date.lte',
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

    // Build safe upstream URL
    const searchParams = request.nextUrl.searchParams;
    const sanitizedParams = new URLSearchParams();

    // Injected server-side only
    sanitizedParams.set('api_key', TMDB_API_KEY);

    for (const [key, value] of searchParams.entries()) {
      if (ALLOWED_QUERY_PARAMS.has(key)) {
        // Basic length check to avoid param bloating
        if (value.length <= 200) {
          sanitizedParams.set(key, value);
        }
      }
    }

    const upstreamUrl = `${TMDB_BASE_URL}/${path.join('/')}?${sanitizedParams.toString()}`;

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
      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
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
