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
  domain?: string;
  quality_label?: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  quality_score?: number;
  quality_reason?: string;
  stance?: 'SUPPORTS' | 'CONTRADICTS' | 'MIXED' | 'IRRELEVANT';
}

interface FactCheckResponse {
  verdict: Verdict;
  confidence: number;
  explanation: string;
  sources: FactCheckSource[];
  manipulation_techniques: string[];
  headline_analysis: HeadlineAnalysisItem[];
  article_body_analysis: ArticleBodyAnalysis | null;
  psychology_analysis: PsychologyAnalysis | null;
  manipulation_index: ManipulationIndexItem[];
  program_comparison: ProgramComparisonItem[];
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
  article_body_analysis?: ArticleBodyAnalysis | null;
  psychology_analysis?: PsychologyAnalysis | null;
}

interface HeadlineAnalysisItem {
  quote: string;
  technique: string;
  effect: string;
  judgment: string;
}

interface PsychologyQuoteAnalysis {
  quote: string;
  observation: string;
  emotional_trigger: string;
  clinical_read: string;
}

interface PsychologyAnalysis {
  overview: string;
  persuasive_strategy: string;
  reader_impact: string;
  quote_analysis: PsychologyQuoteAnalysis[];
}

interface ArticleBodyAnalysis {
  summary: string;
  key_points: string[];
  headline_alignment: string;
}

interface ManipulationIndexItem {
  key: 'fear' | 'urgency' | 'certainty' | 'tribalism' | 'sensationalism';
  label: string;
  score: number;
  explanation: string;
}

interface ProgramReference {
  id: string;
  topic: string;
  keywords: string[];
  title: string;
  summary: string;
  page_hint: string;
}

interface ProgramComparisonItem {
  topic: string;
  assessment: 'SUPPORTED_BY_PROGRAM' | 'CONTRADICTED_BY_PROGRAM' | 'PARTIALLY_ADDRESSED';
  analysis: string;
  source_title: string;
  source_url: string;
  page_hint: string;
}

interface CachedFactCheckResponse {
  expiresAt: number;
  response: FactCheckResponse;
}

const FACT_CHECK_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const responseCache = new Map<string, CachedFactCheckResponse>();
const inFlightResponses = new Map<string, Promise<FactCheckResponse>>();
const DEFAULT_GROQ_FACT_CHECK_MODEL = 'openai/gpt-oss-20b';
const TISZA_PROGRAM_URL = 'https://cdn.tisza.work/A%20m%C5%B1k%C3%B6d%C5%91%20%C3%A9s%20embers%C3%A9ges%20Magyarorsz%C3%A1g%20alapjai.pdf';

const HIGH_TRUST_DOMAINS = [
  'gov.hu', 'kormany.hu', 'gov', 'edu', 'europa.eu', 'ec.europa.eu', 'europarl.europa.eu',
  'who.int', 'oecd.org', 'imf.org', 'worldbank.org', 'un.org', 'reuters.com', 'apnews.com',
  'bbc.com', 'ft.com', 'bloomberg.com', 'statista.com',
];

const MEDIUM_TRUST_DOMAINS = [
  'telex.hu', '444.hu', 'hvg.hu', 'portfolio.hu', '24.hu', 'rtl.hu', 'cnn.com', 'nytimes.com',
  'theguardian.com', 'politico.eu', 'wsj.com', 'cnbc.com', 'forbes.com',
];

const LOW_TRUST_DOMAINS = [
  'blogspot.com', 'wordpress.com', 'substack.com', 'rumble.com', 'tiktok.com',
  'facebook.com', 'instagram.com', 'x.com', 'twitter.com', 'youtube.com', 'magyarnemzet.hu',
];

