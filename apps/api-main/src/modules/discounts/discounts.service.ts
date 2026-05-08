import { ObjectId } from "mongodb"
import { badRequest, notFound, unauthorized } from "@/common/errors"
import { findClinicById } from "@/modules/clinics/clinics.repo"
import { resolveClinicIdForOwner } from "@/modules/clinics/clinics.service"
import {
  insertDiscount,
  findDiscountByIdForClinic,
  listDiscountsByClinic,
  listActiveDiscounts,
  updateDiscount,
  softDeleteDiscount,
} from "./discounts.repo"
import type { DiscountDoc } from "./discounts.model"

function clinicCity(clinic: NonNullable<Awaited<ReturnType<typeof findClinicById>>>): string {
  const b = clinic.branches?.find((x) => x.isActive) ?? clinic.branches?.[0]
  const city = (b?.address?.city ?? "").trim().toLowerCase()
  return city
}

function serviceOriginalPrice(service: {
  price?: { amount?: number | null; minAmount?: number | null; maxAmount?: number | null; currency?: string }
}): {
  amount: number
  currency: string
} {
  const p = service.price ?? {}
  const currency = p.currency ?? "UZS"
  const candidate = p.amount ?? p.maxAmount ?? p.minAmount ?? null
  if (candidate == null || Number.isNaN(candidate)) {
    throw badRequest("Service has no price; cannot create discount")
  }
  return { amount: candidate, currency }
}

export type PublicDiscountRow = {
  _id: string
  clinicId: string
  clinicName: string
  serviceId: string
  serviceTitle: string
  originalAmount: number
  discountedAmount: number
  currency: string
  expiresAt: string
  posterUrl: string | null
  title: string | null
  percentOff: number
}

function mapDocToPublic(doc: DiscountDoc, clinicName: string, serviceTitle: string): PublicDiscountRow {
  const pct =
    doc.originalAmount > 0
      ? Math.max(0, Math.min(100, Math.round((1 - doc.discountedAmount / doc.originalAmount) * 100)))
      : 0
  return {
    _id: doc._id.toHexString(),
    clinicId: doc.clinicId.toHexString(),
    clinicName,
    serviceId: doc.serviceId.toHexString(),
    serviceTitle,
    originalAmount: doc.originalAmount,
    discountedAmount: doc.discountedAmount,
    currency: doc.currency,
    expiresAt: doc.expiresAt.toISOString(),
    posterUrl: doc.posterUrl,
    title: doc.title,
    percentOff: pct,
  }
}

export async function listPublicDiscounts(city: string | undefined, limit: number): Promise<PublicDiscountRow[]> {
  const cap = Math.min(50, Math.max(1, limit))
  // Pull a generous pool so we can sort by city-match and still fill the cap.
  const docs = await listActiveDiscounts(cap * 6)
  const needle = (city ?? "").trim().toLowerCase()

  type Row = PublicDiscountRow & { __cityMatch: number; __expiresAt: number }
  const rows: Row[] = []

  // Cache clinic lookups so we don't refetch the same clinic for multiple discounts.
  const clinicCache = new Map<string, Awaited<ReturnType<typeof findClinicById>>>()

  for (const d of docs) {
    const clinicKey = d.clinicId.toHexString()
    let clinic = clinicCache.get(clinicKey)
    if (clinic === undefined) {
      clinic = await findClinicById(d.clinicId)
      clinicCache.set(clinicKey, clinic)
    }
    if (!clinic || clinic.status !== "active" || clinic.deletedAt) continue
    const svc = (clinic.services ?? []).find((s) => s._id.equals(d.serviceId) && s.isActive !== false)
    if (!svc) continue
    const c = clinicCity(clinic)
    const matches = needle && c ? c.includes(needle) || needle.includes(c) ? 1 : 0 : 0
    rows.push({
      ...mapDocToPublic(d, clinic.clinicDisplayName ?? "Clinic", svc.title),
      __cityMatch: matches,
      __expiresAt: d.expiresAt.getTime(),
    })
  }

  // Always show every active discount; if a city was provided, surface local
  // ones first, then the rest by soonest-expiring.
  rows.sort((a, b) => {
    if (a.__cityMatch !== b.__cityMatch) return b.__cityMatch - a.__cityMatch
    return a.__expiresAt - b.__expiresAt
  })

  return rows.slice(0, cap).map(({ __cityMatch: _m, __expiresAt: _e, ...row }) => row)
}

