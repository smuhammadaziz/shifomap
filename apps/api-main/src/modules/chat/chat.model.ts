import { z } from "zod"
import type { ObjectId } from "mongodb"

export interface ChatConversationDoc {
  _id: ObjectId
  patientId: ObjectId
  doctorId: ObjectId
  clinicId: ObjectId
  lastMessage: string | null
  lastMessageAt: Date | null
  patientUnread: number
  doctorUnread: number
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export interface ChatMessageDoc {
  _id: ObjectId
  conversationId: ObjectId
  senderRole: "patient" | "doctor"
  senderId: ObjectId
  text: string
  attachments: string[]
  readAt: Date | null
  createdAt: Date
}

export const openConversationBodySchema = z.object({
  clinicId: z.string().min(1),
  doctorId: z.string().min(1),
})

export const sendMessageBodySchema = z.object({
  text: z.string().min(1).max(4000),
  attachments: z.array(z.string()).max(5).optional(),
})

export function mapConversationToPublic(
  doc: ChatConversationDoc,
  viewerRole: "patient" | "doctor",
  extras: {
    patientName?: string | null
    patientAvatar?: string | null
    doctorName?: string | null
    doctorAvatar?: string | null
  } = {}
) {
  return {
    _id: doc._id.toHexString(),
    patientId: doc.patientId.toHexString(),
    doctorId: doc.doctorId.toHexString(),
    clinicId: doc.clinicId.toHexString(),
    lastMessage: doc.lastMessage,
    lastMessageAt: doc.lastMessageAt?.toISOString() ?? null,
    unread: viewerRole === "patient" ? doc.patientUnread : doc.doctorUnread,
    patientName: extras.patientName ?? null,
    patientAvatar: extras.patientAvatar ?? null,
    doctorName: extras.doctorName ?? null,
    doctorAvatar: extras.doctorAvatar ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

export function mapMessageToPublic(doc: ChatMessageDoc) {
  return {
    _id: doc._id.toHexString(),
    conversationId: doc.conversationId.toHexString(),
    senderRole: doc.senderRole,
    senderId: doc.senderId.toHexString(),
    text: doc.text,
    attachments: doc.attachments,
    readAt: doc.readAt?.toISOString() ?? null,
    createdAt: doc.createdAt.toISOString(),
  }
}
