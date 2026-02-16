import { z } from "zod"
import type { ObjectId } from "mongodb"

export type PatientStatus = "active" | "blocked" | "deleted"
export type AuthType = "google" | "phone"
export type PatientLanguage = "uz" | "ru" | "en"

/**
 * MongoDB document shape for collection "patients"
 */
export interface PatientDoc {
  _id: ObjectId
  fullName: string
  gender: "male" | "female"
  age: number | null
  avatarUrl: string
  contacts: {
    phone: string
    email: string | null
    telegram: string | null
  }
  status: PatientStatus
  auth: {
    passwordHash: string | null
    type: AuthType
    googleId?: string | null
    email?: string | null
    lastLoginAt?: Date | null
  }
  location: {
    city: string
  }
  preferences: {
    language: PatientLanguage
    notificationsEnabled: boolean
  }
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

// Validation: Google auth body (ID token from client)
export const authGoogleBodySchema = z.object({
  idToken: z.string().min(1, "ID token is required"),
})

// Validation: Phone auth body
export const authPhoneBodySchema = z.object({
  phone: z.string().regex(/^\+998\d{9}$/, "Phone must be +998 followed by 9 digits"),
})

// Validation: Phone + password auth (login or signup: one field checks or creates password)
export const authPhonePasswordBodySchema = z.object({
  phone: z.string().regex(/^\+998\d{9}$/, "Phone must be +998 followed by 9 digits"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

// Validation: Complete profile after phone signup
export const completeProfileBodySchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(128),
  gender: z.enum(["male", "female"]),
  age: z.number().int().min(1).max(150).nullable(),
})

// Validation: Update profile (partial)
export const updatePatientBodySchema = z.object({
  fullName: z.string().min(1).max(128).optional(),
  gender: z.enum(["male", "female"]).optional(),
  age: z.number().int().min(1).max(150).nullable().optional(),
  avatarUrl: z.string().url().optional(),
  contacts: z
    .object({
      email: z.string().email().nullable().optional(),
      phone: z.string().regex(/^\+998\d{9}$/).optional(),
      telegram: z.string().max(64).nullable().optional(),
    })
    .optional(),
  location: z.object({ city: z.string().max(64).optional() }).optional(),
  preferences: z
    .object({
      language: z.enum(["uz", "ru", "en"]).optional(),
      notificationsEnabled: z.boolean().optional(),
    })
    .optional(),
})

export const changePatientPasswordBodySchema = z.object({
  oldPassword: z.string().min(8, "Password must be at least 8 characters"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
})

export type ChangePatientPasswordBody = z.infer<typeof changePatientPasswordBodySchema>

export type AuthGoogleBody = z.infer<typeof authGoogleBodySchema>
export type AuthPhoneBody = z.infer<typeof authPhoneBodySchema>
export type AuthPhonePasswordBody = z.infer<typeof authPhonePasswordBodySchema>
export type CompleteProfileBody = z.infer<typeof completeProfileBodySchema>
export type UpdatePatientBody = z.infer<typeof updatePatientBodySchema>

const DEFAULT_AVATAR = "https://media.istockphoto.com/id/1214284287/vector/anonymous-gender-neutral-face-avatar-incognito-head-silhouette.jpg?s=612x612&w=0&k=20&c=z33R0MN3yX_-qIcIe_oJqz4QFuH0NwvWGN8TZZW48sk="

export function mapDocToPublicPatient(doc: PatientDoc) {
  return {
    _id: doc._id.toHexString(),
    fullName: doc.fullName,
    gender: doc.gender,
    age: doc.age,
    avatarUrl: doc.avatarUrl || DEFAULT_AVATAR,
    contacts: doc.contacts,
    status: doc.status,
    location: doc.location,
    preferences: doc.preferences,
    auth: { type: doc.auth.type },
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}
