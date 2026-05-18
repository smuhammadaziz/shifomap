import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
  TextInput,
  FlatList,
  Keyboard,
} from 'react-native';
import { Asset } from 'expo-asset';
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

const CLINIC_MARKER = require('../assets/map-marker-clinic.webp');
const PHARMACY_MARKER = require('../assets/map-marker-pharmacy.webp');

/** Light, clean tiles — fast CDN, less visual noise than default OSM. */
const MAP_TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

const MARKER_W = 56;
const MARKER_H = 64;

type MapMarker = {
  id: string;
  clinicId: string;
  clinicDisplayName: string;
  branchName: string;
  lat: number;
  lng: number;
  coverUrl: string;
  ratingAvg: number;
  ratingCount: number;
  servicesCount: number;
  isPharmacy?: boolean;
};

let cachedClinicIcon = '';
let cachedPharmacyIcon = '';

async function markerToDataUrl(moduleId: number): Promise<string> {
  const asset = Asset.fromModule(moduleId);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  const res = await fetch(uri);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const mime = uri.toLowerCase().includes('.webp') ? 'image/webp' : 'image/png';
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 =
    typeof globalThis.btoa === 'function' ? globalThis.btoa(binary) : uint8ToBase64(bytes);
  return `data:${mime};base64,${base64}`;
}

function uint8ToBase64(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    out += chars[a >> 2];
    out += chars[((a & 3) << 4) | (b >> 4)];
    out += i + 1 < bytes.length ? chars[((b & 15) << 2) | (c >> 6)] : '=';
    out += i + 2 < bytes.length ? chars[c & 63] : '=';
  }
  return out;
}

function pinColor(entity: 'clinic' | 'pharmacy') {
  return entity === 'clinic' ? '#f97316' : '#0ea5e9';
}

type EntityTab = 'clinic' | 'pharmacy';

