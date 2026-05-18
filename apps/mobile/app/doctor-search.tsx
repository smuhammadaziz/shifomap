import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../store/auth-store';
import { useThemeStore } from '../store/theme-store';
import { getTokens } from '../lib/design';
import {
  DOCTOR_SPECIALTIES,
  filterDoctorSpecialties,
  specialtyDisplayName,
  SpecialtyIconView,
  type DoctorSpecialty,
} from '../lib/doctor-specialties';

export default function DoctorSearchScreen() {
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const theme = useThemeStore((s) => s.theme);
  const tokens = getTokens(theme);
  const isUz = language !== 'ru';

  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => filterDoctorSpecialties(query, language),
    [query, language],
  );

  const openSpecialty = (item: DoctorSpecialty) => {
    Keyboard.dismiss();
    router.push({
      pathname: '/doctors-by-specialty',
      params: { key: item.key, q: query.trim() || undefined },
    });
  };

  const renderItem = ({ item }: { item: DoctorSpecialty }) => (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: tokens.colors.border }]}
      activeOpacity={0.75}
      onPress={() => openSpecialty(item)}
    >
      <LinearGradient colors={item.gradient} style={styles.iconWrap}>
        <SpecialtyIconView icon={item.icon} size={28} color="#fff" />
      </LinearGradient>
      <Text style={[styles.rowLabel, { color: tokens.colors.text }]}>
        {specialtyDisplayName(item, language)}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={tokens.colors.textTertiary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: tokens.colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={tokens.colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: tokens.colors.text }]}>
          {isUz ? 'Shifokor qidirish' : 'Поиск врача'}
        </Text>
      </View>

      <View style={[styles.searchBox, { backgroundColor: tokens.colors.backgroundInput, borderColor: tokens.colors.border }]}>
        <Ionicons name="search" size={20} color={tokens.colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: tokens.colors.text }]}
          placeholder={isUz ? 'Mutaxassislik yoki F.I.Sh.' : 'Специализация или ФИО'}
          placeholderTextColor={tokens.colors.textPlaceholder}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={() => {
            if (filtered.length === 1) openSpecialty(filtered[0]);
          }}
        />
        {query ? (
          <TouchableOpacity hitSlop={8} onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={20} color={tokens.colors.textTertiary} />
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={[styles.sectionLabel, { color: tokens.colors.textTertiary }]}>
        {isUz ? 'Mutaxassisliklar' : 'Специализации'}
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32 }}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Text style={{ color: tokens.colors.textSecondary, fontSize: 15, textAlign: 'center' }}>
              {isUz ? 'Mutaxassislik topilmadi' : 'Специализация не найдена'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 8, paddingBottom: 4 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5, paddingHorizontal: 16, marginBottom: 8 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 16, fontWeight: '500' },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 20,
    marginBottom: 8,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: 17, fontWeight: '600' },
  emptyList: { padding: 40 },
});
