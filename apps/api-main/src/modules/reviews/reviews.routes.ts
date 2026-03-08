import { Elysia } from "elysia"
import { createReviewBodySchema } from "./reviews.model"
import { insertReview, listReviews, getRatingForTarget } from "./reviews.repo"
import { requirePatientAuth } from "@/common/middleware/auth"
import { toObjectId } from "@/common/utils/id"
import { getDb, CLINICS_COLLECTION } from "@/db/mongo"
import type { ClinicDoc } from "@/modules/clinics/clinics.model"

export const reviewsRoutes = new Elysia({ prefix: "/reviews" })
  .get("/", async ({ query, set }) => {
    try {
      const clinicId = (query.clinicId as string) ?? ""
      const serviceId = (query.serviceId as string) ?? undefined
      const doctorId = (query.doctorId as string) ?? undefined
      const skip = Math.max(0, parseInt((query.skip as string) || "0", 10))
      const limit = Math.min(50, Math.max(1, parseInt((query.limit as string) || "10", 10)))
      if (!clinicId) {
        set.status = 400
        return { success: false, error: "clinicId is required" }
      }
      const data = await listReviews({ clinicId, serviceId, doctorId }, skip, limit)
      const rating = await getRatingForTarget({ clinicId, serviceId, doctorId })
      set.status = 200
      return { success: true, data: { ...data, rating } }
    } catch (e: unknown) {
      const err = e as { statusCode?: number; message?: string }
      if (err.statusCode) {
        set.status = err.statusCode
        return { success: false, error: err.message }
      }
      set.status = 500
      return { success: false, error: "Internal server error" }
    }
  })
  .use(requirePatientAuth)
  .post("/", async ({ auth, body, set }) => {
    try {
      const parsed = createReviewBodySchema.safeParse(body ?? {})
      if (!parsed.success) {
        set.status = 400
        return {
          success: false,
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten().fieldErrors,
        }
      }
      const clinicId = parsed.data.clinicId
      if (!clinicId) {
        set.status = 400
        return { success: false, error: "clinicId is required" }
      }
      const db = getDb()
      const clinic = await db.collection<ClinicDoc>(CLINICS_COLLECTION).findOne({
        _id: toObjectId(clinicId),
        status: "active",
        deletedAt: null,
      })
      if (!clinic) {
        set.status = 404
        return { success: false, error: "Clinic not found" }
      }
      const doc = await insertReview({
        clinicId,
        serviceId: parsed.data.serviceId ?? null,
        doctorId: parsed.data.doctorId ?? null,
        patientId: auth.sub,
        stars: parsed.data.stars,
        text: parsed.data.text ?? null,
      })
      set.status = 201
      return {
        success: true,
        data: {
          _id: doc._id.toHexString(),
          clinicId: doc.clinicId.toHexString(),
          serviceId: doc.serviceId?.toHexString() ?? null,
          doctorId: doc.doctorId?.toHexString() ?? null,
          stars: doc.stars,
          text: doc.text,
          createdAt: doc.createdAt.toISOString(),
        },
      }
    } catch (e: unknown) {
      const err = e as { statusCode?: number; message?: string }
      if (err.statusCode) {
        set.status = err.statusCode
        return { success: false, error: err.message }
      }
      set.status = 500
      return { success: false, error: "Internal server error" }
    }
  })
