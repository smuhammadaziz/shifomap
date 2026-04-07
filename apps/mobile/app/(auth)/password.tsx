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
  Image,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { authPhonePassword, getConnectionErrorMessage, getApiErrorMessage } from '../../lib/api';
import { getTranslations } from '../../lib/translations';
import { getColors } from '../../lib/theme';

const { width } = Dimensions.get('window');
const PHONE_REGEX = /^\+?998\d{9}$/;
const LOGO_IMG = require('../../assets/play_store_512-Photoroom.png');
import Illustration from '../../assets/undraw_medicine_hqqg.svg';

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
      <View style={[styles.loadingRoot, { backgroundColor: '#000155' }]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  const isValid = password.length >= 8;
  const phoneDisplay = PHONE_REGEX.test(phone) ? '+998 ' + formatPhoneForDisplay(phone) : phone;

  return (
    <View style={[styles.container, { backgroundColor: '#000155' }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </TouchableOpacity>
            <View style={styles.brandRow}>
              <Image source={LOGO_IMG} style={styles.headerLogo} resizeMode="contain" />
              <Text style={styles.brandText}>ShifoYo'l</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* Illustration Section */}
          <View style={styles.illustrationContainer}>
            <Illustration width={width * 0.7} height={150} />
          </View>

          {/* Welcome Text */}
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>{t.passwordTitle}</Text>
            <Text style={styles.welcomeSubtitle}>{t.passwordSubtitle}</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <View style={styles.phoneBadge}>
              <Ionicons name="call" size={16} color="#000155" />
              <Text style={styles.phoneBadgeText}>{phoneDisplay}</Text>
            </View>

            <View style={styles.formBlock}>
              <View style={[styles.inputBox, {
                backgroundColor: '#f3f4f6',
                borderColor: focused ? '#000155' : '#e5e7eb',
                borderWidth: focused ? 1.5 : 1
              }]}>
                <TextInput
                  style={styles.input}
                  placeholder={t.passwordPlaceholder}
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  secureTextEntry={secure}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setSecure((s) => !s)}>
                  <Ionicons name={secure ? 'eye-off' : 'eye'} size={22} color="#6b7280" />
                </TouchableOpacity>
              </View>
              {password.length > 0 && password.length < 8 && (
                <Text style={styles.errorText}>{t.passwordError}</Text>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (!isValid || loading) && styles.btnDisabled,
              ]}
              onPress={onSubmit}
              disabled={!isValid || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>{t.passwordContinue}</Text>
              )}
            </TouchableOpacity>
          </View>
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
  loadingRoot: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  keyboard: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  headerRow: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  backBtn: {
    position: 'absolute',
    left: 20,
    top: Platform.OS === 'ios' ? 60 : 40,
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogo: {
    width: 32,
    height: 32,
  },
  brandText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },

  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 20,
    height: 200,
  },

  welcomeContainer: {
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },

  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 30,
    paddingBottom: 50,
    flex: 1,
    minHeight: Dimensions.get('window').height * 0.6,
  },
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'center',
    marginBottom: 30,
    gap: 8,
  },
  phoneBadgeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },

  formBlock: { marginBottom: 30 },
  inputBox: {
    height: 58,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 8,
    marginLeft: 4,
  },

  primaryBtn: {
    backgroundColor: '#000155',
    height: 58,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000155',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  btnDisabled: { opacity: 0.6 },

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
