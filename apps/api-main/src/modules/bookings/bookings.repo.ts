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
  price: null
  cancel: { by: null; reason: null; cancelledAt: null }
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

export async function findNextUpcomingByUserId(userId: ObjectId): Promise<BookingDoc | null> {
  const db = getDb()
  const now = new Date()
  return db.collection<BookingDoc>(BOOKINGS_COLLECTION).findOne(
    { userId, deletedAt: null, status: { $in: ["pending", "confirmed"] }, scheduledAt: { $gte: now } },
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
    { _id: bookingId, userId, deletedAt: null, status: { $in: ["pending", "confirmed"] } },
    {
      $set: {
        status: "cancelled",
        "cancel.by": "patient",
        "cancel.reason": reason ?? null,
        "cancel.cancelledAt": now,
        updatedAt: now,
      },
    },
    { returnDocument: "after" }
  )
  return result ?? null
}
