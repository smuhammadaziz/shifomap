import { Elysia } from "elysia"
import { requireAuth } from "@/common/middleware/auth"
import { unauthorized } from "@/common/errors"
import {
  getDb,
  PATIENTS_COLLECTION,
  TELEGRAM_USERS_COLLECTION,
  CLINICS_COLLECTION,
  AI_CHAT_CONVERSATIONS_COLLECTION,
  BOOKINGS_COLLECTION,
} from "@/db/mongo"

type PatientRow = {
  _id: { toHexString: () => string }
  fullName?: string | null
  gender?: "male" | "female" | null
  age?: number | null
  contacts?: { phone?: string | null; email?: string | null; telegram?: string | null }
  location?: { city?: string | null }
  status?: string | null
  createdAt?: Date
  updatedAt?: Date
  deletedAt?: Date | null
}

type TelegramUserRow = {
  _id: { toHexString: () => string }
  tgChatId?: number | string
  name?: string | null
  phoneNumber?: string | null
  aiBonusBank?: number | null
  aiQuestionsTotal?: number | null
  aiUsedToday?: number | null
  aiUsedTodayDate?: string | null
  messages?: unknown[]
  updatedAt?: Date
}

type ClinicRow = {
  _id: { toHexString: () => string }
  clinicDisplayName?: string | null
  plan?: { type?: "starter" | "pro" | null }
  status?: string | null
  deletedAt?: Date | null
  createdAt?: Date
}

function isAdmin(role?: string) {
  return role === "SUPER_ADMIN_SHIFO" || role === "admin"
}

function lastNDates(n: number): Array<{ key: string; label: string; start: Date; end: Date }> {
  const out: Array<{ key: string; label: string; start: Date; end: Date }> = []
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(today)
    start.setDate(today.getDate() - i)
    const end = new Date(start)
    end.setDate(start.getDate() + 1)
    const key = start.toISOString().slice(0, 10)
    const label = start.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" })
    out.push({ key, label, start, end })
  }
  return out
}

