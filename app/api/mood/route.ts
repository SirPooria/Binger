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

    const apiKey = process.env.GROQ_API_KEY?.trim() || '';

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

interface FallbackCategory {
  keywords: string[];
  replyPrefix: string;
  titles: string[];
}

const FALLBACK_CATEGORIES: FallbackCategory[] = [
  {
    keywords: ['خنده', 'کمدی', 'طنز', 'شاد', 'فان', 'بخند', 'حال خوب', 'خوشحال', 'خنده دار'],
    replyPrefix: 'برای خندیدن از ته دل و عوض شدن حالت، این کمدی‌های شاهکار دقیقاً همون چیزی‌ان که لازم داری:',
    titles: ['Ted Lasso', 'The Office', 'Friends', 'Brooklyn Nine-Nine', 'Parks and Recreation', 'Modern Family', 'The Good Place']
  },
  {
    keywords: ['ترس', 'ترسناک', 'وحشت', 'جن', 'روح', 'زامبی', 'وحشتناک', 'ترسناک ترین'],
    replyPrefix: 'اگه دنبال بالا رفتن آدرنالین و یه وحشت روان‌شناختی جذاب هستی، این شاهکارها رو از دست نده:',
    titles: ['The Haunting of Hill House', 'Midnight Mass', 'The Walking Dead', 'Penny Dreadful', 'From', 'Stranger Things']
  },
  {
    keywords: ['جنایی', 'پلیس', 'کارآگاه', 'مافیا', 'قتل', 'تبهکار', 'گانگستر', 'دار و دسته'],
    replyPrefix: 'برای ورود به تاریک‌ترین پرونده‌های جنایی و باندهای مافیایی، این سریال‌ها میخکوب‌کننده‌ان:',
    titles: ['Mindhunter', 'Peaky Blinders', 'True Detective', 'Fargo', 'Narcos', 'The Sopranos', 'Ozark', 'The Wire']
  },
  {
    keywords: ['غم', 'غمگین', 'گریه', 'دپ', 'افسرده', 'ناراحت', 'دلتنگ', 'دارک', 'گریه دار'],
    replyPrefix: 'این سریال‌ها با عمق درام فوق‌العاده‌شون کاملاً با حال و هوات همدلی می‌کنن:',
    titles: ['BoJack Horseman', 'Chernobyl', 'After Life', 'This Is Us', 'Fleabag', 'Normal People']
  },
  {
    keywords: ['انگیزشی', 'امید', 'تلاش', 'موفقیت', 'انگیزه', 'شغل', 'هدف', 'بیزینس'],
    replyPrefix: 'برای شارژ شدن انگیزه‌ت و دیدن آدم‌هایی که تا قله پیش رفتن، سراغ این‌ها برو:',
    titles: ['Suits', 'Ted Lasso', 'Billions', "The Queen's Gambit", 'Silicon Valley', 'Mad Men']
  },
  {
    keywords: ['اکشن', 'هیجان', 'بزن بزن', 'انتقام', 'جنگ', 'آدرنالین', 'رزمی', 'نظامی'],
    replyPrefix: 'برای نهایت ضربان قلب و اکشن‌های بی‌پروای سطح جهانی، این چندتا رو حتماً ببین:',
    titles: ['The Punisher', 'Banshee', 'Reacher', 'Band of Brothers', 'The Boys', 'Daredevil', 'Warrior']
  },
  {
    keywords: ['معما', 'پیچیده', 'پازل', 'مغز', 'شوک', 'راز', 'رازآلود', 'عجیب', 'پیچش'],
    replyPrefix: 'اگه اثری می‌خوای که مغزت رو به چالش بکشه و تا ثانیه آخر درگیرت کنه، این‌ها شاهکارن:',
    titles: ['Dark', 'Severance', 'Mr. Robot', 'Westworld', 'Sherlock', 'Black Mirror', '1899']
  },
  {
    keywords: ['علمی تخیلی', 'سای فای', 'فضا', 'آینده', 'هوش مصنوعی', 'تخیلی', 'فانتزی', 'جادو'],
    replyPrefix: 'برای پرواز به دنیاهای ناشناخته و مفاهیم هیجان‌انگیز علمی‌تخیلی و فانتزی:',
    titles: ['Arcane', 'The Expanse', 'Stranger Things', 'The Mandalorian', 'The Last of Us', 'Foundation']
  },
  {
    keywords: ['عشق', 'عاشقانه', 'رمانتیسم', 'رمانتیک', 'رل', 'احساسی', 'لاو'],
    replyPrefix: 'برای حس و حال رمانتیک و عاشقانه‌های عمیق با قصه‌های به یادماندنی:',
    titles: ['Normal People', 'Outlander', 'Heartstopper', 'One Day', 'Crash Landing on You', 'Pride and Prejudice']
  },
  {
    keywords: ['انیمه', 'ژاپن', 'انیمیشن', 'کارتون'],
    replyPrefix: 'شاهکارهای بی‌همتای دنیای انیمه با داستان‌سرایی فراتر از حد انتظار:',
    titles: ['Attack on Titan', 'Demon Slayer: Kimetsu no Yaiba', 'Death Note', 'Jujutsu Kaisen', 'Vinland Saga']
  },
  {
    keywords: ['کره', 'کره ای', 'کیدراما', 'کی دراما', 'کره‌ای'],
    replyPrefix: 'برترین و پرطرفدارترین سریال‌های کره جنوبی که از تماشاشون سیر نمیشی:',
    titles: ['Squid Game', 'Crash Landing on You', 'Vincenzo', 'The Glory', 'Signal', 'All of Us Are Dead']
  },
  {
    keywords: ['تاریخ', 'تاریخی', 'قدیم', 'قرون وسطی', 'پادشاه', 'امپراتوری', 'روم'],
    replyPrefix: 'روایت‌هایی عظیم از امپراتوری‌ها، جنگ‌های خونین و نبردهای تاریخی:',
    titles: ['Game of Thrones', 'Vikings', 'The Crown', 'Rome', 'The Last Kingdom', 'Spartacus']
  },
  {
    keywords: ['کوتاه', 'مینی', 'مینی سریال', 'چند قسمتی', 'سریع'],
    replyPrefix: 'مینی‌سریال‌های کوتاه و متمرکزی که توی یک آخر هفته می‌تونی تمومشون کنی:',
    titles: ['Chernobyl', "The Queen's Gambit", 'Band of Brothers', 'Mare of Easttown', 'When They See Us']
  }
];

