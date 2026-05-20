import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useThemeStore } from '../store/theme-store';
import { getColors } from '../lib/theme';
import { useAuthStore } from '../store/auth-store';
import {
  getClinicsList,
  getClinicDetail,
  createAiConversation,
  addAiConversationMessage,
  submitAiConversationFeedback,
  getDoctorSlotsBySpecialty,
  type DoctorSlotBySpecialty,
} from '../lib/api';

const SAMPLE_QUESTIONS = [
  {
    title: "Zodak haqida ma'lumot",
    subtitle: "Dori vositalari bo'yicha yo'riqnomalarni oling"
  },
  {
    title: "Bosh og'rig'i",
    subtitle: "Sabablari va uy sharoitida davolash"
  },
  {
    title: "Tish og'rig'i",
    subtitle: "Tezkor yordam va maslahatlar"
  }
];

type DoctorSuggestion = {
  doctorId: string;
  clinicId: string;
  doctorName: string;
  specialty: string;
  avatarUrl: string | null;
  clinicName: string;
  address: string;
  ratingAvg: number;
  reviewsCount: number;
};

type DoctorOffer = {
  specialtyKey: string;
  specialtyLabel: string;
};

type ChatMessageItem = {
  role: string;
  content: string;
  doctors?: DoctorSuggestion[];
  slots?: DoctorSlotBySpecialty[];
  /** Shown after an answer — user taps to load doctors (not auto-loaded). */
  doctorOffer?: DoctorOffer;
  doctorsLoading?: boolean;
};

export type ChatSession = {
  id: string;
  backendConversationId?: string;
  title: string;
  date: number;
  messages: ChatMessageItem[];
};

const CHAT_HISTORY_KEY = '@shifoyol_chat_history';
const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=120&h=120&fit=crop';

function buildAddress(city?: string, street?: string) {
  return [city, street].filter(Boolean).join(', ');
}

