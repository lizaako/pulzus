import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const LAST_UPDATE_URLS = [
  'https://data.gdeltproject.org/gdeltv2/lastupdate.txt',
  'http://data.gdeltproject.org/gdeltv2/lastupdate.txt',
];
const MAX_TITLE_FETCHES = 40;
const TITLE_FETCH_TIMEOUT_MS = 7000;

interface GdeltEvent {
  event_date: string;
  country_code: string | null;
  lat: number | null;
  lng: number | null;
  event_code: string | null;
  goldstein_scale: number;
  source_url: string;
}

interface ArticleRow {
  title: string;
  url: string;
  content: string | null;
  published_at: string;
  source: string;
  sentiment_score?: number;
  topics?: string[];
  affects_hungary?: boolean;
  hungary_impact?: string;
  warning_level?: string;
  summary?: string;
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

function parseNumber(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseSqlDate(value: string): string {
  if (!/^\d{8}$/.test(value)) return new Date().toISOString();
  const year = value.slice(0, 4);
  const month = value.slice(4, 6);
  const day = value.slice(6, 8);
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`).toISOString();
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      fields.push(current);
      current = '';
      continue;
    }

    fields.push(char);
  }

  fields.push(current);
  return fields;
}

function parseGdeltCsv(csvText: string): GdeltEvent[] {
  const events: GdeltEvent[] = [];
  const seenUrls = new Set<string>();

  for (const line of csvText.split(/\r?\n/)) {
    if (!line.trim()) continue;

    const columns = parseDelimitedLine(line, '\t');
    const sourceUrl = columns[60]?.trim();
    const goldsteinScale = parseNumber(columns[30]?.trim() || '');

    if (!sourceUrl || !sourceUrl.startsWith('http') || goldsteinScale === null) {
      continue;
    }

    if (seenUrls.has(sourceUrl)) {
      continue;
    }
    seenUrls.add(sourceUrl);

    events.push({
      event_date: parseSqlDate(columns[1]?.trim() || ''),
      country_code: columns[53]?.trim() || null,
      lat: parseNumber(columns[57]?.trim() || ''),
      lng: parseNumber(columns[58]?.trim() || ''),
      event_code: columns[26]?.trim() || null,
      goldstein_scale: goldsteinScale,
      source_url: sourceUrl,
    });
  }

  return events;
}

async function unzipCsv(zipBytes: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(zipBytes);
  const view = new DataView(zipBytes);

  if (view.getUint32(0, true) !== 0x04034b50) {
    throw new Error('GDELT ZIP did not start with a local file header');
  }

  const compressionMethod = view.getUint16(8, true);
  const compressedSize = view.getUint32(18, true);
  const fileNameLength = view.getUint16(26, true);
  const extraFieldLength = view.getUint16(28, true);
  const dataStart = 30 + fileNameLength + extraFieldLength;
  const dataEnd = dataStart + compressedSize;
  const compressedMember = bytes.slice(dataStart, dataEnd);

  if (compressionMethod === 0) {
    return new TextDecoder().decode(compressedMember);
  }

  if (compressionMethod !== 8) {
    throw new Error(`Unsupported GDELT ZIP compression method: ${compressionMethod}`);
  }

  const stream = new Blob([compressedMember]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return await new Response(stream).text();
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(`Request timed out after ${timeoutMs}ms`), timeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Pulzus Supabase Edge Function',
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function stripOptionalArticleFields(article: ArticleRow) {
  const {
    sentiment_score: _sentimentScore,
    topics: _topics,
    affects_hungary: _affectsHungary,
    hungary_impact: _hungaryImpact,
    warning_level: _warningLevel,
    summary: _summary,
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
    || haystack.includes('column');
}

async function fetchArticleTitle(url: string): Promise<string> {
  try {
    const response = await fetchWithTimeout(url, TITLE_FETCH_TIMEOUT_MS);
    if (!response.ok) {
      console.warn(`GDELT ingest: title fetch failed for ${url} with HTTP ${response.status}`);
      return url;
    }

    const html = await response.text();
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
      ?.replace(/\s+/g, ' ')
      .trim();

    return title ? decodeHtmlEntities(title) : url;
  } catch (error) {
    console.warn(`GDELT ingest: title fetch error for ${url}`, serializeError(error));
    return url;
  }
}

async function findLatestExportCsvZipUrl(): Promise<string> {
  const errors: Array<{ url: string; details: ReturnType<typeof serializeError> | { message: string } }> = [];

  for (const url of LAST_UPDATE_URLS) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        errors.push({ url, details: { message: `HTTP ${response.status}` } });
        continue;
      }

      const body = await response.text();
      const match = body.match(/https?:\/\/\S+?\.export\.CSV\.zip/i);
      if (!match) {
        console.log(`GDELT lastupdate preview from ${url}: ${body.slice(0, 500)}`);
        errors.push({ url, details: { message: 'No .export.CSV.zip URL found' } });
        continue;
      }

      console.log(`GDELT ingest: using lastupdate endpoint ${url}`);
      return match[0];
    } catch (error) {
      console.warn(`GDELT ingest: lastupdate fetch failed for ${url}`, serializeError(error));
      errors.push({ url, details: serializeError(error) });
    }
  }

  throw new Error(`GDELT lastupdate fetch failed for all endpoints: ${JSON.stringify(errors)}`);
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
    const exportZipUrl = await findLatestExportCsvZipUrl();
    console.log(`GDELT ingest: downloading ${exportZipUrl}`);

    const zipResponse = await fetch(exportZipUrl);
    if (!zipResponse.ok) {
      throw new Error(`GDELT export download failed with HTTP ${zipResponse.status}`);
    }

    const zipBytes = await zipResponse.arrayBuffer();
    const csvText = await unzipCsv(zipBytes);
    const events = parseGdeltCsv(csvText);
    console.log(`GDELT ingest: parsed ${events.length} significant negative event(s)`);

    const limitedEvents = events.slice(0, MAX_TITLE_FETCHES);
    const articles: ArticleRow[] = [];

    for (const event of limitedEvents) {
      const title = await fetchArticleTitle(event.source_url);
      articles.push({
        title,
        url: event.source_url,
        content: null,
        published_at: event.event_date,
        source: 'GDELT',
        sentiment_score: Math.max(-1, event.goldstein_scale / 10),
        topics: event.event_code ? [`GDELT ${event.event_code}`] : ['GDELT'],
        affects_hungary: event.country_code === 'HU',
        hungary_impact: event.country_code === 'HU'
          ? 'GDELT szerint Magyarorszaghoz kapcsolodo negativ esemeny.'
          : 'GDELT ingest: nincs automatikus magyar hataselemzes ehhez az esemenyhez.',
        warning_level: event.goldstein_scale <= -7 ? 'high' : 'medium',
        summary: `GDELT significant negative event. Country: ${event.country_code || 'unknown'}, event code: ${event.event_code || 'unknown'}, Goldstein scale: ${event.goldstein_scale}.`,
      });
    }

    const articleUrls = articles.map((article) => article.url);
    let existingArticleUrls = new Set<string>();

    if (articleUrls.length > 0) {
      const { data: existingArticles, error: existingArticlesError } = await supabase
        .from('articles')
        .select('url')
        .in('url', articleUrls);

      if (existingArticlesError) throw existingArticlesError;
      existingArticleUrls = new Set((existingArticles || []).map((item: { url: string }) => item.url));
    }

    const newArticles = articles.filter((article) => !existingArticleUrls.has(article.url));
    if (newArticles.length > 0) {
      const { error: articlesError } = await supabase
        .from('articles')
        .insert(newArticles);

      if (articlesError) {
        if (!shouldRetryWithBaseArticle(articlesError)) {
          throw articlesError;
        }

        console.warn('GDELT ingest: retrying article insert with base columns only', serializeError(articlesError));
        const { error: fallbackArticlesError } = await supabase
          .from('articles')
          .insert(newArticles.map(stripOptionalArticleFields));

        if (fallbackArticlesError) throw fallbackArticlesError;
      }
    }
    console.log(`GDELT ingest: inserted ${newArticles.length} new article(s)`);

    const eventRows = limitedEvents.map((event) => ({
      id: `${event.event_date.slice(0, 10)}:${event.source_url}`,
      ...event,
    }));

    if (eventRows.length > 0) {
      const { error: eventsError } = await supabase
        .from('gdelt_events')
        .upsert(eventRows, { onConflict: 'source_url' });

      if (eventsError) throw eventsError;
    }
    console.log(`GDELT ingest: upserted ${eventRows.length} gdelt_events row(s)`);

    return new Response(JSON.stringify({
      exportZipUrl,
      filteredEvents: events.length,
      processedEvents: limitedEvents.length,
      articlesInserted: newArticles.length,
      gdeltEventsUpserted: eventRows.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('GDELT ingest: fatal error', serializeError(error));
    return new Response(JSON.stringify({
      error: 'gdelt-ingest failed',
      details: serializeError(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
