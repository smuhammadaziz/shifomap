export type AppLanguage = 'uz' | 'ru';

/** Language from store may include 'en'; we treat it as uz for UI. */
export type LanguagePreference = AppLanguage | 'en' | null;

const translations = {
  uz: {
    // Tabs
    tabHome: 'Bosh sahifa',
    tabSchedule: 'Vaqtlar',
    tabPills: 'Dori',
    // Home
    greeting: 'Salom',
    homeSubtitle: "Tibbiy xizmatlarni toping va bron qiling",
    searchPlaceholder: "Klinikalar yoki xizmatlarni qidirish",
    myAppointments: "Mening uchrashuvlarim",
    nextAppointment: "Ertaga, 10:00",
    pillReminders: "Dori eslatmalari",
    pillsRemaining: "Bugun 3 ta qoldi",
    quickCategories: "Tezkor toifalar",
    featuredClinics: "TANLANGGAN KLINIKALAR",
    viewAll: "Hammasini ko'rish",
    kmAway: "km uzoqlikda",
    // Profile
    profileDashboard: "Profil",
    premiumMember: "Premium a'zo",
    upNext: "Keyingi",
    seeAll: "Hammasi",
    consultation: "KONSULTATSIYA",
    visitHistory: "Tashriflar tarixi",
    visitHistorySubtitle: "O'tmish konsultatsiyalar va eslatmalar",
    dailyMeds: "Kunlik dori",
    settings: "Sozlamalar",
    paymentMethods: "To'lov usullari",
    logOut: "Chiqish",
    taken: "Qabul qilindi",
    upcoming: "Kutilmoqda",
    // Settings
    accountSettings: "HISOB SOZLAMALARI",
    editProfile: "Profilni tahrirlash",
    personalInfo: "Shaxsiy ma'lumotlar",
    language: "Til",
    notifications: "BILDIRISHNOMALAR",
    appointmentReminders: "Uchrashuv eslatmalari",
    pillRemindersLabel: "Dori eslatmalari",
    generalNotifications: "Umumiy bildirishnomalar",
    healthSecurity: "SOG'LIQ VA XAVFSIZLIK",
    pillReminderSettings: "Dori eslatmalari sozlamalari",
    privacyPolicy: "Maxfiylik siyosati",
    changePassword: "Parolni o'zgartirish",
    support: "QOLLAB-QUVVATLASH",
    helpSupport: "Yordam va qo'llab-quvvatlash",
    contactUs: "Biz bilan bog'laning",
    logout: "Chiqish",
    patientAccount: "Bemor hisobi",
    version: "Versiya",
    // Language names (for Settings display)
    langUzbek: "O'zbekcha",
    langRussian: "Русский",
  },
  ru: {
    tabHome: 'Главная',
    tabSchedule: 'Расписание',
    tabPills: 'Лекарства',
    greeting: 'Привет',
    homeSubtitle: "Находите и записывайтесь к врачам",
    searchPlaceholder: "Поиск клиник или услуг",
    myAppointments: "Мои записи",
    nextAppointment: "Завтра, 10:00",
    pillReminders: "Напоминания о лекарствах",
    pillsRemaining: "Осталось 3 на сегодня",
    quickCategories: "Категории",
    featuredClinics: "КЛИНИКИ",
    viewAll: "Все",
    kmAway: "км",
    profileDashboard: "Профиль",
    premiumMember: "Премиум участник",
    upNext: "Далее",
    seeAll: "Все",
    consultation: "КОНСУЛЬТАЦИЯ",
    visitHistory: "История визитов",
    visitHistorySubtitle: "Прошлые консультации и заметки",
    dailyMeds: "Лекарства на день",
    settings: "Настройки",
    paymentMethods: "Способы оплаты",
    logOut: "Выйти",
    taken: "Принято",
    upcoming: "Скоро",
    accountSettings: "НАСТРОЙКИ АККАУНТА",
    editProfile: "Редактировать профиль",
    personalInfo: "Личная информация",
    language: "Язык",
    notifications: "УВЕДОМЛЕНИЯ",
    appointmentReminders: "Напоминания о записях",
    pillRemindersLabel: "Напоминания о лекарствах",
    generalNotifications: "Общие уведомления",
    healthSecurity: "ЗДОРОВЬЕ И БЕЗОПАСНОСТЬ",
    pillReminderSettings: "Настройки напоминаний",
    privacyPolicy: "Политика конфиденциальности",
    changePassword: "Изменить пароль",
    support: "ПОДДЕРЖКА",
    helpSupport: "Помощь и поддержка",
    contactUs: "Связаться с нами",
    logout: "Выйти",
    patientAccount: "Аккаунт пациента",
    version: "Версия",
    langUzbek: "O'zbekcha",
    langRussian: "Русский",
  },
} as const;

export type TranslationKey = keyof typeof translations.uz;

export function getTranslations(lang: LanguagePreference | string | null) {
  return translations[lang === 'ru' ? 'ru' : 'uz'];
}

export function t(lang: LanguagePreference, key: TranslationKey): string {
  const dict = getTranslations(lang);
  return dict[key] ?? (translations.uz[key] as string) ?? key;
}
