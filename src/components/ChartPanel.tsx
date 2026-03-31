import { useMemo } from 'react';
import { useMarketHistory } from '@/hooks/useSupabaseData';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MarketData } from '@/lib/supabase';

interface ChartPanelProps {
  symbols: string[];
}

const chartConfig: ChartConfig = {
  price: {
    label: 'Ár',
    color: 'hsl(195 100% 50%)',
  },
};

function createSyntheticHistoryPoint(base: MarketData, daysAgo: number, price: number): MarketData {
  const recordedAt = new Date(base.recorded_at);
  recordedAt.setDate(recordedAt.getDate() - daysAgo);

  return {
    ...base,
    price,
    recorded_at: recordedAt.toISOString(),
  };
}

function buildDisplayHistory(history: MarketData[], symbol: string): { data: MarketData[]; synthetic: boolean } {
  if (history.length >= 2) {
    return { data: history, synthetic: false };
  }

  if (history.length === 0) {
    return { data: [], synthetic: false };
  }

  const base = history[0];
  const points: MarketData[] = [];
  const seed = symbol.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const totalPoints = 14;

  for (let index = 0; index < totalPoints; index += 1) {
    const progress = index / (totalPoints - 1);
    const wave = Math.sin((progress * Math.PI * 2) + seed * 0.1) * 0.012;
    const drift = (progress - 0.5) * 0.018;
    const multiplier = 1 + wave + drift;
    const rawPrice = base.price * multiplier;
    const price = Number(rawPrice.toFixed(2));
    const daysAgo = totalPoints - 1 - index;
    points.push(createSyntheticHistoryPoint(base, daysAgo, price));
  }

  points[points.length - 1] = {
    ...base,
    price: Number(base.price.toFixed(2)),
  };

  return { data: points, synthetic: true };
}

function SymbolChart({ symbol }: { symbol: string }) {
  const { history, loading } = useMarketHistory(symbol);
  const { data: displayHistory, synthetic } = useMemo(() => buildDisplayHistory(history, symbol), [history, symbol]);

  const chartData = useMemo(
    () =>
      displayHistory.map((d) => ({
        date: new Date(d.recorded_at).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' }),
        price: d.price,
      })),
    [displayHistory]
  );

  const latestPrice = displayHistory.length ? displayHistory[displayHistory.length - 1].price : null;
  const firstPrice = displayHistory.length ? displayHistory[0].price : null;
  const changePct =
    latestPrice && firstPrice ? (((latestPrice - firstPrice) / firstPrice) * 100).toFixed(2) : null;
  const isPositive = changePct ? parseFloat(changePct) >= 0 : true;

  return (
    <div className="p-3 rounded-lg bg-muted/20 border border-border/20 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-foreground">{symbol}</span>
          {synthetic && (
            <Badge variant="outline" className="border-warning/30 bg-warning/10 text-[9px] text-warning">
              Becsült görbe
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {latestPrice != null && (
            <span className="text-xs font-mono text-foreground">
              {latestPrice.toLocaleString('hu-HU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
          {changePct && (
            <span className={`text-[10px] font-mono ${isPositive ? 'text-success' : 'text-destructive'}`}>
              {isPositive ? '+' : ''}{changePct}%
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="h-28 flex items-center justify-center">
          <div className="animate-pulse-glow text-primary font-display text-[10px]">BETÖLTÉS...</div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-28 flex items-center justify-center text-muted-foreground text-[10px]">
          Nincs adat
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-28 w-full">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 20% 18%)" />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(215 15% 55%)' }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9, fill: 'hsl(215 15% 55%)' }} domain={['auto', 'auto']} width={45} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="price"
              stroke={isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3 }}
            />
          </LineChart>
        </ChartContainer>
      )}

      <div className="flex items-center justify-between gap-2 text-[9px] text-muted-foreground tracking-wider">
        <span>1 HÓNAPOS NÉZET</span>
        {synthetic && <span>1 adatpontból becsülve</span>}
      </div>
    </div>
  );
}

export default function ChartPanel({ symbols }: ChartPanelProps) {
  return (
    <div className="glass-panel flex flex-col h-full">
      <div className="p-4 border-b border-border/50">
        <h2 className="font-display text-sm font-bold text-primary glow-text tracking-wider">📈 GRAFIKONOK</h2>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {symbols.map((s) => (
            <SymbolChart key={s} symbol={s} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
