import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

const PROXIES_PATH = join(process.cwd(), 'public', 'proxies.json')

export async function GET() {
  try {
    const content = await readFile(PROXIES_PATH, 'utf-8')
    const proxies = JSON.parse(content)
    return NextResponse.json(proxies)
  } catch (err: any) {
    console.error('Failed to read proxies.json:', err)
    return NextResponse.json({ error: 'Proxy data not available yet.' }, { status: 503 })
  }
}
