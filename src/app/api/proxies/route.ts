import { NextResponse } from 'next/server'

export const revalidate = 300

type Proxy = {
  ip: string
  port: number
  protocol: string
  country: string | null
  uptime: number | null
  speed: number | null
}

async function fetchWithTimeout(url: string, ms = 10000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ms)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: 'application/json, text/plain, */*',
        'user-agent': 'Mozilla/5.0',
      },
      next: { revalidate: 300 },
    })
    return res
  } finally {
    clearTimeout(timeout)
  }
}

function normalizeJson(raw: any): Proxy[] {
  const arr = Array.isArray(raw) ? raw : raw?.proxies || raw?.data || []
  return arr
    .map((item: any) => ({
      ip: String(item.ip || item.address || item.host || '').trim(),
      port: Number(item.port || 0),
      protocol: String(item.protocol || item.type || 'http').toLowerCase().trim(),
      country: item.country || item.country_code || null,
      uptime: item.uptime ?? item.uptimePercent ?? null,
      speed: item.speed ?? item.latency ?? null,
    }))
    .filter((p: any) => p.ip && p.port > 0)
}

function normalizeText(raw: string): Proxy[] {
  const lines = raw.split('\n')
  const proxies: Proxy[] = []
  for (const line of lines) {
    const parts = line.trim().split(/\s+/)
    if (parts.length >= 2) {
      const ip = parts[0]
      const port = Number(parts[1])
      const protocol = (parts[2] || 'http').toLowerCase()
      if (ip && port > 0) {
        proxies.push({ ip, port, protocol, country: parts[3] || null, uptime: null, speed: null })
      }
    }
  }
  return proxies
}

export async function GET() {
  try {
    const sources = [
      { url: 'https://api.proxifly.dev/v1/proxies?limit=500&protocol=all', type: 'json' as const },
      { url: 'https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/all.txt', type: 'text' as const },
      { url: 'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/all.txt', type: 'text' as const },
    ]

    let proxies: Proxy[] = []

    for (const source of sources) {
      try {
        const res = await fetchWithTimeout(source.url)
        if (!res.ok) continue
        const text = await res.text()
        if (!text || text.length < 10) continue

        if (source.type === 'json') {
          try {
            const json = JSON.parse(text)
            proxies = normalizeJson(json)
          } catch {
            continue
          }
        } else {
          proxies = normalizeText(text)
        }

        if (proxies.length > 0) break
      } catch {
        continue
      }
    }

    if (proxies.length === 0) {
      return NextResponse.json({ error: 'Không thể tải danh sách proxy. Vui lòng thử lại sau.' }, { status: 502 })
    }

    return NextResponse.json(proxies)
  } catch (err: any) {
    console.error('Proxy API error:', err)
    return NextResponse.json({ error: 'Lỗi server. Vui lòng thử lại sau.' }, { status: 500 })
  }
}
