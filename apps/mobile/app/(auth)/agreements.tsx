import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Pressable,
  useWindowDimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { getTranslations } from '../../lib/translations';
import { getTokens } from '../../lib/design';
import { Button } from '../../components/ui';

const PRIVACY_URL = 'https://shifoyol.uz/privacy';
const TERMS_URL = 'https://shifoyol.uz/terms';

// Doctor–patient trust — fits agreements + healthcare context
const AGREEMENTS_HERO =
  'https://images.unsplash.com/photo-1579684385127-1ef15a5f095c?w=1000&q=80';

export default function AgreementsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const language = useAuthStore((s) => s.language) ?? 'uz';
  const setAgreementsAccepted = useAuthStore((s) => s.setAgreementsAccepted);
  const theme = useThemeStore((s) => s.theme);
  const tokens = getTokens(theme);
  const t = getTranslations(language);

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

  const imgSize = Math.min(width * 0.68, 260);

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
        <View style={styles.heroWrap}>
          <LinearGradient
            colors={tokens.gradients.soft as [string, string, ...string[]]}
            style={[styles.heroBubble, { width: imgSize, height: imgSize, borderRadius: imgSize / 2 }]}
          >
            <Image
              source={{ uri: AGREEMENTS_HERO }}
              style={[
                styles.heroImage,
                {
                  width: imgSize * 0.86,
                  height: imgSize * 0.86,
                  borderRadius: (imgSize * 0.86) / 2,
                },
              ]}
              resizeMode="cover"
            />
          </LinearGradient>

          <View style={[styles.floatCard, styles.floatTopLeft, { backgroundColor: tokens.colors.backgroundCard }]}>
            <View style={[styles.floatIcon, { backgroundColor: tokens.brand.iris }]}>
              <Ionicons name="shield-checkmark" size={14} color="#fff" />
            </View>
            <View>
              <Text style={[styles.floatTitle, { color: tokens.colors.text }]}>
                {language === 'ru' ? 'Конфиден.' : 'Maxfiylik'}
              </Text>
              <Text style={[styles.floatSub, { color: tokens.colors.textTertiary }]}>
                {language === 'ru' ? 'Защищено' : 'Himoyalangan'}
              </Text>
            </View>
          </View>

          <View style={[styles.floatCard, styles.floatBottomRight, { backgroundColor: tokens.colors.backgroundCard }]}>
            <View style={[styles.floatIcon, { backgroundColor: tokens.brand.mint }]}>
              <Ionicons name="document-text" size={14} color="#fff" />
            </View>
            <View>
              <Text style={[styles.floatTitle, { color: tokens.colors.text }]}>
                {language === 'ru' ? 'Условия' : 'Shartlar'}
              </Text>
              <Text style={[styles.floatSub, { color: tokens.colors.textTertiary }]}>
                {language === 'ru' ? 'Прозрачно' : 'Ochiq'}
              </Text>
            </View>
          </View>
        </View>

        <Text style={[styles.heroCaption, { color: tokens.colors.textSecondary }]}>
          {language === 'ru'
            ? 'Ваши данные в безопасности — мы заботимся о вашем здоровье и конфиденциальности.'
            : "Ma'lumotlaringiz xavfsiz — sog'ligingiz va maxfiyligingiz biz uchun muhim."}
        </Text>
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
    paddingHorizontal: 24,
  },
  heroWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heroBubble: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroImage: {},
  floatCard: {
    position: 'absolute',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  floatTopLeft: { top: 8, left: -12 },
  floatBottomRight: { bottom: 16, right: -12 },
  floatIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatTitle: { fontWeight: '700', fontSize: 12 },
  floatSub: { fontSize: 10 },
  heroCaption: {
    marginTop: 28,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 8,
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
