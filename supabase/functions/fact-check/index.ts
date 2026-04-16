const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Verdict = 'TRUE' | 'FALSE' | 'MISLEADING' | 'UNVERIFIABLE';

interface FactCheckRequest {
  claim?: string;
}

interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
}

interface FactCheckSource {
  title: string;
  url: string;
  snippet?: string;
}

interface FactCheckResponse {
  verdict: Verdict;
  confidence: number;
  explanation: string;
  sources: FactCheckSource[];
  manipulation_techniques: string[];
  headline_analysis: HeadlineAnalysisItem[];
  article_body_analysis: ArticleBodyAnalysis | null;
}

interface InputDocument {
  url: string;
  title: string;
  text: string;
  snippet: string;
}

interface EvidenceAssessment {
  url: string;
  stance: 'SUPPORTS' | 'CONTRADICTS' | 'MIXED' | 'IRRELEVANT';
  rationale: string;
}

interface EvidenceSynthesis {
  normalized_claim: string;
  verdict: Verdict;
  confidence: number;
  explanation: string;
  manipulation_techniques: string[];
  evidence: EvidenceAssessment[];
  headline_analysis: HeadlineAnalysisItem[];
}

interface HeadlineAnalysisItem {
  quote: string;
  technique: string;
  effect: string;
  judgment: string;
}

interface ArticleBodyAnalysis {
  summary: string;
  key_points: string[];
  headline_alignment: string;
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

function normalizeVerdict(value: unknown): Verdict {
  if (typeof value !== 'string') {
    return 'UNVERIFIABLE';
  }

  const normalized = value.trim().toUpperCase();

  if (normalized === 'TRUE' || normalized === 'FALSE' || normalized === 'MISLEADING' || normalized === 'UNVERIFIABLE') {
    return normalized;
  }

  if (normalized.includes('FALSE')) {
    return 'FALSE';
  }

  if (normalized.includes('MISLEAD') || normalized.includes('PARTLY TRUE') || normalized.includes('PARTIALLY TRUE')) {
    return 'MISLEADING';
  }

  if (normalized.includes('TRUE') || normalized.includes('SUPPORTED') || normalized.includes('CORRECT')) {
    return 'TRUE';
  }

  return 'UNVERIFIABLE';
}

function normalizeConfidence(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return { message: error.message, name: error.name, stack: error.stack };
  }

  return { message: String(error) };
}

async function callGroqJson<T>(groqApiKey: string, messages: Array<{ role: 'system' | 'user'; content: string }>, maxTokens = 1200): Promise<T> {
  const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages,
    }),
  });

  if (!groqResponse.ok) {
    const errorText = await groqResponse.text();
    throw new Error(`Groq request failed: ${errorText}`);
  }

  const data = await groqResponse.json();
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Groq returned an empty answer');
  }

  return JSON.parse(extractJsonObject(content)) as T;
}

function isProbablyUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function extractFirstUrl(value: string): string | null {
  const match = value.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function stripHtml(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

function pickMetaContent(html: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return stripHtml(match[1]);
    }
  }

  return '';
}

function extractTitleFromHtml(html: string): string {
  const metaTitle = pickMetaContent(html, [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"]+)["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"]+)["'][^>]*>/i,
    /<meta[^>]+name=["']title["'][^>]+content=["']([^"]+)["'][^>]*>/i,
  ]);

  if (metaTitle) return metaTitle;

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return titleMatch?.[1] ? stripHtml(titleMatch[1]) : '';
}

function extractMainTextFromHtml(html: string): string {
  const paragraphMatches = Array.from(html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi));
  const paragraphText = paragraphMatches
    .map((match) => stripHtml(match[1]))
    .filter((text) => text.length > 40)
    .join('\n')
    .trim();

  if (paragraphText.length >= 400) {
    return paragraphText;
  }

  const articleMatches = Array.from(html.matchAll(/<article[\s\S]*?<\/article>/gi));
  const articleText = articleMatches
    .map((match) => stripHtml(match[0]))
    .join('\n')
    .trim();

  if (articleText.length >= 280) {
    return articleText;
  }

  const mainMatches = Array.from(html.matchAll(/<(main|section)[\s\S]*?<\/\1>/gi));
  const mainText = mainMatches
    .map((match) => stripHtml(match[0]))
    .join('\n')
    .trim();

  if (mainText.length >= 280) {
    return mainText;
  }

  return stripHtml(html);
}

async function fetchInputDocument(url: string): Promise<InputDocument | null> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; PulzusFactCheck/1.0)',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`Nem sikerult letolteni a megadott cikket (${response.status}).`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return null;
  }

  const html = await response.text();
  const title = extractTitleFromHtml(html);
  const text = extractMainTextFromHtml(html).slice(0, 8000);
  const snippet = text.slice(0, 320);

  return {
    url,
    title,
    text,
    snippet,
  };
}

