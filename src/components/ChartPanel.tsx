import { useMemo } from 'react';
import { BarChart3, ChevronDown, ChevronUp, TrendingDown, TrendingUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MarketData } from '@/lib/supabase';

interface ChartPanelProps {
  marketData: MarketData[];
}

type MarketSectionId = 'fx' | 'crypto' | 'commodities';
type ExtendedMarketSectionId = MarketSectionId | 'indexes' | 'stocks';

interface MarketRowMeta {
  code: string;
  section: ExtendedMarketSectionId;
  label: string;
}

const MARKET_ROW_META: Record<string, MarketRowMeta> = {
  '^GSPC': { code: 'US', section: 'indexes', label: 'S&P 500' },
  '^IXIC': { code: 'US', section: 'indexes', label: 'NASDAQ' },
  '^DJI': { code: 'US', section: 'indexes', label: 'Dow Jones' },
  '^GDAXI': { code: 'EU', section: 'indexes', label: 'DAX' },
  '^FTSE': { code: 'UK', section: 'indexes', label: 'FTSE 100' },
  '^N225': { code: 'JP', section: 'indexes', label: 'Nikkei 225' },
  'EUR/HUF': { code: 'FX', section: 'fx', label: 'EUR/HUF' },
  'USD/HUF': { code: 'FX', section: 'fx', label: 'USD/HUF' },
  'GBP/HUF': { code: 'FX', section: 'fx', label: 'GBP/HUF' },
  'CHF/HUF': { code: 'FX', section: 'fx', label: 'CHF/HUF' },
  AAPL: { code: 'US', section: 'stocks', label: 'Apple' },
  MSFT: { code: 'US', section: 'stocks', label: 'Microsoft' },
  NVDA: { code: 'US', section: 'stocks', label: 'NVIDIA' },
  AMZN: { code: 'US', section: 'stocks', label: 'Amazon' },
  GOOGL: { code: 'US', section: 'stocks', label: 'Alphabet' },
  META: { code: 'US', section: 'stocks', label: 'Meta' },
  TSLA: { code: 'US', section: 'stocks', label: 'Tesla' },
  'BRK-B': { code: 'US', section: 'stocks', label: 'Berkshire Hathaway' },
  JPM: { code: 'US', section: 'stocks', label: 'JPMorgan Chase' },
  V: { code: 'US', section: 'stocks', label: 'Visa' },
  WMT: { code: 'US', section: 'stocks', label: 'Walmart' },
  XOM: { code: 'US', section: 'stocks', label: 'Exxon Mobil' },
  LLY: { code: 'US', section: 'stocks', label: 'Eli Lilly' },
  AVGO: { code: 'US', section: 'stocks', label: 'Broadcom' },
  ORCL: { code: 'US', section: 'stocks', label: 'Oracle' },
  BTC: { code: 'CR', section: 'crypto', label: 'Bitcoin' },
  ETH: { code: 'CR', section: 'crypto', label: 'Ethereum' },
  SOL: { code: 'CR', section: 'crypto', label: 'Solana' },
  XRP: { code: 'CR', section: 'crypto', label: 'XRP' },
  BNB: { code: 'CR', section: 'crypto', label: 'BNB' },
  DOGE: { code: 'CR', section: 'crypto', label: 'Dogecoin' },
  ADA: { code: 'CR', section: 'crypto', label: 'Cardano' },
  TRX: { code: 'CR', section: 'crypto', label: 'TRON' },
  LINK: { code: 'CR', section: 'crypto', label: 'Chainlink' },
  ARANY: { code: 'CM', section: 'commodities', label: 'Arany' },
};

const SECTION_META: Record<ExtendedMarketSectionId, { title: string }> = {
  indexes: { title: 'Indexek' },
  stocks: { title: 'Részvények' },
  fx: { title: 'Devizák' },
  crypto: { title: 'Kripto' },
  commodities: { title: 'Árupiacok' },
};

function getLatestBySymbol(marketData: MarketData[]) {
  return Object.values(
    marketData.reduce<Record<string, MarketData>>((acc, entry) => {
      if (!acc[entry.symbol] || new Date(entry.recorded_at) > new Date(acc[entry.symbol].recorded_at)) {
        acc[entry.symbol] = entry;
      }
      return acc;
    }, {}),
  );
}

function formatPrice(value: number, currency: string) {
  const fractionDigits = value >= 1000 ? 2 : value >= 100 ? 2 : 4;
  return `${value.toLocaleString('hu-HU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: fractionDigits,
  })} ${currency}`;
}

