import { FormEvent, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type MediaColumnId = 'independent' | 'mainstream' | 'international';

interface CoverageEntry {
  source: string;
  headline: string;
  angle: string;
  framing: string;
  tone: string;
  note: string;
}

interface TopicPreset {
  keywords: string[];
  label: string;
  conclusion: {
    summary: string;
    sharedPoint: string;
    differencePoint: string;
  };
  entries: Record<MediaColumnId, CoverageEntry[]>;
}

const MEDIA_COLUMNS: { id: MediaColumnId; title: string; sources: string; accent: string }[] = [
  {
    id: 'independent',
    title: 'Független magyar',
    sources: 'Telex, 444, HVG',
    accent: 'border-l-[#2E7D4F]',
  },
  {
    id: 'mainstream',
    title: 'Magyar mainstream',
    sources: 'Origo, Magyar Nemzet, MTI',
    accent: 'border-l-[#D97B00]',
  },
  {
    id: 'international',
    title: 'Nemzetközi',
    sources: 'BBC, Reuters, Al Jazeera',
    accent: 'border-l-[#C8243C]',
  },
];

const SOURCE_DOMAINS: Record<string, string> = {
  Telex: 'telex.hu',
  '444': '444.hu',
  HVG: 'hvg.hu',
  Origo: 'origo.hu',
  'Magyar Nemzet': 'magyarnemzet.hu',
  MTI: 'mti.hu',
  BBC: 'bbc.com',
  Reuters: 'reuters.com',
  'Al Jazeera': 'aljazeera.com',
};

const TOPIC_PRESETS: TopicPreset[] = [
  {
    keywords: ['irán', 'iran', 'iráni konfliktus', 'iran izraeli konfliktus', 'iráni támadás', 'közel-kelet'],
    label: 'Irán és a közel-keleti feszültség',
    conclusion: {
      summary: 'Az iráni fejleményekről szóló tudósítások ugyanarra a biztonsági válságra reagálnak, de eltérően súlyozzák a kockázatokat és a felelősöket.',
      sharedPoint: 'Mindhárom médiablokk kiemeli, hogy a történet túlmutat Iránon: regionális eszkalációról, diplomáciai nyomásról és gazdasági következményekről is szól.',
      differencePoint: 'A független magyar sajtó inkább a háttérokokat és a magyar érintettséget boncolja, a magyar mainstream a biztonsági és szuverenitási keretezést hangsúlyozza, a nemzetközi sajtó pedig a regionális stabilitás és a globális diplomácia felől közelít.',
    },
    entries: {
      independent: [
        {
          source: 'Telex',
          headline: 'Mit jelenthet Irán újabb lépése Európára és Magyarországra nézve?',
          angle: 'A geopolitikai fejleményeket magyar és európai következményekre fordítja le.',
          framing: 'Fókusz: diplomácia, energiaárak, regionális kockázat.',
          tone: 'Analitikus',
          note: 'A háttér és a lehetséges tovagyűrűző hatások részletes bontása jellemző.',
        },
        {
          source: '444',
          headline: 'Miért nő újra a feszültség Irán körül?',
          angle: 'A politikai döntések mögötti logikát és az ellentmondásokat emeli ki.',
          framing: 'Fókusz: hatalmi játszmák, rossz döntések, eszkaláció.',
          tone: 'Kritikus',
          note: 'A megszólalások és a tényleges következmények közti távolságot teszi láthatóvá.',
        },
        {
          source: 'HVG',
          headline: 'Milyen gazdasági és biztonsági kockázatokat hoz az iráni válság?',
          angle: 'A katonai fejleményeket a piacokkal és a nemzetközi reakciókkal együtt elemzi.',
          framing: 'Fókusz: olaj, külpolitika, stratégiai kitettség.',
          tone: 'Elemző',
          note: 'Erős szakértői keretben mutatja be a lehetséges forgatókönyveket.',
        },
      ],
      mainstream: [
        {
          source: 'Origo',
          headline: 'Újabb veszélyes fordulat a Közel-Keleten',
          angle: 'A biztonsági fenyegetést és az instabilitást hangsúlyozza.',
          framing: 'Fókusz: rend, védelem, fenyegetettség.',
          tone: 'Harcos',
          note: 'A történetet gyakran fenyegetési narratívába rendezi.',
        },
        {
          source: 'Magyar Nemzet',
          headline: 'A közel-keleti válság Európára is nyomást helyezhet',
          angle: 'A nemzetközi feszültséget a magyar és európai biztonsági térre vetíti rá.',
          framing: 'Fókusz: stabilitás, védekezés, nemzeti érdek.',
          tone: 'Támogató',
          note: 'A magyar mozgástér és az állami reakciók hangsúlyosak maradnak.',
        },
        {
          source: 'MTI',
          headline: 'Nemzetközi reakciók érkeztek az iráni fejleményekre',
          angle: 'Rövid, hivatalos nyilatkozatokra épülő összefoglaló.',
          framing: 'Fókusz: bejelentések, időrend, diplomaták reakciói.',
          tone: 'Semleges',
          note: 'Kevésbé értelmez, inkább az alapinformációkat rendezi sorba.',
        },
      ],
      international: [
        {
          source: 'BBC',
          headline: 'Why rising tensions with Iran matter far beyond the region',
          angle: 'A regionális fejleményeket globális biztonsági és diplomáciai keretbe helyezi.',
          framing: 'Fókusz: escalation risk, alliances, global impact.',
          tone: 'Measured',
          note: 'A nézőnek magyarázza el, miért nem csak helyi konfliktusról van szó.',
        },
        {
          source: 'Reuters',
          headline: 'Markets and diplomats react to latest Iran tensions',
          angle: 'A gyors fejleményekre, a piacokra és a hivatalos reakciókra koncentrál.',
          framing: 'Fókusz: oil, diplomacy, immediate fallout.',
          tone: 'Wire-style',
          note: 'A legfontosabb geopolitikai és piaci jelzéseket emeli ki röviden.',
        },
        {
          source: 'Al Jazeera',
          headline: 'Iran tensions raise fears of broader regional conflict',
          angle: 'A térségi szereplők szemszögét és a humanitárius következményeket is hangsúlyozza.',
          framing: 'Fókusz: regional actors, escalation, civilian impact.',
          tone: 'Contextual',
          note: 'Nagyobb teret ad a helyi és regionális nézőpontoknak.',
        },
      ],
    },
  },
  {
    keywords: ['ukrajna', 'ukrajna támogatás', 'eu ukrajna', 'ukrán támogatás'],
    label: 'Ukrajna támogatás',
    conclusion: {
      summary: 'Ugyanarról a fejleményről minden blokk beszámol, de nem ugyanazt tartja a történet lényegének.',
      sharedPoint: 'Mindhárom médiatípus érzékeli, hogy a döntés egyszerre diplomáciai, gazdasági és belpolitikai kérdés.',
      differencePoint: 'A független magyar sajtó inkább az alkufolyamatot és a következményeket bontja ki, a magyar mainstream a szuverenitás és békepártiság felől keretez, a nemzetközi sajtó pedig az európai egységre és geopolitikai hatásra teszi a hangsúlyt.',
    },
    entries: {
      independent: [
        {
          source: 'Telex',
          headline: 'Budapest újabb uniós vitában az ukrajnai támogatásról',
          angle: 'A hazai következményeket és a politikai feszültséget emeli ki.',
          framing: 'Fókusz: diplomácia, EU-s alku, magyar érdekek.',
          tone: 'Analitikus',
          note: 'Gyakran részletezi, milyen kompromisszumokat kell kötnie a kormánynak.',
        },
        {
          source: '444',
          headline: 'Miért akadt el megint a közös európai döntés?',
          angle: 'A politikai motivációkat és az ellentmondásokat boncolja.',
          framing: 'Fókusz: szereplők felelőssége, konfliktusok a háttérben.',
          tone: 'Kritikus',
          note: 'Sokszor az állítások és a kommunikáció közti feszültség a központi téma.',
        },
        {
          source: 'HVG',
          headline: 'Mit jelentene gazdaságilag a következő csomag?',
          angle: 'A pénzügyi és stratégiai következményeket teszi előtérbe.',
          framing: 'Fókusz: piac, energia, biztonságpolitika.',
          tone: 'Elemző',
          note: 'Jellemzően szakértői keretet ad a magyar hatásokhoz.',
        },
      ],
      mainstream: [
        {
          source: 'Origo',
          headline: 'Brüsszel újabb nyomást helyezne Magyarországra',
          angle: 'A konfliktust a szuverenitás védelmén keresztül mutatja.',
          framing: 'Fókusz: külső nyomás, nemzeti álláspont.',
          tone: 'Harcos',
          note: 'A történetet gyakran politikai érdekháborúként rendezi el.',
        },
        {
          source: 'Magyar Nemzet',
          headline: 'A magyar kormány továbbra is a békepárti álláspontot képviseli',
          angle: 'A kormány álláspontját helyezi középpontba.',
          framing: 'Fókusz: stabilitás, béke, nemzeti érdek.',
          tone: 'Támogató',
          note: 'A nemzetközi döntéseket gyakran a magyar állásponthoz méri.',
        },
        {
          source: 'MTI',
          headline: 'Kormányzati reakció az uniós tárgyalásokra',
          angle: 'Tényszerű, nyilatkozatközpontú összefoglaló.',
          framing: 'Fókusz: hivatalos bejelentések és időrend.',
          tone: 'Semleges',
          note: 'Leginkább azt mutatja meg, mi hangzott el hivatalosan.',
        },
      ],
      international: [
        {
          source: 'BBC',
          headline: 'EU leaders struggle to maintain united front on Ukraine',
          angle: 'A szélesebb európai politikai képet hangsúlyozza.',
          framing: 'Fókusz: continental cohesion, strategic stakes.',
          tone: 'Measured',
          note: 'Magyarország általában egy nagyobb európai dinamika részeként jelenik meg.',
        },
        {
          source: 'Reuters',
          headline: 'Hungary complicates latest EU effort on aid package',
          angle: 'Gyors, piacbarát és diplomáciai összefoglaló.',
          framing: 'Fókusz: what changed, who said what, market impact.',
          tone: 'Wire-style',
          note: 'A befektetői és geopolitikai következményeket is rögtön kiemeli.',
        },
        {
          source: 'Al Jazeera',
          headline: 'Europe debates aid, war fatigue and political leverage',
          angle: 'A konfliktust globális hatalmi és humanitárius keretbe helyezi.',
          framing: 'Fókusz: war fatigue, diplomacy, regional pressure.',
          tone: 'Contextual',
          note: 'Több teret ad a nem nyugati nézőpontoknak is.',
        },
      ],
    },
  },
  {
    keywords: ['trump vámok', 'trump vamok', 'vámok', 'amerika vám', 'amerikai vámok'],
    label: 'Trump vámok',
    conclusion: {
      summary: 'A téma mindenhol kereskedelmi feszültségként jelenik meg, de az ok-okozat és a lehetséges nyertesek másként vannak elmesélve.',
      sharedPoint: 'Minden oldal érzékeli, hogy a vámok nemcsak politikai üzenetek, hanem árakra, ellátási láncokra és európai szereplőkre is hatnak.',
      differencePoint: 'A független magyar források inkább a hazai gazdasági következményekre figyelnek, a magyar mainstream az iparvédelem és erős állam keretét hangsúlyozza, a nemzetközi sajtó pedig a piacok és szövetségi viszonyok felől olvassa a fejleményt.',
    },
    entries: {
      independent: [
        {
          source: 'Telex',
          headline: 'Mennyire érné el Magyarországot egy új amerikai vámhullám?',
          angle: 'A magyar export és beszállítólánc veszélyeit keresi.',
          framing: 'Fókusz: autóipar, uniós válasz, hazai sebezhetőség.',
          tone: 'Analitikus',
          note: 'Azt vizsgálja, hol csapódna le a nemzetközi vita itthon.',
        },
        {
          source: '444',
          headline: 'Újabb globális kereskedelmi feszültség jöhet',
          angle: 'A politikai show-elemet és a bizonytalanságot hangsúlyozza.',
          framing: 'Fókusz: kampánylogika, gazdasági következmények.',
          tone: 'Kritikus',
          note: 'Gyakran kiemeli az ígéretek és a valóság közti szakadékot.',
        },
        {
          source: 'HVG',
          headline: 'Ki nyerne és ki veszítene az amerikai vámemelésen?',
          angle: 'A vállalati és makrogazdasági hatásokat emeli ki.',
          framing: 'Fókusz: termelés, infláció, kereskedelem.',
          tone: 'Elemző',
          note: 'Inkább következményekben, mint politikai szlogenekben gondolkodik.',
        },
      ],
      mainstream: [
        {
          source: 'Origo',
          headline: 'Amerika keményebben lépne fel a globalista kereskedelemmel szemben',
          angle: 'A nemzeti iparvédelem narratívájára épül.',
          framing: 'Fókusz: erős állam, védett piac, geopolitikai verseny.',
          tone: 'Harcos',
          note: 'A lépéseket gyakran szuverenista keretben mutatja be.',
        },
        {
          source: 'Magyar Nemzet',
          headline: 'Az új amerikai intézkedések Európát is válaszlépésre kényszeríthetik',
          angle: 'Az európai reakciókat és a magyar mozgásteret figyeli.',
          framing: 'Fókusz: érdekérvényesítés, válaszstratégia.',
          tone: 'Támogató',
          note: 'A hazai politikai pozicionálás fontos szervezőelem marad.',
        },
        {
          source: 'MTI',
          headline: 'Nemzetközi visszhang az amerikai kereskedelmi bejelentésre',
          angle: 'Rövid, tényszerű hírszemle hivatalos reakciókkal.',
          framing: 'Fókusz: bejelentések, reakciók, időrend.',
          tone: 'Semleges',
          note: 'Az alapinformációt adja, kevesebb értelmező réteggel.',
        },
      ],
      international: [
        {
          source: 'BBC',
          headline: 'What new tariffs could mean for prices and alliances',
          angle: 'A fogyasztói árak és szövetségi következmények kerülnek előtérbe.',
          framing: 'Fókusz: households, diplomacy, business reaction.',
          tone: 'Measured',
          note: 'Közérthetően fordítja le a világgazdasági témát a nézőnek.',
        },
        {
          source: 'Reuters',
          headline: 'Markets assess tariff threat as trade tensions resurface',
          angle: 'A piacok, részvények és ellátási láncok azonnali reakciója a központ.',
          framing: 'Fókusz: investors, sectors, official statements.',
          tone: 'Wire-style',
          note: 'A legfontosabb számokat és azonnali következményeket emeli ki.',
        },
        {
          source: 'Al Jazeera',
          headline: 'Tariffs return to the campaign trail with global implications',
          angle: 'A témát amerikai politika és globális dél kapcsolatában mutatja.',
          framing: 'Fókusz: trade justice, geopolitics, developing economies.',
          tone: 'Contextual',
          note: 'Tágabb világrendszerbe helyezi az eseményt.',
        },
      ],
    },
  },
  {
    keywords: ['energiaárak', 'energiaarak', 'energia', 'gázár', 'áramár'],
    label: 'Energiapiaci sokk',
    conclusion: {
      summary: 'A beszámolók közös pontja, hogy az energiapiac egyszerre gazdasági és politikai kérdés, de a felelősség és a hangsúly nagyon eltér.',
      sharedPoint: 'Mindegyik blokk érzékeli, hogy az ármozgás közvetlenül érinti a háztartásokat, a vállalatokat és a kormányzati mozgásteret is.',
      differencePoint: 'A független magyar sajtó a mindennapi és gazdasági hatásokat elemzi, a magyar mainstream inkább felelősöket és védekezési narratívát keres, a nemzetközi források pedig rendszerszintű függőségekről és geopolitikai kitettségről beszélnek.',
    },
    entries: {
      independent: [
        {
          source: 'Telex',
          headline: 'Mi mozgatja megint az energiaárakat Európában?',
          angle: 'Az okokat és a hazai hatásokat egyszerre fejti le.',
          framing: 'Fókusz: ellátásbiztonság, számlák, uniós reakció.',
          tone: 'Analitikus',
          note: 'A magyar háztartási következmények rendre hangsúlyosak.',
        },
        {
          source: '444',
          headline: 'Drágulhat minden, ha tartós marad az energiasokk',
          angle: 'A politikai és életminőségi következményekre teszi a hangsúlyt.',
          framing: 'Fókusz: árak, közhangulat, hibás döntések.',
          tone: 'Kritikus',
          note: 'A mindennapi életre fordítható következményeket erősíti fel.',
        },
        {
          source: 'HVG',
          headline: 'Mit jeleznek a gáz- és árampiaci görbék?',
          angle: 'A számokból és trendekből indul ki.',
          framing: 'Fókusz: tőzsde, tarifák, gazdasági terhelés.',
          tone: 'Elemző',
          note: 'Erősen adat- és szakértőközpontú megközelítés.',
        },
      ],
      mainstream: [
        {
          source: 'Origo',
          headline: 'Brüsszel hibái miatt nőhetnek az energiaárak',
          angle: 'A felelősséget külső szereplőkre helyezi.',
          framing: 'Fókusz: rossz uniós döntések, nemzeti védelem.',
          tone: 'Harcos',
          note: 'A kormányzati választ a probléma ellensúlyaként mutatja be.',
        },
        {
          source: 'Magyar Nemzet',
          headline: 'Fontos, hogy Magyarország megőrizze energiaellátását',
          angle: 'A stabilitás és védekezés narratíváját emeli ki.',
          framing: 'Fókusz: rezsivédelem, energiafüggetlenség.',
          tone: 'Támogató',
          note: 'A történetet a nemzeti érdek nyelvén rendezi el.',
        },
        {
          source: 'MTI',
          headline: 'Nyilatkozatok érkeztek az energiaárak alakulása kapcsán',
          angle: 'Rövid hírfolyam hivatalos megszólalókkal.',
          framing: 'Fókusz: tények, aktuális bejelentések.',
          tone: 'Semleges',
          note: 'Kevesebb kommentárral, inkább hírügynökségi összefoglaló.',
        },
      ],
      international: [
        {
          source: 'BBC',
          headline: 'Europe watches energy prices as supply fears return',
          angle: 'A lakossági árak és geopolitika egyaránt jelen van.',
          framing: 'Fókusz: bills, security, regional pressure.',
          tone: 'Measured',
          note: 'A nézőknek megmagyarázza, mit jelent ez a számlákban.',
        },
        {
          source: 'Reuters',
          headline: 'Energy markets jump on renewed supply concerns',
          angle: 'Az azonnali piaci reakció és a kulcstényezők dominálnak.',
          framing: 'Fókusz: prices, traders, government comments.',
          tone: 'Wire-style',
          note: 'Gyorsan értelmezhető, piaci fókuszú képet ad.',
        },
        {
          source: 'Al Jazeera',
          headline: 'Energy shocks expose old dependencies and new divides',
          angle: 'A globális egyenlőtlenségeket és politikai hatásokat hangsúlyozza.',
          framing: 'Fókusz: dependency, inequality, regional spillover.',
          tone: 'Contextual',
          note: 'Tágabb nemzetközi kontextusba illeszti a témát.',
        },
      ],
    },
  },
];

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getCoverageLink(entry: CoverageEntry) {
  const domain = SOURCE_DOMAINS[entry.source];
  const query = domain ? `site:${domain} ${entry.headline}` : entry.headline;

  return `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
}

export default function MediaLensPanel() {
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');

  const selectedTopic = useMemo(() => {
    const normalizedQuery = normalizeText(activeQuery);

    if (!normalizedQuery) return null;

    return (
      TOPIC_PRESETS.find((topic) =>
        [topic.label, ...topic.keywords].some((keyword) => {
          const normalizedKeyword = normalizeText(keyword);
          return normalizedKeyword.includes(normalizedQuery) || normalizedQuery.includes(normalizedKeyword);
        }),
      ) || null
    );
  }, [activeQuery]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActiveQuery(query.trim());
  }

  return (
    <div className="glass-panel overflow-hidden">
      <div className="border-b border-border px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-extrabold text-foreground tracking-[-0.02em]">
              Media Lens
            </h2>
            <p className="mt-2 text-[15px] text-muted-foreground">
              Ugyanaz a téma, három különböző médiaszűrőn át: független magyar, magyar mainstream és nemzetközi források egymás mellett.
            </p>
          </div>

          <div className="w-full xl:max-w-xl">
            <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Írj be bármilyen kulcsszót vagy témát"
                  className="h-11 border-border bg-secondary pl-10 text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <Button type="submit" variant="outline" size="default">
                Keresés
              </Button>
            </form>

          </div>
        </div>
      </div>

      <div className="border-b border-border bg-secondary/40 px-4 py-3 sm:px-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-primary">
          Aktív keresés:{' '}
          <span className="text-accent">{activeQuery.trim() || 'nincs megadva téma'}</span>
        </p>
      </div>

      {!activeQuery.trim() && (
        <div className="px-4 py-10 sm:px-6">
          <div className="border border-border bg-card p-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-primary">Várunk egy témát</p>
            <h3 className="mt-2 font-display text-2xl font-bold text-foreground">
              Írj be egy kulcsszót az összehasonlításhoz
            </h3>
            <p className="mt-3 max-w-2xl text-[14px] leading-[1.7] text-muted-foreground">
              A Media Lens akkor tud összehasonlítást mutatni, ha megadsz egy hírtémát vagy kulcsszót.
            </p>
          </div>
        </div>
      )}

      {activeQuery.trim() && !selectedTopic && (
        <div className="px-4 py-10 sm:px-6">
          <div className="border border-border bg-card p-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-primary">Nincs találat</p>
            <h3 className="mt-2 font-display text-2xl font-bold text-foreground">
              Nincs ilyen téma a jelenlegi minták között
            </h3>
            <p className="mt-3 max-w-2xl text-[14px] leading-[1.7] text-muted-foreground">
              Erre kerestél: <span className="text-foreground">{activeQuery}</span>. Próbálj meg más kulcsszót,
              vagy használj hasonló témát, mint például az ukrajnai támogatás, a vámok vagy az energiaárak.
            </p>
          </div>
        </div>
      )}

      {selectedTopic && (
        <>
          <div className="grid grid-cols-1 gap-4 border-b border-border bg-[#111111] px-4 py-5 sm:px-6 lg:grid-cols-[1.3fr_1fr_1fr]">
            <div className="border border-border bg-card p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-primary">Következtetés</p>
              <h3 className="mt-2 font-display text-xl font-bold text-foreground">{selectedTopic.label}</h3>
              <p className="mt-3 text-[14px] leading-[1.7] text-muted-foreground">
                {selectedTopic.conclusion.summary}
              </p>
            </div>

            <div className="border border-border bg-card p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-primary">Mi a közös?</p>
              <p className="mt-3 text-[14px] leading-[1.7] text-muted-foreground">
                {selectedTopic.conclusion.sharedPoint}
              </p>
            </div>

            <div className="border border-border bg-card p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-primary">Mi tér el?</p>
              <p className="mt-3 text-[14px] leading-[1.7] text-muted-foreground">
                {selectedTopic.conclusion.differencePoint}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-px bg-border xl:grid-cols-3">
            {MEDIA_COLUMNS.map((column) => (
              <section key={column.id} className="min-h-full bg-card">
                <div className={`border-b border-border border-l-4 ${column.accent} px-4 py-4 sm:px-5`}>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-primary">{column.title}</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">{column.sources}</p>
                </div>

                <div className="space-y-4 p-4 sm:p-5">
                  {selectedTopic.entries[column.id].map((entry) => (
                    <article
                      key={`${column.id}-${entry.source}-${entry.headline}`}
                      className="border border-border bg-secondary/35 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-accent">{entry.source}</p>
                          <a
                            href={getCoverageLink(entry)}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-block font-display text-[18px] font-bold leading-tight text-foreground transition-colors hover:text-accent"
                          >
                            {entry.headline}
                          </a>
                        </div>
                        <span className="border border-border bg-card px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                          {entry.tone}
                        </span>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-end">
                          <a
                            href={getCoverageLink(entry)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] uppercase tracking-[0.18em] text-accent transition-colors hover:text-[#A01E30]"
                          >
                            Cikk megnyitása
                          </a>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-primary">Megközelítés</p>
                          <p className="mt-1 text-[14px] leading-[1.6] text-muted-foreground">{entry.angle}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-primary">Keretezés</p>
                          <p className="mt-1 text-[14px] leading-[1.6] text-muted-foreground">{entry.framing}</p>
                        </div>
                        <div className="border border-border bg-card p-3">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-primary">Mit látunk ebből?</p>
                          <p className="mt-1 text-[14px] leading-[1.6] text-muted-foreground">{entry.note}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
