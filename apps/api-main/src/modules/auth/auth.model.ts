import { z } from "zod"
import type { ObjectId } from "mongodb"
import { ADMIN_ROLE, PERMISSION_ALL } from "@/shared/constants"

/**
 * MongoDB document shape for collection "platform_admin"
 * This matches your schema exactly:
 * - _id: ObjectId
 * - username, displayName, status
 * - role: "SUPER_ADMIN_SHIFO"
 * - access.permissions: ["ALL"]
 * - security: { passwordHash, passwordUpdatedAt, lastLoginAt, lastLoginIP }
 * - createdAt, updatedAt, deletedAt
 */
export interface PlatformAdminDoc {
  _id: ObjectId
  username: string
  displayName: string
  status: string
  role: typeof ADMIN_ROLE
  access: {
    permissions: [typeof PERMISSION_ALL]
  }
  security: {
    passwordHash: string
    passwordUpdatedAt: Date
    lastLoginAt: Date | null
    lastLoginIP: string | null
  }
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

// Validation schema for creating admin
export const createAdminBodySchema = z.object({
  username: z
    .string()
    .min(2, "Username must be at least 2 characters")
    .max(64, "Username too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, _ and -"),
  displayName: z.string().min(1, "Display name is required").max(128, "Display name too long"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

// Validation schema for login
export const loginAdminBodySchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
})

// Validation schema for changing password
export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
})

// Validation schema for updating profile (name and username)
export const updateProfileBodySchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(128, "Display name too long").optional(),
  username: z
    .string()
    .min(2, "Username must be at least 2 characters")
    .max(64, "Username too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, _ and -")
    .optional(),
})

export type CreateAdminBody = z.infer<typeof createAdminBodySchema>
export type LoginAdminBody = z.infer<typeof loginAdminBodySchema>
export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>
export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>

/**
 * Map database document to public admin object (without sensitive data)
 */
export function mapDocToPublicAdmin(doc: PlatformAdminDoc) {
  return {
    _id: doc._id.toHexString(),
    username: doc.username,
    displayName: doc.displayName,
    status: doc.status,
    role: doc.role,
    access: doc.access,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}
