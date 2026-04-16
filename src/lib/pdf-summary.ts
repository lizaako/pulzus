import { Article, Conflict, MarketData } from '@/lib/supabase';

/* ─────────────────────────────── TYPES ────────────────────────────────── */

export type SummaryWindowId = '1h' | '1d' | '1w' | '1m';

export interface SummaryWindowOption {
  id: SummaryWindowId;
  label: string;
  shortLabel: string;
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

/* ───────────────────────────── CONFIG ─────────────────────────────────── */

export const SUMMARY_WINDOWS: SummaryWindowOption[] = [
  { id: '1h', label: 'Elmúlt 1 óra',   shortLabel: '1 óra',   hours: 1 },
  { id: '1d', label: 'Elmúlt 24 óra',  shortLabel: '24 óra',  hours: 24 },
  { id: '1w', label: 'Elmúlt 1 hét',   shortLabel: '1 hét',   hours: 24 * 7 },
  { id: '1m', label: 'Elmúlt 1 hónap', shortLabel: '1 hónap', hours: 24 * 30 },
];

const CATEGORY_KEYWORDS = {
  politics:       ['politic','government','election','parliament','diplom','policy','sanction','president','minister','kormany','valaszt','parlament','szankci'],
  disaster:       ['storm','flood','earthquake','wildfire','hurricane','typhoon','heatwave','weather','disaster','arviz','foldrenges','vihar','hoseg','tuz'],
  scienceTech:    ['ai','artificial intelligence','tech','technology','chip','space','nasa','spacex','research','medical','health','vaccine','science','orvosi','egeszseg','kutatas'],
  cultureSociety: ['viral','trend','celebrity','culture','society','movie','music','obituary','court','legal','supreme court','birosag','per','halala','kultura'],
  opinion:        ['analysis','opinion','editorial','commentary','column','elemzes','velemeny','kommentar'],
  hungary:        ['hungary','hungarian','budapest','forint','orb','magyar','magyarorszag','budap'],
  finance:        ['market','economy','stock','crypto','inflation','rate','oil','gold','currency','forex','gazdasag','tozsde','reszveny','deviza','olaj','arany'],
};

/* ──────────────────────────── UTILITIES ───────────────────────────────── */

function normalizeText(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function toTopicList(topics: Article['topics']): string[] {
  if (!topics) return [];
  if (Array.isArray(topics)) return topics;
  return String(topics).split(',').map(t => t.trim()).filter(Boolean);
}

function articleText(article: Article) {
  return normalizeText(
    [article.title, article.summary, article.source, article.hungary_impact, toTopicList(article.topics).join(' ')]
      .filter(Boolean).join(' ')
  );
}

function matchesKeywordGroup(text: string, keywords: string[]) {
  return keywords.some(k => text.includes(k));
}

function uniq<T>(items: T[]) { return Array.from(new Set(items)); }

function latestBySymbol(rows: MarketData[]) {
  const map = new Map<string, MarketData>();
  for (const r of rows) {
    const ex = map.get(r.symbol);
    if (!ex || new Date(r.recorded_at).getTime() > new Date(ex.recorded_at).getTime()) map.set(r.symbol, r);
  }
  return Array.from(map.values());
}

function pickMarket(rows: MarketData[], symbols: string[]) {
  const latest = latestBySymbol(rows);
  return symbols.map(s => latest.find(r => r.symbol === s)).filter(Boolean) as MarketData[];
}

/**
 * Like pickMarket, but recomputes change_percent from the actual stored price
 * history within the filtered time window — fixes the FX 0% problem caused by
 * the Frankfurter API returning the same rate when today's data isn't yet live.
 */
function pickMarketEnriched(rows: MarketData[], symbols: string[]): MarketData[] {
  // Build per-symbol history sorted oldest → newest
  const historyMap = new Map<string, MarketData[]>();
  for (const r of rows) {
    if (!historyMap.has(r.symbol)) historyMap.set(r.symbol, []);
    historyMap.get(r.symbol)!.push(r);
  }
  for (const [sym, hist] of historyMap) {
    historyMap.set(sym, hist.sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()));
  }

  return symbols.map(sym => {
    const hist = historyMap.get(sym);
    if (!hist || hist.length === 0) return null;
    const latest = hist[hist.length - 1];
    if (hist.length < 2) return latest; // only one data point: use stored value
    const oldest = hist[0].price;
    const newest = latest.price;
    if (!Number.isFinite(oldest) || oldest === 0) return latest;
    return { ...latest, change_percent: ((newest - oldest) / oldest) * 100 };
  }).filter((r): r is MarketData => r !== null);
}

/** Enrich ALL symbols from a set of rows with window-computed change_percent. */
function enrichAll(rows: MarketData[]): MarketData[] {
  const symbols = [...new Set(rows.map(r => r.symbol))];
  return pickMarketEnriched(rows, symbols);
}

function escapeHtml(value: string) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ─────────────────────────── FILTER (public) ──────────────────────────── */

export function filterSummaryData(
  articles:   Article[],
  conflicts:  Conflict[],
  marketData: MarketData[],
  windowId:   SummaryWindowId,
) {
  const selectedWindow = SUMMARY_WINDOWS.find(w => w.id === windowId) ?? SUMMARY_WINDOWS[1];
  const cutoff = Date.now() - selectedWindow.hours * 60 * 60 * 1000;
  return {
    selectedWindow,
    articles:   articles.filter(a => new Date(a.published_at).getTime() >= cutoff),
    conflicts:  conflicts.filter(c => new Date(c.event_date).getTime() >= cutoff),
    marketData: marketData.filter(m => new Date(m.recorded_at).getTime() >= cutoff),
  };
}

/* ─────────────────────── LEGACY buildSummaryDocument (compat) ─────────── */

function formatWhen(date: string) {
  return new Date(date).toLocaleString('hu-HU', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}

function formatMarketRowLegacy(row: MarketData) {
  const ch = Number.isFinite(row.change_percent) ? `${row.change_percent >= 0 ? '+' : ''}${row.change_percent.toFixed(2)}%` : 'n/a';
  return `${row.symbol}: ${row.price.toLocaleString('en-US', { maximumFractionDigits: row.price >= 100 ? 2 : 4 })} ${row.currency} (${ch})`;
}

function buildSection(title: string, bullets: string[]): SummarySection {
  return { title, bullets: bullets.length > 0 ? bullets : ['Nincs elegendő adat a kiválasztott időszakból.'] };
}

export function buildSummaryDocument(articles: Article[], conflicts: Conflict[], marketData: MarketData[], windowLabel: string): SummaryDocument {
  const sorted = [...articles].sort((a,b) => new Date(b.published_at).getTime()-new Date(a.published_at).getTime());
  const norm   = sorted.map(a => ({ a, t: articleText(a) }));
  const bl     = (a: Article) => `${a.title} (${a.source}, ${formatWhen(a.published_at)})`;
  const ind    = pickMarket(marketData,['^GSPC','^IXIC','^GDAXI','BUX']).map(formatMarketRowLegacy);
  const movers = latestBySymbol(marketData).filter(r=>/^[A-Z-]{1,6}$/.test(r.symbol)).sort((a,b)=>b.change_percent-a.change_percent);
  const avg    = sorted.length ? sorted.reduce((s,a)=>s+(a.sentiment_score||0),0)/sorted.length : 0;
  return {
    title: 'PULZUS Hírszerzési Összefoglaló',
    subtitle: `Időszak: ${windowLabel}`,
    generatedAtLabel: new Date().toLocaleString('hu-HU',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}),
    sections: [
      buildSection('Hírek & Világ', [
        `${sorted.slice(0,6).map(bl).join('\n')}`,
        ...norm.filter(({t})=>matchesKeywordGroup(t,['war','conflict','attack','military','drone','ceasefire'])).slice(0,4).map(({a})=>bl(a)),
      ]),
      buildSection('Pénzügy & Gazdaság', [
        ...ind,
        ...movers.slice(0,3).map(formatMarketRowLegacy),
        ...[...movers].reverse().slice(0,3).map(formatMarketRowLegacy),
      ]),
      buildSection('Tudomány & Tech',   norm.filter(({t})=>matchesKeywordGroup(t,CATEGORY_KEYWORDS.scienceTech)).slice(0,5).map(({a})=>bl(a))),
      buildSection('Magyarország',      uniq([...norm.filter(({a,t})=>a.affects_hungary||matchesKeywordGroup(t,CATEGORY_KEYWORDS.hungary)).slice(0,5).map(({a})=>bl(a))])),
      buildSection('Elemzések',         [`Átlagos hangulat pontszám: ${avg>=0?'+':''}${avg.toFixed(2)}`, ...norm.filter(({t})=>matchesKeywordGroup(t,CATEGORY_KEYWORDS.opinion)).slice(0,4).map(({a})=>bl(a))]),
    ],
  };
}

/* ──────────────────── CHART / FORMATTING HELPERS ──────────────────────── */

function sentimentColor(score: number) { return score>=0.2?'#16a34a':score<=-0.2?'#dc2626':'#9ca3af'; }

function sentimentLabelHu(score: number) {
  if (score>=0.4)  return 'Erősen pozitív';
  if (score>=0.2)  return 'Inkább pozitív';
  if (score<=-0.4) return 'Erősen negatív';
  if (score<=-0.2) return 'Inkább negatív';
  return 'Vegyes / Semleges';
}

function changeColor(pct: number) { return pct>=0?'#16a34a':'#dc2626'; }

function fmtPrice(price: number) {
  if (!Number.isFinite(price)) return 'n/a';
  if (price>=10000) return price.toLocaleString('hu-HU',{maximumFractionDigits:0});
  if (price>=100)   return price.toLocaleString('hu-HU',{maximumFractionDigits:2});
  return price.toFixed(4);
}

function fmtChange(pct: number) {
  if (!Number.isFinite(pct)) return '–';
  return `${pct>=0?'+':''}${pct.toFixed(2)}%`;
}

function changeBar(pct: number) {
  if (!Number.isFinite(pct)) return '';
  const abs   = Math.min(Math.abs(pct),12);
  const width = ((abs/12)*100).toFixed(0);
  const color = pct>=0?'#16a34a':'#dc2626';
  const bg    = pct>=0?'#dcfce7':'#fee2e2';
  return `<div style="display:flex;align-items:center;gap:4px;">
    <div style="width:52px;height:7px;background:${bg};border-radius:2px;overflow:hidden;">
      <div style="width:${width}%;height:100%;background:${color};border-radius:2px;"></div>
    </div>
    <span style="font-size:9px;color:${color};">${pct>=0?'▲':'▼'}</span>
  </div>`;
}

function polarToCart(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg*Math.PI)/180;
  return { x: cx+r*Math.cos(rad), y: cy+r*Math.sin(rad) };
}

