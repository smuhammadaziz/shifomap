import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { getTranslations } from '../../lib/translations';
import { getColors } from '../../lib/theme';

const PHONE_PREFIX = '+998';

function formatPhoneDisplay(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 9);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)} ${d.slice(2)}`;
  if (d.length <= 7) return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7)}`;
}

export default function Login() {
  const router = useRouter();
  const language = useAuthStore((s) => s.language) ?? 'uz';
  const theme = useThemeStore((s) => s.theme);
  const [digits, setDigits] = useState('');
  const [navigating, setNavigating] = useState(false);
  const [focused, setFocused] = useState(false);

  const t = getTranslations(language);
  const colors = getColors(theme);
  const setPendingPhone = useAuthStore((s) => s.setPendingPhone);

  const onPhoneNext = () => {
    if (digits.length !== 9) {
      Alert.alert('', t.loginError);
      return;
    }
    const fullPhone = PHONE_PREFIX + digits;
    setPendingPhone(fullPhone);
    setNavigating(true);
    const href = `/(auth)/password?phone=${encodeURIComponent(fullPhone)}`;
    requestAnimationFrame(() => {
      setTimeout(() => {
        router.push(href);
        setNavigating(false);
      }, 0);
    });
  };

  const onPhoneChange = (text: string) => {
    setDigits(text.replace(/\D/g, '').slice(0, 9));
  };

  const isValid = digits.length === 9;
  const displayValue = formatPhoneDisplay(digits);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topBlock}>
            <Text style={[styles.logo, { color: colors.text }]}>ShifoYo'l</Text>
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>
              {t.loginSubtitle}
            </Text>
          </View>

          <View style={styles.formBlock}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              {t.loginTitle}
            </Text>
            <View
              style={[
                styles.inputRow,
                { borderBottomColor: focused ? colors.primary : colors.border },
                focused && styles.inputRowFocused,
              ]}
            >
              <Text style={[styles.prefix, { color: colors.textTertiary }]}>{PHONE_PREFIX}</Text>
              <View style={[styles.prefixDivider, { backgroundColor: colors.border }]} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={t.loginPhonePlaceholder}
                placeholderTextColor={colors.textPlaceholder}
                value={displayValue}
                onChangeText={onPhoneChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                keyboardType="phone-pad"
                maxLength={12}
                editable={!navigating}
              />
            </View>
            {digits.length > 0 && (
              <View style={styles.dotsRow}>
                {[0, 1, 2].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      { backgroundColor: colors.border },
                      digits.length > i * 3 && { backgroundColor: colors.primary, opacity: 1 },
                    ]}
                  />
                ))}
              </View>
            )}
            <Text style={[styles.hint, { color: colors.textTertiary }]}>{t.loginPhoneHint}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.btn,
              { backgroundColor: colors.primary },
              (!isValid || navigating) && styles.btnDisabled,
            ]}
            onPress={onPhoneNext}
            disabled={!isValid || navigating}
            activeOpacity={0.85}
          >
            {navigating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.btnText}>{t.loginNext}</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboard: { flex: 1 },
  scrollContent: { paddingHorizontal: 28, paddingTop: 80, paddingBottom: 48 },
  topBlock: { marginBottom: 48 },
  logo: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 280,
  },
  formBlock: { marginBottom: 36 },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 0,
  },
  inputRowFocused: {
    borderBottomWidth: 3,
  },
  prefix: {
    fontSize: 17,
    fontWeight: '500',
    marginRight: 12,
  },
  prefixDivider: {
    width: 1,
    height: 20,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 0,
    letterSpacing: 1.5,
  },
  dotsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.5,
  },
  hint: {
    fontSize: 12,
    marginTop: 10,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
