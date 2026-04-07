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
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { completeProfile } from '../../lib/api';
import { getTranslations } from '../../lib/translations';
import { getColors } from '../../lib/theme';

const { width } = Dimensions.get('window');
const LOGO_IMG = require('../../assets/play_store_512-Photoroom.png');
import Illustration from '../../assets/undraw_medicine_hqqg.svg';

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
  const colors = getColors(theme);

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
            <View style={styles.brandRow}>
              <Image source={LOGO_IMG} style={styles.headerLogo} resizeMode="contain" />
              <Text style={styles.brandText}>ShifoYo'l</Text>
            </View>
          </View>

          {/* Illustration Section */}
          <View style={styles.illustrationContainer}>
            <Illustration width={width * 0.7} height={180} />
          </View>

          {/* Welcome Text */}
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>{t.completeTitle}</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <View style={styles.fieldItem}>
              <Text style={styles.label}>{t.completeFullName}</Text>
              <View style={[styles.inputBox, { 
                backgroundColor: '#f3f4f6', 
                borderColor: focusedField === 'name' ? '#000155' : '#e5e7eb',
                borderWidth: focusedField === 'name' ? 1.5 : 1
              }]}>
                <TextInput
                  style={styles.input}
                  placeholder={t.completeFullNamePlaceholder}
                  placeholderTextColor="#9ca3af"
                  value={fullName}
                  onChangeText={setFullName}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.fieldItem}>
              <Text style={styles.label}>{t.completeAge}</Text>
              <View style={[styles.inputBox, { 
                backgroundColor: '#f3f4f6', 
                borderColor: focusedField === 'age' ? '#000155' : '#e5e7eb',
                borderWidth: focusedField === 'age' ? 1.5 : 1
              }]}>
                <TextInput
                  style={styles.input}
                  placeholder={t.completeAgePlaceholder}
                  placeholderTextColor="#9ca3af"
                  value={age}
                  onChangeText={(v) => setAge(v.replace(/\D/g, '').slice(0, 3))}
                  onFocus={() => setFocusedField('age')}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="number-pad"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.fieldItem}>
              <Text style={styles.label}>{t.completeGender}</Text>
              <View style={styles.genderRow}>
                <TouchableOpacity
                  style={[
                    styles.genderBtn, 
                    gender === 'male' 
                      ? { backgroundColor: '#000155', borderColor: '#000155' } 
                      : { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' }
                  ]}
                  onPress={() => setGender('male')}
                  disabled={loading}
                >
                  <Ionicons name="male" size={20} color={gender === 'male' ? '#fff' : '#4b5563'} />
                  <Text style={[styles.genderText, { color: gender === 'male' ? '#fff' : '#4b5563' }]}>
                    {t.completeMale}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.genderBtn, 
                    gender === 'female' 
                      ? { backgroundColor: '#000155', borderColor: '#000155' } 
                      : { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' }
                  ]}
                  onPress={() => setGender('female')}
                  disabled={loading}
                >
                  <Ionicons name="female" size={20} color={gender === 'female' ? '#fff' : '#4b5563'} />
                  <Text style={[styles.genderText, { color: gender === 'female' ? '#fff' : '#4b5563' }]}>
                    {t.completeFemale}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                loading && styles.primaryBtnDisabled,
              ]}
              onPress={onDone}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>{t.completeDone}</Text>
              )}
            </TouchableOpacity>
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
    marginBottom: 20,
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

  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 30,
    paddingBottom: 50,
    flex: 1,
    minHeight: Dimensions.get('window').height * 0.7,
  },
  fieldItem: { marginBottom: 24 },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  inputBox: {
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  input: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  genderRow: { flexDirection: 'row', gap: 12 },
  genderBtn: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  genderText: { fontSize: 16, fontWeight: '600' },

  primaryBtn: {
    backgroundColor: '#000155',
    height: 58,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000155',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
