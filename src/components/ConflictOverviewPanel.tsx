import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, Clock3, ExternalLink, Newspaper } from 'lucide-react';
import { Conflict } from '@/lib/supabase';

interface ConflictOverviewPanelProps {
  conflicts: Conflict[];
  selectedConflict: Conflict | null;
  onSelectConflict: (conflict: Conflict) => void;
}

function severityLabel(severity: string) {
  switch (severity?.toLowerCase()) {
    case 'high':
      return 'Súlyos';
    case 'medium':
      return 'Feszült';
    default:
      return 'Figyelendő';
  }
}

function trendMeta(trend?: Conflict['trend']) {
  switch (trend) {
    case 'rising':
      return {
        label: 'Emelkedik',
        icon: ArrowUpRight,
        className: 'text-destructive',
      };
    case 'cooling':
      return {
        label: 'Lassul',
        icon: ArrowDownRight,
        className: 'text-success',
      };
    default:
      return {
        label: 'Stabil',
        icon: ArrowRight,
        className: 'text-warning',
      };
  }
}

function relativeHours(date?: string) {
  if (!date) return 'ismeretlen';

  const diffMs = Date.now() - new Date(date).getTime();
  const diffHours = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));

  if (diffHours < 1) return 'kevesebb mint 1 órája';
  if (diffHours < 24) return `${diffHours} órája`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} napja`;
}

export default function ConflictOverviewPanel({
  conflicts,
  selectedConflict,
  onSelectConflict,
}: ConflictOverviewPanelProps) {
  return (
    <div className="glass-panel h-full min-h-[420px] p-4 sm:p-6 overflow-hidden flex flex-col">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground break-words">Aktív Konfliktuszónák</div>
          <h2 className="mt-2 font-display text-xl sm:text-2xl font-extrabold uppercase tracking-[0.08em] text-foreground break-words leading-tight">
            Mi Forr Most
          </h2>
        </div>
        <div className="text-left sm:text-right text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Utolsó 72 óra
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        Rangsorolt, friss konfliktuszóna-lista. A pontszám a frissességet és a konfliktusos hírjelek erősségét sűríti egybe.
      </p>

      <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1 pb-4">
        <div className="space-y-3">
        {conflicts.map((conflict, index) => {
          const isSelected = selectedConflict?.event_id === conflict.event_id;
          const trend = trendMeta(conflict.trend);
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
                    #{index + 1} • {severityLabel(conflict.severity)}
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
                      aria-label="Eredeti cikk megnyitasa"
                      title="Eredeti cikk megnyitasa"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center border border-border/70 bg-background/60 text-accent transition-colors hover:border-primary/45 hover:text-[#A01E30]"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Pontszam</div>
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
                  Frissitve {relativeHours(conflict.last_seen_at || conflict.event_date)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Newspaper className="h-3.5 w-3.5" />
                  {conflict.article_count || 1} hírjel
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-muted-foreground break-words">
                {conflict.description || conflict.summary}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-primary" />
                  Cikkek: {conflict.article_count || 1}
                </span>
                {conflict.fatalities > 0 && <span>Áldozat: {conflict.fatalities}</span>}
              </div>
            </button>
          );
        })}

        {conflicts.length === 0 && (
          <div className="border border-border/60 bg-background/35 p-4 text-sm leading-6 text-muted-foreground">
            Jelenleg nincs elég erős, friss konfliktusjel ahhoz, hogy aktív zónaként megjelenjen.
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
