import { Elysia } from "elysia"
import { ObjectId } from "mongodb"
import { z } from "zod"
import { requireAuth, requirePatientAuth } from "@/common/middleware/auth"
import {
  getDb,
  AI_CHAT_CONVERSATIONS_COLLECTION,
  AI_CHAT_MESSAGES_COLLECTION,
  PATIENTS_COLLECTION,
} from "@/db/mongo"
import { badRequest, notFound, unauthorized } from "@/common/errors"

type FeedbackStatus = "none" | "rated" | "dismissed"
type MessageRole = "user" | "assistant"

interface AiChatConversationDoc {
  _id: ObjectId
  patientId: ObjectId
  patientName: string | null
  patientPhone: string | null
  title: string
  createdAt: Date
  updatedAt: Date
  feedbackStatus: FeedbackStatus
  feedbackRating: number | null
  feedbackText: string | null
  feedbackAt: Date | null
}

interface AiChatMessageDoc {
  _id: ObjectId
  conversationId: ObjectId
  role: MessageRole
  text: string
  createdAt: Date
}

type PatientNamePhoneSource = {
  fullName?: string | null
  profile?: { fullName?: string | null }
  contacts?: { phone?: string | null }
}

const createConversationSchema = z.object({
  title: z.string().trim().min(1).max(160),
})

const addMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().trim().min(1).max(8000),
})

const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  feedbackText: z.string().trim().max(1200).optional(),
  dismissed: z.boolean().optional(),
})

function isAdmin(role?: string) {
  return role === "SUPER_ADMIN_SHIFO" || role === "admin"
}

function mapConversation(doc: AiChatConversationDoc) {
  return {
    _id: doc._id.toHexString(),
    patientId: doc.patientId.toHexString(),
    patientName: doc.patientName,
    patientPhone: doc.patientPhone,
    title: doc.title,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    feedbackStatus: doc.feedbackStatus,
    feedbackRating: doc.feedbackRating,
    feedbackText: doc.feedbackText,
    feedbackAt: doc.feedbackAt ? doc.feedbackAt.toISOString() : null,
  }
}

function mapMessage(doc: AiChatMessageDoc) {
  return {
    _id: doc._id.toHexString(),
    conversationId: doc.conversationId.toHexString(),
    role: doc.role,
    text: doc.text,
    createdAt: doc.createdAt.toISOString(),
  }
}

function pickPatientName(patient: PatientNamePhoneSource | null): string | null {
  const fromRoot = (patient?.fullName ?? "").trim()
  if (fromRoot) return fromRoot
  const fromProfile = (patient?.profile?.fullName ?? "").trim()
  if (fromProfile) return fromProfile
  return null
}

function pickPatientPhone(patient: PatientNamePhoneSource | null): string | null {
  const phone = (patient?.contacts?.phone ?? "").trim()
  return phone || null
}

export const aiChatPatientRoutes = new Elysia({ prefix: "/ai-chat" })
  .use(requirePatientAuth)
  .post("/conversations", async ({ auth, body, set }) => {
    const parsed = createConversationSchema.safeParse(body ?? {})
    if (!parsed.success) {
      set.status = 400
      return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors }
    }
    const db = getDb()
    const patient = (await db.collection(PATIENTS_COLLECTION).findOne({ _id: new ObjectId(auth.sub) })) as PatientNamePhoneSource | null
    const now = new Date()
    const doc: AiChatConversationDoc = {
      _id: new ObjectId(),
      patientId: new ObjectId(auth.sub),
      patientName: pickPatientName(patient),
      patientPhone: pickPatientPhone(patient),
      title: parsed.data.title,
      createdAt: now,
      updatedAt: now,
      feedbackStatus: "none",
      feedbackRating: null,
      feedbackText: null,
      feedbackAt: null,
    }
    await db.collection<AiChatConversationDoc>(AI_CHAT_CONVERSATIONS_COLLECTION).insertOne(doc)
    set.status = 201
    return { success: true, data: mapConversation(doc) }
  })
  .post("/conversations/:id/messages", async ({ auth, params, body, set }) => {
    if (!ObjectId.isValid(params.id)) throw badRequest("Invalid conversation id")
    const parsed = addMessageSchema.safeParse(body ?? {})
    if (!parsed.success) {
      set.status = 400
      return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors }
    }
    const db = getDb()
    const conversationId = new ObjectId(params.id)
    const conv = await db
      .collection<AiChatConversationDoc>(AI_CHAT_CONVERSATIONS_COLLECTION)
      .findOne({ _id: conversationId, patientId: new ObjectId(auth.sub) })
    if (!conv) throw notFound("Conversation not found")
    const msg: AiChatMessageDoc = {
      _id: new ObjectId(),
      conversationId,
      role: parsed.data.role,
      text: parsed.data.text,
      createdAt: new Date(),
    }
    await db.collection<AiChatMessageDoc>(AI_CHAT_MESSAGES_COLLECTION).insertOne(msg)
    await db
      .collection<AiChatConversationDoc>(AI_CHAT_CONVERSATIONS_COLLECTION)
      .updateOne({ _id: conversationId }, { $set: { updatedAt: new Date() } })
    set.status = 201
    return { success: true, data: mapMessage(msg) }
  })
  .post("/conversations/:id/feedback", async ({ auth, params, body, set }) => {
    if (!ObjectId.isValid(params.id)) throw badRequest("Invalid conversation id")
    const parsed = feedbackSchema.safeParse(body ?? {})
    if (!parsed.success) {
      set.status = 400
      return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors }
    }
    const db = getDb()
    const conversationId = new ObjectId(params.id)
    const conv = await db
      .collection<AiChatConversationDoc>(AI_CHAT_CONVERSATIONS_COLLECTION)
      .findOne({ _id: conversationId, patientId: new ObjectId(auth.sub) })
    if (!conv) throw notFound("Conversation not found")
    const dismissed = parsed.data.dismissed === true
    const rating = dismissed ? null : parsed.data.rating ?? null
    const feedbackText = dismissed ? null : parsed.data.feedbackText ?? null
    const feedbackStatus: FeedbackStatus = dismissed ? "dismissed" : rating ? "rated" : "dismissed"
    await db.collection<AiChatConversationDoc>(AI_CHAT_CONVERSATIONS_COLLECTION).updateOne(
      { _id: conversationId },
      {
        $set: {
          feedbackStatus,
          feedbackRating: rating,
          feedbackText,
          feedbackAt: new Date(),
          updatedAt: new Date(),
        },
      }
    )
    set.status = 200
    return { success: true, data: { feedbackStatus } }
  })

