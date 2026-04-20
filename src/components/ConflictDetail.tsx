import { Conflict } from '@/lib/supabase';
import { X, MapPin, AlertTriangle, Calendar, Users, Clock3, Newspaper, ExternalLink } from 'lucide-react';
import { useCountry } from '@/lib/country-context';

interface ConflictDetailProps {
  conflict: Conflict;
  onClose: () => void;
}

export default function ConflictDetail({ conflict, onClose }: ConflictDetailProps) {
  const { t, countryCode, formatDate } = useCountry();
  const severityStyles: Record<string, string> = {
    high: 'text-destructive border-destructive/50 bg-destructive/10',
    medium: 'text-warning border-warning/50 bg-warning/10',
    low: 'text-success border-success/50 bg-success/10',
  };
  const style = severityStyles[conflict.severity?.toLowerCase()] || severityStyles.low;
  const displayEventType =
    (conflict.event_type || '').toLowerCase().includes('hotspot')
      ? (countryCode === 'hu' ? 'Fegyveres konfliktus' : countryCode === 'de' ? 'Bewaffneter Konflikt' : countryCode === 'es' ? 'Conflicto armado' : countryCode === 'fr' ? 'Conflit armé' : countryCode === 'fi' ? 'Aseellinen konflikti' : countryCode === 'nl' ? 'Gewapend conflict' : 'Armed conflict')
      : conflict.event_type;
  const detailText = conflict.description || conflict.summary || (countryCode === 'hu' ? 'Nincs elérhető részletes leírás.' : countryCode === 'de' ? 'Keine ausführliche Beschreibung verfügbar.' : countryCode === 'es' ? 'No hay descripción detallada disponible.' : countryCode === 'fr' ? 'Aucune description détaillée disponible.' : countryCode === 'fi' ? 'Tarkempaa kuvausta ei ole saatavilla.' : countryCode === 'nl' ? 'Geen uitgebreide beschrijving beschikbaar.' : 'No detailed description available.');

  return (
    <div className="glass-panel max-h-[min(75vh,36rem)] overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-5 sm:space-y-6 animate-fade-in-up">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 font-display text-lg sm:text-xl font-extrabold text-foreground uppercase tracking-[0.08em] break-words leading-tight">
          {displayEventType}
        </h3>
        <div className="flex items-center gap-2 shrink-0">
          {conflict.article_url && (
            <a
              href={conflict.article_url}
              target="_blank"
              rel="noreferrer"
              aria-label={t('news.original')}
              title={t('news.original')}
              className="inline-flex h-8 w-8 items-center justify-center border border-border/70 bg-background/60 text-accent transition-colors hover:border-primary/45 hover:text-[#A01E30]"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors uppercase tracking-[0.18em] text-[10px]">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="neon-line" />

      <div className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] border ${style}`}>
        <AlertTriangle className="w-3 h-3" />
        {countryCode === 'hu' ? 'Kockázati szint' : countryCode === 'de' ? 'Risikostufe' : countryCode === 'es' ? 'Nivel de riesgo' : countryCode === 'fr' ? 'Niveau de risque' : countryCode === 'fi' ? 'Riskitaso' : countryCode === 'nl' ? 'Risiconiveau' : 'Risk level'}
      </div>

      <div className="space-y-2.5 text-sm">
        <div className="flex items-start gap-2 text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="min-w-0 break-words">{conflict.location}, <span className="text-foreground font-medium break-words">{conflict.country}</span></span>
        </div>
        <div className="flex items-start gap-2 text-muted-foreground">
          <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span>{formatDate(conflict.event_date, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
        </div>
        {conflict.last_seen_at && (
          <div className="flex items-start gap-2 text-muted-foreground">
            <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="break-words">{t('conflicts.updated')}: {formatDate(conflict.last_seen_at, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}
        {conflict.fatalities > 0 && (
          <div className="flex items-start gap-2 text-destructive">
            <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{conflict.fatalities} {t('conflicts.victims').toLowerCase()}</span>
          </div>
        )}
        {(conflict.article_count || 0) > 0 && (
          <div className="flex items-start gap-2 text-muted-foreground">
            <Newspaper className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{conflict.article_count || 0} {countryCode === 'hu' ? 'kapcsolódó cikk alapján' : countryCode === 'de' ? 'bezogene Artikel' : countryCode === 'es' ? 'artículos relacionados' : countryCode === 'fr' ? 'articles liés' : countryCode === 'fi' ? 'liittyvää artikkelia' : countryCode === 'nl' ? 'gerelateerde artikelen' : 'related articles'}</span>
          </div>
        )}
      </div>

      <p className="max-w-full break-words text-sm sm:text-[15px] text-muted-foreground leading-[1.6]">
        {detailText}
      </p>

      <div className="text-xs text-muted-foreground/60 break-words">
        {(countryCode === 'hu' ? 'Forrás' : countryCode === 'de' ? 'Quelle' : countryCode === 'es' ? 'Fuente' : countryCode === 'fr' ? 'Source' : countryCode === 'fi' ? 'Lähde' : countryCode === 'nl' ? 'Bron' : 'Source')}: {conflict.source}
      </div>
    </div>
  );
}
