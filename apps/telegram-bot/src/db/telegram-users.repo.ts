import type { ObjectId } from "mongodb"
import { getDb, TELEGRAM_USERS_COLLECTION } from "./mongo.js"

const DAILY_FREE_AI = 3
const BONUS_PER_REFERRAL = 10

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export interface TelegramUserDoc {
  _id?: ObjectId
  name: string
  tgChatId: number
  phoneNumber: string
  messages: { text: string; createdAt: Date }[]
  updatedAt: Date
  referredBy?: number
  aiBonusBank?: number
  aiUsedToday?: number
  aiUsedTodayDate?: string
}

export async function findUserByTgChatId(tgChatId: number): Promise<TelegramUserDoc | null> {
  const db = getDb()
  const doc = await db.collection<TelegramUserDoc>(TELEGRAM_USERS_COLLECTION).findOne({ tgChatId })
  return doc ?? null
}

export async function upsertUser(data: {
  name: string
  tgChatId: number
  phoneNumber: string
  referredBy?: number
}): Promise<TelegramUserDoc> {
  const db = getDb()
  const now = new Date()
  const today = todayStr()
  const result = await db.collection<TelegramUserDoc>(TELEGRAM_USERS_COLLECTION).findOneAndUpdate(
    { tgChatId: data.tgChatId },
    {
      $set: {
        name: data.name,
        phoneNumber: data.phoneNumber,
        ...(data.referredBy != null && { referredBy: data.referredBy }),
        updatedAt: now,
      },
      $setOnInsert: {
        messages: [],
        aiBonusBank: 0,
        aiUsedToday: 0,
        aiUsedTodayDate: today,
      },
    },
    { upsert: true, returnDocument: "after" }
  )
  if (!result) throw new Error("Upsert failed")
  const user = result as TelegramUserDoc
  if (!user.aiBonusBank && user.aiBonusBank !== 0) {
    await db.collection(TELEGRAM_USERS_COLLECTION).updateOne(
      { tgChatId: data.tgChatId },
      { $set: { aiBonusBank: 0, aiUsedToday: 0, aiUsedTodayDate: today } }
    )
  }
  return user
}

export async function appendMessage(tgChatId: number, text: string): Promise<void> {
  const db = getDb()
  await db.collection<TelegramUserDoc>(TELEGRAM_USERS_COLLECTION).updateOne(
    { tgChatId },
    {
      $push: { messages: { text, createdAt: new Date() } },
      $set: { updatedAt: new Date() },
    }
  )
}

export function canUseAi(user: TelegramUserDoc): boolean {
  const today = todayStr()
  let used = user.aiUsedToday ?? 0
  const date = user.aiUsedTodayDate ?? ""
  if (date !== today) used = 0
  const bonus = user.aiBonusBank ?? 0
  return used < DAILY_FREE_AI || bonus > 0
}

export async function consumeAiUsage(tgChatId: number): Promise<void> {
  const db = getDb()
  const today = todayStr()
  const doc = await db.collection<TelegramUserDoc>(TELEGRAM_USERS_COLLECTION).findOne({ tgChatId })
  if (!doc) return
  let used = doc.aiUsedToday ?? 0
  const date = doc.aiUsedTodayDate ?? ""
  if (date !== today) used = 0
  const bonus = doc.aiBonusBank ?? 0
  if (used < DAILY_FREE_AI) {
    await db.collection(TELEGRAM_USERS_COLLECTION).updateOne(
      { tgChatId },
      {
        $set: {
          aiUsedToday: used + 1,
          aiUsedTodayDate: today,
          updatedAt: new Date(),
        },
      }
    )
  } else if (bonus > 0) {
    await db.collection(TELEGRAM_USERS_COLLECTION).updateOne(
      { tgChatId },
      {
        $inc: { aiBonusBank: -1 },
        $set: { updatedAt: new Date() },
      }
    )
  }
}

export async function addReferralBonus(referrerTgChatId: number): Promise<void> {
  const db = getDb()
  await db.collection(TELEGRAM_USERS_COLLECTION).updateOne(
    { tgChatId: referrerTgChatId },
    { $inc: { aiBonusBank: BONUS_PER_REFERRAL }, $set: { updatedAt: new Date() } }
  )
}
