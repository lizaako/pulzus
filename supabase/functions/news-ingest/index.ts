import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RawArticle {
  title?: string;
  description?: string;
  content?: string;
  url?: string;
  source?: { name?: string } | string;
  publishedAt?: string;
}

interface GdeltArticle {
  title?: string;
  url?: string;
  seendate?: string;
  domain?: string;
  sourcecountry?: string;
}

interface GdeltGeoPoint {
  name?: string;
  lat?: number;
  lon?: number;
  count?: number;
}

interface StoredArticle {
  title: string;
  source: string;
  url: string;
  published_at: string;
  sentiment_score: number;
  topics: string[];
  affects_hungary: boolean;
  hungary_impact: string;
  warning_level: string;
  summary: string;
}

interface StoredConflict {
  event_id: string;
  event_date: string;
  event_type: string;
  country: string;
  location: string;
  latitude: number;
  longitude: number;
  fatalities: number;
  description: string;
  source: string;
  severity: string;
}

interface AnalysisResult {
  summary: string;
  warning_level: 'high' | 'medium' | 'low';
  sentiment_score: number;
  topics: string[];
  affects_hungary: boolean;
  hungary_impact: string;
  conflict?: {
    event_type: string;
    country: string;
    location: string;
    latitude: number;
    longitude: number;
    description: string;
    severity: 'high' | 'medium' | 'low';
    fatalities: number;
  };
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const maybeError = error as Record<string, unknown>;
    return {
      message: typeof maybeError.message === 'string' ? maybeError.message : JSON.stringify(maybeError),
      code: typeof maybeError.code === 'string' ? maybeError.code : undefined,
      details: typeof maybeError.details === 'string' ? maybeError.details : undefined,
      hint: typeof maybeError.hint === 'string' ? maybeError.hint : undefined,
    };
  }

  return {
    message: String(error),
  };
}

function normalizeSource(source: RawArticle['source']): string {
  if (typeof source === 'string') return source;
  return source?.name || 'Ismeretlen forrás';
}

function normalizeText(article: RawArticle): string {
  return [article.title, article.description, article.content]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 6000);
}

async function fetchJsonSafe<T>(url: string, label: string): Promise<T | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`${label} fetch failed`, { status: response.status });
      return null;
    }
    return await response.json() as T;
  } catch (error) {
    console.error(`${label} fetch exception`, serializeError(error));
    return null;
  }
}

async function fetchLatestNews(apiKey: string): Promise<RawArticle[]> {
  const queryEn = encodeURIComponent('geopolitics OR economy OR markets OR Europe OR war');
  const queryHu = encodeURIComponent('gazdaság OR politika OR háború OR külföld');
  const gdeltQuery = encodeURIComponent('("war" OR "bombing" OR "missile" OR "airstrike" OR "shelling" OR "armed conflict" OR "border clash") AND (sourcecountry:US OR sourcecountry:GB OR sourcecountry:HU)');

  const [dataEn, dataHu, dataGdelt] = await Promise.all([
    fetchJsonSafe<{ articles?: RawArticle[] }>(`https://gnews.io/api/v4/search?q=${queryEn}&lang=en&country=us&max=10&sortby=publishedAt&apikey=${apiKey}`, 'GNews EN'),
    fetchJsonSafe<{ articles?: RawArticle[] }>(`https://gnews.io/api/v4/search?q=${queryHu}&lang=hu&country=hu&max=10&sortby=publishedAt&apikey=${apiKey}`, 'GNews HU'),
    fetchJsonSafe<{ articles?: GdeltArticle[] }>(`https://api.gdeltproject.org/api/v2/doc/doc?query=${gdeltQuery}&mode=ArtList&maxrecords=40&format=json&sort=DateDesc`, 'GDELT Doc'),
  ]);

  const gdeltArticles: RawArticle[] = Array.isArray(dataGdelt?.articles)
    ? (dataGdelt.articles as GdeltArticle[]).map((article) => ({
      title: article.title,
      description: `Konfliktus figyelo forras (${article.domain || article.sourcecountry || 'GDELT'})`,
      content: article.title,
      url: article.url,
      source: article.domain || 'GDELT',
      publishedAt: article.seendate ? new Date(article.seendate).toISOString() : undefined,
    }))
    : [];

  const allArticles = [
    ...(Array.isArray(dataEn?.articles) ? dataEn.articles : []),
    ...(Array.isArray(dataHu?.articles) ? dataHu.articles : []),
    ...gdeltArticles,
  ];

  // Remove duplicate URLs
  const uniqueUrls = new Set<string>();
  const filtered: RawArticle[] = [];
  for (const a of allArticles) {
    if (a.url && !uniqueUrls.has(a.url)) {
      uniqueUrls.add(a.url);
      filtered.push(a);
    }
  }

  // Sort by publishedAt newest first
  filtered.sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
  
  return filtered.slice(0, 30); // Keep more candidates for conflict extraction
}

