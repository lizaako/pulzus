import { Conflict } from '@/lib/supabase';
import { Clock3, MapPin } from 'lucide-react';

interface ConflictHistoryPanelProps {
  conflicts: Conflict[];
  onSelectConflict: (conflict: Conflict) => void;
}

export default function ConflictHistoryPanel({ conflicts, onSelectConflict }: ConflictHistoryPanelProps) {
  return (
    <div className="h-full min-h-0 border-[3px] border-[#333333] bg-[#111111] text-[#F2EDE4]">
      <div className="px-4 py-3 border-b border-[#333333]">
        <h3 className="font-display text-sm font-bold uppercase tracking-[0.16em]">Konfliktus elozmenyek</h3>
        <p className="text-[11px] text-[#F2EDE4]/70 mt-1">Elmult 30 nap, de nem live esemenyek</p>
      </div>

      <div className="h-[260px] xl:h-[40%] overflow-y-auto">
        {conflicts.length === 0 ? (
          <div className="p-4 text-sm text-[#F2EDE4]/60">Nincs megjelenitheto elozmeny.</div>
        ) : (
          <ul className="divide-y divide-[#333333]">
            {conflicts.map((conflict) => (
              <li key={conflict.event_id}>
                <button
                  type="button"
                  onClick={() => onSelectConflict(conflict)}
                  className="w-full text-left px-4 py-3 hover:bg-[#1A1A1A] transition-colors"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#F2EDE4]">
                    {conflict.event_type}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-[#F2EDE4]/70">
                    <MapPin className="w-3 h-3" />
                    <span>{conflict.location}, {conflict.country}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-[#F2EDE4]/55">
                    <Clock3 className="w-3 h-3" />
                    <span>{new Date(conflict.event_date).toLocaleString('hu-HU')}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
