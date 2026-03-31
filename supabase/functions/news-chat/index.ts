const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Article {
  id?: string;
  title?: string;
  source?: string;
  url?: string;
  published_at?: string;
  sentiment_score?: number;
  topics?: string | string[] | null;
  affects_hungary?: boolean;
  hungary_impact?: string;
  warning_level?: string;
  summary?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  mode?: 'chat' | 'translate';
  article?: Article;
  question?: string;
  history?: ChatMessage[];
  text?: string;
}

function normalizeTopics(topics: Article['topics']): string[] {
  if (Array.isArray(topics)) {
    return topics.map((topic) => String(topic).trim()).filter(Boolean);
  }

  if (typeof topics !== 'string') return [];

  return topics.split(',').map((topic) => topic.trim()).filter(Boolean);
}

function buildSystemPrompt(article: Article): string {
  const topics = normalizeTopics(article.topics);

  return [
    'Te egy magyar nyelvu hir-elemzo asszisztens vagy a PULZUS alkalmazasban.',
    'Mindig magyarul valaszolj.',
    'A valaszaid legyenek tenyszeruek, tomorek, de hasznosak.',
    'Ha valamire nincs eleg informacio a kapott cikkadatok alapjan, mondd ki oszinten.',
    'Ne talalj ki tenyallitasokat. Ha kovetkeztetsz, jelezd, hogy ez becsles vagy valoszinu forgatokonyv.',
    'A felhasznalo egy konkret hirrol kerdez tobbet.',
    '',
    'Cikkadatok:',
    `Cim: ${article.title || 'Ismeretlen cim'}`,
    `Forras: ${article.source || 'Ismeretlen forras'}`,
    `Publikalva: ${article.published_at || 'Ismeretlen datum'}`,
    `Figyelmeztetesi szint: ${article.warning_level || 'nincs megadva'}`,
    `Hangulat pontszam: ${typeof article.sentiment_score === 'number' ? article.sentiment_score.toFixed(2) : 'nincs megadva'}`,
    `Magyar hatas: ${article.affects_hungary ? 'igen' : 'nem'}`,
    `Magyar hatas leirasa: ${article.hungary_impact || 'nincs megadva'}`,
    `Temak: ${topics.length ? topics.join(', ') : 'nincs megadva'}`,
    `Osszefoglalo: ${article.summary || 'nincs megadva'}`,
    `Forras URL: ${article.url || 'nincs megadva'}`,
  ].join('\n');
}

function buildTranslationPrompt(text: string): string {
  return [
    'Te egy profi, termeszetes magyar nyelvu fordito vagy.',
    'A feladatod egy rovid hir-osszefoglalo vagy hatasleiras magyarra forditasa.',
    'Csak magyarul valaszolj.',
    'Ne magyarazd a forditast.',
    'Ne tegyel hozza uj informaciot.',
    'A neveket, helyszineket, partneveket tartsd meg pontosan.',
    '',
    `Forditando szoveg: ${text}`,
  ].join('\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const groqApiKey = Deno.env.get('GROQ_API_KEY');

  if (!groqApiKey) {
    return new Response(JSON.stringify({ error: 'Missing GROQ_API_KEY secret' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: ChatRequest;

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const article = body.article;
  const mode = body.mode || 'chat';
  const question = body.question?.trim();
  const history = Array.isArray(body.history) ? body.history : [];
  const text = body.text?.trim();

  if (mode === 'translate' && !text) {
    return new Response(JSON.stringify({ error: 'Missing text for translation' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (mode === 'chat' && (!article || !question)) {
    return new Response(JSON.stringify({ error: 'Missing article or question' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const messages = mode === 'translate'
    ? [
        { role: 'system', content: buildTranslationPrompt(text || '') },
        { role: 'user', content: text || '' },
      ]
    : [
        { role: 'system', content: buildSystemPrompt(article || {}) },
        ...history
          .filter((message) => message && (message.role === 'user' || message.role === 'assistant') && typeof message.content === 'string')
          .slice(-8),
        { role: 'user', content: question || '' },
      ];

  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 700,
        messages,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();

      return new Response(JSON.stringify({ error: 'Groq request failed', details: errorText }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await groqResponse.json();
    const answer = data?.choices?.[0]?.message?.content;

    if (typeof answer !== 'string' || !answer.trim()) {
      return new Response(JSON.stringify({ error: 'Groq returned an empty answer' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(mode === 'translate' ? { translation: answer } : { answer }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Unexpected function error', details: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
