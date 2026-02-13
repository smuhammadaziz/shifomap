import React, { useState, useEffect, useRef } from 'react';
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
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { authPhonePassword, getConnectionErrorMessage, getApiErrorMessage } from '../../lib/api';
import { getTranslations } from '../../lib/translations';
import { getColors } from '../../lib/theme';

const PHONE_REGEX = /^\+?998\d{9}$/;

function normalizePhone(raw: string): string {
  const s = raw.replace(/^%2B/, '+').replace(/\s/g, '');
  return s.startsWith('+') ? s : `+${s}`;
}

function formatPhoneForDisplay(phone: string): string {
  const d = phone.replace(/\D/g, '').slice(-9);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)} ${d.slice(2)}`;
  if (d.length <= 7) return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7)}`;
}

export default function PasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string }>();
  const pendingPhone = useAuthStore((s) => s.pendingPhone);
  const setPendingPhone = useAuthStore((s) => s.setPendingPhone);
  const rawPhone = (params.phone ?? pendingPhone ?? '').trim();
  const phone = normalizePhone(rawPhone);
  const language = useAuthStore((s) => s.language) ?? 'uz';
  const theme = useThemeStore((s) => s.theme);
  const setToken = useAuthStore((s) => s.setToken);
  const setPatient = useAuthStore((s) => s.setPatient);
  const colors = getColors(theme);

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [secure, setSecure] = useState(true);
  const [focused, setFocused] = useState(false);
  const [showScreen, setShowScreen] = useState(false);
  const [errorPopover, setErrorPopover] = useState<{ title: string; message: string } | null>(null);
  const redirectDone = useRef(false);

  const t = getTranslations(language);
  const hasValidPhone = phone.length > 0 && PHONE_REGEX.test(phone);

  useEffect(() => {
    if (redirectDone.current) return;
    if (hasValidPhone) {
      setShowScreen(true);
      return;
    }
    const timer = setTimeout(() => {
      const normalized = normalizePhone(params.phone ?? pendingPhone ?? '');
      const valid = normalized.length > 0 && PHONE_REGEX.test(normalized);
      if (!valid) {
        redirectDone.current = true;
        setPendingPhone(null);
        router.replace('/(auth)/login');
      } else {
        setShowScreen(true);
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [hasValidPhone, params.phone, pendingPhone, router, setPendingPhone]);

  const onSubmit = async () => {
    const pwd = password.trim();
    if (pwd.length < 8) {
      setErrorPopover({ title: t.passwordTitle, message: t.passwordError });
      return;
    }
    setLoading(true);
    setErrorPopover(null);
    try {
      const data = await authPhonePassword(phone, pwd, language as 'uz' | 'ru' | 'en');
      setToken(data.token);
      setPatient(data.patient);
      setPendingPhone(null);
      if (data.needsProfile) {
        router.replace('/(auth)/complete-profile');
      } else {
        router.replace('/(tabs)');
      }
    } catch (e) {
      const apiMsg = getApiErrorMessage(e);
      const isNetwork = !apiMsg && (getConnectionErrorMessage(e).includes('Cannot reach server') || (e as { code?: string })?.code === 'ERR_NETWORK');
      if (isNetwork) {
        Alert.alert('Error', getConnectionErrorMessage(e));
      } else {
        const title = t.passwordWrongTitle;
        const message = (apiMsg && apiMsg !== 'Invalid password') ? apiMsg : t.passwordWrongMessage;
        setErrorPopover({ title, message });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!showScreen) {
    return (
      <View style={[styles.loadingRoot, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isValid = password.length >= 8;
  const phoneDisplay = PHONE_REGEX.test(phone) ? '+998 ' + formatPhoneForDisplay(phone) : phone;

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
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.topBlock}>
            <Text style={[styles.title, { color: colors.text }]}>{t.passwordTitle}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t.passwordSubtitle}</Text>
          </View>

          <View style={styles.phoneRow}>
            <Ionicons name="call-outline" size={16} color={colors.textTertiary} />
            <Text style={[styles.phoneText, { color: colors.textSecondary }]}>{phoneDisplay}</Text>
          </View>

          <View style={styles.formBlock}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t.passwordPlaceholder}</Text>
            <View
              style={[
                styles.inputRow,
                { borderBottomColor: focused ? colors.primary : colors.border },
                focused && styles.inputRowFocused,
              ]}
            >
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={t.passwordPlaceholder}
                placeholderTextColor={colors.textPlaceholder}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                secureTextEntry={secure}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setSecure((s) => !s)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name={secure ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
            {password.length > 0 && password.length < 8 && (
              <Text style={[styles.minHint, { color: colors.error }]}>{t.passwordError}</Text>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.btn,
              { backgroundColor: colors.primary },
              (!isValid || loading) && styles.btnDisabled,
            ]}
            onPress={onSubmit}
            disabled={!isValid || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.btnText}>{t.passwordContinue}</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={!!errorPopover}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorPopover(null)}
      >
        <Pressable style={styles.popoverOverlay} onPress={() => setErrorPopover(null)}>
          <Pressable
            style={[styles.popoverCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
            onPress={(ev) => ev.stopPropagation()}
          >
            <View style={[styles.popoverIconWrap, { backgroundColor: colors.errorBg }]}>
              <Ionicons name="lock-closed" size={28} color={colors.error} />
            </View>
            <Text style={[styles.popoverTitle, { color: colors.text }]}>{errorPopover?.title ?? ''}</Text>
            <Text style={[styles.popoverMessage, { color: colors.textSecondary }]}>{errorPopover?.message ?? ''}</Text>
            <TouchableOpacity
              style={[styles.popoverBtn, { backgroundColor: colors.primary }]}
              onPress={() => setErrorPopover(null)}
              activeOpacity={0.85}
            >
              <Text style={styles.popoverBtnText}>{t.errorDismiss}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboard: { flex: 1 },
  scrollContent: { paddingHorizontal: 28, paddingTop: 56, paddingBottom: 48 },
  backBtn: {
    marginBottom: 24,
  },
  topBlock: { marginBottom: 28 },
  logo: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 300,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 28,
  },
  phoneText: { fontSize: 15, fontWeight: '500' },
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
  inputRowFocused: { borderBottomWidth: 3 },
  input: {
    flex: 1,
    fontSize: 17,
    paddingVertical: 0,
  },
  minHint: { fontSize: 12, marginTop: 10 },
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
  popoverOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  popoverCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  popoverIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  popoverTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  popoverMessage: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 20 },
  popoverBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, minWidth: 120, alignItems: 'center' },
  popoverBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
