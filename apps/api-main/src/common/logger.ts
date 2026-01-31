const isDev = process.env.NODE_ENV !== "production"

/**
 * Simple logger for development and production
 * In dev: pretty console logs
 * In prod: JSON logs for parsing
 */
export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    if (isDev) {
      console.log(`[INFO] ${message}`, meta ?? "")
    } else {
      console.log(JSON.stringify({ level: "info", message, ...meta }))
    }
  },
  warn(message: string, meta?: Record<string, unknown>) {
    if (isDev) {
      console.warn(`[WARN] ${message}`, meta ?? "")
    } else {
      console.warn(JSON.stringify({ level: "warn", message, ...meta }))
    }
  },
  error(message: string, meta?: Record<string, unknown>) {
    if (isDev) {
      console.error(`[ERROR] ${message}`, meta ?? "")
    } else {
      console.error(JSON.stringify({ level: "error", message, ...meta }))
    }
  },
  debug(message: string, meta?: Record<string, unknown>) {
    if (isDev) {
      console.debug(`[DEBUG] ${message}`, meta ?? "")
    }
  },
}