function MarketSection({
  title,
  rows,
}: {
  title: string;
  rows: Array<MarketData & { meta: MarketRowMeta }>;
}) {
  if (rows.length === 0) return null;

  return (
    <section className="border-t border-[#212121] first:border-t-0">
      <div className="flex items-center gap-2 px-5 py-4">
        <div className="flex h-6 w-6 items-center justify-center rounded-none border border-[#2A2A2A] bg-[#151515] text-[#C8243C]">
          <BarChart3 className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-[11px] font-display font-bold uppercase tracking-[0.24em] text-[#9F998F]">
          {title}
        </h3>
      </div>

      <div>
        {rows.map((row) => {
          const isPositive = row.change_percent >= 0;
          const TrendIcon = isPositive ? TrendingUp : TrendingDown;
          const showChange = row.meta.section !== 'fx';

          return (
            <div
              key={row.symbol}
              className={`grid items-center gap-3 border-t border-[#1D1D1D] px-5 py-3 first:border-t-0 ${showChange ? 'grid-cols-[minmax(0,1fr)_auto_auto]' : 'grid-cols-[minmax(0,1fr)_auto]'}`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[18px] leading-none text-[#F2EDE4]">{row.meta.label}</span>
                  <span className="inline-flex items-center border border-[#2A2A2A] bg-[#171717] px-1.5 py-0.5 text-[8px] uppercase tracking-[0.2em] text-[#7C776F]">
                    {row.meta.code}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[18px] font-mono leading-none text-[#F2EDE4]">
                  {formatPrice(row.price, row.currency)}
                </div>
              </div>

              {showChange && (
                <div className={`flex items-center justify-end gap-1 text-[14px] font-mono leading-none ${isPositive ? 'text-[#4ADE80]' : 'text-[#F87171]'}`}>
                  <TrendIcon className="h-3.5 w-3.5" />
                  <span>{isPositive ? '+' : ''}{row.change_percent.toFixed(2)}%</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function ChartPanel({ marketData }: ChartPanelProps) {
  const sections = useMemo(() => {
    const latestEntries = getLatestBySymbol(marketData)
      .filter((entry) => MARKET_ROW_META[entry.symbol])
      .map((entry) => ({
        ...entry,
        meta: MARKET_ROW_META[entry.symbol],
      }));

    return {
      indexes: latestEntries.filter((entry) => entry.meta.section === 'indexes'),
      stocks: latestEntries.filter((entry) => entry.meta.section === 'stocks'),
      fx: latestEntries.filter((entry) => entry.meta.section === 'fx'),
      crypto: latestEntries.filter((entry) => entry.meta.section === 'crypto'),
      commodities: latestEntries.filter((entry) => entry.meta.section === 'commodities'),
    };
  }, [marketData]);

  const sentiment = useMemo(() => {
    const allRows = Object.values(sections).flat();
    if (allRows.length === 0) return 'Nincs adat';
    const positiveCount = allRows.filter((row) => row.change_percent >= 0).length;
    return positiveCount >= Math.ceil(allRows.length / 2) ? 'Emelkedő' : 'Vegyes';
  }, [sections]);

  const lastUpdated = useMemo(() => {
    const latestEntries = getLatestBySymbol(marketData);
    if (latestEntries.length === 0) return null;

    const newest = latestEntries
      .map((entry) => new Date(entry.recorded_at).getTime())
      .sort((a, b) => b - a)[0];

    return new Date(newest).toLocaleString('hu-HU', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [marketData]);

  return (
    <div className="h-full min-h-0 overflow-hidden border border-[#7B1E29] bg-[#101010] shadow-[0_2px_8px_rgba(0,0,0,0.24),0_0_0_1px_rgba(123,30,41,0.18)]">
      <div className="flex items-center justify-between border-b border-[#1F1F1F] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-none border border-[#2B2B2B] bg-[#151515] text-[#C8243C]">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-3">
            <h2 className="font-display text-[13px] font-extrabold uppercase tracking-[0.24em] text-[#EAE4DA]">
              Piacok
            </h2>
            <span className="inline-flex items-center border border-[#225A37] bg-[#163322] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#7BEEA7]">
              {sentiment}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[#756F68]">
          <ChevronUp className="h-4 w-4" />
        </div>
      </div>

      <ScrollArea className="h-[calc(100%-65px)]">
        <div className="pb-2">
          <MarketSection title={SECTION_META.fx.title} rows={sections.fx} />
          <MarketSection title={SECTION_META.indexes.title} rows={sections.indexes} />
          <MarketSection title={SECTION_META.stocks.title} rows={sections.stocks} />
          <MarketSection title={SECTION_META.crypto.title} rows={sections.crypto} />
          <MarketSection title={SECTION_META.commodities.title} rows={sections.commodities} />

          {Object.values(sections).flat().length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-[#8B857C]">
              Jelenleg nincs megjeleníthető piaci adat.
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="flex items-center justify-between border-t border-[#1F1F1F] px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-[#756F68]">
        <span>{lastUpdated ? `Frissítve ${lastUpdated}` : 'Várakozás adatokra'}</span>
        <ChevronDown className="h-4 w-4" />
      </div>
    </div>
  );
}
