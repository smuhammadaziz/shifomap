import { z } from "zod"
import type { ObjectId } from "mongodb"

export interface DiscountDoc {
  _id: ObjectId
  clinicId: ObjectId
  serviceId: ObjectId
  originalAmount: number
  discountedAmount: number
  currency: string
  expiresAt: Date
  posterUrl: string | null
  title: string | null
  createdBy: ObjectId
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export const createDiscountBodySchema = z.object({
  serviceId: z.string().min(1),
  discountedAmount: z.number().positive(),
  expiresAt: z.string().min(1), // ISO datetime
  posterUrl: z.string().url().nullable().optional(),
  title: z.string().max(160).nullable().optional(),
})

export const updateDiscountBodySchema = z.object({
  discountedAmount: z.number().positive().optional(),
  expiresAt: z.string().min(1).optional(),
  posterUrl: z.string().url().nullable().optional(),
  title: z.string().max(160).nullable().optional(),
})
