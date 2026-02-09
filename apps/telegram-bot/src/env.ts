const required = (key: string): string => {
  const v = process.env[key]
  if (!v) throw new Error(`Missing env: ${key}`)
  return v
}

export const env = {
  TELEGRAM_BOT_TOKEN: required("TELEGRAM_BOT_TOKEN"),
  TELEGRAM_GROUP_CHAT_ID: required("TELEGRAM_GROUP_CHAT_ID"),
  MONGODB_URI: required("MONGODB_URI"),
  MONGODB_DB_NAME: required("MONGODB_DB_NAME"),
  GEMINI_API_KEY: required("GEMINI_API_KEY"),
}
