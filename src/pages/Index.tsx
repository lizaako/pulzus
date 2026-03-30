import { useState, useMemo } from 'react';
import { useArticles, useConflicts, useMarketData } from '@/hooks/useSupabaseData';
import { Conflict } from '@/lib/supabase';
import ParticleBackground from '@/components/ParticleBackground';
import ConflictGlobe from '@/components/ConflictGlobe';
import ConflictDetail from '@/components/ConflictDetail';
import NewsPanel from '@/components/NewsPanel';
import MarketPanel from '@/components/MarketPanel';
import ChartPanel from '@/components/ChartPanel';
import StatsBar from '@/components/StatsBar';
import Navigation, { View } from '@/components/Navigation';

export default function Index() {
  const { articles, loading: articlesLoading } = useArticles();
  const { conflicts, loading: conflictsLoading } = useConflicts();
  const { marketData, loading: marketLoading } = useMarketData();

  const [view, setView] = useState<View>('globe');
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);

  const symbols = useMemo(() => {
    const unique = [...new Set(marketData.map((d) => d.symbol))];
    return unique.length ? unique : ['EUR/HUF'];
  }, [marketData]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <ParticleBackground />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="font-display text-xl font-black text-primary glow-text tracking-widest">
            HUNGRYPULSE
          </h1>
          <p className="text-[10px] text-muted-foreground tracking-[0.3em] mt-0.5">
            GLOBAL INTELLIGENCE DASHBOARD
          </p>
        </div>
        <Navigation current={view} onChange={setView} />
        <div className="text-[10px] text-muted-foreground font-mono">
          {new Date().toLocaleString()} • LIVE
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-success ml-1.5 animate-pulse-glow" />
        </div>
      </header>

      {/* Stats */}
      <div className="relative z-10 px-6 mb-4">
        <StatsBar articles={articles} conflicts={conflicts} />
      </div>

      {/* Main Content */}
      <main className="relative z-10 px-6 pb-6">
        {view === 'globe' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-200px)]">
            {/* Globe */}
            <div className="lg:col-span-3 glass-panel overflow-hidden relative">
              <ConflictGlobe
                conflicts={conflicts}
                onSelectConflict={setSelectedConflict}
              />
              {/* Conflict detail overlay */}
              {selectedConflict && (
                <div className="absolute top-4 right-4 w-80 z-20">
                  <ConflictDetail
                    conflict={selectedConflict}
                    onClose={() => setSelectedConflict(null)}
                  />
                </div>
              )}
            </div>

            {/* Side panels */}
            <div className="flex flex-col gap-4 overflow-hidden">
              <div className="flex-1 min-h-0">
                <NewsPanel articles={articles.slice(0, 10)} loading={articlesLoading} />
              </div>
              <MarketPanel marketData={marketData} loading={marketLoading} />
            </div>
          </div>
        )}

        {view === 'news' && (
          <div className="h-[calc(100vh-200px)]">
            <NewsPanel articles={articles} loading={articlesLoading} />
          </div>
        )}

        {view === 'markets' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-200px)]">
            <MarketPanel marketData={marketData} loading={marketLoading} />
            <ChartPanel symbols={symbols} />
          </div>
        )}
      </main>
    </div>
  );
}
