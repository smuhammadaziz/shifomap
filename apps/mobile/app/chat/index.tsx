import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/theme-store';
import { useAuthStore } from '../../store/auth-store';
import { getTokens } from '../../lib/design';
import { Avatar, Card, IconButton } from '../../components/ui';
import { listPatientConversations, type ChatConversation } from '../../lib/api';

export default function ChatListScreen() {
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const language = (useAuthStore((s) => s.language) ?? 'uz') as 'uz' | 'ru' | 'en';
  const insets = useSafeAreaInsets();
  const tokens = getTokens(theme);
  const [items, setItems] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const tr = (u: string, r: string, e: string) => (language === 'uz' ? u : language === 'ru' ? r : e);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await listPatientConversations());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [])
  );

  return (
    <View style={{ flex: 1, backgroundColor: tokens.colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text style={[tokens.type.title, { color: tokens.colors.text }]}>
          {tr('Shifokorlar bilan yozishma', 'Чаты с врачами', 'Doctor chats')}
        </Text>
        <View style={{ width: 40 }} />
      </View>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={tokens.brand.iris} />
        </View>
      ) : items.length === 0 ? (
        <View style={{ flex: 1, padding: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chatbubbles" size={56} color={tokens.brand.iris} />
          <Text style={[tokens.type.title, { color: tokens.colors.text, marginTop: 14 }]}>
            {tr('Hozircha yozishmalar yo‘q', 'Пока нет чатов', 'No conversations yet')}
          </Text>
          <Text style={{ color: tokens.colors.textSecondary, textAlign: 'center', marginTop: 6 }}>
            {tr(
              'Shifokor sahifasidan “Yozish” tugmasini bosing.',
              'Нажмите «Написать» на странице врача.',
              "Tap 'Message' on a doctor's page to start."
            )}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          {items.map((c) => (
            <Card key={c._id} onPress={() => router.push({ pathname: '/chat/[id]', params: { id: c._id } })} padding={16}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar uri={c.doctorAvatar} name={c.doctorName ?? ''} size={52} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[tokens.type.title, { color: tokens.colors.text }]} numberOfLines={1}>
                      {c.doctorName ?? 'Doctor'}
                    </Text>
                    {c.lastMessageAt ? (
                      <Text style={{ color: tokens.colors.textTertiary, fontSize: 11 }}>
                        {new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <Text
                      style={{ color: c.unread > 0 ? tokens.colors.text : tokens.colors.textSecondary, fontSize: 13, flex: 1 }}
                      numberOfLines={1}
                    >
                      {c.lastMessage ?? tr('Yangi yozishma', 'Новый чат', 'New conversation')}
                    </Text>
                    {c.unread > 0 ? (
                      <View style={[styles.unreadBadge, { backgroundColor: tokens.brand.iris }]}>
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{c.unread}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            </Card>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unreadBadge: { minWidth: 22, height: 22, paddingHorizontal: 7, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
