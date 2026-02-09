import { env } from "@/env"
import { LandingContactBody } from "./landing.model"

const TELEGRAM_API = "https://api.telegram.org"

function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0")
  const m = (date.getMonth() + 1).toString().padStart(2, "0")
  const y = date.getFullYear()
  const h = date.getHours().toString().padStart(2, "0")
  const min = date.getMinutes().toString().padStart(2, "0")
  return `${d}.${m}.${y} ${h}.${min}`
}

/**
 * Send landing page clinic contact to Telegram group (as bot message).
 * Message format with icons as requested.
 */
export async function sendClinicContactToTelegram(data: LandingContactBody): Promise<void> {
  const chatId = env.TELEGRAM_GROUP_CHAT_ID
  const token = env.TELEGRAM_BOT_TOKEN
  const now = formatDate(new Date())

  const text = [
    "🏥 *New Clinic Contacted*",
    "",
    `📌 *Name:* ${escapeMarkdown(data.clinicName)}`,
    `📞 *Phone:* ${escapeMarkdown(data.phoneNumber)}`,
    "",
    `🕐 ${now} da yubordi`,
  ].join("\n")

  const url = `${TELEGRAM_API}/bot${token}/sendMessage`
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Telegram API error: ${res.status} ${err}`)
  }
}

function escapeMarkdown(s: string): string {
  return s.replace(/([_*[\]()~`>#+=|{}.!-])/g, "\\$1")
}
