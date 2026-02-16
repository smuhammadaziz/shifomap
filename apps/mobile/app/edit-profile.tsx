import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/auth-store';
import { useThemeStore } from '../store/theme-store';
import { getTranslations } from '../lib/translations';
import { updateMe, changePatientPassword, getApiErrorMessage } from '../lib/api';
import { getColors } from '../lib/theme';

const PHONE_PREFIX = '+998';

function formatPhoneForInput(phone: string): string {
  if (!phone || !phone.startsWith('+998')) return '';
  return phone.slice(4).replace(/\D/g, '').slice(0, 9);
}

function formatPhoneDisplay(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 9);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)} ${d.slice(2)}`;
  if (d.length <= 7) return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7)}`;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const patient = useAuthStore((s) => s.patient);
  const setPatient = useAuthStore((s) => s.setPatient);
  const language = useAuthStore((s) => s.language) ?? 'uz';
  const theme = useThemeStore((s) => s.theme);
  const t = getTranslations(language);
  const colors = getColors(theme);

  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [telegram, setTelegram] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const canChangePassword = patient?.auth?.type === 'phone';

  useEffect(() => {
    if (patient) {
      setFullName(patient.fullName || '');
      setAge(patient.age != null ? String(patient.age) : '');
      setGender(patient.gender || 'male');
      setPhoneDigits(formatPhoneForInput(patient.contacts?.phone || ''));
      setTelegram(patient.contacts?.telegram || '');
    }
  }, [patient]);

  const handleSaveProfile = async () => {
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
    const phone = phoneDigits.length === 9 ? PHONE_PREFIX + phoneDigits.replace(/\D/g, '') : undefined;
    setLoading(true);
    try {
      const updates: Parameters<typeof updateMe>[0] = {
        fullName: name,
        gender,
        age: ageNum,
        contacts: {
          ...(phone && { phone }),
          telegram: telegram.trim() || null,
        },
      };
      const updated = await updateMe(updates);
      setPatient(updated);
      Alert.alert('', t.editProfileSuccess, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      const msg = getApiErrorMessage(e) || (e as Error).message;
      Alert.alert('', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword.trim()) {
      Alert.alert('', t.passwordError);
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('', t.passwordError);
      return;
    }
    setPasswordLoading(true);
    try {
      const updated = await changePatientPassword(oldPassword, newPassword);
      setPatient(updated);
      setOldPassword('');
      setNewPassword('');
      Alert.alert('', t.editProfilePasswordSuccess);
    } catch (e) {
      const msg = getApiErrorMessage(e) || (e as Error).message;
      const isWrong = msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('noto\'g\'ri');
      Alert.alert(isWrong ? t.passwordWrongTitle : '', isWrong ? t.passwordWrongMessage : msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t.editProfile}</Text>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t.completeFullName}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundCard, borderColor: colors.border, color: colors.text }]}
              placeholder={t.completeFullNamePlaceholder}
              placeholderTextColor={colors.textPlaceholder}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              editable={!loading}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t.completeAge}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundCard, borderColor: colors.border, color: colors.text }]}
              placeholder={t.completeAgePlaceholder}
              placeholderTextColor={colors.textPlaceholder}
              value={age}
              onChangeText={(v) => setAge(v.replace(/\D/g, '').slice(0, 3))}
              keyboardType="number-pad"
              editable={!loading}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t.completeGender}</Text>
            <View style={styles.genderRow}>
              <TouchableOpacity
                style={[
                  styles.genderBtn,
                  { backgroundColor: colors.backgroundCard, borderColor: colors.border },
                  gender === 'male' && { borderColor: colors.primary, backgroundColor: colors.primaryBg },
                ]}
                onPress={() => setGender('male')}
                disabled={loading}
              >
                <Text style={[styles.genderText, { color: colors.textSecondary }, gender === 'male' && { color: colors.primaryLight }]}>
                  {t.completeMale}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderBtn,
                  { backgroundColor: colors.backgroundCard, borderColor: colors.border },
                  gender === 'female' && { borderColor: colors.primary, backgroundColor: colors.primaryBg },
                ]}
                onPress={() => setGender('female')}
                disabled={loading}
              >
                <Text style={[styles.genderText, { color: colors.textSecondary }, gender === 'female' && { color: colors.primaryLight }]}>
                  {t.completeFemale}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t.loginPhone}</Text>
            <View style={[styles.phoneRow, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <Text style={[styles.phonePrefix, { color: colors.textTertiary }]}>{PHONE_PREFIX}</Text>
              <TextInput
                style={[styles.phoneInput, { color: colors.text }]}
                placeholder={t.loginPhonePlaceholder}
                placeholderTextColor={colors.textPlaceholder}
                value={formatPhoneDisplay(phoneDigits)}
                onChangeText={(text) => setPhoneDigits(text.replace(/\D/g, '').slice(0, 9))}
                keyboardType="phone-pad"
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t.editProfileTelegram}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundCard, borderColor: colors.border, color: colors.text }]}
              placeholder={t.editProfileTelegramPlaceholder}
              placeholderTextColor={colors.textPlaceholder}
              value={telegram}
              onChangeText={setTelegram}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }, loading && styles.btnDisabled]}
            onPress={handleSaveProfile}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>{t.editProfileSave}</Text>
            )}
          </TouchableOpacity>

          {canChangePassword && (
            <View style={[styles.passwordSection, { borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.changePassword}</Text>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t.editProfileOldPassword}</Text>
              <View style={[styles.passwordRow, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.passwordInput, { color: colors.text }]}
                  placeholder={t.passwordPlaceholder}
                  placeholderTextColor={colors.textPlaceholder}
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  secureTextEntry={!showOldPassword}
                  editable={!passwordLoading}
                />
                <TouchableOpacity onPress={() => setShowOldPassword((s) => !s)}>
                  <Ionicons name={showOldPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t.editProfileNewPassword}</Text>
              <View style={[styles.passwordRow, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.passwordInput, { color: colors.text }]}
                  placeholder={t.passwordPlaceholder}
                  placeholderTextColor={colors.textPlaceholder}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  editable={!passwordLoading}
                />
                <TouchableOpacity onPress={() => setShowNewPassword((s) => !s)}>
                  <Ionicons name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[
                  styles.changePwdBtn,
                  { backgroundColor: colors.primaryBg, borderColor: colors.primary },
                  (passwordLoading || !oldPassword || newPassword.length < 8) && styles.btnDisabled,
                ]}
                onPress={handleChangePassword}
                disabled={passwordLoading || !oldPassword || newPassword.length < 8}
                activeOpacity={0.8}
              >
                {passwordLoading ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <Text style={[styles.changePwdBtnText, { color: colors.primary }]}>{t.changePassword}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
  backButton: { width: 40, padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  section: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 14, fontSize: 16, paddingVertical: 16, paddingHorizontal: 16 },
  genderRow: { flexDirection: 'row', gap: 12 },
  genderBtn: { flex: 1, paddingVertical: 16, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  genderText: { fontSize: 16, fontWeight: '600' },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  phonePrefix: { fontSize: 16, marginRight: 8 },
  phoneInput: { flex: 1, fontSize: 16, paddingVertical: 16 },
  saveBtn: { paddingVertical: 18, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  passwordSection: { marginTop: 32, paddingTop: 24, borderTopWidth: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  passwordInput: { flex: 1, fontSize: 16, paddingVertical: 16 },
  changePwdBtn: { paddingVertical: 16, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  changePwdBtnText: { fontSize: 16, fontWeight: '600' },
});
