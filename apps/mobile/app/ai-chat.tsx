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
import { useRouter } from 'expo-router';
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

type ChatMessageItem = {
  role: string;
  content: string;
  doctors?: DoctorSuggestion[];
  slots?: DoctorSlotBySpecialty[];
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

// Patterns that indicate the user wants to see a doctor / book / take tests, even
// when no specific specialty is mentioned. In that case we fall back to terapevt.
const GENERIC_DOCTOR_RX =
  /(врач(а|у|ом)?|доктор(а|у)?|приём|прием|записаться|записат|записываться|клиник|поликлиник|медцентр|больниц|медицинск|лаборатор|анализ|обследован|консультац|осмотр|check[- ]?up|appointment|book|doctor|clinic|hospital|test|lab|shifokor|qabul|tibbiy|tahlil|tekshir|bron|navbat|maslahat)/i;

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

function pickSpecialty(query: string, aiAnswer: string): { key: string; aliases: string[] } | null {
  const text = `${query} ${aiAnswer}`.toLowerCase();
  // 1) Try to find a concrete specialty mentioned anywhere.
  const concrete = SPECIALTY_HINTS.find((x) => x.rx.test(text));
  if (concrete) return { key: concrete.key, aliases: concrete.aliases };
  // 2) Otherwise, if the user is clearly asking to see a doctor / book / take tests,
  //    fall back to a general practitioner (terapevt) so we still surface options.
  if (GENERIC_DOCTOR_RX.test(text)) {
    const fallback = SPECIALTY_HINTS.find((x) => x.key === 'terapevt');
    return fallback ? { key: fallback.key, aliases: fallback.aliases } : null;
  }
  return null;
}

async function findDoctorSuggestions(query: string, aiAnswer: string): Promise<DoctorSuggestion[]> {
  const wanted = pickSpecialty(query, aiAnswer);
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

function specialtyNeedleForSlots(query: string, aiAnswer: string): string | null {
  return pickSpecialty(query, aiAnswer)?.key ?? null;
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

    try {
      const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      if (!apiKey) {
        setMessages((prev) => [...prev, { role: 'assistant', content: isUz ? 'API kalit topilmadi.' : 'API ключ не найден.' }]);
        return;
      }

      const systemPrompt =
        'You are a helpful AI medical assistant for ShifoYol (a Uzbek medical booking app). ' +
        'Answer clearly and concisely in ' + (isUz ? 'Uzbek' : 'Russian') + '. ' +
        'When the user is describing symptoms or asking who to see, ALWAYS recommend a concrete specialty by name ' +
        '(use one of: terapevt, stomatolog, lor, nevrolog, kardiolog, ginekolog, pediatr, dermatolog, ' +
        'oftalmolog, urolog, endokrinolog, gastroenterolog, travmatolog, psixolog). ' +
        'If the user wants to see a doctor or take tests but does not specify a specialty, recommend a "terapevt" ' +
        '(general practitioner) and explain that they can be referred to a specialist. ' +
        'Mention the recommended specialty word explicitly in your answer so the app can show open slots.';

      const payload = {
        model: 'gpt-4o-mini',
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
        const doctors = await findDoctorSuggestions(val, answer).catch(() => []);
        let slots: DoctorSlotBySpecialty[] = [];
        const needle = specialtyNeedleForSlots(val, answer);
        if (needle) {
          const slotDate = pickSlotDate(val, answer);
          try {
            const res = await getDoctorSlotsBySpecialty({
              specialty: needle,
              date: slotDate,
              limit: 8,
            });
            slots = res.slots ?? [];
          } catch {
            slots = [];
          }
        }
        finalMessages = [...newMessages, { role: 'assistant', content: answer, doctors, slots }];
        if (currentSessions[sessionIndex]?.backendConversationId) {
          addAiConversationMessage(currentSessions[sessionIndex].backendConversationId as string, 'assistant', answer).catch(() => null);
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
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Tarmoq xatosi yoki ulanishda muammo.' }]);
    } finally {
      setLoading(false);
    }
  };

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
