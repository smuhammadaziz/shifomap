import { MongoClient, Db } from "mongodb"
import { env } from "../env.js"

let client: MongoClient | null = null
let db: Db | null = null

export const TELEGRAM_USERS_COLLECTION = "telegram_users"

export async function connectMongo(): Promise<Db> {
  if (db) return db
  client = new MongoClient(env.MONGODB_URI)
  await client.connect()
  db = client.db(env.MONGODB_DB_NAME)
  return db
}

export function getDb(): Db {
  if (!db) throw new Error("MongoDB not connected")
  return db
}
