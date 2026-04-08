import { getDb } from "./mongo.js"

const CLINICS_COLLECTION = "clinics"

export interface RelevantService {
  serviceTitle: string
  clinicName: string
  price: string
  doctorName: string | null
  specialty: string | null
}

// Uzbek/Russian stopwords to filter out from search
const STOPWORDS = new Set([
  // Uzbek
  "va", "ham", "bilan", "uchun", "bu", "shu", "men", "mening", "menda", "menga",
  "sen", "siz", "u", "ular", "bor", "yo'q", "kerak", "mumkin", "kere", "bo'lsa",
  "qanday", "nima", "qayerda", "qachon", "nega", "lekin", "ammo", "yoki", "haqida",
  "juda", "katta", "kichik", "yaxshi", "yomon", "har", "bir", "ikki", "uch", "to'rt",
  "ko'p", "kam", "oz", "bazida", "ba'zan", "doim", "hech", "endi", "o'z",
  "boshladi", "bo'ldi", "qilish", "olish", "berish", "kelish", "ketish",
  "iltimos", "rahmat", "salom", "assalomu", "alaykum",
  // Russian
  "и", "в", "на", "с", "по", "для", "от", "к", "у", "из", "за", "о", "об",
  "мне", "меня", "мой", "моя", "мое", "я", "ты", "он", "она", "мы", "вы", "они",
  "что", "как", "где", "когда", "почему", "но", "или", "если", "бы", "не",
  "очень", "есть", "нет", "нужно", "можно", "надо", "уже", "ещё", "тоже",
  "этот", "тот", "свой", "все", "каждый", "который",
  "привет", "здравствуйте", "пожалуйста", "спасибо",
])

/**
 * Extract meaningful search words from the user's message.
 * Filters out stopwords and very short words.
 */
function extractSearchWords(message: string): string[] {
  const words = message
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // keep letters & numbers only
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))

  // Deduplicate
  return [...new Set(words)]
}

/**
 * Search active clinics for services matching the user's health query.
 * Returns up to `limit` matching services with clinic info and price.
 */
export async function searchRelevantServices(
  userMessage: string,
  limit: number = 2
): Promise<RelevantService[]> {
  const searchWords = extractSearchWords(userMessage)
  if (searchWords.length === 0) return []

  const db = getDb()

  // Build a regex that matches any of the user's meaningful words
  const pattern = searchWords
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")
  const regex = { $regex: pattern, $options: "i" }

  // Search active clinics for matching services or doctors
  const clinics = await db
    .collection(CLINICS_COLLECTION)
    .find({
      status: "active",
      deletedAt: null,
      $or: [
        { "services.title": regex },
        { "doctors.specialty": regex },
      ],
    })
    .limit(5)
    .toArray()

  const re = new RegExp(pattern, "i")
  const results: RelevantService[] = []

  for (const clinic of clinics) {
    const clinicName = (clinic as any).clinicDisplayName || "Klinika"
    const services: any[] = (clinic as any).services || []
    const doctors: any[] = (clinic as any).doctors || []

    // Find services with titles matching the user's query
    const matchingServices = services.filter(
      (s: any) => s.isActive && re.test(s.title || "")
    )

    for (const svc of matchingServices) {
      // Find a doctor linked to this service
      const svcDoctorIds = (svc.doctorIds || []).map((id: any) => id.toString())
      const linkedDoctor = doctors.find(
        (d: any) => d.isActive && svcDoctorIds.includes(d._id.toString())
      )

      const price = formatServicePrice(svc.price)

      results.push({
        serviceTitle: svc.title,
        clinicName,
        price,
        doctorName: linkedDoctor?.fullName || null,
        specialty: linkedDoctor?.specialty || null,
      })

      if (results.length >= limit) return results
    }

    // If no services matched by title, check if doctors' specialty matches
    if (matchingServices.length === 0) {
      const matchingDoctors = doctors.filter(
        (d: any) => d.isActive && re.test(d.specialty || "")
      )

      for (const doc of matchingDoctors) {
        // Find a service linked to this doctor
        const docServiceIds = (doc.serviceIds || []).map((id: any) => id.toString())
        const linkedService = services.find(
          (s: any) => s.isActive && docServiceIds.includes(s._id.toString())
        )

        if (linkedService) {
          results.push({
            serviceTitle: linkedService.title,
            clinicName,
            price: formatServicePrice(linkedService.price),
            doctorName: doc.fullName,
            specialty: doc.specialty,
          })

          if (results.length >= limit) return results
        }
      }
    }
  }

  return results
}

function formatServicePrice(price: any): string {
  if (!price) return ""
  if (price.amount != null && price.amount > 0) {
    return `${formatNum(price.amount)} ${price.currency || "so'm"}`
  }
  if (price.minAmount != null && price.maxAmount != null) {
    return `${formatNum(price.minAmount)}-${formatNum(price.maxAmount)} ${price.currency || "so'm"}`
  }
  return ""
}

function formatNum(n: number): string {
  return n.toLocaleString("uz-UZ").replace(/,/g, " ")
}
