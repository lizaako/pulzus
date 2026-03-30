import { Globe2, Newspaper, TrendingUp } from 'lucide-react';

export type View = 'globe' | 'news' | 'markets';

interface NavigationProps {
  current: View;
  onChange: (v: View) => void;
}

const items: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: 'globe', label: 'GLOBE', icon: <Globe2 className="w-4 h-4" /> },
  { id: 'news', label: 'NEWS', icon: <Newspaper className="w-4 h-4" /> },
  { id: 'markets', label: 'MARKETS', icon: <TrendingUp className="w-4 h-4" /> },
];

export default function Navigation({ current, onChange }: NavigationProps) {
  return (
    <nav className="glass-panel px-1 py-1 flex items-center gap-1">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-display font-semibold tracking-wider transition-all duration-300
            ${current === item.id
              ? 'bg-primary/20 text-primary glow-border'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
            }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </nav>
  );
}
