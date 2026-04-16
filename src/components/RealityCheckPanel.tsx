import { useState } from 'react';
import { AlertCircle, CheckCircle2, LoaderCircle, ShieldQuestion, TriangleAlert, XCircle } from 'lucide-react';
import { requestFactCheck, type FactCheckResult, type FactCheckVerdict } from '@/lib/fact-check';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';

const verdictStyles: Record<FactCheckVerdict, { label: string; tone: string; icon: typeof CheckCircle2 }> = {
  TRUE: {
    label: 'TRUE',
    tone: 'text-emerald-400',
    icon: CheckCircle2,
  },
  FALSE: {
    label: 'FALSE',
    tone: 'text-red-400',
    icon: XCircle,
  },
  MISLEADING: {
    label: 'MISLEADING',
    tone: 'text-amber-300',
    icon: TriangleAlert,
  },
  UNVERIFIABLE: {
    label: 'UNVERIFIABLE',
    tone: 'text-zinc-400',
    icon: ShieldQuestion,
  },
};

const starterExamples = [
  'Az Európai Unió teljes olajembargót vezetett be Magyarország ellen.',
  'A headline szerint egy ország kilépett a NATO-ból.',
  'Az állítás szerint az infláció egyik napról a másikra nullára esett.',
  'https://example.com/suspicious-headline',
];

