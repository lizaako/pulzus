#!/usr/bin/env python3
"""
High-density live conflict ingest:
GDELT GEO API -> Supabase conflicts table.

Usage:
  python scripts/conflicts_ingest.py

Required env vars:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
"""

from __future__ import annotations

import json
import os
import sys
import uuid
import csv
import time
import random
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple
from urllib.parse import quote_plus
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


def require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required env var: {name}")
    return value


def get_text(url: str, timeout: int = 25, retries: int = 4) -> str:
    req = Request(url, headers={"User-Agent": "pulzus-conflict-ingest/1.0"})
    last_error: Exception | None = None

    for attempt in range(retries):
        try:
            with urlopen(req, timeout=timeout) as resp:
                return resp.read().decode("utf-8", errors="replace")
        except HTTPError as exc:
            last_error = exc
            if exc.code == 429 and attempt < retries - 1:
                # Exponential backoff + jitter for GDELT rate limiting.
                wait_s = (2 ** attempt) + random.uniform(0.4, 1.2)
                print(f"[warn] 429 from source, retrying in {wait_s:.1f}s...", file=sys.stderr)
                time.sleep(wait_s)
                continue
            raise
        except URLError as exc:
            last_error = exc
            if attempt < retries - 1:
                wait_s = (1.2 * (attempt + 1)) + random.uniform(0.2, 0.8)
                print(f"[warn] network error, retrying in {wait_s:.1f}s...", file=sys.stderr)
                time.sleep(wait_s)
                continue
            raise

    raise RuntimeError(f"Failed to fetch source after retries: {last_error}")


def parse_gdelt_features(raw_text: str) -> List[Dict[str, Any]]:
    text = (raw_text or "").strip()
    if not text:
        return []

    # Some GDELT responses are JSONP-like wrappers.
    if text.startswith("callback(") and text.endswith(")"):
        text = text[len("callback("):-1]

    # Prefer JSON when available.
    try:
        payload = json.loads(text)
        features = payload.get("features") or []
        if isinstance(features, list):
            return features
    except json.JSONDecodeError:
        pass

    # Fallback: parse CSV-like output with columns such as name,lat,lon,count.
    lines = [line for line in text.splitlines() if line.strip()]
    if not lines:
        return []
    reader = csv.DictReader(lines)
    parsed: List[Dict[str, Any]] = []
    for row in reader:
        name = (row.get("name") or row.get("Name") or "").strip()
        lat = row.get("lat") or row.get("latitude") or row.get("Lat")
        lon = row.get("lon") or row.get("longitude") or row.get("Lon") or row.get("lng")
        count = row.get("count") or row.get("Count") or row.get("numarticles") or "1"
        try:
            lat_f = float(lat) if lat is not None else None
            lon_f = float(lon) if lon is not None else None
            count_i = int(float(count))
        except (TypeError, ValueError):
            continue
        if lat_f is None or lon_f is None:
            continue
        parsed.append(
            {
                "properties": {"name": name, "count": count_i, "lat": lat_f, "lon": lon_f},
                "geometry": {"coordinates": [lon_f, lat_f]},
            }
        )
    return parsed


def parse_location(name: str) -> Tuple[str, str]:
    parts = [p.strip() for p in (name or "").split(",") if p.strip()]
    if not parts:
        return "Ismeretlen helyszin", "Ismeretlen orszag"
    if len(parts) == 1:
        return parts[0], "Ismeretlen orszag"
    return parts[0], parts[-1]


def severity_from_mentions(count: int) -> str:
    if count >= 20:
        return "high"
    if count >= 8:
        return "medium"
    return "low"


