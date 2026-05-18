import { ObjectId } from "mongodb"
import { getDb, HOME_VISITS_COLLECTION, PATIENTS_COLLECTION } from "@/db/mongo"
import { findClinicById } from "@/modules/clinics/clinics.repo"
import type { PatientDoc } from "@/modules/patients/patients.model"
import type { JwtPayload } from "@/common/middleware/auth"
import { badRequest, forbidden, notFound, unauthorized } from "@/common/errors"
import {
  type CreateHomeVisitBody,
  type HomeVisitDoc,
  type HomeVisitStatus,
  mapHomeVisitToPublic,
} from "./home-visits.model"

function assertClinicStaff(auth: JwtPayload) {
  if (auth.role === "doctor") return
  if (auth.role?.startsWith("clinic_")) return
  throw forbidden("Clinic or doctor access required")
}

export async function createHomeVisit(patientId: string, body: CreateHomeVisitBody) {
  const db = getDb()
  const patient = await db
    .collection<PatientDoc>(PATIENTS_COLLECTION)
    .findOne({ _id: new ObjectId(patientId), deletedAt: null })
  if (!patient) throw notFound("Patient not found")

  const clinicId = new ObjectId(body.clinicId)
  const doctorId = new ObjectId(body.doctorId)
  const clinic = await findClinicById(clinicId)
  if (!clinic) throw notFound("Clinic not found")

  const doctor = clinic.doctors?.find((d) => d._id.equals(doctorId) && d.isActive !== false)
  if (!doctor) throw badRequest("Doctor not found in this clinic")

  const now = new Date()
  const doc: HomeVisitDoc = {
    _id: new ObjectId(),
    patientId: new ObjectId(patientId),
    clinicId,
    doctorId,
    patientName: patient.fullName?.trim() || "Patient",
    patientPhone: patient.contacts?.phone ?? "",
    doctorName: doctor.fullName,
    doctorSpecialty: doctor.specialty ?? "",
    clinicName: clinic.clinicDisplayName ?? "Clinic",
    address: {
      street: body.address.street.trim(),
      building: body.address.building?.trim() || null,
      apartment: body.address.apartment?.trim() || null,
    },
    symptoms: body.symptoms ?? [],
    notes: body.notes?.trim() ?? "",
    status: "pending",
    cancelReason: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }

  await db.collection<HomeVisitDoc>(HOME_VISITS_COLLECTION).insertOne(doc)
  return mapHomeVisitToPublic(doc)
}

async function findDocById(id: string): Promise<HomeVisitDoc | null> {
  if (!ObjectId.isValid(id)) return null
  const db = getDb()
  return db.collection<HomeVisitDoc>(HOME_VISITS_COLLECTION).findOne({
    _id: new ObjectId(id),
    deletedAt: null,
  })
}

function assertCanRead(auth: JwtPayload, doc: HomeVisitDoc) {
  if (auth.role === "doctor") {
    if (auth.sub !== doc.doctorId.toHexString()) throw forbidden("Not your invitation")
    return
  }
  if (auth.role?.startsWith("clinic_")) {
    if (auth.clinicId !== doc.clinicId.toHexString()) throw forbidden("Not your clinic")
    return
  }
  throw unauthorized("Unauthorized")
}

export async function listHomeVisitsForDoctor(auth: JwtPayload, status?: HomeVisitStatus) {
  if (auth.role !== "doctor") throw forbidden("Doctor only")
  const db = getDb()
  const filter: Record<string, unknown> = {
    doctorId: new ObjectId(auth.sub),
    deletedAt: null,
  }
  if (status) filter.status = status
  const docs = await db
    .collection<HomeVisitDoc>(HOME_VISITS_COLLECTION)
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray()
  return docs.map(mapHomeVisitToPublic)
}

export async function listHomeVisitsForClinic(auth: JwtPayload, status?: HomeVisitStatus) {
  if (!auth.role?.startsWith("clinic_") || !auth.clinicId) throw forbidden("Clinic staff only")
  const db = getDb()
  const filter: Record<string, unknown> = {
    clinicId: new ObjectId(auth.clinicId),
    deletedAt: null,
  }
  if (status) filter.status = status
  const docs = await db
    .collection<HomeVisitDoc>(HOME_VISITS_COLLECTION)
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray()
  return docs.map(mapHomeVisitToPublic)
}

export async function getHomeVisitById(auth: JwtPayload, id: string) {
  const doc = await findDocById(id)
  if (!doc) throw notFound("Invitation not found")
  assertCanRead(auth, doc)
  return mapHomeVisitToPublic(doc)
}

export async function updateHomeVisitStatus(
  auth: JwtPayload,
  id: string,
  status: HomeVisitStatus,
  reason?: string | null,
) {
  const doc = await findDocById(id)
  if (!doc) throw notFound("Invitation not found")
  assertCanRead(auth, doc)

  if (doc.status === "cancelled" || doc.status === "completed") {
    throw badRequest("This invitation is already closed")
  }

  const db = getDb()
  const patch: Partial<HomeVisitDoc> = {
    status,
    updatedAt: new Date(),
    cancelReason: status === "cancelled" ? reason?.trim() || null : doc.cancelReason,
  }

  const result = await db.collection<HomeVisitDoc>(HOME_VISITS_COLLECTION).findOneAndUpdate(
    { _id: doc._id, deletedAt: null },
    { $set: patch },
    { returnDocument: "after" },
  )
  if (!result) throw notFound("Invitation not found")
  return mapHomeVisitToPublic(result)
}
