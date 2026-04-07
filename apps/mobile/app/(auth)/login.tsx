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
  Image,
  Dimensions,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { getTranslations } from '../../lib/translations';
import { getColors } from '../../lib/theme';

const { width } = Dimensions.get('window');
const PHONE_PREFIX = '+998';
import Illustration from '../../assets/undraw_medicine_hqqg.svg';
const LOGO_IMG = require('../../assets/play_store_512-Photoroom.png');

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
          {/* Top Logo Section */}
          <View style={styles.headerRow}>
            <View style={styles.brandRow}>
              <Image source={LOGO_IMG} style={styles.headerLogo} resizeMode="contain" />
              <Text style={styles.brandText}>ShifoYo'l</Text>
            </View>
          </View>

          {/* Illustration Section */}
          <View style={styles.illustrationContainer}>
            <Illustration width={width * 0.8} height={180} />
          </View>

          {/* Welcome Text */}
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>{t.loginWelcome}</Text>
            <Text style={styles.welcomeSubtitle}>{t.homeSubtitle}</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t.loginPhoneLabel}</Text>

            <View style={styles.phoneInputContainer}>
              <View style={[styles.prefixBox, { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' }]}>
                <Text style={styles.prefixText}>{PHONE_PREFIX}</Text>
              </View>
              <View style={[styles.inputBox, {
                backgroundColor: '#f3f4f6',
                borderColor: focused ? '#000155' : '#e5e7eb',
                borderWidth: focused ? 1.5 : 1
              }]}>
                <TextInput
                  style={styles.input}
                  placeholder="90 123 45 67"
                  placeholderTextColor="#9ca3af"
                  value={digits}
                  onChangeText={onPhoneChange}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  keyboardType="phone-pad"
                  maxLength={9}
                  editable={!navigating}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (!isValid || navigating) && styles.btnDisabled,
              ]}
              onPress={onPhoneNext}
              disabled={!isValid || navigating}
              activeOpacity={0.85}
            >
              {navigating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>{t.loginNext}</Text>
              )}
            </TouchableOpacity>



            <View style={styles.guestContainer}>
              <TouchableOpacity onPress={() => Linking.openURL('https://t.me/shifoyol_contact_bot')}>
                <Text style={styles.guestText}>{t.contactUs}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboard: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  headerRow: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
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
    marginTop: 20,
    height: 220,
  },

  welcomeContainer: {
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  welcomeTitle: {
    fontSize: 26,
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
    minHeight: Dimensions.get('window').height * 0.5,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  prefixBox: {
    paddingHorizontal: 16,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prefixText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  inputBox: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 1,
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
  btnDisabled: {
    opacity: 0.6,
  },

  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  footerLinkText: {
    color: '#4b5563',
    fontSize: 14,
    fontWeight: '600',
  },

  guestContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  guestText: {
    color: '#9ca3af',
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
