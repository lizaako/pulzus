import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestNewsChatAnswer } from '@/lib/news-chat';
import { localizeHungaryImpact } from '@/lib/article-localization';
import { Article } from '@/lib/supabase';

const article: Article = {
  id: 'article-1',
  title: 'Ceasefire talks stall after overnight attacks',
  source: 'Reuters',
  url: 'https://example.com/story',
  published_at: '2026-03-31T08:30:00.000Z',
  sentiment_score: -0.64,
  topics: 'conflict, diplomacy, europe',
  affects_hungary: true,
  hungary_impact: 'Energy markets and regional security watchers are monitoring the fallout.',
  warning_level: 'high',
  summary: 'Negotiators paused talks after renewed strikes increased pressure on both sides.',
};

describe('requestNewsChatAnswer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to local article context when the remote endpoint is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const response = await requestNewsChatAnswer({
      article,
      question: 'How does this affect Hungary?',
      history: [],
    });

    expect(response.role).toBe('assistant');
    expect(response.content).toContain('Magyarország szempontjából relevánsnak');
    expect(response.content).toContain(localizeHungaryImpact(article.hungary_impact));
    expect(response.content).toContain(article.summary);
  });
});
