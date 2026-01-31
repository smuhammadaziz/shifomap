import { Elysia } from "elysia"
import {
  createClinicBodySchema,
  loginClinicOwnerBodySchema,
  changePlanBodySchema,
  createBranchBodySchema,
  createDoctorBodySchema,
  updateDoctorBodySchema,
  loginDoctorBodySchema,
  updateDoctorByDoctorBodySchema,
  updateDoctorScheduleBodySchema,
} from "./clinics.model"
import {
  createClinic,
  loginClinicOwner,
  loginDoctor,
  getClinics,
  getClinicDetails,
  stopClinic,
  activateClinic,
  permanentlyDeleteClinic,
  changeClinicPlan,
  addBranch,
  updateBranch,
  setBranchStatus,
  deleteBranch,
  addDoctor,
  updateDoctor,
  setDoctorStatus,
  deleteDoctor,
  resolveClinicIdForOwner,
  getMyDoctorProfile,
  updateMyDoctorProfile,
  updateMyDoctorSchedule,
} from "./clinics.service"
import { requireAuth } from "@/common/middleware/auth"

/**
 * Clinics routes under /v1/clinics
 * - POST /v1/clinics/create - Create a new clinic (protected - platform admin only)
 * - POST /v1/clinics/login - Login clinic owner (PUBLIC)
 * - GET /v1/clinics - Get all clinics (protected - platform admin only)
 * - GET /v1/clinics/:id - Get single clinic details (protected - platform admin only)
 */
