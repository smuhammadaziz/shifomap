import { env } from "../env.js"

// Try versioned names (v1beta often needs these). Order: prefer free-tier / stable models first.
const MODELS = [
  "gemini-2.5-flash-lite",  // often has free quota
  "gemini-2.5-flash",
  "gemini-1.5-flash-001",
  "gemini-1.5-flash-002",
  "gemini-1.5-flash-latest",
  "gemini-2.0-flash",
] as const

function buildUrl(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
}

const SYSTEM_PROMPT = `You are a brief health assistant. Reply in the same language as the user. Give short explanations and 2-4 bullet tips. Use simple words. Add emoji per section (e.g. 💡 📌 ⚠️). Do not replace a real doctor visit. Keep reply under 400 chars when possible.`

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function generateHealthReply(userMessage: string): Promise<string> {
  const key = env.GEMINI_API_KEY.trim()
  const fullPrompt = `${SYSTEM_PROMPT}\n\nUser: ${userMessage}`

  const body = {
    contents: [{ parts: [{ text: fullPrompt }] }],
    generationConfig: {
      maxOutputTokens: 512,
      temperature: 0.4,
    },
  }

  let lastError: Error | null = null
  for (const model of MODELS) {
    const url = buildUrl(model)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) await sleep(4500) // retry after 429 "retry in 3.4s"
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": key,
          },
          body: JSON.stringify(body),
        })
        const data = await res.json().catch(() => ({})) as Record<string, unknown>

        if (!res.ok) {
          const errMsg = (data.error as { message?: string })?.message ?? JSON.stringify(data)
          lastError = new Error(`Gemini ${model}: ${res.status} ${errMsg}`)
          console.error("[Gemini]", model, res.status, errMsg.slice(0, 200))
          if (res.status === 429 && attempt === 0) continue
          break
        }

        const text = (data.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }>)?.[0]?.content?.parts?.[0]?.text?.trim()
        if (text) return text
        lastError = new Error("Gemini returned empty response")
        break
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e))
        console.error("[Gemini]", model, lastError.message)
        break
      }
    }
  }

  if (lastError) {
    console.error("[Gemini] All models failed. Last error:", lastError.message)
    throw lastError
  }
  throw new Error("Gemini returned no text")
}
