import { Article, Conflict, MarketData } from '@/lib/supabase';

export type SummaryWindowId = '1h' | '1d' | '1w' | '1m';

export interface SummaryWindowOption {
  id: SummaryWindowId;
  label: string;
  hours: number;
}

export interface SummarySection {
  title: string;
  bullets: string[];
}

export interface SummaryDocument {
  title: string;
  subtitle: string;
  generatedAtLabel: string;
  sections: SummarySection[];
}

export const SUMMARY_WINDOWS: SummaryWindowOption[] = [
  { id: '1h', label: 'Last 1 hour', hours: 1 },
  { id: '1d', label: 'Last 1 day', hours: 24 },
  { id: '1w', label: 'Last 1 week', hours: 24 * 7 },
  { id: '1m', label: 'Last 1 month', hours: 24 * 30 },
];

const CATEGORY_KEYWORDS = {
  politics: ['politic', 'government', 'election', 'parliament', 'diplom', 'policy', 'sanction', 'president', 'minister', 'kormany', 'valaszt', 'parlament', 'szankci'],
  disaster: ['storm', 'flood', 'earthquake', 'wildfire', 'hurricane', 'typhoon', 'heatwave', 'weather', 'disaster', 'arviz', 'foldrenges', 'vihar', 'hoseg', 'tuz'],
  scienceTech: ['ai', 'artificial intelligence', 'tech', 'technology', 'chip', 'space', 'nasa', 'spacex', 'research', 'medical', 'health', 'vaccine', 'science', 'orvosi', 'egeszseg', 'kutatas'],
  cultureSociety: ['viral', 'trend', 'celebrity', 'culture', 'society', 'movie', 'music', 'obituary', 'court', 'legal', 'supreme court', 'birosag', 'per', 'halala', 'kultura'],
  opinion: ['analysis', 'opinion', 'editorial', 'commentary', 'column', 'elemzes', 'velemeny', 'kommentar'],
  hungary: ['hungary', 'hungarian', 'budapest', 'forint', 'orb', 'magyar', 'magyarorszag', 'budap'],
  finance: ['market', 'economy', 'stock', 'crypto', 'inflation', 'rate', 'oil', 'gold', 'currency', 'forex', 'gazdasag', 'tozsde', 'reszveny', 'deviza', 'olaj', 'arany'],
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function toTopicList(topics: Article['topics']): string[] {
  if (!topics) return [];
  if (Array.isArray(topics)) return topics;
  return String(topics).split(',').map((item) => item.trim()).filter(Boolean);
}

function articleText(article: Article) {
  return normalizeText([
    article.title,
    article.summary,
    article.source,
    article.hungary_impact,
    toTopicList(article.topics).join(' '),
  ].filter(Boolean).join(' '));
}

function matchesKeywordGroup(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function formatWhen(date: string) {
  return new Date(date).toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function uniq<T>(items: T[]) {
  return Array.from(new Set(items));
}

function latestBySymbol(rows: MarketData[]) {
  const bySymbol = new Map<string, MarketData>();
  for (const row of rows) {
    const existing = bySymbol.get(row.symbol);
    if (!existing || new Date(row.recorded_at).getTime() > new Date(existing.recorded_at).getTime()) {
      bySymbol.set(row.symbol, row);
    }
  }
  return Array.from(bySymbol.values());
}

function pickMarket(rows: MarketData[], symbols: string[]) {
  const latest = latestBySymbol(rows);
  return symbols.map((symbol) => latest.find((row) => row.symbol === symbol)).filter(Boolean) as MarketData[];
}

function formatMarketRow(row: MarketData) {
  const signedChange = Number.isFinite(row.change_percent) ? `${row.change_percent >= 0 ? '+' : ''}${row.change_percent.toFixed(2)}%` : 'n/a';
  return `${row.symbol}: ${row.price.toLocaleString('en-US', { maximumFractionDigits: row.price >= 100 ? 2 : 4 })} ${row.currency} (${signedChange})`;
}

function averageSentiment(articles: Article[]) {
  if (articles.length === 0) return 0;
  const total = articles.reduce((sum, article) => sum + (article.sentiment_score || 0), 0);
  return total / articles.length;
}

function sentimentLabel(value: number) {
  if (value >= 0.2) return 'mostly positive';
  if (value <= -0.2) return 'mostly negative';
  return 'mixed to neutral';
}

function buildTopThemeSummary(articles: Article[]) {
  const themes = new Map<string, number>();

  for (const article of articles) {
    for (const topic of toTopicList(article.topics)) {
      themes.set(topic, (themes.get(topic) || 0) + 1);
    }
  }

  const topThemes = Array.from(themes.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([theme]) => theme);

  if (topThemes.length === 0) {
    return 'Coverage is dispersed, with no single dominant theme in the selected period.';
  }

  return `Commentary and reporting are clustering around ${topThemes.join(', ')}.`;
}

function articleBullet(article: Article) {
  return `${article.title} (${article.source}, ${formatWhen(article.published_at)})`;
}

function buildSection(title: string, bullets: string[]): SummarySection {
  return {
    title,
    bullets: bullets.length > 0 ? bullets : ['No strong signals were available in the selected period from the current dataset.'],
  };
}

export function filterSummaryData(
  articles: Article[],
  conflicts: Conflict[],
  marketData: MarketData[],
  windowId: SummaryWindowId,
) {
  const selectedWindow = SUMMARY_WINDOWS.find((item) => item.id === windowId) || SUMMARY_WINDOWS[1];
  const cutoff = Date.now() - selectedWindow.hours * 60 * 60 * 1000;

  return {
    selectedWindow,
    articles: articles.filter((article) => new Date(article.published_at).getTime() >= cutoff),
    conflicts: conflicts.filter((conflict) => new Date(conflict.event_date).getTime() >= cutoff),
    marketData: marketData.filter((entry) => new Date(entry.recorded_at).getTime() >= cutoff),
  };
}

export function buildSummaryDocument(
  articles: Article[],
  conflicts: Conflict[],
  marketData: MarketData[],
  windowLabel: string,
): SummaryDocument {
  const sortedArticles = [...articles].sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
  const normalizedArticles = sortedArticles.map((article) => ({ article, text: articleText(article) }));
  const topHeadlines = sortedArticles.slice(0, 6).map(articleBullet);
  const conflictArticles = normalizedArticles
    .filter(({ text }) => matchesKeywordGroup(text, ['war', 'conflict', 'attack', 'military', 'drone', 'ceasefire', 'haboru', 'konflikt', 'tamad', 'tuzszunet']))
    .slice(0, 5)
    .map(({ article }) => articleBullet(article));
  const disasterArticles = normalizedArticles
    .filter(({ text }) => matchesKeywordGroup(text, CATEGORY_KEYWORDS.disaster))
    .slice(0, 4)
    .map(({ article }) => articleBullet(article));
  const scienceArticles = normalizedArticles
    .filter(({ text }) => matchesKeywordGroup(text, CATEGORY_KEYWORDS.scienceTech))
    .slice(0, 5)
    .map(({ article }) => articleBullet(article));
  const cultureArticles = normalizedArticles
    .filter(({ text }) => matchesKeywordGroup(text, CATEGORY_KEYWORDS.cultureSociety))
    .slice(0, 5)
    .map(({ article }) => articleBullet(article));
  const hungaryArticles = normalizedArticles
    .filter(({ article, text }) => article.affects_hungary || matchesKeywordGroup(text, CATEGORY_KEYWORDS.hungary))
    .slice(0, 5)
    .map(({ article }) => articleBullet(article));

  const financeArticles = normalizedArticles
    .filter(({ text }) => matchesKeywordGroup(text, CATEGORY_KEYWORDS.finance))
    .slice(0, 4)
    .map(({ article }) => articleBullet(article));

  const opinionArticles = normalizedArticles
    .filter(({ text }) => matchesKeywordGroup(text, CATEGORY_KEYWORDS.opinion) || matchesKeywordGroup(text, CATEGORY_KEYWORDS.politics))
    .slice(0, 4)
    .map(({ article }) => articleBullet(article));

  const majorIndexes = pickMarket(marketData, ['^GSPC', '^IXIC', '^GDAXI', 'BUX']);
  const movers = latestBySymbol(marketData)
    .filter((row) => /^[A-Z-]{1,6}$/.test(row.symbol))
    .sort((a, b) => b.change_percent - a.change_percent);
  const topGainers = movers.slice(0, 3).map(formatMarketRow);
  const topLosers = [...movers].reverse().slice(0, 3).map(formatMarketRow);
  const crypto = pickMarket(marketData, ['BTC', 'ETH']).map(formatMarketRow);
  const fx = pickMarket(marketData, ['EUR/USD', 'EUR/HUF', 'USD/HUF', 'GBP/HUF']).map(formatMarketRow);
  const commodities = pickMarket(marketData, ['OIL', 'GOLD', 'WHEAT', 'ARANY']).map(formatMarketRow);

  const totalFatalities = conflicts.reduce((sum, conflict) => sum + (conflict.fatalities || 0), 0);
  const conflictBullets = uniq([
    conflicts.length > 0 ? `${conflicts.length} active conflict hotspots were tracked in the selected period.` : '',
    totalFatalities > 0 ? `Reported fatalities across tracked hotspots: ${totalFatalities.toLocaleString('en-US')}.` : '',
    ...conflicts.slice(0, 4).map((conflict) => `${conflict.location}, ${conflict.country}: ${conflict.description}`),
  ].filter(Boolean));

  const avgSentiment = averageSentiment(sortedArticles);
  const generatedAt = new Date();

  const sections: SummarySection[] = [
    buildSection('News & World', [
      `Top headlines: ${topHeadlines.length} notable stories were captured in this ${windowLabel.toLowerCase()} window.`,
      ...topHeadlines,
      ...buildSection('Conflict & war updates', conflictBullets).bullets,
      ...buildSection('Natural disasters / weather events', disasterArticles).bullets,
    ]),
    buildSection('Finance & Economy', [
      ...buildSection('Stock market summary', majorIndexes.map(formatMarketRow)).bullets,
      ...buildSection('Top gaining stocks', topGainers).bullets,
      ...buildSection('Top losing stocks', topLosers).bullets,
      ...buildSection('Crypto prices', crypto).bullets,
      ...buildSection('Currency exchange rates', fx).bullets,
      ...buildSection('Commodity prices', commodities).bullets,
      ...financeArticles,
    ]),
    buildSection('Science & Tech', [
      ...buildSection('AI & tech breakthroughs', scienceArticles).bullets,
      'Space news and health research are included when relevant stories appear in the tracked feed.',
    ]),
    buildSection('Culture & Society', [
      ...buildSection('Viral / trending topics', cultureArticles).bullets,
      'Obituaries and major court decisions appear here when they are present in the monitored articles.',
    ]),
    buildSection('Opinion & Analysis', [
      buildTopThemeSummary(sortedArticles),
      `Sentiment analysis: coverage looks ${sentimentLabel(avgSentiment)} with an average sentiment score of ${avgSentiment.toFixed(2)}.`,
      ...opinionArticles,
    ]),
    buildSection('Local: Hungary', [
      ...buildSection('Hungarian political news', hungaryArticles).bullets,
      ...buildSection('Forint exchange rate', pickMarket(marketData, ['EUR/HUF', 'USD/HUF']).map(formatMarketRow)).bullets,
      'Local weather summary: no dedicated weather dataset is currently connected, so this export can only surface weather-related stories found in the news feed.',
    ]),
  ];

  return {
    title: 'PULZUS Intelligence Summary',
    subtitle: `Selected period: ${windowLabel}`,
    generatedAtLabel: generatedAt.toLocaleString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    sections,
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildPrintableSummaryHtml(document: SummaryDocument) {
  const sectionMarkup = document.sections.map((section) => `
    <section class="section">
      <h2>${escapeHtml(section.title)}</h2>
      <ul>
        ${section.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}
      </ul>
    </section>
  `).join('');

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(document.title)}</title>
        <style>
          :root {
            color-scheme: light;
            --ink: #101010;
            --muted: #5d5a57;
            --line: #d9d1c8;
            --accent: #b21e35;
            --paper: #f6f0e7;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: Georgia, "Times New Roman", serif;
            background: var(--paper);
            color: var(--ink);
          }
          .page {
            max-width: 960px;
            margin: 0 auto;
            padding: 40px 36px 60px;
          }
          header {
            border-bottom: 3px solid var(--accent);
            padding-bottom: 18px;
            margin-bottom: 28px;
          }
          .eyebrow {
            font: 700 11px/1.2 Arial, sans-serif;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            color: var(--accent);
          }
          h1 {
            margin: 10px 0 8px;
            font-size: 34px;
            line-height: 1.05;
            text-transform: uppercase;
          }
          .meta {
            font: 12px/1.6 Arial, sans-serif;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--muted);
          }
          .section {
            break-inside: avoid;
            border: 1px solid var(--line);
            padding: 18px 20px;
            margin-bottom: 16px;
            background: rgba(255, 255, 255, 0.55);
          }
          h2 {
            margin: 0 0 12px;
            font-size: 18px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          ul {
            margin: 0;
            padding-left: 18px;
          }
          li {
            margin: 0 0 8px;
            line-height: 1.5;
            font-size: 14px;
          }
          @media print {
            body { background: #fff; }
            .page { padding: 20px 16px 28px; }
          }
        </style>
      </head>
      <body>
        <main class="page">
          <header>
            <div class="eyebrow">Pulzus briefing export</div>
            <h1>${escapeHtml(document.title)}</h1>
            <div class="meta">${escapeHtml(document.subtitle)} | Generated ${escapeHtml(document.generatedAtLabel)}</div>
          </header>
          ${sectionMarkup}
        </main>
      </body>
    </html>
  `;
}