export const aiChatAdminRoutes = new Elysia({ prefix: "/ai-chat/admin" })
  .use(requireAuth)
  .get("/conversations", async ({ auth, query, set }) => {
    if (!isAdmin(auth.role)) throw unauthorized("Admin only")
    const db = getDb()
    const page = Math.max(1, parseInt((query.page as string) || "1", 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt((query.limit as string) || "20", 10) || 20))
    const feedback = (query.feedback as string) || "all"
    const skip = (page - 1) * limit
    const filter: Record<string, unknown> = {}
    if (feedback === "rated") filter.feedbackStatus = "rated"
    if (feedback === "dismissed") filter.feedbackStatus = "dismissed"
    if (feedback === "none") filter.feedbackStatus = "none"
    const [rows, total] = await Promise.all([
      db
        .collection<AiChatConversationDoc>(AI_CHAT_CONVERSATIONS_COLLECTION)
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection<AiChatConversationDoc>(AI_CHAT_CONVERSATIONS_COLLECTION).countDocuments(filter),
    ])
    const items = await Promise.all(
      rows.map(async (row) => {
        let patientName = row.patientName
        let patientPhone = row.patientPhone
        if (!patientName || !patientPhone) {
          const patient = (await db
            .collection(PATIENTS_COLLECTION)
            .findOne({ _id: row.patientId })) as PatientNamePhoneSource | null
          const nextName = patientName || pickPatientName(patient)
          const nextPhone = patientPhone || pickPatientPhone(patient)
          patientName = nextName
          patientPhone = nextPhone
          if ((nextName && nextName !== row.patientName) || (nextPhone && nextPhone !== row.patientPhone)) {
            await db.collection<AiChatConversationDoc>(AI_CHAT_CONVERSATIONS_COLLECTION).updateOne(
              { _id: row._id },
              { $set: { patientName: nextName ?? row.patientName, patientPhone: nextPhone ?? row.patientPhone } }
            )
          }
        }
        const [messagesCount, lastMsg] = await Promise.all([
          db.collection<AiChatMessageDoc>(AI_CHAT_MESSAGES_COLLECTION).countDocuments({ conversationId: row._id }),
          db
            .collection<AiChatMessageDoc>(AI_CHAT_MESSAGES_COLLECTION)
            .find({ conversationId: row._id })
            .sort({ createdAt: -1 })
            .limit(1)
            .toArray(),
        ])
        return {
          ...mapConversation({ ...row, patientName, patientPhone }),
          messagesCount,
          lastMessage: lastMsg[0]?.text ?? null,
          lastMessageRole: lastMsg[0]?.role ?? null,
        }
      })
    )
    set.status = 200
    return {
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  })
  .get("/conversations/:id", async ({ auth, params, set }) => {
    if (!isAdmin(auth.role)) throw unauthorized("Admin only")
    if (!ObjectId.isValid(params.id)) throw badRequest("Invalid conversation id")
    const db = getDb()
    const conversationId = new ObjectId(params.id)
    const conversation = await db
      .collection<AiChatConversationDoc>(AI_CHAT_CONVERSATIONS_COLLECTION)
      .findOne({ _id: conversationId })
    if (!conversation) throw notFound("Conversation not found")
    let hydratedConversation = conversation
    if (!conversation.patientName || !conversation.patientPhone) {
      const patient = (await db
        .collection(PATIENTS_COLLECTION)
        .findOne({ _id: conversation.patientId })) as PatientNamePhoneSource | null
      const nextName = conversation.patientName || pickPatientName(patient)
      const nextPhone = conversation.patientPhone || pickPatientPhone(patient)
      if (nextName || nextPhone) {
        await db.collection<AiChatConversationDoc>(AI_CHAT_CONVERSATIONS_COLLECTION).updateOne(
          { _id: conversation._id },
          { $set: { patientName: nextName ?? conversation.patientName, patientPhone: nextPhone ?? conversation.patientPhone } }
        )
      }
      hydratedConversation = { ...conversation, patientName: nextName, patientPhone: nextPhone }
    }
    const messages = await db
      .collection<AiChatMessageDoc>(AI_CHAT_MESSAGES_COLLECTION)
      .find({ conversationId })
      .sort({ createdAt: 1 })
      .toArray()
    set.status = 200
    return {
      success: true,
      data: {
        conversation: mapConversation(hydratedConversation),
        messages: messages.map(mapMessage),
      },
    }
  })