function svgDonut(slices: Array<{value:number;color:string;label:string}>) {
  const total = slices.reduce((s,sl)=>s+sl.value,0);
  if (total===0) return '<p style="font-size:11px;color:#888;padding:8px 0">Nincs elegendő adat.</p>';

  const r=32,cx=40,cy=40;
  let angle=-90, paths='';

  for (const sl of slices) {
    if (sl.value===0) continue;
    const deg  = (sl.value/total)*360;
    const s    = polarToCart(cx,cy,r,angle);
    const e    = polarToCart(cx,cy,r,angle+deg-0.3);
    const large = deg>180?1:0;
    paths += `<path d="M ${cx} ${cy} L ${s.x.toFixed(1)} ${s.y.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(1)} ${e.y.toFixed(1)} Z" fill="${sl.color}" stroke="white" stroke-width="2"/>`;
    angle += deg;
  }

  const legend = slices
    .filter(s=>s.value>0)
    .sort((a,b)=>b.value-a.value)
    .map(s=>{
      const pct=((s.value/total)*100).toFixed(0);
      return `<div style="display:flex;align-items:center;gap:5px;font-size:9px;">
        <div style="width:7px;height:7px;background:${s.color};border-radius:1px;flex-shrink:0;"></div>
        <span style="color:#444;flex:1;">${s.label}</span>
        <span style="font-weight:700;color:#222;">${pct}%</span>
      </div>`;
    }).join('');

  return `<div style="display:flex;align-items:center;gap:12px;margin-top:6px;">
    <svg width="80" height="80" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;">
      ${paths}
      <circle cx="${cx}" cy="${cy}" r="${Math.round(r*0.52)}" fill="white"/>
    </svg>
    <div style="display:flex;flex-direction:column;gap:4px;">${legend}</div>
  </div>`;
}

