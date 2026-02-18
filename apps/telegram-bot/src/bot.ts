import { Telegraf, Markup } from "telegraf"
import { message } from "telegraf/filters"
import { env } from "./env.js"
import { connectMongo, getDb, TELEGRAM_USERS_COLLECTION } from "./db/mongo.js"
import {
  findUserByTgChatId,
  upsertUser,
  appendMessage,
  updateUserName,
  canUseAi,
  consumeAiUsage,
  addReferralBonus,
} from "./db/telegram-users.repo.js"
import { getLang, t, type Lang } from "./i18n.js"
import { generateHealthReply } from "./ai/gemini.js"

const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN)
const GROUP_CHAT_ID = env.TELEGRAM_GROUP_CHAT_ID

// Only handle private chats (DMs).
bot.use((ctx, next) => {
  if (ctx.chat?.type !== "private") return
  return next()
})

// In-memory: language and pending referral (not saved to DB)
const userLang = new Map<number, Lang>()
const pendingReferral = new Map<number, number>() // chatId -> referrerChatId
const waitingForSupportMessage = new Set<number>()
const waitingForAiPrompt = new Set<number>()
const waitingForNewName = new Set<number>()
const waitingForLanguageChange = new Set<number>()

function formatDate(d: Date): string {
  const day = d.getDate().toString().padStart(2, "0")
  const month = (d.getMonth() + 1).toString().padStart(2, "0")
  const year = d.getFullYear()
  const hour = d.getHours().toString().padStart(2, "0")
  const min = d.getMinutes().toString().padStart(2, "0")
  return `${day}.${month}.${year} ${hour}.${min}`
}

function lang(ctx: { chat: { id: number } }): Lang {
  return userLang.get(ctx.chat.id) ?? "uz"
}

function mainMenuKeyboard(l: Lang) {
  const msg = getLang(l)
  return Markup.keyboard([
    [Markup.button.text(msg.myDoctor)],
    [Markup.button.text(msg.support), Markup.button.text(msg.aboutUs)],
    [Markup.button.text(msg.settings)],
  ]).resize()
}

function settingsMenuKeyboard(l: Lang) {
  const msg = getLang(l)
  return Markup.keyboard([
    [Markup.button.text(msg.back)],
    [Markup.button.text(msg.changeName), Markup.button.text(msg.changeLanguage)],
    [Markup.button.text(msg.myAiUsage)],
  ]).resize()
}

function isMyDoctorButton(text: string): boolean {
  return text === t.uz.myDoctor || text === t.ru.myDoctor
}
function isSupportButton(text: string): boolean {
  return text === t.uz.support || text === t.ru.support
}
function isAboutUsButton(text: string): boolean {
  return text === t.uz.aboutUs || text === t.ru.aboutUs
}
function isSettingsButton(text: string): boolean {
  return text === t.uz.settings || text === t.ru.settings
}
function isBackButton(text: string): boolean {
  return text === t.uz.back || text === t.ru.back
}
function isChangeNameButton(text: string): boolean {
  return text === t.uz.changeName || text === t.ru.changeName
}
function isChangeLanguageButton(text: string): boolean {
  return text === t.uz.changeLanguage || text === t.ru.changeLanguage
}
function isMyAiUsageButton(text: string): boolean {
  return text === t.uz.myAiUsage || text === t.ru.myAiUsage
}

// /start – language selection or referral payload
bot.start(async (ctx) => {
  const payload = ctx.startPayload?.trim() || ""
  const referrerMatch = payload.startsWith("ref_") ? payload.slice(4) : ""
  const referrerId = referrerMatch ? parseInt(referrerMatch, 10) : NaN
  if (payload.startsWith("ref_") && !Number.isNaN(referrerId) && referrerId !== ctx.chat.id) {
    pendingReferral.set(ctx.chat.id, referrerId)
  }

  const name = ctx.from?.first_name ?? "there"
  const l = userLang.get(ctx.chat.id) ?? "uz"
  const msg = getLang(l)
  await ctx.reply(
    `${msg.hi}, ${name}! 👋\n\n${msg.chooseLang}`,
    Markup.keyboard([
      [Markup.button.text("O'zbekcha"), Markup.button.text("Русский")],
    ]).resize()
  )
})

