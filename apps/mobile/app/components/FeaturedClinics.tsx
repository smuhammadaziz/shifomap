import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth-store';
import { getTranslations } from '../../lib/translations';

const featuredClinics = [
  {
    name: 'Prime Health Center',
    distanceKey: '1.2',
    description: 'Top-tier cardiology and general diagnostics with expert staff.',
    rating: 4.9,
    price: '$80 - $150',
    image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=400',
  },
  {
    name: 'Visionary Dental',
    distanceKey: '3.5',
    description: 'Specialized orthodontic treatments and emergency care.',
    rating: 4.7,
    price: '$45 - $200',
    image: 'https://images.unsplash.com/photo-1516549655169-df83a0833360?auto=format&fit=crop&q=80&w=400',
  },
];

const FeaturedClinics = () => {
  const language = useAuthStore((s) => s.language);
  const t = getTranslations(language);
  return (
    <View style={styles.sectionContainer}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>{t.featuredClinics}</Text>
        <TouchableOpacity>
          <Text style={styles.viewAll}>{t.viewAll}</Text>
        </TouchableOpacity>
      </View>

            {featuredClinics.map((clinic, index) => (
                <View key={index} style={styles.clinicCard}>
                    <Image source={{ uri: clinic.image }} style={styles.clinicImage} />
                    <View style={styles.cardContent}>
                        <View style={styles.titleRow}>
                            <Text style={styles.clinicName}>{clinic.name}</Text>
                            <View style={styles.ratingContainer}>
                                <Ionicons name="star" size={14} color="#facc15" />
                                <Text style={styles.ratingText}>{clinic.rating}</Text>
                            </View>
                        </View>
                        <Text style={styles.clinicDescription}>{clinic.description}</Text>
                        <View style={styles.footerRow}>
                            <View style={styles.priceTag}>
                                <Text style={styles.priceText}>{clinic.price}</Text>
                            </View>
                            <View style={styles.distanceRow}>
                              <Ionicons name="location-outline" size={14} color="#a1a1aa" />
                              <Text style={styles.distanceText}>{clinic.distanceKey} {t.kmAway}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    sectionContainer: { marginTop: 24, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    sectionTitle: { color: '#a1a1aa', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
    viewAll: { color: '#8b5cf6', fontSize: 14, fontWeight: '600' },

    clinicCard: { flexDirection: 'row', backgroundColor: '#18181b', borderRadius: 20, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#27272a' },
    clinicImage: { width: 90, height: 90, borderRadius: 16, backgroundColor: '#27272a' },
    cardContent: { flex: 1, marginLeft: 12, justifyContent: 'space-between' },

    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    clinicName: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 8 },
    ratingContainer: { flexDirection: 'row', alignItems: 'center' },
    ratingText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold', marginLeft: 4 },

    clinicDescription: { color: '#a1a1aa', fontSize: 12, marginTop: 4, lineHeight: 18 },

    footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    priceTag: { backgroundColor: '#3b0764', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    priceText: { color: '#d8b4fe', fontSize: 12, fontWeight: '600' },
    distanceRow: { flexDirection: 'row', alignItems: 'center' },
    distanceText: { color: '#a1a1aa', fontSize: 12, marginLeft: 4 },
});

export default FeaturedClinics;
