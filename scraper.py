#!/usr/bin/env python3
"""
c-proxy scraper: crawl proxy list, enrich country, save JSON.
Run: python3 scraper.py
Output: /root/c-proxy/public/proxies.json
"""

import json
import os
import re
import time
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

SOURCES = [
    # TheSpeedX http/socks4/socks5
    ('https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt', 'http'),
    ('https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks4.txt', 'socks4'),
    ('https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt', 'socks5'),
    # monosans all
    ('https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/all.txt', None),
]

OUTPUT = Path('/root/c-proxy/public/proxies.json')
IP_API_URL = 'http://ip-api.com/json/{ip}?fields=status,country,countryCode,message'


def fetch_url(url: str, timeout: int = 15) -> str | None:
    req = Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urlopen(req, timeout=timeout) as resp:
            return resp.read().decode('utf-8', errors='ignore')
    except (HTTPError, URLError, TimeoutError):
        return None


def parse_lines(text: str, default_protocol: str | None = None) -> list[dict]:
    proxies = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        parts = re.split(r'[\s:]+', line)
        if len(parts) >= 2:
            ip = parts[0]
            try:
                port = int(parts[1])
            except ValueError:
                continue
            protocol = default_protocol or parts[2].lower() if len(parts) > 2 and default_protocol is None else (default_protocol or 'http')
            if ip and port > 0 and not ip.endswith('.0') and ip != '0.0.0.0':
                proxies.append({'ip': ip, 'port': port, 'protocol': protocol})
    return proxies


def crawl_proxies() -> list[dict]:
    seen = {}
    for url, protocol in SOURCES:
        text = fetch_url(url)
        if not text:
            continue
        items = parse_lines(text, protocol)
        for p in items:
            key = f"{p['ip']}:{p['port']}"
            if key not in seen:
                seen[key] = p
        time.sleep(0.5)
    return list(seen.values())


def enrich_country(proxies: list[dict]) -> list[dict]:
    # batch 40 proxies per minute to respect ip-api free rate limit
    batch_size = 40
    for i in range(0, len(proxies), batch_size):
        batch = proxies[i:i + batch_size]
        for p in batch:
            ip = p['ip']
            country = None
            try:
                text = fetch_url(IP_API_URL.format(ip=ip), timeout=5)
                if text:
                    data = json.loads(text)
                    if data.get('status') == 'success' and data.get('countryCode'):
                        country = data['countryCode']
            except Exception:
                pass
            p['country'] = country
            time.sleep(1.5)
    return proxies


def main():
    print('[1/3] Crawling proxies...')
    proxies = crawl_proxies()
    print(f'Found {len(proxies)} proxies')

    print('[2/3] Enriching country via ip-api...')
    proxies = enrich_country(proxies)
    enriched = sum(1 for p in proxies if p.get('country'))
    print(f'Enriched country for {enriched}/{len(proxies)} proxies')

    # mock uptime/speed with N/A for now
    for p in proxies:
        p['uptime'] = None
        p['speed'] = None

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(proxies, f, ensure_ascii=False)
    print(f'[3/3] Saved to {OUTPUT}')


if __name__ == '__main__':
    main()
