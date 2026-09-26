import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateIranPhoneNumber } from '@/lib/validation/phone';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { phone, code } = body;

    const masterCode = process.env.MASTER_LOGIN_CODE || '18160';

    // اعتبارسنجی کد اختصاصی (پشتیبانی از ۱۸۱۶۰ و ۰۱۸۱۶۰)
    const cleanCode = typeof code === 'string' ? code.trim() : '';
    if (cleanCode !== masterCode && cleanCode !== `0${masterCode}`) {
      return NextResponse.json(
        { error: 'کد وارد شده معتبر نیست.' },
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
      console.error('Missing Supabase Service Role Key configuration');
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
      console.error('Admin listUsers error:', listError);
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
          console.error('Failed to create user:', createError);
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
        console.error('Failed to update user password:', updateError);
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

    let { data: loginData, error: loginError } = await client.auth.signInWithPassword({
      phone: normalizedWithPlus,
      password: deterministicPassword,
    });

    if (loginError || !loginData?.session) {
      // تلاش مجدد بدون کاراکتر +
      const retry = await client.auth.signInWithPassword({
        phone: normalizedDigits,
        password: deterministicPassword,
      });
      loginData = retry.data;
      loginError = retry.error;
    }

    if (loginError || !loginData?.session) {
      console.error('Failed to generate session:', loginError);
      return NextResponse.json(
        { error: loginError?.message || 'خطا در صدور نشست ورود.' },
        { status: 500 }
      );
    }

    const isOnboarded = Boolean(
      loginData.user?.user_metadata?.onboarding_complete
    );

    return NextResponse.json({
      success: true,
      session: loginData.session,
      user: loginData.user,
      isOnboarded,
    });
  } catch (err: any) {
    console.error('Master login route error:', err);
    return NextResponse.json(
      { error: err?.message || 'خطای غیرمنتظره در سرور.' },
      { status: 500 }
    );
  }
}