export async function listMyDiscounts(auth: { role?: string; clinicId?: string; sub: string }) {
  const clinicIdStr = await resolveClinicIdForOwner(auth)
  if (!clinicIdStr) throw unauthorized("Clinic owner only")
  const clinicId = new ObjectId(clinicIdStr)
  const clinic = await findClinicById(clinicId)
  if (!clinic) throw notFound("Clinic not found")
  const list = await listDiscountsByClinic(clinicId)
  const now = new Date()
  return list.map((d) => {
    const svc = (clinic.services ?? []).find((s) => s._id.equals(d.serviceId))
    return {
      ...mapDocToPublic(d, clinic.clinicDisplayName ?? "", svc?.title ?? "—"),
      isExpired: d.expiresAt <= now,
    }
  })
}

export async function createDiscount(
  auth: { role?: string; clinicId?: string; sub: string },
  body: {
    serviceId: string
    discountedAmount: number
    expiresAt: string
    posterUrl?: string | null
    title?: string | null
  }
) {
  const clinicIdStr = await resolveClinicIdForOwner(auth)
  if (!clinicIdStr) throw unauthorized("Clinic owner only")
  const clinicId = new ObjectId(clinicIdStr)
  const clinic = await findClinicById(clinicId)
  if (!clinic) throw notFound("Clinic not found")
  if (!ObjectId.isValid(body.serviceId)) throw badRequest("Invalid serviceId")
  const serviceId = new ObjectId(body.serviceId)
  const svc = (clinic.services ?? []).find((s) => s._id.equals(serviceId) && s.isActive !== false)
  if (!svc) throw badRequest("Service not found on this clinic")
  const { amount, currency } = serviceOriginalPrice(svc as any)
  if (body.discountedAmount >= amount) throw badRequest("Discounted price must be lower than original")
  const exp = new Date(body.expiresAt)
  if (Number.isNaN(exp.getTime())) throw badRequest("Invalid expiresAt")
  if (exp <= new Date()) throw badRequest("expiresAt must be in the future")

  const now = new Date()
  const doc: Omit<DiscountDoc, "_id"> = {
    clinicId,
    serviceId,
    originalAmount: amount,
    discountedAmount: body.discountedAmount,
    currency,
    expiresAt: exp,
    posterUrl: body.posterUrl ?? null,
    title: body.title ?? null,
    createdBy: new ObjectId(auth.sub),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
  const created = await insertDiscount(doc)
  return mapDocToPublic(created, clinic.clinicDisplayName ?? "", svc.title)
}

export async function patchDiscount(
  auth: { role?: string; clinicId?: string; sub: string },
  id: string,
  body: { discountedAmount?: number; expiresAt?: string; posterUrl?: string | null; title?: string | null }
) {
  const clinicIdStr = await resolveClinicIdForOwner(auth)
  if (!clinicIdStr) throw unauthorized("Clinic owner only")
  if (!ObjectId.isValid(id)) throw badRequest("Invalid id")
  const clinicId = new ObjectId(clinicIdStr)
  const _id = new ObjectId(id)
  const existing = await findDiscountByIdForClinic(_id, clinicId)
  if (!existing) throw notFound("Discount not found")
  const patch: Partial<DiscountDoc> = {}
  if (body.discountedAmount != null) {
    if (body.discountedAmount >= existing.originalAmount) throw badRequest("Discounted price must be lower than original")
    patch.discountedAmount = body.discountedAmount
  }
  if (body.expiresAt != null) {
    const exp = new Date(body.expiresAt)
    if (Number.isNaN(exp.getTime())) throw badRequest("Invalid expiresAt")
    patch.expiresAt = exp
  }
  if (body.posterUrl !== undefined) patch.posterUrl = body.posterUrl
  if (body.title !== undefined) patch.title = body.title
  const updated = await updateDiscount(_id, clinicId, patch)
  if (!updated) throw notFound("Discount not found")
  const clinic = await findClinicById(clinicId)
  const svc = clinic?.services?.find((s) => s._id.equals(updated.serviceId))
  return mapDocToPublic(updated, clinic?.clinicDisplayName ?? "", svc?.title ?? "—")
}

export async function removeDiscount(auth: { role?: string; clinicId?: string; sub: string }, id: string) {
  const clinicIdStr = await resolveClinicIdForOwner(auth)
  if (!clinicIdStr) throw unauthorized("Clinic owner only")
  if (!ObjectId.isValid(id)) throw badRequest("Invalid id")
  const ok = await softDeleteDiscount(new ObjectId(id), new ObjectId(clinicIdStr))
  if (!ok) throw notFound("Discount not found")
  return { success: true }
}
