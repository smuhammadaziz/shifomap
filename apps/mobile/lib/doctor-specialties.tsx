import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export type SpecialtyIcon =
  | { lib: 'ion'; name: keyof typeof Ionicons.glyphMap }
  | { lib: 'mci'; name: keyof typeof MaterialCommunityIcons.glyphMap };

export type DoctorSpecialty = {
  key: string;
  uz: string;
  ru: string;
  keywords: string[];
  icon: SpecialtyIcon;
  gradient: [string, string];
  softBg: string;
};

/** Specializations for doctor search (keywords match clinic doctor.specialty text). */
export const DOCTOR_SPECIALTIES: DoctorSpecialty[] = [
  {
    key: 'terapevt',
    uz: 'Terapevt',
    ru: 'Терапевт',
    keywords: ['terapevt', 'терапевт', 'therapist', 'umumiy'],
    icon: { lib: 'mci', name: 'stethoscope' },
    gradient: ['#2563eb', '#60a5fa'],
    softBg: '#dbeafe',
  },
  {
    key: 'kardiolog',
    uz: 'Kardiolog',
    ru: 'Кардиолог',
    keywords: ['kardiolog', 'кардиолог', 'cardio', 'yurak', 'сердц'],
    icon: { lib: 'mci', name: 'heart-pulse' },
    gradient: ['#dc2626', '#f87171'],
    softBg: '#fee2e2',
  },
  {
    key: 'stomatolog',
    uz: 'Stomatolog',
    ru: 'Стоматолог',
    keywords: ['stomatolog', 'стоматолог', 'dentist', 'tish', 'зуб'],
    icon: { lib: 'mci', name: 'tooth-outline' },
    gradient: ['#0891b2', '#22d3ee'],
    softBg: '#cffafe',
  },
  {
    key: 'pediatr',
    uz: 'Pediatr',
    ru: 'Педиатр',
    keywords: ['pediatr', 'педиатр', 'pediatric', 'bola', 'дет'],
    icon: { lib: 'mci', name: 'baby-face-outline' },
    gradient: ['#f59e0b', '#fb923c'],
    softBg: '#ffedd5',
  },
  {
    key: 'dermatolog',
    uz: 'Dermatolog',
    ru: 'Дерматолог',
    keywords: ['dermatolog', 'дерматолог', 'teri', 'кож'],
    icon: { lib: 'mci', name: 'face-woman-outline' },
    gradient: ['#10b981', '#34d399'],
    softBg: '#d1fae5',
  },
  {
    key: 'dermatovenerolog',
    uz: 'Dermatovenerolog',
    ru: 'Дерматовенеролог',
    keywords: ['dermatovenerolog', 'дерматовенеролог', 'venerolog', 'венеролог'],
    icon: { lib: 'mci', name: 'virus-outline' },
    gradient: ['#059669', '#6ee7b7'],
    softBg: '#ecfdf5',
  },
  {
    key: 'nevrolog',
    uz: 'Nevrolog',
    ru: 'Невролог',
    keywords: ['nevrolog', 'невролог', 'neurolog', 'asab', 'нерв'],
    icon: { lib: 'mci', name: 'brain' },
    gradient: ['#7c3aed', '#c084fc'],
    softBg: '#ede9fe',
  },
  {
    key: 'oftalmolog',
    uz: 'Oftalmolog',
    ru: 'Офтальмолог',
    keywords: ['oftalmolog', 'офтальмолог', 'окулист', "ko'z", 'глаз', 'eye'],
    icon: { lib: 'ion', name: 'eye' },
    gradient: ['#6366f1', '#a78bfa'],
    softBg: '#e0e7ff',
  },
  {
    key: 'ginekolog',
    uz: 'Ginekolog',
    ru: 'Гинеколог',
    keywords: ['ginekolog', 'гинеколог', 'gynecolog', 'akusher'],
    icon: { lib: 'ion', name: 'female' },
    gradient: ['#db2777', '#f472b6'],
    softBg: '#fce7f3',
  },
  {
    key: 'urolog',
    uz: 'Urolog',
    ru: 'Уролог',
    keywords: ['urolog', 'уролог'],
    icon: { lib: 'mci', name: 'hospital-marker' },
    gradient: ['#0d9488', '#2dd4bf'],
    softBg: '#ccfbf1',
  },
  {
    key: 'endokrinolog',
    uz: 'Endokrinolog',
    ru: 'Эндокринолог',
    keywords: ['endokrinolog', 'эндокринолог', 'diabet', 'qand', 'сахар'],
    icon: { lib: 'mci', name: 'water-check' },
    gradient: ['#ca8a04', '#facc15'],
    softBg: '#fef9c3',
  },
  {
    key: 'gastroenterolog',
    uz: 'Gastroenterolog',
    ru: 'Гастроэнтеролог',
    keywords: ['gastroenterolog', 'гастроэнтеролог', 'oshqozon', 'желуд'],
    icon: { lib: 'mci', name: 'stomach' },
    gradient: ['#ea580c', '#fdba74'],
    softBg: '#ffedd5',
  },
  {
    key: 'lor',
    uz: 'LOR',
    ru: 'ЛОР',
    keywords: ['lor', 'лор', 'otolaringolog', 'отоларинголог', 'quloq', 'tomoq'],
    icon: { lib: 'mci', name: 'ear-hearing' },
    gradient: ['#0284c7', '#38bdf8'],
    softBg: '#e0f2fe',
  },
  {
    key: 'travmatolog',
    uz: 'Travmatolog',
    ru: 'Травматолог',
    keywords: ['travmatolog', 'травматолог', 'ортопед', 'orthoped'],
    icon: { lib: 'mci', name: 'bone' },
    gradient: ['#475569', '#94a3b8'],
    softBg: '#f1f5f9',
  },
  {
    key: 'psixolog',
    uz: 'Psixolog',
    ru: 'Психолог',
    keywords: ['psixolog', 'психолог', 'psycholog', 'психиат'],
    icon: { lib: 'mci', name: 'head-heart-outline' },
    gradient: ['#9333ea', '#e879f9'],
    softBg: '#fae8ff',
  },
  {
    key: 'dietolog',
    uz: 'Dietolog',
    ru: 'Диетолог',
    keywords: ['dietolog', 'диетолог', 'nutrition', 'ovqat'],
    icon: { lib: 'mci', name: 'food-apple-outline' },
    gradient: ['#e11d48', '#fb7185'],
    softBg: '#ffe4e6',
  },
  {
    key: 'kosmetolog',
    uz: 'Kosmetolog',
    ru: 'Косметолог',
    keywords: ['kosmetolog', 'косметолог', 'cosmet'],
    icon: { lib: 'mci', name: 'lipstick' },
    gradient: ['#ec4899', '#f9a8d4'],
    softBg: '#fce7f3',
  },
  {
    key: 'gemostazilog',
    uz: 'Gemostazilog',
    ru: 'Гемостазиолог',
    keywords: ['gemostazilog', 'гемостазиолог', 'gemostaz'],
    icon: { lib: 'mci', name: 'blood-bag' },
    gradient: ['#b91c1c', '#f87171'],
    softBg: '#fee2e2',
  },
  {
    key: 'ped_nefrolog',
    uz: 'Bolalar nefrologi',
    ru: 'Детский нефролог',
    keywords: ['bolalar nefrolog', 'детский нефролог', 'pediatr nefrolog', 'nefrolog'],
    icon: { lib: 'mci', name: 'water-outline' },
    gradient: ['#0e7490', '#67e8f9'],
    softBg: '#cffafe',
  },
  {
    key: 'ped_stomatolog',
    uz: 'Bolalar stomatologi',
    ru: 'Детский стоматолог',
    keywords: ['bolalar stomatolog', 'детский стоматолог', 'pediatr stomat'],
    icon: { lib: 'mci', name: 'emoticon-cry-outline' },
    gradient: ['#06b6d4', '#7dd3fc'],
    softBg: '#e0f2fe',
  },
  {
    key: 'koloproktolog',
    uz: 'Koloproktolog',
    ru: 'Колопроктолог',
    keywords: ['koloproktolog', 'колопроктолог', 'proktolog', 'проктолог'],
    icon: { lib: 'mci', name: 'hospital-box-outline' },
    gradient: ['#4b5563', '#9ca3af'],
    softBg: '#f3f4f6',
  },
  {
    key: 'manual_terapevt',
    uz: 'Manual terapevt',
    ru: 'Мануальный терапевт',
    keywords: ['manual', 'мануальн', 'massaj', 'массаж', 'osteopat'],
    icon: { lib: 'mci', name: 'hand-back-right-outline' },
    gradient: ['#1d4ed8', '#93c5fd'],
    softBg: '#dbeafe',
  },
];

