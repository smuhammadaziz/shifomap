import { Elysia } from "elysia"
import { ObjectId } from "mongodb"
import {
  openConversationBodySchema,
  sendMessageBodySchema,
  mapConversationToPublic,
  mapMessageToPublic,
  type ChatConversationDoc,
  type ChatMessageDoc,
} from "./chat.model"
import {
  getDb,
  CHAT_CONVERSATIONS_COLLECTION,
  CHAT_MESSAGES_COLLECTION,
  CLINICS_COLLECTION,
  PATIENTS_COLLECTION,
} from "@/db/mongo"
import { requirePatientAuth, requireAuth } from "@/common/middleware/auth"
import { toObjectId } from "@/common/utils/id"
import { badRequest, notFound, unauthorized } from "@/common/errors"
import type { ClinicDoc } from "@/modules/clinics/clinics.model"

async function findOrCreateConversation(
  patientId: ObjectId,
  doctorId: ObjectId,
  clinicId: ObjectId
): Promise<ChatConversationDoc> {
  const db = getDb()
  const existing = await db
    .collection<ChatConversationDoc>(CHAT_CONVERSATIONS_COLLECTION)
    .findOne({ patientId, doctorId, clinicId, deletedAt: null })
  if (existing) return existing
  const now = new Date()
  const doc: ChatConversationDoc = {
    _id: new ObjectId(),
    patientId,
    doctorId,
    clinicId,
    lastMessage: null,
    lastMessageAt: null,
    patientUnread: 0,
    doctorUnread: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
  await db.collection<ChatConversationDoc>(CHAT_CONVERSATIONS_COLLECTION).insertOne(doc)
  return doc
}

async function buildConvExtras(conv: ChatConversationDoc) {
  const db = getDb()
  const [clinic, patient] = await Promise.all([
    db.collection<ClinicDoc>(CLINICS_COLLECTION).findOne({ _id: conv.clinicId }),
    db.collection(PATIENTS_COLLECTION).findOne({ _id: conv.patientId }) as Promise<
      { profile?: { fullName?: string | null; avatarUrl?: string | null } } | null
    >,
  ])
  const convDoctorId = conv.doctorId.toHexString()
  const doctor =
    clinic?.doctors?.find((d: { _id: ObjectId | string }) => {
      const did = typeof d._id === "string" ? d._id : d._id.toHexString()
      return did === convDoctorId
    }) ?? null
  return {
    patientName: patient?.profile?.fullName ?? null,
    patientAvatar: patient?.profile?.avatarUrl ?? null,
    doctorName: doctor?.fullName ?? null,
    doctorAvatar: doctor?.avatarUrl ?? null,
  }
}

async function resolveDoctorObjectIds(auth: { sub: string; clinicId?: string; username?: string }) {
  const ids: ObjectId[] = []
  if (ObjectId.isValid(auth.sub)) {
    ids.push(toObjectId(auth.sub))
  }
  if (!auth.clinicId || !ObjectId.isValid(auth.clinicId)) return ids

  const db = getDb()
  const clinic = await db
    .collection<ClinicDoc>(CLINICS_COLLECTION)
    .findOne({ _id: toObjectId(auth.clinicId) })
  if (!clinic) return ids

  if (auth.username) {
    const byUsername = clinic.doctors?.find((d) => d.username === auth.username)
    if (byUsername) {
      const byUsernameId =
        typeof byUsername._id === "string" ? byUsername._id : byUsername._id.toHexString()
      if (ObjectId.isValid(byUsernameId)) {
        const oid = toObjectId(byUsernameId)
        if (!ids.some((x) => x.equals(oid))) {
          ids.push(oid)
        }
      }
    }
  }
  return ids
}

export const chatPatientRoutes = new Elysia({ prefix: "/chat/patient" })
  .use(requirePatientAuth)
  .post("/open", async ({ auth, body, set }) => {
    const parsed = openConversationBodySchema.safeParse(body ?? {})
    if (!parsed.success) {
      set.status = 400
      return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors }
    }
    const db = getDb()
    const clinic = await db
      .collection<ClinicDoc>(CLINICS_COLLECTION)
      .findOne({ _id: toObjectId(parsed.data.clinicId) })
    if (!clinic) throw notFound("Clinic not found")
    const doctor = clinic.doctors?.find((d) => d._id.toHexString() === parsed.data.doctorId)
    if (!doctor) throw notFound("Doctor not found")

    const conv = await findOrCreateConversation(
      toObjectId(auth.sub),
      toObjectId(parsed.data.doctorId),
      toObjectId(parsed.data.clinicId)
    )
    const extras = await buildConvExtras(conv)
    set.status = 200
    return { success: true, data: mapConversationToPublic(conv, "patient", extras) }
  })
  .get("/conversations", async ({ auth, set }) => {
    const db = getDb()
    const docs = await db
      .collection<ChatConversationDoc>(CHAT_CONVERSATIONS_COLLECTION)
      .find({ patientId: toObjectId(auth.sub), deletedAt: null })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .toArray()
    const mapped = await Promise.all(
      docs.map(async (c) => mapConversationToPublic(c, "patient", await buildConvExtras(c)))
    )
    set.status = 200
    return { success: true, data: mapped }
  })
  .get("/conversations/:id/messages", async ({ auth, params, set }) => {
    if (!ObjectId.isValid(params.id)) throw badRequest("Invalid id")
    const db = getDb()
    const conv = await db
      .collection<ChatConversationDoc>(CHAT_CONVERSATIONS_COLLECTION)
      .findOne({ _id: toObjectId(params.id), deletedAt: null })
    if (!conv) throw notFound("Conversation not found")
    if (!conv.patientId.equals(toObjectId(auth.sub))) throw unauthorized("Not your conversation")
    const messages = await db
      .collection<ChatMessageDoc>(CHAT_MESSAGES_COLLECTION)
      .find({ conversationId: conv._id })
      .sort({ createdAt: 1 })
      .limit(500)
      .toArray()
    // mark as read for patient
    if (conv.patientUnread > 0) {
      await db
        .collection<ChatConversationDoc>(CHAT_CONVERSATIONS_COLLECTION)
        .updateOne({ _id: conv._id }, { $set: { patientUnread: 0 } })
    }
    const extras = await buildConvExtras(conv)
    set.status = 200
    return {
      success: true,
      data: {
        conversation: mapConversationToPublic(conv, "patient", extras),
        messages: messages.map(mapMessageToPublic),
      },
    }
  })
  .post("/conversations/:id/messages", async ({ auth, params, body, set }) => {
    const parsed = sendMessageBodySchema.safeParse(body ?? {})
    if (!parsed.success) {
      set.status = 400
      return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors }
    }
    if (!ObjectId.isValid(params.id)) throw badRequest("Invalid id")
    const db = getDb()
    const conv = await db
      .collection<ChatConversationDoc>(CHAT_CONVERSATIONS_COLLECTION)
      .findOne({ _id: toObjectId(params.id), deletedAt: null })
    if (!conv) throw notFound("Conversation not found")
    if (!conv.patientId.equals(toObjectId(auth.sub))) throw unauthorized("Not your conversation")

    const now = new Date()
    const msg: ChatMessageDoc = {
      _id: new ObjectId(),
      conversationId: conv._id,
      senderRole: "patient",
      senderId: toObjectId(auth.sub),
      text: parsed.data.text,
      attachments: parsed.data.attachments ?? [],
      readAt: null,
      createdAt: now,
    }
    await db.collection<ChatMessageDoc>(CHAT_MESSAGES_COLLECTION).insertOne(msg)
    await db.collection<ChatConversationDoc>(CHAT_CONVERSATIONS_COLLECTION).updateOne(
      { _id: conv._id },
      {
        $set: { lastMessage: msg.text, lastMessageAt: now, updatedAt: now },
        $inc: { doctorUnread: 1 },
      }
    )
    set.status = 201
    return { success: true, data: mapMessageToPublic(msg) }
  })

