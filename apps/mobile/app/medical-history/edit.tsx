import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useThemeStore } from '../../store/theme-store';
import { useAuthStore } from '../../store/auth-store';
import { getTokens } from '../../lib/design';
import { Button, IconButton, Input } from '../../components/ui';
import {
  addMedicalHistory,
  listMedicalHistory,
  updateMedicalHistory,
} from '../../lib/api';

export default function MedicalHistoryEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const language = (useAuthStore((s) => s.language) ?? 'uz') as 'uz' | 'ru' | 'en';
  const insets = useSafeAreaInsets();
  const tokens = getTokens(theme);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [saving, setSaving] = useState(false);

  const tr = (u: string, r: string, e: string) =>
    language === 'uz' ? u : language === 'ru' ? r : e;

  useEffect(() => {
    if (!id) return;
    listMedicalHistory()
      .then((list) => {
        const item = list.find((h) => h._id === id);
        if (item) {
          setName(item.name);
          setDescription(item.description);
          setDurationDays(String(item.durationDays));
        }
      })
      .catch(() => {});
  }, [id]);

  const save = async () => {
    const duration = parseInt(durationDays, 10);
    if (!name.trim() || Number.isNaN(duration)) {
      Alert.alert(tr('Maydonlarni to‘ldiring', 'Заполните поля', 'Fill required fields'));
      return;
    }
    setSaving(true);
    try {
      if (id) {
        await updateMedicalHistory(id, { name: name.trim(), description, durationDays: duration });
      } else {
        await addMedicalHistory({ name: name.trim(), description, durationDays: duration });
      }
      router.back();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: tokens.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text style={[tokens.type.title, { color: tokens.colors.text }]}>
          {id ? tr('Tahrirlash', 'Редактировать', 'Edit') : tr('Yangi yozuv', 'Новая запись', 'New entry')}
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        <Input
          label={tr('Kasallik nomi', 'Название болезни', 'Illness name')}
          value={name}
          onChangeText={setName}
          placeholder={tr('Masalan: Anemiya', 'Например: Анемия', 'e.g. Anemia')}
        />
        <Input
          label={tr('Davomiyligi (kun)', 'Длительность (дней)', 'Duration (days)')}
          value={durationDays}
          onChangeText={(v) => setDurationDays(v.replace(/[^0-9]/g, ''))}
          keyboardType="numeric"
          placeholder="30"
        />
        <Input
          label={tr('Tavsif', 'Описание', 'Description')}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={6}
          containerStyle={{ minHeight: 100 }}
          placeholder={tr(
            'Qisqacha simptomlar, davolash, izohlar...',
            'Кратко симптомы, лечение, заметки...',
            'Short symptoms, treatment, notes...'
          )}
        />
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12, borderTopColor: tokens.colors.border, backgroundColor: tokens.colors.background }]}>
        <Button
          title={tr('Saqlash', 'Сохранить', 'Save')}
          variant="gradient"
          loading={saving}
          onPress={save}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
