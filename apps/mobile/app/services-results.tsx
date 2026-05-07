import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { searchServicesWithFilters, type PublicServiceItem, type ServiceFilters } from '../lib/api';
import { useAuthStore } from '../store/auth-store';
import { useThemeStore } from '../store/theme-store';
import { getTranslations } from '../lib/translations';
import { getColors } from '../lib/theme';
import { getTokens } from '../lib/design';
import SaveServiceStar from './components/SaveServiceStar';
import Skeleton from './components/Skeleton';
import { useSavedServicesStore, type SavedServiceItem } from '../store/saved-services-store';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1576091160399-112ba8e25d1d?w=200&h=200&fit=crop';

function savedItemToPublic(s: SavedServiceItem): PublicServiceItem {
  return {
    _id: s._id,
    clinicId: s.clinicId,
    clinicDisplayName: s.clinicDisplayName,
    title: s.title,
    description: '',
    serviceImage: s.serviceImage,
    categoryId: '',
    categoryName: s.categoryName ?? '',
    durationMin: 0,
    price: s.price,
    isActive: true,
  };
}

function formatPrice(price: PublicServiceItem['price']): string {
  if (price.amount != null) return `${price.amount.toLocaleString()} ${price.currency}`;
  if (price.minAmount != null && price.maxAmount != null) {
    return `${price.minAmount.toLocaleString()} – ${price.maxAmount.toLocaleString()} ${price.currency}`;
  }
  return price.currency;
}

