import React, { useState, useEffect } from 'react';
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

type ChatMessageItem = { role: string; content: string; doctors?: DoctorSuggestion[] };

export type ChatSession = {
  id: string;
  backendConversationId?: string;
  title: string;
  date: number;
  messages: ChatMessageItem[];
};

const CHAT_HISTORY_KEY = '@shifoyol_chat_history';
const FEEDBACK_ONCE_KEY = '@shifoyol_ai_feedback_once_v1';
const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=120&h=120&fit=crop';

function buildAddress(city?: string, street?: string) {
  return [city, street].filter(Boolean).join(', ');
}

async function findDoctorSuggestions(query: string, aiAnswer: string): Promise<DoctorSuggestion[]> {
  const text = `${query} ${aiAnswer}`.toLowerCase();
  const asksForDoctor =
    /(doktor|doctor|shifokor|врач|лор|lor|невр|nevrolog|kardiolog|кардиолог|ginekolog|гинеколог|pediatr|педиатр)/i.test(text);

  if (!asksForDoctor) return [];

  const specialtyHints: Array<{ key: string; rx: RegExp; aliases: string[] }> = [
    { key: 'stomatolog', rx: /(stomatolog|стоматолог|dentist|dental|tish|зуб)/i, aliases: ['stomatolog', 'dentist', 'dental', 'tish', 'зуб'] },
    { key: 'lor', rx: /(lor|лор|otolaringolog|otorhinolaryngolog)/i, aliases: ['lor', 'otolaringolog', 'отоларинголог'] },
    { key: 'nevrolog', rx: /(nevrolog|невролог|neurolog)/i, aliases: ['nevrolog', 'невролог', 'neurolog'] },
    { key: 'kardiolog', rx: /(kardiolog|кардиолог|cardiolog)/i, aliases: ['kardiolog', 'кардиолог', 'cardiolog'] },
    { key: 'ginekolog', rx: /(ginekolog|гинеколог|gynecolog)/i, aliases: ['ginekolog', 'гинеколог', 'gynecolog'] },
    { key: 'pediatr', rx: /(pediatr|педиатр|pediatric)/i, aliases: ['pediatr', 'педиатр', 'pediatric'] },
    { key: 'dermatolog', rx: /(dermatolog|дерматолог|dermatolog)/i, aliases: ['dermatolog', 'дерматолог'] },
    { key: 'terapevt', rx: /(terapevt|терапевт|therapist|family doctor)/i, aliases: ['terapevt', 'терапевт', 'therapist', 'family'] },
  ];
  const wanted = specialtyHints.find((x) => x.rx.test(text)) ?? null;

  // If user asks for a doctor but specialty is unclear, don't show unrelated doctors.
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
  return [...dedup.values()].slice(0, 8);
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
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [pendingFeedbackConversationId, setPendingFeedbackConversationId] = useState<string | null>(null);

  const isUz = language === 'uz';

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const [data, feedbackOnce] = await Promise.all([
        AsyncStorage.getItem(CHAT_HISTORY_KEY),
        AsyncStorage.getItem(FEEDBACK_ONCE_KEY),
      ]);
      if (data) setSessions(JSON.parse(data));
      setFeedbackSent(feedbackOnce === '1');
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

  const markFeedbackHandled = async () => {
    setFeedbackSent(true);
    try {
      await AsyncStorage.setItem(FEEDBACK_ONCE_KEY, '1');
    } catch {}
  };

  const onCloseFeedback = async () => {
    if (!pendingFeedbackConversationId) {
      setFeedbackModalVisible(false);
      return;
    }
    try {
      await submitAiConversationFeedback(pendingFeedbackConversationId, { dismissed: true });
      await markFeedbackHandled();
    } catch {}
    setFeedbackModalVisible(false);
    setPendingFeedbackConversationId(null);
  };

  const onSubmitFeedback = async () => {
    if (!pendingFeedbackConversationId || feedbackRating < 1) return;
    try {
      await submitAiConversationFeedback(pendingFeedbackConversationId, {
        rating: feedbackRating,
        feedbackText: feedbackText.trim() || undefined,
      });
      await markFeedbackHandled();
    } catch {}
    setFeedbackModalVisible(false);
    setPendingFeedbackConversationId(null);
    setFeedbackText('');
    setFeedbackRating(0);
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

      const payload = {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful AI medical assistant for ShifoYol. Answer clearly and concisely in ' + (isUz ? 'Uzbek' : 'Russian') },
          ...newMessages
        ]
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
        finalMessages = [...newMessages, { role: 'assistant', content: answer, doctors }];
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
         if (conversationId && !feedbackSent && userMessageCount >= 3) {
           setPendingFeedbackConversationId(conversationId);
           setFeedbackModalVisible(true);
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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
              style={[styles.feedbackSubmitBtn, { backgroundColor: feedbackRating > 0 ? colors.primary : colors.border }]}
              disabled={feedbackRating < 1}
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
