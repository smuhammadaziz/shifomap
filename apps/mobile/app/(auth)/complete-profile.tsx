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
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { completeProfile } from '../../lib/api';
import { getTranslations } from '../../lib/translations';
import { getColors } from '../../lib/theme';

export default function CompleteProfileScreen() {
  const router = useRouter();
  const language = useAuthStore((s) => s.language) ?? 'uz';
  const theme = useThemeStore((s) => s.theme);
  const setPatient = useAuthStore((s) => s.setPatient);

  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [loading, setLoading] = useState(false);

  const t = getTranslations(language);
  const colors = getColors(theme);

  const gradientColors: readonly [string, string, string] = theme === 'light'
    ? ['#ffffff', '#f8f9fa', '#f1f3f5']
    : ['#09090b', '#18181b', '#27272a'];

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
      const updated = await completeProfile({
        fullName: name,
        gender,
        age: ageNum,
      });
      setPatient(updated);
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={gradientColors}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.title, { color: colors.text }]}>{t.completeTitle}</Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t.completeFullName}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.backgroundCard, borderColor: colors.border, color: colors.text }]}
            placeholder={t.completeFullNamePlaceholder}
            placeholderTextColor={colors.textTertiary}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            editable={!loading}
          />
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t.completeAge}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.backgroundCard, borderColor: colors.border, color: colors.text }]}
            placeholder={t.completeAgePlaceholder}
            placeholderTextColor={colors.textTertiary}
            value={age}
            onChangeText={(v) => setAge(v.replace(/\D/g, '').slice(0, 3))}
            keyboardType="number-pad"
            editable={!loading}
          />
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t.completeGender}</Text>
          <View style={styles.genderRow}>
            <TouchableOpacity
              style={[styles.genderBtn, { backgroundColor: colors.backgroundCard, borderColor: colors.border }, gender === 'male' && { borderColor: colors.primary, backgroundColor: colors.primaryBg }]}
              onPress={() => setGender('male')}
              disabled={loading}
            >
              <Text style={[styles.genderText, { color: colors.textSecondary }, gender === 'male' && { color: colors.primaryLight }]}>
                {t.completeMale}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.genderBtn, { backgroundColor: colors.backgroundCard, borderColor: colors.border }, gender === 'female' && { borderColor: colors.primary, backgroundColor: colors.primaryBg }]}
              onPress={() => setGender('female')}
              disabled={loading}
            >
              <Text style={[styles.genderText, { color: colors.textSecondary }, gender === 'female' && { color: colors.primaryLight }]}>
                {t.completeFemale}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.doneButton, { backgroundColor: colors.primary }, loading && styles.doneButtonDisabled]}
            onPress={onDone}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.doneButtonText}>{t.completeDone}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboard: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 32 },
  label: { fontSize: 14, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    fontSize: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  genderRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  genderBtn: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  genderText: { fontSize: 16, fontWeight: '600' },
  doneButton: {
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
  },
  doneButtonDisabled: { opacity: 0.7 },
  doneButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
