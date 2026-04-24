import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Image,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { getTranslations } from '../../lib/translations';
import { getTokens } from '../../lib/design';
import { Button } from '../../components/ui';

const PHONE_PREFIX = '+998';
const LOGO_IMG = require('../../assets/play_store_512-Photoroom.png');

export default function Login() {
  const router = useRouter();
  const language = useAuthStore((s) => s.language) ?? 'uz';
  const theme = useThemeStore((s) => s.theme);
  const [digits, setDigits] = useState('');
  const [navigating, setNavigating] = useState(false);
  const [focused, setFocused] = useState(false);

  const t = getTranslations(language);
  const tokens = getTokens(theme);
  const setPendingPhone = useAuthStore((s) => s.setPendingPhone);

  const isValid = digits.length === 9;

  const onPhoneNext = () => {
    if (!isValid) {
      Alert.alert('', t.loginError);
      return;
    }
    const fullPhone = PHONE_PREFIX + digits;
    setPendingPhone(fullPhone);
    setNavigating(true);
    requestAnimationFrame(() => {
      setTimeout(() => {
        router.push(`/(auth)/password?phone=${encodeURIComponent(fullPhone)}`);
        setNavigating(false);
      }, 0);
    });
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: tokens.colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient
            colors={tokens.gradients.soft as [string, string, ...string[]]}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <View style={styles.brandRow}>
                <View style={styles.logoWrap}>
                  <Image source={LOGO_IMG} style={styles.logo} resizeMode="contain" />
                </View>
                <Text style={[tokens.type.title, { color: tokens.colors.text }]}>ShifoYo'l</Text>
              </View>

              <View style={styles.heroBody}>
                <Text style={[tokens.type.display, { color: tokens.colors.text }]}>
                  {t.loginWelcome}
                </Text>
                <Text style={{ color: tokens.colors.textSecondary, fontSize: 15, lineHeight: 22, marginTop: 10 }}>
                  {t.homeSubtitle}
                </Text>
              </View>

              <View style={[styles.pillStat, { backgroundColor: tokens.colors.backgroundCard }]}>
                <View style={[styles.pillDot, { backgroundColor: tokens.brand.mint }]} />
                <Text style={{ color: tokens.colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                  {language === 'uz' ? '1000+ shifokor onlayn' : '1000+ врачей онлайн'}
                </Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.form}>
            <Text style={[tokens.type.caption, { color: tokens.colors.textSecondary, marginBottom: 10, marginLeft: 4 }]}>
              {t.loginPhoneLabel}
            </Text>

            <View style={styles.phoneRow}>
              <View
                style={[
                  styles.prefix,
                  { backgroundColor: tokens.colors.backgroundInput, borderColor: tokens.colors.border },
                ]}
              >
                <Text style={{ color: tokens.colors.text, fontWeight: '700' }}>{PHONE_PREFIX}</Text>
              </View>
              <View
                style={[
                  styles.inputBox,
                  {
                    backgroundColor: tokens.colors.backgroundInput,
                    borderColor: focused ? tokens.brand.iris : tokens.colors.border,
                  },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: tokens.colors.text }]}
                  placeholder="90 123 45 67"
                  placeholderTextColor={tokens.colors.textPlaceholder}
                  value={digits}
                  onChangeText={(v) => setDigits(v.replace(/\D/g, '').slice(0, 9))}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  keyboardType="phone-pad"
                  maxLength={9}
                  editable={!navigating}
                />
              </View>
            </View>

            <View style={{ height: 22 }} />
            <Button
              title={t.loginNext}
              variant="gradient"
              size="lg"
              rightIcon="arrow-forward"
              loading={navigating}
              disabled={!isValid}
              onPress={onPhoneNext}
            />

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: tokens.colors.border }]} />
              <Text style={{ color: tokens.colors.textTertiary, fontSize: 12, fontWeight: '600' }}>
                {language === 'uz' ? 'yoki' : 'или'}
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: tokens.colors.border }]} />
            </View>

            <TouchableOpacity
              style={[styles.contactBtn, { borderColor: tokens.colors.border }]}
              onPress={() => Linking.openURL('https://t.me/shifoyol_contact_bot')}
              activeOpacity={0.85}
            >
              <Ionicons name="paper-plane-outline" size={18} color={tokens.brand.iris} />
              <Text style={{ color: tokens.colors.text, fontWeight: '600', fontSize: 14 }}>
                {t.contactUs}
              </Text>
            </TouchableOpacity>

            <Text
              style={{
                color: tokens.colors.textTertiary,
                fontSize: 11,
                textAlign: 'center',
                marginTop: 22,
                paddingHorizontal: 20,
                lineHeight: 16,
              }}
            >
              {language === 'uz'
                ? "Davom etib, siz Foydalanish shartlari va Maxfiylik siyosatiga rozilik bildirasiz"
                : 'Продолжая, вы принимаете Условия использования и Политику конфиденциальности'}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 30 },
  heroGradient: {
    paddingTop: 10,
    paddingHorizontal: 24,
    paddingBottom: 30,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
  },
  heroContent: { marginBottom: 10 },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 60,
  },
  logoWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 26, height: 26 },
  heroBody: { marginBottom: 26 },
  pillStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  form: { padding: 24, paddingTop: 30 },
  phoneRow: { flexDirection: 'row', gap: 12 },
  prefix: {
    paddingHorizontal: 16,
    height: 56,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputBox: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  input: { fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 22,
    marginBottom: 16,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  contactBtn: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
