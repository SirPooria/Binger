'use server';

import { createClient } from '@/lib/supabaseServer';
import { headers } from 'next/headers';

export interface InitiatePaymentResult {
  success: boolean;
  url?: string;
  trackId?: string | number;
  error?: string;
}

/**
 * ایجاد تراکنش جدید و درخواست توکن پرداخت از درگاه زیبال
 * @param planType پلن انتخابی کاربر ('monthly' یا 'yearly')
 */
export async function initiatePayment(planType: 'monthly' | 'yearly'): Promise<InitiatePaymentResult> {
  try {
    // ۱. بررسی احراز هویت کاربر
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return {
        success: false,
        error: 'برای خرید اشتراک، لطفاً ابتدا وارد حساب کاربری خود شوید.',
      };
    }

    // ۲. اعتبارسنجی نوع پلن و تعیین مبلغ به ریال
    if (planType !== 'monthly' && planType !== 'yearly') {
      return {
        success: false,
        error: 'پلن انتخابی معتبر نیست.',
      };
    }

    // پلن ماهانه: ۱,۴۹۰,۰۰۰ ریال (۱۴۹ هزار تومان)
    // پلن سالانه: ۱۴,۹۰۰,۰۰۰ ریال (۱,۴۹۰,۰۰۰ تومان)
    const amount = planType === 'yearly' ? 14_900_000 : 1_490_000;

    // ۳. خواندن اطلاعات درگاه زیبال
    const merchant = process.env.ZIBAL_MERCHANT_ID || '686062d5a45c720018dd0102';

    // تعیین آدرس بازگشت داینامیک
    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3001';
    const proto = headersList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;
    const callbackUrl = `${baseUrl.replace(/\/$/, '')}/api/payment/verify`;

    // ۴. ثبت تراکنش در حالت انتظار (pending) در دیتابیس
    const { data: tx, error: txError } = await (supabase as any)
      .from('transactions')
      .insert({
        user_id: user.id,
        amount,
        status: 'pending',
        plan_type: planType,
      })
      .select('id')
      .single();

    if (txError || !tx) {
      console.error('[Payment] Error creating transaction record:', txError);
      return {
        success: false,
        error: 'خطا در ثبت تراکنش اولیه در سرور.',
      };
    }

    // ۵. ارسال درخواست به درگاه زیبال
    const zibalPayload = {
      merchant,
      amount,
      callbackUrl,
      description: `خرید اشتراک VIP بینجر - پلن ${planType === 'yearly' ? 'سالانه (۱۲ ماه)' : 'ماهانه (۳۰ روز)'}`,
      orderId: tx.id,
    };

    const res = await fetch('https://gateway.zibal.ir/v1/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(zibalPayload),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Payment] Zibal request HTTP error:', res.status, errText);
      await (supabase as any)
        .from('transactions')
        .update({ status: 'failed' })
        .eq('id', tx.id);
      return {
        success: false,
        error: 'خطا در ارتباط با سرور درگاه زیبال.',
      };
    }

    const data = await res.json();

    // ۶. بررسی نتیجه بازگشتی از زیبال (کد ۱۰۰ یعنی موفق)
    if (data.result === 100 && data.trackId) {
      const trackId = String(data.trackId);

      // ذخیره شناسه پیگیری در تراکنش
      await (supabase as any)
        .from('transactions')
        .update({ track_id: trackId })
        .eq('id', tx.id);

      const gatewayUrl = `https://gateway.zibal.ir/start/${trackId}`;
      return {
        success: true,
        url: gatewayUrl,
        trackId,
      };
    } else {
      console.error('[Payment] Zibal rejected request:', data);
      await (supabase as any)
        .from('transactions')
        .update({ status: 'failed' })
        .eq('id', tx.id);

      return {
        success: false,
        error: data.message || `خطا در دریافت شناسه پرداخت زیبال (کد: ${data.result})`,
      };
    }
  } catch (err: any) {
    console.error('[Payment] initiatePayment exception:', err);
    return {
      success: false,
      error: err?.message || 'خطای غیرمنتظره هنگام اتصال به درگاه پرداخت.',
    };
  }
}
