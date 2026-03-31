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

// Statikus konfliktusok magyarul
const STATIC_CONFLICTS: Conflict[] = [
  {
    event_id: 'static-ukraine-1',
    event_type: 'Fegyveres konfliktus',
    country: 'Ukrajna',
    location: 'Donyeck',
    latitude: 48.0159,
    longitude: 37.8029,
    description: 'Folyamatos frontvonalas összecsapások Kelet-Ukrajnában orosz és ukrán erők között, nehéztüzérségi tűzpárbajokkal.',
    severity: 'high',
    source: 'Reuters',
    event_date: '2026-03-28',
    fatalities: 12,
  },
  {
    event_id: 'static-sudan-1',
    event_type: 'Polgárháború',
    country: 'Szudán',
    location: 'Kartúm',
    latitude: 15.5007,
    longitude: 32.5599,
    description: 'Az RSF és SAF erői továbbra is harcolnak Kartúmban, ezreket kényszerítve menekülésre humanitárius válság közepette.',
    severity: 'high',
    source: 'Al Jazeera',
    event_date: '2026-03-27',
    fatalities: 34,
  },
  {
    event_id: 'static-myanmar-1',
    event_type: 'Polgári zavargások',
    country: 'Mianmar',
    location: 'Mandalaj',
    latitude: 21.9588,
    longitude: 96.0891,
    description: 'Ellenállási erők csapnak össze a katonai junta csapataival Közép-Mianmarban, eszkalálva a polgári konfliktust.',
    severity: 'medium',
    source: 'BBC',
    event_date: '2026-03-29',
    fatalities: 7,
  },
  {
    event_id: 'static-haiti-1',
    event_type: 'Bandaháború',
    country: 'Haiti',
    location: 'Port-au-Prince',
    latitude: 18.5944,
    longitude: -72.3074,
    description: 'Fegyveres bandakoalíciók foglalják el a főváros kulcsfontosságú kerületeit az államösszeomlás és biztonsági vákuum közepette.',
    severity: 'high',
    source: 'AP News',
    event_date: '2026-03-28',
    fatalities: 15,
  },
  {
    event_id: 'static-drc-1',
    event_type: 'Fegyveres konfliktus',
    country: 'Kongó',
    location: 'Goma',
    latitude: -1.6585,
    longitude: 29.2200,
    description: 'Az M23 lázadók Goma felé nyomulnak, miközben az ENSZ békefenntartók kivonulásra készülnek, fenyegetve a regionális stabilitást.',
    severity: 'high',
    source: 'France 24',
    event_date: '2026-03-29',
    fatalities: 20,
  },
  {
    event_id: 'static-gaza-1',
    event_type: 'Fegyveres konfliktus',
    country: 'Palesztina',
    location: 'Gáza',
    latitude: 31.3547,
    longitude: 34.3088,
    description: 'Folytatódó izraeli katonai műveletek a Gázai övezetben, súlyos civil áldozatokkal és humanitárius katasztrófával.',
    severity: 'high',
    source: 'Reuters',
    event_date: '2026-03-29',
    fatalities: 45,
  },
  {
    event_id: 'static-syria-1',
    event_type: 'Polgárháború',
    country: 'Szíria',
    location: 'Aleppó',
    latitude: 36.2021,
    longitude: 37.1343,
    description: 'Szíriai ellenzéki erők és kormánycsapatok közötti összecsapások Aleppó környékén, civilek százait érintve.',
    severity: 'medium',
    source: 'BBC',
    event_date: '2026-03-28',
    fatalities: 9,
  },
  {
    event_id: 'static-iran-usa-1',
    event_type: 'Katonai feszültség',
    country: 'Irán',
    location: 'Hormuzi-szoros',
    latitude: 27.0,
    longitude: 56.3,
    description: 'Fokozódó amerikai-iráni katonai feszültség a Hormuzi-szorosban. Az USA hadihajókat és vadászgépeket telepített a térségbe, Irán válaszul hadgyakorlatot indított.',
    severity: 'high',
    source: 'Reuters',
    event_date: '2026-03-30',
    fatalities: 0,
  },
  {
    event_id: 'static-yemen-1',
    event_type: 'Fegyveres konfliktus',
    country: 'Jemen',
    location: 'Hudajda',
    latitude: 14.7978,
    longitude: 42.9545,
    description: 'Újabb összecsapások robbantak ki a jemeni kormányerők és húszi fegyveresek között a Vörös-tenger partvidékén, veszélyeztetve a tengeri kereskedelmet.',
    severity: 'high',
    source: 'Reuters',
    event_date: '2026-03-30',
    fatalities: 18,
  },
  {
    event_id: 'static-pakistan-1',
    event_type: 'Határincidens',
    country: 'Pakisztán',
    location: 'Kvéta',
    latitude: 30.1798,
    longitude: 66.9750,
    description: 'Fokozódó erőszak és fegyveres rajtaütések rázták meg Beludzsisztánt, miközben a régióban nő a szeparatista aktivitás.',
    severity: 'medium',
    source: 'Al Jazeera',
    event_date: '2026-03-29',
    fatalities: 11,
  },
  {
    event_id: 'static-venezuela-1',
    event_type: 'Politikai zavargások',
    country: 'Venezuela',
    location: 'Caracas',
    latitude: 10.4806,
    longitude: -66.9036,
    description: 'Kormányellenes tüntetések és biztonsági fellépések követik egymást Caracasban a választási vita és az ellátási válság miatt.',
    severity: 'medium',
    source: 'AP News',
    event_date: '2026-03-28',
    fatalities: 6,
  },
  {
    event_id: 'static-somalia-1',
    event_type: 'Terrorfenyegetés',
    country: 'Szomália',
    location: 'Mogadishu',
    latitude: 2.0469,
    longitude: 45.3182,
    description: 'Az al-Shabaab újabb támadásokat indított Mogadishuban, miközben a kormány és az Afrikai Unió erői ellentámadást készítenek elő.',
    severity: 'high',
    source: 'BBC',
    event_date: '2026-03-30',
    fatalities: 22,
  },
  {
    event_id: 'static-mexico-1',
    event_type: 'Kartellerőszak',
    country: 'Mexikó',
    location: 'Culiacán',
    latitude: 24.8091,
    longitude: -107.3940,
    description: 'Fegyveres összecsapások törtek ki rivális kartellek és biztonsági erők között Sinaloa államban, megbénítva a helyi közlekedést.',
    severity: 'medium',
    source: 'France 24',
    event_date: '2026-03-27',
    fatalities: 14,
  },
];

export function useConflicts() {
  const [conflicts, setConflicts] = useState<Conflict[]>(STATIC_CONFLICTS);
  const [loading, setLoading] = useState(false);

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