const TISZA_PROGRAM_REFERENCES: ProgramReference[] = [
  {
    id: 'governance',
    topic: 'kormányzás és jogállam',
    keywords: ['tisza', 'magyar peter', 'jogállam', 'korrupció', 'lopás', 'elszámoltatás'],
    title: 'TISZA program: felelős kormányzás, vagyonvisszaszerzés, jogállam',
    summary: 'A dokumentum vállalja a jogállam helyreállítását, a közvagyon visszaszerzését és a törvényes elszámoltatást.',
    page_hint: '2-3',
  },
  {
    id: 'healthcare',
    topic: 'egészségügy',
    keywords: ['egészségügy', 'kórház', 'orvos', 'betegellátás', 'tisza', 'magyar peter'],
    title: 'TISZA program: Hugonnai Vilma Egészségügyi Program',
    summary: 'A tartalomjegyzék és a bevezetés külön egészségügyi programot és az egészségügy rendbetételét ígéri.',
    page_hint: '2-4, 138',
  },
  {
    id: 'education',
    topic: 'oktatás',
    keywords: ['oktatás', 'iskola', 'egyetem', 'tanár', 'diák', 'tisza', 'magyar peter'],
    title: 'TISZA program: oktatás és világszínvonalú tudás',
    summary: 'A program önálló fejezetekben foglalkozik a közoktatással, egyetemekkel és tudásalapú fejlődéssel.',
    page_hint: '1-4, 164',
  },
  {
    id: 'economy',
    topic: 'gazdaság',
    keywords: ['gazdaság', 'adó', 'infláció', 'költségvetés', 'vállalkozás', 'uniós pénz', 'tisza', 'magyar peter'],
    title: 'TISZA program: gazdaságfejlesztés, adócsökkentés, stabil költségvetés',
    summary: 'A dokumentum gazdaságfejlesztési programot, adócsökkentést, stabil költségvetést és uniós források hazahozatalát nevezi meg.',
    page_hint: '2-4, 37-67',
  },
  {
    id: 'migration-security',
    topic: 'biztonság és migráció',
    keywords: ['migráció', 'bevándorlás', 'határ', 'biztonság', 'határvédelem', 'tisza', 'magyar peter'],
    title: 'TISZA program: erős határok és zéró tolerancia az illegális bevándorlással szemben',
    summary: 'A program külön pontokban beszél biztonságos Magyarországról, erős határokról és zéró toleranciáról az illegális bevándorlással szemben.',
    page_hint: '91-103',
  },
];

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

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function domainMatches(domain: string, rule: string): boolean {
  return domain === rule || domain.endsWith(`.${rule}`);
}

function classifySourceQuality(url: string): Pick<FactCheckSource, 'domain' | 'quality_label' | 'quality_score' | 'quality_reason'> {
  const domain = extractDomain(url);

  if (!domain) {
    return {
      domain: '',
      quality_label: 'UNKNOWN',
      quality_score: 45,
      quality_reason: 'A domain nem volt biztonsagosan azonosithato.',
    };
  }

  if (domainMatches(domain, 'cdn.tisza.work')) {
    return {
      domain,
      quality_label: 'HIGH',
      quality_score: 86,
      quality_reason: 'Elsődleges programdokumentum, közvetlen forrás a vállalásokhoz.',
    };
  }

  if (HIGH_TRUST_DOMAINS.some((rule) => domainMatches(domain, rule))) {
    return {
      domain,
      quality_label: 'HIGH',
      quality_score: 90,
      quality_reason: 'Intezeti, hivatalos vagy magas szerkesztoi kontroll alatt allo forras.',
    };
  }

  if (LOW_TRUST_DOMAINS.some((rule) => domainMatches(domain, rule))) {
    return {
      domain,
      quality_label: 'LOW',
      quality_score: 28,
      quality_reason: 'Platform- vagy user-generated kozeg, gyenge szerkesztoi ellenorzessel.',
    };
  }

  if (MEDIUM_TRUST_DOMAINS.some((rule) => domainMatches(domain, rule))) {
    return {
      domain,
      quality_label: 'MEDIUM',
      quality_score: 68,
      quality_reason: 'Szerkesztett sajtoforras, de nem elsodleges intezmenyi evidencia.',
    };
  }

  return {
    domain,
    quality_label: 'UNKNOWN',
    quality_score: 52,
    quality_reason: 'A domain nincs a helyi megbizhatosagi adatbazisban.',
  };
}

