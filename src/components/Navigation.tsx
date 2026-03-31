export type View = 'globe' | 'markets' | 'media';

interface NavigationProps {
  current: View;
  onChange: (v: View) => void;
}

const items: { id: View; label: string }[] = [
  { id: 'globe', label: 'ÁTTEKINTÉS' },
  { id: 'markets', label: 'PIACOK' },
  { id: 'media', label: 'MEDIA LENS' },
];

export default function Navigation({ current, onChange }: NavigationProps) {
  return (
    <nav className="flex flex-wrap items-stretch gap-3 sm:gap-6">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`min-h-9 flex items-center gap-2 px-1 border-b-2 text-[11px] sm:text-[12px] font-display font-bold uppercase tracking-[0.18em] sm:tracking-[0.22em] transition-colors
            ${current === item.id
              ? 'border-[#C8243C] text-[#F2EDE4]'
              : 'border-transparent text-[#F2EDE4]/72 hover:text-[#F2EDE4]'
            }`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
