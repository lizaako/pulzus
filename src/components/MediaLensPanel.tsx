import { useMemo } from 'react';
import { Article } from '@/lib/supabase';
import { Progress } from '@/components/ui/progress';

type SourceGroupId = 'independent' | 'mainstream' | 'international' | 'other';

interface MediaLensPanelProps {
  articles: Article[];
}

interface StoryTopic {
  name: string;
  articles: Article[];
}

const SOURCE_GROUPS: Record<Exclude<SourceGroupId, 'other'>, { title: string; accent: string; sources: string[] }> = {
  independent: {
    title: 'Független magyar források',
    accent: 'border-[#2E7D4F]',
    sources: ['telex', '444'],
  },
  mainstream: {
    title: 'Mainstream magyar források',
    accent: 'border-[#D97B00]',
    sources: ['origo', 'magyar nemzet'],
  },
  international: {
    title: 'Nemzetközi források',
    accent: 'border-[#C8243C]',
    sources: ['bbc', 'al jazeera', 'reuters'],
  },
};

function normalizeText(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

function normalizeTopics(topics: Article['topics']) {
  if (Array.isArray(topics)) {
    return topics.map((topic) => topic.trim()).filter(Boolean);
  }

  if (typeof topics === 'string') {
    return topics
      .split(',')
      .map((topic) => topic.trim())
      .filter(Boolean);
  }

  return [];
}

function getSourceGroup(source: string): SourceGroupId {
  const normalized = normalizeText(source);

  if (SOURCE_GROUPS.independent.sources.some((name) => normalized.includes(name))) return 'independent';
  if (SOURCE_GROUPS.mainstream.sources.some((name) => normalized.includes(name))) return 'mainstream';
  if (SOURCE_GROUPS.international.sources.some((name) => normalized.includes(name))) return 'international';
  return 'other';
}

function averageSentiment(articles: Article[]) {
  if (articles.length === 0) return null;
  const values = articles
    .map((article) => article.sentiment_score)
    .filter((score) => Number.isFinite(score));

  if (values.length === 0) return null;
  return values.reduce((sum, score) => sum + score, 0) / values.length;
}

function narrativeDifferenceScore(groupedArticles: Record<Exclude<SourceGroupId, 'other'>, Article[]>) {
  const averages = Object.values(groupedArticles)
    .map((items) => averageSentiment(items))
    .filter((value): value is number => value !== null);

  if (averages.length < 2) return 0;

  let maxGap = 0;
  for (let i = 0; i < averages.length; i += 1) {
    for (let j = i + 1; j < averages.length; j += 1) {
      maxGap = Math.max(maxGap, Math.abs(averages[i] - averages[j]));
    }
  }

  return Math.round(Math.min(100, maxGap * 50));
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('hu-HU', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function collectTopicGroups(articles: Article[]) {
  const byTopic = new Map<string, StoryTopic>();

  for (const article of articles) {
    const topics = normalizeTopics(article.topics);
    for (const topic of topics) {
      const key = topic.toLowerCase();
      const current = byTopic.get(key);
      if (current) {
        current.articles.push(article);
      } else {
        byTopic.set(key, { name: topic, articles: [article] });
      }
    }
  }

  return Array.from(byTopic.values())
    .map((entry) => {
      const grouped = {
        independent: entry.articles.filter((article) => getSourceGroup(article.source) === 'independent'),
        mainstream: entry.articles.filter((article) => getSourceGroup(article.source) === 'mainstream'),
        international: entry.articles.filter((article) => getSourceGroup(article.source) === 'international'),
      };

      return {
        ...entry,
        grouped,
        score: narrativeDifferenceScore(grouped),
      };
    })
    .filter((entry) => entry.articles.length >= 2)
    .sort((a, b) => {
      const groupCountA = Object.values(a.grouped).filter((items) => items.length > 0).length;
      const groupCountB = Object.values(b.grouped).filter((items) => items.length > 0).length;
      if (groupCountB !== groupCountA) return groupCountB - groupCountA;
      if (b.score !== a.score) return b.score - a.score;
      return b.articles.length - a.articles.length;
    });
}

export default function MediaLensPanel({ articles }: MediaLensPanelProps) {
  const topicGroups = useMemo(() => collectTopicGroups(articles), [articles]);

  return (
    <div className="glass-panel overflow-hidden">
      <div className="border-b border-border px-6 py-5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Média összevetés</p>
            <h2 className="font-display text-3xl font-extrabold tracking-[-0.03em] text-foreground">Narratívák</h2>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            A felület semleges módon mutatja meg, hogy ugyanaz a téma milyen hangsúlyokkal jelenik meg a különböző forráscsoportokban.
          </p>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-6">
          {topicGroups.slice(0, 6).map((topic) => (
            <section key={topic.name} className="border border-border bg-card">
              <div className="border-b border-border px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="font-display text-2xl font-bold text-foreground">{topic.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {topic.articles.length} kapcsolódó cikk a három forráscsoportban.
                    </p>
                  </div>
                  <div className="min-w-[220px] space-y-2">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Narratíva Eltérés Pontszám</span>
                      <strong className="font-display text-xl text-foreground">{topic.score}</strong>
                    </div>
                    <Progress value={topic.score} className="h-2 rounded-none bg-secondary" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-px bg-border lg:grid-cols-3">
                {(Object.entries(SOURCE_GROUPS) as Array<[Exclude<SourceGroupId, 'other'>, (typeof SOURCE_GROUPS)[Exclude<SourceGroupId, 'other'>]]>).map(([groupId, group]) => (
                  <div key={groupId} className={`min-h-[280px] bg-card px-5 py-4 border-l-4 ${group.accent}`}>
                    <div className="mb-4">
                      <h4 className="font-display text-lg font-bold text-foreground">{group.title}</h4>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {group.sources.join(', ')}
                      </p>
                    </div>

                    <div className="space-y-3">
                      {topic.grouped[groupId].length > 0 ? topic.grouped[groupId].map((article) => (
                        <article key={article.id} className="border border-border bg-secondary/35 p-3">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                            {article.source} • {formatDateTime(article.published_at)}
                          </p>
                          <h5 className="mt-2 text-sm font-semibold leading-snug text-foreground">{article.title}</h5>
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{article.summary}</p>
                        </article>
                      )) : (
                        <div className="border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                          Ehhez a témához jelenleg nincs kapcsolódó cikk ebben a forráscsoportban.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {topicGroups.length === 0 && (
            <div className="border border-dashed border-border px-6 py-10 text-center text-muted-foreground">
              Még nincs elég témacímkézett cikk az összehasonlításhoz.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
