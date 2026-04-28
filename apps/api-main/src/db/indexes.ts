import {
  getDb,
  PLATFORM_ADMIN_COLLECTION,
  CLINICS_COLLECTION,
  PATIENTS_COLLECTION,
  BOOKINGS_COLLECTION,
  REVIEWS_COLLECTION,
  FILES_COLLECTION,
  MEDICAL_HISTORY_COLLECTION,
  ASSESSMENTS_COLLECTION,
  CHAT_CONVERSATIONS_COLLECTION,
  CHAT_MESSAGES_COLLECTION,
  POSTS_COLLECTION,
  POST_LIKES_COLLECTION,
  POST_COMMENTS_COLLECTION,
  AI_CHAT_CONVERSATIONS_COLLECTION,
  AI_CHAT_MESSAGES_COLLECTION,
  TELEGRAM_USERS_COLLECTION,
} from "./mongo"

async function safeIndex(fn: () => Promise<unknown>) {
  try {
    await fn()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (!msg.includes("already exists") && !msg.includes("duplicate")) {
      throw e
    }
  }
}

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

  // Reviews indexes
  const reviewsColl = database.collection(REVIEWS_COLLECTION)
  try {
    await reviewsColl.createIndex({ clinicId: 1, serviceId: 1, doctorId: 1, createdAt: -1 })
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

  // Files
  const filesColl = database.collection(FILES_COLLECTION)
  await safeIndex(() => filesColl.createIndex({ ownerId: 1, createdAt: -1 }))
  await safeIndex(() => filesColl.createIndex({ deletedAt: 1 }))

  // Medical history
  const historyColl = database.collection(MEDICAL_HISTORY_COLLECTION)
  await safeIndex(() => historyColl.createIndex({ patientId: 1, createdAt: -1 }))
  await safeIndex(() => historyColl.createIndex({ deletedAt: 1 }))

  // Assessments
  const assessmentsColl = database.collection(ASSESSMENTS_COLLECTION)
  await safeIndex(() => assessmentsColl.createIndex({ patientId: 1, createdAt: -1 }))

  // Chat
  const convColl = database.collection(CHAT_CONVERSATIONS_COLLECTION)
  await safeIndex(() => convColl.createIndex({ patientId: 1, lastMessageAt: -1 }))
  await safeIndex(() => convColl.createIndex({ doctorId: 1, lastMessageAt: -1 }))
  await safeIndex(() => convColl.createIndex({ patientId: 1, doctorId: 1, clinicId: 1 }, { unique: true }))
  const msgColl = database.collection(CHAT_MESSAGES_COLLECTION)
  await safeIndex(() => msgColl.createIndex({ conversationId: 1, createdAt: 1 }))

  // Posts
  const postsColl = database.collection(POSTS_COLLECTION)
  await safeIndex(() => postsColl.createIndex({ createdAt: -1 }))
  await safeIndex(() => postsColl.createIndex({ deletedAt: 1 }))
  const likesColl = database.collection(POST_LIKES_COLLECTION)
  await safeIndex(() => likesColl.createIndex({ postId: 1, patientId: 1 }, { unique: true }))
  const commentsColl = database.collection(POST_COMMENTS_COLLECTION)
  await safeIndex(() => commentsColl.createIndex({ postId: 1, createdAt: -1 }))

  // AI chat
  const aiConvColl = database.collection(AI_CHAT_CONVERSATIONS_COLLECTION)
  await safeIndex(() => aiConvColl.createIndex({ patientId: 1, updatedAt: -1 }))
  await safeIndex(() => aiConvColl.createIndex({ feedbackStatus: 1, feedbackAt: -1 }))
  await safeIndex(() => aiConvColl.createIndex({ createdAt: -1 }))
  const aiMsgColl = database.collection(AI_CHAT_MESSAGES_COLLECTION)
  await safeIndex(() => aiMsgColl.createIndex({ conversationId: 1, createdAt: 1 }))

  // Telegram bot users
  const tgUsersColl = database.collection(TELEGRAM_USERS_COLLECTION)
  // Keep tgChatId unique (one Telegram user per chat id) and match existing production index shape.
  await safeIndex(() => tgUsersColl.createIndex({ tgChatId: 1 }, { unique: true }))
  await safeIndex(() => tgUsersColl.createIndex({ phoneNumber: 1 }))
  await safeIndex(() => tgUsersColl.createIndex({ updatedAt: -1 }))
}
