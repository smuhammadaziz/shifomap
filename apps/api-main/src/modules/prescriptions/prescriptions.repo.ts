import { ObjectId } from "mongodb"
import { getDb, PRESCRIPTIONS_COLLECTION, PRESCRIPTION_EVENTS_COLLECTION, CUSTOM_REMINDERS_COLLECTION } from "@/db/mongo"
import type { PrescriptionDoc, PrescriptionEventDoc, PrescriptionEventAction, PrescriptionMedicine, CustomReminderDoc } from "./prescriptions.model"

export async function findPrescriptionByBookingId(bookingId: ObjectId): Promise<PrescriptionDoc | null> {
  const db = getDb()
  return db.collection<PrescriptionDoc>(PRESCRIPTIONS_COLLECTION).findOne({ bookingId, deletedAt: null })
}

export async function findPrescriptionByIdForPatient(id: ObjectId, userId: ObjectId): Promise<PrescriptionDoc | null> {
  const db = getDb()
  return db.collection<PrescriptionDoc>(PRESCRIPTIONS_COLLECTION).findOne({ _id: id, userId, deletedAt: null })
}

export async function findPrescriptionByIdForDoctor(id: ObjectId, clinicId: ObjectId, doctorId: ObjectId): Promise<PrescriptionDoc | null> {
  const db = getDb()
  return db.collection<PrescriptionDoc>(PRESCRIPTIONS_COLLECTION).findOne({ _id: id, clinicId, doctorId, deletedAt: null })
}

export async function listPrescriptionsByUserId(userId: ObjectId, limit = 200): Promise<PrescriptionDoc[]> {
  const db = getDb()
  return db.collection<PrescriptionDoc>(PRESCRIPTIONS_COLLECTION).find({ userId, deletedAt: null }).sort({ createdAt: -1 }).limit(limit).toArray()
}

export async function upsertPrescription(input: {
  bookingId: ObjectId
  clinicId: ObjectId
  doctorId: ObjectId
  userId: ObjectId
  medicines: PrescriptionMedicine[]
}): Promise<PrescriptionDoc> {
  const db = getDb()
  const now = new Date()
  const existing = await findPrescriptionByBookingId(input.bookingId)
  if (existing) {
    const result = await db.collection<PrescriptionDoc>(PRESCRIPTIONS_COLLECTION).findOneAndUpdate(
      { _id: existing._id, deletedAt: null },
      { $set: { medicines: input.medicines, updatedAt: now } },
      { returnDocument: "after" }
    )
    if (!result) throw new Error("Update prescription failed")
    return result
  }
  const doc: Omit<PrescriptionDoc, "_id"> = {
    bookingId: input.bookingId,
    clinicId: input.clinicId,
    doctorId: input.doctorId,
    userId: input.userId,
    medicines: input.medicines,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
  const inserted = await db.collection<PrescriptionDoc>(PRESCRIPTIONS_COLLECTION).insertOne(doc as PrescriptionDoc)
  const created = await db.collection<PrescriptionDoc>(PRESCRIPTIONS_COLLECTION).findOne({ _id: inserted.insertedId })
  if (!created) throw new Error("Insert prescription failed")
  return created
}

export async function upsertPrescriptionEvent(input: {
  prescriptionId: ObjectId
  medicineKey: string
  date: string
  time: string
  action: PrescriptionEventAction
}): Promise<PrescriptionEventDoc> {
  const db = getDb()
  const now = new Date()
  const result = await db.collection<PrescriptionEventDoc>(PRESCRIPTION_EVENTS_COLLECTION).findOneAndUpdate(
    { prescriptionId: input.prescriptionId, medicineKey: input.medicineKey, date: input.date, time: input.time, deletedAt: null },
    {
      $set: { action: input.action, actedAt: now, updatedAt: now },
      $setOnInsert: { createdAt: now, deletedAt: null },
    },
    { upsert: true, returnDocument: "after" }
  )
  if (!result) throw new Error("Upsert event failed")
  return result
}

export async function listPrescriptionEventsForDate(prescriptionId: ObjectId, date: string): Promise<PrescriptionEventDoc[]> {
  const db = getDb()
  return db
    .collection<PrescriptionEventDoc>(PRESCRIPTION_EVENTS_COLLECTION)
    .find({ prescriptionId, date, deletedAt: null })
    .toArray()
}

export async function upsertCustomReminder(userId: ObjectId, input: { pillName: string; time: string; notes?: string | null; timesPerDay: number }): Promise<CustomReminderDoc> {
  const db = getDb()
  const now = new Date()
  const doc: Omit<CustomReminderDoc, "_id"> = {
    userId,
    pillName: input.pillName,
    time: input.time,
    notes: input.notes ?? null,
    timesPerDay: input.timesPerDay,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
  const inserted = await db.collection<CustomReminderDoc>(CUSTOM_REMINDERS_COLLECTION).insertOne(doc as CustomReminderDoc)
  const created = await db.collection<CustomReminderDoc>(CUSTOM_REMINDERS_COLLECTION).findOne({ _id: inserted.insertedId })
  if (!created) throw new Error("Insert custom reminder failed")
  return created
}

export async function listCustomRemindersByUserId(userId: ObjectId): Promise<CustomReminderDoc[]> {
  const db = getDb()
  return db.collection<CustomReminderDoc>(CUSTOM_REMINDERS_COLLECTION).find({ userId, deletedAt: null }).sort({ time: 1 }).toArray()
}

export async function deleteCustomReminder(id: ObjectId, userId: ObjectId): Promise<boolean> {
  const db = getDb()
  const result = await db.collection<CustomReminderDoc>(CUSTOM_REMINDERS_COLLECTION).updateOne(
    { _id: id, userId },
    { $set: { deletedAt: new Date() } }
  )
  return result.modifiedCount > 0
}

