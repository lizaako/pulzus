import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Article } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface MediaLensPanelProps {
  articles: Article[];
}

interface NarrativeSeedArticle {
  title: string;
  source: string;
  summary: string;
  url: string;
  published_at: string;
}

interface NarrativePreset {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  fallbackArticles: NarrativeSeedArticle[];
}

interface DisplayArticle {
  id: string;
  title: string;
  source: string;
  summary: string;
  url: string;
  published_at: string;
  isFallback?: boolean;
}

const NARRATIVE_PRESETS: NarrativePreset[] = [
  {
    id: 'ukraine-russia',
    title: 'Ukrajna és Oroszország',
    description: 'Háborús események, diplomácia, szankciók és fronthelyzet kulcsszavas követése.',
    keywords: ['ukrajna', 'oroszország', 'ukraine', 'russia', 'zelenszkij', 'putyin', 'front', 'háború'],
    fallbackArticles: [
      {
        title: 'Reuters háttér: újabb diplomáciai egyeztetések az ukrajnai háborúról',
        source: 'Reuters',
        summary: 'Összefoglaló cikk a fronthelyzet, a nyugati támogatások és a tárgyalási nyomás alakulásáról.',
        url: 'https://www.reuters.com/world/europe/',
        published_at: '2026-04-10T08:00:00Z',
      },
      {
        title: 'BBC elemzés: hogyan változik a nyugati narratíva az ukrán támogatásról',
        source: 'BBC',
        summary: 'A cikk azt vizsgálja, hogyan változik a közbeszéd a katonai és pénzügyi támogatások körül.',
        url: 'https://www.bbc.com/news/world-europe',
        published_at: '2026-04-08T09:30:00Z',
      },
    ],
  },
  {
    id: 'eu-hungary',
    title: 'EU és Magyarország',
    description: 'Jogállamiság, uniós pénzek, vétók és magyar belpolitikai következmények keresése.',
    keywords: ['eu', 'európai unió', 'brüsszel', 'magyarország', 'jogállam', 'uniós pénz', 'vétó', 'orbán'],
    fallbackArticles: [
      {
        title: 'Politico Europe: új vita az uniós források és a magyar jogállamisági vita körül',
        source: 'Politico Europe',
        summary: 'Az anyag az EU-intézmények és a magyar kormány közti legfontosabb ütközési pontokat veszi végig.',
        url: 'https://www.politico.eu/',
        published_at: '2026-04-11T07:45:00Z',
      },
      {
        title: 'Telex összefoglaló: mit jelentene a források felszabadítása a magyar gazdaságnak',
        source: 'Telex',
        summary: 'Hazai szemszögből bemutatott összefoglaló az uniós pénzek politikai és gazdasági hatásairól.',
        url: 'https://telex.hu/',
        published_at: '2026-04-07T12:20:00Z',
      },
    ],
  },
  {
    id: 'migration-security',
    title: 'Migráció és Biztonság',
    description: 'Határvédelem, bevándorlás, bűnözés és nemzetbiztonsági framing vizsgálata.',
    keywords: ['migráció', 'bevándorlás', 'határ', 'menekült', 'biztonság', 'border', 'migration'],
    fallbackArticles: [
      {
        title: 'AP háttér: európai migrációs viták és határvédelmi intézkedések',
        source: 'AP News',
        summary: 'Nemzetközi kitekintés a migráció kezelésének politikai és társadalmi kereteire.',
        url: 'https://apnews.com/',
        published_at: '2026-04-06T14:10:00Z',
      },
      {
        title: 'Magyar Nemzet véleménycikk: a határvédelem politikai súlya itthon',
        source: 'Magyar Nemzet',
        summary: 'Hazai narratíva a biztonság, szuverenitás és bevándorláspolitika összekapcsolásáról.',
        url: 'https://magyarnemzet.hu/',
        published_at: '2026-04-05T06:50:00Z',
      },
    ],
  },
  {
    id: 'economy-inflation',
    title: 'Gazdaság és Infláció',
    description: 'Árak, bérek, forint, költségvetés és megélhetési narratívák kereshető blokkja.',
    keywords: ['infláció', 'gazdaság', 'forint', 'árak', 'bérek', 'költségvetés', 'adó', 'megélhetés'],
    fallbackArticles: [
      {
        title: 'Portfolio elemzés: merre mehet az infláció és a forint tavasszal',
        source: 'Portfolio',
        summary: 'Piaci fókuszú összefoglaló az árstabilitásról, kamatokról és a forint mozgásáról.',
        url: 'https://www.portfolio.hu/',
        published_at: '2026-04-09T10:00:00Z',
      },
      {
        title: 'HVG háttér: hogyan jelenik meg a megélhetési válság a politikai kommunikációban',
        source: 'HVG',
        summary: 'A cikk azt mutatja be, miként keretezik a szereplők a bérek és az árak kérdését.',
        url: 'https://hvg.hu/',
        published_at: '2026-04-04T15:40:00Z',
      },
    ],
  },
];

