import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/theme-store';
import { useAuthStore } from '../../store/auth-store';
import { getTokens } from '../../lib/design';
import { Avatar, IconButton } from '../../components/ui';
import {
  listConversationMessages,
  sendChatMessage,
  type ChatConversation,
  type ChatMessage,
} from '../../lib/api';

export default function ChatThread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const language = (useAuthStore((s) => s.language) ?? 'uz') as 'uz' | 'ru' | 'en';
  const insets = useSafeAreaInsets();
  const tokens = getTokens(theme);

  const [conv, setConv] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);
  const tr = (u: string, r: string, e: string) => (language === 'uz' ? u : language === 'ru' ? r : e);

  const load = async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    try {
      const res = await listConversationMessages(id);
      setConv(res.conversation);
      setMessages(res.messages);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(false);
    const timer = setInterval(() => load(true), 5000);
    return () => clearInterval(timer);
  }, [id]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 50);
    }
  }, [messages.length]);

  const send = async () => {
    if (!id || !text.trim()) return;
    setSending(true);
    const body = text.trim();
    setText('');
    try {
      const msg = await sendChatMessage(id, body);
      setMessages((prev) => [...prev, msg]);
    } catch {
      setText(body);
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const mine = item.senderRole === 'patient';
    return (
      <View
        style={[
          styles.bubbleRow,
          { justifyContent: mine ? 'flex-end' : 'flex-start' },
        ]}
      >
        <View
          style={[
            styles.bubble,
            mine
              ? { backgroundColor: tokens.brand.iris, borderBottomRightRadius: 4 }
              : { backgroundColor: tokens.colors.surface, borderBottomLeftRadius: 4, borderColor: tokens.colors.border, borderWidth: StyleSheet.hairlineWidth },
          ]}
        >
          <Text style={{ color: mine ? '#fff' : tokens.colors.text, fontSize: 14, lineHeight: 20 }}>{item.text}</Text>
          <Text style={{ color: mine ? 'rgba(255,255,255,0.7)' : tokens.colors.textTertiary, fontSize: 10, marginTop: 4, textAlign: 'right' }}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: tokens.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + 10, backgroundColor: tokens.colors.background, borderBottomColor: tokens.colors.border }]}>
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Avatar uri={conv?.doctorAvatar ?? null} name={conv?.doctorName ?? ''} size={36} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[tokens.type.title, { color: tokens.colors.text }]} numberOfLines={1}>
              {conv?.doctorName ?? 'Doctor'}
            </Text>
            <Text style={{ color: tokens.colors.textTertiary, fontSize: 11 }}>
              {tr('Onlayn chat', 'Онлайн чат', 'Online chat')}
            </Text>
          </View>
        </View>
      </View>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={tokens.brand.iris} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 14, gap: 6 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />
      )}
      <View style={[styles.composer, { backgroundColor: tokens.colors.background, borderTopColor: tokens.colors.border, paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={tr('Xabar yozing...', 'Напишите сообщение...', 'Type a message...')}
          placeholderTextColor={tokens.colors.textTertiary}
          style={[styles.composerInput, { backgroundColor: tokens.colors.surface, color: tokens.colors.text, borderColor: tokens.colors.border }]}
          multiline
        />
        <TouchableOpacity
          onPress={send}
          disabled={!text.trim() || sending}
          style={[styles.sendBtn, { backgroundColor: text.trim() ? tokens.brand.iris : tokens.colors.border }]}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bubbleRow: { flexDirection: 'row', marginVertical: 3 },
  bubble: { maxWidth: '78%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  composerInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 14,
  },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
