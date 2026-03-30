import { useState, useEffect, useCallback } from 'react';
import { supabase, Article, Conflict, MarketData } from '@/lib/supabase';

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

// Static real-world conflicts to supplement DB data
const STATIC_CONFLICTS: Conflict[] = [
  {
    event_id: 'static-ukraine-1',
    event_type: 'Armed Conflict',
    country: 'Ukraine',
    location: 'Donetsk',
    latitude: 48.0159,
    longitude: 37.8029,
    description: 'Ongoing frontline clashes in eastern Ukraine between Russian and Ukrainian forces with heavy artillery exchanges.',
    severity: 'high',
    source: 'Reuters',
    event_date: '2026-03-28',
    fatalities: 12,
  },
  {
    event_id: 'static-sudan-1',
    event_type: 'Civil War',
    country: 'Sudan',
    location: 'Khartoum',
    latitude: 15.5007,
    longitude: 32.5599,
    description: 'RSF and SAF forces continue fighting in Khartoum, displacing thousands of civilians amid a humanitarian crisis.',
    severity: 'high',
    source: 'Al Jazeera',
    event_date: '2026-03-27',
    fatalities: 34,
  },
  {
    event_id: 'static-myanmar-1',
    event_type: 'Civil Unrest',
    country: 'Myanmar',
    location: 'Mandalay',
    latitude: 21.9588,
    longitude: 96.0891,
    description: 'Resistance forces clash with military junta troops in central Myanmar, escalating the ongoing civil conflict.',
    severity: 'medium',
    source: 'BBC',
    event_date: '2026-03-29',
    fatalities: 7,
  },
  {
    event_id: 'static-haiti-1',
    event_type: 'Gang Violence',
    country: 'Haiti',
    location: 'Port-au-Prince',
    latitude: 18.5944,
    longitude: -72.3074,
    description: 'Armed gang coalitions seize control of key districts in the capital amid state collapse and security vacuum.',
    severity: 'high',
    source: 'AP News',
    event_date: '2026-03-28',
    fatalities: 15,
  },
  {
    event_id: 'static-drc-1',
    event_type: 'Armed Conflict',
    country: 'DR Congo',
    location: 'Goma',
    latitude: -1.6585,
    longitude: 29.2200,
    description: 'M23 rebels advance near Goma as UN peacekeepers prepare withdrawal, threatening regional stability.',
    severity: 'high',
    source: 'France 24',
    event_date: '2026-03-29',
    fatalities: 20,
  },
];

// DB conflicts to keep (matched by partial title/description keywords)
const KEEP_KEYWORDS = ['potential military action', 'spain'];

export function useConflicts() {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('conflicts')
      .select('*')
      .order('event_date', { ascending: false });
    
    // Filter DB conflicts to only keep the ones user wants
    const filtered = (data || []).filter((c) => {
      const text = `${c.event_type} ${c.description} ${c.country} ${c.location}`.toLowerCase();
      return KEEP_KEYWORDS.some((kw) => text.includes(kw));
    });

    setConflicts([...filtered, ...STATIC_CONFLICTS]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 10000);
    return () => clearInterval(interval);
  }, [fetch]);

  return { conflicts, loading };
}

export function useMarketData() {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('market_data')
      .select('*')
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
