#!/usr/bin/env python3
"""
c-proxy scraper: crawl proxies, enrich country, commit + push JSON to GitHub.
Output: public/proxies.json in repo, then git push to trigger Coolify redeploy.
"""

import json
import os
import re
import subprocess
import time
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

REPO_DIR = Path('/root/c-proxy')
OUTPUT = REPO_DIR / 'public' / 'proxies.json'
GIT_AUTHOR = 'c-proxy-scraper <bot@nghemmo.com>'

SOURCES = [
    ('https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt', 'http'),
    ('https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks4.txt', 'socks4'),
    ('https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt', 'socks5'),
    ('https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/all.txt', None),
]

IP_API_URL = 'http://ip-api.com/json/{ip}?fields=status,countryCode'


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
            if ip and port > 0 and not ip.endswith('.0') and ip != '0.0.0.0' and not ip.startswith('0.'):
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


def git_cmd(*args: str) -> bool:
    try:
        subprocess.run(['git'] + list(args), cwd=REPO_DIR, check=True, capture_output=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f'Git error: {e.stderr.decode()}')
        return False


def git_push() -> bool:
    # Configure git identity
    if not git_cmd('config', 'user.email', GIT_AUTHOR):
        return False
    if not git_cmd('config', 'user.name', GIT_AUTHOR):
        return False

    git_cmd('add', 'public/proxies.json')
    git_cmd('commit', '-m', 'data: update proxy list with country enrichment')
    return git_cmd('push', 'origin', 'HEAD:master')


def main():
    print('[1/4] Crawling proxies...')
    proxies = crawl_proxies()
    print(f'Found {len(proxies)} proxies')

    print('[2/4] Enriching country...')
    proxies = enrich_country(proxies)
    enriched = sum(1 for p in proxies if p.get('country'))
    print(f'Enriched {enriched}/{len(proxies)}')

    # add uptime/speed as None for now
    for p in proxies:
        p['uptime'] = None
        p['speed'] = None

    print('[3/4] Saving JSON...')
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(proxies, f, ensure_ascii=False)

    print('[4/4] Git push...')
    if git_push():
        print('Pushed. Coolify will redeploy shortly.')
    else:
        print('Push failed.')


if __name__ == '__main__':
    main()
