export type HomeVisitSymptom = {
  key: string;
  uz: string;
  ru: string;
};

export const HOME_VISIT_SYMPTOMS: HomeVisitSymptom[] = [
  { key: 'fever', uz: 'Tana harorati 37,3 dan yuqori', ru: 'Температура выше 37,3' },
  { key: 'runny_nose', uz: 'Burun oqishi', ru: 'Насморк' },
  { key: 'nausea', uz: 'Ko‘ngil aynishi', ru: 'Тошнота' },
  { key: 'cough', uz: 'Yo‘tal', ru: 'Кашель' },
  { key: 'muscle_pain', uz: 'Mushak og‘rig‘i', ru: 'Боль в мышцах' },
  { key: 'breathing', uz: 'Nafas olish qiyin', ru: 'Трудно дышать' },
  { key: 'sore_throat', uz: 'Tomoq og‘rig‘i', ru: 'Боль в горле' },
];

export function symptomLabel(s: HomeVisitSymptom, language: string | null): string {
  return language === 'ru' ? s.ru : s.uz;
}
