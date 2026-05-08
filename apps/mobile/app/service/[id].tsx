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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getServiceById, getReviews, type ServiceDetailResponse, type ReviewItem } from '../../lib/api';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { getTranslations } from '../../lib/translations';
import { getColors } from '../../lib/theme';
import SaveServiceStar from '../components/SaveServiceStar';
import Skeleton from '../components/Skeleton';
import ReviewBottomSheet from '../components/ReviewBottomSheet';
import ReviewerHeader from '../components/ReviewerHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 300;
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1576091160399-112ba8e25d1d?w=400&h=300&fit=crop';
const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop';

function formatPrice(price: { amount?: number; minAmount?: number; maxAmount?: number; currency: string }): string {
  if (price.amount != null) return `${price.amount.toLocaleString()} ${price.currency}`;
  if (price.minAmount != null && price.maxAmount != null) {
    return `${price.minAmount.toLocaleString()} – ${price.maxAmount.toLocaleString()} ${price.currency}`;
  }
  return price.currency;
}

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const theme = useThemeStore((s) => s.theme);
  const t = getTranslations(language);
  const insets = useSafeAreaInsets();
  const colors = getColors(theme);
  const [data, setData] = useState<ServiceDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewSheetVisible, setReviewSheetVisible] = useState(false);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsSkip, setReviewsSkip] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsLoadMore, setReviewsLoadMore] = useState(false);
  const [serviceRating, setServiceRating] = useState<{ avg: number; count: number } | null>(null);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getServiceById(id)
      .then(setData)
      .catch(() => setError('Not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const loadReviews = (skip: number, limit: number, append: boolean) => {
    if (!data?.clinic?._id || !id) return;
    if (append) setReviewsLoadMore(true);
    else setReviewsLoading(true);
    getReviews({ clinicId: data.clinic._id, serviceId: id, skip, limit })
      .then((res) => {
        setServiceRating(res.rating);
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
    if (!data?.clinic?._id || !id) return;
    loadReviews(0, 3, false);
  }, [data?.clinic?._id, id]);

  const onLoadMoreReviews = () => {
    loadReviews(reviewsSkip, 10, true);
  };

  const onReviewSuccess = () => {
    loadReviews(0, 3, false);
    if (serviceRating) {
      const count = serviceRating.count + 1;
      const avg = (serviceRating.avg * serviceRating.count + 5) / count;
      setServiceRating({ avg: Math.round(avg * 10) / 10, count });
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.heroBox, { backgroundColor: colors.border }]}>
          <Skeleton width={SCREEN_WIDTH} height={HERO_HEIGHT} borderRadius={0} />
        </View>
        <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
          <Skeleton width={120} height={13} style={{ marginBottom: 6 }} />
          <Skeleton width="85%" height={20} style={{ marginBottom: 8 }} />
          <Skeleton width={160} height={28} style={{ marginBottom: 12 }} />
          <Skeleton width={100} height={14} style={{ marginBottom: 16 }} />
          <Skeleton width="100%" height={48} style={{ marginBottom: 20 }} />
          <Skeleton width={60} height={12} style={{ marginBottom: 8 }} />
          <Skeleton width="100%" height={44} style={{ marginBottom: 8 }} />
          <Skeleton width="100%" height={44} style={{ marginBottom: 18 }} />
          <Skeleton width={60} height={12} style={{ marginBottom: 8 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Skeleton width={36} height={36} borderRadius={18} />
            <Skeleton width={120} height={14} style={{ marginLeft: 10 }} />
          </View>
          <Skeleton width={60} height={12} style={{ marginBottom: 8 }} />
          <Skeleton width="100%" height={44} />
        </View>
      </View>
    );
  }
  if (error || !data) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>{t.noResultsFound}</Text>
        <TouchableOpacity style={styles.backBtnFull} onPress={() => router.back()}>
          <Text style={[styles.backBtnText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { service, clinic } = data;
  const rawService = service as typeof service & { branchNames?: string[]; doctorNames?: string[] };
  const branchNames = rawService.branchNames ?? [];
  const doctorNames = rawService.doctorNames ?? [];
  const branchIds = service.branchIds ?? [];
  const doctorIds = service.doctorIds ?? [];
  // When API doesn't return branch names, show fallback label + index so branch list still works
  const branchList = branchIds.length > 0
    ? branchIds.map((bid, idx) => ({ id: bid, name: branchNames[idx] ?? `${t.branchLabel} ${idx + 1}` }))
    : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroBox, { backgroundColor: colors.border }]}>
          <Image source={{ uri: service.serviceImage || DEFAULT_IMAGE }} style={styles.heroImage} />
          <LinearGradient colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.62)']} style={styles.heroOverlay}>
            <TouchableOpacity style={styles.heroBackBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.heroStarWrap}>
              <SaveServiceStar service={service} size={22} />
            </View>
          </LinearGradient>
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
          {service.categoryName ? (
            <Text style={[styles.category, { color: colors.textTertiary }]} numberOfLines={1}>
              {service.categoryName}
            </Text>
          ) : null}
          <Text style={[styles.title, { color: colors.text }]}>{service.title}</Text>

          {data.activeDiscount ? (
            <View style={styles.discountBlock}>
              <View style={styles.discountTopRow}>
                <View style={[styles.discountBadge, { backgroundColor: colors.error ?? '#dc2626' }]}>
                  <Ionicons name="pricetag" size={12} color="#fff" />
                  <Text style={styles.discountBadgeText}>−{data.activeDiscount.percentOff}%</Text>
                </View>
                <Text style={[styles.discountUntil, { color: colors.textTertiary }]}>
                  {language === 'uz' ? 'Tugaydi: ' : 'До: '}
                  {new Date(data.activeDiscount.expiresAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.discountPriceRow}>
                <Text style={[styles.priceDiscounted, { color: colors.primaryLight }]}>
                  {data.activeDiscount.discountedAmount.toLocaleString()} {data.activeDiscount.currency}
                </Text>
                <Text style={[styles.priceStrike, { color: colors.textTertiary }]}>
                  {formatPrice(service.price)}
                </Text>
              </View>
              {data.activeDiscount.title ? (
                <Text style={[styles.discountTitle, { color: colors.textSecondary }]} numberOfLines={2}>
                  {data.activeDiscount.title}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text style={[styles.price, { color: colors.text }]}>{formatPrice(service.price)}</Text>
          )}

          {/* Inline meta — no boxes */}
          <View style={styles.inlineMeta}>
            {service.durationMin > 0 ? (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={13} color={colors.textTertiary} />
                <Text style={[styles.metaTextEditorial, { color: colors.textSecondary }]}>
                  {service.durationMin} {t.minutes}
                </Text>
              </View>
            ) : null}
            {service.durationMin > 0 && (serviceRating?.count ?? 0) > 0 ? (
              <Text style={[styles.metaSep, { color: colors.textTertiary }]}>·</Text>
            ) : null}
            {(serviceRating?.count ?? 0) > 0 ? (
              <View style={styles.metaItem}>
                <Ionicons name="star" size={13} color={colors.warning} />
                <Text style={[styles.metaStrong, { color: colors.text }]}>
                  {serviceRating!.avg.toFixed(1)}
                </Text>
                <Text style={[styles.metaTextEditorial, { color: colors.textTertiary }]}>
                  ({serviceRating!.count})
                </Text>
              </View>
            ) : null}
            {service.categoryName && (service.durationMin > 0 || (serviceRating?.count ?? 0) > 0) ? (
              <Text style={[styles.metaSep, { color: colors.textTertiary }]}>·</Text>
            ) : null}
            {service.categoryName ? (
              <Text style={[styles.metaTextEditorial, { color: colors.textSecondary }]} numberOfLines={1}>
                {service.categoryName}
              </Text>
            ) : null}
          </View>

          {service.description ? (
            <Text style={[styles.description, { color: colors.textSecondary }]}>{service.description}</Text>
          ) : null}

          {/* Branches */}
          {branchList.length > 0 && (
            <View style={styles.block}>
              <Text style={[styles.blockHeading, { color: colors.text, marginBottom: 14 }]}>{t.branches}</Text>
              <View style={[styles.dividerHairline, { backgroundColor: colors.border }]} />
              {branchList.map((b, idx) => (
                <React.Fragment key={b.id}>
                  <TouchableOpacity
                    style={styles.linkRow}
                    activeOpacity={0.6}
                    onPress={() => router.push({ pathname: '/branch/[id]', params: { id: b.id, clinicId: clinic._id } })}
                  >
                    <View style={styles.linkRowInfo}>
                      <Text style={[styles.linkRowText, { color: colors.text }]} numberOfLines={2}>{b.name}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                  {idx < branchList.length - 1 ? (
                    <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                  ) : null}
                </React.Fragment>
              ))}
            </View>
          )}

          {/* Doctors */}
          {doctorNames.length > 0 && (
            <View style={styles.block}>
              <Text style={[styles.blockHeading, { color: colors.text, marginBottom: 14 }]}>{t.doctors}</Text>
              <View style={[styles.dividerHairline, { backgroundColor: colors.border }]} />
              {doctorNames.map((name, idx) => (
                <React.Fragment key={doctorIds[idx] ?? idx}>
                  <TouchableOpacity
                    style={styles.doctorRow}
                    activeOpacity={0.6}
                    onPress={() => router.push({ pathname: '/doctor/[id]', params: { id: doctorIds[idx], clinicId: clinic._id } })}
                  >
                    <Image
                      source={{ uri: DEFAULT_AVATAR }}
                      style={[styles.doctorAvatar, { backgroundColor: colors.border }]}
                    />
                    <Text style={[styles.doctorName, { color: colors.text }]} numberOfLines={1}>{name}</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                  {idx < doctorNames.length - 1 ? (
                    <View style={[styles.rowDivider, { backgroundColor: colors.border, marginLeft: 50 }]} />
                  ) : null}
                </React.Fragment>
              ))}
            </View>
          )}

          {/* Clinic */}
          <View style={styles.block}>
            <Text style={[styles.blockHeading, { color: colors.text, marginBottom: 14 }]}>{t.clinic}</Text>
            <View style={[styles.dividerHairline, { backgroundColor: colors.border }]} />
            <TouchableOpacity
              style={styles.linkRow}
              activeOpacity={0.6}
              onPress={() => router.push({ pathname: '/clinic/[id]', params: { id: clinic._id } })}
            >
              <View style={styles.linkRowInfo}>
                <Text style={[styles.linkRowText, { color: colors.primaryLight, fontWeight: '700' }]} numberOfLines={2}>
                  {clinic.clinicDisplayName}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.primaryLight} />
            </TouchableOpacity>
          </View>

          {/* Reviews */}
          <View style={styles.block}>
            <View style={styles.blockHeader}>
              <Text style={[styles.blockHeading, { color: colors.text }]}>{t.reviews}</Text>
              <TouchableOpacity onPress={() => setReviewSheetVisible(true)} hitSlop={8} activeOpacity={0.6}>
                <Text style={[styles.seeAllLink, { color: colors.primaryLight }]}>
                  {t.writeReview} →
                </Text>
              </TouchableOpacity>
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
        </View>
        <View style={{ height: Math.max(insets.bottom, 20) + 80 }} />
      </ScrollView>

      <ReviewBottomSheet
        visible={reviewSheetVisible}
        onClose={() => setReviewSheetVisible(false)}
        onSuccess={onReviewSuccess}
        clinicId={clinic._id}
        serviceId={id ?? undefined}
        target="service"
        entityName={service.title}
      />

      <View style={[styles.stickyFooter, { backgroundColor: colors.backgroundCard, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={[styles.bookButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.9}
          onPress={() => router.push({ pathname: '/book', params: { clinicId: clinic._id, serviceId: id as string } })}
        >
          <Ionicons name="calendar" size={22} color="#fff" style={styles.bookIcon} />
          <Text style={styles.bookButtonText}>{t.bookAppointment}</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { marginBottom: 16 },
  backBtnFull: { padding: 12 },
  backBtnText: { fontSize: 16 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  heroBox: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
  },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
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
  heroStarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginTop: -30,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 22,
  },
  category: { fontSize: 13, marginBottom: 6, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 12, letterSpacing: -0.5, lineHeight: 34 },
  price: { fontSize: 32, fontWeight: '800', marginBottom: 12, letterSpacing: -0.6 },
  discountBlock: { marginBottom: 14 },
  discountTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  discountBadgeText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 0.3 },
  discountUntil: { fontSize: 12, fontWeight: '600' },
  discountPriceRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 10 },
  priceDiscounted: { fontSize: 34, fontWeight: '900', letterSpacing: -0.6 },
  priceStrike: { fontSize: 16, fontWeight: '600', textDecorationLine: 'line-through' },
  discountTitle: { fontSize: 13, fontWeight: '500', marginTop: 4 },
  inlineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    rowGap: 6,
    columnGap: 8,
    marginBottom: 18,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTextEditorial: { fontSize: 13, fontWeight: '500' },
  metaStrong: { fontSize: 13, fontWeight: '700' },
  metaSep: { fontSize: 13, fontWeight: '700' },
  description: { fontSize: 14, lineHeight: 22, marginBottom: 4 },
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
  rowDivider: { height: StyleSheet.hairlineWidth },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  linkRowInfo: { flex: 1, gap: 2 },
  linkRowText: { fontSize: 15, fontWeight: '600', letterSpacing: -0.1 },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  doctorAvatar: { width: 38, height: 38, borderRadius: 19 },
  doctorName: { flex: 1, fontSize: 15, fontWeight: '600', letterSpacing: -0.1 },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    gap: 10,
  },
  bookIcon: { marginRight: 4 },
  bookButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  reviewBlock: { paddingVertical: 14 },
  reviewText: { fontSize: 14, lineHeight: 21 },
  emptyText: { fontSize: 14, lineHeight: 22, paddingVertical: 14, fontStyle: 'italic' },
});
