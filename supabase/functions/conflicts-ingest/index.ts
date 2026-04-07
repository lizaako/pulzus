import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

interface GdeltFeatureProperties {
  name?: string;
  title?: string;
  label?: string;
  value?: number | string;
  count?: number | string;
  mentioncount?: number | string;
  url?: string;
  html?: string;
  popup?: string;
  description?: string;
}

interface GdeltFeature {
  geometry?: {
    coordinates?: [number, number];
  };
  properties?: GdeltFeatureProperties;
}

interface GdeltResponse {
  features?: GdeltFeature[];
}

interface ReliefWebReport {
  title: string;
  country: string;
  createdAt: string;
  source: string;
}

interface RawSignal {
  zoneKey: string;
  country: string;
  location: string;
  latitude: number;
  longitude: number;
  articleCount: number;
  label: string;
  sourceUrls: string[];
}

interface ActiveConflictZoneRow {
  event_id: string;
  zone_key: string;
  event_date: string;
  last_seen_at: string;
  event_type: string;
  country: string;
  location: string;
  latitude: number;
  longitude: number;
  fatalities: number;
  description: string;
  summary: string;
  source: string;
  severity: 'high' | 'medium' | 'low';
  article_count: number;
  report_count: number;
  activity_score: number;
  trend: 'rising' | 'stable' | 'cooling';
  source_urls: string[];
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  return { message: String(error) };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function parseNumeric(value: unknown, fallback = 1) {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function extractUrls(...values: Array<string | undefined>) {
  const urls = new Set<string>();

  for (const value of values) {
    if (!value) continue;
    for (const match of value.matchAll(/https?:\/\/[^\s"'<>]+/g)) {
      urls.add(match[0]);
    }
  }

  return Array.from(urls).slice(0, 8);
}

function splitLocationName(name: string) {
  const cleaned = name.replace(/\s+/g, ' ').trim();
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

async function fetchGdeltSignals(): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];

  for (const entry of GDELT_QUERIES) {
    const url = new URL('https://api.gdeltproject.org/api/v2/geo/');
    url.searchParams.set('query', entry.query);
    url.searchParams.set('mode', 'pointdata');
    url.searchParams.set('format', 'geojson');
    url.searchParams.set('timespan', `${LOOKBACK_HOURS / 24}d`);
    url.searchParams.set('maxpoints', String(MAX_GDELT_POINTS_PER_QUERY));

    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error(`GDELT fetch failed for ${entry.label}: ${response.status}`);
      continue;
    }

    const rawText = await response.text();
    let payload: GdeltResponse | null = null;

    try {
      payload = JSON.parse(rawText) as GdeltResponse;
    } catch (error) {
      console.error(`GDELT parse failed for ${entry.label}:`, serializeError(error));
      console.log(`GDELT raw preview for ${entry.label}: ${rawText.slice(0, 400)}`);
      continue;
    }

    const features = Array.isArray(payload.features) ? payload.features : [];
    console.log(`GDELT ${entry.label}: ${features.length} feature(s)`);

    if (features.length === 0) {
      console.log(`GDELT empty payload keys for ${entry.label}: ${Object.keys(payload || {}).join(', ')}`);
      console.log(`GDELT raw preview for ${entry.label}: ${rawText.slice(0, 400)}`);
    }

    for (const feature of features) {
      const coordinates = feature.geometry?.coordinates;
      if (!coordinates || coordinates.length < 2) continue;

      const [longitude, latitude] = coordinates;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

      const name = feature.properties?.name
        || feature.properties?.label
        || feature.properties?.title
        || 'Ismeretlen helyszin';
      const { location, country } = splitLocationName(String(name));
      const articleCount = Math.max(
        1,
        Math.round(
          parseNumeric(feature.properties?.count, 0)
          || parseNumeric(feature.properties?.value, 0)
          || parseNumeric(feature.properties?.mentioncount, 1),
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
          feature.properties?.url,
          feature.properties?.html,
          feature.properties?.popup,
          feature.properties?.description,
        ),
      });
    }
  }

  return signals;
}

async function fetchReliefWebReports(): Promise<ReliefWebReport[]> {
  const reliefWebAppName = Deno.env.get('RELIEFWEB_APPNAME');
  if (!reliefWebAppName) {
    console.log('ReliefWeb skipped: RELIEFWEB_APPNAME secret is not configured.');
    return [];
  }

  const response = await fetch(`https://api.reliefweb.int/v2/reports?appname=${encodeURIComponent(reliefWebAppName)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      limit: 120,
      sort: ['date.created:desc'],
      query: {
        value: 'conflict OR clashes OR shelling OR bombardment OR offensive OR displaced OR civilians killed',
        fields: ['title', 'body'],
        operator: 'OR',
      },
      fields: {
        include: ['title', 'primary_country.name', 'country.name', 'date.created', 'source.name'],
      },
    }),
  });

  if (!response.ok) {
    console.error(`ReliefWeb fetch failed: ${response.status}`);
    return [];
  }

  const payload = await response.json() as {
    data?: Array<{
      fields?: {
        title?: string;
        primary_country?: { name?: string };
        country?: Array<{ name?: string }>;
        date?: { created?: string };
        source?: Array<{ name?: string }>;
      };
    }>;
  };

  const cutoff = Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000;

  return (payload.data || [])
    .map((item) => {
      const primaryCountry = item.fields?.primary_country?.name;
      const firstCountry = item.fields?.country?.find((entry) => entry.name)?.name;
      const createdAt = item.fields?.date?.created || new Date().toISOString();

      return {
        title: item.fields?.title || 'Ismeretlen riport',
        country: primaryCountry || firstCountry || 'Ismeretlen orszag',
        createdAt,
        source: item.fields?.source?.[0]?.name || 'ReliefWeb',
      };
    })
    .filter((report) => new Date(report.createdAt).getTime() >= cutoff);
}

function buildActiveZones(signals: RawSignal[], reports: ReliefWebReport[]): ActiveConflictZoneRow[] {
  const clusters: Array<{
    key: string;
    country: string;
    location: string;
    latitude: number;
    longitude: number;
    articleCount: number;
    labels: Set<string>;
    sourceUrls: Set<string>;
  }> = [];

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
      const reportCount = reports.filter((report) => report.country.toLowerCase() === cluster.country.toLowerCase()).length;
      const activityScore = cluster.articleCount * 1.8 + reportCount * 6;
      const severity: ActiveConflictZoneRow['severity'] = activityScore >= 24 ? 'high' : activityScore >= 12 ? 'medium' : 'low';
      const trend: ActiveConflictZoneRow['trend'] = activityScore >= 26 ? 'rising' : activityScore >= 10 ? 'stable' : 'cooling';
      const eventType = 'Aktiv konfliktuszona';
      const labelList = Array.from(cluster.labels).join(', ');
      const summary = `${cluster.location} kornyeken erosodott konfliktusjel latszik az elmult ${LOOKBACK_HOURS} oraban. `
        + `${cluster.articleCount} GDELT jel es ${reportCount} friss ReliefWeb riport tamasztja ala a zonat.`;

      return {
        event_id: `zone-${cluster.key}`,
        zone_key: cluster.key,
        event_date: now,
        last_seen_at: now,
        event_type: eventType,
        country: cluster.country,
        location: cluster.location,
        latitude: Number(cluster.latitude.toFixed(4)),
        longitude: Number(cluster.longitude.toFixed(4)),
        fatalities: 0,
        description: `A zona a ${labelList} tipusu friss konfliktusjelek surusodese alapjan jelent meg.`,
        summary,
        source: 'gdelt-live-zone',
        severity,
        article_count: cluster.articleCount,
        report_count: reportCount,
        activity_score: Number(activityScore.toFixed(1)),
        trend,
        source_urls: Array.from(cluster.sourceUrls).slice(0, 8),
      };
    })
    .filter((zone) => zone.article_count >= 2 || zone.report_count >= 1)
    .sort((a, b) => b.activity_score - a.activity_score)
    .slice(0, MAX_ACTIVE_ZONES);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing required secrets' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const [signals, reports] = await Promise.all([
      fetchGdeltSignals(),
      fetchReliefWebReports(),
    ]);

    const zones = buildActiveZones(signals, reports);

    const { error: deleteError } = await supabase
      .from('active_conflict_zones')
      .delete()
      .eq('source', 'gdelt-live-zone');

    if (deleteError) throw deleteError;

    if (zones.length > 0) {
      const { error: insertError } = await supabase
        .from('active_conflict_zones')
        .insert(zones);

      if (insertError) throw insertError;
    }

    return new Response(JSON.stringify({
      signalsFetched: signals.length,
      reportsFetched: reports.length,
      activeZones: zones.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'conflicts-ingest failed',
      details: serializeError(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