async function safelyFetchInputDocument(url: string): Promise<InputDocument | null> {
  try {
    return await fetchInputDocument(url);
  } catch (error) {
    console.warn('Input document fetch failed', serializeError(error));
    return null;
  }
}

function buildSearchQuery(claim: string, inputDocument: InputDocument | null): string {
  if (!inputDocument) {
    return claim;
  }

  const title = inputDocument.title.trim();
  const excerpt = inputDocument.text.split(/\s+/).slice(0, 40).join(' ').trim();

  return [title, excerpt].filter(Boolean).join(' ').slice(0, 500) || claim;
}

function buildClaimNormalizationPrompt(claim: string, inputDocument: InputDocument | null): string {
  return [
    'Fogalmazd at egyetlen rovid, ellenorizheto allitassa a felhasznalo bemenetet.',
    'Ha a felhasznalo egy cikk linkjet adta meg, a cikk fo allitasat vagy headline-jat fogalmazd meg.',
    'Ha a bemenet tobb allitast tartalmaz, valaszd ki a legfontosabbat.',
    'Ne adj magyarazatot, csak ervenyes JSON-t.',
    'Schema:',
    '{ "normalized_claim": "string" }',
    '',
    `Felhasznaloi bemenet: ${claim}`,
    inputDocument
      ? [
          `Bekuldott cikk URL: ${inputDocument.url}`,
          `Bekuldott cikk cim: ${inputDocument.title}`,
          `Bekuldott cikk szoveg: ${inputDocument.text.slice(0, 3000)}`,
        ].join('\n')
      : '',
  ].filter(Boolean).join('\n');
}

function buildArticleBodyPrompt(claim: string, inputDocument: InputDocument): string {
  return [
    'Olvasd el a bekuldott cikk torzsszoveget, ne csak a cimet.',
    'Roviditsd le, hogy mit allit valojaban a cikk.',
    'Ird le, hogy a headline mennyire van osszhangban a torzsszoveggel.',
    'Csak ervenyes JSON-t adj vissza.',
    'Schema:',
    '{',
    '  "summary": "string",',
    '  "key_points": ["string"],',
    '  "headline_alignment": "string"',
    '}',
    '',
    `Felhasznaloi allitas: ${claim}`,
    `Cikk cime: ${inputDocument.title}`,
    `Cikk torzsszovege: ${inputDocument.text.slice(0, 6000)}`,
  ].join('\n');
}

function buildEvidencePrompt(claim: string, sources: FactCheckSource[], inputDocument: InputDocument | null): string {
  return [
    'Te egy szigoru tenyelemzo vagy.',
    'Az a feladatod, hogy a claimet a megadott forrasok alapjan elemezd.',
    'Kulon elemezd a headline vagy a bekuldott szoveg nyelvezetet is.',
    'Emelj ki konkret szo szerint vett reszleteket a headline-bol vagy a bekuldott szovegbol.',
    'Minden kiemelt reszlethez irj pszichologiai vagy retorikai technikat, annak vart hatasat az olvasora, es rovid iteletet arrol, miert problematikus vagy miert semleges.',
    'Minden forrashoz rendelj stance erteket: SUPPORTS, CONTRADICTS, MIXED vagy IRRELEVANT.',
    'SUPPORTS: a forras tenylegesen alatamasztja a claimet.',
    'CONTRADICTS: a forras a claim ellenkezojet allitja, vagy egyertelmuen cafolja.',
    'MIXED: a forras reszben alatamasztja, de fontos korlatot vagy ellenpontot is ad.',
    'IRRELEVANT: a forras nem eleg relevans a claimhez.',
    'Ha nagy, konkret hirallitasrol van szo, es a fuggetlen forrasok inkabb cafoljak vagy nem tamasztjak ala, a vegso itelet legyen FALSE vagy MISLEADING, ne UNVERIFIABLE.',
    'Szenzacios, kattintasvadasz vagy tulzo headline eseten, ha a torzsszoveg ovatosabb, a vegso itelet legyen MISLEADING.',
    'Szemelyes identitasra, szexualis iranyultsagra, egeszsegi allapotra vagy mas erzekeny szemelyes attribumra vonatkozo allitasnal ne allits biztos tenyt megbizhato, nyilvanos evidencia nelkul. Ilyenkor altalaban UNVERIFIABLE a helyes itelet, hacsak a forrasok egyertelmuen nem cafoljak a konkret allitast.',
    'Csak ervenyes JSON-t adj vissza.',
    'Schema:',
    '{',
    '  "normalized_claim": "string",',
    '  "verdict": "TRUE|FALSE|MISLEADING|UNVERIFIABLE",',
    '  "confidence": 0-100,',
    '  "explanation": "string",',
    '  "manipulation_techniques": ["string"],',
    '  "evidence": [{"url":"string","stance":"SUPPORTS|CONTRADICTS|MIXED|IRRELEVANT","rationale":"string"}],',
    '  "headline_analysis": [{"quote":"string","technique":"string","effect":"string","judgment":"string"}]',
    '}',
    '',
    `Claim: ${claim}`,
    '',
    inputDocument
      ? [
          'Bekuldott cikk:',
          `- URL: ${inputDocument.url}`,
          `- Cim: ${inputDocument.title || 'nincs cim'}`,
          `- Szoveg: ${inputDocument.text.slice(0, 3000) || 'nincs szoveg'}`,
          '',
          'A vegso iteletnel a cikk torzsszovege fontosabb, mint a headline.',
          '',
          'Vizsgald kulon, hogy a cikk cime tulzo vagy felrevezeto-e a sajat torzsszovegehez kepest.',
          '',
        ].join('\n')
      : '',
    'Ha nincs kulon URL, akkor a felhasznalo eredeti bemenetebol idezz vissza reszleteket a headline_analysis mezoben.',
    'Kulso forrasok:',
    ...sources.map((source, index) => [
      `${index + 1}. URL: ${source.url}`,
      `   Cim: ${source.title}`,
      `   Kivonat: ${source.snippet || 'nincs kivonat'}`,
    ].join('\n')),
  ].join('\n');
}

