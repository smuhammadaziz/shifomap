import type { ObjectId } from "mongodb"

export interface FileDoc {
  _id: ObjectId
  ownerId: ObjectId | null
  ownerRole: "patient" | "doctor" | "clinic_owner" | "admin" | "public"
  originalName: string
  mimeType: string
  size: number
  storagePath: string
  createdAt: Date
  deletedAt: Date | null
}

export function mapFileToPublic(doc: FileDoc) {
  return {
    _id: doc._id.toHexString(),
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    size: doc.size,
    url: `/v1/files/${doc._id.toHexString()}`,
    createdAt: doc.createdAt.toISOString(),
  }
}
