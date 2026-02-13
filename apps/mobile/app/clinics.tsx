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
import { useThemeStore } from '../store/theme-store';
import { getTranslations } from '../lib/translations';
import { getColors } from '../lib/theme';
import Skeleton from './components/Skeleton';

const DEFAULT_CLINIC_COVER = 'https://www.shutterstock.com/image-photo/medical-coverage-insurance-concept-hands-260nw-1450246616.jpg';

export default function ClinicsScreen() {
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const theme = useThemeStore((s) => s.theme);
  const t = getTranslations(language);
  const colors = getColors(theme);
  const [clinics, setClinics] = useState<ClinicListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClinicsList(200)
      .then(setClinics)
      .catch(() => setClinics([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t.clinics}</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <Skeleton width="100%" height={140} style={{ backgroundColor: colors.border }} />
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
          <Ionicons name="business-outline" size={56} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>{t.clinics}</Text>
          <Text style={[styles.emptySub, { color: colors.textTertiary }]}>{t.noResultsFound}</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {clinics.map((c) => {
            const coverUri = c.coverUrl || c.logoUrl || DEFAULT_CLINIC_COVER;
            const tagline = c.categories.length ? c.categories.slice(0, 2).join(' · ') + (c.categories.length > 2 ? ' ...' : '') : (c.descriptionShort || '').slice(0, 40);
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                activeOpacity={0.9}
                onPress={() => router.push({ pathname: '/clinic/[id]', params: { id: c.id } })}
              >
                <View style={styles.cardCoverWrap}>
                  <Image source={{ uri: coverUri }} style={[styles.cardCover, { backgroundColor: colors.border }]} />
                  <View style={styles.cardBadge}>
                    <Text style={styles.cardBadgeText}>
                      {(t.nServices || '{{n}}').replace('{{n}}', String(c.servicesCount))}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>{c.clinicDisplayName}</Text>
                  {tagline ? <Text style={[styles.cardTagline, { color: colors.textTertiary }]} numberOfLines={1}>{tagline}</Text> : null}
                  <View style={styles.cardMetaRow}>
                    <View style={styles.cardRatingWrap}>
                      <Ionicons name="star" size={14} color={colors.warning} />
                      <Text style={[styles.cardRating, { color: colors.warning }]}>{c.rating.avg > 0 ? c.rating.avg.toFixed(1) : '—'} {c.rating.count > 0 ? `(${c.rating.count})` : ''}</Text>
                    </View>
                    <Text style={[styles.cardMetaDot, { color: colors.textTertiary }]}>•</Text>
                    <Text style={[styles.cardBranches, { color: colors.textTertiary }]}>{c.branchesCount} {t.branches}</Text>
                  </View>
                  {c.descriptionShort ? (
                    <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>{c.descriptionShort}</Text>
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
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerRight: { width: 32 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 32 },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
  },
  cardCoverWrap: { position: 'relative', width: '100%', height: 140 },
  cardCover: { width: '100%', height: 140 },
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
  cardName: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  cardTagline: { fontSize: 13, marginBottom: 6 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardRatingWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardRating: { fontSize: 13, fontWeight: '600' },
  cardMetaDot: { fontSize: 11 },
  cardBranches: { fontSize: 12 },
  cardDesc: { fontSize: 13, lineHeight: 20 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySub: { fontSize: 14, marginTop: 8, textAlign: 'center' },
});
