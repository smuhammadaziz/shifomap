import { ObjectId } from "mongodb"
import { getDb, PATIENTS_COLLECTION } from "@/db/mongo"
import type { PatientDoc } from "./patients.model"
import type { PatientLanguage } from "./patients.model"

export interface InsertPatientInput {
  fullName: string
  gender: "male" | "female"
  age: number | null
  avatarUrl: string
  contacts: { phone: string; email: string | null; telegram: string | null }
  status: "active" | "blocked" | "deleted"
  auth: {
    passwordHash: string | null
    type: "google" | "phone"
    googleId?: string | null
    email?: string | null
    lastLoginAt?: Date | null
  }
  location: { city: string }
  preferences: { language: PatientLanguage; notificationsEnabled: boolean }
}

export async function insertPatient(input: InsertPatientInput): Promise<PatientDoc> {
  const db = getDb()
  const now = new Date()
  const doc: Omit<PatientDoc, "_id"> = {
    ...input,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
  const result = await db.collection<PatientDoc>(PATIENTS_COLLECTION).insertOne(doc as PatientDoc)
  const inserted = await db.collection<PatientDoc>(PATIENTS_COLLECTION).findOne({ _id: result.insertedId })
  if (!inserted) throw new Error("Insert patient failed")
  return inserted
}

export async function findPatientByEmail(email: string): Promise<PatientDoc | null> {
  const db = getDb()
  return db
    .collection<PatientDoc>(PATIENTS_COLLECTION)
    .findOne({ "contacts.email": email, deletedAt: null })
}

export async function findPatientByGoogleId(googleId: string): Promise<PatientDoc | null> {
  const db = getDb()
  return db
    .collection<PatientDoc>(PATIENTS_COLLECTION)
    .findOne({ "auth.googleId": googleId, deletedAt: null })
}

export async function findPatientByPhone(phone: string): Promise<PatientDoc | null> {
  const db = getDb()
  return db
    .collection<PatientDoc>(PATIENTS_COLLECTION)
    .findOne({ "contacts.phone": phone, deletedAt: null })
}

export async function findPatientById(id: ObjectId): Promise<PatientDoc | null> {
  const db = getDb()
  return db.collection<PatientDoc>(PATIENTS_COLLECTION).findOne({ _id: id, deletedAt: null })
}

export async function updatePatientLastLogin(patientId: ObjectId): Promise<void> {
  const db = getDb()
  const now = new Date()
  await db.collection<PatientDoc>(PATIENTS_COLLECTION).updateOne(
    { _id: patientId },
    { $set: { "auth.lastLoginAt": now, updatedAt: now } }
  )
}

export async function updatePatientProfile(
  patientId: ObjectId,
  updates: {
    fullName?: string
    gender?: "male" | "female"
    age?: number | null
    avatarUrl?: string
    "contacts.email"?: string | null
    "location.city"?: string
    "preferences.language"?: PatientLanguage
    "preferences.notificationsEnabled"?: boolean
  }
): Promise<PatientDoc | null> {
  const db = getDb()
  const now = new Date()
  const setFields: Record<string, unknown> = { updatedAt: now }
  if (updates.fullName != null) setFields.fullName = updates.fullName
  if (updates.gender != null) setFields.gender = updates.gender
  if (updates.age !== undefined) setFields.age = updates.age
  if (updates.avatarUrl != null) setFields.avatarUrl = updates.avatarUrl
  if (updates["contacts.email"] !== undefined) setFields["contacts.email"] = updates["contacts.email"]
  if (updates["location.city"] != null) setFields["location.city"] = updates["location.city"]
  if (updates["preferences.language"] != null) setFields["preferences.language"] = updates["preferences.language"]
  if (updates["preferences.notificationsEnabled"] !== undefined)
    setFields["preferences.notificationsEnabled"] = updates["preferences.notificationsEnabled"]

  await db.collection<PatientDoc>(PATIENTS_COLLECTION).updateOne({ _id: patientId }, { $set: setFields })
  return db.collection<PatientDoc>(PATIENTS_COLLECTION).findOne({ _id: patientId })
}

export async function updatePatientPassword(
  patientId: ObjectId,
  passwordHash: string
): Promise<PatientDoc | null> {
  const db = getDb()
  const now = new Date()
  await db.collection<PatientDoc>(PATIENTS_COLLECTION).updateOne(
    { _id: patientId },
    { $set: { "auth.passwordHash": passwordHash, updatedAt: now } }
  )
  return db.collection<PatientDoc>(PATIENTS_COLLECTION).findOne({ _id: patientId })
}
