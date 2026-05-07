import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';

import { useThemeStore } from '../store/theme-store';
import { useAuthStore } from '../store/auth-store';
import { getTranslations } from '../lib/translations';
import { getColors } from '../lib/theme';
import { getClinicsList, getNearestPharmacies, type ClinicListItem, type PublicPharmacyItem } from '../lib/api';

const DEFAULT_CLINIC_COVER = 'https://www.shutterstock.com/image-photo/medical-coverage-insurance-concept-hands-260nw-1450246616.jpg';

type EntityTab = 'clinic' | 'pharmacy';

export default function ClinicsMapScreen() {
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const language = useAuthStore((s) => s.language);
  const t = getTranslations(language);
  const colors = getColors(theme);
  const insets = useSafeAreaInsets();

  const [entity, setEntity] = useState<EntityTab>('clinic');
  const [clinics, setClinics] = useState<ClinicListItem[]>([]);
  const [pharmacies, setPharmacies] = useState<PublicPharmacyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarker, setSelectedMarker] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const clinicsData = await getClinicsList(200).catch(() => []);
        if (mounted) setClinics(clinicsData);
        const p = await Location.requestForegroundPermissionsAsync();
        if (p.status !== 'granted') {
          if (mounted) {
            setPharmacies([]);
          }
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const rows = await getNearestPharmacies({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          limit: 30,
        }).catch(() => []);
        if (mounted) setPharmacies(rows);
      } catch {
        if (mounted) {
          setClinics([]);
          setPharmacies([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Compute marker data from clinics branches
  const clinicMarkersData = useMemo(() => {
    const list: any[] = [];
    clinics.forEach((c) => {
      (c.branches || []).forEach((b) => {
        if (b.address?.geo?.lat && b.address?.geo?.lng) {
          list.push({
            clinicId: c.id,
            clinicDisplayName: c.clinicDisplayName,
            branchName: b.name,
            lat: b.address.geo.lat,
            lng: b.address.geo.lng,
            coverUrl: c.coverUrl || c.logoUrl || DEFAULT_CLINIC_COVER,
            ratingAvg: c.rating?.avg || 0,
            ratingCount: c.rating?.count || 0,
            categories: c.categories || [],
            servicesCount: c.servicesCount || 0,
          });
        }
      });
    });
    return list;
  }, [clinics]);

  const pharmacyMarkersData = useMemo(
    () =>
      pharmacies.map((p) => ({
        id: p.id,
        clinicId: p.id,
        clinicDisplayName: p.name,
        branchName: [p.city, p.street].filter(Boolean).join(', '),
        lat: p.lat,
        lng: p.lng,
        coverUrl: p.photoUrl || DEFAULT_CLINIC_COVER,
        ratingAvg: 0,
        ratingCount: 0,
        categories: [],
        servicesCount: 0,
        isPharmacy: true,
      })),
    [pharmacies],
  );

  const markersData = entity === 'clinic' ? clinicMarkersData : pharmacyMarkersData;

  const mapHtml = useMemo(() => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link
            rel="stylesheet"
            href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
            integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
            crossorigin=""
          />
          <script
            src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
            integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
            crossorigin=""
          ></script>
          <style>
              body, html { padding: 0; margin: 0; width: 100%; height: 100%; overflow: hidden; background-color: ${colors.background}; }
              #map { width: 100%; height: 100%; }
              .leaflet-control-attribution { font-size: 10px; }
          </style>
      </head>
      <body>
          <div id="map"></div>
          <script>
              function init() {
                  var map = L.map("map", {
                    zoomControl: true,
                    attributionControl: true,
                    preferCanvas: true,
                  }).setView([41.311081, 69.240562], 12);

                  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    minZoom: 4,
                    attribution: '&copy; OpenStreetMap contributors'
                  }).addTo(map);

                  var markerIcon = L.divIcon({
                    className: 'clinic-pin',
                    html: '<div style="width:14px;height:14px;border-radius:999px;background:#ec4899;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>',
                    iconSize: [14, 14],
                    iconAnchor: [7, 7],
                  });

                  var markers = ${JSON.stringify(markersData)};
                  var bounds = [];

                  if (markers.length > 0) {
                    markers.forEach(function(m) {
                      bounds.push([m.lat, m.lng]);
                      var marker = L.marker([m.lat, m.lng], { icon: markerIcon }).addTo(map);
                      marker.bindTooltip(m.clinicDisplayName, { direction: 'top', offset: [0, -8], opacity: 0.9 });
                      marker.on('click', function() {
                        window.ReactNativeWebView.postMessage(JSON.stringify(m));
                      });
                    });

                    if (bounds.length > 1) {
                      map.fitBounds(bounds, { padding: [26, 26], maxZoom: 15 });
                    } else if (bounds.length === 1) {
                      map.setView(bounds[0], 15);
                    }
                  }

                  setTimeout(function() {
                    map.invalidateSize();
                  }, 120);
              }
              init();
          </script>
      </body>
      </html>
    `;
  }, [markersData, colors.background]);

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      setSelectedMarker(data);
    } catch (e) {
      console.log('Error parsing map message', e);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {language === 'uz' ? 'Xarita' : language === 'ru' ? 'Карта' : 'Map'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.entityTabWrap}>
        <View style={[styles.entityTabRow, { backgroundColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.entityTabBtn, entity === 'clinic' && [styles.entityTabBtnActive, { backgroundColor: colors.primary }]]}
            onPress={() => {
              setEntity('clinic');
              setSelectedMarker(null);
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.switchBtnText, { color: entity === 'clinic' ? '#fff' : colors.textSecondary }]}>
              {language === 'uz' ? 'Klinika' : 'Клиники'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.entityTabBtn, entity === 'pharmacy' && [styles.entityTabBtnActive, { backgroundColor: colors.primary }]]}
            onPress={() => {
              setEntity('pharmacy');
              setSelectedMarker(null);
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.switchBtnText, { color: entity === 'pharmacy' ? '#fff' : colors.textSecondary }]}>
              {language === 'uz' ? 'Apteka' : 'Аптеки'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {loading && (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {!loading && (
          <View style={styles.mapContainer}>
            <WebView
            source={{ html: mapHtml }}
            style={styles.webview}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            bounces={false}
            scrollEnabled={false}
            originWhitelist={['*']}
            cacheEnabled={true}
            cacheMode="LOAD_CACHE_ELSE_NETWORK"
            renderToHardwareTextureAndroid={true}
          />
          
          {/* Popup over Map */}
          {selectedMarker && (
            <View style={[styles.popupWrap, { backgroundColor: colors.backgroundCard, borderColor: colors.border, bottom: Math.max(insets.bottom, 20) + 4 }]}>
               <View style={styles.popupHeader}>
                  <Image source={{ uri: selectedMarker.coverUrl }} style={styles.popupImage} />
                  <View style={styles.popupInfo}>
                     <Text style={[styles.popupTitle, { color: colors.text }]} numberOfLines={1}>
                       {selectedMarker.clinicDisplayName}
                     </Text>
                     <Text style={[styles.popupSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                       {selectedMarker.branchName}
                     </Text>
                     <View style={styles.popupMeta}>
                      {selectedMarker.ratingCount > 0 ? (
                          <View style={styles.ratingBox}>
                            <Ionicons name="star" size={14} color="#facc15" />
                            <Text style={[styles.ratingText, { color: colors.text }]}>{selectedMarker.ratingAvg.toFixed(1)}</Text>
                          </View>
                        ) : null}
                        <Text style={[styles.popupServices, { color: colors.textTertiary }]}>
                          {(t.nServices || '{{n}} xizmat').replace('{{n}}', String(selectedMarker.servicesCount))}
                        </Text>
                     </View>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedMarker(null)} hitSlop={12}>
                    <Ionicons name="close" size={24} color={colors.textTertiary} />
                  </TouchableOpacity>
               </View>
               {!selectedMarker.isPharmacy ? (
                 <TouchableOpacity
                    style={[styles.popupBtn, { backgroundColor: colors.primary }]}
                    activeOpacity={0.8}
                    onPress={() => router.push({ pathname: '/clinic/[id]', params: { id: selectedMarker.clinicId } })}
                 >
                    <Text style={styles.popupBtnText}>{t.seeServices || 'See Services'}</Text>
                 </TouchableOpacity>
               ) : null}
               <TouchableOpacity
                  style={[styles.popupBtn, { backgroundColor: '#34C759', marginTop: 8 }]}
                  activeOpacity={0.8}
                  onPress={() => {
                    const lat = selectedMarker.lat;
                    const lng = selectedMarker.lng;
                    const yandexUrl = `https://yandex.uz/maps/?rtext=~${lat},${lng}&rtt=auto`;
                    const googleMapsAppUrl = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
                    const appleMapsUrl = `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
                    const webMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
                    Linking.canOpenURL(googleMapsAppUrl)
                      .then((supported) => {
                        if (supported) {
                          Linking.openURL(yandexUrl).catch(() => Linking.openURL(googleMapsAppUrl));
                        } else if (Platform.OS === 'ios') {
                          Linking.openURL(appleMapsUrl);
                        } else {
                          Linking.openURL(webMapsUrl);
                        }
                      })
                      .catch(() => Linking.openURL(webMapsUrl));
                  }}
               >
                  <View style={styles.directionsBtnContent}>
                    <Ionicons name="navigate" size={18} color="#fff" />
                    <Text style={styles.popupBtnText}>
                      {language === 'uz' ? 'Yo\'nalish olish' : 'Построить маршрут'}
                    </Text>
                  </View>
               </TouchableOpacity>
            </View>
          )}
        </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  switchBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: { flex: 1 },
  entityTabWrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 2 },
  entityTabRow: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 2,
    height: 36,
  },
  entityTabBtn: {
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entityTabBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mapContainer: { flex: 1, position: 'relative' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  
  popupWrap: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  popupHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  popupImage: { width: 48, height: 48, borderRadius: 12, marginRight: 12 },
  popupInfo: { flex: 1 },
  popupTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  popupSubtitle: { fontSize: 13, marginBottom: 6 },
  popupMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  popupServices: { fontSize: 12 },
  popupBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  popupBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  directionsBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  ratingBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 13, fontWeight: '600' },
});
