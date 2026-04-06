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
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConflicts = useCallback(async () => {
    const { data } = await supabase
      .from('conflicts')
      .select('*')
      .order('event_date', { ascending: false })
      .limit(100); // Fetch more so we have material to deduplicate
    
    if (data) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 3); // 72 hours cutoff
      
      const unique = [];
      const seen = new Set();
      for (const d of data) {
        if (new Date(d.event_date) > cutoff) {
          const key = `${d.country}-${d.location}`.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(d);
          }
        }
      }
      setConflicts(unique.slice(0, 30));
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
