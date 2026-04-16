import { useState, useEffect, useCallback } from 'react';
import { supabase, Article, Conflict, MarketData } from '@/lib/supabase';

const CONFLICT_LOOKBACK_DAYS = 3;
const MAX_VISIBLE_CONFLICTS = 30;
const NEWS_RELEVANCE_KEYWORDS = [
  'war', 'conflict', 'attack', 'strike', 'shelling', 'offensive', 'ceasefire', 'military', 'drone',
  'háború', 'konfliktus', 'támadás', 'csapás', 'bombázás', 'tűzszünet', 'katonai', 'front',
  'politics', 'political', 'government', 'election', 'parliament', 'diplomacy', 'sanction', 'policy', 'geopolitics',
  'politika', 'kormány', 'választás', 'parlament', 'diplomácia', 'szankció', 'geopolitika',
  'market', 'markets', 'economy', 'economic', 'inflation', 'interest rate', 'oil', 'gas', 'trade', 'tariff', 'stock', 'forex',
  'piac', 'piacok', 'gazdaság', 'infláció', 'kamat', 'olaj', 'gáz', 'kereskedelem', 'vám', 'részvény', 'deviza',
];

function normalizeForMatching(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function topicList(topics: Article['topics']): string[] {
  if (!topics) return [];
  if (Array.isArray(topics)) return topics;
  return String(topics)
    .split(',')
    .map((topic) => topic.trim())
    .filter(Boolean);
}

function isRelevantNewsArticle(article: Article): boolean {
  const haystack = normalizeForMatching([
    article.title || '',
    article.summary || '',
    article.source || '',
    article.hungary_impact || '',
    topicList(article.topics).join(' '),
  ].join(' '));

  return NEWS_RELEVANCE_KEYWORDS.some((keyword) => haystack.includes(normalizeForMatching(keyword)));
}

function isValidCoordinate(value: number, min: number, max: number) {
  return Number.isFinite(value) && value >= min && value <= max;
}

function hasUsableConflictContent(conflict: Conflict) {
  return Boolean(conflict.country?.trim())
    && Boolean(conflict.location?.trim())
    && Boolean(conflict.event_type?.trim())
    && Boolean(conflict.description?.trim())
    && isValidCoordinate(conflict.latitude, -90, 90)
    && isValidCoordinate(conflict.longitude, -180, 180);
}

function mapArticleToConflict(article: Article): Conflict | null {
  const latitude = article.conflict_latitude;
  const longitude = article.conflict_longitude;

  if (!isValidCoordinate(latitude ?? NaN, -90, 90) || !isValidCoordinate(longitude ?? NaN, -180, 180)) {
    return null;
  }

  const severity = article.conflict_severity || article.warning_level || 'medium';
  const keywordScore = Array.isArray(article.topics) ? article.topics.length : 0;

  return {
    event_id: `article-${article.id}`,
    event_type: article.conflict_event_type || 'Fegyveres konfliktus',
    country: article.conflict_country || 'Ismeretlen',
    location: article.conflict_location || article.conflict_country || 'Ismeretlen helyszin',
    latitude,
    longitude,
    description: article.conflict_description || article.summary,
    summary: article.conflict_description || article.summary,
    severity,
    source: article.source,
    event_date: article.published_at,
    fatalities: article.conflict_fatalities || 0,
    article_count: 1,
    report_count: 0,
    activity_score:
      (severity === 'high' ? 18 : severity === 'medium' ? 12 : 8)
      + keywordScore
      + (article.affects_hungary ? 2 : 0),
    trend: 'rising',
    last_seen_at: article.published_at,
    article_url: article.url,
  };
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
      .limit(180);
    if (data) setArticles(data.filter(isRelevantNewsArticle));
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
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - CONFLICT_LOOKBACK_DAYS);

    const { data = [] } = await supabase
      .from('articles')
      .select('*')
      .gte('published_at', cutoff.toISOString())
      .not('conflict_latitude', 'is', null)
      .not('conflict_longitude', 'is', null)
      .order('published_at', { ascending: false })
      .limit(100);

    if (data.length > 0) {
      const bestByLocation = new Map<string, Conflict>();

      for (const article of data) {
        const conflict = mapArticleToConflict(article);
        if (!conflict) continue;
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