export default function RealityCheckPanel() {
  const [claim, setClaim] = useState('');
  const [result, setResult] = useState<FactCheckResult | null>(null);
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  async function handleCheck() {
    const trimmed = claim.trim();
    if (!trimmed || isChecking) return;

    setIsChecking(true);
    setError('');

    try {
      const nextResult = await requestFactCheck(trimmed);
      setResult(nextResult);
    } catch (nextError) {
      setResult(null);
      setError(nextError instanceof Error ? nextError.message : 'Ismeretlen hiba történt az ellenőrzés közben.');
    } finally {
      setIsChecking(false);
    }
  }

  const verdictMeta = result ? verdictStyles[result.verdict] : null;
  const VerdictIcon = verdictMeta?.icon;

  return (
    <section className="mx-auto max-w-5xl">
      <div className="border border-[#333333] bg-[#111111]/95 shadow-[0_2px_8px_rgba(0,0,0,0.18)]">
        <div className="border-b border-[#333333] px-6 py-6 sm:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#C8243C]">
            Valosag Ellenor
          </p>
          <h2 className="mt-3 font-display text-3xl font-extrabold uppercase tracking-[0.08em] text-[#F2EDE4] sm:text-4xl">
            Valosag Ellenor
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#F2EDE4]/72 sm:text-base">
            Illessz be egy hircimet, allitast, teljes bejegyzes-szoveget vagy egy cikk linkjet, es a rendszer a
            kulso forrasok mellett a megadott oldal tartalmat is megprobalja elemezni.
          </p>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-b border-[#333333] p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#F2EDE4]/60">
              Allitas, cim vagy cikklink
            </label>
            <Textarea
              value={claim}
              onChange={(event) => setClaim(event.target.value)}
              placeholder="Peldául: A headline szerint az EU betiltotta az orosz gazimportot minden tagallamban. Vagy illessz be egy teljes cikklinket."
              className="mt-4 min-h-[260px] rounded-none border-[#333333] bg-[#151515] px-5 py-4 text-base leading-7 text-[#F2EDE4] placeholder:text-[#F2EDE4]/32 focus-visible:ring-0"
            />

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                onClick={() => void handleCheck()}
                disabled={isChecking || !claim.trim()}
                className="rounded-none bg-[#C8243C] px-6 text-xs font-bold uppercase tracking-[0.24em] text-[#F2EDE4] hover:bg-[#a61d31]"
              >
                {isChecking ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Ellenorzes...
                  </>
                ) : (
                  'Ellenorzes'
                )}
              </Button>

              <p className="text-xs uppercase tracking-[0.18em] text-[#F2EDE4]/45">
                Linkelemzes + forrasok + AI itelet + manipulacios mintak
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {starterExamples.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setClaim(example)}
                  className="border border-[#333333] bg-[#171717] px-3 py-2 text-left text-xs text-[#F2EDE4]/72 transition-colors hover:border-[#C8243C]/50 hover:text-[#F2EDE4]"
                >
                  {example}
                </button>
              ))}
            </div>

            {error && (
              <div className="mt-6 flex items-start gap-3 border border-red-500/30 bg-red-500/8 px-4 py-3 text-sm text-red-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="p-6 sm:p-8">
            {!result ? (
              <div className="flex h-full min-h-[320px] flex-col justify-between border border-dashed border-[#333333] bg-[#151515] p-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#F2EDE4]/50">
                    Eredmeny
                  </p>
                  <h3 className="mt-3 font-display text-2xl font-extrabold uppercase tracking-[0.08em] text-[#F2EDE4]">
                    Varjuk az ellenorzest
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#F2EDE4]/62">
                    Az itelet, a bizonyossag, a magyarazat, a forrasok es a manipulacios technikak itt jelennek meg.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="border border-[#333333] bg-[#151515] p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#F2EDE4]/50">
                    Itelet
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    {VerdictIcon && <VerdictIcon className={`h-8 w-8 ${verdictMeta?.tone}`} />}
                    <span className={`font-display text-4xl font-extrabold uppercase tracking-[0.08em] ${verdictMeta?.tone}`}>
                      {verdictMeta?.label}
                    </span>
                  </div>
                </div>

                <div className="border border-[#333333] bg-[#151515] p-6">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#F2EDE4]/50">
                      Biztonsag
                    </p>
                    <span className="text-sm font-semibold text-[#F2EDE4]">{Math.round(result.confidence)}%</span>
                  </div>
                  <Progress value={result.confidence} className="mt-4 h-3 rounded-none bg-[#262626]" />
                </div>

                <div className="border border-[#333333] bg-[#151515] p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#F2EDE4]/50">
                    Magyarazat
                  </p>
                  <p className="mt-4 text-sm leading-7 text-[#F2EDE4]/82">
                    {result.explanation || 'Nem erkezett reszletes magyarazat.'}
                  </p>
                </div>

                {result.article_body_analysis && (
                  <div className="border border-[#333333] bg-[#151515] p-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#F2EDE4]/50">
                      Cikk Torzse
                    </p>
                    <p className="mt-4 text-sm leading-7 text-[#F2EDE4]/82">
                      {result.article_body_analysis.summary || 'Nem jott vissza kulon cikkosszefoglalo.'}
                    </p>
                    {result.article_body_analysis.headline_alignment && (
                      <p className="mt-4 text-sm leading-7 text-[#F2EDE4]/72">
                        {result.article_body_analysis.headline_alignment}
                      </p>
                    )}
                    {result.article_body_analysis.key_points.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {result.article_body_analysis.key_points.map((point) => (
                          <Badge
                            key={point}
                            variant="outline"
                            className="rounded-none border-[#F2EDE4]/15 bg-[#F2EDE4]/5 px-3 py-1 text-[#F2EDE4]"
                          >
                            {point}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="border border-[#333333] bg-[#151515] p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#F2EDE4]/50">
                    Headline Pszichologia
                  </p>
                  <div className="mt-4 space-y-3">
                    {result.headline_analysis.length > 0 ? result.headline_analysis.map((item, index) => (
                      <div key={`${item.quote}-${index}`} className="border border-[#333333] bg-[#111111] px-4 py-4">
                        <p className="text-sm font-semibold text-[#F2EDE4]">"{item.quote}"</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[#C8243C]">{item.technique || 'Nyelvi jel'}</p>
                        <p className="mt-2 text-sm leading-6 text-[#F2EDE4]/72">{item.effect}</p>
                        <p className="mt-2 text-sm leading-6 text-[#F2EDE4]/82">{item.judgment}</p>
                      </div>
                    )) : (
                      <p className="text-sm text-[#F2EDE4]/62">Nem jott vissza kulon headline-elemzes.</p>
                    )}
                  </div>
                </div>

                <div className="border border-[#333333] bg-[#151515] p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#F2EDE4]/50">
                    Forrasok
                  </p>
                  <div className="mt-4 space-y-3">
                    {result.sources.length > 0 ? result.sources.map((source) => (
                      <a
                        key={source.url}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block border border-[#333333] bg-[#111111] px-4 py-3 transition-colors hover:border-[#C8243C]/55"
                      >
                        <p className="text-sm font-semibold text-[#F2EDE4]">{source.title}</p>
                        {source.snippet && (
                          <p className="mt-1 text-xs leading-5 text-[#F2EDE4]/62">{source.snippet}</p>
                        )}
                        <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-[#C8243C]">
                          Megnyitas
                        </p>
                      </a>
                    )) : (
                      <p className="text-sm text-[#F2EDE4]/62">Nincs visszaadott forras.</p>
                    )}
                  </div>
                </div>

                <div className="border border-[#333333] bg-[#151515] p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#F2EDE4]/50">
                    Manipulacios technikak
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {result.manipulation_techniques.length > 0 ? result.manipulation_techniques.map((technique) => (
                      <Badge
                        key={technique}
                        variant="outline"
                        className="rounded-none border-[#C8243C]/35 bg-[#C8243C]/10 px-3 py-1 text-[#F2EDE4]"
                      >
                        {technique}
                      </Badge>
                    )) : (
                      <span className="text-sm text-[#F2EDE4]/62">Nem azonosithato eros manipulacios minta.</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
