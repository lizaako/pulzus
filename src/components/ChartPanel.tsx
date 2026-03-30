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

interface ChartPanelProps {
  symbols: string[];
}

const chartConfig: ChartConfig = {
  price: {
    label: 'Ár',
    color: 'hsl(195 100% 50%)',
  },
};

function SymbolChart({ symbol }: { symbol: string }) {
  const { history, loading } = useMarketHistory(symbol);

  const chartData = useMemo(
    () =>
      history.map((d) => ({
        date: new Date(d.recorded_at).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' }),
        price: d.price,
      })),
    [history]
  );

  const latestPrice = history.length ? history[history.length - 1].price : null;
  const firstPrice = history.length ? history[0].price : null;
  const changePct =
    latestPrice && firstPrice ? (((latestPrice - firstPrice) / firstPrice) * 100).toFixed(2) : null;
  const isPositive = changePct ? parseFloat(changePct) >= 0 : true;

  return (
    <div className="p-3 rounded-lg bg-muted/20 border border-border/20 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground">{symbol}</span>
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

      <div className="text-[9px] text-muted-foreground text-right tracking-wider">1 HÓNAPOS NÉZET</div>
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
