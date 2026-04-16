import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_MAX_RETRIES = 3;
const GROQ_BASE_DELAY_MS = 2200;
const MAX_NEW_ARTICLES_PER_RUN = 8;
const MAX_CANDIDATES_PER_RUN = 30;
const GNEWS_TIMEOUT_MS = 12000;
const GROQ_TIMEOUT_MS = 25000;
const RUN_BUDGET_MS = 110000;
const GNEWS_RATE_LIMIT_WINDOW_MS = 20 * 60 * 1000;

const RELEVANCE_KEYWORDS = [
  'war', 'conflict', 'attack', 'strike', 'shelling', 'offensive', 'ceasefire', 'military', 'troop', 'drone',
  'háború', 'konfliktus', 'támadás', 'csapás', 'bombázás', 'tűzszünet', 'katonai', 'front',
  'politics', 'political', 'government', 'election', 'parliament', 'diplomacy', 'sanction', 'policy', 'geopolitics',
  'politika', 'kormány', 'választás', 'parlament', 'diplomácia', 'szankció', 'geopolitika',
  'market', 'markets', 'economy', 'economic', 'inflation', 'interest rate', 'oil', 'gas', 'trade', 'tariff', 'stock', 'forex',
  'piac', 'piacok', 'gazdaság', 'infláció', 'kamat', 'olaj', 'gáz', 'kereskedelem', 'vám', 'részvény', 'deviza',
];

interface RawArticle {
  title?: string;
  description?: string;
  content?: string;
  url?: string;
  source?: { name?: string } | string;
  publishedAt?: string;
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
  conflict_event_type: string | null;
  conflict_country: string | null;
  conflict_location: string | null;
  conflict_latitude: number | null;
  conflict_longitude: number | null;
  conflict_fatalities: number | null;
  conflict_description: string | null;
  conflict_severity: string | null;
}

type BaseStoredArticle = Omit<
  StoredArticle,
  | 'conflict_event_type'
  | 'conflict_country'
  | 'conflict_location'
  | 'conflict_latitude'
  | 'conflict_longitude'
  | 'conflict_fatalities'
  | 'conflict_description'
  | 'conflict_severity'
>;

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
    .slice(0, 2800);
}

