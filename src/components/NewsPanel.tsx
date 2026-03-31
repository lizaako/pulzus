import { useEffect, useState } from 'react';
import { Article } from '@/lib/supabase';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { localizeHungaryImpact } from '@/lib/article-localization';
import { translateHungaryImpactText } from '@/lib/news-chat';
import { ExternalLink, Flag, MessageSquareText } from 'lucide-react';

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
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${normalized}%` }} />
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
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${styles[level?.toLowerCase()] || styles.low}`}>
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
        <div className="animate-pulse-glow text-primary font-display text-sm">BETÖLTÉS...</div>
      </div>
    );
  }

  return (
    <div className="glass-panel h-full flex flex-col">
      <div className="p-4 border-b border-border/50">
        <h2 className="font-display text-sm font-bold text-primary glow-text tracking-wider">📰 HÍRFOLYAM</h2>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {articles.map((article) => (
            <div
              key={article.id}
              className="p-3 rounded-lg bg-muted/30 border border-border/30 hover:border-primary/30 transition-all duration-300 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground leading-tight flex-1">{article.title}</h3>
                {article.url && (
                  <a href={article.url} target="_blank" rel="noreferrer" className="text-primary hover:text-primary/80 shrink-0">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-muted-foreground">{article.source}</span>
                {warningBadge(article.warning_level)}
                {article.affects_hungary && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-1">
                    <Flag className="w-2.5 h-2.5" /> 🇭🇺 MAGYAR HATÁS
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2">{article.summary}</p>

              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono ${sentimentColor(article.sentiment_score)}`}>
                  {article.sentiment_score?.toFixed(2)}
                </span>
                <div className="flex-1">{sentimentBar(article.sentiment_score)}</div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-[10px] text-primary">
                  Mélyelemzés elérhető
                </Badge>

                {onOpenChat && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 border-primary/20 bg-primary/5 px-2 text-[10px] font-semibold uppercase tracking-wider text-primary hover:bg-primary/10"
                    onClick={() => onOpenChat(article)}
                  >
                    <MessageSquareText className="mr-1 h-3.5 w-3.5" />
                    Kérdezd az AI-t
                  </Button>
                )}
              </div>

              {article.affects_hungary && article.hungary_impact && (
                <div className="mt-1 p-2 rounded bg-destructive/5 border border-destructive/10">
                  <p className="text-[10px] text-destructive font-semibold mb-0.5">🇭🇺 Hatás Magyarországra</p>
                  <p className="text-[10px] text-muted-foreground">
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
