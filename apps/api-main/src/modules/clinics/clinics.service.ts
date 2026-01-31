import {
  insertClinic,
  findClinicByUniqueName,
  findClinicOwnerByUsername,
  updateOwnerLastLogin,
  getAllClinics,
  countClinics,
  findClinicById,
  findClinicIdByOwnerId,
  updateClinicStatus,
  deleteClinicPermanently,
  updateClinicPlan,
  addBranchToClinic,
  updateBranchInClinic,
  setBranchStatusInClinic,
  removeBranchFromClinic,
  addDoctorToClinic,
  updateDoctorInClinic,
  setDoctorStatusInClinic,
  removeDoctorFromClinic,
  findClinicDoctorByUsername,
  updateDoctorLastLogin,
  updateDoctorScheduleInClinic,
} from "./clinics.repo"
import type {
  CreateClinicBody,
  LoginClinicOwnerBody,
  ChangePlanBody,
  CreateBranchBody,
  CreateDoctorBody,
  UpdateDoctorBody,
  LoginDoctorBody,
  UpdateDoctorByDoctorBody,
  UpdateDoctorScheduleBody,
} from "./clinics.model"
import { mapDocToPublicClinic, mapDocToDetailedClinic } from "./clinics.model"
import { conflict, unauthorized, notFound } from "@/common/errors"
import { signToken } from "@/common/middleware/auth"
import { env } from "@/env"
import { ObjectId } from "mongodb"

/**
 * Create a new clinic with owner
 */
export async function createClinic(body: CreateClinicBody) {
  // Check if clinic unique name already exists
  const existingClinic = await findClinicByUniqueName(body.clinicUniqueName)
  if (existingClinic) {
    throw conflict("Clinic unique name already exists")
  }

  // Check if owner username already exists
  const existingOwner = await findClinicOwnerByUsername(body.ownerUserName)
  if (existingOwner) {
    throw conflict("Owner username already exists")
  }

  // Hash owner password
  const passwordHash = await hashPassword(body.ownerPassword)

  // Create clinic with owner
  const clinic = await insertClinic({
    clinicDisplayName: body.clinicDisplayName,
    clinicUniqueName: body.clinicUniqueName,
    plan: body.plan || "starter",
    owner: {
      userName: body.ownerUserName,
      displayName: body.ownerDisplayName,
      passwordHash,
    },
  })

  return mapDocToPublicClinic(clinic)
}

/**
 * Login clinic owner and return JWT token
 */
export async function loginClinicOwner(body: LoginClinicOwnerBody, clientIP?: string | null) {
  // Find owner by username
  const result = await findClinicOwnerByUsername(body.username)
  if (!result) {
    throw unauthorized("Invalid username or password")
  }

  const { clinic, owner } = result

  // Verify password
  const validPassword = await verifyPassword(body.password, owner.security.passwordHash)
  if (!validPassword) {
    throw unauthorized("Invalid username or password")
  }

  // Check if owner is active
  if (!owner.isActive) {
    throw unauthorized("Account is not active")
  }

  // Check if clinic is active
  if (clinic.status !== "active") {
    throw unauthorized("Clinic is not active")
  }

  // Update last login
  await updateOwnerLastLogin(clinic._id, owner._id, clientIP ?? null)

  // Generate JWT token (include clinicId for clinic-owner API)
  const token = await signToken({
    sub: owner._id.toHexString(),
    username: owner.userName,
    role: `clinic_${owner.role}`,
    clinicId: clinic._id.toHexString(),
  })

  return {
    token,
    owner: {
      _id: owner._id.toHexString(),
      userName: owner.userName,
      displayName: owner.displayName,
      role: owner.role,
      clinicId: clinic._id.toHexString(),
      clinicDisplayName: clinic.clinicDisplayName,
    },
    expiresIn: env.JWT_EXPIRES_IN,
  }
}

/**
 * Get all clinics with pagination and optional search
 */
