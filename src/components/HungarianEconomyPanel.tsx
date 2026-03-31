import { useMemo } from 'react';
import {
  ChartContainer,
  type ChartConfig,
} from '@/components/ui/chart';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

type MetricTone = 'good' | 'bad' | 'neutral';

interface EconomyMetric {
  id: string;
  label: string;
  value: string;
  unit: string;
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
    value: '5,2',
    unit: '%',
    trend: 'down',
    tone: 'good',
    series: [7.6, 7.1, 6.9, 6.5, 6.2, 6.0, 5.8, 5.7, 5.6, 5.5, 5.3, 5.2],
    explanation: 'Az infláció 5,2%: vagyis ami tavaly 1 000 Ft volt, az most nagyjából 1 052 Ft körül lehet.',
  },
  {
    id: 'unemployment',
    label: 'Munkanélküliség',
    value: '4,4',
    unit: '%',
    trend: 'flat',
    tone: 'neutral',
    series: [4.1, 4.2, 4.3, 4.2, 4.4, 4.5, 4.4, 4.3, 4.4, 4.4, 4.5, 4.4],
    explanation: 'Ez azt jelenti, hogy 100 aktív munkakeresőből nagyjából 4-5 ember nem talál épp állást.',
  },
  {
    id: 'gdp',
    label: 'GDP növekedés',
    value: '0,8',
    unit: '%',
    trend: 'up',
    tone: 'good',
    series: [-0.4, -0.2, 0.0, 0.1, 0.2, 0.3, 0.4, 0.4, 0.5, 0.6, 0.7, 0.8],
    explanation: 'A gazdaság enyhén növekszik: ez nem robbanásszerű fellendülés, inkább lassú kapaszkodás felfelé.',
  },
  {
    id: 'average-wage',
    label: 'Átlagbér',
    value: '661 400',
    unit: 'HUF',
    trend: 'up',
    tone: 'good',
    series: [575000, 582000, 590000, 599000, 605000, 614000, 621000, 629000, 638000, 646000, 654000, 661400],
    explanation: 'Ez a teljes munkaidős bruttó átlagbér: vagyis a magasabb fizetések is erősen felfelé húzzák az átlagot.',
  },
  {
    id: 'minimum-wage',
    label: 'Minimálbér',
    value: '290 800',
    unit: 'HUF',
    trend: 'up',
    tone: 'good',
    series: [266800, 266800, 266800, 266800, 266800, 266800, 290800, 290800, 290800, 290800, 290800, 290800],
    explanation: 'A minimálbér emelkedése a legalacsonyabb keresetű dolgozók helyzetét javítja, de ettől még nem lesz automatikusan olcsóbb az élet.',
  },
  {
    id: 'eur-huf',
    label: 'HUF/EUR árfolyam',
    value: '403,20',
    unit: 'HUF',
    trend: 'up',
    tone: 'bad',
    series: [389.4, 391.8, 394.1, 392.7, 395.5, 397.6, 399.2, 401.8, 404.1, 402.3, 401.9, 403.2],
    explanation: 'Ha az EUR/HUF feljebb megy, általában gyengébb a forint: az import és sok külföldi termék drágább lehet.',
  },
  {
    id: 'emigrants',
    label: 'Kivándorlók száma',
    value: '35 000',
    unit: 'fő/év',
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
    trend: 'up',
    tone: 'bad',
    series: [980000, 995000, 1010000, 1035000, 1060000, 1090000, 1125000, 1150000, 1180000, 1200000, 1215000, 1230000],
    explanation: 'Egy 50 négyzetméteres budapesti lakás így már könnyen 60 millió forint fölé kerülhet.',
  },
  {
    id: 'wage-gap',
    label: 'Minimálbér vs átlagbér különbség',
    value: '56,0',
    unit: '%',
    trend: 'down',
    tone: 'good',
    series: [62, 61, 60, 60, 59, 58, 58, 57, 57, 56.5, 56.2, 56.0],
    explanation: 'Minél kisebb ez a rés, annál közelebb van az alsó bérszint az országos átlagkeresethez.',
  },
  {
    id: 'energy',
    label: 'Energiaárak átlaga',
    value: '68',
    unit: 'HUF/kWh ekv.',
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

  if (trend === 'up') return <ArrowUpRight className={`h-4 w-4 ${color}`} />;
  if (trend === 'down') return <ArrowDownRight className={`h-4 w-4 ${color}`} />;
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
  const topMetrics = useMemo(() => ECONOMY_METRICS.slice(0, 6), []);
  const lowerMetrics = useMemo(() => ECONOMY_METRICS.slice(6), []);

  return (
    <div className="glass-panel h-full min-h-0 flex flex-col overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-border">
        <h2 className="font-display text-xl sm:text-2xl font-extrabold text-foreground tracking-[-0.02em]">
          Magyar gazdaság
        </h2>
        <p className="mt-2 text-[15px] text-muted-foreground">
          A legfontosabb mutatók röviden, emberi nyelven és mini trendekkel.
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
                  <p className="text-[10px] uppercase tracking-[0.2em] text-primary">Mit jelent ez?</p>
                  <p className="mt-1 text-[14px] leading-[1.6] text-muted-foreground">{metric.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <h3 className="font-display text-xs font-bold text-primary tracking-wider">
              További fontos számok
            </h3>
            <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
              12 hónapos mini trend
            </span>
          </div>

          <div className="space-y-3">
            {lowerMetrics.map((metric) => (
              <div key={metric.id} className="border border-border bg-card p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                <div className="grid grid-cols-1 xl:grid-cols-[220px_90px_minmax(0,1fr)] gap-3 items-center">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{metric.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{metric.explanation}</p>
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
