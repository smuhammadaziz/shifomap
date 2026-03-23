import { ObjectId } from "mongodb"
import { getDb, BOOKINGS_COLLECTION } from "@/db/mongo"
import type { BookingDoc } from "./bookings.model"

export interface InsertBookingInput {
  clinicId: ObjectId
  branchId: ObjectId | null
  serviceId: ObjectId
  doctorId: ObjectId | null
  userId: ObjectId
  scheduledAt: Date
  scheduledDate: string
  scheduledTime: string
  status: "pending"
  consultationPrice: { amount?: number; minAmount?: number; maxAmount?: number; currency: string } | null
  price: null
  cancel: { by: null; reason: null; cancelledAt: null }
  statusHistory: Array<{ type: "created"; at: Date; by: null }>
}

export async function insertBooking(input: InsertBookingInput): Promise<BookingDoc> {
  const db = getDb()
  const now = new Date()
  const doc: Omit<BookingDoc, "_id"> = {
    ...input,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
  const result = await db.collection<BookingDoc>(BOOKINGS_COLLECTION).insertOne(doc as BookingDoc)
  const inserted = await db.collection<BookingDoc>(BOOKINGS_COLLECTION).findOne({ _id: result.insertedId })
  if (!inserted) throw new Error("Insert booking failed")
  return inserted
}

export async function findBookingsByUserId(
  userId: ObjectId,
  options?: { status?: BookingDoc["status"]; limit?: number }
): Promise<BookingDoc[]> {
  const db = getDb()
  const filter: Record<string, unknown> = { userId, deletedAt: null }
  if (options?.status) filter.status = options.status
  const limit = options?.limit ?? 100
  const cursor = db
    .collection<BookingDoc>(BOOKINGS_COLLECTION)
    .find(filter)
    .sort({ scheduledAt: -1 })
    .limit(limit)
  return cursor.toArray()
}

export async function findBookingById(id: ObjectId, userId: ObjectId): Promise<BookingDoc | null> {
  const db = getDb()
  return db.collection<BookingDoc>(BOOKINGS_COLLECTION).findOne({ _id: id, userId, deletedAt: null })
}

export async function findBookingByIdForClinic(id: ObjectId, clinicId: ObjectId): Promise<BookingDoc | null> {
  const db = getDb()
  return db.collection<BookingDoc>(BOOKINGS_COLLECTION).findOne({ _id: id, clinicId, deletedAt: null })
}

export async function findNextUpcomingByUserId(userId: ObjectId): Promise<BookingDoc | null> {
  const db = getDb()
  const now = new Date()
  return db.collection<BookingDoc>(BOOKINGS_COLLECTION).findOne(
    { userId, deletedAt: null, status: { $in: ["pending", "confirmed", "patient_arrived", "in_progress"] }, scheduledAt: { $gte: now } },
    { sort: { scheduledAt: 1 } }
  )
}

export async function updateBookingCancel(
  bookingId: ObjectId,
  userId: ObjectId,
  reason: string | null
): Promise<BookingDoc | null> {
  const db = getDb()
  const now = new Date()
  const result = await db.collection<BookingDoc>(BOOKINGS_COLLECTION).findOneAndUpdate(
    { _id: bookingId, userId, deletedAt: null, status: { $in: ["pending", "confirmed", "patient_arrived"] } },
    {
      $set: {
        status: "cancelled",
        "cancel.by": "patient",
        "cancel.reason": reason ?? null,
        "cancel.cancelledAt": now,
        updatedAt: now,
      },
      $push: {
        statusHistory: { type: "cancelled", at: now, by: { role: "patient", id: userId } },
      },
    },
    { returnDocument: "after" }
  )
  return result ?? null
}

export async function findBookingsByClinicId(
  clinicId: ObjectId,
  options?: { status?: BookingDoc["status"]; from?: Date; to?: Date; limit?: number }
): Promise<BookingDoc[]> {
  const db = getDb()
  const filter: Record<string, unknown> = { clinicId, deletedAt: null }
  if (options?.status) filter.status = options.status
  if (options?.from || options?.to) {
    filter.scheduledAt = {
      ...(options.from ? { $gte: options.from } : {}),
      ...(options.to ? { $lte: options.to } : {}),
    }
  }
  const limit = options?.limit ?? 500
  return db.collection<BookingDoc>(BOOKINGS_COLLECTION).find(filter).sort({ scheduledAt: -1 }).limit(limit).toArray()
}

export async function findBookingsByDoctorId(
  clinicId: ObjectId,
  doctorId: ObjectId,
  options?: { from?: Date; to?: Date; limit?: number }
): Promise<BookingDoc[]> {
  const db = getDb()
  const filter: Record<string, unknown> = { clinicId, doctorId, deletedAt: null }
  if (options?.from || options?.to) {
    filter.scheduledAt = {
      ...(options.from ? { $gte: options.from } : {}),
      ...(options.to ? { $lte: options.to } : {}),
    }
  }
  const limit = options?.limit ?? 200
  return db.collection<BookingDoc>(BOOKINGS_COLLECTION).find(filter).sort({ scheduledAt: 1 }).limit(limit).toArray()
}

export async function updateBookingStatusByClinic(
  bookingId: ObjectId,
  clinicId: ObjectId,
  nextStatus: BookingDoc["status"],
  actor: { role: "clinic" | "doctor"; id: ObjectId },
  extra?: { price?: number | null; cancelReason?: string | null }
): Promise<BookingDoc | null> {
  const db = getDb()
  const now = new Date()
  const set: Record<string, unknown> = { status: nextStatus, updatedAt: now }
  if (nextStatus === "cancelled") {
    set["cancel.by"] = actor.role === "doctor" ? "doctor" : "clinic"
    set["cancel.reason"] = extra?.cancelReason ?? null
    set["cancel.cancelledAt"] = now
  }
  if (extra?.price !== undefined) {
    set.price = extra.price
  }
  const result = await db.collection<BookingDoc>(BOOKINGS_COLLECTION).findOneAndUpdate(
    { _id: bookingId, clinicId, deletedAt: null, status: { $ne: "cancelled" } },
    {
      $set: set,
      $push: { statusHistory: { type: nextStatus, at: now, by: actor } },
    },
    { returnDocument: "after" }
  )
  return result ?? null
}

export async function findBookedTimesForDoctorOnDate(
  clinicId: ObjectId,
  doctorId: ObjectId,
  scheduledDate: string
): Promise<string[]> {
  const db = getDb()
  const docs = await db.collection<BookingDoc>(BOOKINGS_COLLECTION)
    .find(
      {
        clinicId,
        doctorId,
        scheduledDate,
        deletedAt: null,
        status: { $nin: ["cancelled"] },
      },
      { projection: { scheduledTime: 1 } }
    )
    .toArray()
  return docs.map((d) => d.scheduledTime)
}
