import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getServiceFilterOptions, type ServiceFilterOptions, type ServiceFilters } from '../../lib/api';
import { useAuthStore } from '../../store/auth-store';
import { getTranslations } from '../../lib/translations';
import Skeleton from './Skeleton';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1576091160399-112ba8e25d1d?w=200&h=200&fit=crop';

interface ServiceFiltersModalProps {
  visible: boolean;
  onClose: () => void;
  initialFilters?: ServiceFilters;
}

export default function ServiceFiltersModal({ visible, onClose, initialFilters = {} }: ServiceFiltersModalProps) {
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const t = getTranslations(language);
  const [options, setOptions] = useState<ServiceFilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryId, setCategoryId] = useState<string | undefined>(initialFilters.categoryId);
  const [minPrice, setMinPrice] = useState<string>(initialFilters.minPrice != null ? String(initialFilters.minPrice) : '');
  const [maxPrice, setMaxPrice] = useState<string>(initialFilters.maxPrice != null ? String(initialFilters.maxPrice) : '');
  const [durationMin, setDurationMin] = useState<string>(initialFilters.durationMin != null ? String(initialFilters.durationMin) : '');

  useEffect(() => {
    if (visible) {
      setLoading(true);
      getServiceFilterOptions()
        .then(setOptions)
        .catch(() => setOptions({ categories: [], minPrice: null, maxPrice: null, minDuration: null, maxDuration: null }))
        .finally(() => setLoading(false));
      setCategoryId(initialFilters.categoryId);
      setMinPrice(initialFilters.minPrice != null ? String(initialFilters.minPrice) : '');
      setMaxPrice(initialFilters.maxPrice != null ? String(initialFilters.maxPrice) : '');
      setDurationMin(initialFilters.durationMin != null ? String(initialFilters.durationMin) : '');
    }
  }, [visible, initialFilters.categoryId, initialFilters.minPrice, initialFilters.maxPrice, initialFilters.durationMin]);

  const handleApply = () => {
    const filters: ServiceFilters = {};
    if (categoryId) filters.categoryId = categoryId;
    const min = minPrice.trim() ? parseInt(minPrice, 10) : undefined;
    const max = maxPrice.trim() ? parseInt(maxPrice, 10) : undefined;
    const dur = durationMin.trim() ? parseInt(durationMin, 10) : undefined;
    if (min != null && !Number.isNaN(min)) filters.minPrice = min;
    if (max != null && !Number.isNaN(max)) filters.maxPrice = max;
    if (dur != null && !Number.isNaN(dur)) filters.durationMin = dur;
    onClose();
    const params: Record<string, string> = {};
    if (filters.categoryId) params.categoryId = filters.categoryId;
    if (filters.minPrice != null) params.minPrice = String(filters.minPrice);
    if (filters.maxPrice != null) params.maxPrice = String(filters.maxPrice);
    if (filters.durationMin != null) params.durationMin = String(filters.durationMin);
    router.push({ pathname: '/services-results', params });
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t.filters}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={28} color="#a1a1aa" />
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={styles.skeletonContent}>
              <Skeleton width={80} height={12} style={{ marginBottom: 12 }} />
              <View style={styles.chipRow}>
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} width={64} height={36} style={{ borderRadius: 20, marginRight: 8 }} />
                ))}
              </View>
              <Skeleton width={80} height={12} style={{ marginTop: 24, marginBottom: 12 }} />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Skeleton width="45%" height={48} style={{ borderRadius: 12 }} />
                <Skeleton width="45%" height={48} style={{ borderRadius: 12 }} />
              </View>
              <Skeleton width={100} height={12} style={{ marginTop: 24, marginBottom: 12 }} />
              <Skeleton width="50%" height={48} style={{ borderRadius: 12 }} />
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {options?.categories && options.categories.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>{t.category}</Text>
                  <View style={styles.chipRow}>
                    <TouchableOpacity
                      style={[styles.chip, !categoryId && styles.chipActive]}
                      onPress={() => setCategoryId(undefined)}
                    >
                      <Text style={[styles.chipText, !categoryId && styles.chipTextActive]}>All</Text>
                    </TouchableOpacity>
                    {options.categories.map((c) => (
                      <TouchableOpacity
                        key={c._id}
                        style={[styles.chip, categoryId === c._id && styles.chipActive]}
                        onPress={() => setCategoryId(c._id)}
                      >
                        <Text style={[styles.chipText, categoryId === c._id && styles.chipTextActive]}>{c.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              {(options?.minPrice != null || options?.maxPrice != null) && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>{t.price}</Text>
                  <View style={styles.row}>
                    <View style={styles.inputFieldWrap}>
                      <Text style={styles.inputLabel}>{t.minPrice}</Text>
                      <TextInput
                        style={styles.textInput}
                        value={minPrice}
                        onChangeText={setMinPrice}
                        placeholder={options?.minPrice != null ? String(options.minPrice) : '-'}
                        placeholderTextColor="#71717a"
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.inputFieldWrap}>
                      <Text style={styles.inputLabel}>{t.maxPrice}</Text>
                      <TextInput
                        style={styles.textInput}
                        value={maxPrice}
                        onChangeText={setMaxPrice}
                        placeholder={options?.maxPrice != null ? String(options.maxPrice) : '-'}
                        placeholderTextColor="#71717a"
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>
              )}
              {(options?.minDuration != null || options?.maxDuration != null) && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>{t.duration} ({t.minutes})</Text>
                  <TextInput
                    style={styles.textInput}
                    value={durationMin}
                    onChangeText={setDurationMin}
                    placeholder={options?.maxDuration != null ? `≤ ${options.maxDuration}` : '-'}
                    placeholderTextColor="#71717a"
                    keyboardType="numeric"
                  />
                </View>
              )}
              <View style={{ height: 100 }} />
            </ScrollView>
          )}
          <View style={styles.stickyFooter}>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
              <Text style={styles.applyBtnText}>{t.apply}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  title: { color: '#ffffff', fontSize: 20, fontWeight: '700' },
  closeBtn: { padding: 4 },
  loadingBox: { padding: 48, alignItems: 'center' },
  skeletonContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  scroll: { maxHeight: 400 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },
  section: { marginBottom: 20 },
  sectionLabel: { color: '#a1a1aa', fontSize: 13, marginBottom: 8, textTransform: 'uppercase' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  chipActive: { backgroundColor: '#3b0764', borderColor: '#7c3aed' },
  chipText: { color: '#a1a1aa', fontSize: 14 },
  chipTextActive: { color: '#e9d5ff', fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12 },
  inputWrap: { flex: 1 },
  inputFieldWrap: { flex: 1 },
  inputLabel: { color: '#71717a', fontSize: 12, marginBottom: 4 },
  inputPlaceholder: { color: '#52525b', fontSize: 12 },
  inputValue: { color: '#ffffff', fontSize: 16 },
  textInput: {
    backgroundColor: '#27272a',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  stickyFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    backgroundColor: '#18181b',
  },
  applyBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
