import { NextResponse } from 'next/server'

type Proxy = {
  ip: string
  port: number
  protocol: string
  country: string | null
  uptime: number | null
  speed: number | null
}

function normalizeText(raw: string, defaultProtocol = 'http'): Proxy[] {
  const lines = raw.split('\n')
  const proxies: Proxy[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    let ip = ''
    let port = 0
    let protocol = defaultProtocol

    if (trimmed.includes(':')) {
      const [hostPart, portPart] = trimmed.split(':')
      ip = hostPart.trim()
      port = Number(portPart.trim())
    } else {
      const parts = trimmed.split(/\s+/)
      ip = parts[0] || ''
      port = Number(parts[1] || 0)
      protocol = (parts[2] || defaultProtocol).toLowerCase()
    }

    if (ip && port > 0) {
      proxies.push({ ip, port, protocol, country: null, uptime: null, speed: null })
    }
  }
  return proxies
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

export async function GET() {
  const sources = [
    { url: 'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt', type: 'text' as const, protocol: 'http' },
    { url: 'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks4.txt', type: 'text' as const, protocol: 'socks4' },
    { url: 'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt', type: 'text' as const, protocol: 'socks5' },
    { url: 'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/all.txt', type: 'text' as const, protocol: 'http' },
    { url: 'https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt', type: 'text' as const, protocol: 'http' },
    { url: 'https://api.proxifly.dev/v1/proxies?limit=500&protocol=all', type: 'json' as const },
  ]

  let proxies: Proxy[] = []

  for (const source of sources) {
    try {
      const res = await fetch(source.url, {
        headers: {
          accept: source.type === 'json' ? 'application/json' : 'text/plain',
          'user-agent': 'Mozilla/5.0',
        },
        signal: AbortSignal.timeout(8000),
      })

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
        proxies = normalizeText(text, source.protocol)
      }

      if (proxies.length > 0) break
    } catch {
      continue
    }
  }

  if (proxies.length === 0) {
    return NextResponse.json(
      { error: 'Không thể tải danh sách proxy từ mọi nguồn. Vui lòng thử lại sau.' },
      { status: 502 }
    )
  }

  return NextResponse.json(proxies)
}
