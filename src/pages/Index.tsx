import { useState, useMemo } from 'react';
import { useArticles, useConflicts, useMarketData } from '@/hooks/useSupabaseData';
import { Article, Conflict } from '@/lib/supabase';
import ParticleBackground from '@/components/ParticleBackground';
import ConflictGlobe from '@/components/ConflictGlobe';
import ConflictDetail from '@/components/ConflictDetail';
import NewsPanel from '@/components/NewsPanel';
import NewsInsightChat from '@/components/NewsInsightChat';
import ChartPanel from '@/components/ChartPanel';
import HungarianEconomyPanel from '@/components/HungarianEconomyPanel';
import MediaLensPanel from '@/components/MediaLensPanel';
import StatsBar from '@/components/StatsBar';
import MarketTicker from '@/components/MarketTicker';
import Navigation, { View } from '@/components/Navigation';

export default function Index() {
  const { articles, loading: articlesLoading } = useArticles();
  const { conflicts } = useConflicts();
  const { marketData } = useMarketData();

  const [view, setView] = useState<View>('globe');
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [chatArticle, setChatArticle] = useState<Article | null>(null);

  const symbols = useMemo(() => {
    const unique = [...new Set(marketData.map((d) => d.symbol))];
    return unique.length ? unique : ['EUR/HUF'];
  }, [marketData]);

  return (
    <div className="min-h-screen bg-background relative">
      <ParticleBackground />

      <header className="relative z-10 bg-[#0D0D0D] text-[#F2EDE4] border-b border-[#333333]">
        <div className="px-4 py-3 sm:px-6 sm:py-0 sm:h-16 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6">
          <h1 className="font-display text-xl sm:text-2xl font-extrabold uppercase tracking-[0.16em] text-[#F2EDE4]">
            PULZUS
          </h1>
          <Navigation current={view} onChange={setView} />
          <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-[#F2EDE4]/72 sm:text-right">
            {new Date().toLocaleString('hu-HU')}
          </div>
        </div>
      </header>

      {(view === 'globe' || view === 'markets') && (
        <div className="relative z-10 px-4 pt-4 sm:px-6 sm:pt-8">
          {view === 'markets' ? (
            <MarketTicker articles={articles} />
          ) : (
            <StatsBar articles={articles} conflicts={conflicts} />
          )}
        </div>
      )}

      <main className="relative z-10 px-4 py-6 sm:px-6 sm:py-10 lg:py-12">
        {view === 'globe' && (
          <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)_340px] 2xl:grid-cols-[400px_minmax(0,1fr)_380px] gap-4 sm:gap-6 xl:h-[calc(100vh-208px)]">
            <section className="min-h-0 h-full order-2 xl:order-1">
              <NewsPanel articles={articles} loading={articlesLoading} onOpenChat={setChatArticle} />
            </section>

            <section className="min-h-0 h-full order-1 xl:order-2">
              <div className="overflow-hidden relative h-[420px] sm:h-[520px] xl:h-full min-h-[420px] bg-[#111111] border-[3px] border-[#C8243C] shadow-[0_2px_8px_rgba(0,0,0,0.06),0_0_0_1px_rgba(200,36,60,0.28)]">
                <ConflictGlobe
                  conflicts={conflicts}
                  onSelectConflict={setSelectedConflict}
                />
                {selectedConflict && (
                  <div className="absolute left-3 right-3 bottom-3 sm:left-auto sm:right-4 sm:top-4 sm:bottom-auto sm:w-80 sm:max-w-[calc(100%-2rem)] z-20">
                    <ConflictDetail
                      conflict={selectedConflict}
                      onClose={() => setSelectedConflict(null)}
                    />
                  </div>
                )}
              </div>
            </section>

            <section className="min-h-0 h-full order-3">
              <ChartPanel symbols={symbols} />
            </section>
          </div>
        )}

        {view === 'markets' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 xl:h-[calc(100vh-208px)] min-h-0">
            <section className="min-h-0 h-full">
              <HungarianEconomyPanel />
            </section>
            <section className="min-h-0 h-full">
              <ChartPanel symbols={symbols} />
            </section>
          </div>
        )}

        {view === 'media' && (
          <section>
            <MediaLensPanel />
          </section>
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
