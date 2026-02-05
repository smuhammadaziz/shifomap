import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/auth-store';
import { getTranslations } from '../lib/translations';

export default function BookScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ clinicId?: string; serviceId?: string }>();
  const language = useAuthStore((s) => s.language);
  const t = getTranslations(language);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.bookAppointment}</Text>
      </View>
      <View style={styles.body}>
        <Ionicons name="calendar-outline" size={64} color="#3f3f46" />
        <Text style={styles.placeholderTitle}>Book screen</Text>
        <Text style={styles.placeholderSub}>Static placeholder. Next step: add booking flow.</Text>
        {params.clinicId ? (
          <Text style={styles.clinicId}>Clinic ID: {params.clinicId}</Text>
        ) : null}
        {params.serviceId ? (
          <Text style={styles.clinicId}>Service ID: {params.serviceId}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginLeft: 8 },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  placeholderTitle: { color: '#a1a1aa', fontSize: 18, fontWeight: '600', marginTop: 16 },
  placeholderSub: { color: '#71717a', fontSize: 14, marginTop: 8, textAlign: 'center' },
  clinicId: { color: '#52525b', fontSize: 12, marginTop: 16 },
});
