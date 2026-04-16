import { useMemo, useState } from 'react';
import { Download, FileText, LoaderCircle } from 'lucide-react';
import { Article, Conflict, MarketData } from '@/lib/supabase';
import {
  buildPrintableSummaryHtml,
  buildSummaryDocument,
  filterSummaryData,
  SUMMARY_WINDOWS,
  type SummaryWindowId,
} from '@/lib/pdf-summary';
import { Button } from '@/components/ui/button';

interface PdfSummaryPanelProps {
  articles: Article[];
  conflicts: Conflict[];
  marketData: MarketData[];
}

export default function PdfSummaryPanel({ articles, conflicts, marketData }: PdfSummaryPanelProps) {
  const [windowId, setWindowId] = useState<SummaryWindowId>('1d');
  const [isExporting, setIsExporting] = useState(false);

  const filtered = useMemo(
    () => filterSummaryData(articles, conflicts, marketData, windowId),
    [articles, conflicts, marketData, windowId],
  );

  const previewStats = useMemo(() => ([
    `${filtered.articles.length} articles`,
    `${filtered.conflicts.length} conflict points`,
    `${filtered.marketData.length} market entries`,
  ]), [filtered]);

  async function handleExport() {
    if (typeof window === 'undefined') return;

    setIsExporting(true);

    try {
      const summary = buildSummaryDocument(
        filtered.articles,
        filtered.conflicts,
        filtered.marketData,
        filtered.selectedWindow.label,
      );
      const html = buildPrintableSummaryHtml(summary);
      const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=900');

      if (!printWindow) {
        throw new Error('The browser blocked the export window. Please allow pop-ups for this page.');
      }

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();

      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section className="border border-[#7B1E29] bg-[linear-gradient(135deg,rgba(200,36,60,0.16),rgba(16,16,16,0.96)_48%,rgba(9,9,9,0.98))] shadow-[0_2px_8px_rgba(0,0,0,0.18),0_0_0_1px_rgba(123,30,41,0.18)]">
      <div className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-[#C44B5D]/50 bg-[#130F11] text-[#F4D9CF]">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#F0B9AE]">
                PDF Summary
              </p>
              <h2 className="mt-1 font-display text-2xl font-extrabold uppercase tracking-[0.08em] text-[#F2EDE4]">
                Executive Brief Export
              </h2>
            </div>
          </div>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-[#F2EDE4]/74">
            Build a clean PDF-ready briefing from the main dashboard data. The export includes world news,
            conflicts, markets, science and tech, culture, opinion, and Hungary-focused highlights for the selected period.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {SUMMARY_WINDOWS.map((option) => {
              const active = option.id === windowId;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setWindowId(option.id)}
                  className={`border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors ${
                    active
                      ? 'border-[#F0B9AE] bg-[#F0B9AE] text-[#16110F]'
                      : 'border-[#5B3036] bg-[#151112] text-[#F2EDE4]/76 hover:border-[#C44B5D] hover:text-[#F2EDE4]'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-[280px] border border-[#392225] bg-[#120F10]/92 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#F0B9AE]">
            Export scope
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {previewStats.map((stat) => (
              <span
                key={stat}
                className="border border-[#4B3638] bg-[#1A1617] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[#F2EDE4]/70"
              >
                {stat}
              </span>
            ))}
          </div>
          <Button
            type="button"
            onClick={() => void handleExport()}
            disabled={isExporting}
            className="mt-4 w-full rounded-none bg-[#C8243C] text-xs font-bold uppercase tracking-[0.22em] text-[#F7EFE6] hover:bg-[#a81f34]"
          >
            {isExporting ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Preparing export...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </>
            )}
          </Button>
          <p className="mt-3 text-xs leading-5 text-[#F2EDE4]/56">
            The export opens a print-ready window so you can save it as PDF with the browser's built-in PDF printer.
          </p>
        </div>
      </div>
    </section>
  );
}