function parseLocationName(name: string): { location: string; country: string } {
  const parts = name
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return { location: 'Ismeretlen helyszín', country: 'Ismeretlen ország' };
  }
  if (parts.length === 1) {
    return { location: parts[0], country: 'Ismeretlen ország' };
  }

  return {
    location: parts[0],
    country: parts[parts.length - 1],
  };
}

function severityFromMentions(count: number): 'high' | 'medium' | 'low' {
  if (count >= 20) return 'high';
  if (count >= 8) return 'medium';
  return 'low';
}

async function fetchGeoConflictsFromGdelt(): Promise<StoredConflict[]> {
  const geoQuery = encodeURIComponent('"war" OR "bomb" OR "missile" OR "airstrike" OR "shelling" OR "artillery" OR "drone strike" OR "border clash" OR "explosion"');
  const pointThemeUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${geoQuery}&mode=PointTheme&timespan=1day&maxrecords=600&format=json`;
  const geoJsonUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${geoQuery}&mode=GeoJSON&timespan=1day&maxrecords=600&format=json`;

  const [pointThemeData, geoJsonData] = await Promise.all([
    fetchJsonSafe<{ features?: Array<{ properties?: GdeltGeoPoint; geometry?: { coordinates?: number[] } }> }>(pointThemeUrl, 'GDELT GEO PointTheme'),
    fetchJsonSafe<{ features?: Array<{ properties?: GdeltGeoPoint; geometry?: { coordinates?: number[] } }> }>(geoJsonUrl, 'GDELT GEO GeoJSON'),
  ]);

  const features = [
    ...(Array.isArray(pointThemeData?.features) ? pointThemeData.features : []),
    ...(Array.isArray(geoJsonData?.features) ? geoJsonData.features : []),
  ];

  const seen = new Set<string>();
  const nowIso = new Date().toISOString();
  const conflicts: StoredConflict[] = [];

  for (const feature of features) {
    const props = feature.properties || {};
    const coords = feature.geometry?.coordinates;
    const lon = Array.isArray(coords) ? Number(coords[0]) : Number(props.lon);
    const lat = Array.isArray(coords) ? Number(coords[1]) : Number(props.lat);
    const mentions = Number(props.count || 0);
    const rawName = String(props.name || '').trim();

    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !rawName || mentions < 1) {
      continue;
    }

    const roundedKey = `${lat.toFixed(2)}_${lon.toFixed(2)}`;
    if (seen.has(roundedKey)) continue;
    seen.add(roundedKey);

    const parsed = parseLocationName(rawName);
    const severity = severityFromMentions(mentions);

    conflicts.push({
      event_id: crypto.randomUUID(),
      event_date: nowIso,
      event_type: 'Fegyveres konfliktus jelzés',
      country: parsed.country,
      location: parsed.location,
      latitude: lat,
      longitude: lon,
      fatalities: 0,
      description: `${mentions} friss hirhivatkozas alapjan aktiv konfliktus-esemeny a tersegben.`,
      source: 'GDELT GEO',
      severity,
    });
  }

  return conflicts.slice(0, 220);
}

