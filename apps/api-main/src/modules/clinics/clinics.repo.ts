import { ObjectId } from "mongodb"
import { getDb, CLINICS_COLLECTION } from "@/db/mongo"
import type { ClinicDoc, ClinicOwner, ClinicBranch, ClinicDoctor, ClinicCategory, ClinicService } from "./clinics.model"
import { toObjectId } from "@/common/utils/id"

export interface InsertClinicInput {
  clinicDisplayName: string
  clinicUniqueName: string
  plan: "starter" | "pro"
  owner: {
    userName: string
    displayName: string
    passwordHash: string
  }
}

export const PLAN_LIMITS = {
  starter: { maxBranches: 1, maxServices: 5, maxAdmins: 1 },
  pro: { maxBranches: 5, maxServices: 20, maxAdmins: 3 },
} as const

/**
 * Migrate all existing clinics to use the latest plan limits
 */
export async function migratePlanLimits(): Promise<{ updated: number }> {
  const db = getDb()
  const now = new Date()

  // Update starter clinics
  const starterResult = await db.collection<ClinicDoc>(CLINICS_COLLECTION).updateMany(
    { "plan.type": "starter" },
    { $set: { "plan.limits": PLAN_LIMITS.starter, updatedAt: now } }
  )

  // Update pro clinics
  const proResult = await db.collection<ClinicDoc>(CLINICS_COLLECTION).updateMany(
    { "plan.type": "pro" },
    { $set: { "plan.limits": PLAN_LIMITS.pro, updatedAt: now } }
  )

  return { updated: starterResult.modifiedCount + proResult.modifiedCount }
}

/**
 * Insert a new clinic with initial owner
 */
export async function insertClinic(input: InsertClinicInput): Promise<ClinicDoc> {
  const db = getDb()
  const now = new Date()

  const planLimits = PLAN_LIMITS

  const owner: ClinicOwner = {
    _id: new ObjectId(),
    adminId: new ObjectId(),
    role: "owner",
    userName: input.owner.userName.toLowerCase(),
    displayName: input.owner.displayName,
    security: {
      passwordHash: input.owner.passwordHash,
      passwordUpdatedAt: now,
      lastLoginAt: null,
      lastLoginIP: null,
    },
    addedAt: now,
    removedAt: null,
    isActive: true,
  }

  const doc: Omit<ClinicDoc, "_id"> = {
    clinicDisplayName: input.clinicDisplayName,
    clinicUniqueName: input.clinicUniqueName.toLowerCase(),
    status: "active",
    category: [],
    branding: {
      logoUrl: null,
      coverUrl: null,
    },
    contacts: {
      phone: null,
      email: null,
      telegram: null,
    },
    description: {
      short: null,
      full: null,
    },
    plan: {
      type: input.plan,
      startedAt: now,
      expiresAt: null,
      limits: planLimits[input.plan],
    },
    ranking: {
      score: 0,
      boosted: false,
      updatedAt: now,
    },
    rating: {
      avg: 0,
      count: 0,
    },
    owners: [owner],
    branches: [],
    services: [],
    doctors: [],
    categories: [],
    stats: {
      branchesCount: 0,
      servicesCount: 0,
      doctorsCount: 0,
      adminsCount: 1,
      bookingsTotal: 0,
      completedBookings: 0,
      updatedAt: now,
    },
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }

  const result = await db.collection<ClinicDoc>(CLINICS_COLLECTION).insertOne(doc as ClinicDoc)
  const inserted = await db.collection<ClinicDoc>(CLINICS_COLLECTION).findOne({ _id: result.insertedId })

  if (!inserted) throw new Error("Insert failed")
  return inserted
}

/**
 * Find clinic by unique name
 */
export async function findClinicByUniqueName(uniqueName: string): Promise<ClinicDoc | null> {
  const db = getDb()
  return db
    .collection<ClinicDoc>(CLINICS_COLLECTION)
    .findOne({ clinicUniqueName: uniqueName.toLowerCase(), deletedAt: null })
}

/**
 * Find clinic owner by username (across all clinics)
 */
export async function findClinicOwnerByUsername(
  username: string
): Promise<{ clinic: ClinicDoc; owner: ClinicOwner } | null> {
  const db = getDb()
  const clinic = await db.collection<ClinicDoc>(CLINICS_COLLECTION).findOne({
    "owners.userName": username.toLowerCase(),
    "owners.isActive": true,
    deletedAt: null,
  })

  if (!clinic) return null

  const owner = clinic.owners.find((o) => o.userName.toLowerCase() === username.toLowerCase() && o.isActive)

  if (!owner) return null

  return { clinic, owner }
}

