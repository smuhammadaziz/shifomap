import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getClinicServices, type PublicServiceItem } from '../../lib/api';
import { useAuthStore } from '../../store/auth-store';
import { getTranslations } from '../../lib/translations';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1576091160399-112ba8e25d1d?w=200&h=200&fit=crop';

function formatPrice(price: PublicServiceItem['price']): string {
  if (price.amount != null) return `${price.amount.toLocaleString()} ${price.currency}`;
  if (price.minAmount != null && price.maxAmount != null) {
    return `${price.minAmount.toLocaleString()} – ${price.maxAmount.toLocaleString()} ${price.currency}`;
  }
  return price.currency;
}

export default function ClinicServicesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const t = getTranslations(language);
  const [services, setServices] = useState<PublicServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getClinicServices(id)
      .then(setServices)
      .catch(() => setError('Failed'))
      .finally(() => setLoading(false));
  }, [id]);

  const renderItem = ({ item }: { item: PublicServiceItem }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/service/[id]', params: { id: item._id } })}
    >
      <Image source={{ uri: item.serviceImage || DEFAULT_IMAGE }} style={styles.cardImage} />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        {item.categoryName ? <Text style={styles.cardCategory}>{item.categoryName}</Text> : null}
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
        <Text style={styles.headerTitle} numberOfLines={1}>{t.viewClinicServices}</Text>
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{t.noResultsFound}</Text>
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
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginLeft: 8, flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#f87171' },
  noResults: { color: '#a1a1aa' },
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
  cardTitle: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  cardCategory: { color: '#a1a1aa', fontSize: 12, marginTop: 4 },
  cardPrice: { color: '#a78bfa', fontSize: 14, fontWeight: '600', marginTop: 4 },
});