function scoreSignal(text: string, patterns: RegExp[]): number {
  return patterns.reduce((total, pattern) => total + (text.match(pattern)?.length || 0), 0);
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function buildManipulationIndex(claim: string, inputDocument: InputDocument | null): ManipulationIndexItem[] {
  const text = normalizeText([claim, inputDocument?.title || '', inputDocument?.snippet || ''].join(' '));
  const fearScore = clampScore(15 + scoreSignal(text, [/veszely/gi, /krizis/gi, /sokk/gi, /collapse/gi, /danger/gi, /threat/gi]) * 18);
  const urgencyScore = clampScore(10 + scoreSignal(text, [/azonnal/gi, /most/gi, /surgos/gi, /immediately/gi, /breaking/gi, /right now/gi]) * 20);
  const certaintyScore = clampScore(12 + scoreSignal(text, [/biztos/gi, /tagadhatatlan/gi, /egyertelmu/gi, /never/gi, /always/gi, /guaranteed/gi]) * 18);
  const tribalismScore = clampScore(8 + scoreSignal(text, [/mi /gi, /ok /gi, /ellenseg/gi, /hazaarulo/gi, /globalist/gi, /patriot/gi, /elites/gi]) * 22);
  const sensationalismScore = clampScore(14 + scoreSignal(text, [/!/g, /\?/g, /hihetetlen/gi, /durva/gi, /megdobbento/gi, /shocking/gi, /outrage/gi]) * 14);

  return [
    {
      key: 'fear',
      label: 'Félelemkeltés',
      score: fearScore,
      explanation: fearScore >= 65 ? 'Erős fenyegetettségérzetet aktiváló nyelv.' : 'Mérsékelt vagy alacsony fenyegetésre építő framing.',
    },
    {
      key: 'urgency',
      label: 'Sürgetés',
      score: urgencyScore,
      explanation: urgencyScore >= 65 ? 'Azonnali reagálásra nyomást gyakorló tónus.' : 'Nem domináns az időnyomás retorikája.',
    },
    {
      key: 'certainty',
      label: 'Hamis bizonyosság',
      score: certaintyScore,
      explanation: certaintyScore >= 65 ? 'Lezárt, túlbiztos állításformák látszanak.' : 'Van némi bizonytalanság vagy óvatos megfogalmazás.',
    },
    {
      key: 'tribalism',
      label: 'Identitástrigger',
      score: tribalismScore,
      explanation: tribalismScore >= 65 ? 'Mi-ok szembenállásra építő retorikai jegyek.' : 'Az identitásos polarizáció nem elsődleges.',
    },
    {
      key: 'sensationalism',
      label: 'Szenzációhajhászás',
      score: sensationalismScore,
      explanation: sensationalismScore >= 65 ? 'Túlzó, kattintásra optimalizált címadás jelei.' : 'A szöveg inkább visszafogott vagy vegyes.',
    },
  ];
}

function shouldUseTiszaProgramContext(claim: string, inputDocument: InputDocument | null): boolean {
  const haystack = normalizeText([claim, inputDocument?.title || '', inputDocument?.text || ''].join(' '));
  return haystack.includes('tisza') || haystack.includes('magyar peter');
}

function buildProgramComparisons(claim: string, inputDocument: InputDocument | null): ProgramComparisonItem[] {
  if (!shouldUseTiszaProgramContext(claim, inputDocument)) {
    return [];
  }

  const haystack = normalizeText([claim, inputDocument?.title || '', inputDocument?.text || ''].join(' '));
  const comparisons = TISZA_PROGRAM_REFERENCES
    .filter((reference) => reference.keywords.some((keyword) => haystack.includes(normalizeText(keyword))))
    .map((reference) => ({
      topic: reference.topic,
      assessment: haystack.includes('nincs program') || haystack.includes('nincsen program')
        ? 'CONTRADICTED_BY_PROGRAM'
        : 'SUPPORTED_BY_PROGRAM',
      analysis: haystack.includes('nincs program') || haystack.includes('nincsen program')
        ? `A cikk sugallata szerint nincs érdemi program, ezzel szemben a TISZA 2026-os programdokumentuma kifejezetten tárgyalja ezt a témát: ${reference.summary}`
        : `A cikkben szereplő témára a TISZA programja konkrét vállalást vagy külön fejezetet tartalmaz: ${reference.summary}`,
      source_title: reference.title,
      source_url: TISZA_PROGRAM_URL,
      page_hint: reference.page_hint,
    }));

  const unique = new Map(comparisons.map((item) => [item.topic, item]));
  return Array.from(unique.values()).slice(0, 4);
}

function buildProgramSources(comparisons: ProgramComparisonItem[]): FactCheckSource[] {
  return comparisons.map((item) => ({
    title: item.source_title,
    url: item.source_url,
    snippet: `${item.analysis} (Oldal: ${item.page_hint})`,
    domain: 'cdn.tisza.work',
    quality_label: 'HIGH',
    quality_score: 86,
    quality_reason: 'Elsődleges pártprogram-dokumentum, közvetlenül a vállalások forrása.',
    stance: item.assessment === 'CONTRADICTED_BY_PROGRAM' ? 'CONTRADICTS' : 'SUPPORTS',
  }));
}

function extractPsychologyQuotes(claim: string, inputDocument: InputDocument | null): string[] {
  const candidates = [
    inputDocument?.title?.trim() || '',
    claim.trim(),
    ...((inputDocument?.text || '')
      .split(/(?<=[.!?])\s+/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 55 && item.length <= 180)
      .slice(0, 3)),
  ];

  return Array.from(new Set(candidates.filter(Boolean))).slice(0, 4);
}

function applySourceQuality(sources: FactCheckSource[]): FactCheckSource[] {
  return sources.map((source) => ({
    ...source,
    ...classifySourceQuality(source.url),
  }));
}

function computeWeightedConfidence(baseConfidence: number, sources: FactCheckSource[]): number {
  if (sources.length === 0) {
    return baseConfidence;
  }

  const averageQuality = sources.reduce((sum, source) => sum + (source.quality_score || 50), 0) / sources.length;
  const weighted = baseConfidence * 0.72 + averageQuality * 0.28;
  return clampScore(weighted);
}

function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('rate_limit_exceeded') || message.toLowerCase().includes('rate limit');
}