/**
 * Find clinic ID by owner ID (for clinic owner JWT that may not have clinicId)
 */
export async function findClinicIdByOwnerId(ownerId: string): Promise<string | null> {
  const db = getDb()
  let id: ObjectId
  try {
    id = toObjectId(ownerId)
  } catch {
    return null
  }
  const clinic = await db.collection<ClinicDoc>(CLINICS_COLLECTION).findOne({
    "owners._id": id,
    "owners.isActive": true,
    deletedAt: null,
  })
  return clinic ? clinic._id.toHexString() : null
}

/**
 * Update owner last login
 */
export async function updateOwnerLastLogin(
  clinicId: ObjectId,
  ownerId: ObjectId,
  ip: string | null
): Promise<void> {
  const db = getDb()
  const now = new Date()

  await db.collection<ClinicDoc>(CLINICS_COLLECTION).updateOne(
    { _id: clinicId, "owners._id": ownerId },
    {
      $set: {
        "owners.$.security.lastLoginAt": now,
        "owners.$.security.lastLoginIP": ip ?? null,
        updatedAt: now,
      },
    }
  )
}

/**
 * Get all clinics (paginated) - including inactive with optional search
 */
export async function getAllClinics(skip: number = 0, limit: number = 100, search?: string): Promise<ClinicDoc[]> {
  const db = getDb()

  // Build search filter if search query is provided
  const searchFilter = search ? {
    $or: [
      { clinicDisplayName: { $regex: search, $options: "i" } },
      { clinicUniqueName: { $regex: search, $options: "i" } },
      { "owners.displayName": { $regex: search, $options: "i" } },
      { "owners.userName": { $regex: search, $options: "i" } },
    ]
  } : {}

  return db
    .collection<ClinicDoc>(CLINICS_COLLECTION)
    .find(searchFilter) // Show all clinics including inactive with search
    .sort({ status: 1, createdAt: -1 }) // Sort by status (active first) then by creation date
    .skip(skip)
    .limit(limit)
    .toArray()
}

/**
 * Count all clinics (including inactive) with optional search
 */
export async function countClinics(search?: string): Promise<number> {
  const db = getDb()

  // Build search filter if search query is provided
  const searchFilter = search ? {
    $or: [
      { clinicDisplayName: { $regex: search, $options: "i" } },
      { clinicUniqueName: { $regex: search, $options: "i" } },
      { "owners.displayName": { $regex: search, $options: "i" } },
      { "owners.userName": { $regex: search, $options: "i" } },
    ]
  } : {}

  return db.collection<ClinicDoc>(CLINICS_COLLECTION).countDocuments(searchFilter)
}

/**
 * Find clinic by ID (including inactive)
 */
export async function findClinicById(clinicId: ObjectId): Promise<ClinicDoc | null> {
  const db = getDb()
  return db.collection<ClinicDoc>(CLINICS_COLLECTION).findOne({ _id: clinicId })
}

/**
 * Update clinic info (branding, contacts, description)
 */
export async function updateClinicInfo(
  clinicId: string,
  input: {
    branding?: { logoUrl?: string | null; coverUrl?: string | null }
    contacts?: { phone?: string | null; email?: string | null; telegram?: string | null }
    description?: { short?: string | null; full?: string | null }
  }
): Promise<boolean> {
  const db = getDb()
  const id = toObjectId(clinicId)
  const now = new Date()
  const set: Record<string, unknown> = { updatedAt: now }

  if (input.branding !== undefined) {
    if (input.branding.logoUrl !== undefined) set["branding.logoUrl"] = input.branding.logoUrl
    if (input.branding.coverUrl !== undefined) set["branding.coverUrl"] = input.branding.coverUrl
  }
  if (input.contacts !== undefined) {
    if (input.contacts.phone !== undefined) set["contacts.phone"] = input.contacts.phone
    if (input.contacts.email !== undefined) set["contacts.email"] = input.contacts.email
    if (input.contacts.telegram !== undefined) set["contacts.telegram"] = input.contacts.telegram
  }
  if (input.description !== undefined) {
    if (input.description.short !== undefined) set["description.short"] = input.description.short
    if (input.description.full !== undefined) set["description.full"] = input.description.full
  }

  if (Object.keys(set).length <= 1) return true // only updatedAt
  const result = await db.collection<ClinicDoc>(CLINICS_COLLECTION).updateOne(
    { _id: id },
    { $set: set }
  )
  return result.modifiedCount > 0
}

