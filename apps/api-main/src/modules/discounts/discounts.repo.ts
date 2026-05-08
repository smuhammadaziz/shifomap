import { ObjectId } from "mongodb"
import { getDb, DISCOUNTS_COLLECTION } from "@/db/mongo"
import type { DiscountDoc } from "./discounts.model"

export async function insertDiscount(doc: Omit<DiscountDoc, "_id">): Promise<DiscountDoc> {
  const db = getDb()
  const res = await db.collection<DiscountDoc>(DISCOUNTS_COLLECTION).insertOne(doc as DiscountDoc)
  const created = await db.collection<DiscountDoc>(DISCOUNTS_COLLECTION).findOne({ _id: res.insertedId })
  if (!created) throw new Error("Insert discount failed")
  return created
}

export async function findDiscountByIdForClinic(id: ObjectId, clinicId: ObjectId): Promise<DiscountDoc | null> {
  const db = getDb()
  return db.collection<DiscountDoc>(DISCOUNTS_COLLECTION).findOne({ _id: id, clinicId, deletedAt: null })
}

export async function listDiscountsByClinic(clinicId: ObjectId, limit = 200): Promise<DiscountDoc[]> {
  const db = getDb()
  return db
    .collection<DiscountDoc>(DISCOUNTS_COLLECTION)
    .find({ clinicId, deletedAt: null })
    .sort({ expiresAt: -1 })
    .limit(limit)
    .toArray()
}

export async function listActiveDiscounts(limit: number): Promise<DiscountDoc[]> {
  const db = getDb()
  const now = new Date()
  return db
    .collection<DiscountDoc>(DISCOUNTS_COLLECTION)
    .find({ deletedAt: null, expiresAt: { $gt: now } })
    .sort({ expiresAt: 1 })
    .limit(limit)
    .toArray()
}

/**
 * Returns the currently active (non-expired, non-deleted) discount for a
 * service if one exists. If multiple are active, the one with the lowest
 * discounted price is returned (best deal for the user).
 */
export async function findActiveDiscountForService(serviceId: ObjectId): Promise<DiscountDoc | null> {
  const db = getDb()
  const now = new Date()
  return db
    .collection<DiscountDoc>(DISCOUNTS_COLLECTION)
    .find({ serviceId, deletedAt: null, expiresAt: { $gt: now } })
    .sort({ discountedAmount: 1 })
    .limit(1)
    .next()
}

/**
 * Bulk lookup: returns active discounts for multiple service ids keyed by
 * service id hex string. Used to enrich service lists with discount info.
 */
export async function findActiveDiscountsForServices(
  serviceIds: ObjectId[],
): Promise<Map<string, DiscountDoc>> {
  const out = new Map<string, DiscountDoc>()
  if (serviceIds.length === 0) return out
  const db = getDb()
  const now = new Date()
  const docs = await db
    .collection<DiscountDoc>(DISCOUNTS_COLLECTION)
    .find({ serviceId: { $in: serviceIds }, deletedAt: null, expiresAt: { $gt: now } })
    .sort({ discountedAmount: 1 })
    .toArray()
  for (const d of docs) {
    const key = d.serviceId.toHexString()
    if (!out.has(key)) out.set(key, d)
  }
  return out
}

export async function updateDiscount(id: ObjectId, clinicId: ObjectId, patch: Partial<DiscountDoc>): Promise<DiscountDoc | null> {
  const db = getDb()
  const now = new Date()
  const res = await db.collection<DiscountDoc>(DISCOUNTS_COLLECTION).findOneAndUpdate(
    { _id: id, clinicId, deletedAt: null },
    { $set: { ...patch, updatedAt: now } },
    { returnDocument: "after" }
  )
  return res
}

export async function softDeleteDiscount(id: ObjectId, clinicId: ObjectId): Promise<boolean> {
  const db = getDb()
  const r = await db
    .collection<DiscountDoc>(DISCOUNTS_COLLECTION)
    .updateOne({ _id: id, clinicId, deletedAt: null }, { $set: { deletedAt: new Date(), updatedAt: new Date() } })
  return r.modifiedCount > 0
}
