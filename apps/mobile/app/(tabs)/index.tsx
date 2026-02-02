import React from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Specialties from '../components/Specialties';
import FeaturedClinics from '../components/FeaturedClinics';
import { useAuthStore, DEFAULT_AVATAR } from '../../store/auth-store';
import { getTranslations } from '../../lib/translations';

const HomeScreen = () => {
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const patient = useAuthStore((s) => s.patient);
  const t = getTranslations(language);

  const displayName = patient?.fullName?.trim() || (language === 'ru' ? 'Гость' : 'Mehmon');
  const avatarUri = patient?.avatarUrl || DEFAULT_AVATAR;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <View style={styles.greetingRow}>
              <Text style={styles.greeting}>{t.greeting}, {displayName}</Text>
              <Text style={styles.waveEmoji}>👋</Text>
            </View>
            <Text style={styles.subtitle}>{t.homeSubtitle}</Text>
          </View>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => router.push('/profile')}
          >
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
            <View style={styles.onlineIndicator} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#a1a1aa" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t.searchPlaceholder}
              placeholderTextColor="#a1a1aa"
            />
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="options-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={styles.dashboardContainer}>
          <TouchableOpacity style={styles.dashboardCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#3b0764' }]}>
              <Ionicons name="calendar" size={24} color="#a78bfa" />
            </View>
            <Text style={styles.cardTitle}>{t.myAppointments}</Text>
            <Text style={styles.cardSubtitle}>{t.nextAppointment}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dashboardCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#3b0764' }]}>
              <Ionicons name="medical" size={24} color="#a78bfa" />
            </View>
            <Text style={styles.cardTitle}>{t.pillReminders}</Text>
            <Text style={styles.cardSubtitle}>{t.pillsRemaining}</Text>
          </TouchableOpacity>
        </View>

        <Specialties />

        <FeaturedClinics />

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#09090b' },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
    headerTextContainer: { flex: 1 },
    greetingRow: { flexDirection: 'row', alignItems: 'center' },
    greeting: { color: '#ffffff', fontSize: 28, fontWeight: 'bold' },
    waveEmoji: { fontSize: 24, marginLeft: 8 },
    subtitle: { color: '#a1a1aa', fontSize: 14, marginTop: 4 },
    avatarContainer: { position: 'relative' },
    avatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#27272a' },
    onlineIndicator: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#09090b' },

    searchSection: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 20, marginBottom: 10 },
    searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', borderRadius: 16, paddingHorizontal: 15, height: 56, marginRight: 12, borderWidth: 1, borderColor: '#27272a' },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, color: '#ffffff', fontSize: 16 },
    filterButton: { width: 56, height: 56, backgroundColor: '#18181b', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },

    dashboardContainer: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 10 },
    dashboardCard: { flex: 1, backgroundColor: '#18181b', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#27272a' },
    iconContainer: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    cardTitle: { color: '#ffffff', fontSize: 16, fontWeight: '600', marginBottom: 4 },
    cardSubtitle: { color: '#a1a1aa', fontSize: 12 },
});

export default HomeScreen;
