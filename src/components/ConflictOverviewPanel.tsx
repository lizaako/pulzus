import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, Clock3, Newspaper } from 'lucide-react';
import { Conflict } from '@/lib/supabase';

interface ConflictOverviewPanelProps {
  conflicts: Conflict[];
  selectedConflict: Conflict | null;
  onSelectConflict: (conflict: Conflict) => void;
}

function severityLabel(severity: string) {
  switch (severity?.toLowerCase()) {
    case 'high':
      return 'Sulyos';
    case 'medium':
      return 'Feszuelt';
    default:
      return 'Figyelendo';
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

  if (diffHours < 1) return 'kevesebb mint 1 oraja';
  if (diffHours < 24) return `${diffHours} oraja`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} napja`;
}

export default function ConflictOverviewPanel({
  conflicts,
  selectedConflict,
  onSelectConflict,
}: ConflictOverviewPanelProps) {
  return (
    <div className="glass-panel h-full min-h-[420px] p-5 sm:p-6 overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Aktiv Konfliktzonak</div>
          <h2 className="mt-2 font-display text-2xl font-extrabold uppercase tracking-[0.08em] text-foreground">
            Mi Forr Most
          </h2>
        </div>
        <div className="text-right text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Utolso 72 ora
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        Rangorolt, friss konfliktuszona-lista. A pontszam a frissesseget, az esemenyszamot es a megerosito riportokat suriti egybe.
      </p>

      <div className="mt-6 space-y-3 overflow-y-auto pr-1 max-h-[calc(100%-8.5rem)]">
        {conflicts.map((conflict, index) => {
          const isSelected = selectedConflict?.event_id === conflict.event_id;
          const trend = trendMeta(conflict.trend);
          const TrendIcon = trend.icon;

          return (
            <button
              key={conflict.event_id}
              type="button"
              onClick={() => onSelectConflict(conflict)}
              className={`w-full text-left border p-4 transition-colors ${
                isSelected
                  ? 'border-primary bg-primary/8'
                  : 'border-border/60 bg-background/35 hover:border-primary/45 hover:bg-primary/5'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    #{index + 1} • {severityLabel(conflict.severity)}
                  </div>
                  <div className="mt-1 text-base font-semibold text-foreground">
                    {conflict.location}, {conflict.country}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Pontszam</div>
                  <div className="mt-1 font-display text-2xl font-extrabold text-primary">
                    {Math.round(conflict.activity_score || 0)}
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
                  {(conflict.article_count || 0) + (conflict.report_count || 0)} jel
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {conflict.summary || conflict.description}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-primary" />
                  GDELT: {conflict.article_count || 0}
                </span>
                <span>ReliefWeb: {conflict.report_count || 0}</span>
                {conflict.fatalities > 0 && <span>Aldozat: {conflict.fatalities}</span>}
              </div>
            </button>
          );
        })}

        {conflicts.length === 0 && (
          <div className="border border-border/60 bg-background/35 p-4 text-sm leading-6 text-muted-foreground">
            Jelenleg nincs eleg eros, friss konfliktusjel ahhoz, hogy aktiv zonakent megjelenjen.
          </div>
        )}
      </div>
    </div>
  );
}