function normalizeForMatching(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function articleRelevanceText(article: RawArticle): string {
  return normalizeForMatching([
    article.title || '',
    article.description || '',
    article.content || '',
    normalizeSource(article.source),
  ].join(' '));
}

function isRelevantArticle(article: RawArticle): boolean {
  const haystack = articleRelevanceText(article);
  return RELEVANCE_KEYWORDS.some((keyword) => haystack.includes(normalizeForMatching(keyword)));
}

function isRelevantAnalysis(analysis: AnalysisResult): boolean {
  const topicsText = Array.isArray(analysis.topics) ? analysis.topics.join(' ') : '';
  const haystack = normalizeForMatching([
    analysis.summary,
    analysis.hungary_impact,
    topicsText,
  ].join(' '));

  return RELEVANCE_KEYWORDS.some((keyword) => haystack.includes(normalizeForMatching(keyword)));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function getRetryDelayMs(response: Response, errorText: string, attempt: number) {
  const retryAfterHeader = response.headers.get('retry-after');
  const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
    return Math.ceil(retryAfterSeconds * 1000) + 250;
  }

  const match = errorText.match(/try again in ([0-9.]+)s/i);
  const retryAfterFromBody = match ? Number(match[1]) : NaN;

  if (Number.isFinite(retryAfterFromBody) && retryAfterFromBody >= 0) {
    return Math.ceil(retryAfterFromBody * 1000) + 250;
  }

  return GROQ_BASE_DELAY_MS * (attempt + 1);
}

async function fetchLatestNews(apiKey: string): Promise<RawArticle[]> {
  // Keep queries comfortably under GNews' 200 character limit.
  const queryEn = encodeURIComponent('war OR conflict OR politics OR economy OR markets OR oil OR gas');
  const queryHu = encodeURIComponent('háború OR konfliktus OR politika OR gazdaság OR piac OR olaj OR gáz');

  const [resEn, resHu] = await Promise.all([
    fetchWithTimeout(`https://gnews.io/api/v4/search?q=${queryEn}&lang=en&max=15&sortby=publishedAt&apikey=${apiKey}`, {}, GNEWS_TIMEOUT_MS),
    fetchWithTimeout(`https://gnews.io/api/v4/search?q=${queryHu}&lang=hu&country=hu&max=10&sortby=publishedAt&apikey=${apiKey}`, {}, GNEWS_TIMEOUT_MS),
  ]);

  let dataEn: { articles?: RawArticle[] } = {};
  let dataHu: { articles?: RawArticle[] } = {};
  const fetchErrors: string[] = [];

  if (!resEn.ok) {
    const body = await resEn.text();
    fetchErrors.push(`English GNews fetch failed (${resEn.status}): ${body.slice(0, 240)}`);
  } else {
    dataEn = await resEn.json();
  }

  if (!resHu.ok) {
    const body = await resHu.text();
    fetchErrors.push(`Hungarian GNews fetch failed (${resHu.status}): ${body.slice(0, 240)}`);
  } else {
    dataHu = await resHu.json();
  }

  const allFetchesRateLimited = fetchErrors.length === 2 && fetchErrors.every((error) => error.includes('(429)'));

  if (allFetchesRateLimited) {
    console.warn(`GNews rate limited on all requests. Returning no articles for this run and allowing retry on the next cron. Cooldown window: ${GNEWS_RATE_LIMIT_WINDOW_MS}ms.`);
    return [];
  }

  if (fetchErrors.length === 2) {
    throw new Error(fetchErrors.join(' | '));
  }

  if (fetchErrors.length === 1) {
    console.warn(fetchErrors[0]);
  }

  const allArticles = [
    ...(Array.isArray(dataEn?.articles) ? dataEn.articles : []),
    ...(Array.isArray(dataHu?.articles) ? dataHu.articles : [])
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

  const relevantArticles = filtered.filter(isRelevantArticle);

  return relevantArticles.slice(0, MAX_CANDIDATES_PER_RUN);
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

  for (let attempt = 0; attempt <= GROQ_MAX_RETRIES; attempt += 1) {
    const response = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.2,
        max_tokens: 450,
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
      const isRateLimited = response.status === 429 || errorText.includes('rate_limit_exceeded');

      if (isRateLimited && attempt < GROQ_MAX_RETRIES) {
        const delayMs = getRetryDelayMs(response, errorText, attempt);
        console.warn(`Groq rate limited, retrying in ${delayMs}ms (attempt ${attempt + 1}/${GROQ_MAX_RETRIES + 1})`);
        await sleep(delayMs);
        continue;
      }

      throw new Error(`Groq analysis failed: ${errorText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (typeof content !== 'string') {
      throw new Error('Groq returned no content');
    }

    const parsed = JSON.parse(extractJsonObject(content)) as Partial<AnalysisResult>;

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

  throw new Error('Groq analysis failed after retries');
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
    conflict_event_type: analysis.conflict?.event_type || null,
    conflict_country: analysis.conflict?.country || null,
    conflict_location: analysis.conflict?.location || null,
    conflict_latitude: analysis.conflict?.latitude ?? null,
    conflict_longitude: analysis.conflict?.longitude ?? null,
    conflict_fatalities: analysis.conflict?.fatalities ?? null,
    conflict_description: analysis.conflict?.description || null,
    conflict_severity: analysis.conflict?.severity || null,
  };
}

function stripConflictFields(article: StoredArticle): BaseStoredArticle {
  const {
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

function isMissingConflictColumnError(error: unknown): boolean {
  const serialized = serializeError(error);
  const haystack = [
    serialized.message,
    'details' in serialized ? serialized.details : undefined,
    'hint' in serialized ? serialized.hint : undefined,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes('conflict_') && (
    haystack.includes('column') ||
    haystack.includes('schema cache') ||
    haystack.includes('could not find')
  );
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
    const startedAt = Date.now();
    const latestNews = await fetchLatestNews(gnewsApiKey);
    const validArticles = latestNews.filter((article) => article.url && article.title);

    if (validArticles.length === 0) {
      return new Response(JSON.stringify({
        fetched: latestNews.length,
        attempted: 0,
        inserted: 0,
        skipped: 0,
        analysisFailures: 0,
        conflictsDetected: 0,
        note: 'No valid articles returned by upstream news providers.',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const urls = validArticles.map((article) => article.url as string);
    const { data: existingArticles, error: existingError } = await supabase
      .from('articles')
      .select('url')
      .in('url', urls);

    if (existingError) {
      throw existingError;
    }

    const existingUrls = new Set((existingArticles || []).map((item: { url: string }) => item.url));
    const newArticles = validArticles
      .filter((article) => !existingUrls.has(article.url as string))
      .slice(0, MAX_NEW_ARTICLES_PER_RUN);

    const analyzedArticles: StoredArticle[] = [];
    let analysisFailures = 0;
    let relevanceFilteredOut = 0;

    for (const article of newArticles) {
      if (Date.now() - startedAt > RUN_BUDGET_MS) {
        console.warn('Stopping news ingest early to avoid platform timeout.', {
          attemptedSoFar: analyzedArticles.length + analysisFailures + relevanceFilteredOut,
          totalPlanned: newArticles.length,
        });
        break;
      }

      try {
        const analysis = await analyzeArticleWithGroq(article, groqApiKey);

        if (!isRelevantAnalysis(analysis)) {
          relevanceFilteredOut += 1;
          continue;
        }

        analyzedArticles.push(mapToStoredArticle(article, analysis));
      } catch (error) {
        analysisFailures += 1;
        console.error(`Article analysis failed for ${article.url || article.title}:`, serializeError(error));
      }
    }

    let insertedArticles = analyzedArticles.length;
    let insertFallbackUsed = false;

    if (analyzedArticles.length > 0) {
      const { error: insertError } = await supabase
        .from('articles')
        .insert(analyzedArticles);

      if (insertError) {
        if (!isMissingConflictColumnError(insertError)) {
          throw insertError;
        }

        console.warn('Retrying article insert without optional conflict fields because the target database is missing one or more conflict_* columns.', serializeError(insertError));

        const fallbackArticles = analyzedArticles.map(stripConflictFields);
        const { error: fallbackInsertError } = await supabase
          .from('articles')
          .insert(fallbackArticles);

        if (fallbackInsertError) {
          throw fallbackInsertError;
        }

        insertFallbackUsed = true;
      }
    }

    return new Response(JSON.stringify({
      fetched: latestNews.length,
      attempted: newArticles.length,
      inserted: insertedArticles,
      skipped: (validArticles.length - newArticles.length) + relevanceFilteredOut,
      analysisFailures,
      relevanceFilteredOut,
      conflictsDetected: analyzedArticles.filter((article) => article.conflict_latitude !== null && article.conflict_longitude !== null).length,
      insertFallbackUsed,
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
