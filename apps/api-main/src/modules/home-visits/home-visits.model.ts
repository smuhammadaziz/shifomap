import { z } from "zod"
import type { ObjectId } from "mongodb"

export type HomeVisitStatus = "pending" | "confirmed" | "completed" | "cancelled"

export interface HomeVisitDoc {
  _id: ObjectId
  patientId: ObjectId
  clinicId: ObjectId
  doctorId: ObjectId
  patientName: string
  patientPhone: string
  doctorName: string
  doctorSpecialty: string
  clinicName: string
  address: {
    street: string
    building: string | null
    apartment: string | null
  }
  symptoms: string[]
  notes: string
  status: HomeVisitStatus
  cancelReason: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export const createHomeVisitBodySchema = z.object({
  clinicId: z.string().min(1),
  doctorId: z.string().min(1),
  address: z.object({
    street: z.string().trim().min(1).max(300),
    building: z.string().max(50).nullable().optional(),
    apartment: z.string().max(50).nullable().optional(),
  }),
  symptoms: z.array(z.string().max(120)).max(20).default([]),
  notes: z.string().max(2000).default(""),
})

export type CreateHomeVisitBody = z.infer<typeof createHomeVisitBodySchema>

export const updateHomeVisitStatusBodySchema = z.object({
  reason: z.string().max(500).nullable().optional(),
})

export function formatHomeVisitAddress(addr: HomeVisitDoc["address"]): string {
  const parts = [addr.street]
  if (addr.building?.trim()) parts.push(addr.building.trim())
  if (addr.apartment?.trim()) parts.push(addr.apartment.trim())
  return parts.join(", ")
}

export function mapHomeVisitToPublic(doc: HomeVisitDoc) {
  return {
    _id: doc._id.toHexString(),
    patientId: doc.patientId.toHexString(),
    clinicId: doc.clinicId.toHexString(),
    doctorId: doc.doctorId.toHexString(),
    patientName: doc.patientName,
    patientPhone: doc.patientPhone,
    doctorName: doc.doctorName,
    doctorSpecialty: doc.doctorSpecialty,
    clinicName: doc.clinicName,
    address: doc.address,
    addressFormatted: formatHomeVisitAddress(doc.address),
    symptoms: doc.symptoms,
    notes: doc.notes,
    status: doc.status,
    cancelReason: doc.cancelReason,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}
