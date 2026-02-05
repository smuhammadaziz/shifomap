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
import { getTranslations } from '../../lib/translations';
import Skeleton from '../components/Skeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 220;
const DEFAULT_COVER = 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=800';
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
  const t = getTranslations(language);
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
      <View style={styles.container}>
        <View style={styles.heroBox}>
          <Skeleton width={SCREEN_WIDTH} height={HERO_HEIGHT} borderRadius={0} />
        </View>
        <View style={styles.card}>
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
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t.noResultsFound}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnFull}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const coverUri = clinic.branding?.coverUrl || clinic.branding?.logoUrl || DEFAULT_COVER;
  const logoUri = clinic.branding?.logoUrl || null;
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
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero image - separated box */}
        <View style={styles.heroBox}>
          <Image source={{ uri: coverUri }} style={styles.heroImage} />
          <View style={styles.heroOverlay}>
            <TouchableOpacity style={styles.heroBackBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            
          </View>
        </View>

        {/* Info card */}
        <View style={styles.card}>
          <View style={styles.clinicHeaderRow}>
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.clinicLogo} />
            ) : (
              <View style={[styles.clinicLogo, styles.clinicLogoPlaceholder]}>
                <Ionicons name="business" size={32} color="#52525b" />
              </View>
            )}
            <View style={styles.clinicNameWrap}>
              <Text style={styles.clinicName} numberOfLines={2}>{clinic.clinicDisplayName}</Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />
              </View>
            </View>
          </View>
          {(locationText || openUntil) && (
            <View style={styles.metaRow}>
              {locationText ? (
                <>
                  <Ionicons name="location-outline" size={16} color="#a1a1aa" />
                  <Text style={styles.metaText}>{locationText}</Text>
                </>
              ) : null}
              {locationText && openUntil ? <Text style={styles.metaDot}>•</Text> : null}
              {openUntil ? (
                <>
                  <Ionicons name="time-outline" size={16} color="#22c55e" />
                  <Text style={[styles.metaText, { color: '#22c55e' }]}>{openUntil}</Text>
                </>
              ) : null}
            </View>
          )}
          {(clinic.rating?.count ?? 0) > 0 && (
            <View style={styles.ratingBox}>
              <View>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={18} color="#facc15" />
                  <Text style={styles.ratingValue}>{clinic.rating.avg.toFixed(1)} / 5.0</Text>
                </View>
                <Text style={styles.ratingReviews}>Based on {clinic.rating.count} reviews</Text>
              </View>
              <View style={styles.topRatedPill}>
                <Text style={styles.topRatedText}>{t.topRated}</Text>
              </View>
            </View>
          )}
          {(clinic.description?.full || clinic.description?.short) && (
            <View style={styles.aboutSection}>
              <Text style={styles.sectionTitle}>{t.about}</Text>
              <Text style={styles.aboutText} numberOfLines={6}>
                {clinic.description.full || clinic.description.short || ''}
              </Text>
            </View>
          )}

          {/* Doctors */}
          {activeDoctors.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t.ourDoctors}</Text>
              {visibleDoctors.map((doctor) => (
                <TouchableOpacity
                  key={doctor._id}
                  style={styles.doctorRow}
                  activeOpacity={0.8}
                  onPress={() => router.push({ pathname: '/doctor/[id]', params: { id: doctor._id, clinicId: id as string } })}
                >
                  <Image
                    source={{ uri: doctor.avatarUrl || DEFAULT_AVATAR }}
                    style={styles.doctorAvatar}
                  />
                  <View style={styles.doctorInfo}>
                    <Text style={styles.doctorName}>{doctor.fullName}</Text>
                    <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#71717a" />
                </TouchableOpacity>
              ))}
              {hasMoreDoctors && (
                <TouchableOpacity
                  style={styles.seeMoreDoctorsBtn}
                  activeOpacity={0.85}
                  onPress={toggleDoctorsExpand}
                >
                  <Ionicons
                    name={showAllDoctors ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#a78bfa"
                  />
                  <Text style={styles.seeMoreDoctorsText}>
                    {showAllDoctors ? t.seeLessDoctors : t.seeMoreDoctors}
                    {!showAllDoctors && (
                      <Text style={styles.seeMoreDoctorsCount}> (+{activeDoctors.length - INITIAL_DOCTORS_COUNT})</Text>
                    )}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Services */}
          {activeServices.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t.viewClinicServices}</Text>
              {visibleServices.map((svc) => (
                <TouchableOpacity
                  key={svc._id}
                  style={styles.serviceRow}
                  activeOpacity={0.8}
                  onPress={() => router.push({ pathname: '/service/[id]', params: { id: svc._id } })}
                >
                  <Image
                    source={{ uri: svc.serviceImage || 'https://images.unsplash.com/photo-1576091160399-112ba8e25d1d?w=100&h=100&fit=crop' }}
                    style={styles.serviceThumb}
                  />
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceTitle} numberOfLines={2}>{svc.title}</Text>
                    <Text style={styles.servicePrice}>{formatPrice(svc.price)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#71717a" />
                </TouchableOpacity>
              ))}
              {hasMoreServices && (
                <TouchableOpacity
                  style={styles.seeMoreDoctorsBtn}
                  activeOpacity={0.85}
                  onPress={toggleServicesExpand}
                >
                  <Ionicons
                    name={showAllServices ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#a78bfa"
                  />
                  <Text style={styles.seeMoreDoctorsText}>
                    {showAllServices ? t.seeLessServices : t.seeMoreServices}
                    {!showAllServices && (
                      <Text style={styles.seeMoreDoctorsCount}> (+{activeServices.length - INITIAL_SERVICES_COUNT})</Text>
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
  container: { flex: 1, backgroundColor: '#09090b' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#f87171', marginBottom: 12 },
  backBtnFull: { padding: 12 },
  backBtnText: { color: '#8b5cf6', fontSize: 16 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  heroBox: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    backgroundColor: '#27272a',
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
    backgroundColor: '#18181b',
    paddingHorizontal: 20,
    paddingTop: 24,
    borderWidth: 1,
    borderColor: '#27272a',
    borderBottomWidth: 0,
  },
  clinicHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  clinicLogo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 16,
    backgroundColor: '#27272a',
  },
  clinicLogoPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  clinicNameWrap: { flex: 1, marginLeft: 14, justifyContent: 'center' },
  clinicName: { color: '#fff', fontSize: 22, fontWeight: '700' },
  verifiedBadge: { marginTop: 4, alignSelf: 'flex-start' },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  metaText: { color: '#a1a1aa', fontSize: 13 },
  metaDot: { color: '#52525b', fontSize: 13 },
  ratingBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#27272a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingValue: { color: '#fff', fontSize: 18, fontWeight: '700' },
  ratingReviews: { color: '#71717a', fontSize: 12, marginTop: 4 },
  topRatedPill: { backgroundColor: '#22c55e', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  topRatedText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  aboutSection: { marginBottom: 24 },
  sectionTitle: { color: '#a1a1aa', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  aboutText: { color: '#d4d4d8', fontSize: 15, lineHeight: 22 },
  section: { marginBottom: 24 },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  doctorAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#3f3f46' },
  doctorInfo: { flex: 1, marginLeft: 14 },
  doctorName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  doctorSpecialty: { color: '#a1a1aa', fontSize: 13, marginTop: 2 },
  seeMoreDoctorsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(167, 139, 250, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  seeMoreDoctorsText: { color: '#a78bfa', fontSize: 15, fontWeight: '600' },
  seeMoreDoctorsCount: { color: '#a78bfa', fontSize: 14, fontWeight: '500', opacity: 0.9 },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  serviceThumb: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#3f3f46' },
  serviceInfo: { flex: 1, marginLeft: 12 },
  serviceTitle: { color: '#fff', fontSize: 15, fontWeight: '500' },
  servicePrice: { color: '#a78bfa', fontSize: 13, fontWeight: '600', marginTop: 4 },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 12,
    backgroundColor: '#18181b',
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  bookIcon: { marginRight: 4 },
  bookButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
