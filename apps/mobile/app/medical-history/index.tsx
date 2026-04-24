import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/theme-store';
import { useAuthStore } from '../../store/auth-store';
import { getTokens } from '../../lib/design';
import { Button, Card, IconButton } from '../../components/ui';
import { listMedicalHistory, deleteMedicalHistory, type MedicalHistoryEntry } from '../../lib/api';

export default function MedicalHistoryIndex() {
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const language = (useAuthStore((s) => s.language) ?? 'uz') as 'uz' | 'ru' | 'en';
  const insets = useSafeAreaInsets();
  const tokens = getTokens(theme);
  const [items, setItems] = useState<MedicalHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const tr = (u: string, r: string, e: string) =>
    language === 'uz' ? u : language === 'ru' ? r : e;

  const load = async () => {
    setLoading(true);
    try {
      const data = await listMedicalHistory();
      setItems(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [])
  );

  const confirmDelete = (id: string) => {
    Alert.alert(tr("O'chirish", 'Удалить', 'Delete'), tr('Ishonchingiz komilmi?', 'Вы уверены?', 'Are you sure?'), [
      { text: tr('Bekor', 'Отмена', 'Cancel'), style: 'cancel' },
      {
        text: tr("O'chirish", 'Удалить', 'Delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMedicalHistory(id);
            load();
          } catch (e) {
            Alert.alert('Error', (e as Error).message);
          }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text style={[tokens.type.title, { color: tokens.colors.text }]}>
          {tr('Sog‘lik tarixi', 'История болезней', 'Medical history')}
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 120 }}>
        <Text style={[tokens.type.bodySm, { color: tokens.colors.textSecondary }]}>
          {tr(
            'Shifokorlar buni ko‘rib, sizga mos tavsiyalar beradi.',
            'Врачи увидят это и дадут подходящие рекомендации.',
            'Doctors can see this and give you appropriate advice.'
          )}
        </Text>
        {loading ? (
          <ActivityIndicator color={tokens.brand.iris} />
        ) : items.length === 0 ? (
          <Card>
            <View style={{ alignItems: 'center', padding: 20 }}>
              <Ionicons name="medical" size={42} color={tokens.brand.iris} />
              <Text style={[tokens.type.title, { color: tokens.colors.text, marginTop: 10 }]}>
                {tr('Yozuv yo‘q', 'Пока пусто', 'No entries yet')}
              </Text>
              <Text style={{ color: tokens.colors.textSecondary, textAlign: 'center', marginTop: 6 }}>
                {tr(
                  'Birinchi yozuvni qo‘shing.',
                  'Добавьте первую запись.',
                  'Add your first entry.'
                )}
              </Text>
            </View>
          </Card>
        ) : (
          items.map((it) => (
            <Card key={it._id} onPress={() => router.push({ pathname: '/medical-history/edit', params: { id: it._id } })}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[tokens.type.title, { color: tokens.colors.text }]} numberOfLines={1}>
                    {it.name}
                  </Text>
                  <Text style={{ color: tokens.colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                    {it.durationDays} {tr('kun', 'дней', 'days')}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => confirmDelete(it._id)}>
                  <Ionicons name="trash-outline" size={18} color={tokens.colors.error} />
                </TouchableOpacity>
              </View>
              {it.description ? (
                <Text style={{ color: tokens.colors.text, fontSize: 13, marginTop: 8 }} numberOfLines={3}>
                  {it.description}
                </Text>
              ) : null}
            </Card>
          ))
        )}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Button
          title={tr('Yozuv qo‘shish', 'Добавить запись', 'Add entry')}
          variant="gradient"
          leftIcon="add"
          onPress={() => router.push('/medical-history/edit')}
        />
      </View>
    </View>
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
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16 },
});