def fetch_gdelt_conflicts() -> List[Dict[str, Any]]:
    query = quote_plus(
        '"war" OR "bomb" OR "missile" OR "airstrike" OR "shelling" OR '
        '"artillery" OR "drone strike" OR "border clash" OR "explosion"'
    )
    # GDELT GEO output is served via the doc endpoint with geo-capable modes.
    urls = [
        # Primary: high density, but lower volume than 700 to avoid frequent 429.
        f"https://api.gdeltproject.org/api/v2/doc/doc?query={query}&mode=PointTheme&timespan=6h&maxrecords=180&format=json",
        # Fallback shape.
        f"https://api.gdeltproject.org/api/v2/doc/doc?query={query}&mode=GeoJSON&timespan=6h&maxrecords=120&format=json",
    ]

    all_features: List[Dict[str, Any]] = []
    for url in urls:
        try:
            raw = get_text(url)
            features = parse_gdelt_features(raw)
            all_features.extend(features)
        except Exception as exc:
            print(f"[warn] GDELT fetch failed: {exc}", file=sys.stderr)

    seen = set()
    now_iso = datetime.now(timezone.utc).isoformat()
    output: List[Dict[str, Any]] = []

    for feature in all_features:
        props = feature.get("properties") or {}
        geometry = feature.get("geometry") or {}
        coords = geometry.get("coordinates") or []

        name = str(props.get("name") or "").strip()
        count = int(float(props.get("count") or 0))

        lon = None
        lat = None
        if isinstance(coords, list) and len(coords) >= 2:
            lon = coords[0]
            lat = coords[1]
        else:
            lon = props.get("lon")
            lat = props.get("lat")

        try:
            lon_f = float(lon)
            lat_f = float(lat)
        except (TypeError, ValueError):
            continue

        if not name or count < 1:
            continue

        dedupe_key = f"{round(lat_f, 2)}_{round(lon_f, 2)}"
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)

        location, country = parse_location(name)
        severity = severity_from_mentions(count)

        output.append(
            {
                "event_id": str(uuid.uuid4()),
                "event_date": now_iso,
                "event_type": "Fegyveres konfliktus jelzes",
                "country": country,
                "location": location,
                "latitude": lat_f,
                "longitude": lon_f,
                "fatalities": 0,
                "description": f"{count} friss hirhivatkozas alapjan aktiv konfliktus-esemeny a tersegben.",
                "source": "GDELT GEO",
                "severity": severity,
            }
        )

    if output:
        return output[:250]

    # Last-resort fallback so map is never empty when API is rate-limited.
    hotspot_fallback = [
        ("Donetsk", "Ukraine", 48.0159, 37.8028, "high"),
        ("Kharkiv", "Ukraine", 49.9935, 36.2304, "high"),
        ("Gaza City", "Palestine", 31.5017, 34.4668, "high"),
        ("Khan Yunis", "Palestine", 31.3461, 34.3036, "high"),
        ("Sanaa", "Yemen", 15.3694, 44.1910, "medium"),
        ("Aleppo", "Syria", 36.2021, 37.1343, "medium"),
        ("Idlib", "Syria", 35.9306, 36.6339, "medium"),
        ("Port Sudan", "Sudan", 19.6158, 37.2164, "high"),
        ("El Fasher", "Sudan", 13.6279, 25.3494, "high"),
        ("Goma", "DR Congo", -1.6792, 29.2228, "high"),
        ("Beni", "DR Congo", 0.4911, 29.4731, "medium"),
        ("Mogadishu", "Somalia", 2.0469, 45.3182, "medium"),
        ("Kabul", "Afghanistan", 34.5553, 69.2075, "medium"),
        ("Peshawar", "Pakistan", 34.0151, 71.5249, "medium"),
        ("Bangkok", "Thailand", 13.7563, 100.5018, "low"),
    ]
    now_iso = datetime.now(timezone.utc).isoformat()
    rows: List[Dict[str, Any]] = []
    for location, country, lat, lon, severity in hotspot_fallback:
        rows.append(
            {
                "event_id": str(uuid.uuid4()),
                "event_date": now_iso,
                "event_type": "Konfliktus hotspot (fallback)",
                "country": country,
                "location": location,
                "latitude": lat,
                "longitude": lon,
                "fatalities": 0,
                "description": "Forras atmenetileg limitelt (429), ideiglenes hotspot megjelenites.",
                "source": "Fallback seed",
                "severity": severity,
            }
        )
    print("[warn] Using fallback hotspots because source returned no parseable features.", file=sys.stderr)
    return rows


def insert_conflicts_supabase(rows: List[Dict[str, Any]], supabase_url: str, service_key: str) -> None:
    if not rows:
        print("[info] No conflicts to insert.")
        return

    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/conflicts"
    body = json.dumps(rows).encode("utf-8")
    req = Request(
        endpoint,
        data=body,
        headers={
            "Content-Type": "application/json",
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Prefer": "return=representation",
        },
        method="POST",
    )
    with urlopen(req, timeout=30) as resp:
        status = resp.getcode()
        payload = resp.read().decode("utf-8", errors="replace")
        print(f"[info] Supabase insert status: {status}")
        print(f"[info] Inserted rows: {len(rows)}")
        if payload:
            print(f"[info] Response: {payload[:400]}")


def main() -> int:
    try:
        supabase_url = require_env("SUPABASE_URL")
        service_key = require_env("SUPABASE_SERVICE_ROLE_KEY")

        conflicts = fetch_gdelt_conflicts()
        print(f"[info] Parsed conflicts: {len(conflicts)}")
        insert_conflicts_supabase(conflicts, supabase_url, service_key)
        return 0
    except Exception as exc:
        print(f"[error] {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
