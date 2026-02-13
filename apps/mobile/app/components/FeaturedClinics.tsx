import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { useSavedServicesStore, type SavedServiceItem } from '../../store/saved-services-store';
import { getTranslations } from '../../lib/translations';
import { getColors } from '../../lib/theme';

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
  const theme = useThemeStore((s) => s.theme);
  const t = getTranslations(language);
  const colors = getColors(theme);
  const { items: savedServices, removeService } = useSavedServicesStore();

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t.savedServices}</Text>
      </View>

      {savedServices.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          <Ionicons name="star-outline" size={40} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>{t.noSavedServices}</Text>
          <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>{t.noSavedServicesHint}</Text>
        </View>
      ) : (
        savedServices.map((service) => (
          <TouchableOpacity
            key={service._id}
            style={[styles.clinicCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
            activeOpacity={0.8}
            onPress={() => router.push({ pathname: '/service/[id]', params: { id: service._id } })}
          >
            <Image
              source={{ uri: service.serviceImage || DEFAULT_IMAGE }}
              style={[styles.clinicImage, { backgroundColor: colors.border }]}
            />
            <View style={styles.cardContent}>
              <View style={styles.titleRow}>
                <Text style={[styles.clinicName, { color: colors.text }]} numberOfLines={2}>{service.title}</Text>
                <TouchableOpacity
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  onPress={(e) => {
                    e.stopPropagation();
                    removeService(service._id);
                  }}
                  style={styles.starBtn}
                >
                  <Ionicons name="star" size={22} color={colors.warning} />
                </TouchableOpacity>
              </View>
              {service.categoryName ? (
                <Text style={[styles.clinicDescription, { color: colors.textSecondary }]}>{service.categoryName}</Text>
              ) : null}
              <View style={styles.footerRow}>
                <View style={[styles.priceTag, { backgroundColor: colors.primaryBg }]}>
                  <Text style={[styles.priceText, { color: colors.primaryLight }]}>{formatPrice(service.price)}</Text>
                </View>
                <Text style={[styles.distanceText, { color: colors.textSecondary }]} numberOfLines={1}>{service.clinicDisplayName}</Text>
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
  sectionTitle: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },

  emptyState: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptyHint: { fontSize: 13, marginTop: 6, textAlign: 'center' },

  clinicCard: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  clinicImage: { width: 90, height: 90, borderRadius: 16 },
  cardContent: { flex: 1, marginLeft: 12, justifyContent: 'space-between' },

  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  clinicName: { fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 8 },
  starBtn: { padding: 4 },

  clinicDescription: { fontSize: 12, marginTop: 4, lineHeight: 18 },

  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  priceTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  priceText: { fontSize: 12, fontWeight: '600' },
  distanceText: { fontSize: 12, marginLeft: 4, flex: 1 },
});

export default FeaturedClinics;
