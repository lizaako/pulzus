import { Article } from '@/lib/supabase';

interface MarketTickerProps {
  articles: Article[];
}

function severityColor(level: string) {
  switch (level?.toLowerCase()) {
    case 'high': return '#C8243C';
    case 'medium': return '#D97B00';
    case 'low': return '#2E7D4F';
    default: return '#5C5750';
  }
}

export default function MarketTicker({ articles }: MarketTickerProps) {
  const items = (articles || []).slice(0, 20);
  const truncate = (text: string, max: number) => {
    if (!text) return '';
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
  };
  const tickerItems = [...items, ...items];

  return (
    <div className="overflow-hidden border border-border bg-[#101010] shadow-[0_2px_8px_rgba(0,0,0,0.24)] rounded-[10px]">
      <div className="h-12 flex items-stretch gap-0">
        <div className="px-4 flex items-center bg-[#C8243C] text-[#F2EDE4] text-[11px] uppercase tracking-[0.22em] font-display font-bold rounded-l-[10px]">
          Friss hírek
        </div>
        <div className="relative flex-1 overflow-hidden bg-[#141414] rounded-r-[10px]">
          <div className="ticker-track">
            {tickerItems.map((article, index) => (
              <a
                key={`${article.id}-${index}`}
                className="ticker-item"
                href={article.url || undefined}
                target="_blank"
                rel="noreferrer"
              >
                <span
                  className="inline-block w-2 h-2 mr-3 align-middle"
                  style={{ backgroundColor: severityColor(article.warning_level) }}
                />
                <span className="text-[12px] text-[#f3f2ef] font-medium whitespace-nowrap">
                  {truncate(article.title, 46)}
                </span>
                <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground ml-3 whitespace-nowrap">
                  {article.source}
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
