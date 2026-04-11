import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  FlatList,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';

import { useThemeStore } from '../store/theme-store';
import { useAuthStore } from '../store/auth-store';
import { getTranslations } from '../lib/translations';
import { getColors } from '../lib/theme';
import { getClinicsList, type ClinicListItem } from '../lib/api';

const DEFAULT_CLINIC_COVER = 'https://www.shutterstock.com/image-photo/medical-coverage-insurance-concept-hands-260nw-1450246616.jpg';

type ViewMode = 'map' | 'list';

export default function ClinicsMapScreen() {
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const language = useAuthStore((s) => s.language);
  const t = getTranslations(language);
  const colors = getColors(theme);
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<ViewMode>('map');
  const [clinics, setClinics] = useState<ClinicListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarker, setSelectedMarker] = useState<any>(null);

  useEffect(() => {
    // Fetch all clinics
    getClinicsList(200)
      .then((data) => {
        setClinics(data);
      })
      .catch((err) => {
        Alert.alert('Error', 'Failed to load clinics');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Compute marker data from clinics branches
  const markersData = useMemo(() => {
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

  const mapHtml = useMemo(() => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <script src="https://api-maps.yandex.ru/2.1/?lang=ru_RU" type="text/javascript"></script>
          <style>
              body, html { padding: 0; margin: 0; width: 100%; height: 100%; overflow: hidden; background-color: ${colors.background}; }
              #map { width: 100%; height: 100%; }
          </style>
      </head>
      <body>
          <div id="map"></div>
          <script>
              ymaps.ready(init);
              function init() {
                  var map = new ymaps.Map("map", {
                      center: [41.311081, 69.240562], // Tashkent center
                      zoom: 12,
                      controls: ['zoomControl', 'fullscreenControl']
                  });
                  
                  var markers = ${JSON.stringify(markersData)};
                  
                  if (markers.length > 0) {
                      var bounds = [];
                      markers.forEach(function(m) {
                          bounds.push([m.lat, m.lng]);
                          var pm = new ymaps.Placemark([m.lat, m.lng], {
                              hintContent: m.clinicDisplayName
                          }, {
                              preset: 'islands#pinkDotIcon' // Pink icon to match screenshot
                          });
                          
                          pm.events.add('click', function(e) {
                              window.ReactNativeWebView.postMessage(JSON.stringify(m));
                          });
                          
                          map.geoObjects.add(pm);
                      });
                      
                      if(bounds.length > 1) {
                        try {
                          map.setBounds(map.geoObjects.getBounds(), { checkZoomRange: true, zoomMargin: 30 });
                        } catch(e) {}
                      } else if (bounds.length === 1) {
                          map.setCenter(bounds[0], 15);
                      }
                  }
              }
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

  const renderClinicListItem = ({ item: c }: { item: ClinicListItem }) => {
    const coverUri = c.coverUrl || c.logoUrl || DEFAULT_CLINIC_COVER;
    const catNames = (c.categories || []).map(cat => typeof cat === 'string' ? cat : cat.name);
    const tagline = catNames.length ? catNames.slice(0, 2).join(' · ') + (catNames.length > 2 ? ' ...' : '') : (c.descriptionShort || '').slice(0, 50);
    
    return (
      <TouchableOpacity
        style={[styles.listCard, { backgroundColor: colors.backgroundCard, borderBottomColor: colors.border }]}
        activeOpacity={0.8}
        onPress={() => router.push({ pathname: '/clinic/[id]', params: { id: c.id } })}
      >
        <Image source={{ uri: coverUri }} style={[styles.listCardImage, { backgroundColor: colors.border }]} />
        <View style={styles.listCardInfo}>
          <Text style={[styles.listCardTitle, { color: colors.text }]} numberOfLines={1}>{c.clinicDisplayName}</Text>
          {tagline ? <Text style={[styles.listCardTagline, { color: colors.textSecondary }]} numberOfLines={1}>{tagline}</Text> : null}
          
          <View style={styles.listCardMeta}>
             <View style={[styles.badge, { backgroundColor: colors.primaryBg }]}>
               <Text style={[styles.badgeText, { color: colors.primaryLight }]}>
                 {(t.nServices || '{{n}} xizmat').replace('{{n}}', String(c.servicesCount))}
               </Text>
             </View>
             {c.rating?.count > 0 && (
               <View style={styles.ratingBox}>
                 <Ionicons name="star" size={14} color="#facc15" />
                 <Text style={[styles.ratingText, { color: colors.text }]}>{c.rating.avg.toFixed(1)}</Text>
               </View>
             )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header with Switcher */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={[styles.switcher, { backgroundColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.switchBtn, mode === 'map' && [styles.switchBtnActive, { backgroundColor: colors.primary }]]}
            onPress={() => setMode('map')}
            activeOpacity={0.8}
          >
            <Text style={[styles.switchBtnText, { color: mode === 'map' ? '#fff' : colors.textSecondary }]}>
              {t.map || 'Map'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.switchBtn, mode === 'list' && [styles.switchBtnActive, { backgroundColor: colors.primary }]]}
            onPress={() => setMode('list')}
            activeOpacity={0.8}
          >
            <Text style={[styles.switchBtnText, { color: mode === 'list' ? '#fff' : colors.textSecondary }]}>
              {t.list || 'List'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {loading && (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {!loading && (
          <View 
            style={[styles.mapContainer, mode === 'list' && styles.hidden]}
            pointerEvents={mode === 'list' ? 'none' : 'auto'}
          >
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
          {selectedMarker && mode === 'map' && (
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
               <TouchableOpacity
                  style={[styles.popupBtn, { backgroundColor: colors.primary }]}
                  activeOpacity={0.8}
                  onPress={() => router.push({ pathname: '/clinic/[id]', params: { id: selectedMarker.clinicId } })}
               >
                  <Text style={styles.popupBtnText}>{t.seeServices || 'See Services'}</Text>
               </TouchableOpacity>
               <TouchableOpacity
                  style={[styles.popupBtn, { backgroundColor: '#34C759', marginTop: 8 }]}
                  activeOpacity={0.8}
                  onPress={() => {
                    const lat = selectedMarker.lat;
                    const lng = selectedMarker.lng;
                    const yandexAppUrl = `yandexnavi://build_route_on_map?lat_to=${lat}&lon_to=${lng}`;
                    const yandexWebUrl = `https://yandex.uz/maps/?rtext=~${lat},${lng}&rtt=auto`;
                    Linking.canOpenURL(yandexAppUrl)
                      .then((supported) => {
                        if (supported) {
                          Linking.openURL(yandexAppUrl);
                        } else {
                          Linking.openURL(yandexWebUrl);
                        }
                      })
                      .catch(() => Linking.openURL(yandexWebUrl));
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

        {!loading && mode === 'list' && (
          <FlatList
            data={clinics}
            keyExtractor={(item) => item.id}
            renderItem={renderClinicListItem}
            contentContainerStyle={[styles.listScroll, { paddingBottom: Math.max(insets.bottom, 20) + 12 }]}
            showsVerticalScrollIndicator={false}
          />
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
  switcher: {
    flexDirection: 'row',
    width: 200,
    height: 36,
    borderRadius: 18,
    padding: 2,
  },
  switchBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  switchBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  switchBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: { flex: 1 },
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
  
  listScroll: { padding: 20 },
  listCard: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listCardImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginRight: 16,
  },
  listCardInfo: { flex: 1, justifyContent: 'center' },
  listCardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  listCardTagline: { fontSize: 13, marginBottom: 10 },
  listCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  ratingBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 13, fontWeight: '600' },
  hidden: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, zIndex: -1 },
});
