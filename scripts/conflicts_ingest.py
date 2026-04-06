#!/usr/bin/env python3
"""
Live conflict ingest:
NewsAPI article stream -> country geolocation -> Supabase conflicts table.

Usage:
  python scripts/conflicts_ingest.py

Required env vars:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  NEWSAPI_KEY
"""

from __future__ import annotations

import json
import os
import re
import sys
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List
from urllib.parse import quote_plus
from urllib.request import Request, urlopen


COUNTRY_POINTS: Dict[str, tuple[str, float, float]] = {
    "ukraine": ("Kyiv", 50.4501, 30.5234),
    "russia": ("Moscow", 55.7558, 37.6173),
    "israel": ("Jerusalem", 31.7683, 35.2137),
    "palestine": ("Gaza City", 31.5017, 34.4668),
    "gaza": ("Gaza City", 31.5017, 34.4668),
    "lebanon": ("Beirut", 33.8938, 35.5018),
    "syria": ("Damascus", 33.5138, 36.2765),
    "yemen": ("Sanaa", 15.3694, 44.1910),
    "iran": ("Tehran", 35.6892, 51.3890),
    "iraq": ("Baghdad", 33.3152, 44.3661),
    "sudan": ("Khartoum", 15.5007, 32.5599),
    "congo": ("Goma", -1.6792, 29.2228),
    "dr congo": ("Goma", -1.6792, 29.2228),
    "myanmar": ("Naypyidaw", 19.7633, 96.0785),
    "afghanistan": ("Kabul", 34.5553, 69.2075),
    "pakistan": ("Islamabad", 33.6844, 73.0479),
    "india": ("New Delhi", 28.6139, 77.2090),
    "china": ("Beijing", 39.9042, 116.4074),
    "taiwan": ("Taipei", 25.0330, 121.5654),
    "south korea": ("Seoul", 37.5665, 126.9780),
    "north korea": ("Pyongyang", 39.0392, 125.7625),
    "somalia": ("Mogadishu", 2.0469, 45.3182),
    "nigeria": ("Abuja", 9.0765, 7.3986),
    "haiti": ("Port-au-Prince", 18.5944, -72.3074),
    "serbia": ("Belgrade", 44.7866, 20.4489),
    "hungary": ("Budapest", 47.4979, 19.0402),
}

CONFLICT_TERMS = [
    "war", "bomb", "missile", "airstrike", "shelling", "artillery", "drone strike",
    "rocket", "blast", "attack", "clash", "border conflict", "military strike",
]


def require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required env var: {name}")
    return value


def get_json(url: str, headers: Dict[str, str] | None = None, timeout: int = 25) -> Dict[str, Any]:
    req = Request(url, headers=headers or {"User-Agent": "pulzus-conflict-ingest/2.0"})
    with urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8", errors="replace"))


def infer_severity(text: str) -> str:
    score = 0
    low = text.lower()
    if any(k in low for k in ["massive", "heavy", "major", "dozens killed", "civilian casualties"]):
        score += 2
    if any(k in low for k in ["missile", "airstrike", "artillery", "drone strike", "bomb"]):
        score += 2
    if any(k in low for k in ["clash", "attack", "raid", "strike"]):
        score += 1
    if score >= 4:
        return "high"
    if score >= 2:
        return "medium"
    return "low"


def fetch_newsapi_conflicts(newsapi_key: str) -> List[Dict[str, Any]]:
    query = quote_plus("(" + " OR ".join(f'"{term}"' for term in CONFLICT_TERMS) + ")")
    url = (
        "https://newsapi.org/v2/everything"
        f"?q={query}&language=en&sortBy=publishedAt&pageSize=100"
    )
    data = get_json(url, headers={"X-Api-Key": newsapi_key, "User-Agent": "pulzus-conflict-ingest/2.0"})
    articles = data.get("articles") or []
    if not isinstance(articles, list):
        return []

    rows: List[Dict[str, Any]] = []
    seen = set()
    now_iso = datetime.now(timezone.utc).isoformat()

    for article in articles:
        title = str(article.get("title") or "")
        description = str(article.get("description") or "")
        source_name = str((article.get("source") or {}).get("name") or "NewsAPI")
        published_at = str(article.get("publishedAt") or now_iso)
        body = f"{title}\n{description}".lower()

        if not any(term in body for term in CONFLICT_TERMS):
            continue

        for country_key, (location, lat, lon) in COUNTRY_POINTS.items():
            if not re.search(rf"\b{re.escape(country_key)}\b", body):
                continue

            dedupe = f"{country_key}:{title.strip().lower()[:80]}"
            if dedupe in seen:
                continue
            seen.add(dedupe)

            rows.append(
                {
                    "event_id": str(uuid.uuid4()),
                    "event_date": published_at,
                    "event_type": "Fegyveres konfliktus hir",
                    "country": country_key.title(),
                    "location": location,
                    "latitude": lat,
                    "longitude": lon,
                    "fatalities": 0,
                    "description": title.strip()[:500] or "Konfliktus hirfrissites",
                    "source": source_name,
                    "severity": infer_severity(f"{title} {description}"),
                }
            )

    return rows[:220]


def insert_conflicts_supabase(rows: List[Dict[str, Any]], supabase_url: str, service_key: str) -> None:
    if not rows:
        print("[info] No conflicts to insert.")
        return

    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/conflicts"
    req = Request(
        endpoint,
        data=json.dumps(rows).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Prefer": "return=minimal",
        },
        method="POST",
    )
    with urlopen(req, timeout=30) as resp:
        print(f"[info] Supabase insert status: {resp.getcode()}")
        print(f"[info] Inserted rows: {len(rows)}")


def main() -> int:
    try:
        supabase_url = require_env("SUPABASE_URL")
        service_key = require_env("SUPABASE_SERVICE_ROLE_KEY")
        newsapi_key = require_env("NEWSAPI_KEY")
        conflicts = fetch_newsapi_conflicts(newsapi_key)
        print(f"[info] Parsed conflicts: {len(conflicts)}")
        insert_conflicts_supabase(conflicts, supabase_url, service_key)
        return 0
    except Exception as exc:
        print(f"[error] {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