function normalizeClaimKey(claim: string): string {
  return claim.trim().replace(/\s+/g, ' ').toLowerCase();
}

function getCacheKey(claim: string): string {
  return normalizeClaimKey(claim);
}

function readCachedResponse(cacheKey: string): FactCheckResponse | null {
  const cached = responseCache.get(cacheKey);
  if (!cached) return null;

  if (cached.expiresAt > Date.now()) {
    return cached.response;
  }

  responseCache.delete(cacheKey);
  return null;
}

function storeCachedResponse(cacheKey: string, response: FactCheckResponse): void {
  responseCache.set(cacheKey, {
    expiresAt: Date.now() + FACT_CHECK_CACHE_TTL_MS,
    response,
  });
}

function buildLocalEffectiveClaim(claim: string, inputDocument: InputDocument | null): string {
  if (inputDocument?.title?.trim()) {
    return inputDocument.title.trim();
  }

  return claim.trim().replace(/\s+/g, ' ');
}

function buildFallbackResponse(
  effectiveClaim: string,
  sources: FactCheckSource[],
  inputDocument: InputDocument | null,
  articleBodyAnalysis: Partial<ArticleBodyAnalysis> | null,
): FactCheckResponse {
  const programComparisons = buildProgramComparisons(effectiveClaim, inputDocument);
  const sourceCount = sources.length;
  const explanationParts = [
    'A részletes AI-értékelés most kvóta miatt nem futott le teljesen.',
    sourceCount > 0
      ? `Találtam ${sourceCount} kapcsolódó forrást, de a nyelvi modell válasza korlátozott.`
      : 'Nem sikerült elegendő megbízható forrást gyűjteni.',
    inputDocument?.title?.trim() ? `A beküldött cikk címe: ${inputDocument.title.trim()}.` : `Ellenőrzött állítás: ${effectiveClaim}.`,
  ];

  return {
    verdict: 'UNVERIFIABLE',
    confidence: 0,
    explanation: explanationParts.join(' '),
    sources: applySourceQuality([...mergeEvidenceIntoSources(sources, [], inputDocument), ...buildProgramSources(programComparisons)]),
    manipulation_techniques: [],
    headline_analysis: [],
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
    psychology_analysis: null,
    manipulation_index: buildManipulationIndex(effectiveClaim, inputDocument),
    program_comparison: programComparisons,
  };
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return { message: error.message, name: error.name, stack: error.stack };
  }

  return { message: String(error) };
}

