import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getClinicDetail, type ClinicDetailPublic, type ClinicDoctorPublic, type ClinicServicePublic } from '../../lib/api';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { getTranslations } from '../../lib/translations';
import { getColors } from '../../lib/theme';
import Skeleton from '../components/Skeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 220;
const DEFAULT_COVER = 'https://www.shutterstock.com/image-photo/medical-coverage-insurance-concept-hands-260nw-1450246616.jpg';
const DEFAULT_CLINIC_LOGO = 'https://static.vecteezy.com/system/resources/thumbnails/036/372/442/small/hospital-building-with-ambulance-emergency-car-on-cityscape-background-cartoon-illustration-vector.jpg';
const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop';

const INITIAL_DOCTORS_COUNT = 3;
const INITIAL_SERVICES_COUNT = 3;
const LOGO_SIZE = 72;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function formatPrice(price: ClinicServicePublic['price']): string {
  if (price.amount != null) return `${price.amount.toLocaleString()} ${price.currency}`;
  if (price.minAmount != null && price.maxAmount != null) {
    return `${price.minAmount.toLocaleString()} – ${price.maxAmount.toLocaleString()} ${price.currency}`;
  }
  return price.currency;
}


export default function ClinicDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const theme = useThemeStore((s) => s.theme);
  const t = getTranslations(language);
  const colors = getColors(theme);
  const [clinic, setClinic] = useState<ClinicDetailPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllDoctors, setShowAllDoctors] = useState(false);
  const [showAllServices, setShowAllServices] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getClinicDetail(id)
      .then(setClinic)
      .catch(() => setError('Not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.heroBox, { backgroundColor: colors.border }]}>
          <Skeleton width={SCREEN_WIDTH} height={HERO_HEIGHT} borderRadius={0} />
        </View>
        <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          <View style={styles.clinicHeaderRow}>
            <Skeleton width={LOGO_SIZE} height={LOGO_SIZE} borderRadius={16} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Skeleton width="80%" height={22} style={{ marginBottom: 8 }} />
              <Skeleton width={100} height={16} />
            </View>
          </View>
          <View style={{ marginBottom: 16 }}>
            <Skeleton width="70%" height={14} style={{ marginBottom: 6 }} />
            <Skeleton width="50%" height={14} />
          </View>
          <Skeleton width="100%" height={72} style={{ marginBottom: 20, borderRadius: 16 }} />
          <Skeleton width={80} height={12} style={{ marginBottom: 8 }} />
          <Skeleton width="100%" height={60} style={{ marginBottom: 24, borderRadius: 8 }} />
          <Skeleton width={100} height={12} style={{ marginBottom: 12 }} />
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.doctorRow}>
              <Skeleton width={52} height={52} borderRadius={26} />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Skeleton width="60%" height={16} style={{ marginBottom: 6 }} />
                <Skeleton width="40%" height={13} />
              </View>
            </View>
          ))}
          <Skeleton width={100} height={12} style={{ marginTop: 20, marginBottom: 12 }} />
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.serviceRow}>
              <Skeleton width={48} height={48} borderRadius={12} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Skeleton width="70%" height={15} style={{ marginBottom: 6 }} />
                <Skeleton width="40%" height={13} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }
  if (error || !clinic) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>{t.noResultsFound}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnFull}>
          <Text style={[styles.backBtnText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const coverUri = clinic.branding?.coverUrl || clinic.branding?.logoUrl || DEFAULT_COVER;
  const logoUri = clinic.branding?.logoUrl || DEFAULT_CLINIC_LOGO;
  const firstBranch = clinic.branches?.[0];
  const locationText = firstBranch ? `${firstBranch.address?.city ?? ''} ${firstBranch.address?.street ?? ''}`.trim() || firstBranch.name : null;
  const lastWorking = firstBranch?.workingHours?.length ? firstBranch.workingHours[firstBranch.workingHours.length - 1] : null;
  const openUntil = lastWorking ? `${t.openUntil} ${lastWorking.to}` : null;
  const activeDoctors = (clinic.doctors ?? []).filter((d) => d.isActive);
  const activeServices = (clinic.services ?? []).filter((s) => s.isActive);
  const visibleDoctors = showAllDoctors ? activeDoctors : activeDoctors.slice(0, INITIAL_DOCTORS_COUNT);
  const hasMoreDoctors = activeDoctors.length > INITIAL_DOCTORS_COUNT;
  const visibleServices = showAllServices ? activeServices : activeServices.slice(0, INITIAL_SERVICES_COUNT);
  const hasMoreServices = activeServices.length > INITIAL_SERVICES_COUNT;

  const toggleDoctorsExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAllDoctors((prev) => !prev);
  };
  const toggleServicesExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAllServices((prev) => !prev);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero image - separated box */}
        <View style={[styles.heroBox, { backgroundColor: colors.border }]}>
          <Image source={{ uri: coverUri }} style={styles.heroImage} />
          <View style={styles.heroOverlay}>
            <TouchableOpacity style={styles.heroBackBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            
          </View>
        </View>

        {/* Info card */}
        <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          <View style={styles.clinicHeaderRow}>
            <Image source={{ uri: logoUri }} style={[styles.clinicLogo, { backgroundColor: colors.border }]} />
            <View style={styles.clinicNameWrap}>
              <Text style={[styles.clinicName, { color: colors.text }]} numberOfLines={2}>{clinic.clinicDisplayName}</Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={20} color={colors.info} />
              </View>
            </View>
          </View>
          {(locationText || openUntil) && (
            <View style={styles.metaRow}>
              {locationText ? (
                <>
                  <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>{locationText}</Text>
                </>
              ) : null}
              {locationText && openUntil ? <Text style={[styles.metaDot, { color: colors.textTertiary }]}>•</Text> : null}
              {openUntil ? (
                <>
                  <Ionicons name="time-outline" size={16} color={colors.success} />
                  <Text style={[styles.metaText, { color: colors.success }]}>{openUntil}</Text>
                </>
              ) : null}
            </View>
          )}
          {(clinic.rating?.count ?? 0) > 0 && (
            <View style={[styles.ratingBox, { backgroundColor: colors.backgroundSecondary }]}>
              <View>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={18} color={colors.warning} />
                  <Text style={[styles.ratingValue, { color: colors.text }]}>{clinic.rating.avg.toFixed(1)} / 5.0</Text>
                </View>
                <Text style={[styles.ratingReviews, { color: colors.textTertiary }]}>Based on {clinic.rating.count} reviews</Text>
              </View>
              <View style={[styles.topRatedPill, { backgroundColor: colors.success }]}>
                <Text style={styles.topRatedText}>{t.topRated}</Text>
              </View>
            </View>
          )}
          {(clinic.description?.full || clinic.description?.short) && (
            <View style={styles.aboutSection}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t.about}</Text>
              <Text style={[styles.aboutText, { color: colors.textSecondary }]} numberOfLines={6}>
                {clinic.description.full || clinic.description.short || ''}
              </Text>
            </View>
          )}

          {/* Doctors */}
          {activeDoctors.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t.ourDoctors}</Text>
              {visibleDoctors.map((doctor) => (
                <TouchableOpacity
                  key={doctor._id}
                  style={[styles.doctorRow, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                  activeOpacity={0.8}
                  onPress={() => router.push({ pathname: '/doctor/[id]', params: { id: doctor._id, clinicId: id as string } })}
                >
                  <Image
                    source={{ uri: doctor.avatarUrl || DEFAULT_AVATAR }}
                    style={[styles.doctorAvatar, { backgroundColor: colors.border }]}
                  />
                  <View style={styles.doctorInfo}>
                    <Text style={[styles.doctorName, { color: colors.text }]}>{doctor.fullName}</Text>
                    <Text style={[styles.doctorSpecialty, { color: colors.textSecondary }]}>{doctor.specialty}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
              {hasMoreDoctors && (
                <TouchableOpacity
                  style={[styles.seeMoreDoctorsBtn, { backgroundColor: colors.primaryBg, borderColor: colors.primary }]}
                  activeOpacity={0.85}
                  onPress={toggleDoctorsExpand}
                >
                  <Ionicons
                    name={showAllDoctors ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.primaryLight}
                  />
                  <Text style={[styles.seeMoreDoctorsText, { color: colors.primaryLight }]}>
                    {showAllDoctors ? t.seeLessDoctors : t.seeMoreDoctors}
                    {!showAllDoctors && (
                      <Text style={[styles.seeMoreDoctorsCount, { color: colors.primaryLight }]}> (+{activeDoctors.length - INITIAL_DOCTORS_COUNT})</Text>
                    )}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Services */}
          {activeServices.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t.viewClinicServices}</Text>
              {visibleServices.map((svc) => (
                <TouchableOpacity
                  key={svc._id}
                  style={[styles.serviceRow, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                  activeOpacity={0.8}
                  onPress={() => router.push({ pathname: '/service/[id]', params: { id: svc._id } })}
                >
                  <Image
                    source={{ uri: svc.serviceImage || 'https://images.unsplash.com/photo-1576091160399-112ba8e25d1d?w=100&h=100&fit=crop' }}
                    style={[styles.serviceThumb, { backgroundColor: colors.border }]}
                  />
                  <View style={styles.serviceInfo}>
                    <Text style={[styles.serviceTitle, { color: colors.text }]} numberOfLines={2}>{svc.title}</Text>
                    <Text style={[styles.servicePrice, { color: colors.primaryLight }]}>{formatPrice(svc.price)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
              {hasMoreServices && (
                <TouchableOpacity
                  style={[styles.seeMoreDoctorsBtn, { backgroundColor: colors.primaryBg, borderColor: colors.primary }]}
                  activeOpacity={0.85}
                  onPress={toggleServicesExpand}
                >
                  <Ionicons
                    name={showAllServices ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.primaryLight}
                  />
                  <Text style={[styles.seeMoreDoctorsText, { color: colors.primaryLight }]}>
                    {showAllServices ? t.seeLessServices : t.seeMoreServices}
                    {!showAllServices && (
                      <Text style={[styles.seeMoreDoctorsCount, { color: colors.primaryLight }]}> (+{activeServices.length - INITIAL_SERVICES_COUNT})</Text>
                    )}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { marginBottom: 12 },
  backBtnFull: { padding: 12 },
  backBtnText: { fontSize: 16 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  heroBox: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 56,
    paddingHorizontal: 16,
  },
  heroBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroFavoriteBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginTop: -24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  clinicHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  clinicLogo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 16,
  },
  clinicLogoPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  clinicNameWrap: { flex: 1, marginLeft: 14, justifyContent: 'center' },
  clinicName: { fontSize: 22, fontWeight: '700' },
  verifiedBadge: { marginTop: 4, alignSelf: 'flex-start' },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  metaText: { fontSize: 13 },
  metaDot: { fontSize: 13 },
  ratingBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingValue: { fontSize: 18, fontWeight: '700' },
  ratingReviews: { fontSize: 12, marginTop: 4 },
  topRatedPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  topRatedText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  aboutSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  aboutText: { fontSize: 15, lineHeight: 22 },
  section: { marginBottom: 24 },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  doctorAvatar: { width: 52, height: 52, borderRadius: 26 },
  doctorInfo: { flex: 1, marginLeft: 14 },
  doctorName: { fontSize: 16, fontWeight: '600' },
  doctorSpecialty: { fontSize: 13, marginTop: 2 },
  seeMoreDoctorsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  seeMoreDoctorsText: { fontSize: 15, fontWeight: '600' },
  seeMoreDoctorsCount: { fontSize: 14, fontWeight: '500', opacity: 0.9 },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
  },
  serviceThumb: { width: 48, height: 48, borderRadius: 12 },
  serviceInfo: { flex: 1, marginLeft: 12 },
  serviceTitle: { fontSize: 15, fontWeight: '500' },
  servicePrice: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  bookIcon: { marginRight: 4 },
  bookButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
