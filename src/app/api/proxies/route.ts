import { NextResponse } from 'next/server'

type Proxy = {
  ip: string
  port: number
  protocol: string
  country: string | null
  uptime: number | null
  speed: number | null
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
    const url = 'https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/all.txt'

    const res = await fetch(url, {
      headers: {
        accept: 'text/plain',
        'user-agent': 'Mozilla/5.0',
      },
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Upstream responded ${res.status}` }, { status: 502 })
    }

    const text = await res.text()
    const proxies = normalizeText(text)

    if (proxies.length === 0) {
      return NextResponse.json({ error: 'Proxy list rỗng' }, { status: 502 })
    }

    return NextResponse.json(proxies)
  } catch (err: any) {
    console.error('Proxy API error:', err)
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 })
  }
}
