/**
 * Shared working-hours line for clinic/doctor UIs.
 * `weekly` items: { day: 1–7 (Mon=1 … Sun=7), from, to } in HH:mm
 */
export function formatWorkingHoursSummary(
  weekly: Array<{ day: number; from: string; to: string }> | undefined,
  lang: 'uz' | 'ru' | 'en'
): string {
  if (!weekly?.length) return lang === 'ru' ? 'График не указан' : lang === 'uz' ? 'Ish vaqti ko‘rsatilmagan' : 'Hours not set';
  const dayShort =
    lang === 'ru'
      ? ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
      : lang === 'en'
        ? ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        : ['', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
  const sorted = [...weekly].sort((a, b) => a.day - b.day);
  const parts = sorted.map((w) => `${dayShort[w.day] ?? w.day}: ${w.from}–${w.to}`);
  return parts.join(' · ');
}
