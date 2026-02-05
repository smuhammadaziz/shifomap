import { MongoClient, Db } from "mongodb"
import { env } from "@/env"

let client: MongoClient | null = null
let db: Db | null = null

/**
 * Connect to MongoDB
 * Database name comes from env.MONGODB_DB_NAME (e.g. "projects")
 * Collections: platform_admin, etc.
 */
export async function connectMongo(): Promise<Db> {
  if (db) return db

  client = new MongoClient(env.MONGODB_URI)
  await client.connect()
  db = client.db(env.MONGODB_DB_NAME)
  return db
}

/**
 * Get MongoDB database instance
 * Throws if not connected
 */
export function getDb(): Db {
  if (!db) {
    throw new Error("MongoDB not connected. Call connectMongo() first.")
  }
  return db
}

/**
 * Close MongoDB connection
 */
export async function closeMongo(): Promise<void> {
  if (client) {
    await client.close()
    client = null
    db = null
  }
}

// Collection names
export const PLATFORM_ADMIN_COLLECTION = "platform_admin"
export const CLINICS_COLLECTION = "clinics"
export const PATIENTS_COLLECTION = "patients"
export const BOOKINGS_COLLECTION = "bookings"
