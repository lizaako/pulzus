import { Article, Conflict } from '@/lib/supabase';
import { AlertTriangle, Newspaper, Globe2, Activity } from 'lucide-react';

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
      icon: <Globe2 className="w-4 h-4" />,
      label: 'KONFLIKTUSOK',
      value: conflicts.length,
      color: 'text-primary',
    },
    {
      icon: <AlertTriangle className="w-4 h-4" />,
      label: 'MAGAS SZINTŰ',
      value: highConflicts,
      color: 'text-destructive',
    },
    {
      icon: <Newspaper className="w-4 h-4" />,
      label: 'CIKKEK',
      value: articles.length,
      color: 'text-secondary',
    },
    {
      icon: <Activity className="w-4 h-4" />,
      label: 'ÁTL. HANGULAT',
      value: avgSentiment.toFixed(2),
      color: avgSentiment >= 0 ? 'text-success' : 'text-destructive',
    },
    {
      icon: <span className="text-sm">🇭🇺</span>,
      label: 'HU IMPACT',
      value: hungaryArticles,
      color: 'text-destructive',
    },
  ];

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {stats.map((s) => (
        <div key={s.label} className="glass-panel px-3 py-2 flex items-center gap-2">
          <div className={s.color}>{s.icon}</div>
          <div>
            <div className="text-[9px] text-muted-foreground tracking-widest">{s.label}</div>
            <div className={`text-sm font-display font-bold ${s.color}`}>{s.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
