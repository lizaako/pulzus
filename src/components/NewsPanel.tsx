import { useMemo, useState } from 'react';
import { Article } from '@/lib/supabase';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { localizeHungaryImpact } from '@/lib/article-localization';
import { ExternalLink, Search, SendHorizontal } from 'lucide-react';
import { adaptCountryReference, useCountry } from '@/lib/country-context';

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
  const [keyword, setKeyword] = useState('');
  const { t, country, formatDate } = useCountry();

  const filteredArticles = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    if (!query) return articles;

    return articles.filter((article) => {
      const haystack = [
        article.title,
        article.summary,
        article.source,
        article.hungary_impact,
        Array.isArray(article.topics) ? article.topics.join(' ') : article.topics,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [articles, keyword]);

  if (loading) {
    return (
      <div className="glass-panel p-6 h-full flex items-center justify-center">
        <div className="text-primary font-display text-sm uppercase tracking-[0.18em]">{t('news.loading')}</div>
      </div>
    );
  }

  return (
    <div className="glass-panel h-full flex flex-col">
      <div className="p-6 border-b border-border">
        <h2 className="font-display text-2xl font-extrabold text-foreground tracking-[-0.02em]">{t('news.feed')}</h2>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={t('news.search')}
            className="h-10 rounded-none border-border bg-secondary pl-10"
          />
        </div>
      </div>
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-4">
          {filteredArticles.map((article) => (
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
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={t('news.original')}
                    title={t('news.original')}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center border border-border/70 bg-background/60 text-accent transition-colors hover:border-primary/45 hover:text-[#A01E30]"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {article.source} &bull; {formatDate(article.published_at, { year: 'numeric', month: 'numeric', day: 'numeric' })}
                </span>
                {warningBadge(article.warning_level)}
                {article.affects_hungary && (
                  <span className="text-[10px] px-2 py-1 bg-destructive text-destructive-foreground border border-destructive uppercase tracking-[0.18em]">
                    {t('news.impactBadge', { country: country.countryName })}
                  </span>
                )}
              </div>

              <p className="text-[14px] text-muted-foreground line-clamp-3">{article.summary}</p>

              {article.manipulation_tags && article.manipulation_tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {article.manipulation_tags.map((tag) => (
                    <Badge
                      key={`${article.id}-${tag}`}
                      variant="outline"
                      className="rounded-none border-border/80 bg-secondary/70 px-2 py-1 text-[10px] font-medium normal-case tracking-[0.04em] text-muted-foreground"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

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
                    className="h-9 w-9 p-0"
                    aria-label={t('news.chat')}
                    title={t('news.chat')}
                    onClick={() => onOpenChat(article)}
                  >
                    <SendHorizontal className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {article.affects_hungary && article.hungary_impact && (
                <div className="mt-1 p-4 bg-secondary border border-border">
                  <p className="text-[10px] text-destructive font-medium uppercase tracking-[0.18em] mb-1">
                    {t('news.impactTitle', { country: country.countryName })}
                  </p>
                  <p className="text-[14px] text-muted-foreground">
                    {adaptCountryReference(localizeHungaryImpact(article.hungary_impact), country.countryName)}
                  </p>
                </div>
              )}
            </div>
          ))}

          {filteredArticles.length === 0 && (
            <div className="border border-dashed border-border p-6 text-sm text-muted-foreground">
              {t('news.noResults')}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
