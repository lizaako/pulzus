import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, Clock3, ExternalLink, Newspaper } from 'lucide-react';
import { Conflict } from '@/lib/supabase';
import { useCountry } from '@/lib/country-context';

interface ConflictOverviewPanelProps {
  conflicts: Conflict[];
  selectedConflict: Conflict | null;
  onSelectConflict: (conflict: Conflict) => void;
}

function severityLabel(severity: string, t: (key: string) => string) {
  switch (severity?.toLowerCase()) {
    case 'high':
      return t('conflicts.high');
    case 'medium':
      return t('conflicts.medium');
    default:
      return t('conflicts.low');
  }
}

function trendMeta(trend: Conflict['trend'] | undefined, t: (key: string) => string) {
  switch (trend) {
    case 'rising':
      return {
        label: t('conflicts.rising'),
        icon: ArrowUpRight,
        className: 'text-destructive',
      };
    case 'cooling':
      return {
        label: t('conflicts.cooling'),
        icon: ArrowDownRight,
        className: 'text-success',
      };
    default:
      return {
        label: t('conflicts.stable'),
        icon: ArrowRight,
        className: 'text-warning',
      };
  }
}

function relativeHours(date: string | undefined, countryCode: string) {
  if (!date) return countryCode === 'hu' ? 'ismeretlen' : countryCode === 'de' ? 'unbekannt' : countryCode === 'es' ? 'desconocido' : countryCode === 'fr' ? 'inconnu' : countryCode === 'fi' ? 'tuntematon' : countryCode === 'nl' ? 'onbekend' : 'unknown';

  const diffMs = Date.now() - new Date(date).getTime();
  const diffHours = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));

  if (diffHours < 1) return countryCode === 'hu' ? 'kevesebb mint 1 órája' : countryCode === 'de' ? 'vor weniger als 1 Stunde' : countryCode === 'es' ? 'hace menos de 1 hora' : countryCode === 'fr' ? 'il y a moins d’une heure' : countryCode === 'fi' ? 'alle tunti sitten' : countryCode === 'nl' ? 'minder dan 1 uur geleden' : 'less than 1 hour ago';
  if (diffHours < 24) return countryCode === 'hu' ? `${diffHours} órája` : countryCode === 'de' ? `vor ${diffHours} Std.` : countryCode === 'es' ? `hace ${diffHours} h` : countryCode === 'fr' ? `il y a ${diffHours} h` : countryCode === 'fi' ? `${diffHours} h sitten` : countryCode === 'nl' ? `${diffHours} u geleden` : `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  return countryCode === 'hu' ? `${diffDays} napja` : countryCode === 'de' ? `vor ${diffDays} Tagen` : countryCode === 'es' ? `hace ${diffDays} días` : countryCode === 'fr' ? `il y a ${diffDays} jours` : countryCode === 'fi' ? `${diffDays} pv sitten` : countryCode === 'nl' ? `${diffDays} dagen geleden` : `${diffDays} days ago`;
}

export default function ConflictOverviewPanel({
  conflicts,
  selectedConflict,
  onSelectConflict,
}: ConflictOverviewPanelProps) {
  const { t, countryCode } = useCountry();
  return (
    <div className="glass-panel h-full min-h-[420px] xl:min-h-0 p-4 sm:p-6 overflow-hidden flex flex-col">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground break-words">{t('conflicts.activeZones')}</div>
          <h2 className="mt-2 font-display text-xl sm:text-2xl font-extrabold uppercase tracking-[0.08em] text-foreground break-words leading-tight">
            {t('conflicts.hotNow')}
          </h2>
        </div>
        <div className="text-left sm:text-right text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {t('conflicts.window')}
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        {t('conflicts.description')}
      </p>

      <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1 pb-4">
        <div className="space-y-3">
        {conflicts.map((conflict, index) => {
          const isSelected = selectedConflict?.event_id === conflict.event_id;
          const trend = trendMeta(conflict.trend, t);
          const TrendIcon = trend.icon;

          return (
            <button
              key={conflict.event_id}
              type="button"
              onClick={() => onSelectConflict(conflict)}
              className={`w-full text-left border p-3 sm:p-4 transition-colors ${
                isSelected
                  ? 'border-primary bg-primary/8'
                  : 'border-border/60 bg-background/35 hover:border-primary/45 hover:bg-primary/5'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    #{index + 1} • {severityLabel(conflict.severity, t)}
                  </div>
                  <div className="mt-1 text-sm sm:text-base font-semibold text-foreground break-words">
                    {conflict.location}, {conflict.country}
                  </div>
                </div>
                <div className="flex items-start justify-between gap-2 sm:justify-end">
                  {conflict.article_url && (
                    <a
                      href={conflict.article_url}
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
                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{t('conflicts.score')}</div>
                    <div className="mt-1 font-display text-xl sm:text-2xl font-extrabold text-primary">
                      {Math.round(conflict.activity_score || 0)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <span className={`inline-flex items-center gap-1 ${trend.className}`}>
                  <TrendIcon className="h-3.5 w-3.5" />
                  {trend.label}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  {t('conflicts.updated')} {relativeHours(conflict.last_seen_at || conflict.event_date, countryCode)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Newspaper className="h-3.5 w-3.5" />
                  {conflict.article_count || 1} {t('conflicts.newsSignal')}
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-muted-foreground break-words">
                {conflict.description || conflict.summary}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-primary" />
                  {t('conflicts.articles')}: {conflict.article_count || 1}
                </span>
                {conflict.fatalities > 0 && <span>{t('conflicts.victims')}: {conflict.fatalities}</span>}
              </div>
            </button>
          );
        })}

        {conflicts.length === 0 && (
          <div className="border border-border/60 bg-background/35 p-4 text-sm leading-6 text-muted-foreground">
            {t('conflicts.empty')}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