export default function ServicesResultsScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const theme = useThemeStore((s) => s.theme);
  const t = getTranslations(language);
  const colors = getColors(theme);
  const tokens = getTokens(theme);
  const insets = useSafeAreaInsets();
  const savedOnly = params.saved === '1';
  const hydrateSaved = useSavedServicesStore((s) => s.hydrate);
  const removeSavedService = useSavedServicesStore((s) => s.removeService);
  const [services, setServices] = useState<PublicServiceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState(params.q ?? '');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [localMinPrice, setLocalMinPrice] = useState(params.minPrice != null ? String(params.minPrice) : '');
  const [localMaxPrice, setLocalMaxPrice] = useState(params.maxPrice != null ? String(params.maxPrice) : '');
  const [appliedMinPrice, setAppliedMinPrice] = useState<number | undefined>(params.minPrice != null ? Number(params.minPrice) : undefined);
  const [appliedMaxPrice, setAppliedMaxPrice] = useState<number | undefined>(params.maxPrice != null ? Number(params.maxPrice) : undefined);

  const slideAnim = useRef(new Animated.Value(300)).current;

  const buildFilters = useCallback(
    (overrides?: { minPrice?: number; maxPrice?: number }): ServiceFilters => ({
      q: searchQuery.trim() || undefined,
      categoryId: params.categoryId || undefined,
      minPrice: overrides?.minPrice !== undefined ? overrides.minPrice : appliedMinPrice,
      maxPrice: overrides?.maxPrice !== undefined ? overrides.maxPrice : appliedMaxPrice,
      durationMin: params.durationMin != null ? Number(params.durationMin) : undefined,
      clinicId: params.clinicId || undefined,
    }),
    [searchQuery.trim(), params.categoryId, appliedMinPrice, appliedMaxPrice, params.durationMin, params.clinicId]
  );

  const load = useCallback(
    async (pageNum: number = 1, append: boolean = false, filterOverrides?: { minPrice?: number; maxPrice?: number }) => {
      if (savedOnly) {
        if (append) setRefreshing(true);
        else setLoading(true);
        setError(null);
        try {
          await hydrateSaved();
          const mapped = useSavedServicesStore.getState().items.map(savedItemToPublic);
          setServices(mapped);
          setTotal(mapped.length);
          setPage(1);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to load');
          setServices([]);
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
        return;
      }
      if (append) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const activeFilters = buildFilters(filterOverrides);
      try {
        const result = await searchServicesWithFilters(activeFilters, pageNum, 20);
        setServices(append ? (prev) => [...prev, ...result.services] : result.services);
        setTotal(result.total);
        setPage(pageNum);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
        if (!append) setServices([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [buildFilters, hydrateSaved, savedOnly]
  );

  useEffect(() => {
    if (filterModalVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 24,
        stiffness: 300,
      }).start();
    } else {
      slideAnim.setValue(300);
    }
  }, [filterModalVisible, slideAnim]);

  const openFilterModal = () => {
    setLocalMinPrice(appliedMinPrice != null ? String(appliedMinPrice) : '');
    setLocalMaxPrice(appliedMaxPrice != null ? String(appliedMaxPrice) : '');
    setFilterModalVisible(true);
  };

  const applyFilters = () => {
    const minNum = localMinPrice.trim() ? parseInt(localMinPrice.replace(/\s/g, ''), 10) : undefined;
    const maxNum = localMaxPrice.trim() ? parseInt(localMaxPrice.replace(/\s/g, ''), 10) : undefined;
    const min = minNum != null && !isNaN(minNum) ? minNum : undefined;
    const max = maxNum != null && !isNaN(maxNum) ? maxNum : undefined;
    setAppliedMinPrice(min);
    setAppliedMaxPrice(max);
    setFilterModalVisible(false);
    load(1, false, { minPrice: min, maxPrice: max });
  };

  useEffect(() => {
    load(1, false);
  }, [load, savedOnly]);

  const onRefresh = () => load(1, false);
  const onEndReached = () => {
    if (savedOnly) return;
    if (loading || refreshing || services.length >= total) return;
    load(page + 1, true);
  };

  const listData = useMemo(() => {
    if (!savedOnly || !searchQuery.trim()) return services;
    const q = searchQuery.trim().toLowerCase();
    return services.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.clinicDisplayName.toLowerCase().includes(q) ||
        (s.categoryName && s.categoryName.toLowerCase().includes(q))
    );
  }, [services, searchQuery, savedOnly]);

  const renderItem = ({ item }: { item: PublicServiceItem }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
      activeOpacity={0.9}
      onPress={() => router.push({ pathname: '/service/[id]', params: { id: item._id } })}
    >
      <LinearGradient
        colors={[tokens.brand.iris, tokens.brand.lilac]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.cardAccent}
      />
      <View style={styles.cardImageWrap}>
        <Image
          source={{ uri: item.serviceImage || DEFAULT_IMAGE }}
          style={[styles.cardImage, { backgroundColor: colors.border }]}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.45)']}
          style={styles.cardImageOverlay}
          pointerEvents="none"
        />
        {savedOnly ? (
          <View style={[styles.cardSavedBadge, { backgroundColor: tokens.brand.amber }]}>
            <Ionicons name="bookmark" size={11} color="#fff" />
          </View>
        ) : null}
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            {item.categoryName ? (
              <Text style={[styles.cardKicker, { color: tokens.brand.iris }]} numberOfLines={1}>
                {item.categoryName}
              </Text>
            ) : null}
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
              {item.title}
            </Text>
          </View>
          {savedOnly ? (
            <TouchableOpacity
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={(e) => {
                e.stopPropagation();
                removeSavedService(item._id);
                setServices((prev) => prev.filter((s) => s._id !== item._id));
                setTotal((n) => Math.max(0, n - 1));
              }}
              style={[styles.cardRemoveBtn, { backgroundColor: colors.backgroundSecondary }]}
            >
              <Ionicons name="close" size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : (
            <SaveServiceStar service={item} size={20} />
          )}
        </View>

        <LinearGradient
          colors={[tokens.brand.iris, tokens.brand.lilac]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.cardPriceChip}
        >
          <Ionicons name="cash-outline" size={12} color="#fff" />
          <Text style={styles.cardPriceText} numberOfLines={1}>
            {formatPrice(item.price)}
          </Text>
        </LinearGradient>

        <View style={styles.cardClinicRow}>
          <Ionicons name="business-outline" size={12} color={colors.textTertiary} />
          <Text style={[styles.cardClinicName, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.clinicDisplayName}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: 'transparent' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={[styles.searchRow, { backgroundColor: colors.backgroundInput, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t.searchPlaceholder}
            placeholderTextColor={colors.textPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => load(1, false)}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setTimeout(() => load(1, false), 50); }} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        {!savedOnly ? (
          <TouchableOpacity onPress={openFilterModal} style={styles.headerFilterBtn}>
            <Ionicons name="options-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>
      {savedOnly ? (
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {language === 'ru' ? 'Сохранённые услуги' : 'Saqlangan xizmatlar'}
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {listData.length > 0
                ? language === 'ru'
                  ? `${listData.length} ${listData.length === 1 ? 'услуга' : 'услуг'}`
                  : `${listData.length} ta xizmat`
                : language === 'ru'
                ? 'Пусто пока'
                : 'Hozircha bo‘sh'}
            </Text>
          </View>
          <View style={[styles.sectionBadge, { backgroundColor: colors.primaryBg }]}>
            <Ionicons name="bookmark" size={14} color={tokens.brand.iris} />
          </View>
        </View>
      ) : null}

        {loading && services.length === 0 ? (
          <View style={styles.skeletonList}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                <Skeleton width={84} height={84} borderRadius={18} style={{ backgroundColor: colors.border }} />
                <View style={styles.cardBody}>
                  <Skeleton width={70} height={10} style={{ marginBottom: 6 }} />
                  <Skeleton width="90%" height={16} style={{ marginBottom: 10 }} />
                  <Skeleton width={120} height={22} borderRadius={11} style={{ marginBottom: 6 }} />
                  <Skeleton width={140} height={12} />
                </View>
              </View>
            ))}
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        ) : listData.length === 0 ? (
          <View style={styles.centered}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primaryBg }]}>
              <Ionicons
                name={savedOnly ? 'bookmark-outline' : 'search-outline'}
                size={32}
                color={tokens.brand.iris}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {savedOnly
                ? language === 'ru'
                  ? 'Сохранённых услуг нет'
                  : 'Saqlangan xizmat yo‘q'
                : t.noResultsFound}
            </Text>
            <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>
              {savedOnly
                ? language === 'ru'
                  ? 'Нажмите на закладку у любой услуги, чтобы сохранить'
                  : 'Xizmatni saqlash uchun belgini bosing'
                : language === 'ru'
                ? 'Попробуйте изменить запрос или фильтры'
                : 'Qidiruv yoki filtrlarni o‘zgartiring'}
            </Text>
            {savedOnly ? (
              <TouchableOpacity
                style={[styles.emptyCta, { backgroundColor: tokens.brand.iris }]}
                activeOpacity={0.85}
                onPress={() => router.back()}
              >
                <Ionicons name="search-outline" size={16} color="#fff" />
                <Text style={styles.emptyCtaText}>
                  {language === 'ru' ? 'Найти услуги' : 'Xizmat qidirish'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <FlatList
            data={listData}
            renderItem={renderItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.3}
            ListFooterComponent={loading && services.length > 0 ? <ActivityIndicator style={{ padding: 16 }} color={colors.primary} /> : null}
          />
        )}

      <Modal visible={filterModalVisible} transparent animationType="none">
        <TouchableWithoutFeedback onPress={() => setFilterModalVisible(false)}>
          <View style={styles.filterBackdrop} />
        </TouchableWithoutFeedback>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.filterAvoid}
        >
          <Animated.View
            style={[
              styles.filterSheet,
              {
                backgroundColor: colors.backgroundCard,
                borderTopColor: colors.border,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={[styles.filterHandle, { backgroundColor: colors.textTertiary }]} />
            <Text style={[styles.filterSheetTitle, { color: colors.text }]}>{t.filters}</Text>

            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>{t.minPrice}</Text>
            <TextInput
              style={[styles.filterInput, { backgroundColor: colors.backgroundInput, color: colors.text, borderColor: colors.border }]}
              placeholder="0"
              placeholderTextColor={colors.textPlaceholder}
              value={localMinPrice}
              onChangeText={(v) => setLocalMinPrice(v.replace(/\D/g, ''))}
              keyboardType="number-pad"
            />

            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>{t.maxPrice}</Text>
            <TextInput
              style={[styles.filterInput, { backgroundColor: colors.backgroundInput, color: colors.text, borderColor: colors.border }]}
              placeholder="—"
              placeholderTextColor={colors.textPlaceholder}
              value={localMaxPrice}
              onChangeText={(v) => setLocalMaxPrice(v.replace(/\D/g, ''))}
              keyboardType="number-pad"
            />

            <TouchableOpacity
              style={[styles.filterApplyBtn, { backgroundColor: colors.primary }]}
              onPress={applyFilters}
              activeOpacity={0.85}
            >
              <Text style={styles.filterApplyBtnText}>{t.apply}</Text>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 56, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { padding: 8, marginLeft: -4 },
  searchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 4 },
  headerFilterBtn: { padding: 8 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  filterBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  filterAvoid: { flex: 1, justifyContent: 'flex-end' },
  filterSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    borderTopWidth: 1,
  },
  filterHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  filterSheetTitle: { fontSize: 20, fontWeight: '700', marginBottom: 20 },
  filterLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  filterInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  filterApplyBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  filterApplyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skeletonList: { padding: 20, paddingBottom: 40 },
  errorText: { fontSize: 14 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
    gap: 12,
  },
  sectionTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  sectionSubtitle: { fontSize: 13, marginTop: 2, fontWeight: '500' },
  sectionBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  emptyHint: { fontSize: 13, textAlign: 'center', lineHeight: 18, maxWidth: 260 },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    marginTop: 18,
  },
  emptyCtaText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  listContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    padding: 12,
    paddingLeft: 14,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    position: 'relative',
  },
  cardAccent: {
    position: 'absolute',
    top: 14,
    bottom: 14,
    left: 0,
    width: 3,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  cardImageWrap: {
    width: 84,
    height: 84,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  cardImage: { width: '100%', height: '100%' },
  cardImageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  cardSavedBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
  cardBody: { flex: 1, marginLeft: 14, gap: 8, minWidth: 0 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardKicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  cardRemoveBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPriceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  cardPriceText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  cardClinicRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardClinicName: { fontSize: 12, fontWeight: '500', flexShrink: 1 },
});
