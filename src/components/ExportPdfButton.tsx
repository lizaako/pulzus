import { useState } from 'react';
import { Download, LoaderCircle } from 'lucide-react';
import { Article, Conflict, MarketData } from '@/lib/supabase';
import {
  buildPrintableSummaryHtml,
  filterSummaryData,
  SUMMARY_WINDOWS,
  type SummaryWindowId,
} from '@/lib/pdf-summary';
import { Button } from '@/components/ui/button';
import { useCountry } from '@/lib/country-context';

interface ExportPdfButtonProps {
  articles:   Article[];
  conflicts:  Conflict[];
  marketData: MarketData[];
}

const PERIOD_OPTIONS = SUMMARY_WINDOWS.filter(w => w.id !== '1h'); // 1d | 1w | 1m

export default function ExportPdfButton({ articles, conflicts, marketData }: ExportPdfButtonProps) {
  const [windowId, setWindowId]       = useState<SummaryWindowId>('1d');
  const [isExporting, setIsExporting] = useState(false);
  const { t } = useCountry();

  const selectedWindow = SUMMARY_WINDOWS.find(w => w.id === windowId) ?? SUMMARY_WINDOWS[1];

  async function handleExport() {
    if (typeof window === 'undefined') return;
    setIsExporting(true);

    try {
      const filtered = filterSummaryData(articles, conflicts, marketData, windowId);
      const html = buildPrintableSummaryHtml(
        filtered.articles,
        filtered.conflicts,
        filtered.marketData,
        filtered.selectedWindow.label,
      );

      const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=900');

      if (!printWindow) {
        const blob   = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url    = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href     = url;
        anchor.download = `pulzus-${windowId}-${new Date().toISOString().slice(0, 10)}.html`;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
        return;
      }

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();

      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 800);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex items-center gap-0">
      {/* Period selector — always visible inline */}
      <div className="flex border border-[#333333] border-r-0 h-9">
        {PERIOD_OPTIONS.map((w, i) => (
          <button
            key={w.id}
            type="button"
            onClick={() => setWindowId(w.id)}
            disabled={isExporting}
            className="px-2.5 text-[9px] font-bold uppercase tracking-[0.14em] transition-colors disabled:opacity-50"
            style={{
              background:  w.id === windowId ? 'var(--country-accent)' : 'transparent',
              color:       w.id === windowId ? '#F2EDE4' : 'rgba(242,237,228,0.55)',
              borderRight: i < PERIOD_OPTIONS.length - 1 ? '1px solid #333' : 'none',
            }}
          >
            {w.shortLabel}
          </button>
        ))}
      </div>

      {/* Export button */}
      <Button
        type="button"
        onClick={() => void handleExport()}
        disabled={isExporting}
        variant="outline"
        className="rounded-none border-[#333333] bg-transparent px-3 text-[10px] uppercase tracking-[0.18em] text-[#F2EDE4] hover:bg-[#171717] hover:text-[#F2EDE4] sm:text-[11px] gap-1.5 h-9"
      >
        {isExporting
          ? <LoaderCircle className="h-3 w-3 animate-spin" />
          : <Download className="h-3 w-3" />}
        {t('export.pdf')}
      </Button>
    </div>
  );
}
