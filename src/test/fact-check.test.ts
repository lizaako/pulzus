import { describe, expect, it } from 'vitest';
import { checkFact } from '@/lib/fact-check';
import { MOCK_ANALYSES } from '@/lib/pulzus-mock-analyses';

describe('checkFact', () => {
  it('returns a result for all 5 supported demo URLs', async () => {
    for (const [url, analysis] of Object.entries(MOCK_ANALYSES)) {
      await expect(checkFact(url)).resolves.toEqual(analysis);
      await expect(checkFact(`${url}/`)).resolves.toEqual(analysis);
    }
  });

  it('returns null for unknown URLs', async () => {
    await expect(checkFact('https://example.com/not-supported')).resolves.toBeNull();
  });
});
