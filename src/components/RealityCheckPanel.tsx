import { useMemo, useState, type CSSProperties } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Info,
  ShieldQuestion,
  ThumbsDown,
  ThumbsUp,
  TriangleAlert,
  XCircle,
} from 'lucide-react';
import { checkFact, type EmotionalTarget, type FactCheckResult, type FactCheckSource, type Stance, type Verdict } from '@/lib/fact-check';
import { MOCK_ANALYSES } from '@/lib/pulzus-mock-analyses';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { adaptCountryReference, replaceWithMap, useCountry, type CountryCode } from '@/lib/country-context';

const DEMO_LINKS = Object.keys(MOCK_ANALYSES);
const ANALYSIS_DELAY_MS = import.meta.env.MODE === 'test' ? 0 : 6000;

const verdictStyles: Record<Verdict, { label: string; tone: string; badge: string; icon: typeof CheckCircle2 }> = {
  IGAZOLT: {
    label: 'IGAZOLT',
    tone: 'text-emerald-300',
    badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    icon: CheckCircle2,
  },
  TORZÍTOTT: {
    label: 'TORZÍTOTT',
    tone: 'text-amber-200',
    badge: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
    icon: TriangleAlert,
  },
  CÁFOLT: {
    label: 'CÁFOLT',
    tone: 'text-red-300',
    badge: 'border-red-500/30 bg-red-500/10 text-red-200',
    icon: XCircle,
  },
};

function scoreTone(score: number) {
  if (score >= 70) return 'text-emerald-300';
  if (score >= 40) return 'text-amber-200';
  return 'text-red-300';
}

function scoreBadge(score: number) {
  if (score >= 70) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  if (score >= 40) return 'border-amber-400/30 bg-amber-400/10 text-amber-100';
  return 'border-red-500/30 bg-red-500/10 text-red-200';
}

function progressTone(score: number) {
  if (score <= 30) return '[&>div]:bg-emerald-500';
  if (score <= 60) return '[&>div]:bg-amber-400';
  return '[&>div]:bg-red-500';
}

function emotionalTone(target: EmotionalTarget) {
  if (target === 'félelem') return 'border-red-500/30 bg-red-500/10 text-red-200';
  if (target === 'harag') return 'border-orange-500/30 bg-orange-500/10 text-orange-200';
  if (target === 'bizonytalanság') return 'border-amber-400/30 bg-amber-400/10 text-amber-100';
  if (target === 'megvetés') return 'border-zinc-500/30 bg-zinc-500/10 text-zinc-200';
  return 'border-sky-500/30 bg-sky-500/10 text-sky-200';
}

function stanceTone(stance: Stance) {
  if (stance === 'SUPPORTS') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  if (stance === 'CONTRADICTS') return 'border-red-500/30 bg-red-500/10 text-red-200';
  if (stance === 'MIXED') return 'border-amber-400/30 bg-amber-400/10 text-amber-100';
  return 'border-zinc-500/30 bg-zinc-500/10 text-zinc-200';
}

function stanceLabel(stance: Stance) {
  if (stance === 'SUPPORTS') return 'Alátámasztja';
  if (stance === 'CONTRADICTS') return 'Ellentmond';
  if (stance === 'MIXED') return 'Vegyes';
  return 'Nem releváns';
}

