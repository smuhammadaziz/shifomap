import { Elysia } from "elysia"
import { ObjectId } from "mongodb"
import {
  createPostBodySchema,
  updatePostBodySchema,
  commentBodySchema,
  mapPostToPublic,
  mapCommentToPublic,
  type PostDoc,
  type PostLikeDoc,
  type PostCommentDoc,
} from "./posts.model"
import {
  getDb,
  POSTS_COLLECTION,
  POST_LIKES_COLLECTION,
  POST_COMMENTS_COLLECTION,
  PATIENTS_COLLECTION,
} from "@/db/mongo"
import { requireAuth, requirePatientAuth } from "@/common/middleware/auth"
import { toObjectId } from "@/common/utils/id"
import { badRequest, notFound, unauthorized } from "@/common/errors"

function isAdmin(role?: string) {
  return role === "SUPER_ADMIN_SHIFO" || role === "admin"
}

export const postsPublicRoutes = new Elysia({ prefix: "/posts" })
  .get("/", async ({ query, set, request }) => {
    const db = getDb()
    const cursor = query.cursor as string | undefined
    const limit = Math.min(30, Math.max(1, parseInt((query.limit as string) || "15", 10)))
    const filter: Record<string, unknown> = { deletedAt: null }
    if (cursor && ObjectId.isValid(cursor)) {
      filter._id = { $lt: toObjectId(cursor) }
    }

    let patientId: ObjectId | null = null
    const authHeader = request.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const { verifyToken } = await import("@/common/middleware/auth")
        const payload = await verifyToken(authHeader.slice(7))
        if (payload.role === "patient") patientId = toObjectId(payload.sub)
      } catch {
        /* ignore */
      }
    }

    const docs = await db
      .collection<PostDoc>(POSTS_COLLECTION)
      .find(filter)
      .sort({ _id: -1 })
      .limit(limit)
      .toArray()

    let likedSet = new Set<string>()
    if (patientId && docs.length > 0) {
      const likes = await db
        .collection<PostLikeDoc>(POST_LIKES_COLLECTION)
        .find({ postId: { $in: docs.map((d) => d._id) }, patientId })
        .toArray()
      likedSet = new Set(likes.map((l) => l.postId.toHexString()))
    }

    const nextCursor = docs.length === limit ? docs[docs.length - 1]._id.toHexString() : null
    set.status = 200
    return {
      success: true,
      data: {
        items: docs.map((d) => mapPostToPublic(d, likedSet.has(d._id.toHexString()))),
        nextCursor,
      },
    }
  })
  .get("/:id", async ({ params, set, request }) => {
    if (!ObjectId.isValid(params.id)) throw badRequest("Invalid id")
    const db = getDb()
    const doc = await db
      .collection<PostDoc>(POSTS_COLLECTION)
      .findOne({ _id: toObjectId(params.id), deletedAt: null })
    if (!doc) throw notFound("Post not found")

    let likedByMe = false
    const authHeader = request.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const { verifyToken } = await import("@/common/middleware/auth")
        const payload = await verifyToken(authHeader.slice(7))
        if (payload.role === "patient") {
          const like = await db
            .collection<PostLikeDoc>(POST_LIKES_COLLECTION)
            .findOne({ postId: doc._id, patientId: toObjectId(payload.sub) })
          likedByMe = !!like
        }
      } catch {
        /* ignore */
      }
    }
    set.status = 200
    return { success: true, data: mapPostToPublic(doc, likedByMe) }
  })
  .get("/:id/comments", async ({ params, query, set }) => {
    if (!ObjectId.isValid(params.id)) throw badRequest("Invalid id")
    const db = getDb()
    const limit = Math.min(100, Math.max(1, parseInt((query.limit as string) || "30", 10)))
    const docs = await db
      .collection<PostCommentDoc>(POST_COMMENTS_COLLECTION)
      .find({ postId: toObjectId(params.id), deletedAt: null })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()
    set.status = 200
    return { success: true, data: docs.map(mapCommentToPublic) }
  })

