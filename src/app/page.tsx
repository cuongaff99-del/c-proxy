'use client'

import { useState, useEffect } from 'react'

type Proxy = {
  ip: string
  port: number
  protocol: string
  country: string | null
  uptime: number | null
  speed: number | null
}

export default function Home() {
  const [proxies, setProxies] = useState<Proxy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [protocol, setProtocol] = useState('all')
  const [country, setCountry] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const fetchProxies = async () => {
      try {
        const res = await fetch('/api/proxies', { signal: controller.signal })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data?.error || `HTTP ${res.status}`)
        }
        const data = await res.json()
        const arr = Array.isArray(data) ? data : []
        setProxies(arr)
        setError(null)
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Không thể tải danh sách proxy')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchProxies()
    return () => controller.abort()
  }, [])

  const countries = Array.from(new Set(proxies.map(p => p.country).filter(Boolean))) as string[]

  const filtered = proxies.filter(p => {
    if (protocol !== 'all' && p.protocol !== protocol) return false
    if (country !== 'all' && p.country !== country) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        p.ip.includes(q) ||
        String(p.port).includes(q) ||
        (p.country || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const badgeClass = (proto: string) => {
    if (proto === 'http') return 'bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium'
    if (proto === 'socks4') return 'bg-orange-500 text-white px-2 py-1 rounded text-xs font-medium'
    if (proto === 'socks5') return 'bg-purple-500 text-white px-2 py-1 rounded text-xs font-medium'
    return 'bg-gray-500 text-white px-2 py-1 rounded text-xs font-medium'
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Giao thức</label>
            <select
              value={protocol}
              onChange={e => setProtocol(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            >
              <option value="all">Tất cả</option>
              <option value="http">HTTP</option>
              <option value="socks4">SOCKS4</option>
              <option value="socks5">SOCKS5</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Quốc gia</label>
            <select
              value={country}
              onChange={e => setCountry(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            >
              <option value="all">Tất cả</option>
              {countries.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Tìm kiếm IP/Port/Quốc gia</label>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="vd: 103.47.227.156 hoặc US"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-500">
          {loading ? 'Đang tải...' : `Hiển thị ${filtered.length} / ${proxies.length} proxy`}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">IP</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Port</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Protocol</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Country</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Uptime</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Speed (ms)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs">{p.ip}</td>
                    <td className="px-4 py-3">{p.port}</td>
                    <td className="px-4 py-3">
                      <span className={badgeClass(p.protocol)}>{p.protocol.toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-3">{p.country || 'N/A'}</td>
                    <td className="px-4 py-3">{p.uptime ?? 'N/A'}</td>
                    <td className="px-4 py-3">{p.speed ?? 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="p-6 text-center text-slate-500 text-sm">Không có proxy phù hợp bộ lọc.</div>
          )}
        </div>
      )}
    </div>
  )
}
