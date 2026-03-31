import { Article, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase';
import { localizeHungaryImpact } from '@/lib/article-localization';

export interface NewsChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface NewsChatRequest {
  article: Article;
  question: string;
  history: NewsChatMessage[];
}

export interface HungaryImpactTranslationRequest {
  mode: 'translate';
  text: string;
}

export const NEWS_CHAT_SUGGESTIONS = [
  'Miért fontos ez globálisan?',
  'Mi történhet ezután?',
  'Mennyire tűnik megbízhatónak ez a hír?',
];

function parseTopics(topics: unknown): string[] {
  if (Array.isArray(topics)) {
    return topics
      .map((topic) => String(topic).trim())
      .filter(Boolean);
  }

  if (typeof topics !== 'string') return [];

  return topics
    .split(',')
    .map((topic) => topic.trim())
    .filter(Boolean);
}

function buildLocalAnswer(article: Article, question: string): string {
  const lowerQuestion = question.toLowerCase();
  const topics = parseTopics(article.topics);
  const publishedDate = article.published_at ? new Date(article.published_at) : null;
  const publishedAt = publishedDate && !Number.isNaN(publishedDate.getTime())
    ? publishedDate.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  const summaryLine = article.summary
    ? `Az aktuális összefoglaló alapján a legfontosabb fejlemény: ${article.summary}`
    : 'Ehhez a cikkhez jelenleg nincs részletes összefoglaló az adatbázisban.';

  const sourceLine = article.source
    ? `A hírhez jelenleg ez a forrás tartozik: ${article.source}${publishedAt ? `, közzétéve: ${publishedAt}` : ''}.`
    : publishedAt
      ? `A hír közzététele: ${publishedAt}.`
      : '';

  const sentimentLine = Number.isFinite(article.sentiment_score)
    ? `A hangulati pontszám ${article.sentiment_score.toFixed(2)}, ami ${article.sentiment_score > 0.3 ? 'inkább pozitív' : article.sentiment_score < -0.3 ? 'inkább negatív' : 'vegyes vagy semleges'} tónusra utal.`
    : '';

  const topicsLine = topics.length ? `Fő témák az adatbázisban: ${topics.join(', ')}.` : '';

  const hungaryLine = article.affects_hungary
    ? `Ez a hír Magyarország szempontjából relevánsnak van jelölve. Mentett hatásleírás: ${localizeHungaryImpact(article.hungary_impact) || 'Jelenleg nincs további Magyarország-specifikus megjegyzés.'}`
    : 'Ez a hír jelenleg nincs közvetlen magyar hatásúként megjelölve az adatbázisban.';

  if (lowerQuestion.includes('hungary') || lowerQuestion.includes('magyar')) {
    return [hungaryLine, summaryLine, 'Ha bekötöd a backend AI végpontot, a teljes cikk szövegével és a Groq folyamattal még mélyebb választ tudok adni.']
      .filter(Boolean)
      .join(' ');
  }

  if (lowerQuestion.includes('reliable') || lowerQuestion.includes('trust') || lowerQuestion.includes('source') || lowerQuestion.includes('megbízh') || lowerQuestion.includes('forrás')) {
    return [
      sourceLine,
      topicsLine,
      'Csak a frontendben elérhető adatok alapján legfeljebb magas szinten tudom megítélni a megbízhatóságot. Egy backend AI-lépés összevethetné az állításokat az eredeti cikkel és további forrásokkal.',
    ]
      .filter(Boolean)
      .join(' ');
  }

  if (lowerQuestion.includes('next') || lowerQuestion.includes('happen') || lowerQuestion.includes('impact') || lowerQuestion.includes('ezután') || lowerQuestion.includes('következ') || lowerQuestion.includes('hatás')) {
    return [
      summaryLine,
      topicsLine,
      hungaryLine,
      'A legésszerűbb következő lépés a kapcsolódó utókövető hírek, hivatalos nyilatkozatok, piaci reakciók vagy az esetleges eszkaláció figyelése.',
    ]
      .filter(Boolean)
      .join(' ');
  }

  return [
    summaryLine,
    sourceLine,
    sentimentLine,
    topicsLine,
    hungaryLine,
    'Ez a tartalék válasz csak az alkalmazásba már betöltött strukturált cikkadatokra támaszkodik. Ha bekötöd a Groq backend végpontot, ez a chat sokkal mélyebbre tud menni.',
  ]
    .filter(Boolean)
    .join(' ');
}

function getNewsChatEndpoint(): string | null {
  const configured = import.meta.env.VITE_NEWS_CHAT_API_URL;

  if (configured) {
    return configured;
  }

  try {
    const projectUrl = new URL(SUPABASE_URL);
    return `${projectUrl.origin}/functions/v1/news-chat`;
  } catch {
    return null;
  }
}

export async function translateHungaryImpactText(text: string): Promise<string> {
  const trimmed = text.trim();

  if (!trimmed) return '';

  const endpoint = getNewsChatEndpoint();

  if (!endpoint) {
    return localizeHungaryImpact(trimmed);
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        mode: 'translate',
        text: trimmed,
      } satisfies HungaryImpactTranslationRequest),
    });

    if (!response.ok) {
      throw new Error(`Translation endpoint failed with status ${response.status}`);
    }

    const data = await response.json();
    const translation = typeof data?.translation === 'string' ? data.translation : '';

    return translation.trim() || localizeHungaryImpact(trimmed);
  } catch {
    return localizeHungaryImpact(trimmed);
  }
}

export async function requestNewsChatAnswer(request: NewsChatRequest): Promise<NewsChatMessage> {
  const endpoint = getNewsChatEndpoint();

  if (!endpoint) {
    return {
      role: 'assistant',
      content: buildLocalAnswer(request.article, request.question),
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Chat endpoint failed with status ${response.status}`);
    }

    const data = await response.json();
    const content = typeof data?.answer === 'string' ? data.answer : typeof data?.content === 'string' ? data.content : '';

    if (!content.trim()) {
      throw new Error('Chat endpoint returned an empty response.');
    }

    return {
      role: 'assistant',
      content,
    };
  } catch {
    return {
      role: 'assistant',
      content: buildLocalAnswer(request.article, request.question),
    };
  }
}
