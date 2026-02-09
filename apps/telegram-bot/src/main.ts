import "dotenv/config"
import { runBot } from "./bot.js"

runBot().catch((err) => {
  console.error("Bot failed:", err)
  process.exit(1)
})
