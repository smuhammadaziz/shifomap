import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { searchServicesWithFilters, type PublicServiceItem, type ServiceFilters } from '../lib/api';
import { useAuthStore } from '../store/auth-store';
import { useThemeStore } from '../store/theme-store';
import { getTranslations } from '../lib/translations';
import { getColors } from '../lib/theme';
import SaveServiceStar from './components/SaveServiceStar';
import Skeleton from './components/Skeleton';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1576091160399-112ba8e25d1d?w=200&h=200&fit=crop';

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
      if (append) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const activeFilters = buildFilters(filterOverrides);
      try {
        const result = await searchServicesWithFilters(activeFilters, pageNum, 20);
        setServices(append ? (s) => [...s, ...result.services] : result.services);
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
    [buildFilters]
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
  }, [load]);

  const onRefresh = () => load(1, false);
  const onEndReached = () => {
    if (loading || refreshing || services.length >= total) return;
    load(page + 1, true);
  };

  const renderItem = ({ item }: { item: PublicServiceItem }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/service/[id]', params: { id: item._id } })}
    >
      <Image
        source={{ uri: item.serviceImage || DEFAULT_IMAGE }}
        style={[styles.cardImage, { backgroundColor: colors.border }]}
      />
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
          <SaveServiceStar service={item} size={20} />
        </View>
        {item.categoryName ? (
          <Text style={[styles.cardCategory, { color: colors.textSecondary }]}>{item.categoryName}</Text>
        ) : null}
        <Text style={[styles.cardPrice, { color: colors.primaryLight }]}>{formatPrice(item.price)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
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
        <TouchableOpacity onPress={openFilterModal} style={styles.headerFilterBtn}>
          <Ionicons name="options-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

        {loading && services.length === 0 ? (
          <View style={styles.skeletonList}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                <Skeleton width={88} height={88} borderRadius={14} style={{ backgroundColor: colors.border }} />
                <View style={styles.cardBody}>
                  <Skeleton width="90%" height={16} style={{ marginBottom: 8 }} />
                  <Skeleton width={60} height={12} style={{ marginBottom: 4 }} />
                  <Skeleton width={80} height={14} />
                </View>
              </View>
            ))}
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        ) : services.length === 0 ? (
          <View style={styles.centered}>
            <Text style={[styles.noResults, { color: colors.textSecondary }]}>{t.noResultsFound}</Text>
          </View>
        ) : (
          <FlatList
            data={services}
            renderItem={renderItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
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
  noResults: { fontSize: 14 },
  listContent: { padding: 20, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardImage: { width: 88, height: 88, borderRadius: 14 },
  cardBody: { flex: 1, marginLeft: 14, justifyContent: 'space-between' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', flex: 1 },
  cardCategory: { fontSize: 12, marginTop: 4 },
  cardPrice: { fontSize: 14, fontWeight: '600', marginTop: 4 },
});