async function analyzeArticleWithGroq(article: RawArticle, groqApiKey: string): Promise<AnalysisResult> {
  const prompt = [
    'Te egy magyar nyelvu geopolitikai es gazdasagi hir-elemzo vagy.',
    'Egyetlen cikk alapjan kell strukturalt elemzest adnod magyarul.',
    'Kizarolag ervenyes JSON-t adj vissza komment nelkul.',
    'A JSON schema:',
    '{',
    '  "summary": "rovid magyar osszefoglalo",',
    '  "warning_level": "high|medium|low",',
    '  "sentiment_score": -1 es 1 kozotti szam,',
    '  "topics": ["tema1", "tema2"],',
    '  "affects_hungary": true vagy false,',
    '  "hungary_impact": "magyar nyelvu, kozertheto magyarazat",',
    '  "conflict": { "event_type": "string (pl. Fegyveres konfliktus)", "country": "string", "location": "string", "latitude": float, "longitude": float, "description": "megfelo leiras a konfliktusrol", "severity": "high|medium|low", "fatalities": int }',
    '}',
    '',
    'Szabalyok:',
    '- A summary es a hungary_impact mindig magyarul legyen.',
    '- Ha nincs kozvetlen magyar hatas, akkor affects_hungary legyen false es a hungary_impact legyen rovid magyar mondat.',
    '- A topics maximum 4 elem legyen.',
    '- A conflict MEZOT CSAK AKKOR HASZNALD, HA a cikk egy jelenlegi konkret fegyveres konfliktusrol, haborurol vagy eros zavargasrol szol. Ilyenkor ezt probald meg beazonositani. Ha a cikk egyaltalan nem haborurol vagy fizikai konfliktusrol (pl gazdasagi hir vagy politika), akkor NE rakj a JSON-ba conflict kulcsot.',
    '',
    `Cim: ${article.title || 'Nincs cim'}`,
    `Forras: ${normalizeSource(article.source)}`,
    `Datum: ${article.publishedAt || 'Ismeretlen datum'}`,
    '',
    normalizeText(article),
  ].join('\n');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 800,
      messages: [
        {
          role: 'system',
          content: 'Mindig ervenyes JSON-t adj vissza.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq analysis failed: ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== 'string') {
    throw new Error('Groq returned no content');
  }

  const parsed = JSON.parse(content) as Partial<AnalysisResult>;

  return {
    summary: parsed.summary?.trim() || 'Nem sikerült összefoglalót készíteni.',
    warning_level: parsed.warning_level === 'high' || parsed.warning_level === 'medium' ? parsed.warning_level : 'low',
    sentiment_score: typeof parsed.sentiment_score === 'number' ? Math.max(-1, Math.min(1, parsed.sentiment_score)) : 0,
    topics: Array.isArray(parsed.topics) ? parsed.topics.map((topic) => String(topic).trim()).filter(Boolean).slice(0, 4) : [],
    affects_hungary: Boolean(parsed.affects_hungary),
    hungary_impact: parsed.hungary_impact?.trim() || 'Nincs egyértelmű közvetlen magyar hatás megjelölve.',
    conflict: parsed.conflict && typeof parsed.conflict === 'object' ? {
      event_type: parsed.conflict.event_type || 'Katonai esemény',
      country: parsed.conflict.country || 'Ismeretlen',
      location: parsed.conflict.location || 'Ismeretlen',
      latitude: typeof parsed.conflict.latitude === 'number' ? parsed.conflict.latitude : 0,
      longitude: typeof parsed.conflict.longitude === 'number' ? parsed.conflict.longitude : 0,
      description: parsed.conflict.description || parsed.summary || '',
      severity: ['high', 'medium', 'low'].includes(parsed.conflict.severity as any) ? parsed.conflict.severity : 'medium',
      fatalities: typeof parsed.conflict.fatalities === 'number' ? parsed.conflict.fatalities : 0,
    } : undefined
  };
}

function mapToStoredArticle(article: RawArticle, analysis: AnalysisResult): StoredArticle {
  return {
    title: article.title?.trim() || 'Cím nélküli hír',
    source: normalizeSource(article.source),
    url: article.url?.trim() || '',
    published_at: article.publishedAt || new Date().toISOString(),
    sentiment_score: analysis.sentiment_score,
    topics: analysis.topics,
    affects_hungary: analysis.affects_hungary,
    hungary_impact: analysis.hungary_impact,
    warning_level: analysis.warning_level,
    summary: analysis.summary,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const groqApiKey = Deno.env.get('GROQ_API_KEY');
  const gnewsApiKey = Deno.env.get('GNEWS_API_KEY');

  if (!supabaseUrl || !serviceRoleKey || !groqApiKey || !gnewsApiKey) {
    return new Response(JSON.stringify({ error: 'Missing required secrets' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const latestNews = await fetchLatestNews(gnewsApiKey);
    const geoConflicts = await fetchGeoConflictsFromGdelt();
    const validArticles = latestNews.filter((article) => article.url && article.title);

    const urls = validArticles.map((article) => article.url as string);
    const { data: existingArticles, error: existingError } = await supabase
      .from('articles')
      .select('url')
      .in('url', urls);

    if (existingError) {
      throw existingError;
    }

    const existingUrls = new Set((existingArticles || []).map((item) => item.url));
    const newArticles = validArticles.filter((article) => !existingUrls.has(article.url as string));

    const analyzedArticles: StoredArticle[] = [];
    const newConflicts: StoredConflict[] = [];

    for (const article of newArticles) {
      const analysis = await analyzeArticleWithGroq(article, groqApiKey);
      analyzedArticles.push(mapToStoredArticle(article, analysis));

      if (analysis.conflict) {
        newConflicts.push({
          event_id: crypto.randomUUID(),
          event_date: article.publishedAt || new Date().toISOString(),
          event_type: analysis.conflict.event_type,
          country: analysis.conflict.country,
          location: analysis.conflict.location,
          latitude: analysis.conflict.latitude,
          longitude: analysis.conflict.longitude,
          fatalities: analysis.conflict.fatalities,
          description: analysis.conflict.description,
          source: normalizeSource(article.source),
          severity: analysis.conflict.severity,
        });
      }
    }

    if (analyzedArticles.length > 0) {
      const { error: insertError } = await supabase
        .from('articles')
        .insert(analyzedArticles);

      if (insertError) {
        throw insertError;
      }
    }

    const allConflicts = [...newConflicts, ...geoConflicts];
    if (allConflicts.length > 0) {
      // Conflicts insertion is non-fatal if it fails (articles will still be logged as success)
      const deduped: StoredConflict[] = [];
      const seen = new Set<string>();
      for (const conflict of allConflicts) {
        const key = `${conflict.event_type.toLowerCase()}_${conflict.latitude.toFixed(2)}_${conflict.longitude.toFixed(2)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(conflict);
      }

      const { error: conflictError } = await supabase
        .from('conflicts')
        .insert(deduped);

      if (conflictError) {
        console.error('Confict insert error:', conflictError);
      }
    }

    return new Response(JSON.stringify({
      fetched: latestNews.length,
      inserted: analyzedArticles.length,
      skipped: validArticles.length - newArticles.length,
      conflictsInserted: newConflicts.length + geoConflicts.length,
      geoConflictsInserted: geoConflicts.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const serialized = serializeError(error);

    return new Response(JSON.stringify({
      error: 'news-ingest failed',
      details: serialized,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