function sentimentBar(pos: number, neg: number, neu: number) {
  const total = pos+neg+neu||1;
  const p=((pos/total)*100).toFixed(1);
  const n=((neg/total)*100).toFixed(1);
  const u=((neu/total)*100).toFixed(1);
  return `<div style="height:13px;display:flex;border-radius:3px;overflow:hidden;margin:8px 0 5px;">
    <div style="width:${p}%;background:#16a34a;"></div>
    <div style="width:${u}%;background:#d1d5db;"></div>
    <div style="width:${n}%;background:#dc2626;"></div>
  </div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;">
    <span style="font-size:9px;font-weight:700;color:#16a34a;">▮ Pozitív ${p}%</span>
    <span style="font-size:9px;font-weight:700;color:#9ca3af;">▮ Semleges ${u}%</span>
    <span style="font-size:9px;font-weight:700;color:#dc2626;">▮ Negatív ${n}%</span>
  </div>`;
}

function mktSection(rows: MarketData[], title: string, color: string) {
  if (rows.length===0) return '';
  const tbody = rows.map(r=>`<tr>
    <td style="padding:4px 0;font-size:10px;font-weight:700;font-family:monospace;color:#222;">${escapeHtml(r.symbol)}</td>
    <td style="padding:4px 0;font-size:10px;font-weight:600;text-align:right;white-space:nowrap;">${fmtPrice(r.price)}&nbsp;<span style="font-size:8px;color:#999;">${escapeHtml(r.currency)}</span></td>
    <td style="padding:4px 0;text-align:right;font-size:10px;font-weight:700;color:${changeColor(r.change_percent)};width:52px;white-space:nowrap;">${fmtChange(r.change_percent)}</td>
    <td style="padding:4px 0 4px 6px;width:70px;">${changeBar(r.change_percent)}</td>
  </tr>`).join('');
  return `<div style="margin-bottom:13px;">
    <div style="font-size:8px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:${color};border-bottom:2px solid ${color};padding-bottom:3px;margin-bottom:5px;">${title}</div>
    <table style="width:100%;border-collapse:collapse;"><tbody>${tbody}</tbody></table>
  </div>`;
}

