export type Lang = "uz" | "ru"

export const t = {
  uz: {
    hi: "Salom",
    chooseLang: "Tilni tanlang:",
    sharePhone: "📞 Telefon raqamini ulashing",
    sharePhonePrompt: "Davom etish uchun telefon raqamingizni ulashing.",
    thanks: "Rahmat! Qanday yordam bera olamiz?",
    support: "📩 Qo'llab-quvvatlash",
    shareOwnPhone: "Iltimos, o'z telefon raqamingizni ulashing.",
    typeSupportMessage: "Xabaringizni yozing va yuboring. Qo'llab-quvvatlash jamoasiga yuboramiz.",
    sentToSupport: "✅ Xabaringiz qo'llab-quvvatlashga yuborildi. Tez orada javob beramiz.",
    tapSupport: '"📩 Qo\'llab-quvvatlash" tugmasini bosing.',
    startAndSharePhone: "/start bosing va telefon raqamingizni ulashing.",
    pleaseStartAndPhone: "/start bosing va avval telefon raqamingizni ulashing.",
    pleaseStartAndShareFirst: "/start bosing va avval telefon raqamingizni ulashing.",
    myDoctor: "🩺 Mening doktorim",
    personalDoctor: "🩺 Shaxsiy doktor",
    personalDoctorIntro: "Har qanday matn yuboring – belgilar, shikoyatlar yoki savollar. Men sizga qisqa tushuntirish va tavsiyalar beraman (bu maslahat konsultatsiya o'rniga bo'lmaydi).",
    preparingResponse: "⏳ Javobingiz tayyorlanmoqda...",
    meaningPreparing: "📋 Matningiz tahlil qilinmoqda, javob tayyorlanmoqda...",
    aiLimitReached: "Bugun uchun limit tugadi (kuniga 3 ta bepul). Ertaga yoki do'stlaringizni taklif qilib +10 ta qo'shimcha olishingiz mumkin.",
    inviteForBonus: "Do'stlaringizni taklif qiling – har bir ro'yxatdan o'tgan do'st uchun 10 ta qo'shimcha AI javob olasiz. Ulashing:",
    yourReferralLink: "Sizning havolangiz (do'stlar ro'yxatdan o'tganda siz +10 olasiz):",
    bonusAdded: "🎉 10 ta bepul AI javob qo'shildi (do'stingiz ro'yxatdan o'tdi).",
    askNewPressButton: "🩺 Yangi savol berish uchun «Shaxsiy doktor» tugmasini qayta bosing.",
    aboutUs: "ℹ️ Biz haqimizda",
    aboutUsPost:
      "🎉 ShifoYo'l - salomatlikni boshqarish uchun kerak bo'lgan barcha narsalar bir joyda jamlangan platforma. Bu hali faqat birinchi qadam va boshlanishi.\n\n⚡️ InshaAllah tez orada ilovamiz tayyor bo'ladi va ishga tushadi. Hozir esa saytimiz orqali barcha funksiyalar bilan batafsil tanishib chiqishingiz mumkin.\n\n📢 Rasmiy kanal: @shifo_yol",
  },
  ru: {
    hi: "Привет",
    chooseLang: "Выберите язык:",
    sharePhone: "📞 Поделиться номером телефона",
    sharePhonePrompt: "Чтобы продолжить, поделитесь номером телефона.",
    thanks: "Спасибо! Чем можем помочь?",
    support: "📩 Поддержка",
    shareOwnPhone: "Пожалуйста, поделитесь своим номером телефона.",
    typeSupportMessage: "Напишите сообщение и отправьте. Мы перешлём его в службу поддержки.",
    sentToSupport: "✅ Ваше сообщение отправлено в поддержку. Мы скоро ответим.",
    tapSupport: 'Нажмите кнопку "📩 Поддержка".',
    startAndSharePhone: "Нажмите /start и поделитесь номером телефона.",
    pleaseStartAndPhone: "Нажмите /start и сначала поделитесь номером телефона.",
    pleaseStartAndShareFirst: "Нажмите /start и сначала поделитесь номером телефона.",
    myDoctor: "🩺 Мой доктор",
    personalDoctor: "🩺 Личный доктор",
    personalDoctorIntro: "Отправьте любой текст – симптомы, жалобы или вопросы. Я дам краткое объяснение и рекомендации (это не замена консультации врача).",
    preparingResponse: "⏳ Готовлю ответ...",
    meaningPreparing: "📋 Ваше сообщение анализируется, ответ готовится...",
    aiLimitReached: "На сегодня лимит исчерпан (3 бесплатных в день). Завтра снова или пригласите друзей и получите +10 за каждого.",
    inviteForBonus: "Приглашайте друзей – за каждого зарегистрировавшегося получите 10 доп. ответов ИИ. Поделиться:",
    yourReferralLink: "Ваша ссылка (вы получите +10, когда друг зарегистрируется):",
    bonusAdded: "🎉 Добавлено 10 бесплатных ответов ИИ (друг зарегистрировался).",
    askNewPressButton: "🩺 Чтобы задать новый вопрос, нажмите кнопку «Личный доктор» снова.",
    aboutUs: "ℹ️ О нас",
    aboutUsPost:
      "🎉 ShifoYo'l — платформа, где собрано всё необходимое для управления здоровьем. Это пока только первый шаг и начало.\n\n⚡️ Иншааллах скоро приложение будет готово и запустится. Пока вы можете подробно ознакомиться со всеми функциями на нашем сайте.\n\n📢 Официальный канал: @shifo_yol",
  },
} as const

export function getLang(lang: Lang) {
  return t[lang]
}
