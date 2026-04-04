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

interface AnalysisResult {
  summary: string;
  warning_level: 'high' | 'medium' | 'low';
  sentiment_score: number;
  topics: string[];
  affects_hungary: boolean;
  hungary_impact: string;
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

async function fetchLatestNews(apiKey: string): Promise<RawArticle[]> {
  const query = encodeURIComponent('geopolitics OR economy OR markets OR Europe');
  const url = `https://gnews.io/api/v4/search?q=${query}&lang=en&country=us&max=10&sortby=publishedAt&apikey=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`GNews fetch failed with status ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data?.articles) ? data.articles : [];
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
    '  "hungary_impact": "magyar nyelvu, kozertheto magyarazat"',
    '}',
    '',
    'Szabalyok:',
    '- A summary es a hungary_impact mindig magyarul legyen.',
    '- Ha nincs kozvetlen magyar hatas, akkor affects_hungary legyen false es a hungary_impact legyen rovid magyar mondat.',
    '- A topics maximum 4 elem legyen.',
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
      max_tokens: 700,
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

    for (const article of newArticles) {
      const analysis = await analyzeArticleWithGroq(article, groqApiKey);
      analyzedArticles.push(mapToStoredArticle(article, analysis));
    }

    if (analyzedArticles.length > 0) {
      const { error: insertError } = await supabase
        .from('articles')
        .insert(analyzedArticles);

      if (insertError) {
        throw insertError;
      }
    }

    return new Response(JSON.stringify({
      fetched: latestNews.length,
      inserted: analyzedArticles.length,
      skipped: validArticles.length - newArticles.length,
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
