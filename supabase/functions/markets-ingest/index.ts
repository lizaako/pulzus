import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return { message: error.message, name: error.name, stack: error.stack };
  }
  return { message: String(error) };
}

interface QuoteResult {
  symbol: string;
  name: string;
  price: number;
  change: number;
  currency: string;
}

interface ProviderDiagnostics {
  errors: string[];
}

// Fetch EUR/HUF from Frankfurter API (100% free, no key needed)
async function fetchEurHuf(): Promise<{ price: number; change: number } | null> {
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    // If weekend, get Friday
    if (yesterday.getDay() === 0) yesterday.setDate(yesterday.getDate() - 2);
    if (yesterday.getDay() === 6) yesterday.setDate(yesterday.getDate() - 1);

    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const [resToday, resYesterday] = await Promise.all([
      fetch(`https://api.frankfurter.app/latest?from=EUR&to=HUF`),
      fetch(`https://api.frankfurter.app/${yesterdayStr}?from=EUR&to=HUF`),
    ]);

    if (!resToday.ok || !resYesterday.ok) return null;

    const dataToday = await resToday.json();
    const dataYesterday = await resYesterday.json();

    const priceToday = dataToday?.rates?.HUF;
    const priceYesterday = dataYesterday?.rates?.HUF;

    if (typeof priceToday !== 'number' || typeof priceYesterday !== 'number') return null;

    const change = ((priceToday - priceYesterday) / priceYesterday) * 100;
    return { price: priceToday, change: Math.round(change * 100) / 100 };
  } catch {
    return null;
  }
}

// Fetch USD/HUF from Frankfurter
async function fetchUsdHuf(): Promise<{ price: number; change: number } | null> {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (yesterday.getDay() === 0) yesterday.setDate(yesterday.getDate() - 2);
    if (yesterday.getDay() === 6) yesterday.setDate(yesterday.getDate() - 1);

    const [resToday, resYesterday] = await Promise.all([
      fetch(`https://api.frankfurter.app/latest?from=USD&to=HUF`),
      fetch(`https://api.frankfurter.app/${yesterday.toISOString().split('T')[0]}?from=USD&to=HUF`),
    ]);

    if (!resToday.ok || !resYesterday.ok) return null;

    const dataToday = await resToday.json();
    const dataYesterday = await resYesterday.json();

    const priceToday = dataToday?.rates?.HUF;
    const priceYesterday = dataYesterday?.rates?.HUF;

    if (typeof priceToday !== 'number' || typeof priceYesterday !== 'number') return null;

    const change = ((priceToday - priceYesterday) / priceYesterday) * 100;
    return { price: priceToday, change: Math.round(change * 100) / 100 };
  } catch {
    return null;
  }
}

// Fetch GBP/HUF from Frankfurter
async function fetchGbpHuf(): Promise<{ price: number; change: number } | null> {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (yesterday.getDay() === 0) yesterday.setDate(yesterday.getDate() - 2);
    if (yesterday.getDay() === 6) yesterday.setDate(yesterday.getDate() - 1);

    const [resToday, resYesterday] = await Promise.all([
      fetch(`https://api.frankfurter.app/latest?from=GBP&to=HUF`),
      fetch(`https://api.frankfurter.app/${yesterday.toISOString().split('T')[0]}?from=GBP&to=HUF`),
    ]);

    if (!resToday.ok || !resYesterday.ok) return null;

    const dataToday = await resToday.json();
    const dataYesterday = await resYesterday.json();

    const priceToday = dataToday?.rates?.HUF;
    const priceYesterday = dataYesterday?.rates?.HUF;

    if (typeof priceToday !== 'number' || typeof priceYesterday !== 'number') return null;

    const change = ((priceToday - priceYesterday) / priceYesterday) * 100;
    return { price: priceToday, change: Math.round(change * 100) / 100 };
  } catch {
    return null;
  }
}

// Fetch CHF/HUF from Frankfurter
async function fetchChfHuf(): Promise<{ price: number; change: number } | null> {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (yesterday.getDay() === 0) yesterday.setDate(yesterday.getDate() - 2);
    if (yesterday.getDay() === 6) yesterday.setDate(yesterday.getDate() - 1);

    const [resToday, resYesterday] = await Promise.all([
      fetch(`https://api.frankfurter.app/latest?from=CHF&to=HUF`),
      fetch(`https://api.frankfurter.app/${yesterday.toISOString().split('T')[0]}?from=CHF&to=HUF`),
    ]);

    if (!resToday.ok || !resYesterday.ok) return null;

    const dataToday = await resToday.json();
    const dataYesterday = await resYesterday.json();

    const priceToday = dataToday?.rates?.HUF;
    const priceYesterday = dataYesterday?.rates?.HUF;

    if (typeof priceToday !== 'number' || typeof priceYesterday !== 'number') return null;

    const change = ((priceToday - priceYesterday) / priceYesterday) * 100;
    return { price: priceToday, change: Math.round(change * 100) / 100 };
  } catch {
    return null;
  }
}

