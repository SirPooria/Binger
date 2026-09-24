// Supabase Edge Functions run on Deno, while this repository's main TypeScript config targets Next.js.
// @ts-expect-error Deno resolves this URL import when the function is deployed.
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';

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

async function sendSmsWithRetry(body: URLSearchParams, maxRetries = 3): Promise<boolean> {
  let delay = 350;
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
        return true;
      }

      console.warn(`Mellipayamak rejected attempt ${attempt} with code:`, result);
    } catch (err) {
      console.error(`Mellipayamak network error on attempt ${attempt}:`, err);
    }

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  return false;
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

    const sendTask = sendSmsWithRetry(formParams, 3);

    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(sendTask);
    } else {
      await sendTask;
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Send SMS hook failed:', error);
    return jsonResponse({ error: 'Unable to send SMS' }, 500);
  }
});