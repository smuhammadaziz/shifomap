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
export const REVIEWS_COLLECTION = "reviews"
export const PRESCRIPTIONS_COLLECTION = "prescriptions"
export const PRESCRIPTION_EVENTS_COLLECTION = "prescription_events"
export const CUSTOM_REMINDERS_COLLECTION = "custom_reminders"
export const FILES_COLLECTION = "files"
export const MEDICAL_HISTORY_COLLECTION = "medical_history"
export const ASSESSMENTS_COLLECTION = "patient_assessments"
export const CHAT_CONVERSATIONS_COLLECTION = "chat_conversations"
export const CHAT_MESSAGES_COLLECTION = "chat_messages"
export const POSTS_COLLECTION = "posts"
export const POST_LIKES_COLLECTION = "post_likes"
export const POST_COMMENTS_COLLECTION = "post_comments"