// Fetch crypto & gold from CoinGecko (100% free, no key needed)
async function fetchCoinGeckoData(diagnostics: ProviderDiagnostics): Promise<{ symbol: string; name: string; price: number; change: number; currency: string }[]> {
  try {
    const ids = [
      'bitcoin',
      'ethereum',
      'solana',
      'ripple',
      'binancecoin',
      'dogecoin',
      'cardano',
      'tron',
      'chainlink',
      'paxos-gold',
    ].join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
    const response = await fetch(url);
    if (!response.ok) {
      const body = await response.text();
      diagnostics.errors.push(`CoinGecko HTTP ${response.status}: ${body.slice(0, 200)}`);
      return [];
    }
    const data = await response.json();

    const results: { symbol: string; name: string; price: number; change: number; currency: string }[] = [];

    if (data?.bitcoin) {
      results.push({
        symbol: 'BTC',
        name: 'Bitcoin',
        price: data.bitcoin.usd,
        change: Math.round((data.bitcoin.usd_24h_change || 0) * 100) / 100,
        currency: 'USD',
      });
    }
    if (data?.ethereum) {
      results.push({
        symbol: 'ETH',
        name: 'Ethereum',
        price: data.ethereum.usd,
        change: Math.round((data.ethereum.usd_24h_change || 0) * 100) / 100,
        currency: 'USD',
      });
    }
    if (data?.solana) {
      results.push({
        symbol: 'SOL',
        name: 'Solana',
        price: data.solana.usd,
        change: Math.round((data.solana.usd_24h_change || 0) * 100) / 100,
        currency: 'USD',
      });
    }
    if (data?.ripple) {
      results.push({
        symbol: 'XRP',
        name: 'XRP',
        price: data.ripple.usd,
        change: Math.round((data.ripple.usd_24h_change || 0) * 100) / 100,
        currency: 'USD',
      });
    }
    if (data?.binancecoin) {
      results.push({
        symbol: 'BNB',
        name: 'BNB',
        price: data.binancecoin.usd,
        change: Math.round((data.binancecoin.usd_24h_change || 0) * 100) / 100,
        currency: 'USD',
      });
    }
    if (data?.dogecoin) {
      results.push({
        symbol: 'DOGE',
        name: 'Dogecoin',
        price: data.dogecoin.usd,
        change: Math.round((data.dogecoin.usd_24h_change || 0) * 100) / 100,
        currency: 'USD',
      });
    }
    if (data?.cardano) {
      results.push({
        symbol: 'ADA',
        name: 'Cardano',
        price: data.cardano.usd,
        change: Math.round((data.cardano.usd_24h_change || 0) * 100) / 100,
        currency: 'USD',
      });
    }
    if (data?.tron) {
      results.push({
        symbol: 'TRX',
        name: 'TRON',
        price: data.tron.usd,
        change: Math.round((data.tron.usd_24h_change || 0) * 100) / 100,
        currency: 'USD',
      });
    }
    if (data?.chainlink) {
      results.push({
        symbol: 'LINK',
        name: 'Chainlink',
        price: data.chainlink.usd,
        change: Math.round((data.chainlink.usd_24h_change || 0) * 100) / 100,
        currency: 'USD',
      });
    }
    if (data?.['paxos-gold']) {
      results.push({
        symbol: 'ARANY',
        name: 'Arany (XAU)',
        price: data['paxos-gold'].usd,
        change: Math.round((data['paxos-gold'].usd_24h_change || 0) * 100) / 100,
        currency: 'USD',
      });
    }

    return results;
  } catch (error) {
    diagnostics.errors.push(`CoinGecko exception: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

async function fetchYahooQuotes(
  symbols: string[],
  labels: Record<string, string>,
  diagnostics: ProviderDiagnostics,
): Promise<QuoteResult[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(','))}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!response.ok) {
      const body = await response.text();
      diagnostics.errors.push(`Yahoo HTTP ${response.status}: ${body.slice(0, 200)}`);
      return [];
    }

    const data = await response.json();
    const results = Array.isArray(data?.quoteResponse?.result) ? data.quoteResponse.result : [];

    return results
      .map((item) => {
        const symbol = typeof item?.symbol === 'string' ? item.symbol : null;
        const price = typeof item?.regularMarketPrice === 'number' ? item.regularMarketPrice : null;
        const change = typeof item?.regularMarketChangePercent === 'number' ? item.regularMarketChangePercent : null;

        if (!symbol || price === null || change === null) return null;

        return {
          symbol,
          name: labels[symbol] || item?.shortName || item?.longName || symbol,
          price,
          change: Math.round(change * 100) / 100,
          currency: typeof item?.currency === 'string' ? item.currency : 'USD',
        };
      })
      .filter((item): item is QuoteResult => item !== null);
  } catch (error) {
    diagnostics.errors.push(`Yahoo exception: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

async function generateExplanations(
  entries: { name: string; price: number; change: number }[],
  groqApiKey: string,
): Promise<Record<string, string>> {
  const lines = entries.map((e) => {
    const dir = e.change >= 0 ? 'emelkedett' : 'csökkent';
    return `- ${e.name}: ${Math.abs(e.change).toFixed(2)}%-ot ${dir}, ára: ${e.price}`;
  });

  const prompt = [
    'Az alábbi piaci eszközök mai mozgása:',
    ...lines,
    '',
    'Írj egy-egy tömör, közérthető magyar mondatot (max 20 szó) mindegyikhez, ami megmagyarázza, miért történhetett ez a mozgás.',
    'Válaszolj CSAK érvényes JSON objektummal, ahol a kulcsok az eszközök nevei, az értékek a magyarázó mondatok.',
    'Példa: {"EUR/HUF": "Az EKB kamatemelése erősítette az eurót a forinttal szemben."}',
  ].join('\n');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 400,
      messages: [
        { role: 'system', content: 'Magyar piaci elemző vagy. Kizárólag érvényes JSON-t adj vissza.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    console.error(`Groq explanation batch failed: ${response.status}`);
    return {};
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') return {};

  try {
    return JSON.parse(content) as Record<string, string>;
  } catch {
    return {};
  }
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

  try {
    const diagnostics: ProviderDiagnostics = { errors: [] };
    const yahooLabels: Record<string, string> = {
      '^GSPC': 'S&P 500',
      '^IXIC': 'NASDAQ',
      '^DJI': 'Dow Jones',
      '^GDAXI': 'DAX',
      '^FTSE': 'FTSE 100',
      '^N225': 'Nikkei 225',
      AAPL: 'Apple',
      MSFT: 'Microsoft',
      NVDA: 'NVIDIA',
      AMZN: 'Amazon',
      GOOGL: 'Alphabet',
      META: 'Meta',
      TSLA: 'Tesla',
      'BRK-B': 'Berkshire Hathaway',
      JPM: 'JPMorgan Chase',
      V: 'Visa',
      WMT: 'Walmart',
      XOM: 'Exxon Mobil',
      LLY: 'Eli Lilly',
      AVGO: 'Broadcom',
      ORCL: 'Oracle',
    };

    const yahooSymbols = Object.keys(yahooLabels);

    // Fetch all data sources in parallel
    const [eurHuf, usdHuf, gbpHuf, chfHuf, cryptoData, yahooQuotes] = await Promise.all([
      fetchEurHuf(),
      fetchUsdHuf(),
      fetchGbpHuf(),
      fetchChfHuf(),
      fetchCoinGeckoData(diagnostics),
      fetchYahooQuotes(yahooSymbols, yahooLabels, diagnostics),
    ]);

    const now = new Date().toISOString();
    const rawEntries: { symbol: string; name: string; price: number; change: number; currency: string }[] = [];

    // Currency pairs
    if (eurHuf) rawEntries.push({ symbol: 'EUR/HUF', name: 'EUR/HUF', price: eurHuf.price, change: eurHuf.change, currency: 'HUF' });
    if (usdHuf) rawEntries.push({ symbol: 'USD/HUF', name: 'USD/HUF', price: usdHuf.price, change: usdHuf.change, currency: 'HUF' });
    if (gbpHuf) rawEntries.push({ symbol: 'GBP/HUF', name: 'GBP/HUF', price: gbpHuf.price, change: gbpHuf.change, currency: 'HUF' });
    if (chfHuf) rawEntries.push({ symbol: 'CHF/HUF', name: 'CHF/HUF', price: chfHuf.price, change: chfHuf.change, currency: 'HUF' });

    // Crypto & Gold
    rawEntries.push(...cryptoData);

    // Indexes & top stocks
    rawEntries.push(
      ...yahooQuotes.map((entry) => ({
        symbol: entry.symbol,
        name: entry.name,
        price: entry.price,
        change: entry.change,
        currency: entry.currency,
      })),
    );

    if (rawEntries.length === 0) {
      throw new Error('No market data could be fetched');
    }

    // Generate all explanations in a single Groq call
    const explanations = await generateExplanations(
      rawEntries.map((e) => ({ name: e.name, price: e.price, change: e.change })),
      groqApiKey,
    );

    const entries: MarketEntry[] = rawEntries.map((e) => ({
      symbol: e.symbol,
      company: e.name,
      price: e.price,
      change_percent: e.change,
      currency: e.currency,
      recorded_at: now,
      explanation: explanations[e.name] || (e.change >= 0 ? 'Emelkedő trend a piacon.' : 'Csökkenő trend a piacon.'),
      trend: e.change > 0.1 ? 'up' as const : e.change < -0.1 ? 'down' as const : 'neutral' as const,
    }));

    if (entries.length > 0) {
      const { error: insertError } = await supabase
        .from('market_data')
        .insert(entries);

      if (insertError) throw insertError;
    }

    return new Response(JSON.stringify({
      success: true,
      inserted: entries.length,
      symbols: entries.map((e) => e.symbol),
      provider_counts: {
        fx: [eurHuf, usdHuf, gbpHuf, chfHuf].filter(Boolean).length,
        crypto: cryptoData.length,
        yahoo: yahooQuotes.length,
      },
      diagnostics,
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
