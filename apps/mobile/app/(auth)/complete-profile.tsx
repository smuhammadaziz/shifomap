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
import { completeProfile } from '../../lib/api';
import { getTranslations } from '../../lib/translations';

export default function CompleteProfileScreen() {
  const router = useRouter();
  const language = useAuthStore((s) => s.language) ?? 'uz';
  const setPatient = useAuthStore((s) => s.setPatient);

  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [loading, setLoading] = useState(false);

  const t = getTranslations(language);

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
      colors={['#09090b', '#18181b', '#27272a']}
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
          <Text style={styles.title}>{t.completeTitle}</Text>
          <Text style={styles.label}>{t.completeFullName}</Text>
          <TextInput
            style={styles.input}
            placeholder={t.completeFullNamePlaceholder}
            placeholderTextColor="#71717a"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            editable={!loading}
          />
          <Text style={styles.label}>{t.completeAge}</Text>
          <TextInput
            style={styles.input}
            placeholder={t.completeAgePlaceholder}
            placeholderTextColor="#71717a"
            value={age}
            onChangeText={(v) => setAge(v.replace(/\D/g, '').slice(0, 3))}
            keyboardType="number-pad"
            editable={!loading}
          />
          <Text style={styles.label}>{t.completeGender}</Text>
          <View style={styles.genderRow}>
            <TouchableOpacity
              style={[styles.genderBtn, gender === 'male' && styles.genderBtnActive]}
              onPress={() => setGender('male')}
              disabled={loading}
            >
              <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>
                {t.completeMale}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.genderBtn, gender === 'female' && styles.genderBtnActive]}
              onPress={() => setGender('female')}
              disabled={loading}
            >
              <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>
                {t.completeFemale}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.doneButton, loading && styles.doneButtonDisabled]}
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
  title: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginBottom: 32 },
  label: { color: '#a1a1aa', fontSize: 14, marginBottom: 8 },
  input: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 16,
    color: '#ffffff',
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
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    alignItems: 'center',
  },
  genderBtnActive: { borderColor: '#7c3aed', backgroundColor: 'rgba(124, 58, 237, 0.15)' },
  genderText: { color: '#a1a1aa', fontSize: 16, fontWeight: '600' },
  genderTextActive: { color: '#a78bfa' },
  doneButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
  },
  doneButtonDisabled: { opacity: 0.7 },
  doneButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
