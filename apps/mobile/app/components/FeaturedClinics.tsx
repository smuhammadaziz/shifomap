import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { useSavedServicesStore, type SavedServiceItem } from '../../store/saved-services-store';
import { getTranslations } from '../../lib/translations';
import { getColors } from '../../lib/theme';
import { getTokens } from '../../lib/design';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1576091160399-112ba8e25d1d?w=240&h=240&fit=crop';

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
  const tokens = getTokens(theme);
  const { items: savedServices, removeService } = useSavedServicesStore();

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.savedServices}</Text>
        {savedServices.length > 0 ? (
          <TouchableOpacity hitSlop={12} onPress={() => router.push('/services-results?saved=1' as never)}>
            <Text style={{ color: tokens.brand.iris, fontWeight: '700', fontSize: 13 }}>
              {language === 'ru' ? 'Все' : "Barchasi"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {savedServices.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primaryBg }]}>
            <Ionicons name="bookmark-outline" size={24} color={tokens.brand.iris} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t.noSavedServices}</Text>
          <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>{t.noSavedServicesHint}</Text>
        </View>
      ) : (
        savedServices.map((service) => (
          <TouchableOpacity
            key={service._id}
            style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
            activeOpacity={0.9}
            onPress={() => router.push({ pathname: '/service/[id]', params: { id: service._id } })}
          >
            {/* Left accent strip */}
            <LinearGradient
              colors={[tokens.brand.iris, tokens.brand.lilac]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.accent}
            />

            {/* Image with saved badge */}
            <View style={styles.imageWrap}>
              <Image
                source={{ uri: service.serviceImage || DEFAULT_IMAGE }}
                style={[styles.image, { backgroundColor: colors.border }]}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.45)']}
                style={styles.imageOverlay}
                pointerEvents="none"
              />
              <View style={[styles.savedBadge, { backgroundColor: tokens.brand.amber }]}>
                <Ionicons name="bookmark" size={11} color="#fff" />
              </View>
            </View>

            {/* Content */}
            <View style={styles.body}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  {service.categoryName ? (
                    <Text
                      style={[styles.kicker, { color: tokens.brand.iris }]}
                      numberOfLines={1}
                    >
                      {service.categoryName}
                    </Text>
                  ) : null}
                  <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                    {service.title}
                  </Text>
                </View>
                <TouchableOpacity
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={(e) => {
                    e.stopPropagation();
                    removeService(service._id);
                  }}
                  style={[styles.removeBtn, { backgroundColor: colors.backgroundSecondary }]}
                >
                  <Ionicons name="close" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.metaRow}>
                <LinearGradient
                  colors={[tokens.brand.iris, tokens.brand.lilac]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.priceChip}
                >
                  <Ionicons name="cash-outline" size={12} color="#fff" />
                  <Text style={styles.priceText} numberOfLines={1}>
                    {formatPrice(service.price)}
                  </Text>
                </LinearGradient>
              </View>

              <View style={styles.clinicRow}>
                <Ionicons name="business-outline" size={12} color={colors.textTertiary} />
                <Text style={[styles.clinicName, { color: colors.textSecondary }]} numberOfLines={1}>
                  {service.clinicDisplayName}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: { marginTop: 26, paddingHorizontal: 20 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800' },

  emptyState: {
    borderRadius: 20,
    paddingVertical: 26,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginTop: 12 },
  emptyHint: { fontSize: 12, marginTop: 4, textAlign: 'center', lineHeight: 18 },

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
  accent: {
    position: 'absolute',
    top: 14,
    bottom: 14,
    left: 0,
    width: 3,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  imageWrap: {
    width: 84,
    height: 84,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  imageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  savedBadge: {
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

  body: { flex: 1, marginLeft: 14, gap: 8, minWidth: 0 },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  title: { fontSize: 15, fontWeight: '700', lineHeight: 20 },

  removeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  metaRow: { flexDirection: 'row', alignItems: 'center' },
  priceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  priceText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  clinicRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  clinicName: { fontSize: 12, fontWeight: '500', flexShrink: 1 },
});

export default FeaturedClinics;
