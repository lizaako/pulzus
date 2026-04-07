import { Conflict } from '@/lib/supabase';
import { X, MapPin, AlertTriangle, Calendar, Users } from 'lucide-react';

interface ConflictDetailProps {
  conflict: Conflict;
  onClose: () => void;
}

export default function ConflictDetail({ conflict, onClose }: ConflictDetailProps) {
  const severityStyles: Record<string, string> = {
    high: 'text-destructive border-destructive/50 bg-destructive/10',
    medium: 'text-warning border-warning/50 bg-warning/10',
    low: 'text-success border-success/50 bg-success/10',
  };
  const style = severityStyles[conflict.severity?.toLowerCase()] || severityStyles.low;
  const displayEventType =
    (conflict.event_type || '').toLowerCase().includes('hotspot')
      ? 'Fegyveres konfliktus'
      : conflict.event_type;

  return (
    <div className="glass-panel p-6 space-y-6 animate-fade-in-up">
      <div className="flex items-start justify-between">
        <h3 className="font-display text-xl font-extrabold text-foreground uppercase tracking-[0.08em]">
          {displayEventType}
        </h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors uppercase tracking-[0.18em] text-[10px]">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="neon-line" />

      <div className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] border ${style}`}>
        <AlertTriangle className="w-3 h-3" />
        Kockázati szint
      </div>

      <div className="space-y-2.5 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <span>{conflict.location}, <span className="text-foreground font-medium">{conflict.country}</span></span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span>{new Date(conflict.event_date).toLocaleDateString()}</span>
        </div>
        {conflict.fatalities > 0 && (
          <div className="flex items-center gap-2 text-destructive">
            <Users className="w-3.5 h-3.5" />
            <span>{conflict.fatalities} áldozat</span>
          </div>
        )}
      </div>

      <p className="text-[15px] text-muted-foreground leading-[1.6]">{conflict.description}</p>

      <div className="text-xs text-muted-foreground/60">
        Forrás: {conflict.source}
      </div>
    </div>
  );
}
