import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { validateIranPhoneNumber } from '@/lib/validation/phone';
import { z } from 'zod';

const WaitlistSchema = z.object({
  phone: z.string().min(1, 'شماره تماس الزامی است'),
  consent: z.literal(true, {
    message: 'موافقت با دریافت پیامک اطلاع‌رسانی الزامی است',
  }),
});

interface RateLimitTracker {
  count: number;
  resetAt: number;
}
const ipRateLimits = new Map<string, RateLimitTracker>();
const phoneCooldowns = new Map<string, number>();

const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 5;
const PHONE_COOLDOWN_MS = 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown-ip';

    const now = Date.now();
    const tracker = ipRateLimits.get(ip);
    if (tracker && now < tracker.resetAt) {
      if (tracker.count >= MAX_PER_WINDOW) {
        return NextResponse.json(
          { error: 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً چند دقیقه بعد تلاش کنید.' },
          { status: 429, headers: { 'Retry-After': '60' } }
        );
      }
      tracker.count++;
    } else {
      ipRateLimits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = WaitlistSchema.safeParse(rawBody);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || 'اطلاعات ارسالی نامعتبر است';
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const phoneValidation = validateIranPhoneNumber(parsed.data.phone);
    if (!phoneValidation.isValid) {
      return NextResponse.json({ error: phoneValidation.error || 'شماره تماس نامعتبر است' }, { status: 400 });
    }

    const normalizedPhone = phoneValidation.normalizedPhone;

    // Check cooldown for this specific phone
    const lastAttempt = phoneCooldowns.get(normalizedPhone);
    if (lastAttempt && now - lastAttempt < PHONE_COOLDOWN_MS) {
      return NextResponse.json(
        { error: 'لطفاً یک دقیقه تا تلاش مجدد صبر کنید.' },
        { status: 429 }
      );
    }
    phoneCooldowns.set(normalizedPhone, now);

    const supabase = await createClient();

    const { error } = await supabase
      .from('waitlist')
      .insert({ phone: normalizedPhone });

    if (error) {
      // 23505 = unique_violation
      if (error.code === '23505' || error.message.includes('unique') || error.message.includes('duplicate')) {
        return NextResponse.json({
          status: 'already_registered',
          message: 'این شماره تماس قبلاً در لیست انتظار ثبت شده است.',
        }, { status: 409 });
      }

      console.error('Waitlist insertion error:', error);
      return NextResponse.json({ error: 'خطا در ثبت اطلاعات در لیست انتظار' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'تبریک، جایگاه شما رزرو شد! به زودی با پیامک به شما اطلاع می‌دهیم.',
    });
  } catch (err: unknown) {
    console.error('Waitlist API error:', err);
    return NextResponse.json({ error: 'خطای غیرمنتظره در ثبت نام' }, { status: 500 });
  }
}
