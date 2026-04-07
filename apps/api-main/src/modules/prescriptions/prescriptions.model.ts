import { z } from "zod"
import type { ObjectId } from "mongodb"

export type FoodRelation = "before_food" | "after_food" | "no_relation"

export interface PrescriptionMedicine {
  key: string
  name: string
  dosage: string
  durationDays: number
  timesPerDay: number
  foodRelation: FoodRelation
  foodTiming: string | null
  notes: string | null
  scheduleTimes: string[] // HH:mm
}

export interface PrescriptionDoc {
  _id: ObjectId
  bookingId: ObjectId
  clinicId: ObjectId
  doctorId: ObjectId
  userId: ObjectId
  medicines: PrescriptionMedicine[]
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export type PrescriptionEventAction = "taken" | "skipped"

export interface PrescriptionEventDoc {
  _id: ObjectId
  prescriptionId: ObjectId
  medicineKey: string
  date: string // YYYY-MM-DD
  time: string // HH:mm
  action: PrescriptionEventAction
  actedAt: Date
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

const medicineSchema = z.object({
  key: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  dosage: z.string().min(1).max(64),
  durationDays: z.number().int().min(1).max(365),
  timesPerDay: z.number().int().min(1).max(10),
  foodRelation: z.enum(["before_food", "after_food", "no_relation"]),
  foodTiming: z.string().max(128).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  scheduleTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/)).min(1).max(10).optional(),
})

export const upsertPrescriptionBodySchema = z.object({
  bookingId: z.string().min(1),
  medicines: z.array(medicineSchema).min(1).max(30),
})
export type UpsertPrescriptionBody = z.infer<typeof upsertPrescriptionBodySchema>

export const prescriptionEventBodySchema = z.object({
  medicineKey: z.string().min(1).max(64),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  action: z.enum(["taken", "skipped"]),
})
export type PrescriptionEventBody = z.infer<typeof prescriptionEventBodySchema>

export interface CustomReminderDoc {
  _id: ObjectId
  userId: ObjectId
  pillName: string
  time: string // HH:mm
  notes: string | null
  timesPerDay: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export const createCustomReminderSchema = z.object({
  pillName: z.string().min(1).max(128),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().max(500).nullable().optional(),
  timesPerDay: z.number().int().min(1).max(10),
})

export type CreateCustomReminderBody = z.infer<typeof createCustomReminderSchema>