function manipulationLabel(score: number) {
  if (score <= 29) return { label: 'Nem manipulatív', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' };
  if (score <= 59) return { label: 'Részben manipulatív', className: 'border-amber-400/30 bg-amber-400/10 text-amber-100' };
  return { label: 'Erősen manipulatív', className: 'border-red-500/30 bg-red-500/10 text-red-200' };
}

function coordinationTone(level: FactCheckResult['narrative_chain']['coordination_level']) {
  if (level === 'Koordinált terjesztés') return 'border-red-500/30 bg-red-500/10 text-red-200';
  if (level === 'Párhuzamos megjelenés') return 'border-amber-400/30 bg-amber-400/10 text-amber-100';
  return 'border-zinc-500/30 bg-zinc-500/10 text-zinc-200';
}

function domainFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function translateBias(value: string, countryCode: CountryCode) {
  const translations: Record<string, Record<CountryCode, string>> = {
    'extreme-right-government': { hu: 'szélsőjobboldali, kormányközeli', de: 'rechtsextrem, regierungsnah', es: 'extrema derecha, progubernamental', fr: 'extrême droite, proche du gouvernement', us: 'far-right, pro-government', fi: 'äärioikeistolainen, hallitusmyönteinen', nl: 'extreemrechts, pro-regering' },
    'extreme-right-pro-government': { hu: 'szélsőjobboldali, kormánypárti', de: 'rechtsextrem, regierungsfreundlich', es: 'extrema derecha, afín al gobierno', fr: 'extrême droite, pro-gouvernement', us: 'far-right, pro-government', fi: 'äärioikeistolainen, hallitusmyönteinen', nl: 'extreemrechts, regeringsgezind' },
    'neutral-encyclopedic': { hu: 'semleges, enciklopédikus', de: 'neutral, enzyklopädisch', es: 'neutral, enciclopédico', fr: 'neutre, encyclopédique', us: 'neutral, encyclopedic', fi: 'neutraali, tietosanakirjamainen', nl: 'neutraal, encyclopedisch' },
    'center-left-environmental': { hu: 'bal-közép, zöld', de: 'Mitte-links, ökologisch', es: 'centroizquierda, verde', fr: 'centre-gauche, écologiste', us: 'center-left, green', fi: 'keskivasemmisto, vihreä', nl: 'centrumlinks, groen' },
    'neutral-international': { hu: 'semleges, nemzetközi', de: 'neutral, international', es: 'neutral, internacional', fr: 'neutre, international', us: 'neutral, international', fi: 'neutraali, kansainvälinen', nl: 'neutraal, internationaal' },
    'center-left': { hu: 'bal-közép', de: 'Mitte-links', es: 'centroizquierda', fr: 'centre-gauche', us: 'center-left', fi: 'keskivasemmisto', nl: 'centrumlinks' },
    'neutral-official': { hu: 'semleges, hivatalos', de: 'neutral, offiziell', es: 'neutral, oficial', fr: 'neutre, officiel', us: 'neutral, official', fi: 'neutraali, virallinen', nl: 'neutraal, officieel' },
    'neutral-eu-regulatory': { hu: 'semleges, uniós szabályozói', de: 'neutral, EU-regulatorisch', es: 'neutral, regulatorio de la UE', fr: 'neutre, réglementaire UE', us: 'neutral, EU regulatory', fi: 'neutraali, EU-sääntely', nl: 'neutraal, EU-regulatoir' },
    'center-economic': { hu: 'gazdasági, középre húzó', de: 'wirtschaftlich, zentristisch', es: 'económico, centrista', fr: 'économique, centriste', us: 'economic, centrist', fi: 'talouspainotteinen, keskustalainen', nl: 'economisch, centristisch' },
  };

  return translations[value]?.[countryCode] || value;
}

function translateInlineText(value: string, countryCode: CountryCode) {
  const replacements: Record<CountryCode, Record<string, string>> = {
    hu: {
      'False equivalence': 'Hamis megfeleltetés',
      'Fear appeal': 'Félelemkeltés',
      'Out-group threat': 'Külső csoport fenyegetésként bemutatása',
      'Manufactured conspiracy': 'Gyártott összeesküvés',
      'Unverified claim as fact': 'Ellenőrizetlen állítás tényként kezelve',
      'Authority appeal': 'Tekintélyre hivatkozás',
      'False cause': 'Hamis ok-okozat',
      'Catastrophizing': 'Katasztrófa-keretezés',
      'False dichotomy': 'Hamis választási kényszer',
      'Selective quoting': 'Kiragadott idézés',
      'Context stripping': 'Kontextus eltávolítása',
      'Selective worst-case': 'Legrosszabb eset kiragadása',
      'False precision': 'Álpontosság',
      'Anchoring': 'Lehorgonyzás',
      'Fear of economic collapse': 'Gazdasági összeomlástól való félelem',
      'Us vs. Them': 'Mi kontra ők keretezés',
      'Ridicule': 'Gúny',
      'Hyperbole': 'Túlzás',
      'Discrediting by association': 'Hiteltelenítés társítással',
      'Scare quotes': 'Sugalló idézőjelek',
      'Selective quote as proof of conspiracy': 'Kiragadott idézet összeesküvés-bizonyítékként',
      'Confirmation bias exploitation': 'Megerősítési torzítás kihasználása',
      'False revelation framing': 'Álleleplező keretezés',
      'Data-driven conclusion': 'Adatalapú következtetés',
      'Honest uncertainty communication': 'Őszinte bizonytalanságkommunikáció',
      'No dominant technique': 'Nincs domináns technika',
      'Titok + fenyegetés + bizonyosság látszata': 'Titok + fenyegetés + a bizonyosság látszata',
      'Existential threat framing': 'Egzisztenciális fenyegetés keretezése',
      'Worst-case-as-norm framing': 'A legrosszabb eset normaként bemutatva',
      'Call to action': 'Cselekvésre felszólítás',
      'Data-driven surprise': 'Adatalapú meglepetés',
    },
    de: { 'False equivalence': 'Falsche Gleichsetzung', 'Fear appeal': 'Angstappell', 'Out-group threat': 'Bedrohung durch Fremdgruppe', 'Manufactured conspiracy': 'Konstruierte Verschwörung', 'Authority appeal': 'Berufung auf Autorität', 'False cause': 'Falsche Kausalität', 'Data-driven conclusion': 'Datengestützte Schlussfolgerung', 'No dominant technique': 'Keine dominante Technik' },
    es: { 'False equivalence': 'Falsa equivalencia', 'Fear appeal': 'Apelación al miedo', 'Out-group threat': 'Amenaza del grupo externo', 'Manufactured conspiracy': 'Conspiración fabricada', 'Authority appeal': 'Apelación a la autoridad', 'False cause': 'Falsa causalidad', 'Data-driven conclusion': 'Conclusión basada en datos', 'No dominant technique': 'Sin técnica dominante' },
    fr: { 'False equivalence': 'Fausse équivalence', 'Fear appeal': 'Appel à la peur', 'Out-group threat': 'Menace du groupe extérieur', 'Manufactured conspiracy': 'Complot fabriqué', 'Authority appeal': 'Appel à l’autorité', 'False cause': 'Fausse causalité', 'Data-driven conclusion': 'Conclusion fondée sur les données', 'No dominant technique': 'Aucune technique dominante' },
    us: { 'False equivalence': 'False equivalence', 'Fear appeal': 'Fear appeal', 'Out-group threat': 'Out-group threat', 'Manufactured conspiracy': 'Manufactured conspiracy', 'Authority appeal': 'Authority appeal', 'False cause': 'False cause', 'Data-driven conclusion': 'Data-driven conclusion', 'No dominant technique': 'No dominant technique' },
    fi: { 'False equivalence': 'Virheellinen rinnastus', 'Fear appeal': 'Pelkoon vetoaminen', 'Out-group threat': 'Ulkoryhmän uhka', 'Manufactured conspiracy': 'Rakennettu salaliitto', 'Authority appeal': 'Auktoriteettiin vetoaminen', 'False cause': 'Virheellinen syy-seuraus', 'Data-driven conclusion': 'Dataan perustuva johtopäätös', 'No dominant technique': 'Ei hallitsevaa tekniikkaa' },
    nl: { 'False equivalence': 'Valse gelijkstelling', 'Fear appeal': 'Beroep op angst', 'Out-group threat': 'Dreiging van buitenstaanders', 'Manufactured conspiracy': 'Geconstrueerde samenzwering', 'Authority appeal': 'Beroep op autoriteit', 'False cause': 'Valse causaliteit', 'Data-driven conclusion': 'Datagedreven conclusie', 'No dominant technique': 'Geen dominante techniek' },
  };

  return replaceWithMap(value, replacements[countryCode]);
}

function translatePrimaryTarget(value: string, countryCode: CountryCode) {
  const translations: Record<string, Record<CountryCode, string>> = {
    'Idősebb, vidéki, Fidesz-szimpatizáns szavazók': { hu: 'Idősebb, vidéki, Fidesz-szimpatizáns szavazók', de: 'Ältere, ländliche Fidesz-nahe Wähler', es: 'Votantes mayores, rurales y afines a Fidesz', fr: 'Électeurs âgés, ruraux et proches du Fidesz', us: 'Older rural Fidesz-leaning voters', fi: 'Iäkkäämmät maaseudun Fidesz-mieliset äänestäjät', nl: 'Oudere, landelijke kiezers met sympathie voor Fidesz' },
    'Bizzonytalan, békepárti, idősebb szavazók': { hu: 'Bizonytalan, békepárti, idősebb szavazók', de: 'Unentschlossene, friedensorientierte ältere Wähler', es: 'Votantes mayores indecisos y favorables a la paz', fr: 'Électeurs âgés, indécis et favorables à la paix', us: 'Undecided, peace-oriented older voters', fi: 'Epävarmat, rauhanmyönteiset iäkkäämmät äänestäjät', nl: 'Onzekere, vredesgerichte oudere kiezers' },
    'Gazdaságilag kiszolgáltatott, rezsicsökkentés-kedvezményezett háztartások': { hu: 'Gazdaságilag kiszolgáltatott, rezsicsökkentésből profitáló háztartások', de: 'Ökonomisch verletzliche Haushalte mit Energiepreisvorteilen', es: 'Hogares económicamente vulnerables beneficiados por subsidios energéticos', fr: 'Ménages économiquement fragiles bénéficiant d’un soutien énergétique', us: 'Economically vulnerable households benefiting from utility subsidies', fi: 'Taloudellisesti haavoittuvat kotitaloudet, jotka hyötyvät energiatuista', nl: 'Economisch kwetsbare huishoudens die profiteren van energiesteun' },
    'Fidesz-szimpatizánsok, akik megerősítést keresnek': { hu: 'Megerősítést kereső Fidesz-szimpatizánsok', de: 'Fidesz-Anhänger auf Bestätigungssuche', es: 'Simpatizantes de Fidesz que buscan confirmación', fr: 'Sympathisants du Fidesz en quête de confirmation', us: 'Fidesz supporters seeking confirmation', fi: 'Vahvistusta hakevat Fidesz-kannattajat', nl: 'Fidesz-aanhangers die bevestiging zoeken' },
    'Közgazdasági érdeklődésű, kritikus gondolkodású olvasók': { hu: 'Gazdasági ügyek iránt érdeklődő, kritikus gondolkodású olvasók', de: 'Wirtschaftsinteressierte, kritisch denkende Leser', es: 'Lectores interesados en economía y pensamiento crítico', fr: 'Lecteurs intéressés par l’économie et l’esprit critique', us: 'Economically engaged, critical-thinking readers', fi: 'Taloudesta kiinnostuneet, kriittisesti ajattelevat lukijat', nl: 'Economisch geïnteresseerde lezers met kritisch denkvermogen' },
  };

  return translations[value]?.[countryCode] || value;
}

function MetricBar({ value }: { value: number }) {
  return (
    <Progress
      value={value}
      className={`mt-2 h-2.5 rounded-none bg-[#232323] transition-all duration-700 ${progressTone(value)}`}
    />
  );
}

function ExampleLinks({ onPick }: { onPick: (url: string) => void }) {
  return (
    <div className="mt-4 space-y-3">
      {DEMO_LINKS.map((url) => (
        <button
          key={url}
          type="button"
          onClick={() => onPick(url)}
          className="block w-full border border-[#333333] bg-[#151515] px-4 py-3 text-left text-sm text-[#F2EDE4]/82 transition-colors hover:bg-[#191919]"
          style={{ borderColor: 'rgba(var(--country-accent-rgb),0.45)' } as CSSProperties}
        >
          {url}
        </button>
      ))}
    </div>
  );
}

function SourceCard({ source, countryCode }: { source: FactCheckSource; countryCode: CountryCode }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="block border border-[#333333] bg-[#151515] p-4 transition-colors"
      style={{ borderColor: '#333333' }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-[#F2EDE4]">{source.domain || domainFromUrl(source.url)}</p>
        <Badge variant="outline" className={`rounded-none px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] ${scoreBadge(source.credibility)}`}>
          {source.credibility}
        </Badge>
        <Badge variant="outline" className="rounded-none border-[#333333] bg-[#111111] px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-[#F2EDE4]/72">
          {translateBias(source.bias, countryCode)}
        </Badge>
        <Badge variant="outline" className={`rounded-none px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] ${stanceTone(source.stance)}`}>
          {stanceLabel(source.stance)}
        </Badge>
      </div>
      <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[#F2EDE4]/45">{source.label}</p>
      <p className="mt-2 text-sm leading-6 text-[#F2EDE4]/74">{source.summary}</p>
      <span className="mt-3 inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--country-accent)]">
        Forrás megnyitása
        <ExternalLink className="h-3.5 w-3.5" />
      </span>
    </a>
  );
}

export default function RealityCheckPanel() {
  const { t, formatDate, country, countryCode } = useCountry();
  const [inputValue, setInputValue] = useState('');
  const [result, setResult] = useState<FactCheckResult | null>(null);
  const [showUnknown, setShowUnknown] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [portalDetailsOpen, setPortalDetailsOpen] = useState(false);
  const [feedbackState, setFeedbackState] = useState<'idle' | 'negative-select' | 'submitted'>('idle');
  const [feedbackReason, setFeedbackReason] = useState('');

  async function handleCheck() {
    const trimmed = inputValue.trim();
    if (!trimmed || isAnalyzing) return;

    setIsAnalyzing(true);
    setResult(null);
    setShowUnknown(false);
    setPortalDetailsOpen(false);
    setFeedbackState('idle');
    setFeedbackReason('');

    await new Promise((resolve) => setTimeout(resolve, ANALYSIS_DELAY_MS));

    const nextResult = await checkFact(trimmed);
    setResult(nextResult);
    setShowUnknown(!nextResult);
    setPortalDetailsOpen(false);
    setFeedbackState('idle');
    setFeedbackReason('');
    setIsAnalyzing(false);
  }

  function handleExamplePick(url: string) {
    setInputValue(url);
    setResult(MOCK_ANALYSES[url]);
    setShowUnknown(false);
    setPortalDetailsOpen(false);
    setFeedbackState('idle');
    setFeedbackReason('');
  }

  const verdictMeta = result ? verdictStyles[result.verdict] : null;
  const VerdictIcon = verdictMeta?.icon || ShieldQuestion;
  const manipulationMeta = result ? manipulationLabel(result.manipulation_index.overall) : null;

  const manipulationRows = useMemo(
    () => result ? [
      { label: 'Kattintásvadászat', value: result.manipulation_index.clickbait },
      { label: 'Érzelmi felerősítés', value: result.manipulation_index.emotional_amplification },
      { label: 'Elhallgatott kontextus', value: result.manipulation_index.omitted_context },
      { label: 'Hamis sürgetés', value: result.manipulation_index.false_urgency },
      { label: 'Megtévesztő keretezés', value: result.manipulation_index.misleading_framing },
    ] : [],
    [result],
  );

  return (
    <TooltipProvider>
      <section className="mx-auto flex h-full min-h-0 max-w-7xl flex-col">
        <div className="flex min-h-0 flex-1 flex-col border border-[#333333] bg-[#111111]/95 shadow-[0_2px_8px_rgba(0,0,0,0.18)]">
          <div className="border-b border-[#333333] px-6 py-6 sm:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--country-accent)]">
              {t('reality.header')}
            </p>
            <h2 className="mt-3 font-display text-3xl font-extrabold uppercase tracking-[0.08em] text-[#F2EDE4] sm:text-4xl">
              {t('reality.header')}
            </h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-[#F2EDE4]/72 sm:text-base">
              {t('reality.description')}
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="px-6 py-6 sm:px-8">
              <label htmlFor="reality-check-input" className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#F2EDE4]/60">
                {t('reality.input')}
              </label>
              <Textarea
                id="reality-check-input"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder={t('reality.placeholder')}
                className="mt-4 min-h-[160px] rounded-none border-[#333333] bg-[#151515] px-5 py-4 text-base leading-7 text-[#F2EDE4] placeholder:text-[#F2EDE4]/32 focus-visible:ring-0"
              />

              <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => void handleCheck()}
                    disabled={!inputValue.trim() || isAnalyzing}
                    className="rounded-none px-6 text-xs font-bold uppercase tracking-[0.24em] text-[#F2EDE4]"
                    style={{ backgroundColor: 'var(--country-accent)' }}
                  >
                    {isAnalyzing ? 'Elemzés...' : t('reality.open')}
                  </Button>
                </div>
              </div>

              {showUnknown && (
                <div className="mt-6 border border-[#444444] bg-[#171717] px-5 py-5 text-[#F2EDE4]/78">
                  <div className="flex items-start gap-3">
                    <ShieldQuestion className="mt-0.5 h-5 w-5 shrink-0 text-[#A1A1AA]" />
                    <div>
                      <p className="text-base font-semibold text-[#F2EDE4]">
                        {t('reality.unavailable')}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#F2EDE4]/68">
                        {t('reality.tryAnother')}
                      </p>
                    </div>
                  </div>
                  <ExampleLinks onPick={handleExamplePick} />
                </div>
              )}
            </div>

            <div className="border-t border-[#333333] px-6 py-6 sm:px-8">
              {isAnalyzing ? (
                <div className="border border-[#333333] bg-[#151515] px-6 py-8 text-center" style={{ boxShadow: '0 0 0 1px rgba(var(--country-accent-rgb),0.12)' }}>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#333333] bg-[#111111]">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#444444] border-t-[var(--country-accent)]" />
                  </div>
                  <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--country-accent)]">
                    Elemzés folyamatban
                  </p>
                  <p className="mt-3 animate-pulse text-base text-[#F2EDE4]/76">
                    Források, narratívák és pszichológiai minták feldolgozása...
                  </p>
                  <p className="mt-2 text-sm text-[#F2EDE4]/48">
                    Ez általában néhány másodpercet vesz igénybe.
                  </p>
                </div>
              ) : !result ? (
                <div className="min-h-[80px]" />
              ) : (
                <div className="space-y-6">
                <div className="border border-[#333333] bg-[#151515] p-6" style={{ boxShadow: '0 0 0 1px rgba(var(--country-accent-rgb),0.12)' }}>
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#F2EDE4]/50">Ítélet</p>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <VerdictIcon className={`h-8 w-8 ${verdictMeta?.tone}`} />
                        <Badge variant="outline" className={`rounded-none px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${verdictMeta?.badge}`}>
                          {verdictMeta?.label}
                        </Badge>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-[#F2EDE4]/84">{result.explanation}</p>
                      <div className="mt-5 text-[11px] uppercase tracking-[0.18em] text-[#F2EDE4]/45">
                        Elemzés ideje: {formatDate(result.submitted_at, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <div className="border border-[#333333] bg-[#111111] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#F2EDE4]/50">Bizonyosság</p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#F2EDE4]">{Math.round(result.confidence)}%</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-[#F2EDE4]/50 hover:text-[#F2EDE4]">
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="rounded-none border-[#333333] bg-[#151515] text-[#F2EDE4]">
                              Ez az érték az adott elemzés bizonyossági szintjét mutatja
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                      <Progress value={result.confidence} className={`mt-4 h-3 rounded-none bg-[#262626] transition-all duration-700 ${progressTone(result.confidence)}`} />

                      <div className="mt-5 border-t border-[#333333] pt-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#F2EDE4]/50">Portálértékelés</span>
                          <Badge variant="outline" className={`rounded-none px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] ${scoreBadge(result.portal_rating.credibility)}`}>
                            {result.portal_rating.credibility}
                          </Badge>
                          <Badge variant="outline" className="rounded-none border-[#333333] bg-[#151515] px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-[#F2EDE4]/72">
                            {translateBias(result.portal_rating.bias, countryCode)}
                          </Badge>
                        </div>
                        <p className={`mt-3 text-lg font-semibold ${scoreTone(result.portal_rating.credibility)}`}>
                          {result.portal_rating.domain}
                        </p>

                        <button
                          type="button"
                          onClick={() => setPortalDetailsOpen((value) => !value)}
                          className="mt-3 inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--country-accent)]"
                        >
                          {portalDetailsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          Miért megbízható vagy nem megbízható?
                        </button>

                        {portalDetailsOpen && (
                          <p className="mt-3 text-sm leading-6 text-[#F2EDE4]/72">{result.portal_rating.why_trusted_or_not}</p>
                        )}
                      </div>

                      <div className="mt-5 border-t border-[#333333] pt-4">
                        <p className="text-sm text-[#F2EDE4]/72">Helyes ez az ítélet?</p>

                        {feedbackState === 'idle' && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setFeedbackState('submitted')}
                              className="rounded-none border-[#333333] bg-transparent text-[#F2EDE4] hover:bg-[#171717]"
                            >
                              <ThumbsUp className="mr-2 h-4 w-4" />
                              Igen, helyes
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setFeedbackState('negative-select')}
                              className="rounded-none border-[#333333] bg-transparent text-[#F2EDE4] hover:bg-[#171717]"
                            >
                              <ThumbsDown className="mr-2 h-4 w-4" />
                              Nem, téves
                            </Button>
                          </div>
                        )}

                        {feedbackState === 'negative-select' && (
                          <div className="mt-3 space-y-3">
                            <select
                              aria-label="Visszajelzés indoka"
                              value={feedbackReason}
                              onChange={(event) => setFeedbackReason(event.target.value)}
                              className="flex h-10 w-full rounded-none border border-[#333333] bg-[#151515] px-3 py-2 text-sm text-[#F2EDE4] focus:outline-none"
                            >
                              <option value="">Válassz indokot</option>
                              <option value="Téves verdict">Téves verdict</option>
                              <option value="Rossz forrásértékelés">Rossz forrásértékelés</option>
                              <option value="Hiányos kontextus">Hiányos kontextus</option>
                              <option value="Egyéb">Egyéb</option>
                            </select>
                            <Button
                              type="button"
                              onClick={() => setFeedbackState('submitted')}
                              disabled={!feedbackReason}
                              className="rounded-none text-xs font-bold uppercase tracking-[0.2em] text-[#F2EDE4]"
                              style={{ backgroundColor: 'var(--country-accent)' }}
                            >
                              Küldés
                            </Button>
                          </div>
                        )}

                        {feedbackState === 'submitted' && (
                          <p className="mt-3 text-sm text-[#F2EDE4]/74">
                            Köszönjük a visszajelzést — segít a rendszer fejlesztésében.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <div className="border border-[#333333] bg-[#151515] p-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#F2EDE4]/50">Cím elemzés</p>
                    <blockquote className="mt-4 border-l-2 pl-4 font-display text-xl font-bold leading-tight text-[#F2EDE4]" style={{ borderColor: 'var(--country-accent)' }}>
                      “{result.headline_analysis.original}”
                    </blockquote>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <div className="border border-[#333333] bg-[#111111] p-4">
                          <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-[#F2EDE4]/72">{countryCode === 'hu' ? 'Clickbait-index' : countryCode === 'de' ? 'Clickbait-Index' : countryCode === 'es' ? 'Índice clickbait' : countryCode === 'fr' ? 'Indice putaclic' : countryCode === 'fi' ? 'Klikkiotsikkoindeksi' : countryCode === 'nl' ? 'Clickbait-index' : 'Clickbait index'}</span>
                          <span className={`text-sm font-semibold ${scoreTone(100 - result.headline_analysis.clickbait_score)}`}>
                            {result.headline_analysis.clickbait_score}
                          </span>
                        </div>
                        <MetricBar value={result.headline_analysis.clickbait_score} />
                      </div>
                      <div className="border border-[#333333] bg-[#111111] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-[#F2EDE4]/72">Pontosság</span>
                          <span className={`text-sm font-semibold ${scoreTone(result.headline_analysis.accuracy_score)}`}>
                            {result.headline_analysis.accuracy_score}
                          </span>
                        </div>
                        <Progress
                          value={result.headline_analysis.accuracy_score}
                          className={`mt-2 h-2.5 rounded-none bg-[#232323] transition-all duration-700 ${scoreBadge(result.headline_analysis.accuracy_score).includes('emerald') ? '[&>div]:bg-emerald-500' : scoreBadge(result.headline_analysis.accuracy_score).includes('amber') ? '[&>div]:bg-amber-400' : '[&>div]:bg-red-500'}`}
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <Badge variant="outline" className="rounded-none px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-[#F2EDE4]" style={{ borderColor: 'rgba(var(--country-accent-rgb),0.35)', backgroundColor: 'rgba(var(--country-accent-rgb),0.1)' }}>
                        {translateInlineText(result.headline_analysis.psychological_hook, countryCode)}
                      </Badge>
                    </div>

                    <div className="mt-5 space-y-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[#F2EDE4]/45">Mit ígér a cím a törzshöz képest?</p>
                        <p className="mt-2 text-sm leading-7 text-[#F2EDE4]/76">{result.headline_analysis.vs_body_summary}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[#F2EDE4]/45">Hiányzó kontextus</p>
                        <p className="mt-2 text-sm leading-7 text-[#F2EDE4]/76">{result.headline_analysis.missing_context}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border border-[#333333] bg-[#151515] p-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#F2EDE4]/50">Manipuláció index</p>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-display text-4xl font-extrabold text-[#F2EDE4]">{result.manipulation_index.overall}</p>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[#F2EDE4]/45">Összesített pontszám</p>
                      </div>
                      <Badge variant="outline" className={`rounded-none px-3 py-1 text-xs uppercase tracking-[0.16em] ${manipulationMeta?.className}`}>
                        {manipulationMeta?.label}
                      </Badge>
                    </div>

                    <div className="mt-6 space-y-4">
                      {manipulationRows.map((row) => (
                        <div key={row.label}>
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-[#F2EDE4]/72">{row.label}</span>
                          <span className={`font-semibold ${scoreTone(100 - row.value)}`}>{row.value}</span>
                          </div>
                          <MetricBar value={row.value} />
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 border-t border-[#333333] pt-4">
                      <p className="text-sm leading-7 text-[#F2EDE4]/76">
                        Domináns technika: <strong className="text-[#F2EDE4]">{translateInlineText(result.manipulation_index.dominant_technique, countryCode)}</strong>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border border-[#333333] bg-[#151515] p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#F2EDE4]/50">Pszichológiai elemzés</p>
                  <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    {result.psychological_quotes.map((item, index) => (
                      <div key={`${item.quote}-${index}`} className="border border-[#333333] bg-[#111111] p-4">
                        <blockquote className="font-display text-lg font-bold leading-snug text-[#F2EDE4]">
                          “{item.quote}”
                        </blockquote>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Badge variant="outline" className="rounded-none px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-[#F2EDE4]" style={{ borderColor: 'rgba(var(--country-accent-rgb),0.35)', backgroundColor: 'rgba(var(--country-accent-rgb),0.1)' }}>
                            {translateInlineText(item.technique, countryCode)}
                          </Badge>
                          <Badge variant="outline" className={`rounded-none px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] ${emotionalTone(item.emotional_target)}`}>
                            {item.emotional_target}
                          </Badge>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-[#F2EDE4]/68">{item.analysis}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 border-t border-[#333333] pt-5">
                    <p className="text-base leading-7 text-[#F2EDE4]/84">{result.psychological_conclusion}</p>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <div className="border border-[#333333] bg-[#151515] p-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#F2EDE4]/50">Források</p>
                    <div className="mt-5 space-y-4">
                      {result.sources.map((source) => (
                        <SourceCard key={source.url} source={source} countryCode={countryCode} />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    {result.narrative_chain && (
                      <div className="border border-[#333333] bg-[#151515] p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#F2EDE4]/50">Narratíva-lánc</p>
                          <Badge variant="outline" className={`rounded-none px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] ${coordinationTone(result.narrative_chain.coordination_level)}`}>
                            {result.narrative_chain.coordination_level}
                          </Badge>
                        </div>

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-[#F2EDE4]/45">
                          <span>{formatDate(result.narrative_chain.first_seen)}</span>
                          <span>{result.narrative_chain.appearances} megjelenés</span>
                        </div>

                        <div className="mt-6 overflow-x-auto">
                          <div className="flex min-w-max items-center gap-0 px-2">
                            {result.narrative_chain.domains.map((domain, index) => (
                              <div key={`${domain}-${index}`} className="flex items-center">
                                <div className="flex flex-col items-center">
                                  <div className="h-4 w-4 rounded-full border-2 bg-[#111111]" style={{ borderColor: 'var(--country-accent)' }} />
                                  <span className="mt-3 max-w-[100px] text-center text-[11px] uppercase tracking-[0.14em] text-[#F2EDE4]/62">
                                    {domain}
                                  </span>
                                </div>
                                {index < result.narrative_chain.domains.length - 1 && (
                                  <div className="mx-3 h-px w-16 bg-[#444444]" />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        <p className="mt-6 text-sm leading-7 text-[#F2EDE4]/74">{result.narrative_chain.mutation_summary}</p>
                      </div>
                    )}

                    <div className="border border-[#333333] bg-[#151515] p-6">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#F2EDE4]/50">Célközönség elemzés</p>
                      <p className="mt-4 font-display text-2xl font-bold text-[#F2EDE4]">{translatePrimaryTarget(result.target_audience.primary_target, countryCode)}</p>

                      <div className="mt-5">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[#F2EDE4]/45">Kihasznált félelmek</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {result.target_audience.exploited_fears.length > 0 ? result.target_audience.exploited_fears.map((item) => (
                            <Badge key={item} variant="outline" className="rounded-none border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-red-200">
                              {adaptCountryReference(item, country.countryName)}
                            </Badge>
                          )) : (
                            <span className="text-sm text-[#F2EDE4]/56">Nincs kiemelt félelemtrigger.</span>
                          )}
                        </div>
                      </div>

                      <div className="mt-5">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[#F2EDE4]/45">Feltételezett előítéletek</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {result.target_audience.assumed_prejudices.length > 0 ? result.target_audience.assumed_prejudices.map((item) => (
                            <Badge key={item} variant="outline" className="rounded-none border-zinc-500/30 bg-zinc-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-zinc-200">
                              {adaptCountryReference(item, country.countryName)}
                            </Badge>
                          )) : (
                            <span className="text-sm text-[#F2EDE4]/56">Nincs kiemelt előítéletlista.</span>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 border-t border-[#333333] pt-4">
                        <p className="text-sm leading-7 text-[#F2EDE4]/76">{result.target_audience.conclusion}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border border-[#333333] bg-[#151515] p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#F2EDE4]/50">Elhallgatott kontextus</p>
                  <p className="mt-4 text-sm leading-7 text-[#F2EDE4]/76">{result.omitted_context}</p>
                </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </TooltipProvider>
  );
}
