import { insertAdmin, findAdminByUsername, updateLastLogin, findAdminById, updateAdminPassword, updateAdminProfile } from "./auth.repo"
import type { CreateAdminBody, LoginAdminBody, ChangePasswordBody, UpdateProfileBody } from "./auth.model"
import { mapDocToPublicAdmin } from "./auth.model"
import { conflict, unauthorized, badRequest } from "@/common/errors"
import { signToken } from "@/common/middleware/auth"
import { env } from "@/env"
import { ObjectId } from "mongodb"

/**
 * Create a new platform admin
 */
export async function createAdmin(body: CreateAdminBody) {
  // Check if username already exists
  const existing = await findAdminByUsername(body.username)
  if (existing) {
    throw conflict("Username already exists")
  }

  // Hash password using Bun's bcrypt
  const passwordHash = await hashPassword(body.password)

  // Insert into database
  const doc = await insertAdmin({
    username: body.username.toLowerCase(),
    displayName: body.displayName,
    passwordHash,
  })

  return mapDocToPublicAdmin(doc)
}

/**
 * Login platform admin and return JWT token
 */
export async function loginAdmin(body: LoginAdminBody, clientIP?: string | null) {
  // Find admin by username
  const admin = await findAdminByUsername(body.username)
  if (!admin) {
    throw unauthorized("Invalid username or password")
  }

  // Verify password
  const valid = await verifyPassword(body.password, admin.security.passwordHash)
  if (!valid) {
    throw unauthorized("Invalid username or password")
  }

  // Check if account is active
  if (admin.status !== "active") {
    throw unauthorized("Account is not active")
  }

  // Update last login timestamp and IP
  await updateLastLogin(admin._id, clientIP ?? null)

  // Generate JWT token
  const token = await signToken({
    sub: admin._id.toHexString(),
    username: admin.username,
    role: admin.role,
  })

  return {
    token,
    admin: mapDocToPublicAdmin(admin),
    expiresIn: env.JWT_EXPIRES_IN,
  }
}

/**
 * Change admin password
 */
export async function changeAdminPassword(adminId: string, body: ChangePasswordBody) {
  // Validate admin ID
  if (!ObjectId.isValid(adminId)) {
    throw badRequest("Invalid admin ID")
  }

  const adminObjectId = new ObjectId(adminId)
  const admin = await findAdminById(adminObjectId)

  if (!admin) {
    throw unauthorized("Admin not found")
  }

  // Verify current password
  const validPassword = await verifyPassword(body.currentPassword, admin.security.passwordHash)
  if (!validPassword) {
    throw unauthorized("Current password is incorrect")
  }

  // Hash new password
  const newPasswordHash = await hashPassword(body.newPassword)

  // Update password in database
  await updateAdminPassword(adminObjectId, newPasswordHash)

  return { message: "Password updated successfully" }
}

/**
 * Update admin profile (display name and/or username)
 */
export async function updateAdminProfileService(adminId: string, body: UpdateProfileBody) {
  // Validate admin ID
  if (!ObjectId.isValid(adminId)) {
    throw badRequest("Invalid admin ID")
  }

  const adminObjectId = new ObjectId(adminId)
  const admin = await findAdminById(adminObjectId)

  if (!admin) {
    throw unauthorized("Admin not found")
  }

  // If username is being changed, check if it's already taken
  if (body.username && body.username.toLowerCase() !== admin.username) {
    const existing = await findAdminByUsername(body.username)
    if (existing && existing._id.toHexString() !== adminId) {
      throw conflict("Username already taken")
    }
  }

  // Update profile
  const updated = await updateAdminProfile(adminObjectId, {
    displayName: body.displayName,
    username: body.username,
  })

  if (!updated) {
    throw badRequest("Failed to update profile")
  }

  return mapDocToPublicAdmin(updated)
}

// Hash password using Bun's bcrypt implementation
async function hashPassword(plain: string): Promise<string> {
  return Bun.password.hash(plain, { algorithm: "bcrypt", cost: 10 })
}

// Verify password using Bun's bcrypt implementation
async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return Bun.password.verify(plain, hash, "bcrypt")
}
