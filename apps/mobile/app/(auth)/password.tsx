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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

/** Format +998901234567 → 99 123 45 67 (without +998 prefix in display) */
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

  // Show form immediately when we have valid phone (from store); only redirect if invalid after a tick
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
  const phoneDisplay = `${PHONE_REGEX.test(phone) ? '+998 ' + formatPhoneForDisplay(phone) : phone}`;

  const gradientColors: readonly [string, string, string] = theme === 'light'
    ? [colors.background, colors.backgroundSecondary, colors.backgroundSecondary]
    : ['#0a0a0f', '#12121a', '#1a1a24'];

  return (
    <LinearGradient
      colors={gradientColors}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        <View style={styles.content}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)' }]}
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={[styles.iconWrap, { backgroundColor: colors.primaryBg }]}>
            <Ionicons name="lock-closed-outline" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{t.passwordTitle}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t.passwordSubtitle}</Text>

          <View style={[styles.phoneDisplay, { backgroundColor: colors.backgroundCard }]}>
            <Ionicons name="call-outline" size={16} color={colors.textTertiary} />
            <Text style={[styles.phoneDisplayText, { color: colors.textSecondary }]}>{phoneDisplay}</Text>
          </View>

          <View style={[
            styles.passwordCard,
            { backgroundColor: colors.backgroundCard, borderColor: colors.border },
            focused && { borderColor: colors.primary, backgroundColor: colors.backgroundInputFocused }
          ]}>
            <TextInput
              style={[styles.passwordInput, { color: colors.text }]}
              placeholder={t.passwordPlaceholder}
              placeholderTextColor={colors.textTertiary}
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
              style={styles.eyeBtn}
              onPress={() => setSecure((s) => !s)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name={secure ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
          {password.length > 0 && password.length < 8 && (
            <Text style={[styles.minHint, { color: colors.error }]}>{t.passwordError}</Text>
          )}

          <TouchableOpacity
            style={[
              styles.continueButton,
              { backgroundColor: colors.primary },
              (!isValid || loading) && styles.continueButtonDisabled
            ]}
            onPress={onSubmit}
            disabled={!isValid || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.continueButtonText}>{t.passwordContinue}</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={!!errorPopover}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorPopover(null)}
      >
        <Pressable style={styles.popoverOverlay} onPress={() => setErrorPopover(null)}>
          <Pressable style={[styles.popoverCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]} onPress={(ev) => ev.stopPropagation()}>
            <View style={[styles.popoverIconWrap, { backgroundColor: colors.errorBg }]}>
              <Ionicons name="lock-closed" size={32} color={colors.error} />
            </View>
            <Text style={[styles.popoverTitle, { color: colors.text }]}>{errorPopover?.title ?? ''}</Text>
            <Text style={[styles.popoverMessage, { color: colors.textSecondary }]}>{errorPopover?.message ?? ''}</Text>
            <TouchableOpacity
              style={[styles.popoverButton, { backgroundColor: colors.primary }]}
              onPress={() => setErrorPopover(null)}
              activeOpacity={0.85}
            >
              <Text style={styles.popoverButtonText}>{t.errorDismiss}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboard: { flex: 1, justifyContent: 'center' },
  content: { paddingHorizontal: 28 },
  backBtn: {
    position: 'absolute',
    top: 56,
    left: 28,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 24,
    lineHeight: 22,
  },
  phoneDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  phoneDisplayText: {
    fontSize: 15,
    fontWeight: '500',
  },
  passwordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  passwordInput: {
    flex: 1,
    fontSize: 17,
    paddingVertical: 18,
  },
  eyeBtn: {
    padding: 8,
  },
  minHint: {
    fontSize: 12,
    marginBottom: 16,
    marginLeft: 4,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    paddingVertical: 18,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  continueButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
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
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  popoverIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  popoverTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  popoverMessage: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  popoverButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    minWidth: 140,
    alignItems: 'center',
  },
  popoverButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
