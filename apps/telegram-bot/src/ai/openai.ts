import OpenAI from "openai"
import { env } from "../env.js"
import { searchRelevantServices, type RelevantService } from "../db/clinics.repo.js"

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY.trim(),
})

const MODEL = "gpt-4o-mini"

export type AiLang = "uz" | "ru"

/**
 * Format service results into a text block to append AFTER the AI response.
 * This is NOT sent to the AI — we append it ourselves to save tokens.
 */
function formatServiceBlock(services: RelevantService[], lang: AiLang): string {
  const lines: string[] = []

  for (const svc of services) {
    if (lang === "ru") {
      let line = `• ${svc.serviceTitle} — "${svc.clinicName}"`
      if (svc.price) line += `, ${svc.price}`
      if (svc.doctorName && svc.specialty) line += ` (${svc.doctorName}, ${svc.specialty})`
      lines.push(line)
    } else {
      let line = `• ${svc.serviceTitle} — "${svc.clinicName}"`
      if (svc.price) line += `, ${svc.price}`
      if (svc.doctorName && svc.specialty) line += ` (${svc.doctorName}, ${svc.specialty})`
      lines.push(line)
    }
  }

  const header = lang === "ru"
    ? "🏥 На платформе ShifoYo'l:"
    : "🏥 ShifoYo'l ilovamizda:"

  const footer = lang === "ru"
    ? "\n\n📲 Скачайте приложение ShifoYo'l для записи к врачу!"
    : "\n\n📲 Shifokorga yozilish uchun ShifoYo'l ilovasini yuklab oling!"

  return `\n\n${header}\n${lines.join("\n")}${footer}`
}

export async function generateHealthReply(userMessage: string, replyLang: AiLang = "uz"): Promise<string> {
  // Step 1: Query DB for matching services (uses actual user words, not a keyword map)
  let services: RelevantService[] = []
  try {
    services = await searchRelevantServices(userMessage, 2)
  } catch (err) {
    console.error("[Clinics DB query error]", err)
  }

  // Step 2: Build system prompt — simple, no DB context injected (saves tokens)
  const langInstruction =
    replyLang === "ru"
      ? "Reply ONLY in Russian (Русский). Do not use Uzbek or other languages."
      : "Reply ONLY in Uzbek (O'zbekcha). Do not use Russian or other languages."

  const systemPrompt = `You are a brief health assistant. Give short explanations and 2-4 bullet tips. Use simple words. Add emoji per section (e.g. 💡 📌 ⚠️). Do not replace a real doctor visit. Keep reply under 400 chars when possible.\n\n${langInstruction}`

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 512,
      temperature: 0.4,
    })

    let text = response.choices[0]?.message?.content?.trim()
    if (!text) throw new Error("OpenAI returned empty response")

    // Step 3: Append service recommendations ONLY if we found matching services
    if (services.length > 0) {
      text += formatServiceBlock(services, replyLang)
    }

    return text
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error("[OpenAI Error]", errMsg)
    throw error
  }
}