export function getDoctorSpecialty(key: string): DoctorSpecialty | undefined {
  return DOCTOR_SPECIALTIES.find((s) => s.key === key);
}

export function specialtyDisplayName(s: DoctorSpecialty, language: string | null): string {
  return language === 'ru' ? s.ru : s.uz;
}

export function filterDoctorSpecialties(query: string, language: string | null): DoctorSpecialty[] {
  const q = query.trim().toLowerCase();
  if (!q) return DOCTOR_SPECIALTIES;
  return DOCTOR_SPECIALTIES.filter((s) => {
    const label = specialtyDisplayName(s, language).toLowerCase();
    if (label.includes(q)) return true;
    return s.keywords.some((k) => k.toLowerCase().includes(q) || q.includes(k.toLowerCase()));
  });
}

export function doctorSpecialtyMatches(doctorSpec: string, specialty: DoctorSpecialty): boolean {
  const a = (doctorSpec ?? '').trim().toLowerCase();
  if (!a) return false;
  return specialty.keywords.some((k) => {
    const key = k.toLowerCase();
    return key.length >= 2 && (a.includes(key) || key.includes(a));
  });
}

export function SpecialtyIconView({
  icon,
  size,
  color,
}: {
  icon: SpecialtyIcon;
  size: number;
  color: string;
}) {
  if (icon.lib === 'mci') {
    return <MaterialCommunityIcons name={icon.name} size={size} color={color} />;
  }
  return <Ionicons name={icon.name} size={size} color={color} />;
}
