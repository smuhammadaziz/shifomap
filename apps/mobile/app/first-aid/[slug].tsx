import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/theme-store';
import { useAuthStore } from '../../store/auth-store';
import { getTokens } from '../../lib/design';
import { Card, IconButton } from '../../components/ui';
import firstAid from '../../lib/firstAid.json';

export default function FirstAidDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const language = (useAuthStore((s) => s.language) ?? 'uz') as 'uz' | 'ru' | 'en';
  const insets = useSafeAreaInsets();
  const tokens = getTokens(theme);
  const guide = firstAid.guides.find((g) => g.slug === slug);

  if (!guide) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: tokens.colors.textSecondary }}>Not found</Text>
      </View>
    );
  }

  const title = (guide.title as Record<string, string>)[language] ?? guide.title.en;
  const summary = (guide.summary as Record<string, string>)[language] ?? guide.summary.en;
  const steps = ((guide.steps as Record<string, string[]>)[language] ?? guide.steps.en) as string[];
  const warning = (guide.warning as Record<string, string>)[language] ?? guide.warning.en;

  return (
    <View style={{ flex: 1, backgroundColor: tokens.colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text style={[tokens.type.title, { color: tokens.colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }}>
        <View style={[styles.hero, { backgroundColor: guide.color + '14' }]}>
          <View style={[styles.iconWrap, { backgroundColor: guide.color }]}>
            <Ionicons name={guide.icon as any} size={26} color="#fff" />
          </View>
          <Text style={[tokens.type.titleXl, { color: tokens.colors.text, marginTop: 12 }]}>{title}</Text>
          <Text style={{ color: tokens.colors.textSecondary, fontSize: 14, marginTop: 4 }}>{summary}</Text>
        </View>

        <Card>
          <Text style={[tokens.type.caption, { color: tokens.colors.textTertiary, marginBottom: 10 }]}>
            {language === 'uz' ? 'QADAMLAR' : language === 'ru' ? 'ШАГИ' : 'STEPS'}
          </Text>
          {steps.map((s, i) => (
            <View key={i} style={styles.step}>
              <View style={[styles.stepNumber, { backgroundColor: guide.color + '1a' }]}>
                <Text style={{ color: guide.color, fontWeight: '800' }}>{i + 1}</Text>
              </View>
              <Text style={{ flex: 1, color: tokens.colors.text, fontSize: 14, lineHeight: 21 }}>{s}</Text>
            </View>
          ))}
        </Card>

        <View style={[styles.warning, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
          <Ionicons name="warning" size={18} color="#b45309" />
          <Text style={{ color: '#92400e', fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 18 }}>{warning}</Text>
        </View>
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
  hero: { padding: 20, borderRadius: 24 },
  iconWrap: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  step: { flexDirection: 'row', gap: 12, paddingVertical: 8 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
