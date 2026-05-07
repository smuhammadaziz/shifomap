import { Elysia } from "elysia"
import { ObjectId } from "mongodb"
import { getDb, STORIES_COLLECTION, STORY_VIEWS_COLLECTION } from "@/db/mongo"
import { requireAuth, requirePatientAuth } from "@/common/middleware/auth"
import { unauthorized } from "@/common/errors"

type StoryDoc = {
  _id: ObjectId
  title: string
  imageUrl: string
  order: number
  isActive: boolean
  expiresAt: Date | null
  createdBy: ObjectId | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

type StoryViewDoc = {
  _id: ObjectId
  storyId: ObjectId
  patientId: ObjectId
  seenAt: Date
}

function isAdmin(role?: string) {
  return role === "SUPER_ADMIN_SHIFO" || role === "admin"
}

function mapPublic(s: StoryDoc, seen: boolean) {
  return {
    _id: s._id.toHexString(),
    title: s.title,
    imageUrl: s.imageUrl,
    order: s.order,
    isActive: s.isActive,
    expiresAt: s.expiresAt ? s.expiresAt.toISOString() : null,
    seen,
  }
}

export const storiesRoutes = new Elysia({ prefix: "/stories" })
  .get("/public", async ({ query, request, set }) => {
    const db = getDb()
    const limit = Math.min(40, Math.max(1, parseInt((query.limit as string) || "20", 10) || 20))
    const now = new Date()
    const docs = await db
      .collection<StoryDoc>(STORIES_COLLECTION)
      .find({
        deletedAt: null,
        isActive: true,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
      })
      .sort({ order: 1, createdAt: -1 })
      .limit(limit)
      .toArray()

    const authHeader = request.headers.get("authorization")
    let seenSet = new Set<string>()
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const { verifyToken } = await import("@/common/middleware/auth")
        const payload = await verifyToken(authHeader.slice(7))
        if (payload.role === "patient" && docs.length) {
          const patientId = new ObjectId(payload.sub)
          const rows = await db
            .collection<StoryViewDoc>(STORY_VIEWS_COLLECTION)
            .find({ patientId, storyId: { $in: docs.map((d) => d._id) } })
            .toArray()
          seenSet = new Set(rows.map((r) => r.storyId.toHexString()))
        }
      } catch {
        /* ignore auth parse errors in public route */
      }
    }

    set.status = 200
    return {
      success: true,
      data: { items: docs.map((s) => mapPublic(s, seenSet.has(s._id.toHexString()))) },
    }
  })
  .use(requirePatientAuth)
  .post("/:id/seen", async ({ auth, params, set }) => {
    if (!ObjectId.isValid(params.id)) {
      set.status = 400
      return { success: false, error: "Invalid id" }
    }
    const db = getDb()
    await db.collection<StoryViewDoc>(STORY_VIEWS_COLLECTION).updateOne(
      { storyId: new ObjectId(params.id), patientId: new ObjectId(auth.sub) },
      {
        $set: { seenAt: new Date() },
        $setOnInsert: { _id: new ObjectId(), storyId: new ObjectId(params.id), patientId: new ObjectId(auth.sub) },
      },
      { upsert: true }
    )
    set.status = 200
    return { success: true, data: { seen: true } }
  })

export const storiesAdminRoutes = new Elysia({ prefix: "/stories/admin" })
  .use(requireAuth)
  .get("/", async ({ auth, set }) => {
    if (!isAdmin(auth.role)) throw unauthorized("Admin only")
    const db = getDb()
    const docs = await db
      .collection<StoryDoc>(STORIES_COLLECTION)
      .find({ deletedAt: null })
      .sort({ order: 1, createdAt: -1 })
      .limit(200)
      .toArray()
    set.status = 200
    return {
      success: true,
      data: {
        items: docs.map((s) => ({
          _id: s._id.toHexString(),
          title: s.title,
          imageUrl: s.imageUrl,
          order: s.order,
          isActive: s.isActive,
          expiresAt: s.expiresAt ? s.expiresAt.toISOString() : null,
          createdAt: s.createdAt.toISOString(),
        })),
      },
    }
  })
  .post("/", async ({ auth, body, set }) => {
    if (!isAdmin(auth.role)) throw unauthorized("Admin only")
    const b = body as { title?: string; imageUrl?: string; order?: number; isActive?: boolean; expiresAt?: string | null }
    const title = String(b.title ?? "").trim()
    const imageUrl = String(b.imageUrl ?? "").trim()
    if (!title || !imageUrl) {
      set.status = 400
      return { success: false, error: "title and imageUrl are required" }
    }
    const now = new Date()
    const doc: StoryDoc = {
      _id: new ObjectId(),
      title,
      imageUrl,
      order: Number.isFinite(Number(b.order)) ? Number(b.order) : 0,
      isActive: b.isActive !== false,
      expiresAt: b.expiresAt ? new Date(b.expiresAt) : null,
      createdBy: auth.sub ? new ObjectId(auth.sub) : null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }
    const db = getDb()
    await db.collection<StoryDoc>(STORIES_COLLECTION).insertOne(doc)
    set.status = 201
    return { success: true, data: { _id: doc._id.toHexString() } }
  })
  .patch("/:id", async ({ auth, params, body, set }) => {
    if (!isAdmin(auth.role)) throw unauthorized("Admin only")
    if (!ObjectId.isValid(params.id)) {
      set.status = 400
      return { success: false, error: "Invalid id" }
    }
    const b = body as { title?: string; imageUrl?: string; order?: number; isActive?: boolean; expiresAt?: string | null }
    const patch: Record<string, unknown> = { updatedAt: new Date() }
    if (b.title !== undefined) patch.title = String(b.title).trim()
    if (b.imageUrl !== undefined) patch.imageUrl = String(b.imageUrl).trim()
    if (b.order !== undefined) patch.order = Number.isFinite(Number(b.order)) ? Number(b.order) : 0
    if (b.isActive !== undefined) patch.isActive = !!b.isActive
    if (b.expiresAt !== undefined) patch.expiresAt = b.expiresAt ? new Date(b.expiresAt) : null
    const db = getDb()
    const res = await db.collection<StoryDoc>(STORIES_COLLECTION).updateOne({ _id: new ObjectId(params.id), deletedAt: null }, { $set: patch })
    if (res.matchedCount === 0) {
      set.status = 404
      return { success: false, error: "Not found" }
    }
    set.status = 200
    return { success: true, data: { _id: params.id } }
  })
  .delete("/:id", async ({ auth, params, set }) => {
    if (!isAdmin(auth.role)) throw unauthorized("Admin only")
    if (!ObjectId.isValid(params.id)) {
      set.status = 400
      return { success: false, error: "Invalid id" }
    }
    const db = getDb()
    const res = await db.collection<StoryDoc>(STORIES_COLLECTION).updateOne(
      { _id: new ObjectId(params.id), deletedAt: null },
      { $set: { deletedAt: new Date(), updatedAt: new Date() } }
    )
    if (res.matchedCount === 0) {
      set.status = 404
      return { success: false, error: "Not found" }
    }
    set.status = 200
    return { success: true, data: { _id: params.id } }
  })