function mergeEvidenceIntoSources(
  sources: FactCheckSource[],
  evidence: EvidenceAssessment[],
  inputDocument: InputDocument | null,
): FactCheckSource[] {
  const evidenceByUrl = new Map(evidence.map((item) => [item.url, item]));

  const merged = sources.map((source) => {
    const assessment = evidenceByUrl.get(source.url);
    const prefix =
      assessment?.stance === 'CONTRADICTS' ? 'Ellentmond: '
        : assessment?.stance === 'SUPPORTS' ? 'Alatamasztja: '
        : assessment?.stance === 'MIXED' ? 'Vegyes: '
        : '';

    const rationale = assessment?.rationale?.trim();
    const snippet = [prefix ? `${prefix}${rationale || ''}`.trim() : '', source.snippet || '']
      .filter(Boolean)
      .join(' ')
      .slice(0, 320);

    return {
      ...source,
      snippet: snippet || source.snippet,
    };
  });

  if (!inputDocument) {
    return merged;
  }

  return [
    {
      title: inputDocument.title || 'Bekuldott cikk',
      url: inputDocument.url,
      snippet: inputDocument.snippet,
    },
    ...merged,
  ].slice(0, 7);
}

async function searchClaimWithTavily(claim: string, tavilyApiKey: string, excludedUrls: string[] = []): Promise<FactCheckSource[]> {
  const searchConfigs = [
    { topic: 'news', max_results: 6 },
    { topic: 'general', max_results: 6 },
  ] as const;

  const collected = new Map<string, FactCheckSource>();
  const excluded = new Set(excludedUrls);

  for (const config of searchConfigs) {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: tavilyApiKey,
        query: claim,
        topic: config.topic,
        search_depth: 'advanced',
        include_answer: false,
        include_raw_content: false,
        max_results: config.max_results,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tavily request failed (${config.topic}): ${errorText}`);
    }

    const data = await response.json();
    const results = Array.isArray(data?.results) ? data.results as TavilyResult[] : [];

    for (const result of results) {
      const url = typeof result.url === 'string' ? result.url : '';
      if (!url || collected.has(url) || excluded.has(url)) continue;

      collected.set(url, {
        title: typeof result.title === 'string' ? result.title : 'Forrás',
        url,
        snippet: typeof result.content === 'string' ? result.content.slice(0, 320) : '',
      });
    }

    if (collected.size >= 6) {
      break;
    }
  }

  return Array.from(collected.values()).slice(0, 6);
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

  const tavilyApiKey = Deno.env.get('TAVILY_API_KEY');
  const groqApiKey = Deno.env.get('GROQ_API_KEY');

  if (!tavilyApiKey) {
    return new Response(JSON.stringify({ error: 'Missing TAVILY_API_KEY secret' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!groqApiKey) {
    return new Response(JSON.stringify({ error: 'Missing GROQ_API_KEY secret' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: FactCheckRequest;

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const claim = body.claim?.trim();

  if (!claim) {
    return new Response(JSON.stringify({ error: 'Missing claim' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const directUrl = isProbablyUrl(claim) ? claim : extractFirstUrl(claim);
    const inputDocument = directUrl ? await safelyFetchInputDocument(directUrl) : null;
    const normalizedClaimData = await callGroqJson<{ normalized_claim?: string }>(groqApiKey, [
      {
        role: 'system',
        content: 'Mindig ervenyes JSON-t adj vissza.',
      },
      {
        role: 'user',
        content: buildClaimNormalizationPrompt(claim, inputDocument),
      },
    ], 400);

    const effectiveClaim = typeof normalizedClaimData.normalized_claim === 'string' && normalizedClaimData.normalized_claim.trim()
      ? normalizedClaimData.normalized_claim.trim()
      : inputDocument?.title?.trim() || claim;

    const searchQuery = buildSearchQuery(effectiveClaim, inputDocument);
    const sources = await searchClaimWithTavily(searchQuery, tavilyApiKey, directUrl ? [directUrl] : []);
    const articleBodyAnalysis = inputDocument
      ? await callGroqJson<Partial<ArticleBodyAnalysis>>(groqApiKey, [
          {
            role: 'system',
            content: 'Mindig ervenyes JSON-t adj vissza. A cikk torzsszovegere fokuszalj, ne csak a cimre.',
          },
          {
            role: 'user',
            content: buildArticleBodyPrompt(effectiveClaim, inputDocument),
          },
        ], 700)
      : null;

    if (sources.length === 0 && !inputDocument) {
      return new Response(JSON.stringify({
        verdict: 'UNVERIFIABLE',
        confidence: 0,
        explanation: 'Nem talaltam eleg megbizhato kulso forrast az allitas ellenorzesere.',
        sources: [],
        manipulation_techniques: [],
        headline_analysis: [],
        article_body_analysis: null,
      } satisfies FactCheckResponse), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const synthesis = await callGroqJson<Partial<EvidenceSynthesis>>(groqApiKey, [
      {
        role: 'system',
        content: 'Mindig ervenyes JSON-t adj vissza. Forrasonkent gondolkodj, aztan hozz vegso iteletet.',
      },
      {
        role: 'user',
        content: buildEvidencePrompt(effectiveClaim, sources, inputDocument),
      },
    ], 1500);

    const evidence = Array.isArray(synthesis.evidence)
      ? synthesis.evidence
          .map((item) => ({
            url: typeof item?.url === 'string' ? item.url : '',
            stance: item?.stance === 'SUPPORTS' || item?.stance === 'CONTRADICTS' || item?.stance === 'MIXED' || item?.stance === 'IRRELEVANT'
              ? item.stance
              : 'IRRELEVANT',
            rationale: typeof item?.rationale === 'string' ? item.rationale.trim() : '',
          }))
          .filter((item) => Boolean(item.url))
      : [];

    const mergedSources = mergeEvidenceIntoSources(sources, evidence, inputDocument);

    const response: FactCheckResponse = {
      verdict: normalizeVerdict(synthesis.verdict),
      confidence: normalizeConfidence(synthesis.confidence),
      explanation: typeof synthesis.explanation === 'string' ? synthesis.explanation.trim() : 'Nem erkezett magyarazat.',
      sources: mergedSources,
      manipulation_techniques: Array.isArray(synthesis.manipulation_techniques)
        ? synthesis.manipulation_techniques.map((item) => String(item).trim()).filter(Boolean).slice(0, 8)
        : [],
      headline_analysis: Array.isArray(synthesis.headline_analysis)
        ? synthesis.headline_analysis
            .map((item) => ({
              quote: typeof item?.quote === 'string' ? item.quote.trim() : '',
              technique: typeof item?.technique === 'string' ? item.technique.trim() : '',
              effect: typeof item?.effect === 'string' ? item.effect.trim() : '',
              judgment: typeof item?.judgment === 'string' ? item.judgment.trim() : '',
            }))
            .filter((item) => item.quote || item.technique || item.effect || item.judgment)
            .slice(0, 6)
        : [],
      article_body_analysis: articleBodyAnalysis
        ? {
            summary: typeof articleBodyAnalysis.summary === 'string' ? articleBodyAnalysis.summary.trim() : '',
            key_points: Array.isArray(articleBodyAnalysis.key_points)
              ? articleBodyAnalysis.key_points.map((item) => String(item).trim()).filter(Boolean).slice(0, 6)
              : [],
            headline_alignment: typeof articleBodyAnalysis.headline_alignment === 'string'
              ? articleBodyAnalysis.headline_alignment.trim()
              : '',
          }
        : null,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Unexpected function error', details: serializeError(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