export default function ClinicsMapScreen() {
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const language = useAuthStore((s) => s.language) ?? 'uz';
  const t = getTranslations(language);
  const colors = getColors(theme);
  const insets = useSafeAreaInsets();

  const [entity, setEntity] = useState<EntityTab>('clinic');
  const [clinics, setClinics] = useState<ClinicListItem[]>([]);
  const [pharmacies, setPharmacies] = useState<PublicPharmacyItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [iconsReady, setIconsReady] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [clinicMarkerUrl, setClinicMarkerUrl] = useState(cachedClinicIcon);
  const [pharmacyMarkerUrl, setPharmacyMarkerUrl] = useState(cachedPharmacyIcon);
  const mapReadyFailSafeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!cachedClinicIcon || !cachedPharmacyIcon) {
          const [clinic, pharmacy] = await Promise.all([
            markerToDataUrl(CLINIC_MARKER),
            markerToDataUrl(PHARMACY_MARKER),
          ]);
          cachedClinicIcon = clinic;
          cachedPharmacyIcon = pharmacy;
          if (!mounted) return;
          setClinicMarkerUrl(clinic);
          setPharmacyMarkerUrl(pharmacy);
        } else {
          setClinicMarkerUrl(cachedClinicIcon);
          setPharmacyMarkerUrl(cachedPharmacyIcon);
        }
      } finally {
        if (mounted) setIconsReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const clinicsData = await getClinicsList(200).catch(() => []);
        if (mounted) setClinics(clinicsData);
        const p = await Location.requestForegroundPermissionsAsync();
        if (p.status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const rows = await getNearestPharmacies({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            limit: 30,
          }).catch(() => []);
          if (mounted) setPharmacies(rows);
        } else if (mounted) {
          setPharmacies([]);
        }
      } catch {
        if (mounted) {
          setClinics([]);
          setPharmacies([]);
        }
      } finally {
        if (mounted) setDataLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const clinicMarkersData = useMemo(() => {
    const list: MapMarker[] = [];
    clinics.forEach((c) => {
      (c.branches || []).forEach((b) => {
        if (b.address?.geo?.lat && b.address?.geo?.lng) {
          list.push({
            id: `${c.id}:${b.id ?? b.name}`,
            clinicId: c.id,
            clinicDisplayName: c.clinicDisplayName,
            branchName: b.name,
            lat: b.address.geo.lat,
            lng: b.address.geo.lng,
            coverUrl: c.coverUrl || c.logoUrl || DEFAULT_CLINIC_COVER,
            ratingAvg: c.rating?.avg || 0,
            ratingCount: c.rating?.count || 0,
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
        servicesCount: 0,
        isPharmacy: true,
      })),
    [pharmacies],
  );

  const markersData = entity === 'clinic' ? clinicMarkersData : pharmacyMarkersData;
  const activeMarkerUrl = entity === 'clinic' ? clinicMarkerUrl : pharmacyMarkerUrl;
  const pin = pinColor(entity);

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return markersData;
    return markersData.filter(
      (m) =>
        m.clinicDisplayName.toLowerCase().includes(q) ||
        m.branchName.toLowerCase().includes(q),
    );
  }, [markersData, searchQuery]);

  const switchEntity = useCallback((next: EntityTab) => {
    setEntity(next);
    setSelectedMarker(null);
    setSearchQuery('');
    setMapReady(false);
  }, []);

  const mapHtml = useMemo(() => {
    if (!activeMarkerUrl) return '';
    const iconUrlJson = JSON.stringify(activeMarkerUrl);
    const pinJson = JSON.stringify(pin);
    const markersJson = JSON.stringify(markersData);
    const mapBg = theme === 'dark' ? '#18181b' : '#e8eef4';

    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
  <style>
    * { box-sizing: border-box; }
    html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:${mapBg}; }
    #map { width:100%; height:100%; }
    .leaflet-control-attribution { font-size:9px; opacity:0.65; }
    .leaflet-control-zoom { border:none !important; box-shadow:0 2px 10px rgba(15,23,42,0.12) !important; border-radius:12px !important; overflow:hidden; }
    .leaflet-control-zoom a { border:none !important; width:34px !important; height:34px !important; line-height:34px !important; font-size:18px !important; }
    .map-pin-wrap { background:transparent !important; border:none !important; }
    .map-pin {
      width:${MARKER_W}px; height:${MARKER_H}px;
      display:flex; flex-direction:column; align-items:center; justify-content:flex-end;
      filter: drop-shadow(0 4px 10px rgba(15,23,42,0.35));
    }
    .map-pin img {
      width:46px; height:46px; object-fit:contain;
      position:relative; z-index:2; margin-bottom:-6px;
    }
    .map-pin-dot {
      width:14px; height:14px; border-radius:999px;
      border:3px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,0.25);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <script>
    function postReady() {
      try {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
        }
      } catch (e) {}
    }
    function buildPinIcon(iconUrl, dotColor) {
      return L.divIcon({
        className: 'map-pin-wrap',
        html: '<div class="map-pin"><img src="' + iconUrl + '" alt="" /><div class="map-pin-dot" style="background:' + dotColor + '"></div></div>',
        iconSize: [${MARKER_W}, ${MARKER_H}],
        iconAnchor: [${MARKER_W / 2}, ${MARKER_H}],
        tooltipAnchor: [0, -${MARKER_H + 4}],
      });
    }
    function init() {
      if (typeof L === 'undefined') {
        postReady();
        return;
      }
      var map = L.map('map', {
        zoomControl: true,
        attributionControl: true,
        preferCanvas: true,
      }).setView([41.311081, 69.240562], 12);

      L.tileLayer('${MAP_TILES}', {
        maxZoom: 19,
        minZoom: 4,
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxNativeZoom: 19,
      }).addTo(map);

      var iconUrl = ${iconUrlJson};
      var dotColor = ${pinJson};
      var markerIcon = buildPinIcon(iconUrl, dotColor);
      var markers = ${markersJson};
      var bounds = [];

      markers.forEach(function(m) {
        bounds.push([m.lat, m.lng]);
        var mk = L.marker([m.lat, m.lng], { icon: markerIcon }).addTo(map);
        mk.bindTooltip(m.clinicDisplayName, {
          direction: 'top',
          offset: [0, -${MARKER_H + 6}],
          opacity: 0.95,
          className: '',
        });
        mk.on('click', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify(m));
        });
      });

      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 15);
      }

      map.whenReady(function() {
        setTimeout(function() {
          map.invalidateSize();
          postReady();
        }, 80);
      });
    }
    if (typeof L !== 'undefined') {
      init();
    } else {
      var s = document.createElement('script');
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s.onload = init;
      s.onerror = postReady;
      document.body.appendChild(s);
    }
  </script>
