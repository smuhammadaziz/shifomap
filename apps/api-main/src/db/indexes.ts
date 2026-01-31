import { getDb, PLATFORM_ADMIN_COLLECTION, CLINICS_COLLECTION } from "./mongo"

/**
 * Create indexes for platform_admin collection
 * - username: unique index for fast lookups and uniqueness constraint
 * - status: index for filtering active/inactive admins
 * - security.lastLoginAt: index for sorting by last login
 * - deletedAt: index for soft-delete queries
 */
export async function createIndexes(): Promise<void> {
  const database = getDb()

  // Platform admin indexes
  const adminColl = database.collection(PLATFORM_ADMIN_COLLECTION)
  try {
    await adminColl.createIndex({ username: 1 }, { unique: true })
    await adminColl.createIndex({ status: 1 })
    await adminColl.createIndex({ "security.lastLoginAt": -1 })
    await adminColl.createIndex({ deletedAt: 1 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (!msg.includes("already exists") && !msg.includes("duplicate")) {
      throw e
    }
  }

  // Clinics indexes
  const clinicsColl = database.collection(CLINICS_COLLECTION)
  try {
    await clinicsColl.createIndex({ clinicUniqueName: 1 }, { unique: true })
    await clinicsColl.createIndex({ "owners.userName": 1 })
    await clinicsColl.createIndex({ status: 1 })
    await clinicsColl.createIndex({ createdAt: -1 })
    await clinicsColl.createIndex({ deletedAt: 1 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (!msg.includes("already exists") && !msg.includes("duplicate")) {
      throw e
    }
  }
}
