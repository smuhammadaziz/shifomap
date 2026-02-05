import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getClinicsList, type ClinicListItem } from '../lib/api';
import { useAuthStore } from '../store/auth-store';
import { getTranslations } from '../lib/translations';
import Skeleton from './components/Skeleton';

const DEFAULT_CLINIC_COVER = 'https://www.shutterstock.com/image-photo/medical-coverage-insurance-concept-hands-260nw-1450246616.jpg';

export default function ClinicsScreen() {
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const t = getTranslations(language);
  const [clinics, setClinics] = useState<ClinicListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClinicsList(200)
      .then(setClinics)
      .catch(() => setClinics([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.clinics}</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={styles.card}>
              <Skeleton width="100%" height={140} style={styles.cardCover} />
              <View style={styles.cardInfo}>
                <Skeleton width="85%" height={17} style={{ marginBottom: 6 }} />
                <Skeleton width="60%" height={12} style={{ marginBottom: 8 }} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Skeleton width={70} height={18} borderRadius={9} />
                  <Skeleton width={90} height={18} borderRadius={9} />
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : clinics.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="business-outline" size={56} color="#3f3f46" />
          <Text style={styles.emptyTitle}>{t.clinics}</Text>
          <Text style={styles.emptySub}>{t.noResultsFound}</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {clinics.map((c) => {
            const coverUri = c.coverUrl || c.logoUrl || DEFAULT_CLINIC_COVER;
            const tagline = c.categories.length ? c.categories.slice(0, 2).join(' · ') + (c.categories.length > 2 ? ' ...' : '') : (c.descriptionShort || '').slice(0, 40);
            return (
              <TouchableOpacity
                key={c.id}
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => router.push({ pathname: '/clinic/[id]', params: { id: c.id } })}
              >
                <View style={styles.cardCoverWrap}>
                  <Image source={{ uri: coverUri }} style={styles.cardCover} />
                  <View style={styles.cardBadge}>
                    <Text style={styles.cardBadgeText}>
                      {(t.nServices || '{{n}}').replace('{{n}}', String(c.servicesCount))}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName} numberOfLines={1}>{c.clinicDisplayName}</Text>
                  {tagline ? <Text style={styles.cardTagline} numberOfLines={1}>{tagline}</Text> : null}
                  <View style={styles.cardMetaRow}>
                    <View style={styles.cardRatingWrap}>
                      <Ionicons name="star" size={14} color="#f59e0b" />
                      <Text style={styles.cardRating}>{c.rating.avg > 0 ? c.rating.avg.toFixed(1) : '—'} {c.rating.count > 0 ? `(${c.rating.count})` : ''}</Text>
                    </View>
                    <Text style={styles.cardMetaDot}>•</Text>
                    <Text style={styles.cardBranches}>{c.branchesCount} {t.branches}</Text>
                  </View>
                  {c.descriptionShort ? (
                    <Text style={styles.cardDesc} numberOfLines={2}>{c.descriptionShort}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#09090b' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#27272a',
  },
  back: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerRight: { width: 32 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 32 },
  card: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  cardCoverWrap: { position: 'relative', width: '100%', height: 140 },
  cardCover: { width: '100%', height: 140, backgroundColor: '#27272a' },
  cardBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  cardBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  cardInfo: { padding: 14 },
  cardName: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 2 },
  cardTagline: { color: '#71717a', fontSize: 13, marginBottom: 6 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardRatingWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardRating: { color: '#f59e0b', fontSize: 13, fontWeight: '600' },
  cardMetaDot: { color: '#52525b', fontSize: 11 },
  cardBranches: { color: '#71717a', fontSize: 12 },
  cardDesc: { color: '#a1a1aa', fontSize: 13, lineHeight: 20 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: { color: '#a1a1aa', fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySub: { color: '#71717a', fontSize: 14, marginTop: 8, textAlign: 'center' },
});
