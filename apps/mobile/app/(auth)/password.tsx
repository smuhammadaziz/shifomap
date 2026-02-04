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
import { authPhonePassword, getConnectionErrorMessage, getApiErrorMessage } from '../../lib/api';
import { getTranslations } from '../../lib/translations';

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
  const setToken = useAuthStore((s) => s.setToken);
  const setPatient = useAuthStore((s) => s.setPatient);

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
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  const isValid = password.length >= 8;
  const phoneDisplay = `${PHONE_REGEX.test(phone) ? '+998 ' + formatPhoneForDisplay(phone) : phone}`;

  return (
    <LinearGradient
      colors={['#0a0a0f', '#12121a', '#1a1a24']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color="#fafafa" />
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <Ionicons name="lock-closed-outline" size={40} color="#8b5cf6" />
          </View>
          <Text style={styles.title}>{t.passwordTitle}</Text>
          <Text style={styles.subtitle}>{t.passwordSubtitle}</Text>

          <View style={styles.phoneDisplay}>
            <Ionicons name="call-outline" size={16} color="#71717a" />
            <Text style={styles.phoneDisplayText}>{phoneDisplay}</Text>
          </View>

          <View style={[styles.passwordCard, focused && styles.passwordCardFocused]}>
            <TextInput
              style={styles.passwordInput}
              placeholder={t.passwordPlaceholder}
              placeholderTextColor="#52525b"
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
              <Ionicons name={secure ? 'eye-off-outline' : 'eye-outline'} size={22} color="#71717a" />
            </TouchableOpacity>
          </View>
          {password.length > 0 && password.length < 8 && (
            <Text style={styles.minHint}>{t.passwordError}</Text>
          )}

          <TouchableOpacity
            style={[styles.continueButton, (!isValid || loading) && styles.continueButtonDisabled]}
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
          <Pressable style={styles.popoverCard} onPress={(ev) => ev.stopPropagation()}>
            <View style={styles.popoverIconWrap}>
              <Ionicons name="lock-closed" size={32} color="#f87171" />
            </View>
            <Text style={styles.popoverTitle}>{errorPopover?.title ?? ''}</Text>
            <Text style={styles.popoverMessage}>{errorPopover?.message ?? ''}</Text>
            <TouchableOpacity
              style={styles.popoverButton}
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
    backgroundColor: '#0a0a0f',
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fafafa',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#a1a1aa',
    marginBottom: 24,
    lineHeight: 22,
  },
  phoneDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#18181b',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  phoneDisplayText: {
    color: '#a1a1aa',
    fontSize: 15,
    fontWeight: '500',
  },
  passwordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#27272a',
    paddingHorizontal: 20,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  passwordCardFocused: {
    borderColor: '#8b5cf6',
    backgroundColor: '#1c1c22',
  },
  passwordInput: {
    flex: 1,
    color: '#fafafa',
    fontSize: 17,
    paddingVertical: 18,
  },
  eyeBtn: {
    padding: 8,
  },
  minHint: {
    color: '#f87171',
    fontSize: 12,
    marginBottom: 16,
    marginLeft: 4,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#8b5cf6',
    borderRadius: 16,
    paddingVertical: 18,
    shadowColor: '#8b5cf6',
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
    backgroundColor: '#18181b',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#27272a',
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
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  popoverTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fafafa',
    marginBottom: 10,
    textAlign: 'center',
  },
  popoverMessage: {
    fontSize: 15,
    color: '#a1a1aa',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  popoverButton: {
    backgroundColor: '#8b5cf6',
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
