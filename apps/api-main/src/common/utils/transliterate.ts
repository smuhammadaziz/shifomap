/**
 * Simple transliteration utility for Uzbek (Latin <-> Cyrillic)
 * Used to improve search results when users type in different alphabets.
 */

const latinToCyrillicMap: Record<string, string> = {
  'a': 'а', 'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д', 'e': 'е', 'z': 'з', 'i': 'и',
  'y': 'й', 'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н', 'o': 'о', 'p': 'п', 'r': 'р',
  's': 'с', 't': 'т', 'u': 'у', 'f': 'ф', 'x': 'х', 'j': 'ж', 'h': 'ҳ', 'q': 'қ',
  'ts': 'ц', 'ch': 'ч', 'sh': 'ш', "o'": 'ў', "g'": 'ғ', 'yu': 'ю', 'ya': 'я', 'yo': 'ё'
};

const cyrillicToLatinMap: Record<string, string> = Object.fromEntries(
  Object.entries(latinToCyrillicMap).map(([l, c]) => [c, l])
);

// Special case for Cyrillic 'е' vs 'э' - for search we often treat them similar
cyrillicToLatinMap['э'] = 'e';
cyrillicToLatinMap['ь'] = ''; // soft sign usually ignored in search
cyrillicToLatinMap['ъ'] = "'"; // hard sign

// Function to generate a transliterated version of a string
export function transliterateUzbek(text: string): string {
  const input = text.toLowerCase();
  
  // Try to detect if it's more Latin or more Cyrillic
  const latinCount = (input.match(/[a-z]/g) || []).length;
  const cyrillicCount = (input.match(/[а-я]/g) || []).length;

  if (latinCount >= cyrillicCount) {
    // Latin to Cyrillic
    let result = input;
    // Replace multi-char ones first
    const multi = ["o'", "g'", 'ch', 'sh', 'yu', 'ya', 'yo', 'ts'];
    for (const m of multi) {
      result = result.split(m).join(latinToCyrillicMap[m]);
    }
    // Replace single chars
    return result.split('').map(c => latinToCyrillicMap[c] || c).join('');
  } else {
    // Cyrillic to Latin
    let result = input;
    // Replace multi-char ones (if any mapping was complex, actually they are mostly 1 to N here)
    const cyrMulti = ['ч', 'ш', 'ю', 'я', 'ё', 'ц', 'ў', 'ғ'];
    for (const c of cyrMulti) {
       // Since mapping is c: l, we just split and join
       result = result.split(c).join(cyrillicToLatinMap[c]);
    }
    return result.split('').map(c => cyrillicToLatinMap[c] || c).join('');
  }
}

/**
 * Returns a regex-safe string that matches either original or transliterated version.
 * e.g. "lor" -> "lor|лор"
 */
export function getDualLangSearchPattern(text: string): string {
  if (!text) return '';
  const trimmed = text.trim();
  const trans = transliterateUzbek(trimmed);
  if (trimmed === trans) return trimmed;
  
  // Escape regex special chars for safety
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  return `${escape(trimmed)}|${escape(trans)}`;
}
