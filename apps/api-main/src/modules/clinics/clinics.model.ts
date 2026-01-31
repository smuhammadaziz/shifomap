import { z } from "zod"
import type { ObjectId } from "mongodb"

/**
 * MongoDB document shape for collection "clinics"
 */
export interface ClinicDoc {
  _id: ObjectId
  clinicDisplayName: string
  clinicUniqueName: string
  status: "active" | "inactive" | "suspended"
  category: string[]
  branding: {
    logoUrl: string | null
    coverUrl: string | null
  }
  contacts: {
    phone: string | null
    email: string | null
    telegram: string | null
  }
  description: {
    short: string | null
    full: string | null
  }
  plan: {
    type: "starter" | "pro"
    startedAt: Date
    expiresAt: Date | null
    limits: {
      maxBranches: number
      maxServices: number
      maxAdmins: number
    }
  }
  ranking: {
    score: number
    boosted: boolean
    updatedAt: Date
  }
  rating: {
    avg: number
    count: number
  }
  owners: ClinicOwner[]
  branches: ClinicBranch[]
  services: ClinicService[]
  doctors: ClinicDoctor[]
  stats: {
    branchesCount: number
    servicesCount: number
    doctorsCount: number
    adminsCount: number
    bookingsTotal: number
    completedBookings: number
    updatedAt: Date
  }
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export interface ClinicOwner {
  _id: ObjectId
  adminId: ObjectId
  role: "owner" | "admin"
  userName: string
  displayName: string
  security: {
    passwordHash: string
    passwordUpdatedAt: Date
    lastLoginAt: Date | null
    lastLoginIP: string | null
  }
  addedAt: Date
  removedAt: Date | null
  isActive: boolean
}

export interface ClinicBranch {
  _id: ObjectId
  name: string
  phone: string
  address: {
    city: string
    street: string
    geo: { lat: number; lng: number }
  }
  workingHours: Array<{
    day: number
    from: string
    to: string
  }>
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ClinicService {
  _id: ObjectId
  title: string
  description: string
  category: string
  durationMin: number
  price: {
    amount: number
    currency: string
  }
  branchIds: ObjectId[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ClinicDoctor {
  _id: ObjectId
  fullName: string
  username: string
  security: {
    passwordHash: string
    passwordUpdatedAt: Date
    lastLoginAt: Date | null
    lastLoginIP: string | null
  }
  specialty: string
  bio: string
  avatarUrl: string | null
  serviceIds: ObjectId[]
  branchIds: ObjectId[] // single branch: one element
  isActive: boolean
  schedule: {
    timezone: string
    weekly: Array<{
      day: number
      from: string
      to: string
      lunchFrom?: string
      lunchTo?: string
    }>
  }
  createdAt: Date
  updatedAt: Date
}

// Validation schema for creating clinic
export const createClinicBodySchema = z.object({
  clinicDisplayName: z.string().min(2, "Clinic display name must be at least 2 characters").max(128),
  clinicUniqueName: z
    .string()
    .min(2, "Clinic unique name must be at least 2 characters")
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, "Unique name can only contain letters, numbers, _ and -"),
  ownerUserName: z
    .string()
    .min(2, "Owner username must be at least 2 characters")
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, _ and -"),
  ownerDisplayName: z.string().min(1, "Owner display name is required").max(128),
  ownerPassword: z.string().min(8, "Owner password must be at least 8 characters"),
  plan: z.enum(["starter", "pro"]).default("starter"),
})

// Validation schema for clinic owner login
export const loginClinicOwnerBodySchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
})

// Validation schema for changing plan
export const changePlanBodySchema = z.object({
  plan: z.enum(["starter", "pro"]),
})

// Create branch body (for clinic owner)
const workingHourSchema = z.object({
  day: z.number().min(1).max(7),
  from: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
  to: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
})
export const createBranchBodySchema = z.object({
  name: z.string().min(1, "Branch name is required").max(128),
  phone: z.string().min(1, "Phone is required").max(32),
  address: z.object({
    city: z.string().min(1, "City is required").max(64),
    street: z.string().min(1, "Street is required").max(256),
    geo: z.object({
      lat: z.number(),
      lng: z.number(),
    }),
  }),
  workingHours: z.array(workingHourSchema).min(0).max(7),
})
export type CreateBranchBody = z.infer<typeof createBranchBodySchema>

// Create doctor body (clinic owner; requires existing branch)
export const createDoctorBodySchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(128),
  username: z
    .string()
    .min(2, "Username must be at least 2 characters")
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, _ and -"),
  specialty: z.string().min(1, "Specialty is required").max(128),
  bio: z.string().max(512).default(""),
  password: z.string().min(8, "Password must be at least 8 characters"),
  branchId: z.string().min(1, "Branch is required"),
})
export type CreateDoctorBody = z.infer<typeof createDoctorBodySchema>

