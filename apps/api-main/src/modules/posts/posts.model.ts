import { z } from "zod"
import type { ObjectId } from "mongodb"

export interface PostDoc {
  _id: ObjectId
  imageUrls: string[]
  caption: string
  tags: string[]
  likesCount: number
  commentsCount: number
  createdBy: ObjectId | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export interface PostLikeDoc {
  _id: ObjectId
  postId: ObjectId
  patientId: ObjectId
  createdAt: Date
}

export interface PostCommentDoc {
  _id: ObjectId
  postId: ObjectId
  patientId: ObjectId
  patientName: string | null
  patientAvatar: string | null
  text: string
  createdAt: Date
  deletedAt: Date | null
}

export const createPostBodySchema = z.object({
  imageUrl: z.string().min(1).optional(),
  imageUrls: z.array(z.string().min(1)).min(1).max(10).optional(),
  caption: z.string().max(2000).default(""),
  tags: z.array(z.string().min(1).max(32)).max(12).default([]),
}).superRefine((v, ctx) => {
  if (!v.imageUrl && (!v.imageUrls || v.imageUrls.length === 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["imageUrls"], message: "At least one image is required" })
  }
})

export const updatePostBodySchema = z.object({
  imageUrl: z.string().min(1).optional(),
  imageUrls: z.array(z.string().min(1)).min(1).max(10).optional(),
  caption: z.string().max(2000).optional(),
  tags: z.array(z.string().min(1).max(32)).max(12).optional(),
})

export const commentBodySchema = z.object({
  text: z.string().min(1).max(500),
})

export function mapPostToPublic(doc: PostDoc, likedByMe: boolean) {
  const normalized = (doc.imageUrls && doc.imageUrls.length ? doc.imageUrls : ((doc as unknown as { imageUrl?: string }).imageUrl ? [(doc as unknown as { imageUrl: string }).imageUrl] : []))
  return {
    _id: doc._id.toHexString(),
    imageUrl: normalized[0] ?? "",
    imageUrls: normalized,
    caption: doc.caption,
    tags: doc.tags,
    likesCount: doc.likesCount,
    commentsCount: doc.commentsCount,
    likedByMe,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

export function mapCommentToPublic(doc: PostCommentDoc) {
  return {
    _id: doc._id.toHexString(),
    postId: doc.postId.toHexString(),
    patientId: doc.patientId.toHexString(),
    patientName: doc.patientName,
    patientAvatar: doc.patientAvatar,
    text: doc.text,
    createdAt: doc.createdAt.toISOString(),
  }
}
