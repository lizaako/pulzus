import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Parser from 'https://esm.sh/rss-parser@3.13.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RSS_FEEDS = [
  { url: 'https://feeds.reuters.com/reuters/worldNews', fallback: 'http://feeds.reuters.com/reuters/worldNews', source: 'RSS - Reuters World News' },
  { url: 'https://feeds.reuters.com/reuters/businessNews', fallback: 'http://feeds.reuters.com/reuters/businessNews', source: 'RSS - Reuters Business News' },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'RSS - BBC News' },
  { url: 'https://rss.dw.com/rdf/rss-en-all', source: 'RSS - Deutsche Welle' },
  { url: 'https://feeds.skynews.com/feeds/rss/world.rss', fallback: 'http://feeds.skynews.com/feeds/rss/world.rss', source: 'RSS - Sky News' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'RSS - Al Jazeera' },
  { url: 'https://feeds.ft.com/ft/rss/home', fallback: 'http://feeds.ft.com/ft/rss/home', source: 'RSS - Financial Times' },
  { url: 'https://feeds.bloomberg.com/markets/news.rss', source: 'RSS - Bloomberg Markets' },
];
const MAX_ARTICLES_PER_RUN = 20;
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_TIMEOUT_MS = 25000;

interface ArticleRow {
  title: string;
  url: string;
  published_at: string;
  source: string;
  sentiment_score?: number;
  topics?: string[];
  affects_hungary?: boolean;
  hungary_impact?: string;
  warning_level?: string;
  summary?: string;
  conflict_event_type?: string | null;
  conflict_country?: string | null;
  conflict_location?: string | null;
  conflict_latitude?: number | null;
  conflict_longitude?: number | null;
  conflict_fatalities?: number | null;
  conflict_description?: string | null;
  conflict_severity?: string | null;
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

  return { message: String(error) };
}

function asIsoDate(value: string | undefined): string {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || null;
}

function normalizeUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return null;
  return trimmed;
}

function stripOptionalArticleFields(article: ArticleRow) {
  const {
    sentiment_score: _sentimentScore,
    topics: _topics,
    affects_hungary: _affectsHungary,
    hungary_impact: _hungaryImpact,
    warning_level: _warningLevel,
    summary: _summary,
    conflict_event_type: _conflictEventType,
    conflict_country: _conflictCountry,
    conflict_location: _conflictLocation,
    conflict_latitude: _conflictLatitude,
    conflict_longitude: _conflictLongitude,
    conflict_fatalities: _conflictFatalities,
    conflict_description: _conflictDescription,
    conflict_severity: _conflictSeverity,
    ...baseArticle
  } = article;

  return baseArticle;
}

function shouldRetryWithBaseArticle(error: unknown): boolean {
  const serialized = serializeError(error);
  const haystack = [
    serialized.message,
    serialized.details,
    serialized.hint,
  ].filter(Boolean).join(' ').toLowerCase();

  return haystack.includes('schema cache')
    || haystack.includes('could not find')
    || haystack.includes('column')
    || haystack.includes('bad request');
}

async function fetchFeedXml(url: string, fallbackUrl?: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
        'User-Agent': 'Pulzus RSS Ingest/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Status code ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    if (!fallbackUrl) throw error;

    console.log(`RSS ingest: primary URL failed, trying fallback: ${fallbackUrl}`);
    const fallbackResponse = await fetch(fallbackUrl, {
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
        'User-Agent': 'Pulzus RSS Ingest/1.0',
      },
    });

    if (!fallbackResponse.ok) {
      throw new Error(`Fallback failed with status code ${fallbackResponse.status}`);
    }

    return await fallbackResponse.text();
  }
}

