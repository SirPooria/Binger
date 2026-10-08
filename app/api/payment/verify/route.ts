import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cirdpdixhxhdsgldfpav.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * روت تأیید نهایی پرداخت زیبال (Zibal Payment Verification Callback)
 * کاربر پس از انجام عملیات پرداخت در درگاه زیبال، به این آدرس هدایت می‌شود.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trackId = searchParams.get('trackId');
  const success = searchParams.get('success');
  const status = searchParams.get('status');

  // تعیین دامنه اصلی برنامه برای ریدایرکت
  const host = request.headers.get('host') || 'localhost:3001';
  const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;

  // اگر شناسه تراکنش وجود نداشته باشد یا کاربر پرداخت را لغو کرده باشد
  if (!trackId || success !== '1') {
    console.warn('[Payment Verify] Payment canceled or missing trackId:', { trackId, success, status });

    if (trackId && serviceRoleKey) {
      const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
      await adminSupabase
        .from('transactions')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('track_id', trackId);
    }

    return NextResponse.redirect(`${baseUrl.replace(/\/$/, '')}/vip/failed?trackId=${trackId || ''}&reason=canceled`);
  }

  try {
    const merchant = process.env.ZIBAL_MERCHANT_ID || '686062d5a45c720018dd0102';

    // استعلام و تأیید تراکنش از سرور زیبال
    const verifyResponse = await fetch('https://gateway.zibal.ir/v1/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        merchant,
        trackId,
      }),
      cache: 'no-store',
    });

    const verifyData = await verifyResponse.json();
    console.log('[Payment Verify] Zibal response:', verifyData);

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

    // بررسی وضعیت موفقیت در زیبال
    // نتایج موفق: 1 (پرداخت شده و تایید شده)، 2 (تایید شده قبلی)، 100 (با موفقیت تایید شد)، 201 (قبلاً تایید شده)
    const isSuccess =
      verifyData.result === 1 ||
      verifyData.result === 2 ||
      verifyData.result === 100 ||
      verifyData.result === 201;

    if (isSuccess) {
      const refNumber = String(verifyData.refNumber || verifyData.ref_number || trackId);

      // ۱. یافتن اطلاعات تراکنش
      const { data: tx, error: txFetchErr } = await adminSupabase
        .from('transactions')
        .select('*')
        .eq('track_id', trackId)
        .maybeSingle();

      if (txFetchErr || !tx) {
        console.error('[Payment Verify] Transaction record not found or error:', { trackId, txFetchErr });
        return NextResponse.redirect(`${baseUrl.replace(/\/$/, '')}/vip/failed?trackId=${trackId}&reason=invalid_transaction`);
      }

      // دفاع در برابر Replay Attack: اگر تراکنش قبلاً با موفقیت پردازش شده، بدون شارژ مجدد ریدایرکت شود
      if (tx.status === 'success') {
        console.log('[Payment Verify] Transaction was already verified (idempotent):', trackId);
        const redirectUrl = new URL(`${baseUrl.replace(/\/$/, '')}/vip/success`);
        redirectUrl.searchParams.set('trackId', trackId);
        redirectUrl.searchParams.set('refNumber', tx.ref_number || refNumber);
        if (tx.plan_type) redirectUrl.searchParams.set('plan', tx.plan_type);
        redirectUrl.searchParams.set('replayed', 'true');
        return NextResponse.redirect(redirectUrl.toString());
      }

      // بررسی تطابق مبلغ پرداختی با مبلغ ثبت‌شده در دیتابیس (جلوگیری از دستکاری مبلغ)
      if (verifyData.amount && tx.amount && Number(verifyData.amount) !== Number(tx.amount)) {
        console.error('[Payment Verify] Amount mismatch tampering detected:', {
          expected: tx.amount,
          received: verifyData.amount,
        });
        await adminSupabase
          .from('transactions')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('track_id', trackId);
        return NextResponse.redirect(`${baseUrl.replace(/\/$/, '')}/vip/failed?trackId=${trackId}&reason=amount_mismatch`);
      }

      // ۲. بروزرسانی تراکنش به وضعیت موفق
      await adminSupabase
        .from('transactions')
        .update({
          status: 'success',
          ref_number: refNumber,
          updated_at: new Date().toISOString(),
        })
        .eq('track_id', trackId);

      // ۳. فعال‌سازی اکانت VIP برای کاربر در جدول profiles
      if (tx.user_id) {
        // خواندن وضعیت فعلی پروفایل کاربر برای محاسبه تمدید دقیق
        const { data: currentProfile } = await adminSupabase
          .from('profiles')
          .select('is_vip, vip_until')
          .eq('id', tx.user_id)
          .maybeSingle();

        const now = new Date();
        const existingUntil = currentProfile?.vip_until ? new Date(currentProfile.vip_until) : null;
        // اگر هنوز اشتراک دارد، روزهای جدید به انتهای اشتراک فعلی اضافه می‌شود
        const baseDate = existingUntil && existingUntil > now ? existingUntil : now;

        const additionalDays = tx.plan_type === 'yearly' ? 365 : 30;
        const newVipUntil = new Date(baseDate.getTime() + additionalDays * 24 * 60 * 60 * 1000);

        const { error: profileUpdateErr } = await adminSupabase
          .from('profiles')
          .update({
            is_vip: true,
            vip_until: newVipUntil.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', tx.user_id);

        if (profileUpdateErr) {
          console.error('[Payment Verify] Error updating user profile to VIP:', profileUpdateErr);
        } else {
          console.log(`[Payment Verify] User ${tx.user_id} upgraded to VIP until ${newVipUntil.toISOString()}`);
        }
      }

      // ریدایرکت به صفحه موفقیت با اطلاعات تراکنش
      const redirectUrl = new URL(`${baseUrl.replace(/\/$/, '')}/vip/success`);
      redirectUrl.searchParams.set('trackId', trackId);
      redirectUrl.searchParams.set('refNumber', refNumber);
      if (tx?.plan_type) {
        redirectUrl.searchParams.set('plan', tx.plan_type);
      }

      return NextResponse.redirect(redirectUrl.toString());
    } else {
      // در صورت عدم تأیید توسط زیبال
      console.warn('[Payment Verify] Zibal verification failed:', verifyData);

      await adminSupabase
        .from('transactions')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('track_id', trackId);

      const failUrl = new URL(`${baseUrl.replace(/\/$/, '')}/vip/failed`);
      failUrl.searchParams.set('trackId', trackId);
      failUrl.searchParams.set('code', String(verifyData.result || ''));
      failUrl.searchParams.set('message', verifyData.message || 'پرداخت ناموفق بود.');

      return NextResponse.redirect(failUrl.toString());
    }
  } catch (error: any) {
    console.error('[Payment Verify] Unhandled verification error:', error);
    return NextResponse.redirect(
      `${baseUrl.replace(/\/$/, '')}/vip/failed?trackId=${trackId || ''}&error=${encodeURIComponent(
        error?.message || 'خطای غیرمنتظره'
      )}`
    );
  }
}