/**
 * Update clinic status (for soft delete/stop)
 */
export async function updateClinicStatus(clinicId: string, status: "active" | "inactive") {
  const db = getDb()
  const id = toObjectId(clinicId)
  const now = new Date()

  const update: any = {
    status,
    updatedAt: now,
  }

  // Set deletedAt when making inactive, unset when making active
  if (status === "inactive") {
    update.deletedAt = now
  } else {
    update.deletedAt = null
  }

  const result = await db.collection<ClinicDoc>(CLINICS_COLLECTION).updateOne(
    { _id: id },
    { $set: update }
  )

  return result.modifiedCount > 0
}

/**
 * Delete clinic permanently
 */
export async function deleteClinicPermanently(clinicId: string) {
  const db = getDb()
  const id = toObjectId(clinicId)

  const result = await db.collection<ClinicDoc>(CLINICS_COLLECTION).deleteOne({ _id: id })
  return result.deletedCount > 0
}

/**
 * Update clinic plan (also updates the limits based on plan type)
 */
export async function updateClinicPlan(clinicId: string, planType: "starter" | "pro") {
  const db = getDb()
  const id = toObjectId(clinicId)
  const newLimits = PLAN_LIMITS[planType]

  const result = await db.collection<ClinicDoc>(CLINICS_COLLECTION).updateOne(
    { _id: id },
    {
      $set: {
        "plan.type": planType,
        "plan.limits": newLimits,
        updatedAt: new Date(),
      }
    }
  )

  return result.modifiedCount > 0
}

export interface AddBranchInput {
  name: string
  phone: string
  address: {
    city: string
    street: string
    geo: { lat: number; lng: number }
  }
  workingHours: Array<{ day: number; from: string; to: string }>
}

/**
 * Add a branch to a clinic (and bump stats.branchesCount)
 */
export async function addBranchToClinic(clinicId: string, input: AddBranchInput): Promise<ClinicBranch> {
  const db = getDb()
  const id = toObjectId(clinicId)
  const now = new Date()
  const branchId = new ObjectId()

  const branch: ClinicBranch = {
    _id: branchId,
    name: input.name,
    phone: input.phone,
    address: input.address,
    workingHours: input.workingHours,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }

  const clinic = await db.collection<ClinicDoc>(CLINICS_COLLECTION).findOne({ _id: id })
  if (!clinic) throw new Error("Clinic not found")
  const newCount = (clinic.branches?.length ?? 0) + 1

  await db.collection<ClinicDoc>(CLINICS_COLLECTION).updateOne(
    { _id: id },
    {
      $push: { branches: branch },
      $set: {
        "stats.branchesCount": newCount,
        "stats.updatedAt": now,
        updatedAt: now,
      },
    }
  )

  return branch
}

/**
 * Update a branch by clinic id and branch id
 */
export async function updateBranchInClinic(
  clinicId: string,
  branchId: string,
  input: AddBranchInput
): Promise<boolean> {
  const db = getDb()
  const cId = toObjectId(clinicId)
  const bId = toObjectId(branchId)
  const now = new Date()
  const result = await db.collection<ClinicDoc>(CLINICS_COLLECTION).updateOne(
    { _id: cId, "branches._id": bId },
    {
      $set: {
        "branches.$.name": input.name,
        "branches.$.phone": input.phone,
        "branches.$.address": input.address,
        "branches.$.workingHours": input.workingHours,
        "branches.$.updatedAt": now,
        updatedAt: now,
      },
    }
  )
  return result.modifiedCount > 0
}

/**
 * Set branch active/inactive by clinic id and branch id
 */
export async function setBranchStatusInClinic(
  clinicId: string,
  branchId: string,
  isActive: boolean
): Promise<boolean> {
  const db = getDb()
  const cId = toObjectId(clinicId)
  const bId = toObjectId(branchId)
  const now = new Date()
  const result = await db.collection<ClinicDoc>(CLINICS_COLLECTION).updateOne(
    { _id: cId, "branches._id": bId },
    {
      $set: {
        "branches.$.isActive": isActive,
        "branches.$.updatedAt": now,
        updatedAt: now,
      },
    }
  )
  return result.modifiedCount > 0
}