/* ──────────────────── MAIN RICH HTML EXPORT (public) ──────────────────── */

export function buildPrintableSummaryHtml(
  articles:    Article[],
  conflicts:   Conflict[],
  marketData:  MarketData[],
  windowLabel: string,
): string {
  const sorted = [...articles].sort((a,b)=>new Date(b.published_at).getTime()-new Date(a.published_at).getTime());
  const norm   = sorted.map(a=>({a,t:articleText(a)}));

  /* ── stats ── */
  const articleCount  = articles.length;
  const conflictCount = conflicts.length;
  const marketCount   = latestBySymbol(marketData).length;
  const sentArts = sorted.filter(a=>a.sentiment_score!=null);
  const avgSent  = sentArts.length ? sentArts.reduce((s,a)=>s+(a.sentiment_score||0),0)/sentArts.length : 0;
  const posCount = sentArts.filter(a=>(a.sentiment_score||0)>=0.2).length;
  const negCount = sentArts.filter(a=>(a.sentiment_score||0)<=-0.2).length;
  const neuCount = sentArts.length-posCount-negCount;
  const sColor   = sentimentColor(avgSent);
  const sLabel   = sentimentLabelHu(avgSent);

  /* ── article groups ── */
  const topNews  = sorted.slice(0,12);
  const confArts = norm.filter(({t})=>matchesKeywordGroup(t,['war','conflict','attack','military','drone','ceasefire','haboru','konflikt','tamad','tuzszunet'])).slice(0,5).map(({a})=>a);
  const hunArts  = norm.filter(({a,t})=>a.affects_hungary||matchesKeywordGroup(t,CATEGORY_KEYWORDS.hungary)).slice(0,6).map(({a})=>a);
  const sciArts  = norm.filter(({t})=>matchesKeywordGroup(t,CATEGORY_KEYWORDS.scienceTech)).slice(0,5).map(({a})=>a);
  const opArts   = norm.filter(({t})=>matchesKeywordGroup(t,CATEGORY_KEYWORDS.opinion)||matchesKeywordGroup(t,CATEGORY_KEYWORDS.politics)).slice(0,5).map(({a})=>a);

  /* ── category donut ── */
  const CAT_DEF: Array<{label:string;key:keyof typeof CATEGORY_KEYWORDS;color:string}> = [
    {label:'Politika',        key:'politics',       color:'#C8243C'},
    {label:'Gazdaság',        key:'finance',         color:'#2563eb'},
    {label:'Tudomány & Tech', key:'scienceTech',     color:'#0891b2'},
    {label:'Kultúra',         key:'cultureSociety',  color:'#7c3aed'},
    {label:'Magyarország',    key:'hungary',         color:'#1d4ed8'},
    {label:'Katasztrófa',     key:'disaster',        color:'#d97706'},
  ];
  const catSlices = CAT_DEF.map(({label,key,color})=>({
    label, color,
    value: norm.filter(({a,t})=>key==='hungary'?(a.affects_hungary||matchesKeywordGroup(t,CATEGORY_KEYWORDS[key])):matchesKeywordGroup(t,CATEGORY_KEYWORDS[key])).length,
  }));

  /* ── market groups ── */
  // Use enriched versions so FX change_percent is computed from real stored price
  // history rather than whatever was stored at ingest time (which can be 0 for FX).
  const allEnriched = enrichAll(marketData);
  const indices    = pickMarketEnriched(marketData,['^GSPC','^IXIC','^GDAXI','^DJI','BUX']);
  const fx         = pickMarketEnriched(marketData,['EUR/HUF','USD/HUF','GBP/HUF','EUR/USD']);
  const crypto     = pickMarketEnriched(marketData,['BTC','ETH','BNB']);
  const comms      = pickMarketEnriched(marketData,['OIL','GOLD','WHEAT','ARANY']);
  const sorted_mkt = [...allEnriched].filter(r=>Number.isFinite(r.change_percent)).sort((a,b)=>b.change_percent-a.change_percent);
  const gainers    = sorted_mkt.slice(0,3);
  const losers     = [...sorted_mkt].reverse().slice(0,3);
  const hufRates   = pickMarketEnriched(marketData,['EUR/HUF','USD/HUF']);

  /* ── top themes ── */
  const themeMap = new Map<string,number>();
  for (const a of sorted) for (const t of toTopicList(a.topics)) themeMap.set(t,(themeMap.get(t)||0)+1);
  const topThemes = [...themeMap.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6);

  /* ── time ── */
  const gen = new Date().toLocaleString('hu-HU',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});

  /* ══════════════════ HTML FRAGMENTS ══════════════════ */

  const newsHtml = topNews.length>0 ? topNews.map(a=>{
    const sc   = a.sentiment_score||0;
    const dot  = sc>=0.2?'#16a34a':sc<=-0.2?'#dc2626':'#9ca3af';
    const time = new Date(a.published_at).toLocaleString('hu-HU',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
    return `<div style="display:flex;gap:8px;padding:7px 0;border-bottom:1px solid #f0ebe4;">
      <div style="width:8px;height:8px;border-radius:50%;background:${dot};flex-shrink:0;margin-top:4px;"></div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:12px;font-weight:600;color:#1a1a1a;line-height:1.35;">${escapeHtml(a.title)}</div>
        <div style="font-size:10px;color:#888;margin-top:2px;">${escapeHtml(a.source)}&nbsp;·&nbsp;${time}</div>
        ${a.affects_hungary?'<div style="font-size:8px;font-weight:700;color:#1d4ed8;letter-spacing:0.1em;text-transform:uppercase;margin-top:2px;">🇭🇺 Érinti Magyarországot</div>':''}
      </div>
    </div>`;
  }).join('')
  : '<p style="font-size:11px;color:#888;padding:8px 0">Nincs elegendő hír az adott időszakból.</p>';

  const confHtml = conflicts.length>0
    ? conflicts.slice(0,7).map(c=>{
        const fat = c.fatalities||0;
        const sc  = fat>1000?'#991b1b':fat>100?'#dc2626':fat>0?'#f97316':'#eab308';
        return `<div style="display:flex;gap:8px;padding:6px 0;border-bottom:1px solid #f0ebe4;">
          <div style="width:4px;flex-shrink:0;background:${sc};border-radius:1px;"></div>
          <div>
            <div style="font-size:11px;font-weight:700;color:#1a1a1a;">${escapeHtml(c.location)}, ${escapeHtml(c.country)}</div>
            <div style="font-size:10px;color:#666;margin-top:1px;line-height:1.35;">${escapeHtml(c.description)}</div>
            ${fat>0?`<div style="font-size:9px;color:#dc2626;font-weight:700;margin-top:2px;">⚠ ${fat.toLocaleString('hu-HU')} halálesés</div>`:''}
          </div>
        </div>`;
      }).join('')
      + (confArts.length>0?`<div style="margin-top:10px;padding-top:10px;border-top:1px solid #f0ebe4;">
        <div style="font-size:8px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#7f1d1d;margin-bottom:5px;">Kapcsolódó hírek</div>
        ${confArts.map(a=>`<div style="font-size:10px;color:#555;padding:2px 0;border-bottom:1px dashed #f5f0ea;">${escapeHtml(a.title)}&nbsp;<span style="color:#bbb">· ${escapeHtml(a.source)}</span></div>`).join('')}
      </div>`:'')
    : '<p style="font-size:11px;color:#888;padding:8px 0">Nincs konfliktusadat az adott időszakból.</p>';

  const hunHtml = (hunArts.length>0 ? hunArts.map(a=>{
    const time=new Date(a.published_at).toLocaleString('hu-HU',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
    return `<div style="padding:6px 0;border-bottom:1px solid #bfdbfe;">
      <div style="font-size:11px;font-weight:600;color:#1e3a8a;line-height:1.35;">${escapeHtml(a.title)}</div>
      <div style="font-size:10px;color:#60a5fa;margin-top:1px;">${escapeHtml(a.source)}&nbsp;·&nbsp;${time}</div>
      ${a.hungary_impact?`<div style="font-size:10px;color:#1e40af;margin-top:2px;font-style:italic;">${escapeHtml(a.hungary_impact)}</div>`:''}
    </div>`;
  }).join('') : '<p style="font-size:11px;color:#5b85c7;padding:6px 0">Nincs Magyarországhoz kapcsolódó hír.</p>')
  + (hufRates.length>0?`<div style="margin-top:10px;background:#dbeafe;padding:8px;border-radius:2px;">
    <div style="font-size:8px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#1d4ed8;margin-bottom:5px;">Forint árfolyam</div>
    <table style="width:100%;border-collapse:collapse;"><tbody>
      ${hufRates.map(r=>`<tr>
        <td style="padding:3px 0;font-size:10px;font-weight:700;font-family:monospace;color:#1e3a8a;">${escapeHtml(r.symbol)}</td>
        <td style="padding:3px 0;font-size:13px;font-weight:800;text-align:right;color:#1e3a8a;">${fmtPrice(r.price)}</td>
        <td style="padding:3px 0;text-align:right;font-size:10px;font-weight:700;color:${changeColor(r.change_percent)};padding-left:8px;">${fmtChange(r.change_percent)}</td>
      </tr>`).join('')}
    </tbody></table>
  </div>`:'');

  const sciHtml = sciArts.length>0 ? sciArts.map(a=>{
    const d=new Date(a.published_at).toLocaleString('hu-HU',{month:'short',day:'numeric'});
    return `<div style="padding:5px 0;border-bottom:1px solid #ccfbf1;">
      <div style="font-size:11px;font-weight:600;color:#134e4a;line-height:1.35;">${escapeHtml(a.title)}</div>
      <div style="font-size:10px;color:#5eead4;margin-top:1px;">${escapeHtml(a.source)}&nbsp;·&nbsp;${d}</div>
    </div>`;
  }).join('') : '<p style="font-size:11px;color:#888;padding:8px 0">Nincs tudomány/tech hír az adott időszakból.</p>';

  const opHtml = (topThemes.length>0?`<div style="margin-bottom:10px;">
    <div style="font-size:8px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#92400e;margin-bottom:5px;">Legtöbbet tárgyalt témák</div>
    <div style="display:flex;flex-wrap:wrap;gap:4px;">${topThemes.map(([t,n])=>`<span style="background:#fef3c7;border:1px solid #fcd34d;padding:2px 7px;font-size:9px;font-weight:700;color:#92400e;border-radius:999px;">${escapeHtml(t)}&nbsp;<span style="opacity:0.6;">${n}×</span></span>`).join('')}</div>
  </div>`:'')
  + (opArts.length>0?opArts.map(a=>{
    const d=new Date(a.published_at).toLocaleString('hu-HU',{month:'short',day:'numeric'});
    return `<div style="padding:5px 0;border-bottom:1px solid #fef3c7;">
      <div style="font-size:11px;font-weight:600;color:#78350f;line-height:1.35;">${escapeHtml(a.title)}</div>
      <div style="font-size:10px;color:#d97706;margin-top:1px;">${escapeHtml(a.source)}&nbsp;·&nbsp;${d}</div>
    </div>`;
  }).join(''):'<p style="font-size:11px;color:#888;padding:8px 0">Nincs elemzés az adott időszakból.</p>');

  const mktHtml = [
    mktSection(indices,    'Főbb tőzsdeindexek',  '#1e3a5f'),
    mktSection(fx,         'Devizák',              '#1d4ed8'),
    mktSection(crypto,     'Kriptovaluták',        '#7c3aed'),
    mktSection(comms,      'Nyersanyagok',         '#d97706'),
    mktSection(gainers,    'Top nyertesek ↑',      '#16a34a'),
    mktSection(losers,     'Top vesztesek ↓',      '#dc2626'),
  ].join('');

  const sentHtml = `<div style="margin-bottom:8px;">
    <div style="font-size:11px;font-weight:700;color:#333;">Általános hangulat: <span style="color:${sColor};">${sLabel}</span></div>
    <div style="font-size:10px;color:#888;margin-top:2px;">Átlagos pontszám: ${avgSent>=0?'+':''}${avgSent.toFixed(2)} — ${sentArts.length} cikk alapján</div>
  </div>${sentimentBar(posCount,negCount,neuCount)}`;

  /* ══════════════════ FULL HTML ══════════════════ */
  return `<!doctype html>
<html lang="hu">
<head>
  <meta charset="utf-8"/>
  <title>Pulzus – Hírszerzési Összefoglaló</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Inter',system-ui,sans-serif;background:#faf8f5;color:#1a1a1a;font-size:13px;line-height:1.5;}
    .page{max-width:1120px;margin:0 auto;padding:24px 28px 48px;}
    @media print{body{background:#fff;}.page{padding:10px 14px;}}
  </style>
</head>
<body>
<main class="page">

  <!-- HEADER -->
  <header style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:4px solid #C8243C;padding-bottom:14px;margin-bottom:16px;">
    <div>
      <div style="font-size:9px;font-weight:800;letter-spacing:0.3em;text-transform:uppercase;color:#C8243C;">Pulzus · Intelligencia Platform</div>
      <div style="font-size:30px;font-weight:800;letter-spacing:-0.02em;color:#1a1a1a;margin-top:4px;line-height:1.1;">Hírszerzési Összefoglaló</div>
      <div style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#888;margin-top:6px;">${escapeHtml(windowLabel)}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:9px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:#C8243C;">Generálva</div>
      <div style="font-size:13px;font-weight:700;color:#333;margin-top:4px;">${gen}</div>
      <div style="font-size:9px;color:#aaa;margin-top:2px;">Automatikusan generált, tájékoztató jellegű anyag</div>
    </div>
  </header>

  <!-- STAT CARDS -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;">
    <div style="background:#fff;border:1px solid #e0d8cf;border-top:3px solid #C8243C;padding:10px 12px;">
      <div style="font-size:8px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#999;">📰 Cikkek</div>
      <div style="font-size:28px;font-weight:800;color:#1a1a1a;line-height:1.1;margin-top:3px;">${articleCount}</div>
      <div style="font-size:10px;color:#888;margin-top:2px;">feldolgozott hír</div>
    </div>
    <div style="background:#fff;border:1px solid #e0d8cf;border-top:3px solid #7f1d1d;padding:10px 12px;">
      <div style="font-size:8px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#999;">⚔️ Konfliktusok</div>
      <div style="font-size:28px;font-weight:800;color:#1a1a1a;line-height:1.1;margin-top:3px;">${conflictCount}</div>
      <div style="font-size:10px;color:#888;margin-top:2px;">aktív gócpont</div>
    </div>
    <div style="background:#fff;border:1px solid #e0d8cf;border-top:3px solid #1e3a5f;padding:10px 12px;">
      <div style="font-size:8px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#999;">📊 Piaci adatok</div>
      <div style="font-size:28px;font-weight:800;color:#1a1a1a;line-height:1.1;margin-top:3px;">${marketCount}</div>
      <div style="font-size:10px;color:#888;margin-top:2px;">figyelemmel kísért eszköz</div>
    </div>
    <div style="background:#fff;border:1px solid #e0d8cf;border-top:3px solid ${sColor};padding:10px 12px;">
      <div style="font-size:8px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#999;">🧠 Hangulat</div>
      <div style="font-size:15px;font-weight:800;color:${sColor};line-height:1.2;margin-top:5px;">${sLabel}</div>
      <div style="font-size:10px;color:#888;margin-top:4px;">${avgSent>=0?'+':''}${avgSent.toFixed(2)} átlagos score</div>
    </div>
  </div>

  <!-- MAIN 3-COL GRID -->
  <div style="display:grid;grid-template-columns:2fr 1.6fr 1fr;gap:12px;margin-bottom:12px;">

    <!-- COL 1: News + Conflicts -->
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div style="background:#fff;border:1px solid #e0d8cf;overflow:hidden;">
        <div style="padding:8px 12px;background:#C8243C;">
          <div style="font-size:9px;font-weight:800;letter-spacing:0.25em;text-transform:uppercase;color:#fff;">📰 Legfontosabb hírek</div>
        </div>
        <div style="padding:8px 12px;">
          <div style="font-size:8px;letter-spacing:0.12em;text-transform:uppercase;color:#ccc;margin-bottom:5px;">🟢 Pozitív &nbsp; 🔴 Negatív &nbsp; ⚫ Semleges</div>
          ${newsHtml}
        </div>
      </div>

      <div style="background:#fff;border:1px solid #e0d8cf;overflow:hidden;">
        <div style="padding:8px 12px;background:#7f1d1d;">
          <div style="font-size:9px;font-weight:800;letter-spacing:0.25em;text-transform:uppercase;color:#fff;">⚔️ Konfliktusok &amp; Biztonság</div>
        </div>
        <div style="padding:8px 12px;">${confHtml}</div>
      </div>
    </div>

    <!-- COL 2: Markets + Sentiment -->
    <div style="background:#fff;border:1px solid #e0d8cf;overflow:hidden;">
      <div style="padding:8px 12px;background:#1e3a5f;">
        <div style="font-size:9px;font-weight:800;letter-spacing:0.25em;text-transform:uppercase;color:#fff;">📊 Piacok &amp; Gazdaság</div>
      </div>
      <div style="padding:10px 12px;">
        ${mktHtml}
        <div style="border-top:1px solid #e5e7eb;padding-top:10px;margin-top:2px;">
          <div style="font-size:8px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#4b5563;margin-bottom:4px;">🧠 Hírsentiment elemzés</div>
          ${sentHtml}
        </div>
      </div>
    </div>

    <!-- COL 3: Hungary + Categories -->
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div style="background:#eff6ff;border:1px solid #bfdbfe;overflow:hidden;">
        <div style="padding:8px 12px;background:#1d4ed8;">
          <div style="font-size:9px;font-weight:800;letter-spacing:0.25em;text-transform:uppercase;color:#fff;">🇭🇺 Magyarország</div>
        </div>
        <div style="padding:8px 12px;">${hunHtml}</div>
      </div>

      <div style="background:#fff;border:1px solid #e0d8cf;overflow:hidden;">
        <div style="padding:8px 12px;background:#6d28d9;">
          <div style="font-size:9px;font-weight:800;letter-spacing:0.25em;text-transform:uppercase;color:#fff;">📂 Témakörök megoszlása</div>
        </div>
        <div style="padding:8px 12px;">${svgDonut(catSlices)}</div>
      </div>
    </div>
  </div>

  <!-- BOTTOM 2-COL ROW -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
    <div style="background:#fff;border:1px solid #e0d8cf;overflow:hidden;">
      <div style="padding:8px 12px;background:#0f766e;">
        <div style="font-size:9px;font-weight:800;letter-spacing:0.25em;text-transform:uppercase;color:#fff;">🔬 Tudomány &amp; Technológia</div>
      </div>
      <div style="padding:8px 12px;">${sciHtml}</div>
    </div>

    <div style="background:#fff;border:1px solid #e0d8cf;overflow:hidden;">
      <div style="padding:8px 12px;background:#92400e;">
        <div style="font-size:9px;font-weight:800;letter-spacing:0.25em;text-transform:uppercase;color:#fff;">💬 Elemzések &amp; Vélemények</div>
      </div>
      <div style="padding:8px 12px;">${opHtml}</div>
    </div>
  </div>

  <!-- FOOTER -->
  <footer style="margin-top:20px;padding-top:12px;border-top:1px solid #e0d8cf;display:flex;justify-content:space-between;font-size:9px;color:#aaa;letter-spacing:0.08em;text-transform:uppercase;">
    <span>Pulzus Intelligencia Platform</span>
    <span>Automatikusan generált, tájékoztató jellegű anyag — ${gen}</span>
    <span>&copy;&nbsp;${new Date().getFullYear()} Pulzus</span>
  </footer>

</main>
</body>
</html>`;
}
