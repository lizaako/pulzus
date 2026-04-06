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

export function useConflicts() {
  const [liveConflicts, setLiveConflicts] = useState<Conflict[]>([]);
  const [historyConflicts, setHistoryConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConflicts = useCallback(async () => {
    const { data } = await supabase
      .from('conflicts')
      .select('*')
      .order('event_date', { ascending: false })
      .limit(250); // Fetch enough rows for both live and history buckets
    
    if (data) {
      const liveCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24 hours (live globe)
      const historyCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // last 30 days
      const isFallback = (conflict: Conflict) => (conflict.source || '').toLowerCase() === 'fallback seed';

      const dedupeByPlace = (items: Conflict[]) => {
        const unique: Conflict[] = [];
        const seen = new Set<string>();
        for (const item of items) {
          const key = `${item.country}-${item.location}`.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(item);
          }
        }
        return unique;
      };
      const preferRealOverFallback = (items: Conflict[]) => {
        const real = items.filter((item) => !isFallback(item));
        return real.length > 0 ? real : items;
      };

      const liveOnly = data.filter((d) => new Date(d.event_date) >= liveCutoff);
      const historyOnly = data.filter((d) => {
        const eventDate = new Date(d.event_date);
        return eventDate < liveCutoff && eventDate >= historyCutoff;
      });

      setLiveConflicts(dedupeByPlace(preferRealOverFallback(liveOnly)).slice(0, 30));
      setHistoryConflicts(dedupeByPlace(preferRealOverFallback(historyOnly)).slice(0, 80));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConflicts();
    const interval = setInterval(fetchConflicts, 15000);
    return () => clearInterval(interval);
  }, [fetchConflicts]);

  return { conflicts: liveConflicts, liveConflicts, historyConflicts, loading };
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
