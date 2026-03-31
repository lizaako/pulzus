function looksHungarian(text: string): boolean {
  return /[áéíóöőúüű]|\b(és|hogy|mert|miatt|azonban|miközben|jelenleg|forrás|hatás|magyarország)\b/i.test(text);
}

const phraseReplacements: Array<[RegExp, string]> = [
  [/\benergy markets\b/gi, 'az energiapiacok'],
  [/\bregional security watchers\b/gi, 'a regionális biztonsági elemzők'],
  [/\bsecurity watchers\b/gi, 'a biztonsági elemzők'],
  [/\bare monitoring\b/gi, 'figyelik'],
  [/\bis monitoring\b/gi, 'figyeli'],
  [/\bthe fallout\b/gi, 'a következményeket'],
  [/\band\b/gi, 'és'],
  [/\bfuel prices\b/gi, 'az üzemanyagárakat'],
  [/\boil prices\b/gi, 'az olajárakat'],
  [/\bgas prices\b/gi, 'a gázárakat'],
  [/\bsupply chains\b/gi, 'az ellátási láncokat'],
  [/\btrade routes\b/gi, 'a kereskedelmi útvonalakat'],
  [/\binvestors\b/gi, 'a befektetők'],
  [/\bmarkets\b/gi, 'a piacok'],
  [/\bmay affect\b/gi, 'hatással lehet'],
  [/\bcould affect\b/gi, 'érintheti'],
  [/\bcould impact\b/gi, 'hatással lehet'],
  [/\bmay impact\b/gi, 'hatással lehet'],
  [/\bHungary\b/gi, 'Magyarország'],
  [/\bEurope\b/gi, 'Európa'],
  [/\bthe region\b/gi, 'a térség'],
  [/\bregional stability\b/gi, 'a regionális stabilitás'],
  [/\bsecurity\b/gi, 'biztonság'],
  [/\beconomy\b/gi, 'gazdaság'],
];

function capitalizeSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function localizeHungaryImpact(text: string | null | undefined): string {
  if (!text) return '';
  if (looksHungarian(text)) return text;

  let localized = text;

  for (const [pattern, replacement] of phraseReplacements) {
    localized = localized.replace(pattern, replacement);
  }

  localized = localized
    .replace(/\bare\b/g, '')
    .replace(/\bis\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+\./g, '.')
    .trim();

  return capitalizeSentence(localized);
}