/** User explicitly asks to see / book a doctor (not generic "maslahat" / info questions). */
const USER_EXPLICIT_DOCTOR_RX =
  /(shifokorlarni|mutaxassislarni|qaysi shifokor|qaysi doktor|qaysi doctor|qaysi mutaxassis|kaysi doxtir|kayci doxtir|kaysi doctor|shifokorga bor|shifokorga bori|qaysi doctorga|кайси дохтир|к какому доктору|к какому врачу|кому (из )?врач|врач(а|у|ом|ей)? (нужен|нужна|надо|идти)|доктор(а|у|ом)? (нужен|нужна|надо|идти)|показать врач|покажи врач|ko['']rsat|ko'rsating|beri shifokor|shifokor kerak|shifokorga|врач(а|у|ом)?|доктор(а|у)?|записаться|записат|записываться|qabulga|bron qil|navbat|приём|прием|appointment|book.*doctor|klinikaga)/i;

const USER_AFFIRMATIVE_RX =
  /^(ha|haa|yes|da|ok|okay|albatta|xo['']sh|xo‘sh|kerak|хочу|давай|можно|bo['']ladi)\b|^(ha|yes|da)[\s,.!]*$/i;

const USER_NEGATIVE_RX =
  /^(yo['']?q|yok|йок|yoq|нет|no|kerak emas|hohlamayman|не надо|не нужно)\b/i;

const SPECIALTY_LABELS: Record<string, { uz: string; ru: string }> = {
  stomatolog: { uz: 'Stomatolog', ru: 'Стоматолог' },
  lor: { uz: 'LOR', ru: 'ЛОР' },
  nevrolog: { uz: 'Nevrolog', ru: 'Невролог' },
  kardiolog: { uz: 'Kardiolog', ru: 'Кардиолог' },
  ginekolog: { uz: 'Ginekolog', ru: 'Гинеколог' },
  pediatr: { uz: 'Pediatr', ru: 'Педиатр' },
  dermatolog: { uz: 'Dermatolog', ru: 'Дерматолог' },
  oftalmolog: { uz: 'Oftalmolog', ru: 'Офтальмолог' },
  urolog: { uz: 'Urolog', ru: 'Уролог' },
  endokrinolog: { uz: 'Endokrinolog', ru: 'Эндокринолог' },
  gastroenterolog: { uz: 'Gastroenterolog', ru: 'Гастроэнтеролог' },
  travmatolog: { uz: 'Travmatolog', ru: 'Травматолог' },
  psixolog: { uz: 'Psixolog', ru: 'Психолог' },
  terapevt: { uz: 'Terapevt', ru: 'Терапевт' },
};

function specialtyLabel(key: string, isUz: boolean): string {
  const row = SPECIALTY_LABELS[key];
  if (!row) return key;
  return isUz ? row.uz : row.ru;
}

const SPECIALTY_HINTS: Array<{ key: string; rx: RegExp; aliases: string[] }> = [
  { key: 'stomatolog', rx: /(stomatolog|стоматолог|dentist|dental|tish|зуб)/i, aliases: ['stomatolog', 'стоматолог', 'dentist', 'dental', 'tish', 'зуб'] },
  { key: 'lor', rx: /(\blor\b|\bлор\b|otolaringolog|otorhinolaryngolog|ent doctor|ear,? nose|tomoq|quloq)/i, aliases: ['lor', 'лор', 'отоларинголог', 'otolaringolog'] },
  { key: 'nevrolog', rx: /(nevrolog|невролог|neurolog|asab|нерв)/i, aliases: ['nevrolog', 'невролог', 'neurolog'] },
  { key: 'kardiolog', rx: /(kardiolog|кардиолог|cardiolog|yurak|сердц|heart)/i, aliases: ['kardiolog', 'кардиолог', 'cardiolog'] },
  { key: 'ginekolog', rx: /(ginekolog|гинеколог|gynecolog|gynaecolog)/i, aliases: ['ginekolog', 'гинеколог', 'gynecolog'] },
  { key: 'pediatr', rx: /(pediatr|педиатр|pediatric|bola(lar)?)/i, aliases: ['pediatr', 'педиатр', 'pediatric'] },
  { key: 'dermatolog', rx: /(dermatolog|дерматолог|dermatolog|teri)/i, aliases: ['dermatolog', 'дерматолог'] },
  { key: 'oftalmolog', rx: /(oftalmolog|офтальмолог|окулист|ophthalmolog|ko'z|глаз|eye)/i, aliases: ['oftalmolog', 'офтальмолог', 'окулист', 'ophthalmolog', "ko'z", 'глаз'] },
  { key: 'urolog', rx: /(urolog|уролог|urolog)/i, aliases: ['urolog', 'уролог'] },
  { key: 'endokrinolog', rx: /(endokrinolog|эндокринолог|endocrinolog|qand|сахар|diabet)/i, aliases: ['endokrinolog', 'эндокринолог', 'endocrinolog'] },
  { key: 'gastroenterolog', rx: /(gastroenterolog|гастроэнтеролог|gastroenterolog|oshqozon|желуд)/i, aliases: ['gastroenterolog', 'гастроэнтеролог'] },
  { key: 'travmatolog', rx: /(travmatolog|травматолог|orthopedi|ортопед|сустав|kostochka)/i, aliases: ['travmatolog', 'травматолог', 'ортопед', 'orthopedi'] },
  { key: 'psixolog', rx: /(psixolog|психолог|psycholog|psychiat)/i, aliases: ['psixolog', 'психолог', 'psycholog', 'психиат'] },
  { key: 'terapevt', rx: /(terapevt|терапевт|therapist|family doctor|общий врач|общая практик)/i, aliases: ['terapevt', 'терапевт', 'therapist', 'family'] },
];

function pickSpecialtyFromUserQuery(query: string): { key: string; aliases: string[] } | null {
  const text = query.toLowerCase();
  const concrete = SPECIALTY_HINTS.find((x) => x.rx.test(text));
  if (concrete) return { key: concrete.key, aliases: concrete.aliases };
  if (USER_EXPLICIT_DOCTOR_RX.test(text)) {
    const fallback = SPECIALTY_HINTS.find((x) => x.key === 'terapevt');
    return fallback ? { key: fallback.key, aliases: fallback.aliases } : null;
  }
  return null;
}

/** Whether we may show an opt-in "see doctors" button after this user question. */
function inferDoctorOfferForQuery(query: string, isUz: boolean): DoctorOffer | null {
  const text = query.trim().toLowerCase();
  if (text.length < 2) return null;

  const fromUser = pickSpecialtyFromUserQuery(query);
  if (fromUser) {
    return { specialtyKey: fromUser.key, specialtyLabel: specialtyLabel(fromUser.key, isUz) };
  }

  if (/(og['']ri|ogriq|болит|боль|bezovta|alamat|tushkun|shish|issiq|simptom)/i.test(text)) {
    return { specialtyKey: 'terapevt', specialtyLabel: specialtyLabel('terapevt', isUz) };
  }
  if (/(dori|preparat|tabletka|kapsula|zodak|лекарств|препарат|antibiotik)/i.test(text)) {
    return { specialtyKey: 'terapevt', specialtyLabel: specialtyLabel('terapevt', isUz) };
  }
  if (/(davolanish|davolash|nima qil|что делать|yordam kerak)/i.test(text)) {
    return { specialtyKey: 'terapevt', specialtyLabel: specialtyLabel('terapevt', isUz) };
  }
  return null;
}

function userWantsDoctorList(query: string): boolean {
  const t = query.trim();
  if (USER_NEGATIVE_RX.test(t)) return false;
  return USER_AFFIRMATIVE_RX.test(t) || USER_EXPLICIT_DOCTOR_RX.test(t);
}

function findLastDoctorOffer(msgs: ChatMessageItem[]): DoctorOffer | null {
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    if (m.role === 'assistant' && m.doctorOffer) return m.doctorOffer;
  }
  return null;
}

function buildAiSystemPrompt(isUz: boolean): string {
  if (isUz) {
    return [
      "Siz ShifoYo'l ilovasining AI tibbiy maslahatchisiz.",
      "MUHIM: Faqat o'zbek tilida javob bering. Faqat LOTIN yozuvidan foydalaning — kirill yoki rus tilini ishlatmang, til aralashtirmang.",
      "Foydalanuvchi rus yoki kirill yozsa ham, javob doimo o'zbek lotinida bo'lsin (masalan: ari, o'sa emas).",
      'FORMAT (salomatlik / alomat / dori savollariga):',
      '1) Bir qator qisqa kirish.',
      '2) Aniq maslahatlar raqamlangan: 1. ... 2. ... 3. ... (kerak bo\'lsa 4–5 gacha).',
      "3) Oxirida bitta jumla: Agar yaxshilanish bo'lmasa yoki holat og'irlashsa, shifokorga murojaat qiling.",
      'QOIDALAR:',
      '- Qisqa, sodda, tushunarli — ortiqcha matn yo\'q.',
      '- Birinchi navbatda savolga to\'g\'ridan-to\'g\'ri javob bering.',
      '- Shifokor ismlari, klinika nomlari yoki navbatlarni ro\'yxatlamang.',
      '- Har javobda shifokorga borishni majburlamang; faqat oxirgi jumlada ogohlantiring.',
      '- Dori haqida so\'ralsa: vazifasi, qanday qabul qilish, ehtiyot choralari.',
      '- Faqat qaysi mutaxassis kerakligi so\'ralganda, qisqa qilib bitta mutaxassis nomini ayting (masalan terapevt).',
    ].join(' ');
  }
  return [
    'Вы — AI медицинский помощник приложения ShifoYol.',
    'Отвечайте только на русском языке. Не смешивайте языки.',
    'ФОРМАТ:',
    '1) Короткое вступление.',
    '2) Нумерованный список: 1. ... 2. ... 3. ...',
    '3) В конце одна фраза: Если улучшения нет или состояние ухудшается, обратитесь к врачу.',
    'Не перечисляйте врачей и клиники — приложение предложит это отдельно.',
    'Пишите кратко и понятно.',
  ].join(' ');
}

async function findDoctorSuggestionsBySpecialty(specialtyKey: string): Promise<DoctorSuggestion[]> {
  const wanted = SPECIALTY_HINTS.find((x) => x.key === specialtyKey);
  if (!wanted) return [];

  const clinics = await getClinicsList(80);
  const details = await Promise.allSettled(clinics.slice(0, 18).map((c) => getClinicDetail(c.id)));
  const out: DoctorSuggestion[] = [];

  for (const res of details) {
    if (res.status !== 'fulfilled') continue;
    const clinic = res.value;
    const doctors = clinic.doctors?.filter((d) => d.isActive) ?? [];
    for (const d of doctors) {
      const specialty = (d.specialty ?? '').toLowerCase();
      const matches = wanted.aliases.some((a) => specialty.includes(a.toLowerCase()));
      if (!matches) continue;
      const branch = clinic.branches.find((b) => d.branchIds?.includes(b._id) && b.isActive) ?? clinic.branches[0];
      const address = branch ? buildAddress(branch.address?.city, branch.address?.street) : '';
      out.push({
        doctorId: d._id,
        clinicId: clinic._id,
        doctorName: d.fullName,
        specialty: d.specialty,
        avatarUrl: d.avatarUrl ?? null,
        clinicName: clinic.clinicDisplayName,
        address,
        ratingAvg: clinic.rating?.avg ?? 0,
        reviewsCount: clinic.rating?.count ?? 0,
      });
    }
  }

  const dedup = new Map<string, DoctorSuggestion>();
  for (const item of out) {
    const key = `${item.clinicId}:${item.doctorId}`;
    if (!dedup.has(key)) dedup.set(key, item);
  }
  // Sort by rating so best clinics surface first when we fall back to terapevt.
  const sorted = [...dedup.values()].sort((a, b) => (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0));
  return sorted.slice(0, 8);
}

async function fetchDoctorsAndSlots(
  specialtyKey: string,
  dateContextQuery: string,
): Promise<{ doctors: DoctorSuggestion[]; slots: DoctorSlotBySpecialty[] }> {
  const doctors = await findDoctorSuggestionsBySpecialty(specialtyKey).catch(() => []);
  let slots: DoctorSlotBySpecialty[] = [];
  const slotDate = pickSlotDate(dateContextQuery, '');
  try {
    const res = await getDoctorSlotsBySpecialty({ specialty: specialtyKey, date: slotDate, limit: 8 });
    slots = res.slots ?? [];
  } catch {
    slots = [];
  }
  return { doctors, slots };
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function tomorrowDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatDate(d);
}

function todayDateStr(): string {
  return formatDate(new Date());
}

// Pick the date the user is asking about. Falls back to tomorrow.
function pickSlotDate(query: string, aiAnswer: string): string {
  const text = `${query} ${aiAnswer}`.toLowerCase();
  if (/(сегодня|bugun|today)/i.test(text)) return todayDateStr();
  if (/(завтра|ertaga|tomorrow)/i.test(text)) return tomorrowDateStr();
  // Day-after-tomorrow ("indinga", "послезавтра", etc.)
  if (/(послезавтра|indinga|day after tomorrow)/i.test(text)) {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return formatDate(d);
  }
  return tomorrowDateStr();
}

export default function AiChatScreen() {
  const router = useRouter();
  const { initialMessage } = useLocalSearchParams<{ initialMessage?: string }>();
  const theme = useThemeStore((s: any) => s.theme);
  const language = useAuthStore((s: any) => s.language) ?? 'uz';
  const colors = getColors(theme);
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [pendingFeedbackConversationId, setPendingFeedbackConversationId] = useState<string | null>(null);
  const feedbackShownForConvId = useRef<string | null>(null);
  const initialMessageHandled = useRef(false);

  const isUz = language === 'uz';

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
      if (data) setSessions(JSON.parse(data));
    } catch {}
  };

  const saveSessions = async (newSessions: ChatSession[]) => {
    setSessions(newSessions);
    try {
      await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(newSessions));
    } catch {}
  };

  const startNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setHistoryModalVisible(false);
  };

  const onCloseFeedback = async () => {
    if (!pendingFeedbackConversationId) {
      setFeedbackModalVisible(false);
      return;
    }
    try {
      await submitAiConversationFeedback(pendingFeedbackConversationId, {
        rating: 5,
        dismissed: true,
      });
    } catch {}
    setFeedbackModalVisible(false);
    setPendingFeedbackConversationId(null);
  };

  const onSubmitFeedback = async () => {
    if (!pendingFeedbackConversationId) return;
    try {
      await submitAiConversationFeedback(pendingFeedbackConversationId, {
        rating: feedbackRating < 1 ? 5 : feedbackRating,
        feedbackText: feedbackText.trim() || undefined,
      });
    } catch {}
    setFeedbackModalVisible(false);
    setPendingFeedbackConversationId(null);
    setFeedbackText('');
    setFeedbackRating(5);
  };

  const loadPastChat = (session: ChatSession) => {
    setActiveSessionId(session.id);
    setMessages(session.messages);
    setHistoryModalVisible(false);
  };

  const deleteChat = async (id: string) => {
    const fresh = sessions.filter(s => s.id !== id);
    if (activeSessionId === id) {
      setActiveSessionId(null);
      setMessages([]);
    }
    await saveSessions(fresh);
  };

  const persistMessages = (sessionId: string | null, nextMessages: ChatMessageItem[], sessionList: ChatSession[]) => {
    setMessages(nextMessages);
    if (!sessionId) return;
    const updatedList = [...sessionList];
    const idx = updatedList.findIndex((s) => s.id === sessionId);
    if (idx !== -1) {
      updatedList[idx].messages = nextMessages;
      saveSessions(updatedList);
    }
  };

  const showDoctorsForAssistantMessage = async (
    assistantIndex: number,
    offer: DoctorOffer,
    baseMessages: ChatMessageItem[],
    sessionId: string | null,
    sessionList: ChatSession[],
    dateContextQuery: string,
  ): Promise<ChatMessageItem[]> => {
    const loadingMessages = baseMessages.map((m, i) =>
      i === assistantIndex ? { ...m, doctorsLoading: true, doctorOffer: offer } : m,
    );
    persistMessages(sessionId, loadingMessages, sessionList);

    const { doctors, slots } = await fetchDoctorsAndSlots(offer.specialtyKey, dateContextQuery);
    const doneMessages = loadingMessages.map((m, i) =>
      i === assistantIndex
        ? { ...m, doctors, slots, doctorsLoading: false, doctorOffer: doctors.length > 0 ? undefined : offer }
        : m,
    );
    persistMessages(sessionId, doneMessages, sessionList);
    return doneMessages;
  };

  const sendMessage = async (text: string) => {
    const val = text.trim();
    if (!val || loading) return;

    let currentSessionId = activeSessionId;
    let currentSessions = [...sessions];
    
    // Create new session if no active session
    if (!currentSessionId) {
      currentSessionId = Date.now().toString();
      setActiveSessionId(currentSessionId);
      let backendConversationId: string | undefined;
      try {
        const conv = await createAiConversation(val.substring(0, 90));
        backendConversationId = conv._id;
      } catch {}
      const newSession: ChatSession = {
        id: currentSessionId,
        backendConversationId,
        title: val.substring(0, 30) + (val.length > 30 ? '...' : ''),
        date: Date.now(),
        messages: [],
      };
      currentSessions = [newSession, ...currentSessions];
    }

    const sessionIndex = currentSessions.findIndex(s => s.id === currentSessionId);
    if (sessionIndex === -1) return;

    const newMessages: ChatMessageItem[] = [...messages, { role: 'user', content: val }];
    setMessages(newMessages);
    setInputText('');
    setLoading(true);

    currentSessions[sessionIndex].messages = newMessages;
    saveSessions(currentSessions);
    if (currentSessions[sessionIndex].backendConversationId) {
      addAiConversationMessage(currentSessions[sessionIndex].backendConversationId as string, 'user', val).catch(() => null);
    }

    // User agreed to see doctors — load list without another AI reply.
    if (userWantsDoctorList(val) && messages.length > 0) {
      const offer = findLastDoctorOffer(messages);
      const explicit = pickSpecialtyFromUserQuery(val);
      const specialtyKey = explicit?.key ?? offer?.specialtyKey;
      if (specialtyKey) {
        const assistantIndex = messages.length - 1;
        const prevAssistant = messages[assistantIndex];
        if (prevAssistant?.role === 'assistant') {
          const resolvedOffer: DoctorOffer = offer ?? {
            specialtyKey,
            specialtyLabel: specialtyLabel(specialtyKey, isUz),
          };
          setLoading(false);
          await showDoctorsForAssistantMessage(
            assistantIndex,
            resolvedOffer,
            newMessages,
            currentSessionId,
            currentSessions,
            val,
          );
          return;
        }
      }
    }

    try {
      const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      if (!apiKey) {
        setMessages((prev) => [...prev, { role: 'assistant', content: isUz ? 'API kalit topilmadi.' : 'API ключ не найден.' }]);
        return;
      }

      const systemPrompt = buildAiSystemPrompt(isUz);

      const payload = {
        model: 'gpt-4o-mini',
        temperature: 0.35,
        messages: [
          { role: 'system', content: systemPrompt },
          ...newMessages,
        ],
      };

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      let finalMessages: ChatMessageItem[] = newMessages;
      if (data.choices && data.choices[0]) {
        const answer = String(data.choices[0].message.content ?? '');
        const doctorOffer = inferDoctorOfferForQuery(val, isUz) ?? undefined;
        const explicitDoctorAsk = USER_EXPLICIT_DOCTOR_RX.test(val) || pickSpecialtyFromUserQuery(val);

        if (explicitDoctorAsk) {
          const offer = doctorOffer ?? {
            specialtyKey: pickSpecialtyFromUserQuery(val)?.key ?? 'terapevt',
            specialtyLabel: specialtyLabel(pickSpecialtyFromUserQuery(val)?.key ?? 'terapevt', isUz),
          };
          const assistantMsg: ChatMessageItem = { role: 'assistant', content: answer, doctorOffer: offer };
          finalMessages = [...newMessages, assistantMsg];
          const assistantIndex = finalMessages.length - 1;
          if (currentSessions[sessionIndex]?.backendConversationId) {
            addAiConversationMessage(
              currentSessions[sessionIndex].backendConversationId as string,
              'assistant',
              answer,
            ).catch(() => null);
          }
          finalMessages = await showDoctorsForAssistantMessage(
            assistantIndex,
            offer,
            finalMessages,
            currentSessionId,
            currentSessions,
            val,
          );
        } else {
          finalMessages = [
            ...newMessages,
            {
              role: 'assistant',
              content: answer,
              ...(doctorOffer ? { doctorOffer } : {}),
            },
          ];
          if (currentSessions[sessionIndex]?.backendConversationId) {
            addAiConversationMessage(
              currentSessions[sessionIndex].backendConversationId as string,
              'assistant',
              answer,
            ).catch(() => null);
          }
        }
      } else {
        finalMessages = [...newMessages, { role: 'assistant', content: 'Kechirasiz, xatolik yuz berdi.' }];
      }
      setMessages(finalMessages);
      
      const updatedList = [...currentSessions];
      const idx = updatedList.findIndex(s => s.id === currentSessionId);
      if (idx !== -1) {
         updatedList[idx].messages = finalMessages;
         saveSessions(updatedList);
         const userMessageCount = finalMessages.filter((x) => x.role === 'user').length;
         const conversationId = updatedList[idx].backendConversationId ?? null;
         if (
           conversationId &&
           userMessageCount >= 3 &&
           feedbackShownForConvId.current !== conversationId
         ) {
           feedbackShownForConvId.current = conversationId;
           setFeedbackRating(5);
           setFeedbackText('');
           setPendingFeedbackConversationId(conversationId);
           setTimeout(() => setFeedbackModalVisible(true), 400);
         }
      }

    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: isUz
            ? "Kechirasiz, hozir javob bera olmadim. Qayta urinib ko'ring."
            : 'Извините, сейчас не удалось ответить. Попробуйте ещё раз.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialMessageHandled.current) return;
    const raw = initialMessage;
    if (!raw || typeof raw !== 'string') return;
    const msg = raw.trim();
    if (!msg) return;
    initialMessageHandled.current = true;
    setActiveSessionId(null);
    setMessages([]);
    void sendMessage(msg);
    router.setParams({ initialMessage: '' });
  }, [initialMessage]);

  return (
    <>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} hitSlop={15}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isUz ? 'AI maslahatchi' : 'ИИ Консультант'}
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity 
             style={styles.headerBtn} 
             hitSlop={10}
             onPress={() => setHistoryModalVisible(true)}
          >
            <Ionicons name="chatbubbles-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 56 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          {messages.length === 0 ? (
            <>
              {/* Greeting Area */}
              <View style={styles.greetingContainer}>
                <Text style={[styles.greetingTitle, { color: colors.text }]}>
                  {isUz ? 'Assalomu alaykum,' : 'Здравствуйте,'}
                </Text>
                <Text style={[styles.greetingSubtitle, { color: colors.textSecondary }]}>
                  {isUz ? 'Sizni nima bezovta qilmoqda?' : 'Что вас беспокоит?'}
                </Text>
              </View>

              {/* Sample Questions (Horizontal scroll) */}
              <View style={styles.samplesWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.samplesScrollContainer}>
                  {SAMPLE_QUESTIONS.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.sampleCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                      activeOpacity={0.7}
                      onPress={() => {
                        setInputText(item.title);
                        sendMessage(item.title);
                      }}
                    >
                      <Text style={[styles.sampleTitle, { color: colors.text }]}>{item.title}</Text>
                      <Text style={[styles.sampleSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
                        {item.subtitle}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </>
          ) : (
            <View style={styles.chatContainer}>
              {messages.map((msg, i) => (
                <View key={i} style={[
                  styles.messageRow,
                  msg.role === 'user' ? styles.messageUserRow : styles.messageBotRow
                ]}>
                  <View style={{ maxWidth: '94%' }}>
                    <View style={[
                      styles.messageBubble,
                      msg.role === 'user'
                        ? [styles.messageUser, { backgroundColor: colors.primary }]
                        : [styles.messageBot, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]
                    ]}>
                      <Text style={[
                        styles.messageText,
                        { color: msg.role === 'user' ? '#fff' : colors.text }
                      ]}>
                        {msg.content}
                      </Text>
                    </View>
                    {msg.role === 'assistant' && msg.doctorOffer && (!msg.doctors || msg.doctors.length === 0) ? (
                      <TouchableOpacity
                        style={[styles.doctorOfferBtn, { backgroundColor: colors.backgroundCard, borderColor: colors.primary }]}
                        activeOpacity={0.85}
                        disabled={msg.doctorsLoading || loading}
                        onPress={() => {
                          const lastUser = messages
                            .slice(0, i)
                            .reverse()
                            .find((m) => m.role === 'user');
                          void showDoctorsForAssistantMessage(
                            i,
                            msg.doctorOffer!,
                            messages,
                            activeSessionId,
                            sessions,
                            lastUser?.content ?? '',
                          );
                        }}
                      >
                        {msg.doctorsLoading ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <>
                            <Ionicons name="medical-outline" size={20} color={colors.primary} />
                            <Text style={[styles.doctorOfferBtnText, { color: colors.primary }]}>
                              {isUz
                                ? `${msg.doctorOffer.specialtyLabel} shifokorlarini ko‘rishni xohlaysizmi?`
                                : `Показать врачей: ${msg.doctorOffer.specialtyLabel}?`}
                            </Text>
                            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                          </>
                        )}
                      </TouchableOpacity>
                    ) : null}
                    {msg.role === 'assistant' && msg.doctors && msg.doctors.length > 0 ? (
                      <View style={{ marginTop: 10, gap: 10 }}>
                        <Text style={[styles.suggestedTitle, { color: colors.text }]}>
                          {isUz ? 'Tavsiya etilgan mutaxassislar' : 'Рекомендованные специалисты'}
                        </Text>
                        {msg.doctors.map((doc) => (
                          <TouchableOpacity
                            key={`${doc.clinicId}:${doc.doctorId}`}
                            style={[styles.doctorCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                            activeOpacity={0.85}
                            onPress={() =>
                              router.push({
                                pathname: '/doctor/[id]',
                                params: { id: doc.doctorId, clinicId: doc.clinicId },
                              })
                            }
                          >
                            <Image source={{ uri: doc.avatarUrl || DEFAULT_AVATAR }} style={styles.doctorAvatar} />
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={[styles.doctorName, { color: colors.text }]} numberOfLines={1}>{doc.doctorName}</Text>
                              <Text style={[styles.doctorSpec, { color: colors.textSecondary }]} numberOfLines={1}>{doc.specialty}</Text>
                              <View style={styles.docMetaRow}>
                                <Ionicons name="star" size={13} color="#f59e0b" />
                                <Text style={[styles.docMetaText, { color: colors.textSecondary }]}>
                                  {doc.ratingAvg.toFixed(1)} · {doc.reviewsCount}
                                </Text>
                              </View>
                              <Text style={[styles.docClinic, { color: colors.text }]} numberOfLines={1}>{doc.clinicName}</Text>
                              <Text style={[styles.docAddr, { color: colors.textTertiary }]} numberOfLines={1}>{doc.address}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : null}
                    {msg.role === 'assistant' && msg.slots && msg.slots.length > 0 ? (
                      <View style={{ marginTop: 12 }}>
                        <Text style={[styles.suggestedTitle, { color: colors.text }]}>
                          {(() => {
                            const slotDate = msg.slots[0]?.date;
                            const today = todayDateStr();
                            const tomorrow = tomorrowDateStr();
                            const dayLabel =
                              slotDate === today
                                ? isUz ? 'Bugun' : 'сегодня'
                                : slotDate === tomorrow
                                ? isUz ? 'Ertaga' : 'завтра'
                                : slotDate ?? '';
                            return isUz
                              ? `${dayLabel} bo‘sh vaqtlar`
                              : `Свободные слоты на ${dayLabel}`;
                          })()}
                        </Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
                        >
                          {msg.slots.map((s) => (
                            <TouchableOpacity
                              key={`${s.clinicId}:${s.serviceId}:${s.doctorId}:${s.date}:${s.time}`}
                              style={[styles.slotChip, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                              activeOpacity={0.85}
                              onPress={() =>
                                router.push({
                                  pathname: '/book',
                                  params: {
                                    clinicId: s.clinicId,
                                    serviceId: s.serviceId,
                                    doctorId: s.doctorId,
                                    date: s.date,
                                    time: s.time,
                                  },
                                })
                              }
                            >
                              <Text style={styles.slotChipTime}>{s.time}</Text>
                              <Text style={styles.slotChipName} numberOfLines={1}>
                                {s.doctorName}
                              </Text>
                              <Text style={styles.slotChipClinic} numberOfLines={1}>
                                {s.clinicName}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    ) : null}
                  </View>
                </View>
              ))}
              {loading && (
                <View style={[styles.messageRow, styles.messageBotRow]}>
                  <View style={[styles.messageBubble, styles.messageBot, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                </View>
              )}
            </View>
          )}

          <View style={{ height: 20 }} />

        </ScrollView>

        {/* Bottom Input Area */}
        <View style={[styles.inputContainer, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={[styles.inputWrapper, { backgroundColor: colors.backgroundInput, borderColor: colors.border }]}>
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              placeholder={isUz ? "Biror narsa so'rang" : "Спросите что-нибудь"}
              placeholderTextColor={colors.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={200}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: inputText.trim() && !loading ? colors.primary : colors.border }
              ]}
              disabled={!inputText.trim() || loading}
              onPress={() => sendMessage(inputText)}
            >
              <Ionicons name="arrow-up" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* History Modal */}
      <Modal
        visible={historyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {isUz ? 'Suhbatlar tarixi' : 'История чатов'}
              </Text>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.newChatBtn, { backgroundColor: colors.primary }]}
              onPress={startNewChat}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.newChatBtnText}>
                {isUz ? 'Yangi suhbat' : 'Новый чат'}
              </Text>
            </TouchableOpacity>

            <ScrollView style={{ marginTop: 16 }} showsVerticalScrollIndicator={false}>
               {sessions.length === 0 ? (
                 <Text style={{ textAlign: 'center', marginTop: 40, color: colors.textTertiary }}>
                   {isUz ? 'Tarix bo\'sh' : 'История пуста'}
                 </Text>
               ) : (
                 sessions.map((sess) => (
                   <TouchableOpacity
                     key={sess.id}
                     style={[styles.historyCard, { backgroundColor: colors.backgroundCard, borderColor: activeSessionId === sess.id ? colors.primary : colors.border }]}
                     onPress={() => loadPastChat(sess)}
                     activeOpacity={0.7}
                   >
                     <View style={{ flex: 1, marginRight: 12 }}>
                       <Text style={[styles.historyTitle, { color: colors.text }]} numberOfLines={1}>
                         {sess.title}
                       </Text>
                       <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 4 }}>
                         {new Date(sess.date).toLocaleDateString()} {new Date(sess.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </Text>
                     </View>
                     <TouchableOpacity hitSlop={10} onPress={() => deleteChat(sess.id)}>
                        <Ionicons name="trash-outline" size={20} color="#FF4D4D" />
                     </TouchableOpacity>
                   </TouchableOpacity>
                 ))
               )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={feedbackModalVisible}
        transparent
        animationType="slide"
        onRequestClose={onCloseFeedback}
      >
        <View style={styles.feedbackOverlay}>
          <View style={[styles.feedbackCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <View style={styles.feedbackHeader}>
              <Text style={[styles.feedbackTitle, { color: colors.text }]}>
                {isUz ? 'AI-botimizning ishini baholang' : 'Оцените работу ИИ-бота'}
              </Text>
              <TouchableOpacity onPress={onCloseFeedback} hitSlop={12}>
                <Ionicons name="close" size={26} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.feedbackSub, { color: colors.textSecondary }]}>
              {isUz ? "Bot qanchalik foydali bo'lganini aytib bering" : 'Насколько полезным был ответ бота?'}
            </Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setFeedbackRating(n)} hitSlop={8}>
                  <Ionicons
                    name={feedbackRating >= n ? 'star' : 'star-outline'}
                    size={38}
                    color={feedbackRating >= n ? '#fbbf24' : '#d4d4d8'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={feedbackText}
              onChangeText={setFeedbackText}
              placeholder={isUz ? 'Izoh (ixtiyoriy)' : 'Комментарий (необязательно)'}
              placeholderTextColor={colors.textTertiary}
              style={[styles.feedbackInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundInput }]}
              multiline
              maxLength={240}
            />
            <TouchableOpacity
              style={[styles.feedbackSubmitBtn, { backgroundColor: colors.primary }]}
              onPress={onSubmitFeedback}
            >
              <Text style={styles.feedbackSubmitText}>{isUz ? 'Yuborish' : 'Отправить'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  greetingContainer: {
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  greetingSubtitle: {
    fontSize: 18,
    fontWeight: '400',
    textAlign: 'center',
  },
  samplesWrapper: {
    marginTop: 'auto',
  },
  samplesScrollContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  sampleCard: {
    width: 220,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'center',
  },
  sampleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  sampleSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 48,
    maxHeight: 120,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingTop: 8,
    paddingBottom: 8,
    marginRight: 10,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  chatContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
  messageRow: {
    width: '100%',
    flexDirection: 'row',
  },
  messageUserRow: {
    justifyContent: 'flex-end',
  },
  messageBotRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  messageUser: {
    borderBottomRightRadius: 4,
  },
  messageBot: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  suggestedTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 2,
  },
  doctorOfferBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  doctorOfferBtnText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  doctorCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  doctorAvatar: { width: 58, height: 58, borderRadius: 29 },
  doctorName: { fontSize: 20, fontWeight: '700' },
  doctorSpec: { marginTop: 2, fontSize: 13, fontWeight: '500' },
  docMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  docMetaText: { fontSize: 12, fontWeight: '600' },
  docClinic: { marginTop: 4, fontSize: 13, fontWeight: '600' },
  docAddr: { marginTop: 2, fontSize: 12 },
  slotChip: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 132,
    maxWidth: 200,
  },
  slotChipTime: { color: '#fff', fontSize: 17, fontWeight: '800' },
  slotChipName: { color: 'rgba(255,255,255,0.95)', fontSize: 13, fontWeight: '600', marginTop: 4 },
  slotChipClinic: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
    height: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    gap: 8,
  },
  newChatBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  feedbackOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  feedbackCard: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 26,
    gap: 12,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  feedbackTitle: {
    flex: 1,
    fontSize: 19,
    fontWeight: '800',
  },
  feedbackSub: {
    fontSize: 16,
    lineHeight: 22,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8,
  },
  feedbackInput: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 72,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  feedbackSubmitBtn: {
    marginTop: 2,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackSubmitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
