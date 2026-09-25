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
  userId: z.string().optional(),
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
const MAX_PER_WINDOW = 30;
const PHONE_COOLDOWN_MS = 15 * 1000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkUsername = searchParams.get('check_username')?.trim();
    const phoneParam = searchParams.get('phone')?.trim() || searchParams.get('user_phone')?.trim();

    const users = getStoredUsers();

    // 0. Query specific user status by phone
    if (searchParams.has('user_phone') && phoneParam) {
      const normalizedPhone = validateIranPhoneNumber(phoneParam).normalizedPhone || phoneParam;
      const found = users.find(u => u.phone === normalizedPhone);
      if (found) {
        return NextResponse.json({
          success: true,
          user: found,
        });
      } else {
        return NextResponse.json({ success: false, message: 'کاربر در لیست پیش‌ثبت‌نام یافت نشد' }, { status: 404 });
      }
    }

    // 1. Live username availability check endpoint
    if (checkUsername) {
      const cleanTarget = checkUsername.toLowerCase();
      const normalizedPhone = phoneParam ? (validateIranPhoneNumber(phoneParam).normalizedPhone || phoneParam) : null;
      
      // Check in prelaunch list
      const takenInPrelaunch = users.some(u => {
        if (normalizedPhone && u.phone === normalizedPhone) {
          return false; // Their own handle
        }
        return u.username.toLowerCase() === cleanTarget;
      });

      if (takenInPrelaunch) {
        return NextResponse.json({
          available: false,
          message: 'این نام کاربری قبلاً رزرو شده است.',
        });
      }

      // Check in Supabase profiles
      try {
        const supabase = await createClient();
        const { data: dbProfile } = await supabase
          .from('profiles')
          .select('id, username, phone')
          .ilike('username', checkUsername)
          .limit(1)
          .maybeSingle();

        if (dbProfile && dbProfile.username) {
          const isSelf = normalizedPhone && dbProfile.phone === normalizedPhone;
          if (!isSelf) {
            return NextResponse.json({
              available: false,
              message: 'این نام کاربری قبلاً توسط کاربر دیگری در سامانه ثبت شده است.',
            });
          }
        }
      } catch (err) {
        console.error('Error checking profile username in supabase:', err);
      }

      return NextResponse.json({
        available: true,
        message: 'این نام کاربری آزاد و قابل رزرو است ✓',
      });
    }

    // 2. Default Leaderboard response
    const sorted = [...users].sort((a, b) => {
      if (b.invites_count !== a.invites_count) {
        return b.invites_count - a.invites_count;
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    const leaderboard = sorted.slice(0, 50).map((u, index) => ({
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
    const takenUsernames = Array.from(new Set(users.map(u => u.username.trim()).filter(Boolean)));

    return NextResponse.json({
      success: true,
      totalRegistered,
      remainingVipSlots,
      leaderboard,
      takenUsernames,
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

    // 2. Prepare user details and check username uniqueness
    const rawUsername = (parsed.data.username || '').trim();
    if (rawUsername) {
      const cleanTarget = rawUsername.toLowerCase();
      const isTaken = existingUsers.some(
        u => u.phone !== normalizedPhone && u.username.toLowerCase() === cleanTarget
      );
      if (isTaken) {
        return NextResponse.json({
          error: 'این نام کاربری قبلاً رزرو شده است. لطفاً یک نام کاربری دیگر انتخاب کنید.'
        }, { status: 400 });
      }

      // Check Supabase profiles
      const { data: dbProfile } = await supabase
        .from('profiles')
        .select('id, username, phone')
        .ilike('username', rawUsername)
        .limit(1)
        .maybeSingle();

      if (dbProfile) {
        const isSelf = (parsed.data.userId && dbProfile.id === parsed.data.userId) || 
                       (dbProfile.phone && dbProfile.phone === normalizedPhone);
        if (!isSelf) {
          return NextResponse.json({
            error: 'این نام کاربری قبلاً توسط کاربر دیگری در بینجر انتخاب شده است.'
          }, { status: 400 });
        }
      }
    }

    const cleanedUsername = rawUsername
      ? rawUsername.replace(/[^\w\u0600-\u06FF]/g, '_').slice(0, 20)
      : (existingUser?.username || `Binger_${Math.floor(1000 + Math.random() * 9000)}`);

    const codeSuffix = cleanedUsername
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 8) || 'VIP';

    const personalRedeemCode = `BINGER-${codeSuffix}-${Math.floor(100 + Math.random() * 899)}`;

    // If already registered in waitlist or prelaunch: update handle if provided and return updated data
    if (existingUser) {
      let finalUsername = existingUser.username;
      let finalRedeemCode = existingUser.redeem_code;

      if (rawUsername && rawUsername.toLowerCase() !== existingUser.username.toLowerCase()) {
        existingUser.username = cleanedUsername;
        existingUser.redeem_code = personalRedeemCode;
        finalUsername = cleanedUsername;
        finalRedeemCode = personalRedeemCode;
        saveStoredUsers(existingUsers);
      }

      // Update Supabase profile if userId is provided
      if (parsed.data.userId) {
        await supabase
          .from('profiles')
          .update({
            username: finalUsername,
            phone: normalizedPhone,
            is_vip: existingUser.id <= 50,
          })
          .eq('id', parsed.data.userId);
      }

      return NextResponse.json({
        success: true,
        alreadyRegistered: true,
        message: rawUsername 
          ? 'تبریک! جایگاه و نام کاربری انتخابی شما با موفقیت در بینجر رزرو و ثبت شد! 🚀'
          : 'این شماره تماس قبلاً در لیست انتظار و بینجر ثبت شده است.',
        redeemCode: finalRedeemCode,
        username: finalUsername,
        invitesCount: existingUser.invites_count,
        isEarlyAdopter: existingUser.id <= 50,
        remainingVipSlots: Math.max(0, 50 - existingUsers.length),
      });
    }

    const CINEMATIC_AVATARS = ['🎬', '🍿', '🕶️', '👑', '🎩', '🔥', '⚡', '🏆', '💎', '🚀'];
    const randomAvatar = CINEMATIC_AVATARS[Math.floor(Math.random() * CINEMATIC_AVATARS.length)];

    const totalCount = existingUsers.length + 1;
    const isEarlyAdopter = totalCount <= 50;

    // 3. Update Supabase profiles table if userId is present
    if (parsed.data.userId) {
      const updateData: Record<string, unknown> = {
        username: cleanedUsername,
        phone: normalizedPhone,
      };
      if (isEarlyAdopter) {
        updateData.is_vip = true;
      }
      const { error: profileErr } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', parsed.data.userId);

      if (profileErr) {
        console.error('Supabase profile update warning:', profileErr);
      }
    }

    // 4. Handle Referral Code if provided
    const inputRefCode = (parsed.data.redeemCode || '').trim().toUpperCase();
    if (inputRefCode) {
      const inviterIndex = existingUsers.findIndex(u => u.redeem_code.toUpperCase() === inputRefCode);
      if (inviterIndex !== -1) {
        existingUsers[inviterIndex].invites_count += 1;
      }
    }

    // 5. Save new user record
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

    const remainingVipSlots = Math.max(0, 50 - existingUsers.length);

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
