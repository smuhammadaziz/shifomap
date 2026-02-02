import content from './content.json';

export type AppLanguage = 'uz' | 'ru';

/** Language from store may include 'en'; we treat it as uz for UI. */
export type LanguagePreference = AppLanguage | 'en' | null;

type ContentLang = typeof content.uz;
export type TranslationKey = keyof ContentLang;

const translations = content as { uz: ContentLang; ru: ContentLang };

export function getTranslations(lang: LanguagePreference | string | null): ContentLang {
  return lang === 'ru' ? translations.ru : translations.uz;
}

export function t(lang: LanguagePreference, key: TranslationKey): string {
  const dict = getTranslations(lang);
  return (dict[key] ?? translations.uz[key] ?? key) as string;
}