export async function getClinics(page: number = 1, limit: number = 100, search?: string) {
  const skip = (page - 1) * limit
  const [clinics, total] = await Promise.all([
    getAllClinics(skip, limit, search), 
    countClinics(search)
  ])

  return {
    clinics: clinics.map(mapDocToPublicClinic),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

/**
 * Get single clinic by ID with all details
 */
export async function getClinicDetails(clinicId: string) {
  if (!ObjectId.isValid(clinicId)) {
    throw notFound("Clinic not found")
  }

  const clinic = await findClinicById(new ObjectId(clinicId))
  if (!clinic) {
    throw notFound("Clinic not found")
  }

  return mapDocToDetailedClinic(clinic)
}

// Hash password using Bun's bcrypt implementation
async function hashPassword(plain: string): Promise<string> {
  return Bun.password.hash(plain, { algorithm: "bcrypt", cost: 10 })
}

// Verify password using Bun's bcrypt implementation
async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return Bun.password.verify(plain, hash, "bcrypt")
}

/**
 * Stop clinic (soft delete - make inactive)
 */
export async function stopClinic(clinicId: string) {
  const clinic = await findClinicById(toObjectId(clinicId))
  if (!clinic) {
    throw notFound("Clinic not found")
  }
  
  const success = await updateClinicStatus(clinicId, "inactive")
  if (!success) {
    throw new Error("Failed to stop clinic")
  }
  
  return { message: "Clinic stopped successfully" }
}

/**
 * Activate clinic
 */
export async function activateClinic(clinicId: string) {
  const clinic = await findClinicById(toObjectId(clinicId))
  if (!clinic) {
    throw notFound("Clinic not found")
  }
  
  const success = await updateClinicStatus(clinicId, "active")
  if (!success) {
    throw new Error("Failed to activate clinic")
  }
  
  return { message: "Clinic activated successfully" }
}

/**
 * Delete clinic permanently
 */
export async function permanentlyDeleteClinic(clinicId: string) {
  const clinic = await findClinicById(toObjectId(clinicId))
  if (!clinic) {
    throw notFound("Clinic not found")
  }
  
  const success = await deleteClinicPermanently(clinicId)
  if (!success) {
    throw new Error("Failed to delete clinic")
  }
  
  return { message: "Clinic deleted permanently" }
}

/**
 * Change clinic plan
 */
export async function changeClinicPlan(clinicId: string, body: ChangePlanBody) {
  const clinic = await findClinicById(toObjectId(clinicId))
  if (!clinic) {
    throw notFound("Clinic not found")
  }
  
  const success = await updateClinicPlan(clinicId, body.plan)
  if (!success) {
    throw new Error("Failed to update clinic plan")
  }
  
  return { message: "Clinic plan updated successfully", plan: body.plan }
}

/**
 * Resolve clinic ID for clinic owner (from JWT clinicId or by owner id)
 */
export async function resolveClinicIdForOwner(auth: { role?: string; clinicId?: string; sub: string }): Promise<string | null> {
  if (!auth.role?.startsWith("clinic_")) return null
  if (auth.clinicId) return auth.clinicId
  return findClinicIdByOwnerId(auth.sub)
}

/**
 * Add branch to clinic (for clinic owner)
 */
export async function addBranch(clinicId: string, body: CreateBranchBody) {
  const clinic = await findClinicById(new ObjectId(clinicId))
  if (!clinic) {
    throw notFound("Clinic not found")
  }
  const branch = await addBranchToClinic(clinicId, body)
  return {
    message: "Branch created successfully",
    branch: {
      ...branch,
      _id: branch._id.toHexString(),
      createdAt: branch.createdAt.toISOString(),
      updatedAt: branch.updatedAt.toISOString(),
    },
  }
}

/**
 * Update branch (for clinic owner)
 */
export async function updateBranch(clinicId: string, branchId: string, body: CreateBranchBody) {
  const clinic = await findClinicById(new ObjectId(clinicId))
  if (!clinic) throw notFound("Clinic not found")
  const hasBranch = clinic.branches?.some((b) => b._id.toHexString() === branchId)
  if (!hasBranch) throw notFound("Branch not found")
  const success = await updateBranchInClinic(clinicId, branchId, body)
  if (!success) throw new Error("Failed to update branch")
  return { message: "Branch updated successfully" }
}

/**
 * Set branch active/inactive (for clinic owner)
 */
export async function setBranchStatus(clinicId: string, branchId: string, isActive: boolean) {
  const clinic = await findClinicById(new ObjectId(clinicId))
  if (!clinic) throw notFound("Clinic not found")
  const hasBranch = clinic.branches?.some((b) => b._id.toHexString() === branchId)
  if (!hasBranch) throw notFound("Branch not found")
  const success = await setBranchStatusInClinic(clinicId, branchId, isActive)
  if (!success) throw new Error("Failed to update branch status")
  return { message: isActive ? "Branch activated" : "Branch set inactive" }
}

/**
 * Delete branch (for clinic owner)
 */
export async function deleteBranch(clinicId: string, branchId: string) {
  const clinic = await findClinicById(new ObjectId(clinicId))
  if (!clinic) throw notFound("Clinic not found")
  const success = await removeBranchFromClinic(clinicId, branchId)
  if (!success) throw notFound("Branch not found")
  return { message: "Branch deleted successfully" }
}

// --- Doctors ---

/**
 * Add doctor to clinic (clinic owner). Requires at least one branch.
 */
export async function addDoctor(clinicId: string, body: CreateDoctorBody) {
  const clinic = await findClinicById(new ObjectId(clinicId))
  if (!clinic) throw notFound("Clinic not found")
  if (!clinic.branches?.length) throw conflict("Cannot create a doctor without an existing branch. Create a branch first.")
  const existingDoctor = await findClinicDoctorByUsername(body.username)
  if (existingDoctor) throw conflict("Doctor username already exists")
  const hasBranch = clinic.branches.some((b) => b._id.toHexString() === body.branchId)
  if (!hasBranch) throw notFound("Branch not found")
  const passwordHash = await hashPassword(body.password)
  const doctor = await addDoctorToClinic(clinicId, {
    fullName: body.fullName,
    username: body.username,
    passwordHash,
    specialty: body.specialty,
    bio: body.bio ?? "",
    branchId: body.branchId,
  })
  return {
    message: "Doctor created successfully",
    doctor: {
      _id: doctor._id.toHexString(),
      fullName: doctor.fullName,
      username: doctor.username,
      specialty: doctor.specialty,
      bio: doctor.bio,
      avatarUrl: doctor.avatarUrl,
      serviceIds: (doctor.serviceIds ?? []).map((id) => id.toHexString()),
      branchIds: doctor.branchIds.map((id) => id.toHexString()),
      isActive: doctor.isActive,
      createdAt: doctor.createdAt.toISOString(),
      updatedAt: doctor.updatedAt.toISOString(),
    },
  }
}

/**
 * Update doctor (clinic owner)
 */
export async function updateDoctor(clinicId: string, doctorId: string, body: UpdateDoctorBody) {
  const clinic = await findClinicById(new ObjectId(clinicId))
  if (!clinic) throw notFound("Clinic not found")
  const doctor = clinic.doctors?.find((d) => d._id.toHexString() === doctorId)
  if (!doctor) throw notFound("Doctor not found")
  if (body.username != null && body.username !== doctor.username) {
    const existing = await findClinicDoctorByUsername(body.username)
    if (existing) throw conflict("Doctor username already exists")
  }
  const updates: Parameters<typeof updateDoctorInClinic>[2] = {}
  if (body.fullName != null) updates.fullName = body.fullName
  if (body.username != null) updates.username = body.username
  if (body.specialty != null) updates.specialty = body.specialty
  if (body.bio != null) updates.bio = body.bio
  if (body.branchId != null) updates.branchId = body.branchId
  if (body.password != null) updates.passwordHash = await hashPassword(body.password)
  const success = await updateDoctorInClinic(clinicId, doctorId, updates)
  if (!success) throw new Error("Failed to update doctor")
  return { message: "Doctor updated successfully" }
}

/**
 * Set doctor active/inactive (clinic owner)
 */
export async function setDoctorStatus(clinicId: string, doctorId: string, isActive: boolean) {
  const clinic = await findClinicById(new ObjectId(clinicId))
  if (!clinic) throw notFound("Clinic not found")
  const hasDoctor = clinic.doctors?.some((d) => d._id.toHexString() === doctorId)
  if (!hasDoctor) throw notFound("Doctor not found")
  const success = await setDoctorStatusInClinic(clinicId, doctorId, isActive)
  if (!success) throw new Error("Failed to update doctor status")
  return { message: isActive ? "Doctor activated" : "Doctor set inactive" }
}

/**
 * Delete doctor (clinic owner)
 */
export async function deleteDoctor(clinicId: string, doctorId: string) {
  const clinic = await findClinicById(new ObjectId(clinicId))
  if (!clinic) throw notFound("Clinic not found")
  const success = await removeDoctorFromClinic(clinicId, doctorId)
  if (!success) throw notFound("Doctor not found")
  return { message: "Doctor deleted successfully" }
}

/**
 * Login doctor (public). Returns JWT with role doctor and clinicId.
 */
export async function loginDoctor(body: LoginDoctorBody, clientIP?: string | null) {
  const result = await findClinicDoctorByUsername(body.username)
  if (!result) throw unauthorized("Invalid username or password")
  const { clinic, doctor } = result
  const valid = await verifyPassword(body.password, doctor.security.passwordHash)
  if (!valid) throw unauthorized("Invalid username or password")
  if (!doctor.isActive) throw unauthorized("Account is not active")
  if (clinic.status !== "active") throw unauthorized("Clinic is not active")
  await updateDoctorLastLogin(clinic._id, doctor._id, clientIP ?? null)
  const token = await signToken({
    sub: doctor._id.toHexString(),
    username: doctor.username,
    role: "doctor",
    clinicId: clinic._id.toHexString(),
  })
  return {
    token,
    doctor: {
      _id: doctor._id.toHexString(),
      fullName: doctor.fullName,
      displayName: doctor.fullName,
      username: doctor.username,
      clinicId: clinic._id.toHexString(),
      clinicDisplayName: clinic.clinicDisplayName,
      role: "doctor",
    },
    expiresIn: env.JWT_EXPIRES_IN,
  }
}

/**
 * Get current doctor profile (for doctor role). Returns doctor + branch + services (read-only).
 */
export async function getMyDoctorProfile(auth: { role?: string; clinicId?: string; sub: string }) {
  if (auth.role !== "doctor" || !auth.clinicId) throw unauthorized("Doctor access only")
  const clinic = await findClinicById(new ObjectId(auth.clinicId))
  if (!clinic) throw notFound("Clinic not found")
  const doctor = clinic.doctors?.find((d) => d._id.toHexString() === auth.sub)
  if (!doctor) throw notFound("Doctor not found")
  const branchIds = doctor.branchIds ?? []
  const serviceIds = doctor.serviceIds ?? []
  const branches = (clinic.branches ?? []).filter((b) => branchIds.some((id) => id.equals(b._id)))
  const services = (clinic.services ?? []).filter((s) => serviceIds.some((id) => id.equals(s._id)))
  return {
    doctor: {
      _id: doctor._id.toHexString(),
      fullName: doctor.fullName,
      username: doctor.username,
      specialty: doctor.specialty,
      bio: doctor.bio,
      avatarUrl: doctor.avatarUrl,
      branchIds: doctor.branchIds.map((id) => id.toHexString()),
      serviceIds: (doctor.serviceIds ?? []).map((id) => id.toHexString()),
      isActive: doctor.isActive,
      schedule: doctor.schedule,
      lastLoginAt: doctor.security.lastLoginAt?.toISOString() ?? null,
      createdAt: doctor.createdAt.toISOString(),
      updatedAt: doctor.updatedAt.toISOString(),
    },
    branch: branches[0]
      ? {
          _id: branches[0]._id.toHexString(),
          name: branches[0].name,
          phone: branches[0].phone,
          address: branches[0].address,
          workingHours: branches[0].workingHours,
          isActive: branches[0].isActive,
        }
      : null,
    services: services.map((s) => ({
      _id: s._id.toHexString(),
      title: s.title,
      description: s.description,
      category: s.category,
      durationMin: s.durationMin,
      price: s.price,
    })),
  }
}

/**
 * Update current doctor profile (for doctor role).
 */
export async function updateMyDoctorProfile(auth: { role?: string; clinicId?: string; sub: string }, body: UpdateDoctorByDoctorBody) {
  if (auth.role !== "doctor" || !auth.clinicId) throw unauthorized("Doctor access only")
  const clinic = await findClinicById(new ObjectId(auth.clinicId))
  if (!clinic) throw notFound("Clinic not found")
  const doctor = clinic.doctors?.find((d) => d._id.toHexString() === auth.sub)
  if (!doctor) throw notFound("Doctor not found")
  if (body.username != null && body.username !== doctor.username) {
    const existing = await findClinicDoctorByUsername(body.username)
    if (existing && existing.doctor._id.toHexString() !== auth.sub) throw conflict("Username already exists")
  }
  const updates: Parameters<typeof updateDoctorInClinic>[2] = {}
  if (body.fullName != null) updates.fullName = body.fullName
  if (body.username != null) updates.username = body.username
  if (body.specialty != null) updates.specialty = body.specialty
  if (body.bio != null) updates.bio = body.bio
  if (body.avatarUrl !== undefined) updates.avatarUrl = body.avatarUrl
  if (body.password != null) updates.passwordHash = await hashPassword(body.password)
  const success = await updateDoctorInClinic(auth.clinicId, auth.sub, updates)
  if (!success) throw new Error("Failed to update profile")
  return { message: "Profile updated successfully" }
}

/**
 * Update current doctor schedule (for doctor role).
 */
export async function updateMyDoctorSchedule(auth: { role?: string; clinicId?: string; sub: string }, body: UpdateDoctorScheduleBody) {
  if (auth.role !== "doctor" || !auth.clinicId) throw unauthorized("Doctor access only")
  const clinic = await findClinicById(new ObjectId(auth.clinicId))
  if (!clinic) throw notFound("Clinic not found")
  const hasDoctor = clinic.doctors?.some((d) => d._id.toHexString() === auth.sub)
  if (!hasDoctor) throw notFound("Doctor not found")
  const success = await updateDoctorScheduleInClinic(auth.clinicId, auth.sub, body)
  if (!success) throw new Error("Failed to update schedule")
  return { message: "Schedule updated successfully" }
}

function toObjectId(id: string): ObjectId {
  return new ObjectId(id)
}
