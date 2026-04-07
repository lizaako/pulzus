import { createClient } from '@supabase/supabase-js';

const LOOKBACK_HOURS = 72;
const MAX_GDELT_POINTS_PER_QUERY = 120;
const MAX_ACTIVE_ZONES = 30;
const CLUSTER_RADIUS_KM = 260;

const GDELT_QUERIES = [
  {
    label: 'frontvonal',
    query: '(war OR conflict OR fighting OR shelling OR bombardment OR offensive OR militia OR insurgent)',
  },
  {
    label: 'tamadas',
    query: '(airstrike OR drone OR missile OR artillery OR rockets OR raid)',
  },
  {
    label: 'civil veszely',
    query: '(displaced OR refugees OR civilians OR siege OR massacre OR evacuation)',
  },
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function parseNumeric(value, fallback = 1) {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function extractUrls(...values) {
  const urls = new Set();

  for (const value of values) {
    if (!value) continue;
    for (const match of value.matchAll(/https?:\/\/[^\s"'<>]+/g)) {
      urls.add(match[0]);
    }
  }

  return Array.from(urls).slice(0, 8);
}

function splitLocationName(name) {
  const cleaned = String(name || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return { location: 'Ismeretlen helyszin', country: 'Ismeretlen orszag' };
  }

  const parts = cleaned.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      location: parts[0],
      country: parts[parts.length - 1],
    };
  }

  return {
    location: cleaned,
    country: cleaned,
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'pulzus-conflicts-ingest/1.0',
      'Accept': 'application/json,text/plain,*/*',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    const preview = await response.text();
    throw new Error(`HTTP ${response.status} for ${url}: ${preview.slice(0, 300)}`);
  }

  return response.json();
}

async function fetchGdeltSignals() {
  const signals = [];

  for (const entry of GDELT_QUERIES) {
    const url = new URL('https://api.gdeltproject.org/api/v2/geo/');
    url.searchParams.set('query', entry.query);
    url.searchParams.set('mode', 'pointdata');
    url.searchParams.set('format', 'geojson');
    url.searchParams.set('timespan', `${LOOKBACK_HOURS / 24}d`);
    url.searchParams.set('maxpoints', String(MAX_GDELT_POINTS_PER_QUERY));

    console.log(`Fetching GDELT ${entry.label}: ${url.toString()}`);
    const payload = await fetchJson(url.toString());
    const features = Array.isArray(payload.features) ? payload.features : [];
    console.log(`GDELT ${entry.label}: ${features.length} feature(s)`);

    for (const feature of features) {
      const coordinates = feature.geometry?.coordinates;
      if (!coordinates || coordinates.length < 2) continue;

      const [longitude, latitude] = coordinates;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

      const properties = feature.properties || {};
      const name = properties.name || properties.label || properties.title || 'Ismeretlen helyszin';
      const { location, country } = splitLocationName(name);
      const articleCount = Math.max(
        1,
        Math.round(
          parseNumeric(properties.count, 0)
          || parseNumeric(properties.value, 0)
          || parseNumeric(properties.mentioncount, 1),
        ),
      );

      signals.push({
        zoneKey: slugify(`${country}-${location}`),
        country,
        location,
        latitude,
        longitude,
        articleCount,
        label: entry.label,
        sourceUrls: extractUrls(
          properties.url,
          properties.html,
          properties.popup,
          properties.description,
        ),
      });
    }
  }

  return signals;
}

function buildActiveZones(signals) {
  const clusters = [];

  for (const signal of signals) {
    const existing = clusters.find((cluster) => {
      if (cluster.country.toLowerCase() === signal.country.toLowerCase() && cluster.location.toLowerCase() === signal.location.toLowerCase()) {
        return true;
      }

      return haversineKm(cluster.latitude, cluster.longitude, signal.latitude, signal.longitude) <= CLUSTER_RADIUS_KM;
    });

    if (existing) {
      existing.articleCount += signal.articleCount;
      existing.latitude = (existing.latitude + signal.latitude) / 2;
      existing.longitude = (existing.longitude + signal.longitude) / 2;
      existing.labels.add(signal.label);
      signal.sourceUrls.forEach((url) => existing.sourceUrls.add(url));
      continue;
    }

    clusters.push({
      key: signal.zoneKey || slugify(`${signal.country}-${signal.location}`),
      country: signal.country,
      location: signal.location,
      latitude: signal.latitude,
      longitude: signal.longitude,
      articleCount: signal.articleCount,
      labels: new Set([signal.label]),
      sourceUrls: new Set(signal.sourceUrls),
    });
  }

  const now = new Date().toISOString();

  return clusters
    .map((cluster) => {
      const activityScore = cluster.articleCount * 1.8;
      const severity = activityScore >= 24 ? 'high' : activityScore >= 12 ? 'medium' : 'low';
      const trend = activityScore >= 26 ? 'rising' : activityScore >= 10 ? 'stable' : 'cooling';
      const labelList = Array.from(cluster.labels).join(', ');

      return {
        event_id: `zone-${cluster.key}`,
        zone_key: cluster.key,
        event_date: now,
        last_seen_at: now,
        event_type: 'Aktiv konfliktuszona',
        country: cluster.country,
        location: cluster.location,
        latitude: Number(cluster.latitude.toFixed(4)),
        longitude: Number(cluster.longitude.toFixed(4)),
        fatalities: 0,
        description: `A zona a ${labelList} tipusu friss konfliktusjelek surusodese alapjan jelent meg.`,
        summary: `${cluster.location} kornyeken erosodott konfliktusjel latszik az elmult ${LOOKBACK_HOURS} oraban. ${cluster.articleCount} GDELT jel tamasztja ala a zonat.`,
        source: 'github-gdelt-live-zone',
        severity,
        article_count: cluster.articleCount,
        report_count: 0,
        activity_score: Number(activityScore.toFixed(1)),
        trend,
        source_urls: Array.from(cluster.sourceUrls).slice(0, 8),
      };
    })
    .filter((zone) => zone.article_count >= 2)
    .sort((a, b) => b.activity_score - a.activity_score)
    .slice(0, MAX_ACTIVE_ZONES);
}

async function main() {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const signals = await fetchGdeltSignals();
  const zones = buildActiveZones(signals);

  const { error: deleteError } = await supabase
    .from('active_conflict_zones')
    .delete()
    .eq('source', 'github-gdelt-live-zone');

  if (deleteError) {
    throw new Error(`Failed to delete previous zones: ${deleteError.message}`);
  }

  if (zones.length > 0) {
    const { error: insertError } = await supabase
      .from('active_conflict_zones')
      .insert(zones);

    if (insertError) {
      throw new Error(`Failed to insert active zones: ${insertError.message}`);
    }
  }

  console.log(JSON.stringify({
    signalsFetched: signals.length,
    activeZones: zones.length,
  }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
