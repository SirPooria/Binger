import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { z } from 'zod';

const MoodRequestSchema = z.object({
  message: z.string().trim().min(1, 'پیام نمی‌تواند خالی باشد').max(500, 'حداکثر طول مجاز پیام ۵۰۰ کاراکتر است'),
  watchedShowNames: z.array(z.string().trim().max(100)).max(50).optional().default([]),
});

// In-memory rate limiting: max 10 requests per minute per IP/user
interface MoodRateLimit {
  count: number;
  resetAt: number;
}
const moodRateLimitMap = new Map<string, MoodRateLimit>();
const MOOD_WINDOW_MS = 60 * 1000;
const MAX_MOOD_PER_WINDOW = 10;

function isMoodRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = moodRateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    moodRateLimitMap.set(key, { count: 1, resetAt: now + MOOD_WINDOW_MS });
    if (moodRateLimitMap.size > 2000) {
      for (const [k, v] of moodRateLimitMap.entries()) {
        if (now > v.resetAt) moodRateLimitMap.delete(k);
      }
    }
    return false;
  }

  if (entry.count >= MAX_MOOD_PER_WINDOW) {
    return true;
  }

  entry.count++;
  return false;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'برای استفاده از دستیار وارد شوید' }, { status: 401 });
  }

  const { data, error } = await supabase.rpc('get_mood_ai_status');
  if (error) {
    console.error('Mood AI status error:', error);
    return NextResponse.json({ error: 'وضعیت سهمیه در دسترس نیست' }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  let quotaConsumed = false;
  let supabaseClient: Awaited<ReturnType<typeof createClient>> | null = null;
  let currentUserId: string | null = null;

  const refundQuota = async () => {
    if (!quotaConsumed || !supabaseClient || !currentUserId) return;
    try {
      const { error: rpcErr } = await supabaseClient.rpc('restore_mood_ai_credit');
      if (rpcErr) {
        // Fallback direct rollback in table
        const todayStr = new Date().toISOString().slice(0, 10);
        await supabaseClient
          .from('mood_ai_usage')
          .update({ request_count: 0, updated_at: new Date().toISOString() })
          .eq('user_id', currentUserId)
          .eq('usage_date', todayStr);
      }
    } catch (err) {
      console.error('Failed to rollback Mood AI quota:', err);
    }
  };

  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      'unknown-ip';

    if (isMoodRateLimited(ip)) {
      return NextResponse.json(
        { error: 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً یک دقیقه بعد دوباره تلاش کنید.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = MoodRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'درخواست نامعتبر است';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { message, watchedShowNames } = parsed.data;

    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: 'سرویس هوش مصنوعی در حال حاضر در دسترس نیست' }, { status: 503 });
    }

    const supabase = await createClient();
    supabaseClient = supabase;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'برای استفاده از دستیار وارد شوید' }, { status: 401 });
    }
    currentUserId = user.id;

    if (isMoodRateLimited(`user_${user.id}`)) {
      return NextResponse.json(
        { error: 'تعداد پیام‌های ارسالی شما بیش از حد مجاز است. لطفاً کمی صبر کنید.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    // Check and consume quota atomically
    const { data: quotaData, error: quotaError } = await supabase.rpc('consume_mood_ai_credit');
    const quota = quotaData as { allowed: boolean; is_vip: boolean; remaining: number | null } | null;

    if (quotaError) {
      console.error('Mood AI quota error:', quotaError);
      return NextResponse.json({ error: 'سهمیه دستیار در دسترس نیست' }, { status: 500 });
    }

    if (!quota?.allowed) {
      return NextResponse.json({
        error: 'سهمیه رایگان امروز شما استفاده شده است؛ برای گفت‌وگوی نامحدود به VIP ارتقا دهید.',
        remaining: 0,
      }, { status: 429 });
    }

    quotaConsumed = true;

    // Sanitize watched show names for system prompt
    const cleanWatched = watchedShowNames
      .map((name) => name.replace(/[^\p{L}\p{N}\s\-:_]/gu, '').trim())
      .filter(Boolean)
      .slice(0, 30);

    const systemPrompt = `
You are the cinema expert assistant for the web app "Binger".
You MUST respond strictly in valid json format.

مخاطب تو یک کاربر فیلم‌باز ایرانی است.
زبان پاسخ تو در فیلد reply باید فارسی عامیانه، بسیار صمیمی، جذاب و با لحن یک دوست سینماشناس باشد.

اطلاعات کاربر:
${cleanWatched.length > 0 ? `سریال‌هایی که این کاربر قبلاً دیده: ${cleanWatched.join('، ')}` : 'کاربر هنوز سریالی ثبت نکرده است.'}

دستورالعمل‌ها:
۱. پیام کاربر را بررسی کن و متناسب با حس، ژانر یا شباهتی که خواسته ۳ تا ۵ سریال فوق‌العاده پیشنهاد بده.
۲. بسیار مهم: هرگز سریال‌هایی که کاربر قبلاً دیده را پیشنهاد نده! اگر به آن‌ها شباهت داشت، در متن reply بگو (مثلاً: چون دیدم قبلاً فلان سریال رو دیدی، سراغ این گزینه‌ها رفتم...).
۳. در بخش recommended_titles حتماً فقط نام انگلیسی اصلی و رسمی سریال‌ها در TMDB را بنویس (مثلاً: ["The Punisher", "Banshee"]).

Respond in valid json with this exact structure:
{
  "reply": "متن صمیمی و فارسی برای کاربر در ۲ تا ۳ خط همراه با دلیل کوتاه پیشنهاد",
  "recommended_titles": ["Title 1", "Title 2", "Title 3"]
}
`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let groqRes: Response;
    try {
      groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        }),
      });
      clearTimeout(timeoutId);
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId);
      await refundQuota();

      if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
        return NextResponse.json({
          error: 'پاسخگویی هوش مصنوعی بیش از حد طول کشید؛ سهمیه شما کسر نشد.',
          remaining: 1,
        }, { status: 504 });
      }

      console.error('Groq fetch error:', fetchErr);
      return NextResponse.json({
        error: 'خطا در برقراری ارتباط با سرور هوش مصنوعی؛ سهمیه شما کسر نشد.',
        remaining: 1,
      }, { status: 502 });
    }

    if (!groqRes.ok) {
      await refundQuota();
      console.error('Groq API Error status:', groqRes.status);
      return NextResponse.json({
        error: 'پاسخ معتبری از هوش مصنوعی دریافت نشد؛ سهمیه شما کسر نشد.',
        remaining: 1,
      }, { status: 502 });
    }

    const data = await groqRes.json();
    const rawContent = data?.choices?.[0]?.message?.content || '{}';

    interface AIResponse {
      reply?: string;
      recommended_titles?: string[];
    }
    let parsedContent: AIResponse = {};

    try {
      parsedContent = JSON.parse(rawContent) as AIResponse;
    } catch {
      const match = rawContent.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsedContent = JSON.parse(match[0]) as AIResponse;
        } catch {
          // fallback
        }
      }
    }

    return NextResponse.json({
      reply: parsedContent.reply || 'این گزینه‌ها متناسب با مود و حالِ الانتن:',
      recommended_titles: Array.isArray(parsedContent.recommended_titles) ? parsedContent.recommended_titles : [],
      isVip: quota.is_vip,
      remaining: quota.remaining,
    });
  } catch (error: unknown) {
    await refundQuota();
    console.error('Mood API Unexpected Error:', error);
    return NextResponse.json({
      error: 'خطای غیرمنتظره در پردازش پیشنهاد؛ سهمیه شما کسر نشد.',
      remaining: 1,
    }, { status: 500 });
  }
}