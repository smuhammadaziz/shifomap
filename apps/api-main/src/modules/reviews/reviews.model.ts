import type { ObjectId } from "mongodb"
import { z } from "zod"

export interface ReviewDoc {
  _id: ObjectId
  clinicId: ObjectId
  serviceId: ObjectId | null
  doctorId: ObjectId | null
  patientId: ObjectId
  stars: number
  text: string | null
  createdAt: Date
}

export const createReviewBodySchema = z.object({
  clinicId: z.string().min(1, "clinicId is required"),
  serviceId: z.string().optional().nullable(),
  doctorId: z.string().optional().nullable(),
  stars: z.number().min(1).max(5),
  text: z.string().max(2000).optional().nullable(),
})
export type CreateReviewBody = z.infer<typeof createReviewBodySchema>
