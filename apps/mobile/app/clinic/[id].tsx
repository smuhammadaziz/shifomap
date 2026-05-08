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
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getClinicDetail, getReviews, type ClinicDetailPublic, type ClinicDoctorPublic, type ClinicServicePublic, type ReviewItem } from '../../lib/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { getTranslations } from '../../lib/translations';
import { getColors } from '../../lib/theme';
import Skeleton from '../components/Skeleton';
import ReviewBottomSheet from '../components/ReviewBottomSheet';
import ReviewerHeader from '../components/ReviewerHeader';
import WorkingHoursList from '../components/WorkingHoursList';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 300;
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

function normalizeTelegram(input: string): { url: string; display: string } {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    const handle = trimmed.replace(/^https?:\/\/(t\.me|telegram\.me)\//i, '@');
    return { url: trimmed, display: handle.startsWith('@') ? handle : `@${handle}` };
  }
  const handle = trimmed.replace(/^@/, '');
  return { url: `https://t.me/${handle}`, display: `@${handle}` };
}

function openDirections(lat: number, lng: number) {
  const yandexUrl = `https://yandex.uz/maps/?rtext=~${lat},${lng}&rtt=auto`;
  const googleAppUrl = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
  const appleUrl = `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  Linking.canOpenURL(googleAppUrl)
    .then((supported) => {
      if (supported) {
        Linking.openURL(yandexUrl).catch(() => Linking.openURL(googleAppUrl));
      } else if (Platform.OS === 'ios') {
        Linking.openURL(appleUrl);
      } else {
        Linking.openURL(webUrl);
      }
    })
    .catch(() => Linking.openURL(webUrl));
}


export default function ClinicDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const theme = useThemeStore((s) => s.theme);
  const t = getTranslations(language);
  const colors = getColors(theme);
  const insets = useSafeAreaInsets();
  const [clinic, setClinic] = useState<ClinicDetailPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllDoctors, setShowAllDoctors] = useState(false);
  const [showAllServices, setShowAllServices] = useState(false);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsSkip, setReviewsSkip] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsLoadMore, setReviewsLoadMore] = useState(false);
  const [reviewSheetVisible, setReviewSheetVisible] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getClinicDetail(id)
      .then(setClinic)
      .catch(() => setError('Not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const loadReviews = (skip: number, limit: number, append: boolean) => {
    if (!id) return;
    if (append) setReviewsLoadMore(true);
    else setReviewsLoading(true);
    getReviews({ clinicId: id, skip, limit })
      .then((res) => {
        setReviewsTotal(res.total);
        if (append) setReviews((prev) => [...prev, ...res.reviews]);
        else setReviews(res.reviews);
        setReviewsSkip(skip + res.reviews.length);
      })
      .catch(() => {})
      .finally(() => {
        setReviewsLoading(false);
        setReviewsLoadMore(false);
      });
  };

  useEffect(() => {
    if (!id || !clinic) return;
    loadReviews(0, 3, false);
  }, [id, clinic?._id]);

  const onLoadMoreReviews = () => {
    loadReviews(reviewsSkip, 10, true);
  };

  const onReviewSuccess = () => {
    loadReviews(0, 3, false);
    if (clinic?.rating) {
      setClinic((c) => {
        if (!c?.rating) return c;
        const count = c.rating.count + 1;
        const avg = (c.rating.avg * c.rating.count + 5) / count;
        return { ...c, rating: { avg: Math.round(avg * 10) / 10, count } };
      });
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.heroBox, { backgroundColor: colors.border }]}>
          <Skeleton width={SCREEN_WIDTH} height={HERO_HEIGHT} borderRadius={0} />
        </View>
        <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.loadingHeaderRow}>
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
          <Text style={[styles.backBtnText, { color: colors.primary }]}>← {t.back}</Text>
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
          <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.65)']} style={styles.heroOverlay}>
            <TouchableOpacity style={styles.heroBackBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Info card */}
        <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
          {/* Identity */}
          <View style={styles.identityRow}>
            <Image source={{ uri: logoUri }} style={[styles.clinicLogo, { backgroundColor: colors.border }]} />
            <View style={styles.identityText}>
              <View style={styles.nameLine}>
                <Text style={[styles.clinicName, { color: colors.text }]} numberOfLines={2}>
                  {clinic.clinicDisplayName}
                </Text>
                <Ionicons name="checkmark-circle" size={20} color={colors.info} style={{ marginLeft: 6 }} />
              </View>
              {locationText ? (
                <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {locationText}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Inline meta — no boxes, just text separated by dots */}
          <View style={styles.inlineMeta}>
            {(clinic.rating?.count ?? 0) > 0 ? (
              <View style={styles.metaItem}>
                <Ionicons name="star" size={13} color={colors.warning} />
                <Text style={[styles.metaStrong, { color: colors.text }]}>{clinic.rating.avg.toFixed(1)}</Text>
                <Text style={[styles.metaMuted, { color: colors.textTertiary }]}>
                  ({clinic.rating.count})
                </Text>
              </View>
            ) : null}
            {(clinic.rating?.count ?? 0) > 0 && activeDoctors.length > 0 ? (
              <Text style={[styles.metaSep, { color: colors.textTertiary }]}>·</Text>
            ) : null}
            {activeDoctors.length > 0 ? (
              <Text style={[styles.metaPlain, { color: colors.textSecondary }]}>
                {activeDoctors.length} {language === 'ru' ? 'врачей' : language === 'en' ? 'doctors' : 'shifokor'}
              </Text>
            ) : null}
            {activeDoctors.length > 0 && activeServices.length > 0 ? (
              <Text style={[styles.metaSep, { color: colors.textTertiary }]}>·</Text>
            ) : null}
            {activeServices.length > 0 ? (
              <Text style={[styles.metaPlain, { color: colors.textSecondary }]}>
                {activeServices.length} {language === 'ru' ? 'услуг' : language === 'en' ? 'services' : 'xizmat'}
              </Text>
            ) : null}
            {openUntil ? (
              <>
                <Text style={[styles.metaSep, { color: colors.textTertiary }]}>·</Text>
                <View style={styles.metaItem}>
                  <View style={[styles.openDot, { backgroundColor: colors.success }]} />
                  <Text style={[styles.metaStrong, { color: colors.success }]} numberOfLines={1}>
                    {openUntil}
                  </Text>
                </View>
              </>
            ) : null}
          </View>

          {(clinic.description?.full || clinic.description?.short) ? (
            <View style={styles.block}>
              <Text style={[styles.blockHeading, { color: colors.text }]}>
                {language === 'ru' ? 'О клинике' : language === 'en' ? 'About' : 'Klinika haqida'}
              </Text>
              <Text style={[styles.aboutText, { color: colors.textSecondary }]} numberOfLines={6}>
                {clinic.description.full || clinic.description.short || ''}
              </Text>
            </View>
          ) : null}

          {/* Working hours */}
          {firstBranch?.workingHours?.length ? (
            <View style={styles.block}>
              <Text style={[styles.blockHeading, { color: colors.text }]}>
                {language === 'ru' ? 'Часы работы' : language === 'en' ? 'Working hours' : 'Ish vaqti'}
              </Text>
              <View style={[styles.dividerHairline, { backgroundColor: colors.border }]} />
              <WorkingHoursList
                weekly={firstBranch.workingHours}
                language={language ?? 'uz'}
                textColor={colors.text}
                secondaryColor={colors.textTertiary}
                borderColor={colors.border}
                accentColor={colors.primaryLight}
                accentBg={colors.primaryBg}
              />
            </View>
          ) : null}

          {/* Contacts */}
          {(() => {
            const phone = (clinic.contacts?.phone || firstBranch?.phone || '').trim();
            const email = (clinic.contacts?.email || '').trim();
            const tg = (clinic.contacts?.telegram || '').trim();
            if (!phone && !email && !tg) return null;
            const tgInfo = tg ? normalizeTelegram(tg) : null;
            return (
              <View style={styles.block}>
                <Text style={[styles.blockHeading, { color: colors.text }]}>
                  {language === 'ru' ? 'Контакты' : language === 'en' ? 'Contacts' : 'Aloqa'}
                </Text>
                <View style={[styles.dividerHairline, { backgroundColor: colors.border }]} />
                {phone ? (
                  <TouchableOpacity
                    style={styles.contactRow}
                    activeOpacity={0.6}
                    onPress={() => Linking.openURL(`tel:${phone.replace(/\s/g, '')}`)}
                  >
                    <View style={[styles.contactIcon, { backgroundColor: colors.backgroundSecondary }]}>
                      <Ionicons name="call-outline" size={16} color={colors.primaryLight} />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={[styles.contactLabel, { color: colors.textTertiary }]}>
                        {language === 'ru' ? 'Телефон' : language === 'en' ? 'Phone' : 'Telefon'}
                      </Text>
                      <Text style={[styles.contactValue, { color: colors.text }]} numberOfLines={1}>{phone}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                ) : null}
                {phone && (email || tgInfo) ? (
                  <View style={[styles.rowDivider, { backgroundColor: colors.border, marginLeft: 50 }]} />
                ) : null}
                {email ? (
                  <TouchableOpacity
                    style={styles.contactRow}
                    activeOpacity={0.6}
                    onPress={() => Linking.openURL(`mailto:${email}`)}
                  >
                    <View style={[styles.contactIcon, { backgroundColor: colors.backgroundSecondary }]}>
                      <Ionicons name="mail-outline" size={16} color={colors.primaryLight} />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={[styles.contactLabel, { color: colors.textTertiary }]}>
                        {language === 'ru' ? 'Эл. почта' : language === 'en' ? 'Email' : 'Email'}
                      </Text>
                      <Text style={[styles.contactValue, { color: colors.text }]} numberOfLines={1}>{email}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                ) : null}
                {email && tgInfo ? (
                  <View style={[styles.rowDivider, { backgroundColor: colors.border, marginLeft: 50 }]} />
                ) : null}
                {tgInfo ? (
                  <TouchableOpacity
                    style={styles.contactRow}
                    activeOpacity={0.6}
                    onPress={() => Linking.openURL(tgInfo.url)}
                  >
                    <View style={[styles.contactIcon, { backgroundColor: colors.backgroundSecondary }]}>
                      <Ionicons name="paper-plane-outline" size={16} color={colors.primaryLight} />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={[styles.contactLabel, { color: colors.textTertiary }]}>Telegram</Text>
                      <Text style={[styles.contactValue, { color: colors.text }]} numberOfLines={1}>{tgInfo.display}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })()}

          {/* Address */}
          {firstBranch ? (() => {
            const addr = `${firstBranch.address?.city ?? ''} ${firstBranch.address?.street ?? ''}`.trim();
            if (!addr) return null;
            const lat = firstBranch.address?.geo?.lat;
            const lng = firstBranch.address?.geo?.lng;
            const hasGeo = typeof lat === 'number' && typeof lng === 'number' && (lat !== 0 || lng !== 0);
            return (
              <View style={styles.block}>
                <View style={styles.blockHeader}>
                  <Text style={[styles.blockHeading, { color: colors.text }]}>
                    {language === 'ru' ? 'Адрес' : language === 'en' ? 'Address' : 'Manzil'}
                  </Text>
                  {hasGeo ? (
                    <TouchableOpacity
                      onPress={() => openDirections(lat as number, lng as number)}
                      hitSlop={8}
                      activeOpacity={0.6}
                    >
                      <Text style={[styles.seeAllLink, { color: colors.primaryLight }]}>
                        {language === 'ru' ? 'Маршрут' : language === 'en' ? 'Directions' : 'Yo‘nalish'} →
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <View style={[styles.dividerHairline, { backgroundColor: colors.border }]} />
                <View style={styles.contactRow}>
                  <View style={[styles.contactIcon, { backgroundColor: colors.backgroundSecondary }]}>
                    <Ionicons name="location-outline" size={16} color={colors.primaryLight} />
                  </View>
                  <View style={styles.contactInfo}>
                    {firstBranch.name ? (
                      <Text style={[styles.contactLabel, { color: colors.textTertiary }]} numberOfLines={1}>
                        {firstBranch.name}
                      </Text>
                    ) : null}
                    <Text style={[styles.contactValue, { color: colors.text }]} numberOfLines={3}>{addr}</Text>
                  </View>
                </View>
              </View>
            );
          })() : null}

          {/* Doctors */}
          {activeDoctors.length > 0 && (
            <View style={styles.block}>
              <View style={styles.blockHeader}>
                <Text style={[styles.blockHeading, { color: colors.text }]}>{t.ourDoctors}</Text>
                {hasMoreDoctors ? (
                  <TouchableOpacity onPress={toggleDoctorsExpand} hitSlop={8} activeOpacity={0.6}>
                    <Text style={[styles.seeAllLink, { color: colors.primaryLight }]}>
                      {showAllDoctors
                        ? language === 'ru' ? 'Свернуть' : language === 'en' ? 'Show less' : 'Yopish'
                        : `${language === 'ru' ? 'Все' : language === 'en' ? 'All' : 'Barchasi'} (${activeDoctors.length}) →`}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={[styles.dividerHairline, { backgroundColor: colors.border }]} />
              {visibleDoctors.map((doctor, idx) => (
                <React.Fragment key={doctor._id}>
                  <TouchableOpacity
                    style={styles.doctorRow}
                    activeOpacity={0.6}
                    onPress={() => router.push({ pathname: '/doctor/[id]', params: { id: doctor._id, clinicId: id as string } })}
                  >
                    <Image
                      source={{ uri: doctor.avatarUrl || DEFAULT_AVATAR }}
                      style={[styles.doctorAvatar, { backgroundColor: colors.border }]}
                    />
                    <View style={styles.doctorInfo}>
                      <Text style={[styles.doctorName, { color: colors.text }]} numberOfLines={1}>{doctor.fullName}</Text>
                      <Text style={[styles.doctorSpecialty, { color: colors.textTertiary }]} numberOfLines={1}>
                        {doctor.specialty}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                  {idx < visibleDoctors.length - 1 ? (
                    <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                  ) : null}
                </React.Fragment>
              ))}
            </View>
          )}

          {/* Services */}
          {activeServices.length > 0 && (
            <View style={styles.block}>
              <View style={styles.blockHeader}>
                <Text style={[styles.blockHeading, { color: colors.text }]}>{t.viewClinicServices}</Text>
                {hasMoreServices ? (
                  <TouchableOpacity onPress={toggleServicesExpand} hitSlop={8} activeOpacity={0.6}>
                    <Text style={[styles.seeAllLink, { color: colors.primaryLight }]}>
                      {showAllServices
                        ? language === 'ru' ? 'Свернуть' : language === 'en' ? 'Show less' : 'Yopish'
                        : `${language === 'ru' ? 'Все' : language === 'en' ? 'All' : 'Barchasi'} (${activeServices.length}) →`}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={[styles.dividerHairline, { backgroundColor: colors.border }]} />
              {visibleServices.map((svc, idx) => {
                const monogram = (svc.title?.[0] ?? '?').toUpperCase();
                return (
                  <React.Fragment key={svc._id}>
                    <TouchableOpacity
                      style={styles.serviceRow}
                      activeOpacity={0.6}
                      onPress={() => router.push({ pathname: '/service/[id]', params: { id: svc._id } })}
                    >
                      {svc.serviceImage ? (
                        <Image
                          source={{ uri: svc.serviceImage }}
                          style={[styles.serviceThumb, { backgroundColor: colors.border }]}
                        />
                      ) : (
                        <View style={[styles.serviceMonogram, { backgroundColor: colors.backgroundSecondary }]}>
                          <Text style={[styles.serviceMonogramText, { color: colors.primaryLight }]}>{monogram}</Text>
                        </View>
                      )}
                      <View style={styles.serviceInfo}>
                        <Text style={[styles.serviceTitle, { color: colors.text }]} numberOfLines={1}>{svc.title}</Text>
                        {svc.durationMin > 0 ? (
                          <Text style={[styles.serviceDuration, { color: colors.textTertiary }]}>
                            {svc.durationMin} {language === 'ru' ? 'мин' : language === 'en' ? 'min' : 'daqiqa'}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={[styles.servicePriceText, { color: colors.text }]} numberOfLines={1}>
                        {formatPrice(svc.price)}
                      </Text>
                    </TouchableOpacity>
                    {idx < visibleServices.length - 1 ? (
                      <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                    ) : null}
                  </React.Fragment>
                );
              })}
            </View>
          )}

          {/* Reviews */}
          <View style={styles.block}>
            <View style={styles.blockHeader}>
              <Text style={[styles.blockHeading, { color: colors.text }]}>{t.reviews}</Text>
              {id && clinic ? (
                <TouchableOpacity onPress={() => setReviewSheetVisible(true)} hitSlop={8} activeOpacity={0.6}>
                  <Text style={[styles.seeAllLink, { color: colors.primaryLight }]}>
                    {t.writeReview} →
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <View style={[styles.dividerHairline, { backgroundColor: colors.border }]} />
            {reviewsLoading && reviews.length === 0 ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primaryLight} />
              </View>
            ) : reviews.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                {language === 'ru'
                  ? 'Пока нет отзывов. Будьте первым.'
                  : language === 'en'
                    ? 'No reviews yet. Be the first.'
                    : 'Hozircha sharhlar yo‘q. Birinchi bo‘ling.'}
              </Text>
            ) : (
              <>
                {reviews.map((r, idx) => (
                  <React.Fragment key={r._id}>
                    <View style={styles.reviewBlock}>
                      <ReviewerHeader
                        review={r}
                        language={language}
                        textColor={colors.text}
                        secondaryColor={colors.textTertiary}
                        starColor={colors.warning}
                      />
                      {r.text ? (
                        <Text style={[styles.reviewText, { color: colors.textSecondary, marginTop: 8 }]}>
                          {r.text}
                        </Text>
                      ) : null}
                    </View>
                    {idx < reviews.length - 1 ? (
                      <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                    ) : null}
                  </React.Fragment>
                ))}
                {reviewsTotal > reviews.length && (
                  <TouchableOpacity
                    onPress={onLoadMoreReviews}
                    disabled={reviewsLoadMore}
                    style={{ paddingVertical: 14, alignItems: 'center' }}
                    activeOpacity={0.6}
                  >
                    {reviewsLoadMore ? (
                      <ActivityIndicator size="small" color={colors.primaryLight} />
                    ) : (
                      <Text style={[styles.seeAllLink, { color: colors.primaryLight }]}>
                        {t.loadMoreReviews} ↓
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          <View style={{ height: Math.max(insets.bottom, 20) + 20 }} />
        </View>
      </ScrollView>

      <ReviewBottomSheet
        visible={reviewSheetVisible}
        onClose={() => setReviewSheetVisible(false)}
        onSuccess={onReviewSuccess}
        clinicId={id ?? ''}
        target="clinic"
        entityName={clinic?.clinicDisplayName ?? ''}
      />
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
    paddingTop: 58,
    paddingHorizontal: 18,
  },
  heroBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
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
    marginTop: -32,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 22,
  },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  clinicLogo: { width: 64, height: 64, borderRadius: 18 },
  identityText: { flex: 1, gap: 4 },
  nameLine: { flexDirection: 'row', alignItems: 'center' },
  clinicName: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4, lineHeight: 27, flexShrink: 1 },
  locationText: { fontSize: 13, fontWeight: '500' },
  inlineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    rowGap: 6,
    columnGap: 8,
    marginTop: 16,
    marginBottom: 4,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaStrong: { fontSize: 13, fontWeight: '700' },
  metaMuted: { fontSize: 13, fontWeight: '500' },
  metaPlain: { fontSize: 13, fontWeight: '500' },
  metaSep: { fontSize: 13, fontWeight: '700' },
  openDot: { width: 6, height: 6, borderRadius: 3 },
  block: { marginTop: 28 },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  blockHeading: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  seeAllLink: { fontSize: 13, fontWeight: '600' },
  dividerHairline: { height: StyleSheet.hairlineWidth, marginBottom: 4 },
  rowDivider: { height: StyleSheet.hairlineWidth, marginLeft: 64 },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  doctorAvatar: { width: 52, height: 52, borderRadius: 26 },
  doctorInfo: { flex: 1, marginLeft: 14, gap: 3 },
  doctorName: { fontSize: 15, fontWeight: '600', letterSpacing: -0.1 },
  doctorSpecialty: { fontSize: 13, fontWeight: '500' },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  serviceThumb: { width: 50, height: 50, borderRadius: 12 },
  serviceMonogram: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceMonogramText: { fontSize: 18, fontWeight: '700' },
  serviceInfo: { flex: 1, gap: 3 },
  serviceTitle: { fontSize: 15, fontWeight: '600', letterSpacing: -0.1 },
  serviceDuration: { fontSize: 12, fontWeight: '500' },
  servicePriceText: { fontSize: 14, fontWeight: '700' },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: { flex: 1, gap: 2 },
  contactLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' },
  contactValue: { fontSize: 15, fontWeight: '600' },
  reviewBlock: { paddingVertical: 14 },
  reviewText: { fontSize: 14, lineHeight: 21 },
  aboutText: { fontSize: 14, lineHeight: 22, marginTop: 4 },
  emptyText: { fontSize: 14, lineHeight: 22, paddingVertical: 14, fontStyle: 'italic' },
  loadingHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
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
  reviewRow: {
    padding: 11,
    borderRadius: 12,
    marginBottom: 7,
    borderWidth: 1,
  },
  reviewStarsRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 6 },
  reviewText: { fontSize: 14, marginBottom: 4 },
  reviewDate: { fontSize: 12 },
  loadMoreReviewsBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 8,
  },
  loadMoreReviewsText: { fontSize: 14, fontWeight: '600' },
  leaveReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  leaveReviewBtnText: { fontSize: 16, fontWeight: '700' },
});
