import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'c-proxy.nghemmo.com | Free Proxy Dashboard',
  description: 'Proxy dashboard with filters by protocol and country',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <header className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900">🚀 c-proxy.nghemmo.com</h1>
            <p className="text-slate-600 mt-1">Danh sách proxy miễn phí — cập nhật tự động</p>
          </header>
          <main>{children}</main>
          <footer className="mt-10 text-center text-xs text-slate-400">
            Proxy data © proxifly/free-proxy-list
          </footer>
        </div>
      </body>
    </html>
  )
}
