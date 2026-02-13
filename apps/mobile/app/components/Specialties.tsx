import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth-store';
import { getTranslations } from '../../lib/translations';

const categories = [
  { nameKey: 'Diagnostics' as const, nameUz: 'Diagnostika', nameRu: 'Диагностика', icon: 'pulse' as const },
  { nameKey: 'Dentist' as const, nameUz: 'Stomatolog', nameRu: 'Стоматолог', icon: 'medkit' as const },
  { nameKey: 'Cardiology' as const, nameUz: 'Kardiologiya', nameRu: 'Кардиология', icon: 'heart' as const },
  { nameKey: 'Neurology' as const, nameUz: 'Nevrologiya', nameRu: 'Неврология', icon: 'headset' as const },
];

const Specialties = () => {
  const language = useAuthStore((s) => s.language);
  const t = getTranslations(language);
  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>{t.quickCategories}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {categories.map((item, index) => (
        <TouchableOpacity key={index} style={[styles.chip, index === 0 && styles.chipActive]}>
          <Ionicons
            name={item.icon}
            size={20}
            color={index === 0 ? '#ffffff' : '#a1a1aa'}
            style={styles.chipIcon}
          />
          <Text style={[styles.chipText, index === 0 && styles.chipTextActive]}>
            {language === 'ru' ? item.nameRu : item.nameUz}
          </Text>
        </TouchableOpacity>
      ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    sectionContainer: { marginTop: 24, paddingHorizontal: 0 },
    sectionTitle: { color: '#a1a1aa', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 15, paddingHorizontal: 20 },
    scrollContent: { paddingHorizontal: 20 },
    chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25, marginRight: 12, borderWidth: 1, borderColor: '#27272a' },
    chipActive: { backgroundColor: '#14228e', borderColor: '#14228e' },
    chipIcon: { marginRight: 8 },
    chipText: { color: '#a1a1aa', fontSize: 14, fontWeight: '500' },
    chipTextActive: { color: '#ffffff' },
});

export default Specialties;