// /ai – open AI (personal doctor) flow
bot.command("ai", async (ctx) => {
  const chatId = ctx.chat.id
  if (!userLang.has(chatId)) {
    await ctx.reply(
      "Tilni tanlang / Выберите язык:",
      Markup.keyboard([
        [Markup.button.text("O'zbekcha"), Markup.button.text("Русский")],
      ]).resize()
    )
    return
  }
  const l = lang(ctx)
  const msg = getLang(l)
  const user = await findUserByTgChatId(chatId)
  if (!user) {
    await ctx.reply(msg.pleaseStartAndShareFirst)
    return
  }
  if (!canUseAi(user)) {
    const botUsername = (await ctx.telegram.getMe()).username
    await ctx.reply(
      `${msg.aiLimitReached}\n\n${msg.yourReferralLink}\nhttps://t.me/${botUsername}?start=ref_${chatId}`
    )
    return
  }
  waitingForAiPrompt.add(chatId)
  await ctx.reply(msg.personalDoctorIntro, Markup.removeKeyboard())
})

// /settings – open settings menu
bot.command("settings", async (ctx) => {
  const chatId = ctx.chat.id
  if (!userLang.has(chatId)) {
    await ctx.reply(
      "Tilni tanlang / Выберите язык:",
      Markup.keyboard([
        [Markup.button.text("O'zbekcha"), Markup.button.text("Русский")],
      ]).resize()
    )
    return
  }
  const l = lang(ctx)
  const msg = getLang(l)
  await ctx.reply(msg.chooseAction, settingsMenuKeyboard(l))
})

// /about – show about us
bot.command("about", async (ctx) => {
  const chatId = ctx.chat.id
  if (!userLang.has(chatId)) {
    await ctx.reply(
      "Tilni tanlang / Выберите язык:",
      Markup.keyboard([
        [Markup.button.text("O'zbekcha"), Markup.button.text("Русский")],
      ]).resize()
    )
    return
  }
  const l = lang(ctx)
  const msg = getLang(l)
  await ctx.reply(`${msg.aboutUsPost}\n\n`)
})

// Language selection (start flow or change-language-from-settings)
bot.hears(["O'zbekcha", "Русский"], async (ctx) => {
  const text = ctx.message.text
  const newLang: Lang = text === "Русский" ? "ru" : "uz"
  userLang.set(ctx.chat.id, newLang)
  const msg = getLang(newLang)
  if (waitingForLanguageChange.has(ctx.chat.id)) {
    waitingForLanguageChange.delete(ctx.chat.id)
    await ctx.reply(msg.thanks, mainMenuKeyboard(newLang))
    return
  }
  await ctx.reply(msg.sharePhonePrompt, Markup.keyboard([Markup.button.contactRequest(msg.sharePhone)]).resize())
})

bot.on(message("contact"), async (ctx) => {
  const contact = ctx.message.contact
  const userId = contact?.user_id ?? ctx.from?.id
  if (userId !== ctx.from?.id) {
    const msg = getLang(lang(ctx))
    await ctx.reply(msg.shareOwnPhone)
    return
  }
  const phone = contact?.phone_number
    ? (contact.phone_number.startsWith("+") ? contact.phone_number : `+${contact.phone_number}`)
    : ""
  const name = ctx.from?.first_name ?? ctx.from?.username ?? "User"
  const referrerChatId = pendingReferral.get(ctx.chat.id)
  const wasNew = (await findUserByTgChatId(ctx.chat.id)) === null

  await upsertUser({
    name,
    tgChatId: ctx.chat.id,
    phoneNumber: phone,
    referredBy: referrerChatId,
  })
  if (referrerChatId != null && wasNew) {
    pendingReferral.delete(ctx.chat.id)
    await addReferralBonus(referrerChatId)
    try {
      const refMsg = getLang(userLang.get(referrerChatId) ?? "uz")
      await ctx.telegram.sendMessage(referrerChatId, refMsg.bonusAdded)
    } catch (_) { }
  }

  const msg = getLang(lang(ctx))
  await ctx.reply(msg.thanks, mainMenuKeyboard(lang(ctx)))
})

