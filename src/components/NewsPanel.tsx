import { useEffect, useState } from 'react';
import { Article } from '@/lib/supabase';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { localizeHungaryImpact } from '@/lib/article-localization';
import { translateHungaryImpactText } from '@/lib/news-chat';

interface NewsPanelProps {
  articles: Article[];
  loading: boolean;
  onOpenChat?: (article: Article) => void;
}

function sentimentColor(score: number): string {
  if (score >= 0.3) return 'text-success';
  if (score <= -0.3) return 'text-destructive';
  return 'text-warning';
}

function sentimentBar(score: number) {
  const normalized = ((score + 1) / 2) * 100;
  const color = score >= 0.3 ? 'bg-success' : score <= -0.3 ? 'bg-destructive' : 'bg-warning';
  return (
    <div className="w-full h-1 bg-secondary overflow-hidden">
      <div className={`h-full ${color} transition-all`} style={{ width: `${normalized}%` }} />
    </div>
  );
}

function warningBadge(level: string) {
  const styles: Record<string, string> = {
    high: 'bg-destructive/20 text-destructive border-destructive/30',
    medium: 'bg-warning/20 text-warning border-warning/30',
    low: 'bg-success/20 text-success border-success/30',
  };
  return (
    <span className={`text-[10px] px-2 py-1 border font-medium uppercase tracking-[0.18em] ${styles[level?.toLowerCase()] || styles.low}`}>
      {level}
    </span>
  );
}

export default function NewsPanel({ articles, loading, onOpenChat }: NewsPanelProps) {
  const [translatedImpacts, setTranslatedImpacts] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    const candidates = articles.filter((article) => article.affects_hungary && article.hungary_impact);
    const missing = candidates.filter((article) => !translatedImpacts[article.id]);

    if (missing.length === 0) return;

    void Promise.all(
      missing.map(async (article) => {
        const translation = await translateHungaryImpactText(article.hungary_impact);
        return { id: article.id, translation };
      }),
    ).then((results) => {
      if (cancelled) return;

      setTranslatedImpacts((current) => {
        const next = { ...current };
        for (const result of results) {
          next[result.id] = result.translation;
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [articles, translatedImpacts]);

  if (loading) {
    return (
      <div className="glass-panel p-6 h-full flex items-center justify-center">
        <div className="text-primary font-display text-sm uppercase tracking-[0.18em]">Betöltés</div>
      </div>
    );
  }

  return (
    <div className="glass-panel h-full flex flex-col">
      <div className="p-6 border-b border-border">
        <h2 className="font-display text-2xl font-extrabold text-foreground tracking-[-0.02em]">Hírfolyam</h2>
      </div>
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-4">
          {articles.map((article) => (
            <div
              key={article.id}
              className="bg-card border border-border p-6 space-y-4"
              style={{ borderLeftWidth: 3, borderLeftColor: article.warning_level?.toLowerCase() === 'high' ? '#C8243C' : article.warning_level?.toLowerCase() === 'medium' ? '#D97B00' : '#2E7D4F' }}
            >
              {article.image_url && (
                <div className="relative overflow-hidden border border-border bg-secondary">
                  <img
                    src={article.image_url}
                    alt={article.title}
                    className="block h-40 w-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}

              <div className="flex items-start justify-between gap-2">
                <h3 className="text-[16px] font-semibold text-foreground leading-tight flex-1 font-display">{article.title}</h3>
                {article.url && (
                  <a href={article.url} target="_blank" rel="noreferrer" className="text-[11px] uppercase tracking-[0.2em] text-accent hover:text-[#A01E30] shrink-0">
                    Megnyitás
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {article.source} &bull; {new Date(article.published_at).toLocaleDateString('hu-HU')}
                </span>
                {warningBadge(article.warning_level)}
                {article.affects_hungary && (
                  <span className="text-[10px] px-2 py-1 bg-destructive text-destructive-foreground border border-destructive uppercase tracking-[0.18em]">Magyar hatás</span>
                )}
              </div>

              <p className="text-[14px] text-muted-foreground line-clamp-3">{article.summary}</p>

              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono ${sentimentColor(article.sentiment_score)}`}>
                  {article.sentiment_score?.toFixed(2)}
                </span>
                <div className="flex-1">{sentimentBar(article.sentiment_score)}</div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                {onOpenChat && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 px-4 text-[10px]"
                    onClick={() => onOpenChat(article)}
                  >
                    Kérdezd az AI-t
                  </Button>
                )}
              </div>

              {article.affects_hungary && article.hungary_impact && (
                <div className="mt-1 p-4 bg-secondary border border-border">
                  <p className="text-[10px] text-destructive font-medium uppercase tracking-[0.18em] mb-1">Hatás Magyarországra</p>
                  <p className="text-[14px] text-muted-foreground">
                    {translatedImpacts[article.id] || localizeHungaryImpact(article.hungary_impact)}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
