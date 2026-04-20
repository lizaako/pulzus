import { useMemo } from 'react';
import {
  ChartContainer,
  type ChartConfig,
} from '@/components/ui/chart';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { adaptCountryReference, useCountry } from '@/lib/country-context';

type MetricTone = 'good' | 'bad' | 'neutral';

interface EconomyMetric {
  id: string;
  label: string;
  value: string;
  unit: string;
  asOf: string;
  trend: 'up' | 'down' | 'flat';
  tone: MetricTone;
  series: number[];
  explanation: string;
}

const chartConfig: ChartConfig = {
  value: {
    label: 'Érték',
    color: 'hsl(195 100% 50%)',
  },
};

const ECONOMY_METRICS: EconomyMetric[] = [
  {
    id: 'inflation',
    label: 'Infláció',
    value: '1,4',
    unit: '%',
    asOf: '2026. február',
    trend: 'down',
    tone: 'good',
    series: [5.6, 4.7, 4.2, 4.1, 3.7, 3.6, 3.5, 3.4, 3.3, 2.1, 1.4, 1.4],
    explanation: 'A KSH szerint 2026 februárjában 1,4% volt az éves infláció, vagyis az áremelkedés tempója sokat lassult az egy évvel korábbi szinthez képest.',
  },
  {
    id: 'unemployment',
    label: 'Munkanélküliség',
    value: '4,8',
    unit: '%',
    asOf: '2026. február',
    trend: 'up',
    tone: 'bad',
    series: [4.1, 4.1, 4.2, 4.3, 4.2, 4.3, 4.4, 4.5, 4.5, 4.6, 4.6, 4.8],
    explanation: 'A KSH legfrissebb adata alapján 2026 februárjában 4,8% volt a munkanélküliségi ráta, tehát 100 gazdaságilag aktív emberből közel 5 nem talált munkát.',
  },
  {
    id: 'gdp',
    label: 'GDP növekedés',
    value: '0,4',
    unit: '%',
    asOf: '2025. év',
    trend: 'up',
    tone: 'good',
    series: [-0.7, -0.4, -0.2, 0.0, 0.1, 0.2, 0.2, 0.3, 0.3, 0.3, 0.4, 0.4],
    explanation: 'A KSH második becslése szerint 2025 egészében 0,4%-kal nőtt a magyar GDP, tehát van növekedés, de továbbra is visszafogott ütemben.',
  },
  {
    id: 'average-wage',
    label: 'Átlagbér',
    value: '725 500',
    unit: 'HUF',
    asOf: '2026. február',
    trend: 'up',
    tone: 'good',
    series: [661400, 668100, 714400, 708300, 702800, 704400, 692700, 756400, 789200, 840600, 725500, 725500],
    explanation: 'A KSH szerint a teljes munkaidős bruttó átlagkereset 2026 februárjában 725 500 forint volt. Ez bruttó adat, tehát az adók és járulékok még lejönnek belőle.',
  },
  {
    id: 'minimum-wage',
    label: 'Minimálbér',
    value: '322 800',
    unit: 'HUF',
    asOf: '2026. január 1.',
    trend: 'up',
    tone: 'good',
    series: [266800, 266800, 266800, 266800, 266800, 266800, 290800, 290800, 290800, 290800, 290800, 322800],
    explanation: '2026. január 1-től a havi bruttó minimálbér 322 800 forint. Ez a legalacsonyabb kötelező teljes munkaidős bér a nem szakképzettséghez kötött munkakörökben.',
  },
  {
    id: 'eur-huf',
    label: 'HUF/EUR árfolyam',
    value: '364,69',
    unit: 'HUF',
    asOf: '2026. április 16.',
    trend: 'up',
    tone: 'bad',
    series: [384.7, 383.4, 382.9, 381.5, 379.6, 377.2, 376.0, 363.1, 363.6, 363.7, 364.0, 364.69],
    explanation: 'Az MNB hivatalos napi árfolyama 2026. április 16-án 364,69 forint volt 1 euróért. Ha ez a szám emelkedik, az általában a forint gyengülését jelzi.',
  },
  {
    id: 'emigrants',
    label: 'Kivándorlók száma',
    value: '35 000',
    unit: 'fő/év',
    asOf: 'becslés',
    trend: 'up',
    tone: 'bad',
    series: [29000, 29500, 30100, 30800, 31500, 32100, 32700, 33100, 33600, 34100, 34600, 35000],
    explanation: 'Ez arra utal, hogy sokan még mindig külföldön látnak jobb kereseti vagy életminőségi lehetőséget.',
  },
  {
    id: 'housing',
    label: 'Budapesti lakásár',
    value: '1 230 000',
    unit: 'HUF/m²',
    asOf: 'becslés',
    trend: 'up',
    tone: 'bad',
    series: [980000, 995000, 1010000, 1035000, 1060000, 1090000, 1125000, 1150000, 1180000, 1200000, 1215000, 1230000],
    explanation: 'Egy 50 négyzetméteres budapesti lakás így már könnyen 60 millió forint fölé kerülhet.',
  },
  {
    id: 'wage-gap',
    label: 'Minimálbér vs átlagbér különbség',
    value: '55,5',
    unit: '%',
    asOf: '2026. február',
    trend: 'down',
    tone: 'good',
    series: [62, 61, 60, 60, 59, 58, 58, 57, 57, 56.5, 56.2, 55.5],
    explanation: 'A 322 800 forintos minimálbér a 725 500 forintos februári bruttó átlagbér nagyjából 44,5%-a, vagyis a különbség körülbelül 55,5%.',
  },
  {
    id: 'energy',
    label: 'Energiaárak átlaga',
    value: '68',
    unit: 'HUF/kWh ekv.',
    asOf: 'becslés',
    trend: 'flat',
    tone: 'neutral',
    series: [64, 65, 65, 66, 67, 68, 69, 68, 67, 68, 68, 68],
    explanation: 'Az energiaárak stabilitása közvetlenül hat a rezsire, közvetve pedig a bolti árakra és a vállalkozások költségeire is.',
  },
  {
    id: 'student-loan',
    label: 'Diákhitel átlagos összeg',
    value: '2 180 000',
    unit: 'HUF',
    asOf: 'becslés',
    trend: 'up',
    tone: 'bad',
    series: [1860000, 1895000, 1930000, 1970000, 2010000, 2040000, 2070000, 2100000, 2135000, 2150000, 2165000, 2180000],
    explanation: 'Ez azt mutatja, hogy sok hallgató komolyabb pénzügyi teherrel indul el a munkaerőpiacon.',
  },
];