bot.on(message("text"), async (ctx) => {
  const text = ctx.message.text
  const chatId = ctx.chat.id
  if (!userLang.has(chatId)) {
    await ctx.reply(
      "Tilni tanlang / Выберите язык:",
      Markup.keyboard([
        [Markup.button.text("O'zbekcha"), Markup.button.text("Русский")],
      ]).resize()
    )
    return
  }
  const l = lang(ctx)
  const msg = getLang(l)

  // Change name flow (user sent new name as text)
  if (waitingForNewName.has(chatId)) {
    waitingForNewName.delete(chatId)
    const user = await findUserByTgChatId(chatId)
    if (!user) {
      await ctx.reply(msg.pleaseStartAndShareFirst)
      return
    }
    const newName = text.trim() || user.name
    await updateUserName(chatId, newName)
    await ctx.reply(msg.nameUpdated, mainMenuKeyboard(l))
    return
  }

  // Settings menu actions
  if (isSettingsButton(text)) {
    await ctx.reply(msg.chooseAction, settingsMenuKeyboard(l))
    return
  }
  if (isBackButton(text)) {
    await ctx.reply(msg.backToMenu, mainMenuKeyboard(l))
    return
  }
  if (isChangeNameButton(text)) {
    const user = await findUserByTgChatId(chatId)
    if (!user) {
      await ctx.reply(msg.pleaseStartAndShareFirst)
      return
    }
    waitingForNewName.add(chatId)
    await ctx.reply(msg.enterNewName, Markup.removeKeyboard())
    return
  }
  if (isChangeLanguageButton(text)) {
    waitingForLanguageChange.add(chatId)
    await ctx.reply(msg.chooseLang, Markup.keyboard([
      [Markup.button.text("O'zbekcha"), Markup.button.text("Русский")],
    ]).resize())
    return
  }
  if (isMyAiUsageButton(text)) {
    const user = await findUserByTgChatId(chatId)
    if (!user) {
      await ctx.reply(msg.pleaseStartAndShareFirst)
      return
    }
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    const usedToday = user.aiUsedTodayDate === todayStr ? (user.aiUsedToday ?? 0) : 0
    const total = user.aiQuestionsTotal ?? 0
    const bonus = user.aiBonusBank ?? 0
    const statsText = msg.aiUsageStats(total, usedToday, bonus)
    await ctx.reply(statsText, settingsMenuKeyboard(l))
    return
  }

  // Support flow
  if (waitingForSupportMessage.has(chatId)) {
    waitingForSupportMessage.delete(chatId)
    const user = await findUserByTgChatId(chatId)
    if (!user) {
      await ctx.reply(msg.pleaseStartAndShareFirst)
      return
    }
    await appendMessage(chatId, text)
    const now = new Date()
    const accountValue = ctx.from?.username
      ? `@${ctx.from.username}`
      : ctx.from?.id
        ? `tg://user?id=${ctx.from.id}`
        : "—"
    const groupMessage = [
      "👤 user",
      `ismi: ${user.name}`,
      `phone: ${user.phoneNumber}`,
      `account: ${accountValue}`,
      `message: ${text}`,
      "",
      formatDate(now),
    ].join("\n")
    await ctx.telegram.sendMessage(GROUP_CHAT_ID, groupMessage)
    await ctx.reply(msg.sentToSupport, mainMenuKeyboard(l))
    return
  }

  if (isSupportButton(text)) {
    const user = await findUserByTgChatId(chatId)
    if (!user) {
      await ctx.reply(msg.pleaseStartAndShareFirst)
      return
    }
    waitingForSupportMessage.add(chatId)
    await ctx.reply(msg.typeSupportMessage, Markup.removeKeyboard())
    return
  }

  // AI (Shaxsiy doktor) flow
  if (waitingForAiPrompt.has(chatId)) {
    waitingForAiPrompt.delete(chatId)
    const user = await findUserByTgChatId(chatId)
    if (!user) {
      await ctx.reply(msg.pleaseStartAndShareFirst)
      return
    }
    if (!canUseAi(user)) {
      const botUsername = (await ctx.telegram.getMe()).username
      await ctx.reply(
        `${msg.aiLimitReached}\n\n${msg.yourReferralLink}\nhttps://t.me/${botUsername}?start=ref_${chatId}`
      )
      return
    }
    await ctx.sendChatAction("typing")
    const preparingMsg = await ctx.reply(msg.meaningPreparing)
    try {
      const aiText = await generateHealthReply(text, l)
      await consumeAiUsage(chatId)
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        preparingMsg.message_id,
        undefined,
        aiText.slice(0, 4096)
      )
      await ctx.reply(msg.askNewPressButton, mainMenuKeyboard(l))
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error("[Shaxsiy doktor AI error]", errMsg)
      const errText = l === "ru" ? "❌ Не удалось подготовить ответ. Попробуйте позже." : "❌ Javob tayyorlanmadi. Keyinroq urinib ko'ring."
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        preparingMsg.message_id,
        undefined,
        errText
      ).catch(() => { })
      await ctx.reply(msg.askNewPressButton, mainMenuKeyboard(l))
    }
    return
  }

  if (isAboutUsButton(text)) {
    await ctx.reply(`${msg.aboutUsPost}\n\n`)
    return
  }

  if (isMyDoctorButton(text)) {
    const user = await findUserByTgChatId(chatId)
    if (!user) {
      await ctx.reply(msg.pleaseStartAndShareFirst)
      return
    }
    if (!canUseAi(user)) {
      const botUsername = (await ctx.telegram.getMe()).username
      await ctx.reply(
        `${msg.aiLimitReached}\n\n${msg.yourReferralLink}\nhttps://t.me/${botUsername}?start=ref_${chatId}`
      )
      return
    }
    waitingForAiPrompt.add(chatId)
    await ctx.reply(msg.personalDoctorIntro, Markup.removeKeyboard())
    return
  }

  // Other text: remind buttons
  const user = await findUserByTgChatId(chatId)
  if (user) {
    await ctx.reply(msg.tapSupport, mainMenuKeyboard(l))
  } else {
    await ctx.reply(msg.startAndSharePhone, Markup.keyboard([Markup.button.contactRequest(msg.sharePhone)]).resize())
  }
})

function getCommandsForLang(l: Lang) {
  const msg = getLang(l)
  return [
    { command: "start", description: msg.cmdStart },
    { command: "ai", description: msg.cmdAi },
    { command: "settings", description: msg.cmdSettings },
    { command: "about", description: msg.cmdAbout },
  ]
}

export async function runBot(): Promise<void> {
  await connectMongo()
  const db = getDb()
  try {
    await db.collection(TELEGRAM_USERS_COLLECTION).createIndex({ tgChatId: 1 }, { unique: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (!msg.includes("already exists") && !msg.includes("duplicate")) throw e
  }
  const commandsUz = getCommandsForLang("uz")
  const commandsRu = getCommandsForLang("ru")
  await bot.telegram.setMyCommands(commandsUz)
  await bot.telegram.setMyCommands(commandsUz, { language_code: "uz" })
  await bot.telegram.setMyCommands(commandsRu, { language_code: "ru" })
  await bot.launch()
  console.log("Telegram bot is running")
}

process.once("SIGINT", () => bot.stop("SIGINT"))
process.once("SIGTERM", () => bot.stop("SIGTERM"))
