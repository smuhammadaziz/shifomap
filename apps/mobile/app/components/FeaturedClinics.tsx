import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth-store';
import { useSavedServicesStore, type SavedServiceItem } from '../../store/saved-services-store';
import { getTranslations } from '../../lib/translations';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1576091160399-112ba8e25d1d?w=200&h=200&fit=crop';

function formatPrice(price: SavedServiceItem['price']): string {
  if (price.amount != null) return `${price.amount.toLocaleString()} ${price.currency}`;
  if (price.minAmount != null && price.maxAmount != null) {
    return `${price.minAmount.toLocaleString()} – ${price.maxAmount.toLocaleString()} ${price.currency}`;
  }
  return price.currency;
}

const FeaturedClinics = () => {
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const t = getTranslations(language);
  const { items: savedServices, removeService } = useSavedServicesStore();

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>{t.savedServices}</Text>
      </View>

      {savedServices.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="star-outline" size={40} color="#3f3f46" />
          <Text style={styles.emptyTitle}>{t.noSavedServices}</Text>
          <Text style={styles.emptyHint}>{t.noSavedServicesHint}</Text>
        </View>
      ) : (
        savedServices.map((service) => (
          <TouchableOpacity
            key={service._id}
            style={styles.clinicCard}
            activeOpacity={0.8}
            onPress={() => router.push({ pathname: '/service/[id]', params: { id: service._id } })}
          >
            <Image
              source={{ uri: service.serviceImage || DEFAULT_IMAGE }}
              style={styles.clinicImage}
            />
            <View style={styles.cardContent}>
              <View style={styles.titleRow}>
                <Text style={styles.clinicName} numberOfLines={2}>{service.title}</Text>
                <TouchableOpacity
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  onPress={(e) => {
                    e.stopPropagation();
                    removeService(service._id);
                  }}
                  style={styles.starBtn}
                >
                  <Ionicons name="star" size={22} color="#facc15" />
                </TouchableOpacity>
              </View>
              {service.categoryName ? (
                <Text style={styles.clinicDescription}>{service.categoryName}</Text>
              ) : null}
              <View style={styles.footerRow}>
                <View style={styles.priceTag}>
                  <Text style={styles.priceText}>{formatPrice(service.price)}</Text>
                </View>
                <Text style={styles.distanceText} numberOfLines={1}>{service.clinicDisplayName}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: { marginTop: 24, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { color: '#a1a1aa', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },

  emptyState: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  emptyTitle: { color: '#a1a1aa', fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptyHint: { color: '#71717a', fontSize: 13, marginTop: 6, textAlign: 'center' },

  clinicCard: {
    flexDirection: 'row',
    backgroundColor: '#18181b',
    borderRadius: 20,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  clinicImage: { width: 90, height: 90, borderRadius: 16, backgroundColor: '#27272a' },
  cardContent: { flex: 1, marginLeft: 12, justifyContent: 'space-between' },

  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  clinicName: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 8 },
  starBtn: { padding: 4 },

  clinicDescription: { color: '#a1a1aa', fontSize: 12, marginTop: 4, lineHeight: 18 },

  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  priceTag: { backgroundColor: '#3b0764', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  priceText: { color: '#d8b4fe', fontSize: 12, fontWeight: '600' },
  distanceText: { color: '#a1a1aa', fontSize: 12, marginLeft: 4, flex: 1 },
});

export default FeaturedClinics;
