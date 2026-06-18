import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/auth-store';
import { useThemeStore } from '../store/theme-store';
import { getTokens } from '../lib/design';
import { getClinicDetail, createHomeVisitRequest, getApiErrorMessage } from '../lib/api';
import { Button } from '../components/ui';
import { HOME_VISIT_SYMPTOMS, symptomLabel } from '../lib/home-visit-symptoms';

export default function HomeVisitRequestScreen() {
  const router = useRouter();
  const { doctorId, clinicId } = useLocalSearchParams<{ doctorId: string; clinicId: string }>();
  const language = useAuthStore((s) => s.language) ?? 'uz';
  const token = useAuthStore((s) => s.token);
  const theme = useThemeStore((s) => s.theme);
  const tokens = getTokens(theme);
  const isUz = language !== 'ru';

  const [clinicName, setClinicName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorSpecialty, setDoctorSpecialty] = useState('');
  const [street, setStreet] = useState('');
  const [building, setBuilding] = useState('');
  const [apartment, setApartment] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!clinicId || !doctorId) return;
    getClinicDetail(clinicId)
      .then((clinic) => {
        setClinicName(clinic.clinicDisplayName);
        const doc = clinic.doctors?.find((d) => d._id === doctorId);
        if (doc) {
          setDoctorName(doc.fullName);
          setDoctorSpecialty(doc.specialty);
        }
      })
      .catch(() => {});
  }, [clinicId, doctorId]);

  const toggleSymptom = (label: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label],
    );
  };

  const onSubmit = async () => {
    if (!token) {
      Alert.alert(
        isUz ? 'Hisobga kiring' : 'Войдите в аккаунт',
        isUz ? 'So‘rov yuborish uchun tizimga kiring.' : 'Войдите, чтобы отправить заявку.',
        [
          { text: isUz ? 'Bekor' : 'Отмена', style: 'cancel' },
          { text: isUz ? 'Kirish' : 'Войти', onPress: () => router.push('/(auth)/login') },
        ],
      );
      return;
    }
    if (!street.trim()) {
      Alert.alert(isUz ? 'Manzil' : 'Адрес', isUz ? 'Ko‘cha va uy manzilini kiriting.' : 'Укажите улицу и дом.');
      return;
    }
    if (!clinicId || !doctorId) return;

    setSubmitting(true);
    try {
      await createHomeVisitRequest({
        clinicId,
        doctorId,
        address: {
          street: street.trim(),
          building: building.trim() || null,
          apartment: apartment.trim() || null,
        },
        symptoms: selectedSymptoms,
        notes: notes.trim(),
      });
      Alert.alert(
        isUz ? 'Yuborildi' : 'Отправлено',
        isUz
          ? 'Shifokorga uyga chaqirish so‘rovi yuborildi. Tez orada siz bilan bog‘lanishadi.'
          : 'Заявка на вызов врача на дом отправлена. С вами свяжутся в ближайшее время.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (e) {
      const code = (e as { response?: { data?: { code?: string } } })?.response?.data?.code;
      const message =
        code === 'VALIDATION_ERROR'
          ? isUz
            ? 'Iltimos, manzilni to‘liq va to‘g‘ri kiriting.'
            : 'Пожалуйста, укажите адрес полностью и корректно.'
          : (getApiErrorMessage(e) ?? (isUz ? 'So‘rov yuborilmadi.' : 'Не удалось отправить заявку.'));
      Alert.alert(isUz ? 'Xatolik' : 'Ошибка', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: tokens.colors.background }]} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={28} color={tokens.colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: tokens.colors.text }]}>
            {isUz ? 'Shifokorni uyga chaqirish' : 'Вызов врача на дом'}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { backgroundColor: tokens.colors.backgroundCard, borderColor: tokens.colors.border }]}>
            <View style={[styles.clinicIcon, { backgroundColor: tokens.brand.primarySoft }]}>
              <Ionicons name="business" size={22} color={tokens.colors.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.cardTitle, { color: tokens.colors.text }]} numberOfLines={2}>
                {clinicName || (isUz ? 'Klinika' : 'Клиника')}
              </Text>
              <Text style={[styles.cardSub, { color: tokens.colors.textSecondary }]} numberOfLines={1}>
                {doctorName ? `${doctorName} · ${doctorSpecialty}` : isUz ? 'Shifokor' : 'Врач'}
              </Text>
            </View>
          </View>

          <Text style={[styles.sectionLabel, { color: tokens.colors.text }]}>
            {isUz ? 'Sizning manzilingiz' : 'Ваш адрес'}
          </Text>
          <TextInput
            style={[styles.input, { color: tokens.colors.text, borderColor: tokens.colors.border, backgroundColor: tokens.colors.backgroundInput }]}
            placeholder={isUz ? 'Manzil (ko‘cha, uy)' : 'Адрес (улица, дом)'}
            placeholderTextColor={tokens.colors.textPlaceholder}
            value={street}
            onChangeText={setStreet}
          />
          <View style={styles.rowInputs}>
            <TextInput
              style={[styles.inputHalf, { color: tokens.colors.text, borderColor: tokens.colors.border, backgroundColor: tokens.colors.backgroundInput }]}
              placeholder={isUz ? 'Korpus' : 'Корпус'}
              placeholderTextColor={tokens.colors.textPlaceholder}
              value={building}
              onChangeText={setBuilding}
            />
            <TextInput
              style={[styles.inputHalf, { color: tokens.colors.text, borderColor: tokens.colors.border, backgroundColor: tokens.colors.backgroundInput }]}
              placeholder={isUz ? 'Xonadon' : 'Квартира'}
              placeholderTextColor={tokens.colors.textPlaceholder}
              value={apartment}
              onChangeText={setApartment}
              keyboardType="number-pad"
            />
          </View>

          <Text style={[styles.sectionLabel, { color: tokens.colors.text, marginTop: 20 }]}>
            {isUz ? 'Agar alomatlaringiz bo‘lsa, belgilang' : 'Отметьте, если у вас есть симптомы'}
          </Text>
          <View style={styles.chips}>
            {HOME_VISIT_SYMPTOMS.map((s) => {
              const label = symptomLabel(s, language);
              const active = selectedSymptoms.includes(label);
              return (
                <TouchableOpacity
                  key={s.key}
                  onPress={() => toggleSymptom(label)}
                  style={[
                    styles.chip,
                    active
                      ? { backgroundColor: tokens.colors.primary, borderColor: tokens.colors.primary }
                      : { backgroundColor: tokens.colors.backgroundSecondary, borderColor: tokens.colors.border },
                  ]}
                >
                  <Text style={{ color: active ? '#fff' : tokens.colors.primary, fontSize: 13, fontWeight: '600' }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.sectionLabel, { color: tokens.colors.text, marginTop: 20 }]}>
            {isUz ? 'Qo‘shimcha ma’lumot' : 'Дополнительно'}
          </Text>
          <TextInput
            style={[styles.textArea, { color: tokens.colors.text, borderColor: tokens.colors.border, backgroundColor: tokens.colors.backgroundInput }]}
            placeholder={
              isUz
                ? 'Shifokorga tashrifdan oldin holatingiz haqida nima aytmoqchisiz?'
                : 'Что вы хотите сообщить врачу о своем состоянии перед визитом?'
            }
            placeholderTextColor={tokens.colors.textPlaceholder}
            value={notes}
            onChangeText={setNotes}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: tokens.colors.border, backgroundColor: tokens.colors.background }]}>
          <Button
            title={isUz ? 'So‘rov yuborish' : 'Отправить заявку'}
            onPress={() => void onSubmit()}
            variant="gradient"
            size="lg"
            loading={submitting}
            disabled={!street.trim() || submitting}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: { paddingHorizontal: 8, paddingBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', paddingHorizontal: 12, marginBottom: 8, letterSpacing: -0.4 },
  scroll: { paddingHorizontal: 20, paddingBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 20,
  },
  clinicIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardSub: { fontSize: 13, marginTop: 4, fontWeight: '500' },
  sectionLabel: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 10,
  },
  rowInputs: { flexDirection: 'row', gap: 10 },
  inputHalf: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 10,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  textArea: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    minHeight: 120,
    lineHeight: 22,
  },
  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderTopWidth: StyleSheet.hairlineWidth },
});
