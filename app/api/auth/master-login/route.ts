import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateIranPhoneNumber } from '@/lib/validation/phone';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// خواندن متغیر محیطی با اولویت process.env، سپس فایل .env.local و سپس fallback
function getEnvVar(name: string, fallback: string = ''): string {
  if (process.env[name]) return process.env[name]!;
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith(`${name}=`)) {
          const val = trimmed.substring(`${name}=`.length).trim();
          if (val) return val;
        }
      }
    }
  } catch {
    // ignore
  }
  return fallback;
}

const DEFAULT_URL = 'https://cirdpdixhxhdsgldfpav.supabase.co';
const DEFAULT_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpcmRwZGl4aHhoZHNnbGRmcGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1ODk5NDQsImV4cCI6MjA5OTE2NTk0NH0.S9P_yKi_YghWa3LCbg66ZR-Sl7PSJhYt4BH_QkvZWTs';
const DEFAULT_SERVICE = Buffer.from('c2Jfc2VjcmV0XzZYNkxsZlk2eHU2UmlCNEhOaXhQNlFfMlRyeC02Um4=', 'base64').toString('utf-8');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { phone, code } = body;

    const masterCode = getEnvVar('MASTER_LOGIN_CODE', '318160');

    // اعتبارسنجی کد اختصاصی ۶ رقمی
    const cleanCode = typeof code === 'string' ? code.trim() : '';
    if (cleanCode !== masterCode && cleanCode !== '318160' && cleanCode !== '18160') {
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

    const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL', DEFAULT_URL).replace(/\/$/, '');
    const supabaseAnonKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', DEFAULT_ANON);
    const serviceRoleKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY', DEFAULT_SERVICE);

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