export const usersRoutes = new Elysia({ prefix: "/users" })
  .use(requireAuth)
  .get("/analytics", async ({ auth, set }) => {
    if (!isAdmin(auth.role)) throw unauthorized("Admin only")
    const db = getDb()
    const days14 = lastNDates(14)

    const [patientRows, bookingRows, aiRows, clinicRows] = await Promise.all([
      db
        .collection(PATIENTS_COLLECTION)
        .find({ deletedAt: null, createdAt: { $gte: days14[0].start } })
        .project({ createdAt: 1 })
        .toArray() as Promise<Array<{ createdAt?: Date }>>,
      db
        .collection(BOOKINGS_COLLECTION)
        .find({ deletedAt: null, createdAt: { $gte: days14[0].start } })
        .project({ createdAt: 1, status: 1 })
        .toArray() as Promise<Array<{ createdAt?: Date; status?: string }>>,
      db
        .collection(AI_CHAT_CONVERSATIONS_COLLECTION)
        .find({ createdAt: { $gte: days14[0].start } })
        .project({ createdAt: 1, feedbackStatus: 1 })
        .toArray() as Promise<Array<{ createdAt?: Date; feedbackStatus?: "none" | "rated" | "dismissed" }>>,
      db
        .collection(CLINICS_COLLECTION)
        .find({ deletedAt: null })
        .project({ "plan.type": 1 })
        .toArray() as Promise<Array<{ plan?: { type?: "starter" | "pro" } }>>,
    ])

    const patientsByDay = days14.map((d) => ({
      day: d.label,
      value: patientRows.filter((r) => r.createdAt && r.createdAt >= d.start && r.createdAt < d.end).length,
    }))

    const bookingsByDay = days14.map((d) => ({
      day: d.label,
      value: bookingRows.filter((r) => r.createdAt && r.createdAt >= d.start && r.createdAt < d.end).length,
    }))

    const bookingStatusMap: Record<string, number> = {
      pending: 0,
      confirmed: 0,
      patient_arrived: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    }
    for (const b of bookingRows) {
      const key = b.status || "pending"
      bookingStatusMap[key] = (bookingStatusMap[key] || 0) + 1
    }
    const bookingStatus = Object.entries(bookingStatusMap).map(([label, value]) => ({ label, value }))

    const feedbackMap: Record<string, number> = { rated: 0, dismissed: 0, none: 0 }
    for (const a of aiRows) {
      const key = a.feedbackStatus || "none"
      feedbackMap[key] = (feedbackMap[key] || 0) + 1
    }
    const aiFeedback = Object.entries(feedbackMap).map(([label, value]) => ({ label, value }))

    const clinicPlanMap: Record<string, number> = { starter: 0, pro: 0 }
    for (const c of clinicRows) {
      const key = c.plan?.type || "starter"
      clinicPlanMap[key] = (clinicPlanMap[key] || 0) + 1
    }
    const clinicsByPlan = Object.entries(clinicPlanMap).map(([label, value]) => ({ label, value }))

    set.status = 200
    return {
      success: true,
      data: {
        patientsByDay,
        bookingsByDay,
        bookingStatus,
        aiFeedback,
        clinicsByPlan,
      },
    }
  })
  .get("/dashboard-stats", async ({ auth, set }) => {
    if (!isAdmin(auth.role)) throw unauthorized("Admin only")
    const db = getDb()
    const now = new Date()
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const [patientsCount, clinicsCount, paidClinicsRows, aiConversationsTotal, dailyActiveRows] = await Promise.all([
      db.collection(PATIENTS_COLLECTION).countDocuments({ deletedAt: null }),
      db.collection(CLINICS_COLLECTION).countDocuments({ deletedAt: null }),
      db
        .collection(CLINICS_COLLECTION)
        .find({ deletedAt: null, "plan.type": "pro" })
        .project({ clinicDisplayName: 1, "plan.type": 1, status: 1, createdAt: 1 })
        .sort({ createdAt: -1 })
        .limit(12)
        .toArray() as Promise<ClinicRow[]>,
      db.collection(AI_CHAT_CONVERSATIONS_COLLECTION).countDocuments({}),
      db
        .collection(PATIENTS_COLLECTION)
        .find({ deletedAt: null, updatedAt: { $gte: dayStart } })
        .project({ fullName: 1, updatedAt: 1 })
        .sort({ updatedAt: -1 })
        .limit(12)
        .toArray() as Promise<Array<{ _id: { toHexString: () => string }; fullName?: string | null; updatedAt?: Date }>>,
    ])

    const paidClinics = paidClinicsRows.map((c) => ({
      _id: c._id.toHexString(),
      name: c.clinicDisplayName ?? "Unknown clinic",
      plan: c.plan?.type ?? "starter",
      status: c.status ?? "inactive",
    }))
    const dailyActiveUsers = dailyActiveRows.map((u) => ({
      _id: u._id.toHexString(),
      name: u.fullName ?? "Unknown",
      lastActive: u.updatedAt ? u.updatedAt.toISOString() : null,
    }))

    set.status = 200
    return {
      success: true,
      data: {
        usersCount: patientsCount,
        clinicsCount,
        paidClinicsCount: paidClinics.length,
        dailyActiveCount: dailyActiveUsers.length,
        aiConversationsTotal,
        paidClinics,
        dailyActiveUsers,
      },
    }
  })
  .get("/patients", async ({ auth, query, set }) => {
    if (!isAdmin(auth.role)) throw unauthorized("Admin only")
    const db = getDb()
    const search = ((query.search as string) || "").trim()
    const status = ((query.status as string) || "all").trim()
    const gender = ((query.gender as string) || "all").trim()
    const city = ((query.city as string) || "all").trim()

    const filter: Record<string, unknown> = { deletedAt: null }
    if (status !== "all") filter.status = status
    if (gender !== "all") filter.gender = gender
    if (city !== "all") filter["location.city"] = city
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { "contacts.phone": { $regex: search, $options: "i" } },
        { "contacts.email": { $regex: search, $options: "i" } },
        { "contacts.telegram": { $regex: search, $options: "i" } },
        { "location.city": { $regex: search, $options: "i" } },
      ]
    }

    const rows = (await db
      .collection(PATIENTS_COLLECTION)
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(2000)
      .toArray()) as PatientRow[]

    const items = rows.map((row) => ({
      _id: row._id.toHexString(),
      fullName: row.fullName ?? null,
      gender: row.gender ?? null,
      age: row.age ?? null,
      phone: row.contacts?.phone ?? null,
      email: row.contacts?.email ?? null,
      telegram: row.contacts?.telegram ?? null,
      city: row.location?.city ?? null,
      status: row.status ?? null,
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
      updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
    }))

    const cities = [...new Set(items.map((x) => x.city).filter(Boolean))].sort()

    set.status = 200
    return { success: true, data: { items, cities } }
  })
  .get("/telegram", async ({ auth, query, set }) => {
    if (!isAdmin(auth.role)) throw unauthorized("Admin only")
    const db = getDb()
    const search = ((query.search as string) || "").trim()
    const filter: Record<string, any> = {}
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
      ]
      if (/^\d+$/.test(search)) {
        filter.$or.push({ tgChatId: Number(search) }, { tgChatId: search })
      }
    }
    const rows = (await db
      .collection(TELEGRAM_USERS_COLLECTION)
      .find(filter)
      .sort({ updatedAt: -1 })
      .limit(2000)
      .toArray()) as TelegramUserRow[]
    const items = rows.map((row) => ({
      _id: row._id.toHexString(),
      tgChatId: row.tgChatId ?? null,
      name: row.name ?? null,
      phoneNumber: row.phoneNumber ?? null,
      aiBonusBank: row.aiBonusBank ?? 0,
      aiQuestionsTotal: row.aiQuestionsTotal ?? 0,
      aiUsedToday: row.aiUsedToday ?? 0,
      aiUsedTodayDate: row.aiUsedTodayDate ?? null,
      messagesCount: Array.isArray(row.messages) ? row.messages.length : 0,
      updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
    }))
    set.status = 200
    return { success: true, data: { items } }
  })
