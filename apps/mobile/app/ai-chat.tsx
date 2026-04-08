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
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../store/theme-store';
import { getColors } from '../lib/theme';
import { useAuthStore } from '../store/auth-store';

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

export type ChatSession = {
  id: string;
  title: string;
  date: number;
  messages: { role: string; content: string }[];
};

const CHAT_HISTORY_KEY = '@shifoyol_chat_history';

export default function AiChatScreen() {
  const router = useRouter();
  const theme = useThemeStore((s: any) => s.theme);
  const language = useAuthStore((s: any) => s.language) ?? 'uz';
  const colors = getColors(theme);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  const isUz = language === 'uz';

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
      if (data) {
        setSessions(JSON.parse(data));
      }
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
      const newSession: ChatSession = {
        id: currentSessionId,
        title: val.substring(0, 30) + (val.length > 30 ? '...' : ''),
        date: Date.now(),
        messages: [],
      };
      currentSessions = [newSession, ...currentSessions];
    }

    const sessionIndex = currentSessions.findIndex(s => s.id === currentSessionId);
    if (sessionIndex === -1) return;

    const newMessages = [...messages, { role: 'user', content: val }];
    setMessages(newMessages);
    setInputText('');
    setLoading(true);

    currentSessions[sessionIndex].messages = newMessages;
    saveSessions(currentSessions);

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
      let finalMessages = newMessages;
      if (data.choices && data.choices[0]) {
        finalMessages = [...newMessages, { role: 'assistant', content: data.choices[0].message.content }];
      } else {
        finalMessages = [...newMessages, { role: 'assistant', content: 'Kechirasiz, xatolik yuz berdi.' }];
      }
      setMessages(finalMessages);
      
      const updatedList = [...sessions];
      const idx = updatedList.findIndex(s => s.id === currentSessionId);
      if (idx !== -1) {
         updatedList[idx].messages = finalMessages;
         saveSessions(updatedList);
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
        <View style={[styles.inputContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
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
    maxWidth: '85%',
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
});
