import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { getTranslations } from '../../lib/translations';
import { getTokens } from '../../lib/design';
import { Button } from '../../components/ui';

const PRIVACY_URL = 'https://shifoyol.uz/privacy';
const TERMS_URL = 'https://shifoyol.uz/privacy';

export default function AgreementsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const language = useAuthStore((s) => s.language) ?? 'uz';
  const setAgreementsAccepted = useAuthStore((s) => s.setAgreementsAccepted);
  const theme = useThemeStore((s) => s.theme);
  const tokens = getTokens(theme);
  const t = getTranslations(language);
  const isDark = theme === 'dark';

  const [checked, setChecked] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const openUrl = (url: string) => {
    void Linking.openURL(url);
  };

  const onAccept = async () => {
    if (!checked || submitting) return;
    setSubmitting(true);
    try {
      await setAgreementsAccepted();
      router.replace('/(auth)/login');
    } finally {
      setSubmitting(false);
    }
  };

  const blobSize = Math.min(width * 0.72, 280);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: tokens.colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={language === 'ru' ? 'Назад' : 'Orqaga'}
        >
          <Ionicons name="chevron-back" size={28} color={tokens.colors.primary} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.title, { color: tokens.colors.text }]}>{t.agreementsTitle}</Text>

      <View style={styles.illustrationWrap}>
        <View
          style={[
            styles.blob,
            {
              width: blobSize,
              height: blobSize * 0.88,
              backgroundColor: isDark ? tokens.brand.primary + '22' : tokens.brand.primarySoft,
            },
          ]}
        />
        <View style={[styles.phoneCard, { backgroundColor: tokens.colors.backgroundCard, borderColor: tokens.colors.border }]}>
          <Ionicons name="phone-portrait-outline" size={36} color={tokens.colors.textSecondary} />
        </View>
        <View style={[styles.checkBadge, { backgroundColor: tokens.colors.backgroundCard }]}>
          <View style={[styles.checkCircle, { backgroundColor: tokens.colors.primary }]}>
            <Ionicons name="checkmark" size={42} color="#fff" />
          </View>
        </View>
      </View>

      <View style={styles.consentRow}>
        <Pressable
          onPress={() => setChecked((v) => !v)}
          style={[
            styles.checkbox,
            {
              borderColor: checked ? tokens.colors.primary : tokens.colors.border,
              backgroundColor: checked ? tokens.colors.primary : 'transparent',
            },
          ]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
        >
          {checked ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
        </Pressable>

        <Text style={[styles.consentText, { color: tokens.colors.textSecondary }]}>
          {t.agreementsConsentPrefix}
          <Text style={[styles.link, { color: tokens.colors.primary }]} onPress={() => openUrl(PRIVACY_URL)}>
            {t.agreementsPrivacyLink}
          </Text>
          {language === 'ru' ? ' и ' : ' va '}
          <Text style={[styles.link, { color: tokens.colors.primary }]} onPress={() => openUrl(TERMS_URL)}>
            {t.agreementsTermsLink}
          </Text>
          {t.agreementsConsentSuffix}
        </Text>
      </View>

      <View style={styles.footer}>
        <Button
          title={t.agreementsAccept}
          onPress={() => void onAccept()}
          variant="gradient"
          size="lg"
          disabled={!checked}
          loading={submitting}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  illustrationWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
  },
  blob: {
    borderRadius: 999,
    transform: [{ rotate: '-8deg' }, { scaleX: 1.08 }],
  },
  phoneCard: {
    position: 'absolute',
    width: 72,
    height: 120,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    left: '22%',
    top: '28%',
    transform: [{ rotate: '-12deg' }],
  },
  checkBadge: {
    position: 'absolute',
    right: '18%',
    top: '22%',
    padding: 8,
    borderRadius: 999,
  },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  consentText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  link: {
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
});