/**
 * Remove a branch from clinic (and update stats.branchesCount)
 */
export async function removeBranchFromClinic(clinicId: string, branchId: string): Promise<boolean> {
  const db = getDb()
  const cId = toObjectId(clinicId)
  const bId = toObjectId(branchId)
  const clinic = await db.collection<ClinicDoc>(CLINICS_COLLECTION).findOne({ _id: cId })
  if (!clinic) return false
  const newBranches = (clinic.branches ?? []).filter((b) => !b._id.equals(bId))
  if (newBranches.length === clinic.branches?.length) return false
  const now = new Date()
  const result = await db.collection<ClinicDoc>(CLINICS_COLLECTION).updateOne(
    { _id: cId },
    {
      $set: {
        branches: newBranches,
        "stats.branchesCount": newBranches.length,
        "stats.updatedAt": now,
        updatedAt: now,
      },
    }
  )
  return result.modifiedCount > 0
}

// --- Doctors ---

export interface AddDoctorInput {
  fullName: string
  username: string
  passwordHash: string
  specialty: string
  bio: string
  branchId: string
}

/**
 * Update doctor last login
 */
export async function updateDoctorLastLogin(
  clinicId: ObjectId,
  doctorId: ObjectId,
  ip: string | null
): Promise<void> {
  const db = getDb()
  const now = new Date()
  await db.collection<ClinicDoc>(CLINICS_COLLECTION).updateOne(
    { _id: clinicId, "doctors._id": doctorId },
    {
      $set: {
        "doctors.$.security.lastLoginAt": now,
        "doctors.$.security.lastLoginIP": ip ?? null,
        updatedAt: now,
      },
    }
  )
}

/**
 * Find clinic and doctor by doctor username (across all clinics, for login)
 */
export async function findClinicDoctorByUsername(
  username: string
): Promise<{ clinic: ClinicDoc; doctor: ClinicDoctor } | null> {
  const db = getDb()
  const clinic = await db.collection<ClinicDoc>(CLINICS_COLLECTION).findOne({
    "doctors.username": username.toLowerCase(),
    deletedAt: null,
  })
  if (!clinic) return null
  const doctor = (clinic.doctors ?? []).find((d) => d.username.toLowerCase() === username.toLowerCase())
  if (!doctor) return null
  return { clinic, doctor }
}

/**
 * Add a doctor to a clinic (requires existing branch; updates stats.doctorsCount)
 */
export async function addDoctorToClinic(clinicId: string, input: AddDoctorInput): Promise<ClinicDoctor> {
  const db = getDb()
  const cId = toObjectId(clinicId)
  const branchId = toObjectId(input.branchId)
  const now = new Date()
  const doctorId = new ObjectId()

  const doctor: ClinicDoctor = {
    _id: doctorId,
    fullName: input.fullName,
    username: input.username.toLowerCase(),
    security: {
      passwordHash: input.passwordHash,
      passwordUpdatedAt: now,
      lastLoginAt: null,
      lastLoginIP: null,
    },
    specialty: input.specialty,
    bio: input.bio,
    avatarUrl: null,
    serviceIds: [],
    branchIds: [branchId],
    isActive: true,
    schedule: { timezone: "Asia/Tashkent", weekly: [] },
    createdAt: now,
    updatedAt: now,
  }

  const clinic = await db.collection<ClinicDoc>(CLINICS_COLLECTION).findOne({ _id: cId })
  if (!clinic) throw new Error("Clinic not found")
  const branchExists = (clinic.branches ?? []).some((b) => b._id.equals(branchId))
  if (!branchExists) throw new Error("Branch not found")
  const newCount = (clinic.doctors?.length ?? 0) + 1

  await db.collection<ClinicDoc>(CLINICS_COLLECTION).updateOne(
    { _id: cId },
    {
      $push: { doctors: doctor },
      $set: {
        "stats.doctorsCount": newCount,
        "stats.updatedAt": now,
        updatedAt: now,
      },
    }
  )
  return doctor
}

/**
 * Update a doctor in a clinic
 */
