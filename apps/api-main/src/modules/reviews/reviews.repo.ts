import { ObjectId } from "mongodb"
import { getDb, REVIEWS_COLLECTION, CLINICS_COLLECTION, PATIENTS_COLLECTION } from "@/db/mongo"
import type { ReviewDoc } from "./reviews.model"
import type { ClinicDoc } from "@/modules/clinics/clinics.model"
import type { PatientDoc } from "@/modules/patients/patients.model"
import { toObjectId } from "@/common/utils/id"

export interface InsertReviewInput {
  clinicId: string
  serviceId: string | null | undefined
  doctorId: string | null | undefined
  patientId: string
  stars: number
  text: string | null
}

export async function insertReview(input: InsertReviewInput): Promise<ReviewDoc> {
  const db = getDb()
  const now = new Date()
  const clinicId = toObjectId(input.clinicId)
  const doc: ReviewDoc = {
    _id: new ObjectId(),
    clinicId,
    serviceId: input.serviceId ? toObjectId(input.serviceId) : null,
    doctorId: input.doctorId ? toObjectId(input.doctorId) : null,
    patientId: toObjectId(input.patientId),
    stars: input.stars,
    text: input.text ?? null,
    createdAt: now,
  }
  await db.collection<ReviewDoc>(REVIEWS_COLLECTION).insertOne(doc)

  if (!doc.serviceId && !doc.doctorId) {
    await recalcClinicRating(clinicId)
  }
  return doc
}

export async function recalcClinicRating(clinicId: ObjectId): Promise<void> {
  const db = getDb()
  const result = await db
    .collection<ReviewDoc>(REVIEWS_COLLECTION)
    .aggregate<{ avg: number; count: number }>([
      { $match: { clinicId, serviceId: null, doctorId: null } },
      {
        $group: {
          _id: null,
          avg: { $avg: "$stars" },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0, avg: { $round: ["$avg", 2] }, count: 1 } },
    ])
    .toArray()

  const r = result[0]
  const rating = r ? { avg: Math.round(r.avg * 10) / 10, count: r.count } : { avg: 0, count: 0 }

  await db.collection<ClinicDoc>(CLINICS_COLLECTION).updateOne(
    { _id: clinicId },
    { $set: { rating, updatedAt: new Date() } }
  )
}

export interface ListReviewsFilter {
  clinicId: string
  serviceId?: string | null
  doctorId?: string | null
}

export interface ReviewListItem {
  _id: string
  clinicId: string
  serviceId: string | null
  doctorId: string | null
  patientId: string
  patientName?: string
  patient?: {
    fullName: string
    phone: string
    email: string | null
    city: string
  }
  stars: number
  text: string | null
  createdAt: string
}

export async function listReviews(
  filter: ListReviewsFilter,
  skip: number = 0,
  limit: number = 10
): Promise<{ reviews: ReviewListItem[]; total: number }> {
  const db = getDb()
  const match: Record<string, unknown> = { clinicId: toObjectId(filter.clinicId) }
  if (filter.serviceId != null && filter.serviceId !== "") {
    match.serviceId = toObjectId(filter.serviceId)
  } else {
    match.serviceId = null
  }
  if (filter.doctorId != null && filter.doctorId !== "") {
    match.doctorId = toObjectId(filter.doctorId)
  } else {
    match.doctorId = null
  }

  const [totalResult, docs] = await Promise.all([
    db.collection<ReviewDoc>(REVIEWS_COLLECTION).countDocuments(match),
    db
      .collection<ReviewDoc>(REVIEWS_COLLECTION)
      .find(match)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
  ])

  const reviews: ReviewListItem[] = docs.map((d) => ({
    _id: d._id.toHexString(),
    clinicId: d.clinicId.toHexString(),
    serviceId: d.serviceId?.toHexString() ?? null,
    doctorId: d.doctorId?.toHexString() ?? null,
    patientId: d.patientId.toHexString(),
    stars: d.stars,
    text: d.text ?? null,
    createdAt: d.createdAt.toISOString(),
  }))
  return { reviews, total: totalResult }
}

export async function listReviewsWithPatientDetails(
  filter: ListReviewsFilter,
  skip: number = 0,
  limit: number = 10
): Promise<{ reviews: ReviewListItem[]; total: number }> {
  const { reviews, total } = await listReviews(filter, skip, limit)
  const db = getDb()
  const patientIds = [...new Set(reviews.map((r) => r.patientId))]
  const patientDocs = await db
    .collection<PatientDoc>(PATIENTS_COLLECTION)
    .find({ _id: { $in: patientIds.map((id) => toObjectId(id)) }, deletedAt: null })
    .toArray()
  const patientMap = new Map(patientDocs.map((p) => [p._id.toHexString(), p]))
  const enriched: ReviewListItem[] = reviews.map((r) => {
    const patient = patientMap.get(r.patientId)
    return {
      ...r,
      patient: patient
        ? {
            fullName: patient.fullName,
            phone: patient.contacts?.phone ?? "",
            email: patient.contacts?.email ?? null,
            city: patient.location?.city ?? "",
          }
        : undefined,
    }
  })
  return { reviews: enriched, total }
}

export async function getRatingForTarget(filter: ListReviewsFilter): Promise<{ avg: number; count: number }> {
  const db = getDb()
  const match: Record<string, unknown> = { clinicId: toObjectId(filter.clinicId) }
  if (filter.serviceId != null && filter.serviceId !== "") {
    match.serviceId = toObjectId(filter.serviceId)
  } else {
    match.serviceId = null
  }
  if (filter.doctorId != null && filter.doctorId !== "") {
    match.doctorId = toObjectId(filter.doctorId)
  } else {
    match.doctorId = null
  }
  const result = await db
    .collection<ReviewDoc>(REVIEWS_COLLECTION)
    .aggregate<{ avg: number; count: number }>([
      { $match: match },
      { $group: { _id: null, avg: { $avg: "$stars" }, count: { $sum: 1 } } },
      { $project: { _id: 0, avg: { $round: ["$avg", 2] }, count: 1 } },
    ])
    .toArray()
  const r = result[0]
  return r ? { avg: Math.round(r.avg * 10) / 10, count: r.count } : { avg: 0, count: 0 }
}
