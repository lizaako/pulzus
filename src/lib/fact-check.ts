import { MOCK_ANALYSES } from './pulzus-mock-analyses';

export type {
  FactCheckResult,
  Verdict,
  Source as FactCheckSource,
  ManipulationIndex,
  NarrativeChain,
  TargetAudienceAnalysis,
  HeadlineAnalysis,
  PsychologicalQuote,
  Stance,
  EmotionalTarget,
} from './pulzus-mock-analyses';

export async function checkFact(input: string): Promise<import('./pulzus-mock-analyses').FactCheckResult | null> {
  const normalized = input.trim().replace(/\/$/, '');
  return MOCK_ANALYSES[normalized] ?? null;
}
