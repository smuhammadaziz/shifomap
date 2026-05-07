import { Elysia } from "elysia"
import { ObjectId } from "mongodb"
import { getDb } from "@/db/mongo"
import { requireAuth } from "@/common/middleware/auth"
import { unauthorized } from "@/common/errors"

type PharmacyDoc = {
  _id: ObjectId
  name: string
  phone?: string | null
  address?: {
    city?: string | null
    street?: string | null
    geo?: { type: "Point"; coordinates: [number, number] }
  }
  workingHours?: string | null
  photoUrl?: string | null
  isActive?: boolean
  createdAt?: Date
  updatedAt?: Date
  deletedAt?: Date | null
}

function isPlatformAdmin(role?: string) {
  return role === "SUPER_ADMIN_SHIFO" || role === "admin"
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export const pharmaciesRoutes = new Elysia({ prefix: "/pharmacies" }).get(
  "/public",
  async ({ query, set }) => {
    const lat = parseFloat((query.lat as string) || "")
    const lng = parseFloat((query.lng as string) || "")
    const limit = Math.min(30, Math.max(1, parseInt((query.limit as string) || "10", 10) || 10))
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      set.status = 400
      return { success: false, error: "lat and lng are required" }
    }

    const db = getDb()
    const col = db.collection<PharmacyDoc>("pharmacies")

    try {
      const rows = await col
        .aggregate<{
          _id: ObjectId
          name: string
          address?: { city?: string | null; street?: string | null; geo?: { coordinates: [number, number] } }
          photoUrl?: string | null
          dist?: { calculated?: number }
        }>([
          {
            $geoNear: {
              near: { type: "Point", coordinates: [lng, lat] },
              distanceField: "dist.calculated",
              spherical: true,
              query: { deletedAt: null, $or: [{ isActive: true }, { isActive: { $exists: false } }] },
              maxDistance: 100000,
            },
          },
          { $limit: limit },
        ])
        .toArray()

      set.status = 200
      return {
        success: true,
        data: {
          items: rows.map((r) => ({
            id: r._id.toHexString(),
            name: r.name,
            city: r.address?.city ?? "",
            street: r.address?.street ?? "",
            lat: r.address?.geo?.coordinates?.[1] ?? 0,
            lng: r.address?.geo?.coordinates?.[0] ?? 0,
            photoUrl: r.photoUrl ?? null,
            distanceM: Math.round(r.dist?.calculated ?? 0),
          })),
          limit,
        },
      }
    } catch {
      const fallback = await col
        .find({ deletedAt: null, $or: [{ isActive: true }, { isActive: { $exists: false } }] })
        .limit(500)
        .toArray()
      const mapped = fallback
        .map((r) => {
          const p = r.address?.geo?.coordinates
          if (!p || p.length < 2) return null
          const d = haversineMeters(lat, lng, p[1], p[0])
          return {
            id: r._id.toHexString(),
            name: r.name,
            city: r.address?.city ?? "",
            street: r.address?.street ?? "",
            lat: p[1],
            lng: p[0],
            photoUrl: r.photoUrl ?? null,
            distanceM: Math.round(d),
          }
        })
        .filter(Boolean)
        .sort((a, b) => (a?.distanceM ?? 0) - (b?.distanceM ?? 0))
        .slice(0, limit)

      set.status = 200
      return { success: true, data: { items: mapped, limit } }
    }
  }
)
  .use(requireAuth)
  .get("/admin", async ({ auth, set }) => {
    if (!isPlatformAdmin(auth.role)) throw unauthorized("Admin only")
    const db = getDb()
    const col = db.collection<PharmacyDoc>("pharmacies")
    const items = await col
      .find({ deletedAt: null })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(1000)
      .toArray()
    set.status = 200
    return {
      success: true,
      data: {
        items: items.map((r) => ({
          id: r._id.toHexString(),
          name: r.name,
          phone: r.phone ?? null,
          city: r.address?.city ?? "",
          street: r.address?.street ?? "",
          lat: r.address?.geo?.coordinates?.[1] ?? null,
          lng: r.address?.geo?.coordinates?.[0] ?? null,
          workingHours: r.workingHours ?? null,
          photoUrl: r.photoUrl ?? null,
          isActive: r.isActive !== false,
        })),
      },
    }
  })
  .post("/admin", async ({ auth, body, set }) => {
    if (!isPlatformAdmin(auth.role)) throw unauthorized("Admin only")
    const b = body as {
      name?: string
      phone?: string | null
      city?: string
      street?: string
      lat?: number
      lng?: number
      workingHours?: string | null
      photoUrl?: string | null
      isActive?: boolean
    }
    const name = String(b.name ?? "").trim()
    const city = String(b.city ?? "").trim()
    const street = String(b.street ?? "").trim()
    const lat = Number(b.lat)
    const lng = Number(b.lng)
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      set.status = 400
      return { success: false, error: "name, lat, lng are required" }
    }
    const now = new Date()
    const db = getDb()
    const col = db.collection<PharmacyDoc>("pharmacies")
    const doc: PharmacyDoc = {
      _id: new ObjectId(),
      name,
      phone: b.phone?.trim() || null,
      address: {
        city,
        street,
        geo: { type: "Point", coordinates: [lng, lat] },
      },
      workingHours: b.workingHours?.trim() || null,
      photoUrl: b.photoUrl?.trim() || null,
      isActive: b.isActive !== false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }
    await col.insertOne(doc)
    await col.createIndex({ "address.geo": "2dsphere" })
    set.status = 201
    return { success: true, data: { id: doc._id.toHexString() } }
  })
  .patch("/admin/:id", async ({ auth, params, body, set }) => {
    if (!isPlatformAdmin(auth.role)) throw unauthorized("Admin only")
    if (!ObjectId.isValid(params.id)) {
      set.status = 400
      return { success: false, error: "Invalid id" }
    }
    const b = body as {
      name?: string
      phone?: string | null
      city?: string
      street?: string
      lat?: number
      lng?: number
      workingHours?: string | null
      photoUrl?: string | null
      isActive?: boolean
    }
    const patch: Record<string, unknown> = { updatedAt: new Date() }
    if (b.name !== undefined) patch.name = String(b.name).trim()
    if (b.phone !== undefined) patch.phone = b.phone?.trim() || null
    if (b.city !== undefined) patch["address.city"] = String(b.city).trim()
    if (b.street !== undefined) patch["address.street"] = String(b.street).trim()
    if (b.workingHours !== undefined) patch.workingHours = b.workingHours?.trim() || null
    if (b.photoUrl !== undefined) patch.photoUrl = b.photoUrl?.trim() || null
    if (b.isActive !== undefined) patch.isActive = !!b.isActive
    if (b.lat !== undefined && b.lng !== undefined && Number.isFinite(Number(b.lat)) && Number.isFinite(Number(b.lng))) {
      patch["address.geo"] = { type: "Point", coordinates: [Number(b.lng), Number(b.lat)] }
    }
    const db = getDb()
    const col = db.collection<PharmacyDoc>("pharmacies")
    const res = await col.updateOne({ _id: new ObjectId(params.id), deletedAt: null }, { $set: patch })
    if (res.matchedCount === 0) {
      set.status = 404
      return { success: false, error: "Not found" }
    }
    set.status = 200
    return { success: true, data: { id: params.id } }
  })
  .delete("/admin/:id", async ({ auth, params, set }) => {
    if (!isPlatformAdmin(auth.role)) throw unauthorized("Admin only")
    if (!ObjectId.isValid(params.id)) {
      set.status = 400
      return { success: false, error: "Invalid id" }
    }
    const db = getDb()
    const col = db.collection<PharmacyDoc>("pharmacies")
    const res = await col.updateOne({ _id: new ObjectId(params.id), deletedAt: null }, { $set: { deletedAt: new Date(), updatedAt: new Date() } })
    if (res.matchedCount === 0) {
      set.status = 404
      return { success: false, error: "Not found" }
    }
    set.status = 200
    return { success: true, data: { id: params.id } }
  })
  .post("/admin/seed", async ({ auth, set }) => {
    if (!isPlatformAdmin(auth.role)) throw unauthorized("Admin only")
    const db = getDb()
    const col = db.collection<PharmacyDoc>("pharmacies")
    const count = await col.countDocuments({ deletedAt: null })
    if (count >= 10) {
      set.status = 200
      return { success: true, data: { inserted: 0, reason: "already_has_data" } }
    }
    const baseLat = 41.311081
    const baseLng = 69.240562
    const now = new Date()
    const docs: PharmacyDoc[] = Array.from({ length: 12 }).map((_, i) => {
      const lat = baseLat + (Math.random() - 0.5) * 0.12
      const lng = baseLng + (Math.random() - 0.5) * 0.12
      return {
        _id: new ObjectId(),
        name: `Apteka ${i + 1}`,
        phone: null,
        address: {
          city: "Tashkent",
          street: `Street ${i + 1}`,
          geo: { type: "Point", coordinates: [lng, lat] },
        },
        workingHours: "08:00-23:00",
        photoUrl: null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }
    })
    if (docs.length) await col.insertMany(docs)
    await col.createIndex({ "address.geo": "2dsphere" })
    set.status = 201
    return { success: true, data: { inserted: docs.length } }
  })
