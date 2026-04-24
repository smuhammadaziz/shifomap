import { z } from "zod"
import type { ObjectId } from "mongodb"

export interface MedicalHistoryDoc {
  _id: ObjectId
  patientId: ObjectId
  name: string
  description: string
  durationDays: number
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export const createHistoryBodySchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(2000).default(""),
  durationDays: z.number().int().min(0).max(365 * 50),
})

export const updateHistoryBodySchema = z.object({
  name: z.string().min(1).max(128).optional(),
  description: z.string().max(2000).optional(),
  durationDays: z.number().int().min(0).max(365 * 50).optional(),
})

export function mapHistoryToPublic(doc: MedicalHistoryDoc) {
  return {
    _id: doc._id.toHexString(),
    patientId: doc.patientId.toHexString(),
    name: doc.name,
    description: doc.description,
    durationDays: doc.durationDays,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}
