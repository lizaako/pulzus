import { MarketData } from '@/lib/supabase';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MarketPanelProps {
  marketData: MarketData[];
  loading: boolean;
}

export default function MarketPanel({ marketData, loading }: MarketPanelProps) {
  // Get latest entry per symbol
  const latestBySymbol = marketData.reduce<Record<string, MarketData>>((acc, d) => {
    if (!acc[d.symbol] || new Date(d.recorded_at) > new Date(acc[d.symbol].recorded_at)) {
      acc[d.symbol] = d;
    }
    return acc;
  }, {});
  const entries = Object.values(latestBySymbol);

  if (loading) {
    return (
      <div className="glass-panel p-6 flex items-center justify-center">
        <div className="animate-pulse-glow text-primary font-display text-sm">PIACOK BETÖLTÉSE...</div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-4 space-y-3">
      <h2 className="font-display text-sm font-bold text-primary glow-text tracking-wider">💰 PIACOK</h2>
      <div className="neon-line" />
      <div className="space-y-2">
        {entries.map((d) => {
          const isPositive = d.change_percent >= 0;
          return (
            <div
              key={d.symbol}
              className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/20 hover:border-primary/20 transition-all"
            >
              <div>
                <div className="text-xs font-bold text-foreground">{d.symbol}</div>
                <div className="text-[10px] text-muted-foreground">{d.company}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono font-bold text-foreground">
                  {d.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-[10px] text-muted-foreground ml-1">{d.currency}</span>
                </div>
                <div className={`flex items-center gap-0.5 justify-end text-xs font-mono ${isPositive ? 'text-success' : 'text-destructive'}`}>
                  {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {isPositive ? '+' : ''}{d.change_percent?.toFixed(2)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
