import { Elysia } from "elysia"
import { ObjectId } from "mongodb"
import {
  createHistoryBodySchema,
  updateHistoryBodySchema,
  mapHistoryToPublic,
  type MedicalHistoryDoc,
} from "./medical-history.model"
import { requireAuth, requirePatientAuth } from "@/common/middleware/auth"
import { getDb, MEDICAL_HISTORY_COLLECTION, BOOKINGS_COLLECTION } from "@/db/mongo"
import { toObjectId } from "@/common/utils/id"
import { unauthorized, notFound, forbidden } from "@/common/errors"
import type { BookingDoc } from "@/modules/bookings/bookings.model"

export const medicalHistoryPatientRoutes = new Elysia({ prefix: "/patients/me/history" })
  .use(requirePatientAuth)
  .get("/", async ({ auth, set }) => {
    const db = getDb()
    const docs = await db
      .collection<MedicalHistoryDoc>(MEDICAL_HISTORY_COLLECTION)
      .find({ patientId: toObjectId(auth.sub), deletedAt: null })
      .sort({ createdAt: -1 })
      .toArray()
    set.status = 200
    return { success: true, data: docs.map(mapHistoryToPublic) }
  })
  .post("/", async ({ auth, body, set }) => {
    const parsed = createHistoryBodySchema.safeParse(body ?? {})
    if (!parsed.success) {
      set.status = 400
      return {
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      }
    }
    const db = getDb()
    const now = new Date()
    const doc: MedicalHistoryDoc = {
      _id: new ObjectId(),
      patientId: toObjectId(auth.sub),
      name: parsed.data.name,
      description: parsed.data.description ?? "",
      durationDays: parsed.data.durationDays,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }
    await db.collection<MedicalHistoryDoc>(MEDICAL_HISTORY_COLLECTION).insertOne(doc)
    set.status = 201
    return { success: true, data: mapHistoryToPublic(doc) }
  })
  .patch("/:id", async ({ auth, params, body, set }) => {
    const parsed = updateHistoryBodySchema.safeParse(body ?? {})
    if (!parsed.success) {
      set.status = 400
      return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors }
    }
    if (!ObjectId.isValid(params.id)) {
      set.status = 400
      return { success: false, error: "Invalid id" }
    }
    const db = getDb()
    const result = await db
      .collection<MedicalHistoryDoc>(MEDICAL_HISTORY_COLLECTION)
      .findOneAndUpdate(
        { _id: toObjectId(params.id), patientId: toObjectId(auth.sub), deletedAt: null },
        { $set: { ...parsed.data, updatedAt: new Date() } },
        { returnDocument: "after" }
      )
    if (!result) {
      set.status = 404
      return { success: false, error: "Not found" }
    }
    set.status = 200
    return { success: true, data: mapHistoryToPublic(result) }
  })
  .delete("/:id", async ({ auth, params, set }) => {
    if (!ObjectId.isValid(params.id)) {
      set.status = 400
      return { success: false, error: "Invalid id" }
    }
    const db = getDb()
    const result = await db
      .collection<MedicalHistoryDoc>(MEDICAL_HISTORY_COLLECTION)
      .findOneAndUpdate(
        { _id: toObjectId(params.id), patientId: toObjectId(auth.sub), deletedAt: null },
        { $set: { deletedAt: new Date(), updatedAt: new Date() } },
        { returnDocument: "after" }
      )
    if (!result) {
      set.status = 404
      return { success: false, error: "Not found" }
    }
    set.status = 200
    return { success: true, data: { _id: params.id } }
  })

export const medicalHistoryDoctorRoutes = new Elysia({ prefix: "/medical-history/patient" })
  .use(requireAuth)
  .get("/:id", async ({ auth, params, set }) => {
    if (!ObjectId.isValid(params.id)) {
      set.status = 400
      return { success: false, error: "Invalid id" }
    }
    if (auth.role !== "doctor" && !auth.role?.startsWith("clinic_")) {
      throw unauthorized("Doctor or clinic access only")
    }
    const db = getDb()
    const patientId = toObjectId(params.id)
    const hasBooking = await db.collection<BookingDoc>(BOOKINGS_COLLECTION).findOne({
      userId: patientId,
      clinicId: auth.clinicId ? toObjectId(auth.clinicId) : undefined,
      deletedAt: null,
      ...(auth.role === "doctor" ? { doctorId: toObjectId(auth.sub) } : {}),
    })
    if (!hasBooking) throw forbidden("No booking relationship with this patient")

    const docs = await db
      .collection<MedicalHistoryDoc>(MEDICAL_HISTORY_COLLECTION)
      .find({ patientId, deletedAt: null })
      .sort({ createdAt: -1 })
      .toArray()
    set.status = 200
    return { success: true, data: docs.map(mapHistoryToPublic) }
  })
