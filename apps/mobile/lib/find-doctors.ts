import { getClinicsList, getClinicDetail } from './api';
import {
  type DoctorSpecialty,
  getDoctorSpecialty,
  doctorSpecialtyMatches,
  DOCTOR_SPECIALTIES,
} from './doctor-specialties';

export type PublicDoctorMatch = {
  doctorId: string;
  clinicId: string;
  doctorName: string;
  specialty: string;
  avatarUrl: string | null;
  clinicName: string;
  ratingAvg: number;
  reviewsCount: number;
};

function nameMatches(fullName: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 2) return true;
  return fullName.toLowerCase().includes(q);
}

export async function findDoctorsForSpecialty(
  specialtyKey: string,
  nameQuery?: string,
): Promise<PublicDoctorMatch[]> {
  const specialty = getDoctorSpecialty(specialtyKey);
  if (!specialty) return [];

  const clinics = await getClinicsList(80);
  const details = await Promise.allSettled(clinics.slice(0, 24).map((c) => getClinicDetail(c.id)));
  const out: PublicDoctorMatch[] = [];
  const dedup = new Set<string>();

  for (const res of details) {
    if (res.status !== 'fulfilled') continue;
    const clinic = res.value;
    for (const d of clinic.doctors?.filter((x) => x.isActive) ?? []) {
      if (!doctorSpecialtyMatches(d.specialty ?? '', specialty)) continue;
      if (nameQuery && !nameMatches(d.fullName, nameQuery)) continue;
      const key = `${clinic._id}:${d._id}`;
      if (dedup.has(key)) continue;
      dedup.add(key);
      out.push({
        doctorId: d._id,
        clinicId: clinic._id,
        doctorName: d.fullName,
        specialty: d.specialty,
        avatarUrl: d.avatarUrl ?? null,
        clinicName: clinic.clinicDisplayName,
        ratingAvg: clinic.rating?.avg ?? 0,
        reviewsCount: clinic.rating?.count ?? 0,
      });
    }
  }

  return out.sort((a, b) => (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0));
}

/** Search doctors by name across all specialties (optional specialty filter). */
export async function findDoctorsByName(
  nameQuery: string,
  specialtyKey?: string,
): Promise<PublicDoctorMatch[]> {
  const q = nameQuery.trim();
  if (q.length < 2) return [];

  if (specialtyKey) {
    return findDoctorsForSpecialty(specialtyKey, q);
  }

  const clinics = await getClinicsList(80);
  const details = await Promise.allSettled(clinics.slice(0, 24).map((c) => getClinicDetail(c.id)));
  const out: PublicDoctorMatch[] = [];
  const dedup = new Set<string>();

  for (const res of details) {
    if (res.status !== 'fulfilled') continue;
    const clinic = res.value;
    for (const d of clinic.doctors?.filter((x) => x.isActive) ?? []) {
      if (!nameMatches(d.fullName, q)) continue;
      const key = `${clinic._id}:${d._id}`;
      if (dedup.has(key)) continue;
      dedup.add(key);
      out.push({
        doctorId: d._id,
        clinicId: clinic._id,
        doctorName: d.fullName,
        specialty: d.specialty,
        avatarUrl: d.avatarUrl ?? null,
        clinicName: clinic.clinicDisplayName,
        ratingAvg: clinic.rating?.avg ?? 0,
        reviewsCount: clinic.rating?.count ?? 0,
      });
    }
  }

  return out.sort((a, b) => (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0));
}

export function pickSpecialtyFromFreeText(text: string): DoctorSpecialty | null {
  const lower = text.trim().toLowerCase();
  if (!lower) return null;
  return (
    DOCTOR_SPECIALTIES.find((s) => {
      const labelUz = s.uz.toLowerCase();
      const labelRu = s.ru.toLowerCase();
      if (labelUz.includes(lower) || labelRu.includes(lower) || lower.includes(labelUz)) return true;
      return s.keywords.some((k) => lower.includes(k.toLowerCase()));
    }) ?? null
  );
}
