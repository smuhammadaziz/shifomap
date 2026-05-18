import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getServiceFilterOptions } from '../../lib/api';
import { getTranslations } from '../../lib/translations';
import type { getTokens } from '../../lib/design';

const PRICE_PRESETS = [
  { labelUz: '100 minggacha', labelRu: 'До 100 тыс', max: 100_000 },
  { labelUz: '100–300 ming', labelRu: '100–300 тыс', min: 100_000, max: 300_000 },
  { labelUz: '300–500 ming', labelRu: '300–500 тыс', min: 300_000, max: 500_000 },
  { labelUz: '500 ming+', labelRu: '500 тыс+', min: 500_000 },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  initialQuery?: string;
  language: string;
  tokens: ReturnType<typeof getTokens>;
};

function formatUz(n: number) {
  return n.toLocaleString('uz-UZ');
}

export default function HomePriceFilterSheet({ visible, onClose, initialQuery = '', language, tokens }: Props) {
  const router = useRouter();
  const t = getTranslations(language as 'uz' | 'ru' | 'en');
  const isRu = language === 'ru';

  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const [boundsLoading, setBoundsLoading] = useState(false);
  const [priceBounds, setPriceBounds] = useState<{ min: number | null; max: number | null }>({
    min: null,
    max: null,
  });

  const slideY = useRef(new Animated.Value(420)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    setBoundsLoading(true);
    getServiceFilterOptions()
      .then((o) => setPriceBounds({ min: o.minPrice, max: o.maxPrice }))
      .catch(() => setPriceBounds({ min: null, max: null }))
      .finally(() => setBoundsLoading(false));
  }, [visible]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 280 }),
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      slideY.setValue(420);
      fade.setValue(0);
    }
  }, [visible, slideY, fade]);

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(slideY, { toValue: 420, duration: 220, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) onClose();
    });
  };

  const applyPreset = (index: number) => {
    const p = PRICE_PRESETS[index];
    setActivePreset(index);
    setMinPrice(p.min != null ? String(p.min) : '');
    setMaxPrice(p.max != null ? String(p.max) : '');
  };

  const onSearch = () => {
    const minNum = minPrice.trim() ? parseInt(minPrice.replace(/\s/g, ''), 10) : undefined;
    const maxNum = maxPrice.trim() ? parseInt(maxPrice.replace(/\s/g, ''), 10) : undefined;
    const min = minNum != null && !Number.isNaN(minNum) ? minNum : undefined;
    const max = maxNum != null && !Number.isNaN(maxNum) ? maxNum : undefined;

    const params: Record<string, string> = {};
    const q = initialQuery.trim();
    if (q) params.q = q;
    if (min != null) params.minPrice = String(min);
    if (max != null) params.maxPrice = String(max);

    onClose();
    router.push({ pathname: '/services-results', params });
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={closeSheet}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableWithoutFeedback onPress={closeSheet}>
          <Animated.View style={[styles.backdrop, { opacity: fade }]} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: tokens.colors.backgroundCard,
              borderColor: tokens.colors.border,
              transform: [{ translateY: slideY }],
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: tokens.colors.textTertiary }]} />

          <View style={styles.sheetHeader}>
            <View style={[styles.headerIcon, { backgroundColor: tokens.brand.iris + '18' }]}>
              <Ionicons name="options" size={20} color={tokens.brand.iris} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetTitle, { color: tokens.colors.text }]}>
                {isRu ? 'По цене' : 'Narx bo‘yicha'}
              </Text>
              <Text style={[styles.sheetSub, { color: tokens.colors.textSecondary }]} numberOfLines={1}>
                {initialQuery.trim()
                  ? `"${initialQuery.trim()}" · ${isRu ? 'фильтр' : 'filtr'}`
                  : isRu
                    ? 'Найдите услуги в нужном ценовом диапазоне'
                    : 'Xizmatlarni narx oralig‘i bo‘yicha toping'}
              </Text>
            </View>
            <TouchableOpacity onPress={closeSheet} hitSlop={12} style={[styles.closeBtn, { backgroundColor: tokens.colors.backgroundSecondary }]}>
              <Ionicons name="close" size={20} color={tokens.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {boundsLoading ? (
              <ActivityIndicator color={tokens.brand.iris} style={{ marginVertical: 16 }} />
            ) : priceBounds.min != null || priceBounds.max != null ? (
              <Text style={[styles.boundsHint, { color: tokens.colors.textTertiary }]}>
                {isRu ? 'Диапазон цен' : 'Mavjud narxlar'}:{' '}
                {priceBounds.min != null ? formatUz(priceBounds.min) : '—'} –{' '}
                {priceBounds.max != null ? formatUz(priceBounds.max) : '—'} UZS
              </Text>
            ) : null}

            <Text style={[styles.label, { color: tokens.colors.textSecondary }]}>{t.minPrice}</Text>
            <View style={styles.priceRow}>
              <View style={[styles.inputWrap, { backgroundColor: tokens.colors.backgroundInput, borderColor: tokens.colors.border }]}>
                <Text style={[styles.inputPrefix, { color: tokens.colors.textTertiary }]}>UZS</Text>
                <TextInput
                  style={[styles.input, { color: tokens.colors.text }]}
                  placeholder={priceBounds.min != null ? formatUz(priceBounds.min) : '0'}
                  placeholderTextColor={tokens.colors.textPlaceholder}
                  value={minPrice}
                  onChangeText={(v) => {
                    setActivePreset(null);
                    setMinPrice(v.replace(/\D/g, ''));
                  }}
                  keyboardType="number-pad"
                />
              </View>
              <Text style={{ color: tokens.colors.textTertiary, fontWeight: '600' }}>—</Text>
              <View style={[styles.inputWrap, { backgroundColor: tokens.colors.backgroundInput, borderColor: tokens.colors.border }]}>
                <Text style={[styles.inputPrefix, { color: tokens.colors.textTertiary }]}>UZS</Text>
                <TextInput
                  style={[styles.input, { color: tokens.colors.text }]}
                  placeholder={priceBounds.max != null ? formatUz(priceBounds.max) : '∞'}
                  placeholderTextColor={tokens.colors.textPlaceholder}
                  value={maxPrice}
                  onChangeText={(v) => {
                    setActivePreset(null);
                    setMaxPrice(v.replace(/\D/g, ''));
                  }}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <Text style={[styles.label, { color: tokens.colors.textSecondary, marginTop: 18 }]}>
              {isRu ? 'Быстрый выбор' : 'Tez tanlov'}
            </Text>
            <View style={styles.presetRow}>
              {PRICE_PRESETS.map((p, i) => {
                const active = activePreset === i;
                return (
                  <TouchableOpacity
                    key={p.labelUz}
                    activeOpacity={0.85}
                    onPress={() => applyPreset(i)}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: active ? tokens.brand.iris + '18' : tokens.colors.backgroundSecondary,
                        borderColor: active ? tokens.brand.iris : tokens.colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.presetText, { color: active ? tokens.brand.iris : tokens.colors.text }]}>
                      {isRu ? p.labelRu : p.labelUz}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <TouchableOpacity activeOpacity={0.9} onPress={onSearch} style={styles.searchBtnWrap}>
            <LinearGradient
              colors={[tokens.brand.iris, tokens.brand.lilac]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.searchBtn}
            >
              <Ionicons name="search" size={20} color="#fff" />
              <Text style={styles.searchBtnText}>{t.searchPlaceholder}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.55)' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    maxHeight: '78%',
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
    opacity: 0.35,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  sheetSub: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 12 },
  boundsHint: { fontSize: 12, fontWeight: '500', marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 52,
    gap: 6,
  },
  inputPrefix: { fontSize: 11, fontWeight: '700' },
  input: { flex: 1, fontSize: 16, fontWeight: '600' },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  presetText: { fontSize: 13, fontWeight: '600' },
  searchBtnWrap: { paddingHorizontal: 20, paddingTop: 8 },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  searchBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
