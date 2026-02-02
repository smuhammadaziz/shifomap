import { createRemoteJWKSet, jwtVerify } from "jose"
import { ObjectId } from "mongodb"
import {
  insertPatient,
  findPatientByEmail,
  findPatientByGoogleId,
  findPatientByPhone,
  findPatientById,
  updatePatientLastLogin,
  updatePatientProfile,
} from "./patients.repo"
import { logger } from "@/common/logger"
import type {
  AuthGoogleBody,
  AuthPhoneBody,
  CompleteProfileBody,
  UpdatePatientBody,
} from "./patients.model"
import { mapDocToPublicPatient } from "./patients.model"
import { signPatientToken } from "@/common/middleware/auth"
import { unauthorized, badRequest } from "@/common/errors"
import { env } from "@/env"
import type { PatientLanguage } from "./patients.model"

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
)

const DEFAULT_AVATAR = "https://i.pravatar.cc/150?u=default"

export async function authGoogle(body: AuthGoogleBody) {
  if (!env.GOOGLE_CLIENT_ID) {
    throw badRequest("Google sign-in is not configured")
  }
  const { payload } = await jwtVerify(body.idToken, GOOGLE_JWKS, {
    issuer: "https://accounts.google.com",
    audience: env.GOOGLE_CLIENT_ID,
  })
  const googleId = payload.sub as string
  const email = (payload.email as string) ?? null
  const name = (payload.name as string) ?? ""
  const picture = (payload.picture as string) ?? DEFAULT_AVATAR

  let patient = await findPatientByGoogleId(googleId)
  if (!patient && email) {
    patient = await findPatientByEmail(email)
    if (patient) {
      // Link existing account to Google
      const db = (await import("@/db/mongo")).getDb()
      const now = new Date()
      await db.collection("patients").updateOne(
        { _id: patient._id },
        {
          $set: {
            "auth.googleId": googleId,
            "auth.email": email,
            "auth.lastLoginAt": now,
            avatarUrl: picture || patient.avatarUrl,
            fullName: name || patient.fullName,
            "contacts.email": email,
            updatedAt: now,
          },
        }
      )
      patient = await findPatientById(patient._id)
      if (!patient) throw badRequest("Failed to link account")
    }
  }
  if (!patient) {
    patient = await insertPatient({
      fullName: name || "User",
      gender: "male",
      age: null,
      avatarUrl: picture,
      contacts: { phone: "", email, telegram: null },
      status: "active",
      auth: {
        passwordHash: null,
        type: "google",
        googleId,
        email,
        lastLoginAt: new Date(),
      },
      location: { city: "Tashkent" },
      preferences: { language: "uz", notificationsEnabled: true },
    })
  } else {
    await updatePatientLastLogin(patient._id)
    patient = await findPatientById(patient._id)
    if (!patient) throw unauthorized("Patient not found")
  }
  if (patient.status !== "active") {
    throw unauthorized("Account is not active")
  }
  const token = await signPatientToken(patient._id.toHexString())
  return {
    token,
    patient: mapDocToPublicPatient(patient),
    expiresIn: env.JWT_EXPIRES_IN,
  }
}

export async function authPhone(body: AuthPhoneBody, preferredLanguage: PatientLanguage = "uz") {
  logger.info("[patients.service] authPhone start", {
    phone: body.phone,
    preferredLanguage,
  })
  let patient = await findPatientByPhone(body.phone)
  if (!patient) {
    logger.info("[patients.service] authPhone: no existing patient, inserting new", {
      phone: body.phone,
    })
    patient = await insertPatient({
      fullName: "",
      gender: "male",
      age: null,
      avatarUrl: DEFAULT_AVATAR,
      contacts: { phone: body.phone, email: null, telegram: null },
      status: "active",
      auth: {
        passwordHash: null,
        type: "phone",
        lastLoginAt: null,
      },
      location: { city: "Tashkent" },
      preferences: { language: preferredLanguage, notificationsEnabled: true },
    })
    logger.info("[patients.service] authPhone: insertPatient done", {
      patientId: patient._id.toHexString(),
    })
  } else {
    logger.info("[patients.service] authPhone: existing patient found, updating lastLogin", {
      patientId: patient._id.toHexString(),
    })
    await updatePatientLastLogin(patient._id)
    patient = await findPatientById(patient._id)
    if (!patient) throw unauthorized("Patient not found")
  }
  if (patient.status !== "active") {
    logger.warn("[patients.service] authPhone: patient not active", {
      patientId: patient._id.toHexString(),
      status: patient.status,
    })
    throw unauthorized("Account is not active")
  }
  const token = await signPatientToken(patient._id.toHexString())
  const needsProfile = !patient.fullName || patient.fullName === ""
  logger.info("[patients.service] authPhone success", {
    patientId: patient._id.toHexString(),
    needsProfile,
  })
  return {
    token,
    patient: mapDocToPublicPatient(patient),
    expiresIn: env.JWT_EXPIRES_IN,
    needsProfile,
  }
}

export async function getMe(patientId: string) {
  if (!ObjectId.isValid(patientId)) throw badRequest("Invalid patient ID")
  const patient = await findPatientById(new ObjectId(patientId))
  if (!patient) throw unauthorized("Patient not found")
  return mapDocToPublicPatient(patient)
}

export async function completeProfile(patientId: string, body: CompleteProfileBody) {
  if (!ObjectId.isValid(patientId)) throw badRequest("Invalid patient ID")
  const patient = await findPatientById(new ObjectId(patientId))
  if (!patient) throw unauthorized("Patient not found")
  const updated = await updatePatientProfile(new ObjectId(patientId), {
    fullName: body.fullName,
    gender: body.gender,
    age: body.age,
  })
  if (!updated) throw badRequest("Failed to update profile")
  return mapDocToPublicPatient(updated)
}

export async function updateMe(patientId: string, body: UpdatePatientBody) {
  if (!ObjectId.isValid(patientId)) throw badRequest("Invalid patient ID")
  const patient = await findPatientById(new ObjectId(patientId))
  if (!patient) throw unauthorized("Patient not found")
  const updates: Parameters<typeof updatePatientProfile>[1] = {}
  if (body.fullName !== undefined) updates.fullName = body.fullName
  if (body.gender !== undefined) updates.gender = body.gender
  if (body.age !== undefined) updates.age = body.age
  if (body.avatarUrl !== undefined) updates.avatarUrl = body.avatarUrl
  if (body.contacts?.email !== undefined) updates["contacts.email"] = body.contacts.email
  if (body.location?.city !== undefined) updates["location.city"] = body.location.city
  if (body.preferences?.language !== undefined)
    updates["preferences.language"] = body.preferences.language
  if (body.preferences?.notificationsEnabled !== undefined)
    updates["preferences.notificationsEnabled"] = body.preferences.notificationsEnabled
  const updated = await updatePatientProfile(new ObjectId(patientId), updates)
  if (!updated) throw badRequest("Failed to update profile")
  return mapDocToPublicPatient(updated)
}