export async function updateDoctorInClinic(
  clinicId: string,
  doctorId: string,
  input: Partial<{
    fullName: string
    username: string
    passwordHash: string
    specialty: string
    bio: string
    branchId: string
    avatarUrl: string | null
  }>
): Promise<boolean> {
  const db = getDb()
  const cId = toObjectId(clinicId)
  const dId = toObjectId(doctorId)
  const now = new Date()
  const set: Record<string, unknown> = {
    "doctors.$.updatedAt": now,
  }
  if (input.fullName != null) set["doctors.$.fullName"] = input.fullName
  if (input.username != null) set["doctors.$.username"] = input.username.toLowerCase()
  if (input.passwordHash != null) {
    set["doctors.$.security.passwordHash"] = input.passwordHash
    set["doctors.$.security.passwordUpdatedAt"] = now
  }
  if (input.specialty != null) set["doctors.$.specialty"] = input.specialty
  if (input.bio != null) set["doctors.$.bio"] = input.bio
  if (input.branchId != null) set["doctors.$.branchIds"] = [toObjectId(input.branchId)]
  if (input.avatarUrl !== undefined) set["doctors.$.avatarUrl"] = input.avatarUrl

  const result = await db.collection<ClinicDoc>(CLINICS_COLLECTION).updateOne(
    { _id: cId, "doctors._id": dId },
    { $set: set }
  )
  return result.modifiedCount > 0
}

/**
 * Set doctor active/inactive
 */
export async function setDoctorStatusInClinic(
  clinicId: string,
  doctorId: string,
  isActive: boolean
): Promise<boolean> {
  const db = getDb()
  const cId = toObjectId(clinicId)
  const dId = toObjectId(doctorId)
  const now = new Date()
  const result = await db.collection<ClinicDoc>(CLINICS_COLLECTION).updateOne(
    { _id: cId, "doctors._id": dId },
    {
      $set: {
        "doctors.$.isActive": isActive,
        "doctors.$.updatedAt": now,
        updatedAt: now,
      },
    }
  )
  return result.modifiedCount > 0
}

/**
 * Update a doctor's schedule in a clinic
 */
export async function updateDoctorScheduleInClinic(
  clinicId: string,
  doctorId: string,
  schedule: { timezone: string; weekly: Array<{ day: number; from: string; to: string; lunchFrom?: string; lunchTo?: string }> }
): Promise<boolean> {
  const db = getDb()
  const cId = toObjectId(clinicId)
  const dId = toObjectId(doctorId)
  const now = new Date()
  const weekly = schedule.weekly.map((w) => ({
    day: w.day,
    from: w.from,
    to: w.to,
    ...(w.lunchFrom != null && w.lunchTo != null ? { lunchFrom: w.lunchFrom, lunchTo: w.lunchTo } : {}),
  }))
  const result = await db.collection<ClinicDoc>(CLINICS_COLLECTION).updateOne(
    { _id: cId, "doctors._id": dId },
    {
      $set: {
        "doctors.$.schedule": { timezone: schedule.timezone, weekly },
        "doctors.$.updatedAt": now,
        updatedAt: now,
      },
    }
  )
  return result.modifiedCount > 0
}

/**
 * Remove a doctor from clinic (updates stats.doctorsCount)
 */
export async function removeDoctorFromClinic(clinicId: string, doctorId: string): Promise<boolean> {
  const db = getDb()
  const cId = toObjectId(clinicId)
  const dId = toObjectId(doctorId)
  const clinic = await db.collection<ClinicDoc>(CLINICS_COLLECTION).findOne({ _id: cId })
  if (!clinic) return false
  const newDoctors = (clinic.doctors ?? []).filter((d) => !d._id.equals(dId))
  if (newDoctors.length === clinic.doctors?.length) return false
  const now = new Date()
  const result = await db.collection<ClinicDoc>(CLINICS_COLLECTION).updateOne(
    { _id: cId },
    {
      $set: {
        doctors: newDoctors,
        "stats.doctorsCount": newDoctors.length,
        "stats.updatedAt": now,
        updatedAt: now,
      },
    }
  )
  return result.modifiedCount > 0
}

// --- Categories ---

/**
 * Add a category to a clinic
 */