function normalizeText(value: string | null | undefined) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('hu-HU', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function articleSearchText(article: Article) {
  const topics = Array.isArray(article.topics) ? article.topics.join(' ') : article.topics || '';
  return normalizeText([
    article.title,
    article.summary,
    article.source,
    article.hungary_impact,
    topics,
  ].join(' '));
}

function presetSearchText(preset: NarrativePreset) {
  return normalizeText([preset.title, preset.description, preset.keywords.join(' ')].join(' '));
}

function matchesKeyword(text: string, keyword: string) {
  if (!keyword) return true;
  return text.includes(normalizeText(keyword));
}

export default function MediaLensPanel({ articles }: MediaLensPanelProps) {
  const [query, setQuery] = useState('');

  const narrativeCards = useMemo(() => {
    const normalizedQuery = normalizeText(query);

    return NARRATIVE_PRESETS
      .map((preset) => {
        const matchingLiveArticles = articles
          .filter((article) => {
            const haystack = articleSearchText(article);
            const matchesPreset = preset.keywords.some((keyword) => haystack.includes(normalizeText(keyword)));
            const matchesSearch = !normalizedQuery || matchesKeyword(haystack, normalizedQuery) || matchesKeyword(presetSearchText(preset), normalizedQuery);
            return matchesPreset && matchesSearch;
          })
          .slice(0, 4)
          .map<DisplayArticle>((article) => ({
            id: article.id,
            title: article.title,
            source: article.source,
            summary: article.summary,
            url: article.url,
            published_at: article.published_at,
          }));

        const matchingFallbackArticles = preset.fallbackArticles
          .filter((article) => {
            const haystack = normalizeText([article.title, article.summary, article.source].join(' '));
            return !normalizedQuery || matchesKeyword(haystack, normalizedQuery) || matchesKeyword(presetSearchText(preset), normalizedQuery);
          })
          .map<DisplayArticle>((article, index) => ({
            id: `${preset.id}-fallback-${index}`,
            title: article.title,
            source: article.source,
            summary: article.summary,
            url: article.url,
            published_at: article.published_at,
            isFallback: true,
          }));

        const seenUrls = new Set(matchingLiveArticles.map((article) => article.url));
        const mergedArticles = [
          ...matchingLiveArticles,
          ...matchingFallbackArticles.filter((article) => !seenUrls.has(article.url)),
        ].slice(0, 4);

        const presetMatchesSearch = !normalizedQuery || matchesKeyword(presetSearchText(preset), normalizedQuery);

        return {
          ...preset,
          articles: mergedArticles,
          visible: presetMatchesSearch || mergedArticles.length > 0,
        };
      })
      .filter((preset) => preset.visible);
  }, [articles, query]);

  return (
    <div className="glass-panel overflow-hidden">
      <div className="border-b border-border px-6 py-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Média összevetés</p>
            <h2 className="font-display text-3xl font-extrabold tracking-[-0.03em] text-foreground">Narratívák</h2>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Kulcsszavas kereséssel böngészhető narratíva-felület. A találatokhoz az élő cikkek mellé mintacikkeket is adunk, hogy backend nélkül is használható legyen.
          </p>
        </div>

        <div className="mt-5">
          <div className="relative max-w-2xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Keress kulcsszóra: infláció, Ukrajna, EU, migráció..."
              className="h-12 rounded-none border-border bg-card pl-11 text-base"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {['infláció', 'Ukrajna', 'EU', 'migráció', 'forint', 'Orbán'].map((keyword) => (
              <button
                key={keyword}
                type="button"
                onClick={() => setQuery(keyword)}
                className="border border-border bg-secondary px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                {keyword}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-6">
          {narrativeCards.map((card) => (
            <section key={card.id} className="border border-border bg-card">
              <div className="border-b border-border px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="font-display text-2xl font-bold text-foreground">{card.title}</h3>
                    <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{card.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {card.keywords.map((keyword) => (
                      <Badge
                        key={keyword}
                        variant="outline"
                        className="rounded-none border-primary/30 bg-primary/5 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-foreground"
                      >
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-2">
                {card.articles.length > 0 ? card.articles.map((article) => (
                  <article key={article.id} className="border border-border bg-secondary/35 p-4">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      <span>{article.source}</span>
                      <span>•</span>
                      <span>{formatDateTime(article.published_at)}</span>
                      {article.isFallback && (
                        <>
                          <span>•</span>
                          <span>Minta cikk</span>
                        </>
                      )}
                    </div>
                    <h4 className="mt-3 text-base font-semibold leading-snug text-foreground">{article.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{article.summary}</p>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex text-xs uppercase tracking-[0.16em] text-primary hover:underline"
                    >
                      Cikk megnyitása
                    </a>
                  </article>
                )) : (
                  <div className="border border-dashed border-border px-4 py-6 text-sm text-muted-foreground lg:col-span-2">
                    Ehhez a narratívához most nincs találat a megadott kulcsszóra.
                  </div>
                )}
              </div>
            </section>
          ))}

          {narrativeCards.length === 0 && (
            <div className="border border-dashed border-border px-6 py-10 text-center text-muted-foreground">
              Nincs találat a megadott kulcsszóra. Probald meg például: infláció, Ukrajna, EU vagy migráció.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