function trendColor(tone: MetricTone) {
  if (tone === 'good') return 'text-success';
  if (tone === 'bad') return 'text-destructive';
  return 'text-warning';
}

function TrendIcon({ trend, tone }: { trend: EconomyMetric['trend']; tone: MetricTone }) {
  const color = trendColor(tone);
  const shouldInvertDirection = tone === 'bad';
  const visualTrend = trend === 'flat'
    ? 'flat'
    : shouldInvertDirection
      ? (trend === 'up' ? 'down' : 'up')
      : trend;

  if (visualTrend === 'up') return <ArrowUpRight className={`h-4 w-4 ${color}`} />;
  if (visualTrend === 'down') return <ArrowDownRight className={`h-4 w-4 ${color}`} />;
  return <Minus className={`h-4 w-4 ${color}`} />;
}

function MetricSparkline({ series, tone }: { series: number[]; tone: MetricTone }) {
  const data = series.map((value, index) => ({ index, value }));
  const stroke = tone === 'good'
    ? 'hsl(var(--success))'
    : tone === 'bad'
      ? 'hsl(var(--destructive))'
      : 'hsl(var(--warning))';

  return (
    <ChartContainer config={chartConfig} className="h-14 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="value" stroke={stroke} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

export default function HungarianEconomyPanel() {
  const { country, countryCode } = useCountry();
  const topMetrics = useMemo(() => ECONOMY_METRICS.slice(0, 6), []);
  const lowerMetrics = useMemo(() => ECONOMY_METRICS.slice(6), []);
  const title = countryCode === 'hu' ? 'Magyar gazdaság' : countryCode === 'de' ? `${country.countryName} Wirtschaft` : countryCode === 'es' ? `Economía de ${country.countryName}` : countryCode === 'fr' ? `Économie de ${country.countryName}` : countryCode === 'fi' ? `${country.countryName}n talous` : countryCode === 'nl' ? `Economie van ${country.countryName}` : `${country.countryName} economy`;

  return (
    <div className="glass-panel h-full min-h-0 flex flex-col overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-border">
        <h2 className="font-display text-xl sm:text-2xl font-extrabold text-foreground tracking-[-0.02em]">
          {title}
        </h2>
        <p className="mt-2 text-[15px] text-muted-foreground">
          {countryCode === 'hu' ? 'A legfontosabb mutatók röviden, emberi nyelven és mini trendekkel.' : countryCode === 'de' ? 'Die wichtigsten Kennzahlen kurz, verständlich und mit Mini-Trends.' : countryCode === 'es' ? 'Los indicadores más importantes, explicados de forma clara y con mini tendencias.' : countryCode === 'fr' ? 'Les indicateurs clés, expliqués simplement avec des mini-tendances.' : countryCode === 'fi' ? 'Tärkeimmät mittarit lyhyesti, selkeästi ja pienillä trendikäyrillä.' : countryCode === 'nl' ? 'De belangrijkste indicatoren kort, helder en met mini-trends.' : 'The key indicators in plain language with mini trends.'}
        </p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {countryCode === 'hu' ? 'Frissítve a legutóbbi elérhető hivatalos adatokkal' : countryCode === 'de' ? 'Aktualisiert mit den neuesten offiziellen Daten' : countryCode === 'es' ? 'Actualizado con los datos oficiales más recientes' : countryCode === 'fr' ? 'Mis à jour avec les dernières données officielles' : countryCode === 'fi' ? 'Päivitetty uusimmilla virallisilla tiedoilla' : countryCode === 'nl' ? 'Bijgewerkt met de nieuwste officiële gegevens' : 'Updated with the latest official data'}
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-5">
        <section>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {topMetrics.map((metric) => (
              <div key={metric.id} className="border border-border bg-card p-4 sm:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{metric.label}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{metric.asOf}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-lg sm:text-xl font-display font-bold text-foreground">
                        {metric.value}
                      </span>
                      <span className="text-xs text-muted-foreground">{metric.unit}</span>
                    </div>
                  </div>
                  <div className="border border-border bg-secondary p-2">
                    <TrendIcon trend={metric.trend} tone={metric.tone} />
                  </div>
                </div>

                <div className="mt-3">
                  <MetricSparkline series={metric.series} tone={metric.tone} />
                </div>

                <div className="mt-3 border border-border bg-secondary p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-primary">{countryCode === 'hu' ? 'Mit jelent ez?' : countryCode === 'de' ? 'Was bedeutet das?' : countryCode === 'es' ? '¿Qué significa esto?' : countryCode === 'fr' ? 'Qu’est-ce que cela signifie ?' : countryCode === 'fi' ? 'Mitä tämä tarkoittaa?' : countryCode === 'nl' ? 'Wat betekent dit?' : 'What does this mean?'}</p>
                  <p className="mt-1 text-[14px] leading-[1.6] text-muted-foreground">{adaptCountryReference(metric.explanation, country.countryName)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <h3 className="font-display text-xs font-bold text-primary tracking-wider">
              {countryCode === 'hu' ? 'További fontos számok' : countryCode === 'de' ? 'Weitere wichtige Kennzahlen' : countryCode === 'es' ? 'Más cifras importantes' : countryCode === 'fr' ? 'Autres chiffres clés' : countryCode === 'fi' ? 'Muita tärkeitä lukuja' : countryCode === 'nl' ? 'Meer belangrijke cijfers' : 'More key figures'}
            </h3>
            <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
              {countryCode === 'hu' ? '12 hónapos mini trend' : countryCode === 'de' ? '12-Monats-Minitrend' : countryCode === 'es' ? 'Mini tendencia de 12 meses' : countryCode === 'fr' ? 'Mini tendance sur 12 mois' : countryCode === 'fi' ? '12 kuukauden minitrendi' : countryCode === 'nl' ? 'Mini-trend van 12 maanden' : '12-month mini trend'}
            </span>
          </div>

          <div className="space-y-3">
            {lowerMetrics.map((metric) => (
              <div key={metric.id} className="border border-border bg-card p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                <div className="grid grid-cols-1 xl:grid-cols-[220px_90px_minmax(0,1fr)] gap-3 items-center">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{metric.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{adaptCountryReference(metric.explanation, country.countryName)}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-[0.18em]">{metric.asOf}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <TrendIcon trend={metric.trend} tone={metric.tone} />
                    <div>
                      <div className="text-sm font-display font-bold text-foreground">{metric.value}</div>
                      <div className="text-[10px] text-muted-foreground">{metric.unit}</div>
                    </div>
                  </div>

                  <MetricSparkline series={metric.series} tone={metric.tone} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
