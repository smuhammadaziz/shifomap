import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { completeProfile } from '../../lib/api';
import { getTranslations } from '../../lib/translations';
import { getTokens } from '../../lib/design';
import { Button } from '../../components/ui';

export default function CompleteProfileScreen() {
  const router = useRouter();
  const language = useAuthStore((s) => s.language) ?? 'uz';
  const theme = useThemeStore((s) => s.theme);
  const setPatient = useAuthStore((s) => s.setPatient);

  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const t = getTranslations(language);
  const tokens = getTokens(theme);

  const onDone = async () => {
    const name = fullName.trim();
    if (!name) {
      Alert.alert('', t.completeError);
      return;
    }
    const ageNum = age.trim() ? parseInt(age, 10) : null;
    if (age.trim() && (isNaN(ageNum!) || ageNum! < 1 || ageNum! > 150)) {
      Alert.alert('', t.completeAgeError);
      return;
    }
    setLoading(true);
    try {
      const updated = await completeProfile({ fullName: name, gender, age: ageNum });
      setPatient(updated);
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: tokens.colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient
            colors={tokens.gradients.cool as [string, string, ...string[]]}
            style={styles.avatarBubble}
          >
            <View style={[styles.avatarInner, { backgroundColor: tokens.colors.backgroundCard }]}>
              <Ionicons name="person" size={48} color={tokens.brand.iris} />
            </View>
          </LinearGradient>

          <View style={{ paddingHorizontal: 24, alignItems: 'center', marginTop: 18 }}>
            <Text style={[tokens.type.display, { color: tokens.colors.text, textAlign: 'center' }]}>
              {t.completeTitle}
            </Text>
            <Text
              style={{
                color: tokens.colors.textSecondary,
                fontSize: 14,
                textAlign: 'center',
                marginTop: 8,
                lineHeight: 20,
              }}
            >
              {language === 'uz'
                ? "Shaxsiy ma'lumotlaringiz xavfsiz saqlanadi"
                : 'Ваши данные хранятся в безопасности'}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={{ marginBottom: 18 }}>
              <Text style={[tokens.type.caption, { color: tokens.colors.textSecondary, marginBottom: 8, marginLeft: 4 }]}>
                {t.completeFullName}
              </Text>
              <View
                style={[
                  styles.inputBox,
                  {
                    backgroundColor: tokens.colors.backgroundInput,
                    borderColor: focusedField === 'name' ? tokens.brand.iris : tokens.colors.border,
                  },
                ]}
              >
                <Ionicons name="person-outline" size={18} color={tokens.colors.textTertiary} />
                <TextInput
                  style={[styles.input, { color: tokens.colors.text }]}
                  placeholder={t.completeFullNamePlaceholder}
                  placeholderTextColor={tokens.colors.textPlaceholder}
                  value={fullName}
                  onChangeText={setFullName}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={{ marginBottom: 18 }}>
              <Text style={[tokens.type.caption, { color: tokens.colors.textSecondary, marginBottom: 8, marginLeft: 4 }]}>
                {t.completeAge}
              </Text>
              <View
                style={[
                  styles.inputBox,
                  {
                    backgroundColor: tokens.colors.backgroundInput,
                    borderColor: focusedField === 'age' ? tokens.brand.iris : tokens.colors.border,
                  },
                ]}
              >
                <Ionicons name="calendar-outline" size={18} color={tokens.colors.textTertiary} />
                <TextInput
                  style={[styles.input, { color: tokens.colors.text }]}
                  placeholder={t.completeAgePlaceholder}
                  placeholderTextColor={tokens.colors.textPlaceholder}
                  value={age}
                  onChangeText={(v) => setAge(v.replace(/\D/g, '').slice(0, 3))}
                  onFocus={() => setFocusedField('age')}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="number-pad"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={{ marginBottom: 24 }}>
              <Text style={[tokens.type.caption, { color: tokens.colors.textSecondary, marginBottom: 8, marginLeft: 4 }]}>
                {t.completeGender}
              </Text>
              <View style={styles.genderRow}>
                {(['male', 'female'] as const).map((g) => {
                  const active = gender === g;
                  return (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.genderBtn,
                        {
                          backgroundColor: active ? tokens.colors.text : tokens.colors.backgroundInput,
                          borderColor: active ? 'transparent' : tokens.colors.border,
                        },
                      ]}
                      onPress={() => setGender(g)}
                      disabled={loading}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name={g === 'male' ? 'male' : 'female'}
                        size={18}
                        color={active ? tokens.colors.background : tokens.colors.textSecondary}
                      />
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '700',
                          color: active ? tokens.colors.background : tokens.colors.text,
                        }}
                      >
                        {g === 'male' ? t.completeMale : t.completeFemale}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <Button
              title={t.completeDone}
              variant="gradient"
              size="lg"
              rightIcon="checkmark"
              loading={loading}
              onPress={onDone}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 40, paddingTop: 20 },
  avatarBubble: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
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
  genderRow: { flexDirection: 'row', gap: 12 },
  genderBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
