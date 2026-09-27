// Supabase Edge Functions run on Deno, while this repository's main TypeScript config targets Next.js.
// @ts-expect-error Deno resolves this URL import when the function is deployed.
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
// @ts-expect-error Deno resolves this URL import when the function is deployed.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
};

const MELIPAYAMAK_URL = 'https://api.payamak-panel.com/post/Send.asmx/SendByBaseNumber2';

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function maskOtpCode(code: string): string {
  if (!code) return '******';
  const clean = code.trim();
  if (clean.length <= 4) return '****';
  return clean.slice(0, 2) + '**' + clean.slice(-2);
}

interface SendSmsResult {
  success: boolean;
  recId?: string;
  errorMessage?: string;
}

async function sendSmsWithRetry(body: URLSearchParams, maxRetries = 3): Promise<SendSmsResult> {
  let delay = 350;
  let lastError = '';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(MELIPAYAMAK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const rawResult = (await response.text()).trim();
      const result = rawResult
        .replace(/<[^>]*>/g, '')
        .trim()
        .replace(/^['"]|['"]$/g, '');

      if (response.ok && /^\d+$/.test(result) && !result.startsWith('-')) {
        console.log(`Mellipayamak SMS sent successfully on attempt ${attempt}, ID:`, result);
        return { success: true, recId: result };
      }

      lastError = `Melipayamak rejected code: ${result}`;
      console.warn(`Mellipayamak rejected attempt ${attempt} with code:`, result);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`Mellipayamak network error on attempt ${attempt}:`, err);
    }

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }

  return { success: false, errorMessage: lastError || 'Unknown provider error' };
}

/**
 * Persists SMS delivery status and details into Supabase sms_logs table.
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS.
 */
async function logSmsDelivery(params: {
  phone: string;
  code: string;
  status: 'sent' | 'failed';
  recId?: string;
  errorMessage?: string;
}): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('[logSmsDelivery] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase.from('sms_logs').insert({
      phone: params.phone,
      code: maskOtpCode(params.code),
      status: params.status,
      provider: 'melipayamak',
      rec_id: params.recId || null,
      error_message: params.errorMessage || null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[logSmsDelivery] Failed to insert into sms_logs:', error.message);
    } else {
      console.log('[logSmsDelivery] Successfully logged SMS to sms_logs for', params.phone);
    }
  } catch (logErr) {
    console.error('[logSmsDelivery] Unexpected logging exception:', logErr);
  }
}

Deno.serve(async (request) => {
  try {
    const hookSecret = Deno.env.get('SEND_SMS_HOOK_SECRETS');
    const username = Deno.env.get('MELIPAYAMAK_USERNAME');
    const apiKey = Deno.env.get('MELIPAYAMAK_API_KEY');
    const bodyId = Deno.env.get('MELIPAYAMAK_BODY_ID');

    if (!hookSecret || !username || !apiKey || !bodyId) {
      return jsonResponse({ error: 'SMS provider is not configured' }, 500);
    }

    const rawPayload = await request.text();
    const webhook = new Webhook(hookSecret.replace(/^v1,whsec_/, ''));
    const { user, sms } = webhook.verify(
      rawPayload,
      Object.fromEntries(request.headers),
    ) as {
      user?: { phone?: string };
      sms?: { otp?: string };
    };

    const phone = user?.phone?.replace(/^\+?98/, '0');
    const otp = sms?.otp;

    if (!phone || !otp) {
      return jsonResponse({ error: 'Invalid SMS hook payload' }, 400);
    }

    // Credentials passed strictly in POST body (never in GET query string)
    const formParams = new URLSearchParams({
      username,
      password: apiKey,
      text: otp,
      to: phone,
      bodyId,
    });

    // Execute SMS send and database logging
    const processTask = (async () => {
      const sendResult = await sendSmsWithRetry(formParams, 3);
      await logSmsDelivery({
        phone,
        code: otp,
        status: sendResult.success ? 'sent' : 'failed',
        recId: sendResult.recId,
        errorMessage: sendResult.errorMessage,
      });
      return sendResult;
    })();

    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(processTask);
    } else {
      await processTask;
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Send SMS hook failed:', error);
    return jsonResponse({ error: 'Unable to send SMS' }, 500);
  }
});