export const chatDoctorRoutes = new Elysia({ prefix: "/chat/doctor" })
  .use(requireAuth)
  .get("/conversations", async ({ auth, set }) => {
    if (auth.role !== "doctor") throw unauthorized("Doctor access only")
    const doctorIds = await resolveDoctorObjectIds({
      sub: auth.sub,
      clinicId: auth.clinicId,
      username: auth.username,
    })
    if (doctorIds.length === 0) {
      set.status = 200
      return { success: true, data: [] }
    }
    const db = getDb()
    const docs = await db
      .collection<ChatConversationDoc>(CHAT_CONVERSATIONS_COLLECTION)
      .find({ doctorId: { $in: doctorIds }, deletedAt: null })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .toArray()
    const mapped = await Promise.all(
      docs.map(async (c) => mapConversationToPublic(c, "doctor", await buildConvExtras(c)))
    )
    set.status = 200
    return { success: true, data: mapped }
  })
  .get("/conversations/:id/messages", async ({ auth, params, set }) => {
    if (auth.role !== "doctor") throw unauthorized("Doctor access only")
    if (!ObjectId.isValid(params.id)) throw badRequest("Invalid id")
    const doctorIds = await resolveDoctorObjectIds({
      sub: auth.sub,
      clinicId: auth.clinicId,
      username: auth.username,
    })
    const db = getDb()
    const conv = await db
      .collection<ChatConversationDoc>(CHAT_CONVERSATIONS_COLLECTION)
      .findOne({ _id: toObjectId(params.id), deletedAt: null })
    if (!conv) throw notFound("Conversation not found")
    if (!doctorIds.some((x) => conv.doctorId.equals(x))) throw unauthorized("Not your conversation")
    const messages = await db
      .collection<ChatMessageDoc>(CHAT_MESSAGES_COLLECTION)
      .find({ conversationId: conv._id })
      .sort({ createdAt: 1 })
      .limit(500)
      .toArray()
    if (conv.doctorUnread > 0) {
      await db
        .collection<ChatConversationDoc>(CHAT_CONVERSATIONS_COLLECTION)
        .updateOne({ _id: conv._id }, { $set: { doctorUnread: 0 } })
    }
    const extras = await buildConvExtras(conv)
    set.status = 200
    return {
      success: true,
      data: {
        conversation: mapConversationToPublic(conv, "doctor", extras),
        messages: messages.map(mapMessageToPublic),
      },
    }
  })
  .post("/conversations/:id/messages", async ({ auth, params, body, set }) => {
    if (auth.role !== "doctor") throw unauthorized("Doctor access only")
    const parsed = sendMessageBodySchema.safeParse(body ?? {})
    if (!parsed.success) {
      set.status = 400
      return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors }
    }
    if (!ObjectId.isValid(params.id)) throw badRequest("Invalid id")
    const doctorIds = await resolveDoctorObjectIds({
      sub: auth.sub,
      clinicId: auth.clinicId,
      username: auth.username,
    })
    const db = getDb()
    const conv = await db
      .collection<ChatConversationDoc>(CHAT_CONVERSATIONS_COLLECTION)
      .findOne({ _id: toObjectId(params.id), deletedAt: null })
    if (!conv) throw notFound("Conversation not found")
    if (!doctorIds.some((x) => conv.doctorId.equals(x))) throw unauthorized("Not your conversation")

    const now = new Date()
    const msg: ChatMessageDoc = {
      _id: new ObjectId(),
      conversationId: conv._id,
      senderRole: "doctor",
      senderId: conv.doctorId,
      text: parsed.data.text,
      attachments: parsed.data.attachments ?? [],
      readAt: null,
      createdAt: now,
    }
    await db.collection<ChatMessageDoc>(CHAT_MESSAGES_COLLECTION).insertOne(msg)
    await db.collection<ChatConversationDoc>(CHAT_CONVERSATIONS_COLLECTION).updateOne(
      { _id: conv._id },
      {
        $set: { lastMessage: msg.text, lastMessageAt: now, updatedAt: now },
        $inc: { patientUnread: 1 },
      }
    )
    set.status = 201
    return { success: true, data: mapMessageToPublic(msg) }
  })
