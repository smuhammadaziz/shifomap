/** Uzbekistan mobile operator prefixes (2 digits after +998). */
export const UZ_OPERATOR_PREFIXES = [
  '33',
  '71',
  '88',
  '90',
  '91',
  '92',
  '93',
  '94',
  '95',
  '97',
  '98',
  '99',
  '20',
] as const;

/** Nine national digits (without country code). */
export function isValidUzPhone9(digits: string): boolean {
  if (!/^\d{9}$/.test(digits)) return false;
  const prefix = digits.slice(0, 2);
  return (UZ_OPERATOR_PREFIXES as readonly string[]).includes(prefix);
}

export const UZ_PHONE_INLINE_ERROR_UZ = "Bunday operator kodi mavjud emas yoki raqam noto'g'ri.";
export const UZ_PHONE_INLINE_ERROR_RU = 'Неверный код оператора или номер.';