function getIntelligentFallbackRecommendations(message: string, watchedShows: string[]) {
  const lowerMsg = message.toLowerCase();
  const watchedSet = new Set(watchedShows.map(s => s.toLowerCase().trim()));

  let matched = FALLBACK_CATEGORIES.find(cat =>
    cat.keywords.some(kw => lowerMsg.includes(kw))
  );

  if (!matched) {
    matched = {
      keywords: [],
      replyPrefix: 'بر اساس حس و حال پیامت و آثاری که تا امروز دیدی، این شاهکارهای تماشایی رو برات چیدم:',
      titles: ['Breaking Bad', 'Better Call Saul', 'Succession', 'The Wire', 'Chernobyl', 'The Sopranos', 'Severance', 'Dark']
    };
  }

  // سریال‌هایی که کاربر قبلاً دیده را فیلتر می‌کنیم
  const unWatched = matched.titles.filter(t => !watchedSet.has(t.toLowerCase().trim()));
  const chosenTitles = (unWatched.length >= 3 ? unWatched : matched.titles).slice(0, 4);

  return {
    reply: `${matched.replyPrefix}\n(پاسخ اختصاصی از موتور دستیار بینجر متناسب با مود شما؛ سهمیه شما کسر نشد)`,
    recommended_titles: chosenTitles,
  };
}

    const CANDIDATE_MODELS = [
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'qwen/qwen3.8-27b',
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
    ];

    let groqRes: Response | null = null;
    let groqFailed = false;

    if (apiKey) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      const baseUrl = (process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/+$/, '');

      try {
        for (const modelName of CANDIDATE_MODELS) {
          try {
            const res = await fetch(`${baseUrl}/chat/completions`, {
              method: 'POST',
              signal: controller.signal,
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: modelName,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: message }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.7,
              }),
            });

            if (res.ok) {
              groqRes = res;
              break;
            }
          } catch {
            // مدل بعدی بررسی می‌شود
          }
        }
        clearTimeout(timeoutId);
      } catch (fetchErr: unknown) {
        clearTimeout(timeoutId);
        groqFailed = true;
        console.warn('Groq fetch network error, activating fallback engine:', fetchErr);
      }
    } else {
      groqFailed = true;
    }

    if (!groqRes || !groqRes.ok || groqFailed) {
      // سرور هوش مصنوعی به دلیل محدودیت آی‌پی تحریم یا خطای شبکه در دسترس نیست؛
      // سهمیه به طور کامل برگردانده می‌شود و موتور پیشنهاد هوشمند بینجر پاسخ می‌دهد
      await refundQuota();
      const fallbackResult = getIntelligentFallbackRecommendations(message, cleanWatched);
      return NextResponse.json({
        reply: fallbackResult.reply,
        recommended_titles: fallbackResult.recommended_titles,
        isVip: quota.is_vip,
        remaining: quota.remaining,
      });
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