export async function addCategoryToClinic(clinicId: string, name: string): Promise<ClinicCategory> {
  const db = getDb()
  const cId = toObjectId(clinicId)
  const now = new Date()
  const categoryId = new ObjectId()
  const category: ClinicCategory = {
    _id: categoryId,
    name,
    createdAt: now,
    updatedAt: now,
  }
  const clinic = await db.collection<ClinicDoc>(CLINICS_COLLECTION).findOne({ _id: cId })
  if (!clinic) throw new Error("Clinic not found")
  const currentCategories = clinic.categories ?? []
  const updated = [...currentCategories, category]
  await db.collection<ClinicDoc>(CLINICS_COLLECTION).updateOne(
    { _id: cId },
    { $set: { categories: updated, updatedAt: now } }
  )
  return category
}

/**
 * Update a category in a clinic
 */
export async function updateCategoryInClinic(
  clinicId: string,
  categoryId: string,
  name: string
): Promise<boolean> {
  const db = getDb()
  const cId = toObjectId(clinicId)
  const catId = toObjectId(categoryId)
  const now = new Date()
  const result = await db.collection<ClinicDoc>(CLINICS_COLLECTION).updateOne(
    { _id: cId, "categories._id": catId },
    {
      $set: {
        "categories.$.name": name,
        "categories.$.updatedAt": now,
        updatedAt: now,
      },
    }
  )
  return result.modifiedCount > 0
}

/**
 * Remove a category from a clinic
 */
export async function removeCategoryFromClinic(clinicId: string, categoryId: string): Promise<boolean> {
  const db = getDb()
  const cId = toObjectId(clinicId)
  const catId = toObjectId(categoryId)
  const clinic = await db.collection<ClinicDoc>(CLINICS_COLLECTION).findOne({ _id: cId })
  if (!clinic) return false
  const current = clinic.categories ?? []
  const updated = current.filter((c) => !c._id.equals(catId))
  if (updated.length === current.length) return false
  const now = new Date()
  await db.collection<ClinicDoc>(CLINICS_COLLECTION).updateOne(
    { _id: cId },
    { $set: { categories: updated, updatedAt: now } }
  )
  return true
}

// --- Services --- (doctor serviceIds sync helpers)

/**
 * Add a service ID to the serviceIds array of the given doctors
 */
export async function addServiceIdToDoctors(
  clinicId: string,
  doctorIds: ObjectId[],
  serviceId: ObjectId
): Promise<void> {
  if (doctorIds.length === 0) return
  const db = getDb()
  const cId = toObjectId(clinicId)
  await db.collection<ClinicDoc>(CLINICS_COLLECTION).updateOne(
    { _id: cId },
    { $addToSet: { "doctors.$[d].serviceIds": serviceId } },
    { arrayFilters: [{ "d._id": { $in: doctorIds } }] }
  )
}

/**
 * Remove a service ID from the serviceIds array of the given doctors
 */
export async function removeServiceIdFromDoctors(
  clinicId: string,
  doctorIds: ObjectId[],
  serviceId: ObjectId
): Promise<void> {
  if (doctorIds.length === 0) return
  const db = getDb()
  const cId = toObjectId(clinicId)
  await db.collection<ClinicDoc>(CLINICS_COLLECTION).updateOne(
    { _id: cId },
    { $pull: { "doctors.$[d].serviceIds": serviceId } },
    { arrayFilters: [{ "d._id": { $in: doctorIds } }] }
  )
}

export interface AddServiceInput {
  title: string
  description: string
  serviceImage: string | null
  categoryId: string
  durationMin: number
  price: { amount?: number; minAmount?: number; maxAmount?: number; currency: string }
  branchIds: string[]
  doctorIds: string[]
}

/**
 * Add a service to a clinic (updates stats.servicesCount)
 */
export async function addServiceToClinic(clinicId: string, input: AddServiceInput): Promise<ClinicService> {
  const db = getDb()
  const cId = toObjectId(clinicId)
  const now = new Date()
  const serviceId = new ObjectId()
  const service: ClinicService = {
    _id: serviceId,
    title: input.title,
    description: input.description,
    serviceImage: input.serviceImage,
    categoryId: toObjectId(input.categoryId),
    durationMin: input.durationMin,
    price: input.price,
    branchIds: input.branchIds.map((id) => toObjectId(id)),
    doctorIds: input.doctorIds.map((id) => toObjectId(id)),
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }
  const clinic = await db.collection<ClinicDoc>(CLINICS_COLLECTION).findOne({ _id: cId })
  if (!clinic) throw new Error("Clinic not found")
  const currentServices = clinic.services ?? []
  const newCount = currentServices.length + 1
  await db.collection<ClinicDoc>(CLINICS_COLLECTION).updateOne(
    { _id: cId },
    {
      $push: { services: service },
      $set: { "stats.servicesCount": newCount, "stats.updatedAt": now, updatedAt: now },
    }
  )
  const doctorObjectIds = input.doctorIds.map((id) => toObjectId(id))
  await addServiceIdToDoctors(clinicId, doctorObjectIds, serviceId)
  return service
}

