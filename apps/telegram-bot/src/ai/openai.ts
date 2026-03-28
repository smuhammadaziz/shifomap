import OpenAI from "openai"
import { env } from "../env.js"

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY.trim(),
})

const MODEL = "gpt-4o-mini" // Fast, efficient and powerful for brief health tips

const SYSTEM_PROMPT_BASE = `You are a brief health assistant. Give short explanations and 2-4 bullet tips. Use simple words. Add emoji per section (e.g. 💡 📌 ⚠️). Do not replace a real doctor visit. Keep reply under 400 chars when possible.`

export type AiLang = "uz" | "ru"

export async function generateHealthReply(userMessage: string, replyLang: AiLang = "uz"): Promise<string> {
  const langInstruction =
    replyLang === "ru"
      ? "Reply ONLY in Russian (Русский). Do not use Uzbek or other languages."
      : "Reply ONLY in Uzbek (O'zbekcha). Do not use Russian or other languages."
  
  const systemPrompt = `${SYSTEM_PROMPT_BASE}\n\n${langInstruction}`

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

    const text = response.choices[0]?.message?.content?.trim()
    if (text) return text
    
    throw new Error("OpenAI returned empty response")
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error("[OpenAI Error]", errMsg)
    throw error
  }
}
