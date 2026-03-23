import { z } from "zod"
import type { ObjectId } from "mongodb"

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "patient_arrived"
  | "in_progress"
  | "completed"
  | "cancelled"
export type CancelBy = "patient" | "clinic" | "doctor"

export type BookingStatusEventType = "created" | BookingStatus

export interface BookingStatusEvent {
  type: BookingStatusEventType
  at: Date
  by: { role: "patient" | "clinic" | "doctor"; id: ObjectId } | null
 }

/**
 * MongoDB document shape for collection "bookings"
 */
export interface BookingDoc {
  _id: ObjectId
  clinicId: ObjectId
  branchId: ObjectId | null
  serviceId: ObjectId
  doctorId: ObjectId | null
  userId: ObjectId
  scheduledAt: Date // combined for indexing and queries
  scheduledDate: string // YYYY-MM-DD for display
  scheduledTime: string // HH:mm for display
  status: BookingStatus
  // Price snapshot at booking creation time (for patient display)
  consultationPrice: {
    amount?: number
    minAmount?: number
    maxAmount?: number
    currency: string
  } | null
  price: number | null // optional final price (kept for backward compat)
  cancel: {
    by: CancelBy | null
    reason: string | null
    cancelledAt: Date | null
  }
  statusHistory: BookingStatusEvent[]
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export const createBookingBodySchema = z.object({
  clinicId: z.string().min(1, "Clinic is required"),
  branchId: z.string().nullable().optional(),
  serviceId: z.string().min(1, "Service is required"),
  doctorId: z.string().nullable().optional(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:mm"),
})

export type CreateBookingBody = z.infer<typeof createBookingBodySchema>

export const cancelBookingBodySchema = z.object({
  reason: z.string().max(500).nullable().optional(),
})
export type CancelBookingBody = z.infer<typeof cancelBookingBodySchema>