function isGroqJsonValidationError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes('json_validate_failed')
    || normalized.includes('failed to validate json');
}

async function requestGroqCompletion(
  groqApiKey: string,
  body: Record<string, unknown>,
): Promise<Response> {
  return fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify(body),
  });
}

async function callGroqJson<T>(groqApiKey: string, messages: Array<{ role: 'system' | 'user'; content: string }>, maxTokens = 260): Promise<T> {
  const model = Deno.env.get('GROQ_FACT_CHECK_MODEL') || DEFAULT_GROQ_FACT_CHECK_MODEL;
  const baseBody = {
    model,
    temperature: 0.1,
    max_tokens: maxTokens,
    messages,
  };

  const strictResponse = await requestGroqCompletion(groqApiKey, {
    ...baseBody,
    response_format: { type: 'json_object' },
  });

  if (strictResponse.ok) {
    const data = await strictResponse.json();
    const content = data?.choices?.[0]?.message?.content;

    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('Groq returned an empty answer');
    }

    return JSON.parse(extractJsonObject(content)) as T;
  }

  const strictErrorText = await strictResponse.text();
  if (!isGroqJsonValidationError(strictErrorText)) {
    throw new Error(`Groq request failed: ${strictErrorText}`);
  }

  const relaxedResponse = await requestGroqCompletion(groqApiKey, {
    ...baseBody,
    messages: [
      ...messages,
      {
        role: 'user',
        content: 'Az elozo valasz JSON-validalason elbukott. Most csak egyetlen ervenyes JSON objektumot adj vissza, markdown, komment es magyarazo szoveg nelkul.',
      },
    ],
  });

  if (!relaxedResponse.ok) {
    const relaxedErrorText = await relaxedResponse.text();
    throw new Error(`Groq request failed: ${relaxedErrorText}`);
  }

  const relaxedData = await relaxedResponse.json();
  const relaxedContent = relaxedData?.choices?.[0]?.message?.content;

  if (typeof relaxedContent !== 'string' || !relaxedContent.trim()) {
    throw new Error('Groq returned an empty answer');
  }

  try {
    return JSON.parse(extractJsonObject(relaxedContent)) as T;
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    throw new Error(`Groq JSON parse failed after retry: ${details}`);
  }
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
  const text = extractMainTextFromHtml(html).slice(0, 3200);
  const snippet = text.slice(0, 220);

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
  const excerpt = inputDocument.text.split(/\s+/).slice(0, 28).join(' ').trim();

  return [title, excerpt].filter(Boolean).join(' ').slice(0, 420) || claim;
}

