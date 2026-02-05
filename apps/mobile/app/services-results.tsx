import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { searchServicesWithFilters, type PublicServiceItem, type ServiceFilters } from '../lib/api';
import { useAuthStore } from '../store/auth-store';
import { getTranslations } from '../lib/translations';
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
  const t = getTranslations(language);
  const [services, setServices] = useState<PublicServiceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filters: ServiceFilters = {
    q: params.q || undefined,
    categoryId: params.categoryId || undefined,
    minPrice: params.minPrice != null ? Number(params.minPrice) : undefined,
    maxPrice: params.maxPrice != null ? Number(params.maxPrice) : undefined,
    durationMin: params.durationMin != null ? Number(params.durationMin) : undefined,
    clinicId: params.clinicId || undefined,
  };

  const load = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      if (append) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await searchServicesWithFilters(filters, pageNum, 20);
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
    [params.q, params.categoryId, params.minPrice, params.maxPrice, params.durationMin, params.clinicId]
  );

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
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/service/[id]', params: { id: item._id } })}
    >
      <Image
        source={{ uri: item.serviceImage || DEFAULT_IMAGE }}
        style={styles.cardImage}
      />
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          <SaveServiceStar service={item} size={20} />
        </View>
        {item.categoryName ? (
          <Text style={styles.cardCategory}>{item.categoryName}</Text>
        ) : null}
        <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.searchServices}</Text>
      </View>
        {loading && services.length === 0 ? (
          <View style={styles.skeletonList}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} style={styles.card}>
                <Skeleton width={88} height={88} borderRadius={14} />
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
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : services.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.noResults}>{t.noResultsFound}</Text>
          </View>
        ) : (
          <FlatList
            data={services}
            renderItem={renderItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.3}
            ListFooterComponent={loading && services.length > 0 ? <ActivityIndicator style={{ padding: 16 }} color="#8b5cf6" /> : null}
          />
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginLeft: 8 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  skeletonList: { padding: 20, paddingBottom: 40 },
  errorText: { color: '#f87171', fontSize: 14 },
  noResults: { color: '#a1a1aa', fontSize: 14 },
  listContent: { padding: 20, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#18181b',
    borderRadius: 20,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  cardImage: { width: 88, height: 88, borderRadius: 14, backgroundColor: '#27272a' },
  cardBody: { flex: 1, marginLeft: 14, justifyContent: 'space-between' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitle: { color: '#ffffff', fontSize: 16, fontWeight: '600', flex: 1 },
  cardCategory: { color: '#a1a1aa', fontSize: 12, marginTop: 4 },
  cardPrice: { color: '#a78bfa', fontSize: 14, fontWeight: '600', marginTop: 4 },
});
