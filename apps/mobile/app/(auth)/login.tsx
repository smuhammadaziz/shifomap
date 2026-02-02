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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useAuthStore } from '../../store/auth-store';
import { authGoogle, authPhone, getConnectionErrorMessage } from '../../lib/api';

const PHONE_PREFIX = '+998';

const copyUz = {
  title: "Kirish",
  google: "Google orqali kirish",
  phone: "Telefon raqam",
  next: "Keyingi",
  placeholder: "90 123 45 67",
  error: "Iltimos, to'g'ri raqam kiriting",
};

const copyRu = {
  title: "Вход",
  google: "Войти через Google",
  phone: "Номер телефона",
  next: "Далее",
  placeholder: "90 123 45 67",
  error: "Введите правильный номер",
};

export default function Login() {
  const router = useRouter();
  const language = useAuthStore((s) => s.language) ?? 'uz';
  const setToken = useAuthStore((s) => s.setToken);
  const setPatient = useAuthStore((s) => s.setPatient);

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const t = language === 'ru' ? copyRu : copyUz;

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  React.useEffect(() => {
    if (response?.type === 'success' && response.params.id_token) {
      handleGoogleToken(response.params.id_token);
    } else if (response?.type === 'error') {
      setGoogleLoading(false);
    }
  }, [response]);

  async function handleGoogleToken(idToken: string) {
    try {
      const data = await authGoogle(idToken);
      setToken(data.token);
      setPatient(data.patient);
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Error', getConnectionErrorMessage(e));
    } finally {
      setGoogleLoading(false);
    }
  }

  const onGooglePress = async () => {
    if (!request) return;
    setGoogleLoading(true);
    try {
      await promptAsync();
      if (response?.type !== 'success') setGoogleLoading(false);
    } catch {
      setGoogleLoading(false);
    }
  };

  const onPhoneNext = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 9) {
      Alert.alert('', t.error);
      return;
    }
    const fullPhone = PHONE_PREFIX + digits;
    setLoading(true);
    try {
      const data = await authPhone(fullPhone, language as 'uz' | 'ru' | 'en');
      setToken(data.token);
      setPatient(data.patient);
      if (data.needsProfile) {
        router.replace('/(auth)/complete-profile');
      } else {
        router.replace('/(tabs)');
      }
    } catch (e) {
      Alert.alert('Error', getConnectionErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#09090b', '#18181b', '#27272a']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{t.title}</Text>
          <TouchableOpacity
            style={styles.googleButton}
            onPress={onGooglePress}
            disabled={googleLoading || !request}
            activeOpacity={0.8}
          >
            {googleLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="logo-google" size={22} color="#ffffff" />
                <Text style={styles.googleButtonText}>{t.google}</Text>
              </>
            )}
          </TouchableOpacity>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>yoki / или</Text>
            <View style={styles.dividerLine} />
          </View>
          <Text style={styles.phoneLabel}>{t.phone}</Text>
          <View style={styles.phoneRow}>
            <Text style={styles.prefix}>{PHONE_PREFIX}</Text>
            <TextInput
              style={styles.phoneInput}
              placeholder={t.placeholder}
              placeholderTextColor="#71717a"
              value={phone}
              onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 9))}
              keyboardType="phone-pad"
              maxLength={9}
              editable={!loading}
            />
          </View>
          <TouchableOpacity
            style={[styles.nextButton, loading && styles.nextButtonDisabled]}
            onPress={onPhoneNext}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.nextButtonText}>{t.next}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboard: { flex: 1, justifyContent: 'center' },
  content: { paddingHorizontal: 24 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#ffffff', marginBottom: 32, textAlign: 'center' },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 20,
    paddingVertical: 18,
    marginBottom: 24,
  },
  googleButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#27272a' },
  dividerText: { color: '#71717a', fontSize: 12, marginHorizontal: 12 },
  phoneLabel: { color: '#a1a1aa', fontSize: 14, marginBottom: 8 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  prefix: { color: '#a1a1aa', fontSize: 16, marginRight: 8 },
  phoneInput: { flex: 1, color: '#ffffff', fontSize: 16, paddingVertical: 18 },
  nextButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
  },
  nextButtonDisabled: { opacity: 0.7 },
  nextButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