function buildEvidencePrompt(claim: string, sources: FactCheckSource[], inputDocument: InputDocument | null, psychologyQuotes: string[]): string {
  return [
    'Feladat: intelligens, bizonyíték-alapú fact-check és pszichológiai olvasat magyarul, ékezetekkel, csak JSON.',
    'Ne csak a cikket ismételd. Vesd össze a cikk állításait a forrásokkal, és keress kifejezetten alátámasztó és ellentmondó bizonyítékokat.',
    'Vonj le következtetést abból is, ha a cikk állítása túlnyúlik azon, amit a források ténylegesen igazolnak.',
    'Ha a cikkcím túlzó a törzsszöveghez képest, az legyen MISLEADING.',
    'A pszichológiai rész legyen analitikus, tárgyszerű, klinikai hangvételű, de ne diagnosztizáljon személyt.',
    'Schema: {"normalized_claim":"string","verdict":"TRUE|FALSE|MISLEADING|UNVERIFIABLE","confidence":0-100,"explanation":"string","manipulation_techniques":["string"],"evidence":[{"url":"string","stance":"SUPPORTS|CONTRADICTS|MIXED|IRRELEVANT","rationale":"string"}],"headline_analysis":[{"quote":"string","technique":"string","effect":"string","judgment":"string"}],"article_body_analysis":{"summary":"string","key_points":["string"],"headline_alignment":"string"} | null,"psychology_analysis":{"overview":"string","persuasive_strategy":"string","reader_impact":"string","quote_analysis":[{"quote":"string","observation":"string","emotional_trigger":"string","clinical_read":"string"}]}}',
    'Legyen tömör, de gondolkodó: max 4 manipulation_techniques, max 5 evidence, max 4 quote_analysis.',
    '',
    `Claim: ${claim}`,
    '',
    inputDocument
      ? [
          `Cikk URL: ${inputDocument.url}`,
          `Cikk cím: ${inputDocument.title || 'nincs cím'}`,
          `Cikk szöveg: ${inputDocument.text.slice(0, 1800) || 'nincs szöveg'}`,
        ].join('\n')
      : '',
    'Elemzendő idézetek:',
    ...psychologyQuotes.map((quote, index) => `${index + 1}. "${quote}"`),
    'Források:',
    ...sources.map((source, index) => [
      `${index + 1}. ${source.title}`,
      `URL: ${source.url}`,
      `Minőség: ${source.quality_label || 'UNKNOWN'} (${source.quality_score || 0})`,
      `Kivonat: ${source.snippet || 'nincs kivonat'}`,
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
      .slice(0, 240);

    return {
      ...source,
      snippet: snippet || source.snippet,
      stance: assessment?.stance || 'IRRELEVANT',
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
      stance: 'MIXED',
    },
    ...merged,
  ].slice(0, 6);
}

async function searchClaimInTopic(claim: string, tavilyApiKey: string, topic: 'news' | 'general', excludedUrls: string[] = []): Promise<FactCheckSource[]> {
  const collected = new Map<string, FactCheckSource>();
  const excluded = new Set(excludedUrls);
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: tavilyApiKey,
      query: claim,
      topic,
      search_depth: 'advanced',
      include_answer: false,
      include_raw_content: false,
      max_results: 3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Tavily request failed (${topic}): ${errorText}`);
  }

  const data = await response.json();
  const results = Array.isArray(data?.results) ? data.results as TavilyResult[] : [];

  for (const result of results) {
    const url = typeof result.url === 'string' ? result.url : '';
    if (!url || collected.has(url) || excluded.has(url)) continue;

    collected.set(url, {
      title: typeof result.title === 'string' ? result.title : 'Forrás',
      url,
      snippet: typeof result.content === 'string' ? result.content.slice(0, 240) : '',
    });
  }

  return Array.from(collected.values()).slice(0, 3);
}

async function searchClaimWithTavily(claim: string, tavilyApiKey: string, excludedUrls: string[] = []): Promise<FactCheckSource[]> {
  const newsSources = await searchClaimInTopic(claim, tavilyApiKey, 'news', excludedUrls);

  if (newsSources.length >= 3) {
    return newsSources;
  }

  const generalSources = await searchClaimInTopic(claim, tavilyApiKey, 'general', [
    ...excludedUrls,
    ...newsSources.map((source) => source.url),
  ]);

  return [...newsSources, ...generalSources].slice(0, 5);
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

  const cacheKey = getCacheKey(claim);
  const cachedResponse = readCachedResponse(cacheKey);

  if (cachedResponse) {
    return new Response(JSON.stringify(cachedResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const inFlight = inFlightResponses.get(cacheKey);
  if (inFlight) {
    const response = await inFlight;
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const responsePromise = (async (): Promise<FactCheckResponse> => {
      const directUrl = isProbablyUrl(claim) ? claim : extractFirstUrl(claim);
      const inputDocument = directUrl ? await safelyFetchInputDocument(directUrl) : null;
      const effectiveClaim = buildLocalEffectiveClaim(claim, inputDocument);
      const manipulationIndex = buildManipulationIndex(effectiveClaim, inputDocument);
      const psychologyQuotes = extractPsychologyQuotes(effectiveClaim, inputDocument);
      const programComparisons = buildProgramComparisons(effectiveClaim, inputDocument);

      const searchQuery = buildSearchQuery(effectiveClaim, inputDocument);
      const tavilySources = applySourceQuality(await searchClaimWithTavily(searchQuery, tavilyApiKey, directUrl ? [directUrl] : []));
      const sources = [...tavilySources, ...buildProgramSources(programComparisons)].slice(0, 5);

      if (sources.length === 0 && !inputDocument) {
        return {
          verdict: 'UNVERIFIABLE',
          confidence: 0,
          explanation: 'Nem talaltam eleg megbizhato kulso forrast az allitas ellenorzesere.',
          sources: [],
          manipulation_techniques: [],
          headline_analysis: [],
          article_body_analysis: null,
          psychology_analysis: null,
          manipulation_index: manipulationIndex,
          program_comparison: programComparisons,
        } satisfies FactCheckResponse;
      }

      let synthesis: Partial<EvidenceSynthesis> | null = null;

      try {
        synthesis = await callGroqJson<Partial<EvidenceSynthesis>>(groqApiKey, [
          {
            role: 'system',
            content: 'Csak érvényes JSON-t adj vissza magyarul, ékezetekkel. Gondolkodj oknyomozó fact-checkerként: külön keresd az alátámasztó és ellentmondó bizonyítékokat.',
          },
          {
            role: 'user',
            content: buildEvidencePrompt(effectiveClaim, sources, inputDocument, psychologyQuotes),
          },
        ], 700);
      } catch (error) {
        if (isRateLimitError(error)) {
          return buildFallbackResponse(effectiveClaim, sources, inputDocument, null);
        }

        throw error;
      }

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

      const mergedSources = applySourceQuality(mergeEvidenceIntoSources(sources, evidence, inputDocument));
      const weightedConfidence = computeWeightedConfidence(normalizeConfidence(synthesis.confidence), mergedSources);

      return {
        verdict: normalizeVerdict(synthesis.verdict),
        confidence: weightedConfidence,
        explanation: typeof synthesis.explanation === 'string' ? synthesis.explanation.trim() : 'Nem erkezett magyarazat.',
        sources: mergedSources,
        manipulation_techniques: Array.isArray(synthesis.manipulation_techniques)
          ? synthesis.manipulation_techniques.map((item) => String(item).trim()).filter(Boolean).slice(0, 6)
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
              .slice(0, 5)
          : [],
        article_body_analysis: synthesis.article_body_analysis && typeof synthesis.article_body_analysis === 'object'
          ? {
              summary: typeof synthesis.article_body_analysis.summary === 'string' ? synthesis.article_body_analysis.summary.trim() : '',
              key_points: Array.isArray(synthesis.article_body_analysis.key_points)
                ? synthesis.article_body_analysis.key_points.map((item) => String(item).trim()).filter(Boolean).slice(0, 6)
                : [],
              headline_alignment: typeof synthesis.article_body_analysis.headline_alignment === 'string'
                ? synthesis.article_body_analysis.headline_alignment.trim()
                : '',
            }
          : null,
        psychology_analysis: synthesis.psychology_analysis && typeof synthesis.psychology_analysis === 'object'
          ? {
              overview: typeof synthesis.psychology_analysis.overview === 'string' ? synthesis.psychology_analysis.overview.trim() : '',
              persuasive_strategy: typeof synthesis.psychology_analysis.persuasive_strategy === 'string'
                ? synthesis.psychology_analysis.persuasive_strategy.trim()
                : '',
              reader_impact: typeof synthesis.psychology_analysis.reader_impact === 'string'
                ? synthesis.psychology_analysis.reader_impact.trim()
                : '',
              quote_analysis: Array.isArray(synthesis.psychology_analysis.quote_analysis)
                ? synthesis.psychology_analysis.quote_analysis
                    .map((item) => ({
                      quote: typeof item?.quote === 'string' ? item.quote.trim() : '',
                      observation: typeof item?.observation === 'string' ? item.observation.trim() : '',
                      emotional_trigger: typeof item?.emotional_trigger === 'string' ? item.emotional_trigger.trim() : '',
                      clinical_read: typeof item?.clinical_read === 'string' ? item.clinical_read.trim() : '',
                    }))
                    .filter((item) => item.quote || item.observation || item.emotional_trigger || item.clinical_read)
                    .slice(0, 4)
                : [],
            }
          : null,
        manipulation_index: manipulationIndex,
        program_comparison: programComparisons,
      };
    })();

    inFlightResponses.set(cacheKey, responsePromise);

    const response = await responsePromise;
    storeCachedResponse(cacheKey, response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Unexpected function error', details: serializeError(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } finally {
    inFlightResponses.delete(cacheKey);
  }
});
