import { ObjectId } from "mongodb"
import { getDb, PLATFORM_ADMIN_COLLECTION } from "@/db/mongo"
import type { PlatformAdminDoc } from "./auth.model"
import { ADMIN_ROLE, PERMISSION_ALL } from "@/shared/constants"

export interface InsertAdminInput {
  username: string
  displayName: string
  passwordHash: string
}

/**
 * Insert a new admin into the platform_admin collection
 */
export async function insertAdmin(input: InsertAdminInput): Promise<PlatformAdminDoc> {
  const db = getDb()
  const now = new Date()

  const doc: Omit<PlatformAdminDoc, "_id"> = {
    username: input.username,
    displayName: input.displayName,
    status: "active",
    role: ADMIN_ROLE,
    access: { permissions: [PERMISSION_ALL] },
    security: {
      passwordHash: input.passwordHash,
      passwordUpdatedAt: now,
      lastLoginAt: null,
      lastLoginIP: null,
    },
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }

  const result = await db
    .collection<PlatformAdminDoc>(PLATFORM_ADMIN_COLLECTION)
    .insertOne(doc as PlatformAdminDoc)

  const inserted = await db
    .collection<PlatformAdminDoc>(PLATFORM_ADMIN_COLLECTION)
    .findOne({ _id: result.insertedId })

  if (!inserted) throw new Error("Insert failed")
  return inserted
}

/**
 * Find admin by username (case-insensitive, non-deleted only)
 */
export async function findAdminByUsername(username: string): Promise<PlatformAdminDoc | null> {
  const db = getDb()
  return db
    .collection<PlatformAdminDoc>(PLATFORM_ADMIN_COLLECTION)
    .findOne({ username: username.toLowerCase(), deletedAt: null })
}

/**
 * Update last login timestamp and IP address
 */
export async function updateLastLogin(adminId: ObjectId, ip: string | null): Promise<void> {
  const db = getDb()
  const now = new Date()
  await db.collection<PlatformAdminDoc>(PLATFORM_ADMIN_COLLECTION).updateOne(
    { _id: adminId },
    {
      $set: {
        "security.lastLoginAt": now,
        "security.lastLoginIP": ip ?? null,
        updatedAt: now,
      },
    }
  )
}

/**
 * Find admin by ID
 */
export async function findAdminById(adminId: ObjectId): Promise<PlatformAdminDoc | null> {
  const db = getDb()
  return db
    .collection<PlatformAdminDoc>(PLATFORM_ADMIN_COLLECTION)
    .findOne({ _id: adminId, deletedAt: null })
}

/**
 * Update admin password
 */
export async function updateAdminPassword(adminId: ObjectId, newPasswordHash: string): Promise<void> {
  const db = getDb()
  const now = new Date()
  await db.collection<PlatformAdminDoc>(PLATFORM_ADMIN_COLLECTION).updateOne(
    { _id: adminId },
    {
      $set: {
        "security.passwordHash": newPasswordHash,
        "security.passwordUpdatedAt": now,
        updatedAt: now,
      },
    }
  )
}

/**
 * Update admin profile (display name and/or username)
 */
export async function updateAdminProfile(
  adminId: ObjectId,
  updates: { displayName?: string; username?: string }
): Promise<PlatformAdminDoc | null> {
  const db = getDb()
  const now = new Date()
  const setFields: Record<string, unknown> = { updatedAt: now }

  if (updates.displayName) setFields.displayName = updates.displayName
  if (updates.username) setFields.username = updates.username.toLowerCase()

  await db.collection<PlatformAdminDoc>(PLATFORM_ADMIN_COLLECTION).updateOne(
    { _id: adminId },
    { $set: setFields }
  )

  return db.collection<PlatformAdminDoc>(PLATFORM_ADMIN_COLLECTION).findOne({ _id: adminId })
}
