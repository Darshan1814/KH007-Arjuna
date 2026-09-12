import { NextRequest, NextResponse } from 'next/server'

/**
 * Server-side proxy for VAPI web call creation.
 *
 * The VAPI Web SDK's `start()` method makes a browser-side `POST /call/web`
 * to `https://api.vapi.ai`. If that fetch is blocked (by ad blockers, browser
 * extensions, DNS, or network issues), the call never starts.
 *
 * This route proxies the same request from the server using the private key,
 * bypassing any browser-side issues. The client patches the SDK's
 * `customFetch` to route through this proxy.
 */
export async function POST(req: NextRequest) {
  const privateKey = process.env.VAPI_PRIVATE_KEY
  if (!privateKey) {
    return NextResponse.json({ error: 'VAPI_PRIVATE_KEY not set' }, { status: 500 })
  }

  try {
    const body = await req.json()

    const vapiRes = await fetch('https://api.vapi.ai/call/web', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${privateKey}`,
      },
      body: JSON.stringify(body),
    })

    const data = await vapiRes.json()

    if (!vapiRes.ok) {
      console.error('[vapi-proxy] VAPI responded with error:', vapiRes.status, data)
      return NextResponse.json(data, { status: vapiRes.status })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[vapi-proxy] Error:', err)
    return NextResponse.json({ error: err.message || 'Proxy error' }, { status: 500 })
  }
}
