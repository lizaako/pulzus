import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Parser from 'https://esm.sh/rss-parser@3.13.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RSS_FEEDS = [
  { url: 'https://feeds.reuters.com/reuters/worldNews', source: 'Reuters World News' },
  { url: 'https://feeds.reuters.com/reuters/businessNews', source: 'Reuters Business News' },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC News' },
  { url: 'https://rss.dw.com/rdf/rss-en-all', source: 'Deutsche Welle' },
  { url: 'https://feeds.skynews.com/feeds/rss/world.rss', source: 'Sky News' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera' },
  { url: 'https://feeds.ft.com/ft/rss/home', source: 'Financial Times' },
  { url: 'https://feeds.bloomberg.com/markets/news.rss', source: 'Bloomberg Markets' },
];

interface ArticleRow {
  title: string;
  url: string;
  content: string | null;
  published_at: string;
  source: string;
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

async function fetchFeedArticles(feed: typeof RSS_FEEDS[number], parser: Parser): Promise<ArticleRow[]> {
  console.log(`RSS ingest: fetching ${feed.source} (${feed.url})`);

  const parsedFeed = await parser.parseURL(feed.url);
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
      content: cleanText(item.contentSnippet) || cleanText(item.content) || cleanText(item.summary) || cleanText(item.description),
      published_at: asIsoDate(item.isoDate || item.pubDate),
      source: feed.source,
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
    const candidates = Array.from(articleMap.values());
    const urls = candidates.map((article) => article.url);
    console.log(`RSS ingest: ${candidates.length} unique candidate article(s) across all feeds`);

    let existingUrls = new Set<string>();
    if (urls.length > 0) {
      const { data: existingArticles, error: existingError } = await supabase
        .from('articles')
        .select('url')
        .in('url', urls);

      if (existingError) throw existingError;
      existingUrls = new Set((existingArticles || []).map((item: { url: string }) => item.url));
    }

    const newArticles = candidates.filter((article) => !existingUrls.has(article.url));
    console.log(`RSS ingest: inserting ${newArticles.length} new article(s), skipping ${candidates.length - newArticles.length} duplicate(s)`);

    if (newArticles.length > 0) {
      const { error: insertError } = await supabase
        .from('articles')
        .insert(newArticles);

      if (insertError) throw insertError;
    }

    return new Response(JSON.stringify({
      fetched: candidates.length,
      inserted: newArticles.length,
      duplicatesSkipped: candidates.length - newArticles.length,
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
