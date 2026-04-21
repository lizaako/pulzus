import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useArticles, useConflicts, useMarketData } from '@/hooks/useSupabaseData';
import { Article, Conflict } from '@/lib/supabase';
import ParticleBackground from '@/components/ParticleBackground';
import ConflictGlobe from '@/components/ConflictGlobe';
import ConflictDetail from '@/components/ConflictDetail';
import ConflictOverviewPanel from '@/components/ConflictOverviewPanel';
import NewsPanel from '@/components/NewsPanel';
import NewsInsightChat from '@/components/NewsInsightChat';
import ChartPanel from '@/components/ChartPanel';
import HungarianEconomyPanel from '@/components/HungarianEconomyPanel';
import MediaLensPanel from '@/components/MediaLensPanel';
import RealityCheckPanel from '@/components/RealityCheckPanel';
import StatsBar from '@/components/StatsBar';
import MarketTicker from '@/components/MarketTicker';
import Navigation, { View } from '@/components/Navigation';
import ExportPdfButton from '@/components/ExportPdfButton';
import { Button } from '@/components/ui/button';
import { CountryProvider, COUNTRY_OPTIONS, useCountry } from '@/lib/country-context';

function IndexContent() {
  const { articles, loading: articlesLoading } = useArticles();
  const { conflicts } = useConflicts();
  const { marketData } = useMarketData();
  const { country, countryCode, setCountryCode, formatDate, themeStyle } = useCountry();

  const [view, setView] = useState<View>('globe');
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [chatArticle, setChatArticle] = useState<Article | null>(null);

  const effectiveConflicts = conflicts;

  return (
    <div className="min-h-screen lg:h-dvh bg-background relative flex flex-col lg:overflow-hidden" style={themeStyle as CSSProperties}>
      <ParticleBackground />

      <header className="relative z-10 shrink-0 bg-[#0D0D0D] text-[#F2EDE4] border-b border-[#333333]">
        <div className="px-4 py-3 sm:px-6 sm:py-0 sm:h-16 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6">
          <h1 className="font-display text-xl sm:text-2xl font-extrabold uppercase tracking-[0.16em] text-[#F2EDE4]">
            PULZUS
          </h1>
          <Navigation current={view} onChange={setView} />
          <div className="flex items-center gap-3 sm:gap-4">
            <Button asChild variant="outline" className="rounded-none border-[#333333] bg-transparent px-3 text-[10px] uppercase tracking-[0.18em] text-[#F2EDE4] hover:bg-[#171717] hover:text-[#F2EDE4] sm:text-[11px]">
              <Link to="/pricing">Árazás</Link>
            </Button>
            <select
              aria-label="Ország"
              value={countryCode}
              onChange={(event) => setCountryCode(event.target.value as typeof countryCode)}
              className="h-9 rounded-none border border-[#333333] bg-transparent px-3 text-[10px] uppercase tracking-[0.18em] text-[#F2EDE4] focus:outline-none sm:text-[11px]"
            >
              {COUNTRY_OPTIONS.map((option) => (
                <option key={option.code} value={option.code} className="bg-[#101010] text-[#F2EDE4]">
                  {option.label}
                </option>
              ))}
            </select>
            <ExportPdfButton articles={articles} conflicts={effectiveConflicts} marketData={marketData} />
            <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-[#F2EDE4]/72 sm:text-right">
              {formatDate(new Date(), { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </header>

      {(view === 'globe' || view === 'markets') && (
        <div className="relative z-10 shrink-0 px-4 pt-4 sm:px-6 sm:pt-5 lg:pt-4">
          {view === 'markets' ? (
            <MarketTicker articles={articles} />
          ) : (
            <StatsBar articles={articles} conflicts={effectiveConflicts} />
          )}
        </div>
      )}

      <main className="relative z-10 flex-1 min-h-0 px-4 py-4 sm:px-6 sm:py-6 lg:py-4 overflow-hidden">

        {view === 'globe' && (
          <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)_340px] 2xl:grid-cols-[400px_minmax(0,1fr)_380px] gap-4 sm:gap-6 h-full min-h-0">
            <section className="min-h-0 h-full order-2 xl:order-1">
              <NewsPanel articles={articles} loading={articlesLoading} onOpenChat={setChatArticle} />
            </section>

            <section className="min-h-0 h-full order-1 xl:order-2">
              <div
                className="overflow-hidden relative h-[360px] sm:h-[460px] xl:h-full min-h-[360px] xl:min-h-0 bg-[#111111] border-[3px]"
                style={{
                  borderColor: 'var(--country-accent)',
                  boxShadow: `0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(var(--country-accent-rgb),0.28)`,
                }}
              >
                <ConflictGlobe
                  conflicts={effectiveConflicts}
                  onSelectConflict={setSelectedConflict}
                  selectedCountry={country.globeCountry}
                  accentColor={country.accentHex}
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
              <ConflictOverviewPanel
                conflicts={effectiveConflicts}
                selectedConflict={selectedConflict}
                onSelectConflict={setSelectedConflict}
              />
            </section>
          </div>
        )}

        {view === 'markets' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 h-full min-h-0">
            <section className="min-h-0 h-full">
              <HungarianEconomyPanel />
            </section>
            <section className="min-h-0 h-full">
              <ChartPanel marketData={marketData} />
            </section>
          </div>
        )}

        {view === 'media' && (
          <section>
            <MediaLensPanel articles={articles} />
          </section>
        )}

        {view === 'reality-check' && (
          <section>
            <RealityCheckPanel />
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

export default function Index() {
  return (
    <CountryProvider>
      <IndexContent />
    </CountryProvider>
  );
}
