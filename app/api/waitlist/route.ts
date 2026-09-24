import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { validateIranPhoneNumber } from '@/lib/validation/phone';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

const PRELAUNCH_FILE = path.join(process.cwd(), 'data', 'prelaunch-users.json');

const WaitlistSchema = z.object({
  phone: z.string().min(1, 'شماره تماس الزامی است'),
  username: z.string().optional(),
  redeemCode: z.string().optional(),
  consent: z.literal(true, {
    message: 'موافقت با دریافت پیامک اطلاع‌رسانی الزامی است',
  }),
});

interface PrelaunchUser {
  id: number;
  phone: string;
  username: string;
  redeem_code: string;
  invites_count: number;
  avatar: string;
  created_at: string;
}

function getStoredUsers(): PrelaunchUser[] {
  try {
    if (fs.existsSync(PRELAUNCH_FILE)) {
      const content = fs.readFileSync(PRELAUNCH_FILE, 'utf-8');
      return JSON.parse(content) as PrelaunchUser[];
    }
  } catch (err) {
    console.error('Error reading prelaunch file:', err);
  }
  return [];
}

function saveStoredUsers(users: PrelaunchUser[]) {
  try {
    const dir = path.dirname(PRELAUNCH_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PRELAUNCH_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing prelaunch file:', err);
  }
}

interface RateLimitTracker {
  count: number;
  resetAt: number;
}
const ipRateLimits = new Map<string, RateLimitTracker>();
const phoneCooldowns = new Map<string, number>();

const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 10;
const PHONE_COOLDOWN_MS = 30 * 1000;

export async function GET() {
  try {
    const users = getStoredUsers();
    
    // Sort descending by invites_count, then by created_at
    const sorted = [...users].sort((a, b) => {
      if (b.invites_count !== a.invites_count) {
        return b.invites_count - a.invites_count;
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    const leaderboard = sorted.slice(0, 25).map((u, index) => ({
      rank: index + 1,
      username: u.username,
      avatar: u.avatar || '🎬',
      redeem_code: u.redeem_code,
      invites_count: u.invites_count,
      phone_masked: u.phone.slice(0, 4) + '***' + u.phone.slice(-4),
      prize: index < 3 ? '۶ ماه اشتراک رایگان' : index < 13 ? '۳ ماه اشتراک + بج پرمیوم' : 'بج پرمیوم',
    }));

    const totalRegistered = users.length;
    const remainingVipSlots = Math.max(0, 50 - totalRegistered);

    return NextResponse.json({
      success: true,
      totalRegistered,
      remainingVipSlots,
      leaderboard,
    });
  } catch (err) {
    console.error('Leaderboard API error:', err);
    return NextResponse.json({ error: 'خطا در بارگذاری جدول رده‌بندی' }, { status: 500 });
  }
}

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
          { error: 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی بعد تلاش کنید.' },
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
        { error: 'لطفاً کمی صبر کنید و دوباره تلاش کنید.' },
        { status: 429 }
      );
    }
    phoneCooldowns.set(normalizedPhone, now);

    const supabase = await createClient();

    // 1. Insert phone into Supabase waitlist table
    const { error: dbError } = await supabase
      .from('waitlist')
      .insert({ phone: normalizedPhone });

    const existingUsers = getStoredUsers();
    const existingUser = existingUsers.find(u => u.phone === normalizedPhone);

    if (dbError) {
      // 23505 = unique_violation
      if (dbError.code === '23505' || dbError.message.includes('unique') || dbError.message.includes('duplicate')) {
        return NextResponse.json({
          status: 'already_registered',
          message: 'این شماره تماس قبلاً در لیست انتظار ثبت شده است.',
          redeemCode: existingUser?.redeem_code || 'BINGER-VIP',
          username: existingUser?.username,
          invitesCount: existingUser?.invites_count || 0,
        }, { status: 409 });
      }

      console.error('Waitlist insertion error:', dbError);
      return NextResponse.json({ error: 'خطا در ثبت اطلاعات در لیست انتظار' }, { status: 500 });
    }

    // 2. Prepare user details
    const rawUsername = (parsed.data.username || '').trim();
    const cleanedUsername = rawUsername
      ? rawUsername.replace(/[^\w\u0600-\u06FF]/g, '_').slice(0, 20)
      : `Binger_${Math.floor(1000 + Math.random() * 9000)}`;

    const codeSuffix = cleanedUsername
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 8) || 'VIP';

    const personalRedeemCode = `BINGER-${codeSuffix}-${Math.floor(100 + Math.random() * 899)}`;

    const CINEMATIC_AVATARS = ['🎬', '🍿', '🕶️', '👑', '🎩', '🔥', '⚡', '🏆', '💎', '🚀'];
    const randomAvatar = CINEMATIC_AVATARS[Math.floor(Math.random() * CINEMATIC_AVATARS.length)];

    // 3. Handle Referral Code if provided
    const inputRefCode = (parsed.data.redeemCode || '').trim().toUpperCase();
    if (inputRefCode) {
      const inviterIndex = existingUsers.findIndex(u => u.redeem_code.toUpperCase() === inputRefCode);
      if (inviterIndex !== -1) {
        existingUsers[inviterIndex].invites_count += 1;
      }
    }

    // 4. Save new user record
    const newUserRecord: PrelaunchUser = {
      id: Date.now(),
      phone: normalizedPhone,
      username: cleanedUsername,
      redeem_code: personalRedeemCode,
      invites_count: 0,
      avatar: randomAvatar,
      created_at: new Date().toISOString(),
    };

    existingUsers.push(newUserRecord);
    saveStoredUsers(existingUsers);

    const totalCount = existingUsers.length;
    const isEarlyAdopter = totalCount <= 50;
    const remainingVipSlots = Math.max(0, 50 - totalCount);

    return NextResponse.json({
      success: true,
      message: isEarlyAdopter
        ? 'تبریک! شما جزو ۵۰ نفر اول شدید و بج طلایی Early Adopter VIP دریافت کردید! 🎉'
        : 'تبریک! جایگاه و یوزرنیم شما با موفقیت رزرو شد! 🚀',
      username: cleanedUsername,
      redeemCode: personalRedeemCode,
      isEarlyAdopter,
      remainingVipSlots,
    });
  } catch (err: unknown) {
    console.error('Waitlist API error:', err);
    return NextResponse.json({ error: 'خطای غیرمنتظره در ثبت نام' }, { status: 500 });
  }
}