</body>
</html>`;
  }, [markersData, activeMarkerUrl, pin, theme]);

  /** Must NOT gate WebView on mapReady — that deadlocks (WebView never mounts → mapReady never fires). */
  const mapCanMount = !dataLoading && iconsReady && Boolean(activeMarkerUrl) && mapHtml.length > 0;
  const showMapBootstrapSpinner = !mapCanMount;
  const showMapLoadingOverlay = mapCanMount && !mapReady;

  useEffect(() => {
    if (!mapCanMount || mapReady) return;
    if (mapReadyFailSafeRef.current) clearTimeout(mapReadyFailSafeRef.current);
    mapReadyFailSafeRef.current = setTimeout(() => {
      mapReadyFailSafeRef.current = null;
      setMapReady(true);
    }, 5000);
    return () => {
      if (mapReadyFailSafeRef.current) {
        clearTimeout(mapReadyFailSafeRef.current);
        mapReadyFailSafeRef.current = null;
      }
    };
  }, [mapCanMount, mapReady, entity, markersData.length]);

  const dismissMapLoading = useCallback(() => {
    if (mapReadyFailSafeRef.current) {
      clearTimeout(mapReadyFailSafeRef.current);
      mapReadyFailSafeRef.current = null;
    }
    setMapReady(true);
  }, []);

  const handleWebViewMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type === 'mapReady') {
        dismissMapLoading();
        return;
      }
      setSelectedMarker(data as MapMarker);
    } catch {
      /* ignore */
    }
  };

  const openDirections = (m: MapMarker) => {
    const { lat, lng } = m;
    const yandexUrl = `https://yandex.uz/maps/?rtext=~${lat},${lng}&rtt=auto`;
    const googleMapsAppUrl = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
    const appleMapsUrl = `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
    const webMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.canOpenURL(googleMapsAppUrl)
      .then((supported) => {
        if (supported) Linking.openURL(yandexUrl).catch(() => Linking.openURL(googleMapsAppUrl));
        else if (Platform.OS === 'ios') Linking.openURL(appleMapsUrl);
        else Linking.openURL(webMapsUrl);
      })
      .catch(() => Linking.openURL(webMapsUrl));
  };

  const renderListItem = ({ item }: { item: MapMarker }) => {
    const active = selectedMarker?.id === item.id;
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          Keyboard.dismiss();
          setSelectedMarker(item);
        }}
        style={[
          styles.listRow,
          {
            backgroundColor: active ? colors.primaryBg : colors.backgroundCard,
            borderColor: active ? colors.primary : colors.borderLight,
          },
        ]}
      >
        <View style={[styles.listIcon, { backgroundColor: active ? colors.primary + '22' : colors.backgroundSecondary }]}>
          <Ionicons
            name={item.isPharmacy ? 'medical' : 'business'}
            size={18}
            color={item.isPharmacy ? '#0ea5e9' : colors.primary}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.listTitle, { color: colors.text }]} numberOfLines={1}>
            {item.clinicDisplayName}
          </Text>
          <Text style={[styles.listSub, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.branchName}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {language === 'uz' ? 'Xarita' : language === 'ru' ? 'Карта' : 'Map'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.entityTabWrap}>
        <View style={[styles.entityTabRow, { backgroundColor: colors.backgroundSecondary }]}>
          <TouchableOpacity
            style={[styles.entityTabBtn, entity === 'clinic' && [styles.entityTabBtnActive, { backgroundColor: colors.primary }]]}
            onPress={() => switchEntity('clinic')}
            activeOpacity={0.85}
          >
            <Ionicons name="business" size={16} color={entity === 'clinic' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.switchBtnText, { color: entity === 'clinic' ? '#fff' : colors.textSecondary }]}>
              {language === 'uz' ? 'Klinika' : 'Клиники'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.entityTabBtn, entity === 'pharmacy' && [styles.entityTabBtnActive, { backgroundColor: colors.primary }]]}
            onPress={() => switchEntity('pharmacy')}
            activeOpacity={0.85}
          >
            <Ionicons name="medical" size={16} color={entity === 'pharmacy' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.switchBtnText, { color: entity === 'pharmacy' ? '#fff' : colors.textSecondary }]}>
              {language === 'uz' ? 'Apteka' : 'Аптеки'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.countPill, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          <Ionicons name="location" size={14} color={colors.primary} />
          <Text style={[styles.countText, { color: colors.textSecondary }]}>
            {markersData.length}{' '}
            {language === 'uz' ? 'joy' : language === 'ru' ? 'точек' : 'places'}
          </Text>
        </View>
      </View>

      <View style={styles.split}>
        <View style={[styles.mapPanel, { borderColor: colors.border }]}>
          {showMapBootstrapSpinner ? (
            <View style={[styles.mapLoader, { backgroundColor: theme === 'dark' ? '#27272a' : '#e8eef4' }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.mapLoaderText, { color: colors.textSecondary }]}>
                {language === 'uz' ? 'Tayyorlanmoqda…' : language === 'ru' ? 'Подготовка…' : 'Preparing…'}
              </Text>
            </View>
          ) : null}

          {mapCanMount ? (
            <View style={styles.mapWebWrap}>
              <WebView
                key={`map-${entity}-${markersData.length}`}
                source={{ html: mapHtml }}
                style={styles.webview}
                onMessage={handleWebViewMessage}
                onError={dismissMapLoading}
                onHttpError={dismissMapLoading}
                javaScriptEnabled
                domStorageEnabled
                bounces={false}
                scrollEnabled={false}
                originWhitelist={['*']}
                cacheEnabled
                mixedContentMode="compatibility"
                androidLayerType="hardware"
                renderToHardwareTextureAndroid
              />
              {showMapLoadingOverlay ? (
                <View
                  style={[styles.mapLoader, styles.mapLoaderOverlay, { backgroundColor: theme === 'dark' ? '#27272acc' : '#e8eef4e6' }]}
                  pointerEvents="auto"
                >
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.mapLoaderText, { color: colors.textSecondary }]}>
                    {language === 'uz' ? 'Xarita yuklanmoqda…' : language === 'ru' ? 'Загрузка карты…' : 'Loading map…'}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {selectedMarker && mapReady ? (
            <View style={[styles.mapChip, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <Text style={[styles.mapChipTitle, { color: colors.text }]} numberOfLines={1}>
                {selectedMarker.clinicDisplayName}
              </Text>
              <View style={styles.mapChipActions}>
                {!selectedMarker.isPharmacy ? (
                  <TouchableOpacity
                    style={[styles.chipBtn, { backgroundColor: colors.primary }]}
                    onPress={() =>
                      router.push({ pathname: '/clinic/[id]', params: { id: selectedMarker.clinicId } })
                    }
                  >
                    <Text style={styles.chipBtnText}>{t.seeServices || 'Ko\'rish'}</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={[styles.chipBtnOutline, { borderColor: colors.border }]}
                  onPress={() => openDirections(selectedMarker)}
                >
                  <Ionicons name="navigate" size={16} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity hitSlop={8} onPress={() => setSelectedMarker(null)}>
                  <Ionicons name="close-circle" size={22} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>

        <View style={[styles.listPanel, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <View style={[styles.searchBox, { backgroundColor: colors.backgroundInput, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={language === 'uz' ? 'Qidirish…' : language === 'ru' ? 'Поиск…' : 'Search…'}
              placeholderTextColor={colors.textPlaceholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery ? (
              <TouchableOpacity hitSlop={8} onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            ) : null}
          </View>

          {dataLoading ? (
            <View style={styles.listLoader}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : filteredList.length === 0 ? (
            <View style={styles.listEmpty}>
              <Ionicons name="map-outline" size={32} color={colors.textTertiary} />
              <Text style={{ color: colors.textTertiary, marginTop: 8, fontSize: 14 }}>
                {language === 'uz' ? 'Joy topilmadi' : language === 'ru' ? 'Ничего не найдено' : 'No places found'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredList}
              keyExtractor={(item) => item.id}
              renderItem={renderListItem}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 12) + 8 }}
            />
          )}
        </View>
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
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },
  entityTabWrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, gap: 8 },
  entityTabRow: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    height: 40,
    gap: 4,
  },
  entityTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 11,
  },
  entityTabBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  switchBtnText: { fontSize: 13, fontWeight: '700' },
  countPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  countText: { fontSize: 12, fontWeight: '600' },
  split: { flex: 1 },
  mapWebWrap: { flex: 1, width: '100%', minHeight: 0 },
  mapPanel: {
    height: '52%',
    minHeight: 260,
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    position: 'relative',
    flexDirection: 'column',
  },
  mapLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    zIndex: 2,
  },
  mapLoaderOverlay: {
    zIndex: 4,
  },
  mapLoaderText: { fontSize: 14, fontWeight: '600' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  mapChip: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    zIndex: 5,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  mapChipTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  mapChipActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chipBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  chipBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  chipBtnOutline: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listPanel: { flex: 1, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500' },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listTitle: { fontSize: 15, fontWeight: '700' },
  listSub: { fontSize: 12, marginTop: 2 },
  listLoader: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  listEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 28 },
});
