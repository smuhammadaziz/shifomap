import { Elysia } from "elysia"
import { ObjectId, type Document } from "mongodb"
import { z } from "zod"
import { getDb, ASSESSMENTS_COLLECTION } from "@/db/mongo"
import { requirePatientAuth } from "@/common/middleware/auth"
import { toObjectId } from "@/common/utils/id"

export interface AssessmentDoc extends Document {
  _id: ObjectId
  patientId: ObjectId
  answers: Array<{ question: string; answer: string }>
  condition: string | null
  advice: string | null
  severity: "low" | "medium" | "high" | null
  aiSummary: string | null
  createdAt: Date
}

const createSchema = z.object({
  answers: z
    .array(z.object({ question: z.string().min(1), answer: z.string().min(1).max(1000) }))
    .min(1)
    .max(20),
  condition: z.string().max(500).nullable().optional(),
  advice: z.string().max(4000).nullable().optional(),
  severity: z.enum(["low", "medium", "high"]).nullable().optional(),
  aiSummary: z.string().max(8000).nullable().optional(),
})

function mapToPublic(doc: AssessmentDoc) {
  return {
    _id: doc._id.toHexString(),
    patientId: doc.patientId.toHexString(),
    answers: doc.answers,
    condition: doc.condition,
    advice: doc.advice,
    severity: doc.severity,
    aiSummary: doc.aiSummary,
    createdAt: doc.createdAt.toISOString(),
  }
}

export const assessmentsRoutes = new Elysia({ prefix: "/assessments" })
  .use(requirePatientAuth)
  .post("/", async ({ auth, body, set }) => {
    const parsed = createSchema.safeParse(body ?? {})
    if (!parsed.success) {
      set.status = 400
      return { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors }
    }
    const db = getDb()
    const doc: AssessmentDoc = {
      _id: new ObjectId(),
      patientId: toObjectId(auth.sub),
      answers: parsed.data.answers,
      condition: parsed.data.condition ?? null,
      advice: parsed.data.advice ?? null,
      severity: parsed.data.severity ?? null,
      aiSummary: parsed.data.aiSummary ?? null,
      createdAt: new Date(),
    }
    await db.collection<AssessmentDoc>(ASSESSMENTS_COLLECTION).insertOne(doc)
    set.status = 201
    return { success: true, data: mapToPublic(doc) }
  })
  .get("/me", async ({ auth, set }) => {
    const db = getDb()
    const docs = await db
      .collection<AssessmentDoc>(ASSESSMENTS_COLLECTION)
      .find({ patientId: toObjectId(auth.sub) })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()
    set.status = 200
    return { success: true, data: docs.map(mapToPublic) }
  })