// Update doctor body (partial)
export const updateDoctorBodySchema = z.object({
  fullName: z.string().min(1).max(128).optional(),
  username: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  specialty: z.string().min(1).max(128).optional(),
  bio: z.string().max(512).optional(),
  password: z.string().min(8).optional(),
  branchId: z.string().min(1).optional(),
})
export type UpdateDoctorBody = z.infer<typeof updateDoctorBodySchema>

// Doctor login body (same shape as owner login)
export const loginDoctorBodySchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
})
export type LoginDoctorBody = z.infer<typeof loginDoctorBodySchema>

// Doctor self-update profile (by doctor)
export const updateDoctorByDoctorBodySchema = z.object({
  fullName: z.string().min(1).max(128).optional(),
  username: z.string().min(2).max(64).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  specialty: z.string().min(1).max(128).optional(),
  bio: z.string().max(512).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  password: z.string().min(8).optional(),
})
export type UpdateDoctorByDoctorBody = z.infer<typeof updateDoctorByDoctorBodySchema>

// Doctor schedule (weekly with optional lunch per day)
const scheduleDaySchema = z.object({
  day: z.number().min(1).max(7),
  from: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
  to: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
  lunchFrom: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  lunchTo: z.string().regex(/^\d{2}:\d{2}$/).optional(),
})
export const updateDoctorScheduleBodySchema = z.object({
  timezone: z.string().min(1).max(64).default("Asia/Tashkent"),
  weekly: z.array(scheduleDaySchema).min(0).max(7),
})
export type UpdateDoctorScheduleBody = z.infer<typeof updateDoctorScheduleBodySchema>

export type CreateClinicBody = z.infer<typeof createClinicBodySchema>
export type LoginClinicOwnerBody = z.infer<typeof loginClinicOwnerBodySchema>
export type ChangePlanBody = z.infer<typeof changePlanBodySchema>

/**
 * Map clinic document to public format (without sensitive data)
 */
export function mapDocToPublicClinic(doc: ClinicDoc) {
  return {
    _id: doc._id.toHexString(),
    clinicDisplayName: doc.clinicDisplayName,
    clinicUniqueName: doc.clinicUniqueName,
    status: doc.status,
    category: doc.category,
    plan: {
      type: doc.plan.type,
      startedAt: doc.plan.startedAt.toISOString(),
      expiresAt: doc.plan.expiresAt?.toISOString() ?? null,
      limits: doc.plan.limits,
    },
    ranking: {
      score: doc.ranking.score,
      boosted: doc.ranking.boosted,
      updatedAt: doc.ranking.updatedAt.toISOString(),
    },
    rating: doc.rating,
    owners: doc.owners.map((o) => ({
      _id: o._id.toHexString(),
      role: o.role,
      userName: o.userName,
      displayName: o.displayName,
      addedAt: o.addedAt.toISOString(),
      isActive: o.isActive,
      lastLoginAt: o.security.lastLoginAt?.toISOString() ?? null,
    })),
    stats: {
      ...doc.stats,
      updatedAt: doc.stats.updatedAt.toISOString(),
    },
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    deletedAt: doc.deletedAt?.toISOString() ?? null,
  }
}

/**
 * Map clinic document to detailed format (includes all nested data)
 */
export function mapDocToDetailedClinic(doc: ClinicDoc) {
  return {
    ...mapDocToPublicClinic(doc),
    branding: doc.branding,
    contacts: doc.contacts,
    description: doc.description,
    branches: doc.branches.map((b) => ({
      ...b,
      _id: b._id.toHexString(),
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    })),
    services: doc.services.map((s) => ({
      ...s,
      _id: s._id.toHexString(),
      branchIds: s.branchIds.map((id) => id.toHexString()),
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    doctors: doc.doctors.map((d) => ({
      _id: d._id.toHexString(),
      fullName: d.fullName,
      username: d.username,
      specialty: d.specialty,
      bio: d.bio,
      avatarUrl: d.avatarUrl,
      serviceIds: (d.serviceIds ?? []).map((id) => id.toHexString()),
      branchIds: d.branchIds.map((id) => id.toHexString()),
      isActive: d.isActive,
      schedule: d.schedule,
      lastLoginAt: d.security.lastLoginAt?.toISOString() ?? null,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    })),
  }
}
