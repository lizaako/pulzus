import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface YahooQuote {
  symbol: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  currency?: string;
}

interface MarketEntry {
  symbol: string;
  company: string;
  price: number;
  change_percent: number;
  currency: string;
  recorded_at: string;
  explanation: string;
  trend: 'up' | 'down' | 'neutral';
}

const TRACKED_SYMBOLS: { yahoo: string; display: string; name: string }[] = [
  { yahoo: 'BZ=F', display: 'BRENT', name: 'Brent kőolaj' },
  { yahoo: 'GC=F', display: 'ARANY', name: 'Arany' },
  { yahoo: 'EURHUF=X', display: 'EUR/HUF', name: 'Euró/Forint' },
  { yahoo: 'BTC-USD', display: 'BTC', name: 'Bitcoin' },
  { yahoo: '^GSPC', display: 'S&P500', name: 'S&P 500 index' },
  { yahoo: 'NG=F', display: 'GÁZ', name: 'Földgáz' },
];

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return { message: error.message, name: error.name, stack: error.stack };
  }
  return { message: String(error) };
}

async function fetchYahooQuotes(): Promise<YahooQuote[]> {
  const symbols = TRACKED_SYMBOLS.map((s) => s.yahoo).join(',');
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance fetch failed: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data?.quoteResponse?.result) ? data.quoteResponse.result : [];
}

async function generateExplanation(
  symbolName: string,
  price: number,
  changePercent: number,
  groqApiKey: string,
): Promise<string> {
  const direction = changePercent >= 0 ? 'emelkedett' : 'csökkent';
  const prompt = [
    `A(z) ${symbolName} árfolyama ma ${Math.abs(changePercent).toFixed(2)}%-ot ${direction}, jelenlegi ára: ${price}.`,
    'Írj egyetlen tömör, közérthető magyar mondatot (max 25 szó), ami megmagyarázza, miért történhetett ez a mozgás a mai geopolitikai és gazdasági helyzet alapján.',
    'Ne kezdd a mondatot a "mert" szóval. Ne írj JSON-t, csak egy mondatot.',
  ].join(' ');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
      max_tokens: 120,
      messages: [
        { role: 'system', content: 'Magyar piaci elemző vagy. Tömören és közérthetően válaszolsz.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    console.error(`Groq explanation failed for ${symbolName}: ${response.status}`);
    return changePercent >= 0
      ? 'Emelkedő trend figyelhető meg a piacon.'
      : 'Csökkenő trend figyelhető meg a piacon.';
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== 'string' || content.trim().length === 0) {
    return 'Nincs elérhető elemzés.';
  }

  // Clean up: remove quotes, extra whitespace
  return content.trim().replace(/^["']|["']$/g, '').slice(0, 200);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const groqApiKey = Deno.env.get('GROQ_API_KEY');

  if (!supabaseUrl || !serviceRoleKey || !groqApiKey) {
    return new Response(JSON.stringify({ error: 'Missing required secrets (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY)' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const quotes = await fetchYahooQuotes();
    const now = new Date().toISOString();
    const entries: MarketEntry[] = [];

    for (const tracked of TRACKED_SYMBOLS) {
      const quote = quotes.find((q) => q.symbol === tracked.yahoo);
      if (!quote || typeof quote.regularMarketPrice !== 'number') continue;

      const price = quote.regularMarketPrice;
      const change = quote.regularMarketChangePercent ?? 0;
      const explanation = await generateExplanation(tracked.name, price, change, groqApiKey);

      entries.push({
        symbol: tracked.display,
        company: tracked.name,
        price,
        change_percent: Math.round(change * 100) / 100,
        currency: quote.currency || 'USD',
        recorded_at: now,
        explanation,
        trend: change > 0.1 ? 'up' : change < -0.1 ? 'down' : 'neutral',
      });
    }

    if (entries.length > 0) {
      const { error: insertError } = await supabase
        .from('market_data')
        .insert(entries);

      if (insertError) {
        throw insertError;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      inserted: entries.length,
      symbols: entries.map((e) => e.symbol),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'markets-ingest failed',
      details: serializeError(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
