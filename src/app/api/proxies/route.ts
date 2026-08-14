import { NextResponse } from 'next/server'

// Cache 5 phút
export const revalidate = 300

type Proxy = {
  ip: string
  port: number
  protocol: string
  country: string | null
  uptime: number | null
  speed: number | null
}

function normalize(raw: any): Proxy[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item: any) => ({
    ip: String(item.ip || item.address || item.host || ''),
    port: Number(item.port || 0),
    protocol: String(item.protocol || item.type || '').toLowerCase(),
    country: item.country || item.country_code || null,
    uptime: item.uptime ?? item.uptimePercent ?? null,
    speed: item.speed ?? item.latency ?? null,
  })).filter(p => p.ip && p.port > 0)
}

async function fetchFromProxifly() {
  const url = new URL('https://api.proxifly.dev/v1/proxies')
  url.searchParams.set('limit', '500')
  url.searchParams.set('protocol', 'all')

  const res = await fetch(url.toString(), {
    headers: { accept: 'application/json' },
    next: { revalidate: 300 },
  })

  if (!res.ok) {
    throw new Error(`Proxifly API error: ${res.status}`)
  }
  const json = await res.json()
  return normalize(Array.isArray(json) ? json : json.proxies)
}

export async function GET() {
  try {
    const proxies = await fetchFromProxifly()
    return NextResponse.json(proxies)
  } catch (err: any) {
    console.error('Failed to fetch proxy list', err)
    return NextResponse.json(
      { error: 'Không thể tải danh sách proxy lúc này.' },
      { status: 502 }
    )
  }
}
