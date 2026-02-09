import { z } from "zod"

/**
 * Environment variables schema
 * All required env vars are validated on startup
 */
const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  MONGODB_DB_NAME: z.string().min(1, "MONGODB_DB_NAME is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_ISSUER: z.string().default("api-main"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN is required for landing notifications"),
  TELEGRAM_GROUP_CHAT_ID: z.string().min(1, "TELEGRAM_GROUP_CHAT_ID is required (e.g. -1001234567890)"),
})

export type Env = z.infer<typeof envSchema>

/**
 * Load and validate environment variables
 * Throws if validation fails
 */
function loadEnv(): Env {
  const parsed = envSchema.safeParse({
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    MONGODB_URI: process.env.MONGODB_URI,
    MONGODB_DB_NAME: process.env.MONGODB_DB_NAME,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_ISSUER: process.env.JWT_ISSUER,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_GROUP_CHAT_ID: process.env.TELEGRAM_GROUP_CHAT_ID,
  })

  if (!parsed.success) {
    console.error("Invalid environment variables:")
    console.error(parsed.error.flatten().fieldErrors)
    throw new Error("Environment validation failed")
  }

  return parsed.data
}

export const env = loadEnv()