export const clinicsRoutes = new Elysia({ prefix: "/clinics" })
  // Login clinic owner endpoint (PUBLIC - must come BEFORE requireAuth)
  .post("/login", async ({ body, request, set }) => {
    try {
      const parsed = loginClinicOwnerBodySchema.safeParse(body ?? {})
      if (!parsed.success) {
        set.status = 400
        return {
          success: false,
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten().fieldErrors,
        }
      }
      const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? null
      const result = await loginClinicOwner(parsed.data, ip)
      set.status = 200
      return { success: true, data: result }
    } catch (error: any) {
      if (error.statusCode) {
        set.status = error.statusCode
        return { success: false, error: error.message, code: error.code }
      }
      set.status = 500
      return { success: false, error: "Internal server error" }
    }
  })
  // Doctor login (PUBLIC)
  .post("/doctors/login", async ({ body, request, set }) => {
    try {
      const parsed = loginDoctorBodySchema.safeParse(body ?? {})
      if (!parsed.success) {
        set.status = 400
        return {
          success: false,
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten().fieldErrors,
        }
      }
      const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? null
      const result = await loginDoctor(parsed.data, ip)
      set.status = 200
      return { success: true, data: result }
    } catch (error: any) {
      if (error.statusCode) {
        set.status = error.statusCode
        return { success: false, error: error.message, code: error.code }
      }
      set.status = 500
      return { success: false, error: "Internal server error" }
    }
  })
  // Protected routes (require auth: platform admin or clinic owner or doctor)
  .use(requireAuth)
  // Doctor: get my profile (branch + services read-only)
  .get("/doctors/me", async ({ auth, set }) => {
    if (auth.role !== "doctor") {
      set.status = 403
      return { success: false, error: "Forbidden: doctor only" }
    }
    try {
      const result = await getMyDoctorProfile(auth)
      set.status = 200
      return { success: true, data: result }
    } catch (error: any) {
      if (error.statusCode) {
        set.status = error.statusCode
        return { success: false, error: error.message, code: error.code }
      }
      set.status = 500
      return { success: false, error: "Internal server error" }
    }
  })
  // Doctor: update my profile
  .patch("/doctors/me", async ({ auth, body, set }) => {
    if (auth.role !== "doctor") {
      set.status = 403
      return { success: false, error: "Forbidden: doctor only" }
    }
    try {
      const parsed = updateDoctorByDoctorBodySchema.safeParse(body ?? {})
      if (!parsed.success) {
        set.status = 400
        return {
          success: false,
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten().fieldErrors,
        }
      }
      await updateMyDoctorProfile(auth, parsed.data)
      set.status = 200
      return { success: true, data: { message: "Profile updated successfully" } }
    } catch (error: any) {
      if (error.statusCode) {
        set.status = error.statusCode
        return { success: false, error: error.message, code: error.code }
      }
      set.status = 500
      return { success: false, error: "Internal server error" }
    }
  })
  // Doctor: update my schedule
  .patch("/doctors/me/schedule", async ({ auth, body, set }) => {
    if (auth.role !== "doctor") {
      set.status = 403
      return { success: false, error: "Forbidden: doctor only" }
    }
    try {
      const parsed = updateDoctorScheduleBodySchema.safeParse(body ?? {})
      if (!parsed.success) {
        set.status = 400
        return {
          success: false,
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten().fieldErrors,
        }
      }
      await updateMyDoctorSchedule(auth, parsed.data)
      set.status = 200
      return { success: true, data: { message: "Schedule updated successfully" } }
    } catch (error: any) {
      if (error.statusCode) {
        set.status = error.statusCode
        return { success: false, error: error.message, code: error.code }
      }
      set.status = 500
      return { success: false, error: "Internal server error" }
    }
  })
  // Clinic owner: get my clinic (clinicId from JWT or resolved by owner id)
  .get("/my-clinic", async ({ auth, set }) => {
    const clinicId = await resolveClinicIdForOwner(auth)
    if (!clinicId) {
      set.status = 403
      return { success: false, error: "Forbidden: clinic owner only" }
    }
    try {
      const result = await getClinicDetails(clinicId)
      set.status = 200
      return { success: true, data: result }
    } catch (error: any) {
      if (error.statusCode) {
        set.status = error.statusCode
        return { success: false, error: error.message, code: error.code }
      }
      set.status = 500
      return { success: false, error: "Internal server error" }
    }
  })
  // Clinic owner: add branch to my clinic
  .post("/my-clinic/branches", async ({ auth, body, set }) => {
    const clinicId = await resolveClinicIdForOwner(auth)
    if (!clinicId) {
      set.status = 403
      return { success: false, error: "Forbidden: clinic owner only" }
    }
    try {
      const parsed = createBranchBodySchema.safeParse(body ?? {})
      if (!parsed.success) {
        set.status = 400
        return {
          success: false,
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten().fieldErrors,
        }
      }
      const result = await addBranch(clinicId, parsed.data)
      set.status = 201
      return { success: true, data: result }
    } catch (error: any) {
      if (error.statusCode) {
        set.status = error.statusCode
        return { success: false, error: error.message, code: error.code }
      }
      set.status = 500
      return { success: false, error: "Internal server error" }
    }
  })
  // Clinic owner: update branch
  .patch("/my-clinic/branches/:branchId", async ({ auth, params, body, set }) => {
    const clinicId = await resolveClinicIdForOwner(auth)
    if (!clinicId) {
      set.status = 403
      return { success: false, error: "Forbidden: clinic owner only" }
    }
    try {
      const parsed = createBranchBodySchema.safeParse(body ?? {})
      if (!parsed.success) {
        set.status = 400
        return {
          success: false,
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten().fieldErrors,
        }
      }
      await updateBranch(clinicId, params.branchId, parsed.data)
      set.status = 200
      return { success: true, data: { message: "Branch updated successfully" } }
    } catch (error: any) {
      if (error.statusCode) {
        set.status = error.statusCode
        return { success: false, error: error.message, code: error.code }
      }
      set.status = 500
      return { success: false, error: "Internal server error" }
    }
  })
  // Clinic owner: set branch inactive/active
  .patch("/my-clinic/branches/:branchId/status", async ({ auth, params, body, set }) => {
    const clinicId = await resolveClinicIdForOwner(auth)
    if (!clinicId) {
      set.status = 403
      return { success: false, error: "Forbidden: clinic owner only" }
    }
    try {
      const isActive = (body as { isActive?: boolean })?.isActive === true
      await setBranchStatus(clinicId, params.branchId, isActive)
      set.status = 200
      return { success: true, data: { message: isActive ? "Branch activated" : "Branch set inactive" } }
    } catch (error: any) {
      if (error.statusCode) {
        set.status = error.statusCode
        return { success: false, error: error.message, code: error.code }
      }
      set.status = 500
      return { success: false, error: "Internal server error" }
    }
  })
  // Clinic owner: delete branch
  .delete("/my-clinic/branches/:branchId", async ({ auth, params, set }) => {
    const clinicId = await resolveClinicIdForOwner(auth)
    if (!clinicId) {
      set.status = 403
      return { success: false, error: "Forbidden: clinic owner only" }
    }
    try {
      await deleteBranch(clinicId, params.branchId)
      set.status = 200
      return { success: true, data: { message: "Branch deleted successfully" } }
    } catch (error: any) {
      if (error.statusCode) {
        set.status = error.statusCode
        return { success: false, error: error.message, code: error.code }
      }
      set.status = 500
      return { success: false, error: "Internal server error" }
    }
  })
  // Clinic owner: add doctor
  .post("/my-clinic/doctors", async ({ auth, body, set }) => {
    const clinicId = await resolveClinicIdForOwner(auth)
    if (!clinicId) {
      set.status = 403
      return { success: false, error: "Forbidden: clinic owner only" }
    }
    try {
      const parsed = createDoctorBodySchema.safeParse(body ?? {})
      if (!parsed.success) {
        set.status = 400
        return {
          success: false,
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten().fieldErrors,
        }
      }
      const result = await addDoctor(clinicId, parsed.data)
      set.status = 201
      return { success: true, data: result }
    } catch (error: any) {
      if (error.statusCode) {
        set.status = error.statusCode
        return { success: false, error: error.message, code: error.code }
      }
      set.status = 500
      return { success: false, error: "Internal server error" }
    }
  })
  // Clinic owner: update doctor
  .patch("/my-clinic/doctors/:doctorId", async ({ auth, params, body, set }) => {
    const clinicId = await resolveClinicIdForOwner(auth)
    if (!clinicId) {
      set.status = 403
      return { success: false, error: "Forbidden: clinic owner only" }
    }
    try {
      const parsed = updateDoctorBodySchema.safeParse(body ?? {})
      if (!parsed.success) {
        set.status = 400
        return {
          success: false,
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten().fieldErrors,
        }
      }
      await updateDoctor(clinicId, params.doctorId, parsed.data)
      set.status = 200
      return { success: true, data: { message: "Doctor updated successfully" } }
    } catch (error: any) {
      if (error.statusCode) {
        set.status = error.statusCode
        return { success: false, error: error.message, code: error.code }
      }
      set.status = 500
      return { success: false, error: "Internal server error" }
    }
  })
  // Clinic owner: set doctor active/inactive
  .patch("/my-clinic/doctors/:doctorId/status", async ({ auth, params, body, set }) => {
    const clinicId = await resolveClinicIdForOwner(auth)
    if (!clinicId) {
      set.status = 403
      return { success: false, error: "Forbidden: clinic owner only" }
    }
    try {
      const isActive = (body as { isActive?: boolean })?.isActive === true
      await setDoctorStatus(clinicId, params.doctorId, isActive)
      set.status = 200
      return { success: true, data: { message: isActive ? "Doctor activated" : "Doctor set inactive" } }
    } catch (error: any) {
      if (error.statusCode) {
        set.status = error.statusCode
        return { success: false, error: error.message, code: error.code }
      }
      set.status = 500
      return { success: false, error: "Internal server error" }
    }
  })
  // Clinic owner: delete doctor
  .delete("/my-clinic/doctors/:doctorId", async ({ auth, params, set }) => {
    const clinicId = await resolveClinicIdForOwner(auth)
    if (!clinicId) {
      set.status = 403
      return { success: false, error: "Forbidden: clinic owner only" }
    }
    try {
      await deleteDoctor(clinicId, params.doctorId)
      set.status = 200
      return { success: true, data: { message: "Doctor deleted successfully" } }
    } catch (error: any) {
      if (error.statusCode) {
        set.status = error.statusCode
        return { success: false, error: error.message, code: error.code }
      }
      set.status = 500
      return { success: false, error: "Internal server error" }
    }
  })
  // Create clinic endpoint (platform admin only)
  .post("/create", async ({ body, set }) => {
    try {
      const parsed = createClinicBodySchema.safeParse(body ?? {})
      if (!parsed.success) {
        set.status = 400
        return {
          success: false,
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten().fieldErrors,
        }
      }
      const result = await createClinic(parsed.data)
      set.status = 201
      return { success: true, data: result }
    } catch (error: any) {
      if (error.statusCode) {
        set.status = error.statusCode
        return { success: false, error: error.message, code: error.code }
      }
      set.status = 500
      return { success: false, error: "Internal server error" }
    }
  })
  // Get all clinics endpoint (protected)
  .get("/", async ({ query, set }) => {
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 100
    const search = query.search as string | undefined
    const result = await getClinics(page, limit, search)
    set.status = 200
    return { success: true, data: result }
  })
  // Get single clinic details endpoint (protected)
  .get("/:id", async ({ params, set }) => {
    const result = await getClinicDetails(params.id)
    set.status = 200
    return { success: true, data: result }
  })
  // Stop clinic (soft delete) endpoint (protected)
  .patch("/:id/stop", async ({ params, set }) => {
    try {
      const result = await stopClinic(params.id)
      set.status = 200
      return { success: true, data: result }
    } catch (error: any) {
      if (error.statusCode) {
        set.status = error.statusCode
        return { success: false, error: error.message, code: error.code }
      }
      set.status = 500
      return { success: false, error: "Internal server error" }
    }
  })
  // Activate clinic endpoint (protected)
  .patch("/:id/activate", async ({ params, set }) => {
    try {
      const result = await activateClinic(params.id)
      set.status = 200
      return { success: true, data: result }
    } catch (error: any) {
      if (error.statusCode) {
        set.status = error.statusCode
        return { success: false, error: error.message, code: error.code }
      }
      set.status = 500
      return { success: false, error: "Internal server error" }
    }
  })
  // Delete clinic permanently endpoint (protected)
  .delete("/:id", async ({ params, set }) => {
    try {
      const result = await permanentlyDeleteClinic(params.id)
      set.status = 200
      return { success: true, data: result }
    } catch (error: any) {
      if (error.statusCode) {
        set.status = error.statusCode
        return { success: false, error: error.message, code: error.code }
      }
      set.status = 500
      return { success: false, error: "Internal server error" }
    }
  })
  // Change clinic plan endpoint (protected)
  .patch("/:id/plan", async ({ params, body, set }) => {
    try {
      const parsed = changePlanBodySchema.safeParse(body ?? {})
      if (!parsed.success) {
        set.status = 400
        return {
          success: false,
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten().fieldErrors,
        }
      }
      const result = await changeClinicPlan(params.id, parsed.data)
      set.status = 200
      return { success: true, data: result }
    } catch (error: any) {
      if (error.statusCode) {
        set.status = error.statusCode
        return { success: false, error: error.message, code: error.code }
      }
      set.status = 500
      return { success: false, error: "Internal server error" }
    }
  })
