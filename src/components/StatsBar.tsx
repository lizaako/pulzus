import { Article, Conflict } from '@/lib/supabase';

interface StatsBarProps {
  articles: Article[];
  conflicts: Conflict[];
}

export default function StatsBar({ articles, conflicts }: StatsBarProps) {
  const highConflicts = conflicts.filter((c) => c.severity?.toLowerCase() === 'high').length;
  const avgSentiment = articles.length
    ? articles.reduce((sum, a) => sum + (a.sentiment_score || 0), 0) / articles.length
    : 0;
  const hungaryArticles = articles.filter((a) => a.affects_hungary).length;

  const stats = [
    {
      label: 'KONFLIKTUSOK',
      value: conflicts.length,
      color: 'text-primary',
    },
    {
      label: 'MAGAS KOCKÁZAT',
      value: highConflicts,
      color: 'text-destructive',
    },
    {
      label: 'CIKKEK',
      value: articles.length,
      color: 'text-foreground',
    },
    {
      label: 'ÁTL. HANGULAT',
      value: avgSentiment.toFixed(2),
      color: avgSentiment >= 0 ? 'text-success' : 'text-destructive',
    },
    {
      label: 'MAGYAR HATÁS',
      value: hungaryArticles,
      color: 'text-destructive',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
      {stats.map((s) => (
        <div key={s.label} className="glass-panel px-4 py-4 sm:px-6 sm:py-5">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">{s.label}</div>
            <div className={`mt-2 text-2xl sm:text-3xl font-display font-extrabold ${s.color}`}>{s.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
