import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Parser from 'https://esm.sh/rss-parser@3.13.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RSS_FEEDS = [
  { url: 'https://feeds.reuters.com/reuters/worldNews', fallback: 'http://feeds.reuters.com/reuters/worldNews', source: 'Reuters World News' },
  { url: 'https://feeds.reuters.com/reuters/businessNews', fallback: 'http://feeds.reuters.com/reuters/businessNews', source: 'Reuters Business News' },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC News' },
  { url: 'https://rss.dw.com/rdf/rss-en-all', source: 'Deutsche Welle' },
  { url: 'https://feeds.skynews.com/feeds/rss/world.rss', fallback: 'http://feeds.skynews.com/feeds/rss/world.rss', source: 'Sky News' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera' },
  { url: 'https://feeds.ft.com/ft/rss/home', fallback: 'http://feeds.ft.com/ft/rss/home', source: 'Financial Times' },
  { url: 'https://feeds.bloomberg.com/markets/news.rss', source: 'Bloomberg Markets' },
];
const MAX_ARTICLES_PER_RUN = 80;

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

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}

async function fetchExistingUrls(supabase: ReturnType<typeof createClient>, urls: string[]): Promise<Set<string>> {
  const existingUrls = new Set<string>();

  for (const chunk of chunkArray(urls, URL_LOOKUP_CHUNK_SIZE)) {
    const { data: existingArticles, error: existingError } = await supabase
      .from('articles')
      .select('url')
      .in('url', chunk);

    if (existingError) {
      console.error('RSS ingest: duplicate URL lookup failed', {
        chunkSize: chunk.length,
        firstUrl: chunk[0],
        error: serializeError(existingError),
      });
      throw existingError;
    }

    for (const item of existingArticles || []) {
      if (typeof item.url === 'string') {
        existingUrls.add(item.url);
      }
    }
  }

  return existingUrls;
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

      const { error: insertError } = await supabase
        .from('articles')
        .insert(article);

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
        .insert(stripOptionalArticleFields(article));

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