/**
 * Update a service in a clinic. When doctorIds change, syncs doctor.serviceIds.
 */
export async function updateServiceInClinic(
  clinicId: string,
  serviceId: string,
  input: Partial<AddServiceInput>
): Promise<boolean> {
  const db = getDb()
  const cId = toObjectId(clinicId)
  const sId = toObjectId(serviceId)
  const now = new Date()

  if (input.doctorIds != null) {
    const clinic = await db.collection<ClinicDoc>(CLINICS_COLLECTION).findOne({ _id: cId })
    if (clinic) {
      const service = (clinic.services ?? []).find((s) => s._id.equals(sId))
      const oldDoctorIds = service?.doctorIds ?? []
      const newDoctorIds = input.doctorIds.map((id) => toObjectId(id))
      const added = newDoctorIds.filter((n) => !oldDoctorIds.some((o) => o.equals(n)))
      const removed = oldDoctorIds.filter((o) => !newDoctorIds.some((n) => n.equals(o)))
      await removeServiceIdFromDoctors(clinicId, removed, sId)
      await addServiceIdToDoctors(clinicId, added, sId)
    }
  }

  const set: Record<string, unknown> = { "services.$.updatedAt": now }
  if (input.title != null) set["services.$.title"] = input.title
  if (input.description != null) set["services.$.description"] = input.description
  if (input.serviceImage !== undefined) set["services.$.serviceImage"] = input.serviceImage
  if (input.categoryId != null) set["services.$.categoryId"] = toObjectId(input.categoryId)
  if (input.durationMin != null) set["services.$.durationMin"] = input.durationMin
  if (input.price != null) set["services.$.price"] = input.price
  if (input.branchIds != null) set["services.$.branchIds"] = input.branchIds.map((id) => toObjectId(id))
  if (input.doctorIds != null) set["services.$.doctorIds"] = input.doctorIds.map((id) => toObjectId(id))
  const result = await db.collection<ClinicDoc>(CLINICS_COLLECTION).updateOne(
    { _id: cId, "services._id": sId },
    { $set: set }
  )
  return result.modifiedCount > 0
}

/**
 * Set service active/inactive
 */
export async function setServiceStatusInClinic(
  clinicId: string,
  serviceId: string,
  isActive: boolean
): Promise<boolean> {
  const db = getDb()
  const cId = toObjectId(clinicId)
  const sId = toObjectId(serviceId)
  const now = new Date()
  const result = await db.collection<ClinicDoc>(CLINICS_COLLECTION).updateOne(
    { _id: cId, "services._id": sId },
    {
      $set: {
        "services.$.isActive": isActive,
        "services.$.updatedAt": now,
        updatedAt: now,
      },
    }
  )
  return result.modifiedCount > 0
}

/**
 * Remove a service from a clinic (updates stats.servicesCount and doctor.serviceIds)
 */
export async function removeServiceFromClinic(clinicId: string, serviceId: string): Promise<boolean> {
  const db = getDb()
  const cId = toObjectId(clinicId)
  const sId = toObjectId(serviceId)
  const clinic = await db.collection<ClinicDoc>(CLINICS_COLLECTION).findOne({ _id: cId })
  if (!clinic) return false
  const current = clinic.services ?? []
  const service = current.find((s) => s._id.equals(sId))
  const doctorIds = service?.doctorIds ?? []
  const updated = current.filter((s) => !s._id.equals(sId))
  if (updated.length === current.length) return false
  const now = new Date()
  await db.collection<ClinicDoc>(CLINICS_COLLECTION).updateOne(
    { _id: cId },
    {
      $set: {
        services: updated,
        "stats.servicesCount": updated.length,
        "stats.updatedAt": now,
        updatedAt: now,
      },
    }
  )
  await removeServiceIdFromDoctors(clinicId, doctorIds, sId)
  return true
}
