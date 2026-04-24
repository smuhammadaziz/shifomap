import React, { useEffect, useRef, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import {
  authPhonePassword,
  getConnectionErrorMessage,
  getApiErrorMessage,
} from '../../lib/api';
import { getTranslations } from '../../lib/translations';
import { getTokens } from '../../lib/design';
import { Button } from '../../components/ui';

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
  const tokens = getTokens(theme);

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
      const isNetwork =
        !apiMsg &&
        (getConnectionErrorMessage(e).includes('Cannot reach server') ||
          (e as { code?: string })?.code === 'ERR_NETWORK');
      if (isNetwork) {
        Alert.alert('Error', getConnectionErrorMessage(e));
      } else {
        const title = t.passwordWrongTitle;
        const message =
          apiMsg && apiMsg !== 'Invalid password' ? apiMsg : t.passwordWrongMessage;
        setErrorPopover({ title, message });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!showScreen) {
    return (
      <View style={[styles.loadingRoot, { backgroundColor: tokens.colors.background }]}>
        <ActivityIndicator size="large" color={tokens.brand.iris} />
      </View>
    );
  }

  const isValid = password.length >= 8;
  const phoneDisplay = PHONE_REGEX.test(phone) ? '+998 ' + formatPhoneForDisplay(phone) : phone;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: tokens.colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={[styles.backBtn, { backgroundColor: tokens.colors.backgroundCard, borderColor: tokens.colors.border }]}
            >
              <Ionicons name="chevron-back" size={22} color={tokens.colors.text} />
            </TouchableOpacity>
          </View>

          <LinearGradient
            colors={tokens.gradients.cool as [string, string, ...string[]]}
            style={[styles.lockBubble]}
          >
            <View style={[styles.lockInner, { backgroundColor: tokens.colors.backgroundCard }]}>
              <Ionicons name="lock-closed" size={32} color={tokens.brand.iris} />
            </View>
          </LinearGradient>

          <View style={{ paddingHorizontal: 24, alignItems: 'center', marginTop: 24 }}>
            <Text style={[tokens.type.display, { color: tokens.colors.text, textAlign: 'center' }]}>
              {t.passwordTitle}
            </Text>
            <Text
              style={{
                color: tokens.colors.textSecondary,
                fontSize: 14,
                textAlign: 'center',
                marginTop: 8,
                lineHeight: 20,
                paddingHorizontal: 20,
              }}
            >
              {t.passwordSubtitle}
            </Text>
            <View style={[styles.phoneChip, { backgroundColor: tokens.colors.backgroundSecondary, borderColor: tokens.colors.border }]}>
              <Ionicons name="call" size={14} color={tokens.brand.iris} />
              <Text style={{ color: tokens.colors.text, fontWeight: '700', fontSize: 13 }}>
                {phoneDisplay}
              </Text>
            </View>
          </View>

          <View style={styles.form}>
            <Text style={[tokens.type.caption, { color: tokens.colors.textSecondary, marginBottom: 10, marginLeft: 4 }]}>
              {t.passwordTitle}
            </Text>
            <View
              style={[
                styles.inputBox,
                {
                  backgroundColor: tokens.colors.backgroundInput,
                  borderColor: focused ? tokens.brand.iris : tokens.colors.border,
                },
              ]}
            >
              <Ionicons name="key-outline" size={18} color={tokens.colors.textTertiary} />
              <TextInput
                style={[styles.input, { color: tokens.colors.text }]}
                placeholder={t.passwordPlaceholder}
                placeholderTextColor={tokens.colors.textPlaceholder}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                secureTextEntry={secure}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setSecure((s) => !s)} hitSlop={10}>
                <Ionicons name={secure ? 'eye-off' : 'eye'} size={20} color={tokens.colors.textTertiary} />
              </TouchableOpacity>
            </View>
            {password.length > 0 && password.length < 8 ? (
              <Text style={{ color: tokens.colors.error, fontSize: 12, marginTop: 8, marginLeft: 4 }}>
                {t.passwordError}
              </Text>
            ) : null}

            <View style={{ height: 24 }} />
            <Button
              title={t.passwordContinue}
              variant="gradient"
              size="lg"
              rightIcon="arrow-forward"
              loading={loading}
              disabled={!isValid}
              onPress={onSubmit}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={!!errorPopover} transparent animationType="fade" onRequestClose={() => setErrorPopover(null)}>
        <Pressable style={styles.popoverOverlay} onPress={() => setErrorPopover(null)}>
          <Pressable
            style={[styles.popoverCard, { backgroundColor: tokens.colors.backgroundCard, borderColor: tokens.colors.border }]}
            onPress={(ev) => ev.stopPropagation()}
          >
            <View style={[styles.popoverIconWrap, { backgroundColor: tokens.colors.errorBg }]}>
              <Ionicons name="alert-circle" size={28} color={tokens.colors.error} />
            </View>
            <Text style={[tokens.type.title, { color: tokens.colors.text, marginBottom: 8, textAlign: 'center' }]}>
              {errorPopover?.title ?? ''}
            </Text>
            <Text style={{ color: tokens.colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 18 }}>
              {errorPopover?.message ?? ''}
            </Text>
            <Button title={t.errorDismiss} onPress={() => setErrorPopover(null)} />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingRoot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  topRow: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBubble: {
    alignSelf: 'center',
    marginTop: 20,
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneChip: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  form: { paddingHorizontal: 24, paddingTop: 28 },
  inputBox: {
    height: 56,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: { flex: 1, fontSize: 15, fontWeight: '600' },
  popoverOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  popoverCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    alignItems: 'center',
  },
  popoverIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
});
