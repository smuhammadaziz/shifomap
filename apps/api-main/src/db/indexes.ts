import { getDb, PLATFORM_ADMIN_COLLECTION, CLINICS_COLLECTION, PATIENTS_COLLECTION, BOOKINGS_COLLECTION } from "./mongo"

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

  // Patients indexes
  const patientsColl = database.collection(PATIENTS_COLLECTION)
  try {
    await patientsColl.createIndex({ "contacts.email": 1 }, { sparse: true })
    await patientsColl.createIndex({ "contacts.phone": 1 }, { unique: true })
    await patientsColl.createIndex({ "auth.googleId": 1 }, { sparse: true })
    await patientsColl.createIndex({ status: 1 })
    await patientsColl.createIndex({ "auth.lastLoginAt": -1 })
    await patientsColl.createIndex({ deletedAt: 1 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (!msg.includes("already exists") && !msg.includes("duplicate")) {
      throw e
    }
  }

  // Bookings indexes
  const bookingsColl = database.collection(BOOKINGS_COLLECTION)
  try {
    await bookingsColl.createIndex({ clinicId: 1, scheduledAt: -1 })
    await bookingsColl.createIndex({ userId: 1, scheduledAt: -1 })
    await bookingsColl.createIndex({ status: 1, scheduledAt: -1 })
    await bookingsColl.createIndex({ deletedAt: 1 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (!msg.includes("already exists") && !msg.includes("duplicate")) {
      throw e
    }
  }
}
