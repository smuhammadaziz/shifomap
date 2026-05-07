import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getTokens } from '../../lib/design';
import { getPublicDiscounts, type PublicDiscountItem } from '../../lib/api';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&q=80';

type Props = {
  theme: 'light' | 'dark';
  language: string;
  city?: string;
};

export default function DiscountsSlider({ theme, language, city }: Props) {
  const router = useRouter();
  const tokens = getTokens(theme);
  const [items, setItems] = useState<PublicDiscountItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPublicDiscounts({ city, limit: 12 })
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [city]);

  if (loading) {
    return (
      <View style={{ paddingHorizontal: 20, marginTop: 16, alignItems: 'center' }}>
        <ActivityIndicator color={tokens.brand.iris} />
      </View>
    );
  }
  if (!items.length) return null;

  const isUz = language === 'uz';

  return (
    <View style={{ marginTop: 18 }}>
      <View style={[styles.head, { paddingHorizontal: 20 }]}>
        <Text style={[tokens.type.titleLg, { color: tokens.colors.text }]}>
          {isUz ? 'Chegirmalar' : 'Скидки'}
        </Text>
      </View>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(it) => it._id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 10, gap: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.88}
            style={[
              styles.card,
              { backgroundColor: tokens.colors.backgroundCard, borderColor: tokens.colors.border },
            ]}
            onPress={() => router.push({ pathname: '/service/[id]', params: { id: item.serviceId } })}
          >
            <Image
              source={{ uri: item.posterUrl || FALLBACK_IMG }}
              style={styles.img}
            />
            <View style={styles.pill}>
              <Text style={styles.pillText}>−{item.percentOff}%</Text>
            </View>
            <View style={styles.body}>
              <Text style={{ color: tokens.colors.text, fontWeight: '800', fontSize: 14 }} numberOfLines={2}>
                {item.title || item.serviceTitle}
              </Text>
              <Text style={{ color: tokens.colors.textSecondary, fontSize: 12, marginTop: 4 }} numberOfLines={1}>
                {item.clinicName}
              </Text>
              <Text style={{ color: tokens.brand.iris, fontWeight: '800', fontSize: 13, marginTop: 6 }}>
                {item.discountedAmount.toLocaleString()} {item.currency}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { marginBottom: 4 },
  card: {
    width: 168,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  img: { width: '100%', height: 100, backgroundColor: '#e5e7eb' },
  pill: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(220,38,38,0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  body: { padding: 10 },
});