export const postsPatientRoutes = new Elysia({ prefix: "/posts" })
  .use(requirePatientAuth)
  .post("/:id/like", async ({ auth, params, set }) => {
    if (!ObjectId.isValid(params.id)) throw badRequest("Invalid id")
    const db = getDb()
    const postId = toObjectId(params.id)
    const patientId = toObjectId(auth.sub)
    const existing = await db
      .collection<PostLikeDoc>(POST_LIKES_COLLECTION)
      .findOne({ postId, patientId })
    if (existing) {
      set.status = 200
      return { success: true, data: { liked: true } }
    }
    await db.collection<PostLikeDoc>(POST_LIKES_COLLECTION).insertOne({
      _id: new ObjectId(),
      postId,
      patientId,
      createdAt: new Date(),
    })
    await db.collection<PostDoc>(POSTS_COLLECTION).updateOne({ _id: postId }, { $inc: { likesCount: 1 } })
    set.status = 201
    return { success: true, data: { liked: true } }
  })
  .delete("/:id/like", async ({ auth, params, set }) => {
    if (!ObjectId.isValid(params.id)) throw badRequest("Invalid id")
    const db = getDb()
    const postId = toObjectId(params.id)
    const patientId = toObjectId(auth.sub)
    const res = await db
      .collection<PostLikeDoc>(POST_LIKES_COLLECTION)
      .deleteOne({ postId, patientId })
    if (res.deletedCount > 0) {
      await db
        .collection<PostDoc>(POSTS_COLLECTION)
        .updateOne({ _id: postId }, { $inc: { likesCount: -1 } })
    }
    set.status = 200
    return { success: true, data: { liked: false } }
  })
  .post("/:id/comments", async ({ auth, params, body, set }) => {
    const parsed = commentBodySchema.safeParse(body ?? {})
    if (!parsed.success) {
      set.status = 400
      return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors }
    }
    if (!ObjectId.isValid(params.id)) throw badRequest("Invalid id")
    const db = getDb()
    const postId = toObjectId(params.id)
    const patient = (await db
      .collection(PATIENTS_COLLECTION)
      .findOne({ _id: toObjectId(auth.sub) })) as
      | { profile?: { fullName?: string | null; avatarUrl?: string | null } }
      | null
    const doc: PostCommentDoc = {
      _id: new ObjectId(),
      postId,
      patientId: toObjectId(auth.sub),
      patientName: patient?.profile?.fullName ?? null,
      patientAvatar: patient?.profile?.avatarUrl ?? null,
      text: parsed.data.text,
      createdAt: new Date(),
      deletedAt: null,
    }
    await db.collection<PostCommentDoc>(POST_COMMENTS_COLLECTION).insertOne(doc)
    await db
      .collection<PostDoc>(POSTS_COLLECTION)
      .updateOne({ _id: postId }, { $inc: { commentsCount: 1 } })
    set.status = 201
    return { success: true, data: mapCommentToPublic(doc) }
  })

export const postsAdminRoutes = new Elysia({ prefix: "/posts" })
  .use(requireAuth)
  .post("/", async ({ auth, body, set }) => {
    if (!isAdmin(auth.role)) throw unauthorized("Admin only")
    const parsed = createPostBodySchema.safeParse(body ?? {})
    if (!parsed.success) {
      set.status = 400
      return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors }
    }
    const db = getDb()
    const now = new Date()
    const doc: PostDoc = {
      _id: new ObjectId(),
      imageUrl: parsed.data.imageUrl,
      caption: parsed.data.caption,
      tags: parsed.data.tags,
      likesCount: 0,
      commentsCount: 0,
      createdBy: toObjectId(auth.sub),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }
    await db.collection<PostDoc>(POSTS_COLLECTION).insertOne(doc)
    set.status = 201
    return { success: true, data: mapPostToPublic(doc, false) }
  })
  .patch("/:id", async ({ auth, params, body, set }) => {
    if (!isAdmin(auth.role)) throw unauthorized("Admin only")
    if (!ObjectId.isValid(params.id)) throw badRequest("Invalid id")
    const parsed = updatePostBodySchema.safeParse(body ?? {})
    if (!parsed.success) {
      set.status = 400
      return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors }
    }
    const db = getDb()
    const result = await db
      .collection<PostDoc>(POSTS_COLLECTION)
      .findOneAndUpdate(
        { _id: toObjectId(params.id), deletedAt: null },
        { $set: { ...parsed.data, updatedAt: new Date() } },
        { returnDocument: "after" }
      )
    if (!result) throw notFound("Post not found")
    set.status = 200
    return { success: true, data: mapPostToPublic(result, false) }
  })
  .delete("/:id", async ({ auth, params, set }) => {
    if (!isAdmin(auth.role)) throw unauthorized("Admin only")
    if (!ObjectId.isValid(params.id)) throw badRequest("Invalid id")
    const db = getDb()
    await db
      .collection<PostDoc>(POSTS_COLLECTION)
      .updateOne(
        { _id: toObjectId(params.id) },
        { $set: { deletedAt: new Date(), updatedAt: new Date() } }
      )
    set.status = 200
    return { success: true, data: { _id: params.id } }
  })
