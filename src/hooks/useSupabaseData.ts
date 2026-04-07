import { useState, useEffect, useCallback } from 'react';
import { supabase, Article, Conflict, MarketData } from '@/lib/supabase';

const CONFLICT_LOOKBACK_DAYS = 3;
const MAX_VISIBLE_CONFLICTS = 30;
const PLACEHOLDER_CONFLICT_DESCRIPTION = 'Forras atmenetileg limitelt (429), ideiglenes hotspot megjelenites.';
const PLACEHOLDER_CONFLICT_SOURCE = 'fallback seed';

function isValidCoordinate(value: number, min: number, max: number) {
  return Number.isFinite(value) && value >= min && value <= max;
}

function isPlaceholderConflict(conflict: Conflict) {
  const description = conflict.description?.trim().toLowerCase() || '';
  const source = conflict.source?.trim().toLowerCase() || '';

  return description === PLACEHOLDER_CONFLICT_DESCRIPTION.toLowerCase()
    || source === PLACEHOLDER_CONFLICT_SOURCE;
}

function hasUsableConflictContent(conflict: Conflict) {
  if (isPlaceholderConflict(conflict)) return false;

  return Boolean(conflict.country?.trim())
    && Boolean(conflict.location?.trim())
    && Boolean(conflict.event_type?.trim())
    && Boolean(conflict.description?.trim())
    && isValidCoordinate(conflict.latitude, -90, 90)
    && isValidCoordinate(conflict.longitude, -180, 180);
}

function conflictQualityScore(conflict: Conflict) {
  let score = 0;

  if (hasUsableConflictContent(conflict)) score += 100;
  if (conflict.fatalities > 0) score += 10;
  if (conflict.description?.trim().length > 80) score += 5;
  if ((conflict.article_count || 0) > 0) score += Math.min(conflict.article_count || 0, 20);
  if ((conflict.report_count || 0) > 0) score += Math.min((conflict.report_count || 0) * 3, 18);
  if ((conflict.activity_score || 0) > 0) score += Math.min(conflict.activity_score || 0, 50);

  switch (conflict.severity?.toLowerCase()) {
    case 'high':
      score += 3;
      break;
    case 'medium':
      score += 2;
      break;
    case 'low':
      score += 1;
      break;
  }

  score += new Date(conflict.event_date).getTime() / 1_000_000_000_000;

  return score;
}

export function useArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('articles')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(50);
    if (data) setArticles(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 10000);
    return () => clearInterval(interval);
  }, [fetch]);

  return { articles, loading };
}

export function useConflicts() {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConflicts = useCallback(async () => {
    const zoneQuery = await supabase
      .from('active_conflict_zones')
      .select('*')
      .order('activity_score', { ascending: false })
      .order('last_seen_at', { ascending: false })
      .limit(60);

    const fallbackQuery = !zoneQuery.data?.length
      ? await supabase
          .from('conflicts')
          .select('*')
          .order('event_date', { ascending: false })
          .limit(100)
      : null;

    const data = zoneQuery.data?.length ? zoneQuery.data : (fallbackQuery?.data || []);

    if (data.length > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - CONFLICT_LOOKBACK_DAYS);

      const bestByLocation = new Map<string, Conflict>();

      for (const conflict of data) {
        if (new Date(conflict.event_date) <= cutoff) continue;
        if (!hasUsableConflictContent(conflict)) continue;

        const normalizedConflict: Conflict = {
          ...conflict,
          event_type: (conflict.event_type || '').toLowerCase().includes('hotspot')
            ? 'Fegyveres konfliktus'
            : conflict.event_type,
        };

        const key = `${normalizedConflict.country}-${normalizedConflict.location}`.trim().toLowerCase();
        const existing = bestByLocation.get(key);

        if (!existing || conflictQualityScore(normalizedConflict) > conflictQualityScore(existing)) {
          bestByLocation.set(key, normalizedConflict);
        }
      }

      const filtered = Array.from(bestByLocation.values())
        .sort((a, b) => {
          const scoreDiff = conflictQualityScore(b) - conflictQualityScore(a);
          if (scoreDiff !== 0) return scoreDiff;
          return new Date(b.event_date).getTime() - new Date(a.event_date).getTime();
        })
        .slice(0, MAX_VISIBLE_CONFLICTS);

      setConflicts(filtered);
    } else {
      setConflicts([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConflicts();
    const interval = setInterval(fetchConflicts, 15000);
    return () => clearInterval(interval);
  }, [fetchConflicts]);

  return { conflicts, loading };
}

export function useMarketData() {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    // Only get the last 48 hours of data to avoid stale entries
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 48);
    const { data } = await supabase
      .from('market_data')
      .select('*')
      .gte('recorded_at', cutoff.toISOString())
      .order('recorded_at', { ascending: false });
    if (data) setMarketData(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 10000);
    return () => clearInterval(interval);
  }, [fetch]);

  return { marketData, loading };
}

export function useMarketHistory(symbol: string) {
  const [history, setHistory] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!symbol) return;
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const { data } = await supabase
      .from('market_data')
      .select('*')
      .eq('symbol', symbol)
      .gte('recorded_at', oneMonthAgo.toISOString())
      .order('recorded_at', { ascending: true });
    if (data) setHistory(data);
    setLoading(false);
  }, [symbol]);

  useEffect(() => {
    setLoading(true);
    fetchHistory();
  }, [fetchHistory]);

  return { history, loading };
}
