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
import { useAuthStore } from '../../store/auth-store';
import { getTranslations } from '../../lib/translations';

const PHONE_PREFIX = '+998';

/** Format 9 digits as 99 999 99 99 (e.g. 901234567 → 90 123 45 67) */
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
  const [digits, setDigits] = useState('');
  const [navigating, setNavigating] = useState(false);
  const [focused, setFocused] = useState(false);

  const t = getTranslations(language);
  const setPendingPhone = useAuthStore((s) => s.setPendingPhone);

  const onPhoneNext = () => {
    if (digits.length !== 9) {
      Alert.alert('', t.loginError);
      return;
    }
    const fullPhone = PHONE_PREFIX + digits;
    setPendingPhone(fullPhone);
    setNavigating(true);
    // Defer navigation so store update is committed first (fixes first-tap flicker)
    const href = `/(auth)/password?phone=${encodeURIComponent(fullPhone)}`;
    requestAnimationFrame(() => {
      setTimeout(() => {
        router.push(href);
        setNavigating(false);
      }, 0);
    });
  };

  const onPhoneChange = (text: string) => {
    const next = text.replace(/\D/g, '').slice(0, 9);
    setDigits(next);
  };

  const isValid = digits.length === 9;
  const displayValue = formatPhoneDisplay(digits);

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
          <View style={styles.iconWrap}>
            <Ionicons name="call-outline" size={40} color="#8b5cf6" />
          </View>
          <Text style={styles.title}>{t.loginTitle}</Text>
          <Text style={styles.subtitle}>{t.loginSubtitle}</Text>

          <View style={[styles.phoneCard, focused && styles.phoneCardFocused]}>
            <View style={styles.phoneRow}>
            <View style={styles.prefixWrap}>
                <Text style={styles.prefix}>{PHONE_PREFIX}</Text>
              </View>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.phoneInput}
                  placeholder={t.loginPhonePlaceholder}
                  placeholderTextColor="#52525b"
                  value={displayValue}
                  onChangeText={onPhoneChange}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  keyboardType="phone-pad"
                  maxLength={12}
                  editable={!navigating}
                />
                {digits.length > 0 && (
                  <View style={styles.digitChips}>
                    {[0, 1, 2].map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.digitChip,
                          digits.length > i * 3 ? styles.digitChipFilled : null,
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>
            </View>
            <View style={styles.phoneHint}>
              <Ionicons name="information-circle-outline" size={14} color="#71717a" />
              <Text style={styles.phoneHintText}>{t.loginPhoneHint}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.nextButton, (!isValid || navigating) && styles.nextButtonDisabled]}
            onPress={onPhoneNext}
            disabled={!isValid || navigating}
            activeOpacity={0.85}
          >
            {navigating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.nextButtonText}>{t.loginNext}</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
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
  content: { paddingHorizontal: 28 },
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
    marginBottom: 32,
    lineHeight: 22,
  },
  phoneCard: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#27272a',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  phoneCardFocused: {
    borderColor: '#8b5cf6',
    backgroundColor: '#1c1c22',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefixWrap: {
    marginRight: 12,
    paddingVertical: 4,
  },
  prefix: {
    color: '#a1a1aa',
    fontSize: 18,
    fontWeight: '600',
  },
  inputWrap: { flex: 1 },
  phoneInput: {
    color: '#fafafa',
    fontSize: 22,
    fontWeight: '600',
    paddingVertical: 12,
    letterSpacing: 2,
  },
  digitChips: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  digitChip: {
    width: 8,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#27272a',
  },
  digitChipFilled: {
    backgroundColor: '#8b5cf6',
  },
  phoneHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  phoneHintText: {
    color: '#71717a',
    fontSize: 12,
  },
  nextButton: {
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
  nextButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
});
