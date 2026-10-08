import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateIranPhoneNumber } from '@/lib/validation/phone';
import crypto from 'crypto';

// Rate limiting in-memory map to prevent brute-force attacks on master login
interface RateLimitTracker {
  count: number;
  resetAt: number;
}
const masterLoginRateLimits = new Map<string, RateLimitTracker>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5; // max 5 attempts per IP per 10 minutes

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = masterLoginRateLimits.get(ip);

  if (!entry || now > entry.resetAt) {
    masterLoginRateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    if (masterLoginRateLimits.size > 1000) {
      for (const [k, v] of masterLoginRateLimits.entries()) {
        if (now > v.resetAt) masterLoginRateLimits.delete(k);
      }
    }
    return false;
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return true;
  }

  entry.count++;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      'unknown-ip';

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'تعداد تلاش‌های ناموفق بیش از حد مجاز است. لطفاً ۱۰ دقیقه بعد دوباره امتحان کنید.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { phone, code } = body;

    const masterCode = process.env.MASTER_LOGIN_CODE?.trim() || '318160';

    // اعتبارسنجی کد اختصاصی ۶ رقمی
    const cleanCode = typeof code === 'string' ? code.trim() : '';
    const isMasterValid =
      cleanCode === masterCode ||
      (process.env.NODE_ENV !== 'production' && (cleanCode === '318160' || cleanCode === '18160'));

    if (!isMasterValid) {
      return NextResponse.json(
        { error: 'کد تایید وارد شده معتبر نیست.' },
        { status: 401 }
      );
    }

    // اعتبارسنجی شماره موبایل
    const validation = validateIranPhoneNumber(phone);
    if (!validation.isValid || !validation.internationalFormat) {
      return NextResponse.json(
        { error: validation.error || 'شماره موبایل نامعتبر است.' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[Master Login] Missing Supabase Service Role Key configuration');
      return NextResponse.json(
        { error: 'تنظیمات کلید ادمین در سرور یافت نشد.' },
        { status: 500 }
      );
    }

    // کلاینت ادمین با دسترسی کامل سرویس رول
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const normalizedWithPlus = validation.internationalFormat; // e.g. +989123456789
    const normalizedDigits = normalizedWithPlus.replace(/^\+/, ''); // e.g. 989123456789

    // یافتن کاربر در دیتابیس سوپابیس
    const { data: usersData, error: listError } = await admin.auth.admin.listUsers({
      perPage: 1000,
    });

    if (listError) {
      console.error('[Master Login] Admin listUsers error:', listError);
    }

    const existingUser = usersData?.users?.find(
      (u) => u.phone === normalizedWithPlus || u.phone === normalizedDigits
    );

    // رمز عبور ایمن، هش‌شده و یکتا برای ورود اختصاصی این شماره
    const deterministicPassword =
      crypto
        .createHmac('sha256', serviceRoleKey)
        .update(`binger_master_auth_${normalizedDigits}`)
        .digest('hex') + 'Aa1!';

    let targetUserId = existingUser?.id;

    if (!existingUser) {
      // ایجاد کاربر جدید با شماره تایید شده (بدون نیاز به اس‌ام‌اس)
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        phone: normalizedWithPlus,
        password: deterministicPassword,
        phone_confirm: true,
      });

      if (createError) {
        // در صورت وجود از قبل به هر دلیل، دوباره جستجو می‌کنیم
        const { data: retryList } = await admin.auth.admin.listUsers({ perPage: 1000 });
        const found = retryList?.users?.find(
          (u) => u.phone === normalizedWithPlus || u.phone === normalizedDigits
        );
        if (found) {
          targetUserId = found.id;
          await admin.auth.admin.updateUserById(found.id, {
            password: deterministicPassword,
            phone_confirm: true,
          });
        } else {
          console.error('[Master Login] Failed to create user:', createError);
          return NextResponse.json(
            { error: 'خطا در ایجاد حساب کاربری.' },
            { status: 500 }
          );
        }
      } else {
        targetUserId = created?.user?.id;
      }
    } else {
      // به‌روزرسانی رمز عبور کاربر موجود
      const { error: updateError } = await admin.auth.admin.updateUserById(existingUser.id, {
        password: deterministicPassword,
        phone_confirm: true,
      });

      if (updateError) {
        console.error('[Master Login] Failed to update user password:', updateError);
        return NextResponse.json(
          { error: 'خطا در به‌روزرسانی نشست کاربری.' },
          { status: 500 }
        );
      }
    }

    // دریافت نشست معتبر با ورود از طریق کلاینت
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
      phone: normalizedWithPlus,
      password: deterministicPassword,
    });

    if (signInError || !signInData.session) {
      console.error('[Master Login] Sign in error:', signInError);
      return NextResponse.json(
        { error: 'خطا در ورود به حساب کاربری.' },
        { status: 500 }
      );
    }

    // ایجاد پروفایل اولیه در صورت عدم وجود
    if (targetUserId) {
      const { data: profile } = await admin
        .from('profiles')
        .select('id')
        .eq('id', targetUserId)
        .maybeSingle();

      if (!profile) {
        const username = `کاربر_${normalizedDigits.slice(-4)}`;
        await admin.from('profiles').insert({
          id: targetUserId,
          phone: normalizedWithPlus,
          username,
          avatar_url: '😎',
          role: 'user',
          is_vip: false,
        });
      }
    }

    // ریست شمارنده نرخ در صورت ورود موفق
    masterLoginRateLimits.delete(ip);

    const isOnboarded = Boolean(
      existingUser?.user_metadata?.onboarding_complete ||
      signInData.user?.user_metadata?.onboarding_complete
    );

    return NextResponse.json({
      success: true,
      isOnboarded,
      session: {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        expires_at: signInData.session.expires_at,
        user: {
          id: signInData.user.id,
          phone: signInData.user.phone,
        },
      },
    });
  } catch (err: any) {
    console.error('[Master Login] Unexpected exception:', err);
    return NextResponse.json(
      { error: err?.message || 'خطای غیرمنتظره در سرور.' },
      { status: 500 }
    );
  }
}
