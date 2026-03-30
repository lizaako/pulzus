import { useState, useMemo } from 'react';
import { useMarketHistory } from '@/hooks/useSupabaseData';
import { MarketData } from '@/lib/supabase';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

interface ChartPanelProps {
  symbols: string[];
}

const chartConfig: ChartConfig = {
  price: {
    label: 'Price',
    color: 'hsl(195 100% 50%)',
  },
};

export default function ChartPanel({ symbols }: ChartPanelProps) {
  const [selected, setSelected] = useState(symbols[0] || '');
  const { history, loading } = useMarketHistory(selected);

  const chartData = useMemo(() =>
    history.map((d) => ({
      date: new Date(d.recorded_at).toLocaleDateString(),
      price: d.price,
    })),
    [history]
  );

  return (
    <div className="glass-panel p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-bold text-primary glow-text tracking-wider">📈 GRAFIKON</h2>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="bg-muted/50 border border-border/50 text-foreground text-xs rounded px-2 py-1 focus:outline-none focus:border-primary"
        >
          {symbols.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="neon-line" />

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="animate-pulse-glow text-primary font-display text-xs">LOADING...</div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground text-xs">
          No data for {selected}
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 20% 18%)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(215 15% 55%)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(215 15% 55%)' }} domain={['auto', 'auto']} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="price"
              stroke="hsl(195 100% 50%)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(195 100% 50%)' }}
            />
          </LineChart>
        </ChartContainer>
      )}
    </div>
  );
}
