export interface MockPatient {
  id: string
  fullName: string
  email: string
  phone: string
  dateOfBirth: string
  gender: "Male" | "Female" | "Other"
  city: string
  country: string
  status: "active" | "inactive" | "pending"
  registeredAt: string
  lastVisit: string
  clinicId: string
}

export interface MockClinic {
  id: string
  name: string
  email: string
  phone: string
  address: string
  city: string
  country: string
  plan: "free" | "basic" | "premium" | "enterprise"
  status: "active" | "inactive" | "suspended"
  doctorsCount: number
  patientsCount: number
  createdAt: string
  verified: boolean
  subscriptionEnd: string
}

const firstNames = [
  "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
  "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
  "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Lisa", "Daniel", "Nancy",
  "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
]
const lastNames = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
]
const cities = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose"]
const countries = ["USA", "USA", "USA", "UK", "Canada", "Australia", "Germany", "France"]

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function randomDate(start: Date, end: Date): string {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  return d.toISOString().split("T")[0]
}

export function generateMockPatients(count: number): MockPatient[] {
  const list: MockPatient[] = []
  for (let i = 1; i <= count; i++) {
    const firstName = randomItem(firstNames)
    const lastName = randomItem(lastNames)
    list.push({
      id: `pat-${i}`,
      fullName: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
      phone: `+1 ${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
      dateOfBirth: randomDate(new Date(1970, 0, 1), new Date(2005, 11, 31)),
      gender: randomItem(["Male", "Female", "Other"] as const),
      city: randomItem(cities),
      country: randomItem(countries),
      status: randomItem(["active", "inactive", "pending"] as const),
      registeredAt: randomDate(new Date(2022, 0, 1), new Date(2025, 0, 1)),
      lastVisit: randomDate(new Date(2024, 0, 1), new Date(2025, 0, 1)),
      clinicId: `clinic-${Math.floor(Math.random() * 10) + 1}`,
    })
  }
  return list
}

const clinicNames = [
  "City Health Center", "Family Care Clinic", "Sunrise Medical", "Downtown Wellness",
  "Northside Hospital Clinic", "QuickCare Plus", "Metro Health", "Valley Medical",
  "Central Care", "Greenfield Clinic",
]

export function generateMockClinics(count: number): MockClinic[] {
  const list: MockClinic[] = []
  for (let i = 1; i <= count; i++) {
    const name = clinicNames[i - 1] ?? `Clinic ${i}`
    list.push({
      id: `clinic-${i}`,
      name,
      email: `contact@${name.toLowerCase().replace(/\s/g, "")}.com`,
      phone: `+1 ${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
      address: `${100 + i} Main Street`,
      city: randomItem(cities),
      country: randomItem(countries),
      plan: randomItem(["free", "basic", "premium", "enterprise"] as const),
      status: randomItem(["active", "inactive", "suspended"] as const),
      doctorsCount: Math.floor(Math.random() * 20) + 1,
      patientsCount: Math.floor(Math.random() * 500) + 50,
      createdAt: randomDate(new Date(2020, 0, 1), new Date(2024, 0, 1)),
      verified: Math.random() > 0.3,
      subscriptionEnd: randomDate(new Date(2025, 0, 1), new Date(2026, 11, 31)),
    })
  }
  return list
}

export const MOCK_PATIENTS = generateMockPatients(50)
export const MOCK_CLINICS = generateMockClinics(10)

export const PAID_CLINICS = MOCK_CLINICS.filter((c) => c.plan !== "free")
export const DAILY_ACTIVE_USERS = MOCK_PATIENTS.filter((_, i) => i < 12).map((p, i) => ({
  id: p.id,
  name: p.fullName,
  lastActive: new Date(Date.now() - (i + 1) * 3600000).toISOString(),
}))