async function fetchFeedArticles(feed: typeof RSS_FEEDS[number], parser: Parser): Promise<ArticleRow[]> {
  console.log(`RSS ingest: fetching ${feed.source} (${feed.url})`);

  const xml = await fetchFeedXml(feed.url, (feed as { fallback?: string }).fallback);
  const parsedFeed = await parser.parseString(xml);
  const articles: ArticleRow[] = [];

  for (const item of parsedFeed.items || []) {
    const url = normalizeUrl(item.link || item.guid);
    const title = typeof item.title === 'string' ? item.title.trim() : '';

    if (!url || !title) {
      console.warn('RSS ingest: skipping item with missing title or URL', { source: feed.source, title, url });
      continue;
    }

    articles.push({
      title,
      url,
      published_at: asIsoDate(item.isoDate || item.pubDate),
      source: feed.source,
      sentiment_score: 0,
      topics: [],
      affects_hungary: false,
      hungary_impact: 'RSS ingest: nincs automatikus magyar hataselemzes ehhez a cikkhez.',
      warning_level: 'low',
      summary: cleanText(item.contentSnippet) || cleanText(item.summary) || cleanText(item.description) || title,
    });
  }

  console.log(`RSS ingest: ${feed.source} yielded ${articles.length} usable article(s)`);
  return articles;
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(`Request timed out after ${timeoutMs}ms`), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractJsonObject(content: string): string {
  const trimmed = content.trim();

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function normalizeAnalysis(article: ArticleRow, parsed: Partial<AnalysisResult>): ArticleRow {
  const warningLevel = parsed.warning_level === 'high' || parsed.warning_level === 'medium'
    ? parsed.warning_level
    : 'low';
  const sentimentScore = typeof parsed.sentiment_score === 'number'
    ? Math.max(-1, Math.min(1, parsed.sentiment_score))
    : 0;
  const conflict = parsed.conflict && typeof parsed.conflict === 'object' ? parsed.conflict : undefined;

  return {
    ...article,
    summary: parsed.summary?.trim() || article.summary || article.title,
    warning_level: warningLevel,
    sentiment_score: sentimentScore,
    topics: Array.isArray(parsed.topics) ? parsed.topics.map((topic) => String(topic).trim()).filter(Boolean).slice(0, 4) : article.topics || [],
    affects_hungary: Boolean(parsed.affects_hungary),
    hungary_impact: parsed.hungary_impact?.trim() || article.hungary_impact || 'Nincs egyertelmu kozvetlen magyar hatas megjelolve.',
    conflict_event_type: conflict?.event_type || null,
    conflict_country: conflict?.country || null,
    conflict_location: conflict?.location || null,
    conflict_latitude: typeof conflict?.latitude === 'number' ? conflict.latitude : null,
    conflict_longitude: typeof conflict?.longitude === 'number' ? conflict.longitude : null,
    conflict_fatalities: typeof conflict?.fatalities === 'number' ? conflict.fatalities : null,
    conflict_description: conflict?.description || null,
    conflict_severity: conflict?.severity || null,
  };
}

async function analyzeArticleWithGroq(article: ArticleRow, groqApiKey: string): Promise<ArticleRow> {
  const prompt = [
    'Te egy magyar nyelvu geopolitikai es gazdasagi hir-elemzo vagy.',
    'Egyetlen RSS cikk alapjan kell strukturalt elemzest adnod magyarul.',
    'Kizarolag ervenyes JSON-t adj vissza komment nelkul.',
    'A JSON schema:',
    '{',
    '  "summary": "rovid magyar osszefoglalo",',
    '  "warning_level": "high|medium|low",',
    '  "sentiment_score": -1 es 1 kozotti szam,',
    '  "topics": ["tema1", "tema2"],',
    '  "affects_hungary": true vagy false,',
    '  "hungary_impact": "magyar nyelvu, kozertheto magyarazat",',
    '  "conflict": { "event_type": "string (pl. Fegyveres konfliktus)", "country": "string", "location": "string", "latitude": float, "longitude": float, "description": "megfelelo leiras a konfliktusrol", "severity": "high|medium|low", "fatalities": int }',
    '}',
    '',
    'Szabalyok:',
    '- A summary es a hungary_impact mindig magyarul legyen.',
    '- Ha nincs kozvetlen magyar hatas, akkor affects_hungary legyen false es a hungary_impact legyen rovid magyar mondat.',
    '- A topics maximum 4 elem legyen, es ne legyen ures.',
    '- A warning_level high legyen konkret haborus esemeny, eroszakos tamadas, nagy geopolitikai sokk vagy komoly piaci/gazdasagi kockazat eseten.',
    '- A warning_level medium legyen fontos politikai, gazdasagi, diplomaciai vagy biztonsagi kockazat eseten.',
    '- A conflict MEZOT CSAK AKKOR HASZNALD, HA a cikk egy jelenlegi konkret fegyveres konfliktusrol, haborurol, tamadasrol, csapasrol, eros zavargasrol vagy geolokalizalhato eroszakos esemenyrol szol.',
    '- Ha van konkret konfliktus, adj valoszeru koordinatat. Orszagszintu koordinatat csak akkor hasznalj, ha nincs pontosabb hely.',
    '- Ha a cikk nem fizikai konfliktusrol szol, NE rakj a JSON-ba conflict kulcsot.',
    '',
    `Cim: ${article.title}`,
    `Forras: ${article.source}`,
    `Datum: ${article.published_at}`,
    '',
    article.summary || article.title,
  ].join('\n');

  const response = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.2,
      max_tokens: 500,
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
  }, GROQ_TIMEOUT_MS);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq RSS analysis failed (${response.status}): ${errorText.slice(0, 500)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== 'string') {
    throw new Error('Groq RSS analysis returned no content');
  }

  return normalizeAnalysis(article, JSON.parse(extractJsonObject(content)) as Partial<AnalysisResult>);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const groqApiKey = Deno.env.get('GROQ_API_KEY');

  if (!supabaseUrl || !serviceRoleKey || !groqApiKey) {
    return new Response(JSON.stringify({ error: 'Missing required secrets' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const parser = new Parser();

  const feedErrors: Array<{ feed: string; details: ReturnType<typeof serializeError> }> = [];
  const articleMap = new Map<string, ArticleRow>();

  for (const feed of RSS_FEEDS) {
    try {
      const articles = await fetchFeedArticles(feed, parser);
      for (const article of articles) {
        if (!articleMap.has(article.url)) {
          articleMap.set(article.url, article);
        }
      }
    } catch (error) {
      console.error(`RSS ingest: failed to process ${feed.source}`, serializeError(error));
      feedErrors.push({ feed: feed.source, details: serializeError(error) });
    }
  }

  try {
    const candidates = Array.from(articleMap.values())
      .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
      .slice(0, MAX_ARTICLES_PER_RUN);
    console.log(`RSS ingest: ${candidates.length} unique candidate article(s) across all feeds`);

    let inserted = 0;
    let duplicatesSkipped = 0;
    let insertFailures = 0;
    let analysisFailures = 0;
    let analyzedCount = 0;

    for (const article of candidates) {
      const { data: existingArticle, error: existingError } = await supabase
        .from('articles')
        .select('id')
        .eq('url', article.url)
        .maybeSingle();

      if (existingError) {
        console.error('RSS ingest: duplicate check failed', {
          url: article.url,
          error: serializeError(existingError),
        });
        insertFailures += 1;
        continue;
      }

      if (existingArticle) {
        duplicatesSkipped += 1;
        continue;
      }

      let articleToInsert: ArticleRow;
      try {
        articleToInsert = await analyzeArticleWithGroq(article, groqApiKey);
        analyzedCount += 1;
      } catch (error) {
        analysisFailures += 1;
        console.error('RSS ingest: AI analysis failed, skipping article', {
          url: article.url,
          error: serializeError(error),
        });
        continue;
      }

      const { error: insertError } = await supabase
        .from('articles')
        .insert(articleToInsert);

      if (!insertError) {
        inserted += 1;
        continue;
      }

      if (!shouldRetryWithBaseArticle(insertError)) {
        console.error('RSS ingest: article insert failed', {
          url: article.url,
          error: serializeError(insertError),
        });
        insertFailures += 1;
        continue;
      }

      console.warn('RSS ingest: retrying insert with base article columns only', {
        url: article.url,
        error: serializeError(insertError),
      });
      const { error: fallbackInsertError } = await supabase
        .from('articles')
        .insert(stripOptionalArticleFields(articleToInsert));

      if (fallbackInsertError) {
        console.error('RSS ingest: fallback article insert failed', {
          url: article.url,
          error: serializeError(fallbackInsertError),
        });
        insertFailures += 1;
        continue;
      }

      inserted += 1;
    }

    return new Response(JSON.stringify({
      fetched: candidates.length,
      inserted,
      duplicatesSkipped,
      insertFailures,
      analyzed: analyzedCount,
      analysisFailures,
      feedErrors,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('RSS ingest: fatal database error', serializeError(error));
    return new Response(JSON.stringify({
      error: 'rss-ingest failed',
      details: serializeError(error),
      feedErrors,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
