import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase';

export type FactCheckVerdict = 'TRUE' | 'FALSE' | 'MISLEADING' | 'UNVERIFIABLE';

export interface FactCheckSource {
  title: string;
  url: string;
  snippet?: string;
}

export interface HeadlineAnalysisItem {
  quote: string;
  technique: string;
  effect: string;
  judgment: string;
}

export interface ArticleBodyAnalysis {
  summary: string;
  key_points: string[];
  headline_alignment: string;
}

export interface FactCheckResult {
  verdict: FactCheckVerdict;
  confidence: number;
  explanation: string;
  sources: FactCheckSource[];
  manipulation_techniques: string[];
  headline_analysis: HeadlineAnalysisItem[];
  article_body_analysis: ArticleBodyAnalysis | null;
}

export interface FactCheckRequest {
  claim: string;
}

interface FactCheckErrorPayload {
  error?: string;
  details?: string | {
    message?: string;
    name?: string;
    stack?: string;
  };
}

function getFactCheckEndpoint(): string | null {
  const configured = import.meta.env.VITE_FACT_CHECK_API_URL;

  if (configured) {
    return configured;
  }

  try {
    const projectUrl = new URL(SUPABASE_URL);
    return `${projectUrl.origin}/functions/v1/fact-check`;
  } catch {
    return null;
  }
}

function normalizeVerdict(value: unknown): FactCheckVerdict {
  if (typeof value !== 'string') {
    return 'UNVERIFIABLE';
  }

  const normalized = value.trim().toUpperCase();

  if (normalized === 'TRUE' || normalized === 'FALSE' || normalized === 'MISLEADING' || normalized === 'UNVERIFIABLE') {
    return normalized;
  }

  return 'UNVERIFIABLE';
}

export async function requestFactCheck(claim: string): Promise<FactCheckResult> {
  const endpoint = getFactCheckEndpoint();
  const trimmed = claim.trim();

  if (!trimmed) {
    throw new Error('Adj meg egy ellenőrizendő állítást vagy címsort.');
  }

  if (!endpoint) {
    throw new Error('A fact-check végpont nincs beállítva.');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ claim } satisfies FactCheckRequest),
  });

  const payload = await response.json().catch(() => null) as FactCheckErrorPayload & Partial<FactCheckResult> | null;

  if (!response.ok) {
    const details =
      typeof payload?.details === 'string'
        ? payload.details
        : typeof payload?.details?.message === 'string'
          ? payload.details.message
          : '';

    const message = [
      typeof payload?.error === 'string' ? payload.error : `A fact-check végpont ${response.status} hibát adott.`,
      details,
    ].filter(Boolean).join(': ');

    throw new Error(message);
  }

  return {
    verdict: normalizeVerdict(payload?.verdict),
    confidence: typeof payload?.confidence === 'number' ? Math.max(0, Math.min(100, payload.confidence)) : 0,
    explanation: typeof payload?.explanation === 'string' ? payload.explanation.trim() : '',
    sources: Array.isArray(payload?.sources)
      ? payload.sources
          .map((source: unknown) => ({
            title: typeof (source as FactCheckSource)?.title === 'string' ? (source as FactCheckSource).title : 'Forrás',
            url: typeof (source as FactCheckSource)?.url === 'string' ? (source as FactCheckSource).url : '',
            snippet: typeof (source as FactCheckSource)?.snippet === 'string' ? (source as FactCheckSource).snippet : '',
          }))
          .filter((source: FactCheckSource) => Boolean(source.url))
      : [],
    manipulation_techniques: Array.isArray(payload?.manipulation_techniques)
      ? payload.manipulation_techniques.map((item: unknown) => String(item).trim()).filter(Boolean)
      : [],
    headline_analysis: Array.isArray(payload?.headline_analysis)
      ? payload.headline_analysis
          .map((item: unknown) => ({
            quote: typeof (item as HeadlineAnalysisItem)?.quote === 'string' ? (item as HeadlineAnalysisItem).quote.trim() : '',
            technique: typeof (item as HeadlineAnalysisItem)?.technique === 'string' ? (item as HeadlineAnalysisItem).technique.trim() : '',
            effect: typeof (item as HeadlineAnalysisItem)?.effect === 'string' ? (item as HeadlineAnalysisItem).effect.trim() : '',
            judgment: typeof (item as HeadlineAnalysisItem)?.judgment === 'string' ? (item as HeadlineAnalysisItem).judgment.trim() : '',
          }))
          .filter((item) => item.quote || item.technique || item.effect || item.judgment)
      : [],
    article_body_analysis: payload?.article_body_analysis && typeof payload.article_body_analysis === 'object'
      ? {
          summary: typeof payload.article_body_analysis.summary === 'string' ? payload.article_body_analysis.summary.trim() : '',
          key_points: Array.isArray(payload.article_body_analysis.key_points)
            ? payload.article_body_analysis.key_points.map((item: unknown) => String(item).trim()).filter(Boolean)
            : [],
          headline_alignment: typeof payload.article_body_analysis.headline_alignment === 'string'
            ? payload.article_body_analysis.headline_alignment.trim()
            : '',
        }
      : null,
  };
}
