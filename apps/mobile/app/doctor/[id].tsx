import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getClinicDetail,
  getReviews,
  type ClinicDoctorPublic,
  type ReviewItem,
} from '../../lib/api';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { getTranslations } from '../../lib/translations';
import { getTokens } from '../../lib/design';
import { Button, Card, SkeletonBlock, IconButton } from '../../components/ui';
import ReviewBottomSheet from '../components/ReviewBottomSheet';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&q=80';
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function DoctorDetailScreen() {
  const { id: doctorId, clinicId } = useLocalSearchParams<{ id: string; clinicId?: string }>();
  const router = useRouter();
  const language = useAuthStore((s) => s.language) ?? 'uz';
  const theme = useThemeStore((s) => s.theme);
  const t = getTranslations(language);
  const tokens = getTokens(theme);
  const insets = useSafeAreaInsets();
  const [doctor, setDoctor] = useState<ClinicDoctorPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewSheetVisible, setReviewSheetVisible] = useState(false);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsSkip, setReviewsSkip] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsLoadMore, setReviewsLoadMore] = useState(false);
  const [doctorRating, setDoctorRating] = useState<{ avg: number; count: number } | null>(null);

  useEffect(() => {
    if (!doctorId || !clinicId) {
      setError('Missing params');
      setLoading(false);
      return;
    }
    setLoading(true);
    getClinicDetail(clinicId)
      .then((clinic) => {
        const found = clinic.doctors?.find((d) => d._id === doctorId);
        setDoctor(found ?? null);
        if (!found) setError('Doctor not found');
      })
      .catch(() => setError('Not found'))
      .finally(() => setLoading(false));
  }, [doctorId, clinicId]);

  const loadReviews = (skip: number, limit: number, append: boolean) => {
    if (!clinicId || !doctorId) return;
    if (append) setReviewsLoadMore(true);
    else setReviewsLoading(true);
    getReviews({ clinicId, doctorId, skip, limit })
      .then((res) => {
        setDoctorRating(res.rating);
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
    if (!clinicId || !doctorId) return;
    loadReviews(0, 3, false);
  }, [clinicId, doctorId]);

  const onReviewSuccess = () => {
    loadReviews(0, 3, false);
    if (doctorRating) {
      const count = doctorRating.count + 1;
      const avg = (doctorRating.avg * doctorRating.count + 5) / count;
      setDoctorRating({ avg: Math.round(avg * 10) / 10, count });
    }
  };

  const openChat = async () => {
    if (!clinicId || !doctorId) return;
    try {
      const { openConversationWithDoctor } = await import('../../lib/api');
      const conv = await openConversationWithDoctor(clinicId, doctorId);
      router.push({ pathname: '/chat/[id]', params: { id: conv._id } });
    } catch {
      /* noop */
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: tokens.colors.background }]}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <IconButton icon="chevron-back" onPress={() => router.back()} />
        </View>
        <View style={{ padding: 20, alignItems: 'center' }}>
          <SkeletonBlock width={140} height={140} radius={70} />
          <View style={{ height: 20 }} />
          <SkeletonBlock width={200} height={22} />
          <View style={{ height: 8 }} />
          <SkeletonBlock width={140} height={14} />
        </View>
      </View>
    );
  }

  if (error || !doctor) {
    return (
      <View style={[styles.centered, { backgroundColor: tokens.colors.background }]}>
        <Text style={{ color: tokens.colors.error, marginBottom: 12 }}>{t.noResultsFound}</Text>
        <Button title={t.back ?? 'Back'} variant="outline" onPress={() => router.back()} />
      </View>
    );
  }

  const scheduleText = doctor.schedule?.weekly?.length
    ? doctor.schedule.weekly.map((w) => `${DAY_NAMES[w.day - 1] ?? w.day} ${w.from}–${w.to}`).join(' · ')
    : null;

  return (
    <View style={[styles.root, { backgroundColor: tokens.colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={tokens.gradients.cool as [string, string, ...string[]]}
          style={[styles.hero, { paddingTop: insets.top + 12 }]}
        >
          <View style={styles.topBar}>
            <IconButton icon="chevron-back" onPress={() => router.back()} />
            <IconButton icon="share-social-outline" onPress={() => {}} />
          </View>

          <View style={styles.profile}>
            <View style={styles.avatarWrap}>
              <Image
                source={{ uri: doctor.avatarUrl || DEFAULT_AVATAR }}
                style={styles.avatar}
              />
              <View style={[styles.onlineDot, { borderColor: '#fff' }]} />
            </View>

            <Text style={[tokens.type.titleXl, { color: tokens.colors.text, marginTop: 14, textAlign: 'center' }]}>
              {doctor.fullName}
            </Text>
            <View style={styles.specPill}>
              <Ionicons name="medkit" size={12} color={tokens.brand.iris} />
              <Text style={{ color: tokens.brand.iris, fontSize: 12, fontWeight: '700' }}>{doctor.specialty}</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCell}>
                <Text style={[tokens.type.titleLg, { color: tokens.colors.text }]}>
                  {doctorRating?.avg?.toFixed(1) ?? '—'}
                </Text>
                <Text style={{ color: tokens.colors.textTertiary, fontSize: 11, fontWeight: '600' }}>
                  {language === 'uz' ? 'Reyting' : 'Рейтинг'}
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: tokens.colors.border }]} />
              <View style={styles.statCell}>
                <Text style={[tokens.type.titleLg, { color: tokens.colors.text }]}>
                  {doctorRating?.count ?? 0}
                </Text>
                <Text style={{ color: tokens.colors.textTertiary, fontSize: 11, fontWeight: '600' }}>
                  {language === 'uz' ? "Sharhlar" : 'Отзывы'}
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: tokens.colors.border }]} />
              <View style={styles.statCell}>
                <Text style={[tokens.type.titleLg, { color: tokens.colors.text }]}>
                  {doctor.serviceIds?.length ?? 0}
                </Text>
                <Text style={{ color: tokens.colors.textTertiary, fontSize: 11, fontWeight: '600' }}>
                  {language === 'uz' ? 'Xizmat' : 'Услуг'}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={{ padding: 20, gap: 14 }}>
          {doctor.bio ? (
            <Card>
              <Text style={[tokens.type.caption, { color: tokens.colors.textTertiary, marginBottom: 6 }]}>
                {language === 'uz' ? "Haqida" : 'О враче'}
              </Text>
              <Text style={{ color: tokens.colors.text, fontSize: 14, lineHeight: 22 }}>{doctor.bio}</Text>
            </Card>
          ) : null}

          {scheduleText ? (
            <Card>
              <Text style={[tokens.type.caption, { color: tokens.colors.textTertiary, marginBottom: 6 }]}>
                {language === 'uz' ? "Ish jadvali" : 'График'}
              </Text>
              <Text style={{ color: tokens.colors.text, fontSize: 13, lineHeight: 20 }}>{scheduleText}</Text>
            </Card>
          ) : null}

          <Card>
            <Text style={[tokens.type.caption, { color: tokens.colors.textTertiary, marginBottom: 10 }]}>
              {t.reviews}
            </Text>
            {reviewsLoading && reviews.length === 0 ? (
              <ActivityIndicator size="small" color={tokens.brand.iris} />
            ) : reviews.length === 0 ? (
              <Text style={{ color: tokens.colors.textTertiary, fontSize: 13 }}>
                {language === 'uz' ? "Hozircha sharhlar yo'q" : 'Пока нет отзывов'}
              </Text>
            ) : (
              reviews.map((r) => (
                <View
                  key={r._id}
                  style={[styles.reviewRow, { borderBottomColor: tokens.colors.borderLight }]}
                >
                  <View style={{ flexDirection: 'row', gap: 2, marginBottom: 4 }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Ionicons
                        key={s}
                        name={s <= r.stars ? 'star' : 'star-outline'}
                        size={13}
                        color={tokens.brand.amber}
                      />
                    ))}
                  </View>
                  {r.text ? (
                    <Text style={{ color: tokens.colors.text, fontSize: 13, lineHeight: 18 }}>{r.text}</Text>
                  ) : null}
                  <Text style={{ color: tokens.colors.textTertiary, fontSize: 11, marginTop: 4 }}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              ))
            )}
            {reviewsTotal > reviews.length ? (
              <TouchableOpacity
                onPress={() => loadReviews(reviewsSkip, 10, true)}
                disabled={reviewsLoadMore}
                style={{ alignItems: 'center', marginTop: 10 }}
              >
                {reviewsLoadMore ? (
                  <ActivityIndicator size="small" color={tokens.brand.iris} />
                ) : (
                  <Text style={{ color: tokens.brand.iris, fontWeight: '700', fontSize: 13 }}>
                    {t.loadMoreReviews ?? 'Load more'}
                  </Text>
                )}
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={() => setReviewSheetVisible(true)}
              style={[styles.writeReview, { borderColor: tokens.brand.iris }]}
            >
              <Ionicons name="star-outline" size={16} color={tokens.brand.iris} />
              <Text style={{ color: tokens.brand.iris, fontWeight: '700', fontSize: 13 }}>
                {t.writeReview ?? 'Write review'}
              </Text>
            </TouchableOpacity>
          </Card>
        </View>
      </ScrollView>

      <View style={[styles.ctaBar, { backgroundColor: tokens.colors.background, borderTopColor: tokens.colors.border, paddingBottom: insets.bottom + 10 }]}>
        <Button
          title={language === 'uz' ? 'Yozish' : 'Написать'}
          variant="outline"
          leftIcon="chatbubble-ellipses-outline"
          onPress={openChat}
          fullWidth={false}
          style={{ flex: 1 }}
          size="md"
        />
        <Button
          title={language === 'uz' ? 'Bron qilish' : 'Записаться'}
          variant="gradient"
          rightIcon="arrow-forward"
          onPress={() =>
            router.push({
              pathname: '/book-doctor',
              params: { doctorId: doctorId as string, clinicId: clinicId as string },
            })
          }
          fullWidth={false}
          style={{ flex: 1.2 }}
          size="md"
        />
      </View>

      <ReviewBottomSheet
        visible={reviewSheetVisible}
        onClose={() => setReviewSheetVisible(false)}
        onSuccess={onReviewSuccess}
        clinicId={clinicId ?? ''}
        doctorId={doctorId ?? undefined}
        target="doctor"
        entityName={doctor.fullName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 26,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profile: { alignItems: 'center', marginTop: 6 },
  avatarWrap: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f1a4a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  avatar: { width: 116, height: 116, borderRadius: 58 },
  onlineDot: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#34d399',
    borderWidth: 3,
  },
  specPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 10,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginTop: 18,
    borderRadius: 20,
    alignSelf: 'stretch',
    shadowColor: '#0f1a4a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  statCell: { flex: 1, alignItems: 'center' },
  statDivider: { width: StyleSheet.hairlineWidth, height: '60%', alignSelf: 'center' },
  reviewRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  writeReview: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  ctaBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 12,
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
