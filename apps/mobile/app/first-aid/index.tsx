import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/theme-store';
import { useAuthStore } from '../../store/auth-store';
import { getTokens } from '../../lib/design';
import { IconButton } from '../../components/ui';
import firstAid from '../../lib/firstAid.json';

export default function FirstAidIndex() {
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const language = (useAuthStore((s) => s.language) ?? 'uz') as 'uz' | 'ru' | 'en';
  const insets = useSafeAreaInsets();
  const tokens = getTokens(theme);
  const guides = firstAid.guides;

  return (
    <View style={{ flex: 1, backgroundColor: tokens.colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text style={[tokens.type.title, { color: tokens.colors.text }]}>
          {language === 'uz' ? 'Birinchi yordam' : language === 'ru' ? 'Первая помощь' : 'First aid'}
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}>
        <Text style={[tokens.type.bodySm, { color: tokens.colors.textSecondary, marginBottom: 4 }]}>
          {language === 'uz'
            ? 'Favqulodda vaziyatlarda harakat qilish uchun qo‘llanmalar.'
            : language === 'ru'
            ? 'Рекомендации для действий в экстренных ситуациях.'
            : 'Guides for handling common emergencies.'}
        </Text>
        {guides.map((g) => {
          const title = (g.title as Record<string, string>)[language] ?? g.title.en;
          const summary = (g.summary as Record<string, string>)[language] ?? g.summary.en;
          return (
            <TouchableOpacity
              key={g.slug}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/first-aid/[slug]', params: { slug: g.slug } })}
              style={[styles.row, { backgroundColor: tokens.colors.backgroundCard, borderColor: tokens.colors.border }]}
            >
              <View style={[styles.iconWrap, { backgroundColor: g.color + '1a' }]}>
                <Ionicons name={g.icon as any} size={22} color={g.color} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[tokens.type.title, { color: tokens.colors.text }]} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={{ color: tokens.colors.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={2}>
                  {summary}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={tokens.colors.textTertiary} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
