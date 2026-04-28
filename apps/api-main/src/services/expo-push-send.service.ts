/**
 * Sends remote notifications via Expo Push API (APNs / FCM routed by Expo).
 * @see https://docs.expo.dev/push-notifications/sending-notifications/
 */

import { logger } from "@/common/logger"

const EXPO_PUSH_SEND_URL = "https://exp.host/--/api/v2/push/send"

const MAX_TITLE = 120
const MAX_BODY = 360

export type ExpoPushData = Record<string, string>

export async function sendExpoPushBroadcast(input: {
  tokens: readonly string[]
  title: string
  body: string
  data: ExpoPushData
  /** Prefer high for alerts */
  priority?: "default" | "normal" | "high"
  sound?: string | null
}): Promise<void> {
  if (input.tokens.length === 0) return

  const title = input.title.replace(/\u0000/g, "").slice(0, MAX_TITLE)
  const body = input.body.replace(/\u0000/g, "").slice(0, MAX_BODY)

  const payload = [
    {
      to: [...input.tokens],
      title,
      body,
      sound: input.sound ?? "default",
      priority: input.priority ?? "high",
      data: input.data,
    },
  ]

  try {
    const res = await fetch(EXPO_PUSH_SEND_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const json = (await res.json()) as {
      data?: Array<{ status: string; message?: string; details?: unknown } | { errors?: unknown }>
      errors?: unknown
    }

    if (!res.ok) {
      logger.warn("[expo-push] HTTP error", { status: res.status, json })
      return
    }

    const item = json.data?.[0]
    const errStatus = typeof item === "object" && item && "status" in item ? item.status : ""
    const errDetails = typeof item === "object" && item && "details" in item ? item.details : undefined

    if (errStatus === "error") {
      logger.warn("[expo-push] ticket error", {
        status: errStatus,
        message: typeof item === "object" && item && "message" in item ? (item as { message?: string }).message : "",
        details: errDetails ?? json.errors,
      })
    }
  } catch (e: unknown) {
    logger.warn("[expo-push] request failed", { err: e instanceof Error ? e.message : String(e) })
  }
}
