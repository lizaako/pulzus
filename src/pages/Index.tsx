import { useState, useMemo } from 'react';
import { useArticles, useConflicts, useMarketData } from '@/hooks/useSupabaseData';
import { Article, Conflict } from '@/lib/supabase';
import ParticleBackground from '@/components/ParticleBackground';
import ConflictGlobe from '@/components/ConflictGlobe';
import ConflictDetail from '@/components/ConflictDetail';
import NewsPanel from '@/components/NewsPanel';
import NewsInsightChat from '@/components/NewsInsightChat';
import MarketPanel from '@/components/MarketPanel';
import ChartPanel from '@/components/ChartPanel';
import StatsBar from '@/components/StatsBar';
import Navigation, { View } from '@/components/Navigation';

export default function Index() {
  const { articles, loading: articlesLoading } = useArticles();
  const { conflicts } = useConflicts();
  const { marketData, loading: marketLoading } = useMarketData();

  const [view, setView] = useState<View>('globe');
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [chatArticle, setChatArticle] = useState<Article | null>(null);

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
            PULZUS
          </h1>
          <p className="text-[10px] text-muted-foreground tracking-[0.3em] mt-0.5">
            GLOBÁLIS HÍRKÖZPONT
          </p>
        </div>
        <Navigation current={view} onChange={setView} />
        <div className="text-[10px] text-muted-foreground font-mono">
          {new Date().toLocaleString('hu-HU')} • ÉLŐ
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
          <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)_320px] gap-4 h-[calc(100vh-200px)]">
            <section className="min-h-0 h-full order-2 xl:order-1">
              <NewsPanel articles={articles} loading={articlesLoading} onOpenChat={setChatArticle} />
            </section>

            <section className="min-h-0 h-full order-1 xl:order-2">
              <div className="glass-panel overflow-hidden relative h-full min-h-[420px]">
                <ConflictGlobe
                  conflicts={conflicts}
                  onSelectConflict={setSelectedConflict}
                />
                {selectedConflict && (
                  <div className="absolute top-4 right-4 w-80 max-w-[calc(100%-2rem)] z-20">
                    <ConflictDetail
                      conflict={selectedConflict}
                      onClose={() => setSelectedConflict(null)}
                    />
                  </div>
                )}
              </div>
            </section>

            <section className="min-h-0 h-full order-3">
              <MarketPanel marketData={marketData} loading={marketLoading} />
            </section>
          </div>
        )}

        {view === 'markets' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-200px)]">
            <MarketPanel marketData={marketData} loading={marketLoading} />
            <ChartPanel symbols={symbols} />
          </div>
        )}
      </main>

      <NewsInsightChat
        article={chatArticle}
        open={Boolean(chatArticle)}
        onOpenChange={(open) => {
          if (!open) setChatArticle(null);
        }}
      />
    </div>
  );
}
