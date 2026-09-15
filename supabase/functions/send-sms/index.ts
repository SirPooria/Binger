// Supabase Edge Functions run on Deno, while this repository's main TypeScript config targets Next.js.
// @ts-ignore Deno resolves this URL import when the function is deployed.
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'

declare const Deno: {
  env: { get(name: string): string | undefined }
  serve(handler: (request: Request) => Response | Promise<Response>): void
}

const MELIPAYAMAK_URL =
  'https://api.payamak-panel.com/post/Send.asmx/SendByBaseNumber2'

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  try {
    const hookSecret = Deno.env.get('SEND_SMS_HOOK_SECRETS')
    const username = Deno.env.get('MELIPAYAMAK_USERNAME')
    const apiKey = Deno.env.get('MELIPAYAMAK_API_KEY')
    const bodyId = Deno.env.get('MELIPAYAMAK_BODY_ID')

    if (!hookSecret || !username || !apiKey || !bodyId) {
      return jsonResponse({ error: 'SMS provider is not configured' }, 500)
    }

    const rawPayload = await request.text()
    const webhook = new Webhook(hookSecret.replace(/^v1,whsec_/, ''))
    const { user, sms } = webhook.verify(
      rawPayload,
      Object.fromEntries(request.headers),
    ) as {
      user?: { phone?: string }
      sms?: { otp?: string }
    }

    const phone = user?.phone?.replace(/^\+?98/, '0')
    const otp = sms?.otp

    if (!phone || !otp) {
      return jsonResponse({ error: 'Invalid SMS hook payload' }, 400)
    }

    const params = new URLSearchParams({
      username,
      password: apiKey,
      text: otp,
      to: phone,
      bodyId,
    })

    const response = await fetch(`${MELIPAYAMAK_URL}?${params.toString()}`, {
      method: 'GET',
      redirect: 'error',
    })
    const rawResult = (await response.text()).trim()
    const result = rawResult
      .replace(/<[^>]*>/g, '')
      .trim()
      .replace(/^['"]|['"]$/g, '')

    if (!response.ok || !/^\d+$/.test(result) || result.startsWith('-')) {
      console.error('Mellipayamak rejected SMS:', result)
      return jsonResponse(
        { error: `SMS provider rejected the message: ${result || rawResult}` },
        502,
      )
    }

    return jsonResponse({})
  } catch (error) {
    console.error('Send SMS hook failed:', error)
    return jsonResponse({ error: 'Unable to send SMS' }, 500)
  }
})