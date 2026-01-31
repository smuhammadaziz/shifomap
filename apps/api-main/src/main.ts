import { app } from "./app"
import { env } from "./env"
import { connectMongo } from "./db/mongo"
import { createIndexes } from "./db/indexes"
import { logger } from "./common/logger"

async function bootstrap() {
  // Connect to MongoDB
  await connectMongo()
  logger.info("MongoDB connected")

  // Create indexes for platform_admin collection
  await createIndexes()
  logger.info("Indexes created")

  // Start server
  app.listen(env.PORT)
  logger.info(`api-main running at http://localhost:${app.server?.port ?? env.PORT}`)
}

bootstrap().catch((err) => {
  logger.error("Bootstrap failed", { err: String(err) })
  process.exit(1)
})
