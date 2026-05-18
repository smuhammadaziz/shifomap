import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { addCustomReminder } from '../../lib/api';
import { getTokens } from '../../lib/design';
import { PILL_ICON_OPTIONS, type PillIconId, PillIcon, pillIconLabel } from '../../lib/pill-icons';
import type { AppTheme } from '../../store/theme-store';

export type PillFormType = 'tablet' | 'injection' | 'liquid' | 'drops' | 'inhaler' | 'powder' | 'other';
export type PillFrequency = 'daily' | 'every_other' | 'as_needed';
export type PillFood = 'before' | 'during' | 'after' | 'any';

export type PillReminderMeta = {
  v: 1;
  form: PillFormType;
  frequency: PillFrequency;
  food: PillFood;
  color: string;
  shape: string;
  groupId: string;
  label: string;
};

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
const ROW_H = 44;

const PILL_COLORS = ['#0A2FB8', '#2563EB', '#06B6D4', '#8B5CF6', '#F59E0B', '#F97316', '#84CC16', '#64748B', '#E2E8F0'];

type StepKind = 'name' | 'form' | 'frequency' | 'timesCount' | `time-${number}` | 'food' | 'appearance';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  language: string;
  theme: AppTheme;
};

function tr(language: string, uz: string, ru: string, en?: string) {
  if (language === 'ru') return ru;
  if (language === 'en' && en) return en;
  return uz;
}

export function parseReminderMeta(notes: string | null): PillReminderMeta | null {
  if (!notes?.trim()) return null;
  try {
    const p = JSON.parse(notes) as PillReminderMeta;
    if (p && p.v === 1 && p.label) return p;
  } catch {
    /* plain text notes */
  }
  return null;
}

export function buildMetaLabel(meta: Omit<PillReminderMeta, 'v' | 'label' | 'groupId'>, language: string): string {
  const formLabels: Record<PillFormType, string> = {
    tablet: tr(language, 'Tabletka', 'Таблетка'),
    injection: tr(language, 'Inyeksiya', 'Инъекция'),
    liquid: tr(language, 'Suyuqlik', 'Раствор'),
    drops: tr(language, 'Tomchi', 'Капли'),
    inhaler: tr(language, 'Ingalyator', 'Ингалятор'),
    powder: tr(language, 'Kukun', 'Порошок'),
    other: tr(language, 'Boshqa', 'Другое'),
  };
  const foodLabels: Record<PillFood, string> = {
    before: tr(language, 'Ovqatdan oldin', 'Перед едой'),
    during: tr(language, 'Ovqat vaqtida', 'Во время еды'),
    after: tr(language, 'Ovqatdan keyin', 'После еды'),
    any: tr(language, 'Farqi yo‘q', 'Не важно'),
  };
  const freq =
    meta.frequency === 'daily'
      ? tr(language, 'Har kuni', 'Каждый день')
      : meta.frequency === 'every_other'
        ? tr(language, 'Kun oralab', 'Через день')
        : tr(language, 'Kerak bo‘lganda', 'По необходимости');
  return `${formLabels[meta.form]} · ${freq} · ${foodLabels[meta.food]}`;
}

function TimeWheel({
  value,
  onChange,
  textColor,
  mutedColor,
  highlightBg,
}: {
  value: string;
  onChange: (v: string) => void;
  textColor: string;
  mutedColor: string;
  highlightBg: string;
}) {
  const [h, m] = value.split(':');
  const hourRef = useRef<ScrollView>(null);
  const minRef = useRef<ScrollView>(null);

  useEffect(() => {
    const hi = HOURS.indexOf(h);
    const mi = MINUTES.indexOf(m);
    if (hi >= 0) hourRef.current?.scrollTo({ y: hi * ROW_H, animated: false });
    if (mi >= 0) minRef.current?.scrollTo({ y: mi * ROW_H, animated: false });
  }, [h, m]);

  const onScrollEnd =
    (kind: 'h' | 'm', data: string[]) =>
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / ROW_H);
      const clamped = Math.max(0, Math.min(data.length - 1, idx));
      const nh = kind === 'h' ? data[clamped] : h;
      const nm = kind === 'm' ? data[clamped] : m;
      onChange(`${nh}:${nm}`);
    };

  const renderCol = (kind: 'h' | 'm', data: string[], ref: React.RefObject<ScrollView | null>) => (
    <View style={styles.wheelCol}>
      <View style={[styles.wheelHighlight, { backgroundColor: highlightBg }]} pointerEvents="none" />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW_H}
        decelerationRate="fast"
        onMomentumScrollEnd={onScrollEnd(kind, data)}
        contentContainerStyle={{ paddingVertical: ROW_H * 2 }}
      >
        {data.map((item) => {
          const active = (kind === 'h' ? h : m) === item;
          return (
            <View key={item} style={styles.wheelRow}>
              <Text style={[styles.wheelText, { color: active ? textColor : mutedColor, fontWeight: active ? '800' : '500' }]}>
                {item}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.wheelWrap}>
      {renderCol('h', HOURS, hourRef)}
      <Text style={[styles.wheelColon, { color: textColor }]}>:</Text>
      {renderCol('m', MINUTES, minRef)}
    </View>
  );
}

export default function PillCreateWizard({ visible, onClose, onSaved, language, theme }: Props) {
  const insets = useSafeAreaInsets();
  const tokens = getTokens(theme);
  const isDark = theme === 'dark';

  const [stepIndex, setStepIndex] = useState(0);
  const [name, setName] = useState('');
  const [form, setForm] = useState<PillFormType>('tablet');
  const [frequency, setFrequency] = useState<PillFrequency>('daily');
  const [timesCount, setTimesCount] = useState(1);
  const [times, setTimes] = useState<string[]>(['09:00']);
  const [food, setFood] = useState<PillFood>('any');
  const [pillColor, setPillColor] = useState(PILL_COLORS[0]);
  const [pillIconId, setPillIconId] = useState<PillIconId>('pill');
  const [submitting, setSubmitting] = useState(false);

  const heroColors = isDark
    ? ([tokens.brand.iris, '#0f172a'] as [string, string])
    : ([tokens.brand.iris, tokens.brand.lilac] as [string, string]);

  const sheetBg = isDark ? '#0c0c0e' : tokens.colors.backgroundCard;
  const sheetBorder = tokens.colors.border;

  const steps: StepKind[] = useMemo(() => {
    const base: StepKind[] = ['name', 'form', 'frequency', 'timesCount'];
    for (let i = 0; i < timesCount; i++) base.push(`time-${i}`);
    base.push('food', 'appearance');
    return base;
  }, [timesCount]);

  const currentStep = steps[stepIndex] ?? 'name';
  const progress = (stepIndex + 1) / steps.length;

  const reset = useCallback(() => {
    setStepIndex(0);
    setName('');
    setForm('tablet');
    setFrequency('daily');
    setTimesCount(1);
    setTimes(['09:00']);
    setFood('any');
    setPillColor(PILL_COLORS[0]);
    setPillIconId('pill');
    setSubmitting(false);
  }, []);

  useEffect(() => {
    if (!visible) reset();
  }, [visible, reset]);

  useEffect(() => {
    setTimes((prev) => {
      const next = [...prev];
      while (next.length < timesCount) {
        const defaults = ['08:00', '12:00', '18:00', '21:00'];
        next.push(defaults[next.length] ?? '09:00');
      }
      return next.slice(0, timesCount);
    });
  }, [timesCount]);

  const goBack = () => {
    if (stepIndex === 0) onClose();
    else setStepIndex((i) => i - 1);
  };

  const goNext = () => {
    if (currentStep === 'name' && !name.trim()) return;
    if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1);
    else void handleSave();
  };

  const advanceStep = () => setStepIndex((i) => Math.min(i + 1, steps.length - 1));

  const handleSave = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    const groupId = `${Date.now()}`;
    const label = buildMetaLabel({ form, frequency, food, color: pillColor, shape: pillIconId }, language);
    const notes = JSON.stringify({
      v: 1,
      form,
      frequency,
      food,
      color: pillColor,
      shape: pillIconId,
      groupId,
      label,
    } satisfies PillReminderMeta);

    try {
      for (const time of times) {
        await addCustomReminder({
          pillName: name.trim(),
          time,
          notes,
          timesPerDay: times.length,
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : tr(language, 'Saqlashda xato', 'Ошибка сохранения');
      Alert.alert(tr(language, 'Xato', 'Ошибка'), msg);
    } finally {
      setSubmitting(false);
    }
  };

  const question = useMemo(() => {
    if (currentStep === 'name') return tr(language, 'Dori nomini kiriting', 'Введите название лекарства');
    if (currentStep === 'form') return tr(language, 'Dori shakli qanday?', 'Какая форма выпуска?');
    if (currentStep === 'frequency') return tr(language, 'Qanchalik tez-tez ichasiz?', 'Как часто принимаете?');
    if (currentStep === 'timesCount') return tr(language, 'Kuniga necha marta?', 'Сколько раз в день?');
    if (currentStep.startsWith('time-')) {
      const idx = parseInt(currentStep.split('-')[1] ?? '0', 10) + 1;
      return tr(language, `${idx}-doza vaqti qachon?`, `Когда принять дозу ${idx}?`);
    }
    if (currentStep === 'food') return tr(language, 'Ovqat bilan qanday ichiladi?', 'Принимать с едой?');
    return tr(language, 'Rang va dori belgisini tanlang', 'Цвет и иконка');
  }, [currentStep, language]);

  const stepIcon = useMemo(() => {
    if (currentStep === 'name') return 'medical';
    if (currentStep === 'form') return 'medkit';
    if (currentStep === 'frequency') return 'calendar';
    if (currentStep === 'timesCount') return 'repeat';
    if (currentStep.startsWith('time-')) return 'alarm';
    if (currentStep === 'food') return 'restaurant';
    return 'color-palette';
  }, [currentStep]);

  const formOptions: { id: PillFormType; label: string }[] = [
    { id: 'tablet', label: tr(language, 'Tabletka', 'Таблетка') },
    { id: 'injection', label: tr(language, 'Inyeksiya', 'Инъекция') },
    { id: 'liquid', label: tr(language, 'Suyuqlik', 'Жидкость') },
    { id: 'drops', label: tr(language, 'Tomchi', 'Капли') },
    { id: 'inhaler', label: tr(language, 'Ingalyator', 'Ингалятор') },
    { id: 'powder', label: tr(language, 'Kukun', 'Порошок') },
    { id: 'other', label: tr(language, 'Boshqa', 'Другое') },
  ];

  const freqOptions: { id: PillFrequency; label: string }[] = [
    { id: 'daily', label: tr(language, 'Har kuni', 'Каждый день') },
    { id: 'every_other', label: tr(language, 'Kun oralab', 'Через день') },
    { id: 'as_needed', label: tr(language, 'Kerak bo‘lganda', 'По необходимости') },
  ];

  const countOptions = [
    { n: 1, label: tr(language, 'Kuniga 1 marta', '1 раз в день') },
    { n: 2, label: tr(language, 'Kuniga 2 marta', '2 раза в день') },
    { n: 3, label: tr(language, 'Kuniga 3 marta', '3 раза в день') },
    { n: 4, label: tr(language, '4+ marta', 'Более 3 раз') },
  ];

  const foodOptions: { id: PillFood; label: string }[] = [
    { id: 'before', label: tr(language, 'Ovqatdan oldin', 'Перед едой') },
    { id: 'during', label: tr(language, 'Ovqat vaqtida', 'Во время еды') },
    { id: 'after', label: tr(language, 'Ovqatdan keyin', 'После еды') },
    { id: 'any', label: tr(language, 'Farqi yo‘q', 'Не важно') },
  ];

  const timeStepIdx = currentStep.startsWith('time-') ? parseInt(currentStep.split('-')[1] ?? '0', 10) : 0;

  const renderOptions = (
    items: { id: string; label: string }[],
    selected: string,
    onSelect: (id: string) => void,
    autoAdvance = true,
  ) => (
    <ScrollView style={styles.optionList} showsVerticalScrollIndicator={false}>
      {items.map((item, i) => {
        const active = selected === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.75}
            onPress={() => {
              onSelect(item.id);
              if (autoAdvance) advanceStep();
            }}
            style={[
              styles.optionRow,
              i < items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: sheetBorder },
            ]}
          >
            <Text style={[styles.optionText, { color: active ? tokens.brand.iris : tokens.colors.text }]}>{item.label}</Text>
            {active ? <Ionicons name="checkmark-circle" size={22} color={tokens.brand.iris} /> : null}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: tokens.colors.background }]}>
        <LinearGradient colors={heroColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + 8 }]}>
          <View style={styles.heroTop}>
            <TouchableOpacity onPress={goBack} hitSlop={12} style={styles.heroBack}>
              <Ionicons name="chevron-back" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.heroPillName} numberOfLines={1}>
              {name.trim() || tr(language, 'Yangi dori', 'Новое лекарство')}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.heroIconRow}>
            <View style={styles.heroIconBubble}>
              <Ionicons name={stepIcon as keyof typeof Ionicons.glyphMap} size={22} color="#fff" />
            </View>
          </View>

          <Text style={styles.heroQuestion}>{question}</Text>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </LinearGradient>

        <View style={[styles.sheet, { backgroundColor: sheetBg }]}>
          {currentStep === 'name' ? (
            <View style={styles.nameStep}>
              <TextInput
                style={[
                  styles.nameInput,
                  {
                    color: tokens.colors.text,
                    borderColor: sheetBorder,
                    backgroundColor: isDark ? '#18181b' : tokens.colors.backgroundInput,
                  },
                ]}
                value={name}
                onChangeText={setName}
                placeholder={tr(language, 'Masalan, Vitamin D3', 'Например, Витамин D3')}
                placeholderTextColor={tokens.colors.textPlaceholder}
                autoFocus
              />
            </View>
          ) : null}

          {currentStep === 'form'
            ? renderOptions(formOptions, form, (id) => setForm(id as PillFormType))
            : null}
          {currentStep === 'frequency'
            ? renderOptions(freqOptions, frequency, (id) => setFrequency(id as PillFrequency))
            : null}
          {currentStep === 'timesCount'
            ? renderOptions(
                countOptions.map((c) => ({ id: String(c.n), label: c.label })),
                String(timesCount),
                (id) => setTimesCount(parseInt(id, 10)),
              )
            : null}
          {currentStep.startsWith('time-') ? (
            <View style={styles.timeStep}>
              <Text style={[styles.doseHint, { color: tokens.colors.textSecondary }]}>
                {tr(language, '1 tabletka', '1 таблетка')} · {name.trim() || '—'}
              </Text>
              <TimeWheel
                value={times[timeStepIdx] ?? '09:00'}
                onChange={(v) =>
                  setTimes((prev) => {
                    const next = [...prev];
                    next[timeStepIdx] = v;
                    return next;
                  })
                }
                textColor={tokens.colors.text}
                mutedColor={tokens.colors.textTertiary}
                highlightBg={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(10,47,184,0.1)'}
              />
            </View>
          ) : null}
          {currentStep === 'food'
            ? renderOptions(foodOptions, food, (id) => setFood(id as PillFood))
            : null}

          {currentStep === 'appearance' ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={[styles.appearanceLabel, { color: tokens.colors.textSecondary }]}>
                {tr(language, 'Rang', 'Цвет')}
              </Text>
              <View style={styles.colorRow}>
                {PILL_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setPillColor(c)}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      pillColor === c && { borderWidth: 3, borderColor: tokens.brand.iris },
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.appearanceLabel, { color: tokens.colors.textSecondary, marginTop: 16 }]}>
                {tr(language, 'Dori belgisi', 'Иконка лекарства')}
              </Text>
              <View style={styles.iconGrid}>
                {PILL_ICON_OPTIONS.map((opt) => {
                  const active = pillIconId === opt.id;
                  const label = language === 'ru' ? opt.labelRu : opt.labelUz;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      activeOpacity={0.85}
                      onPress={() => setPillIconId(opt.id)}
                      style={[
                        styles.iconChip,
                        {
                          borderColor: active ? tokens.brand.iris : sheetBorder,
                          backgroundColor: active
                            ? tokens.brand.iris + (isDark ? '28' : '14')
                            : isDark
                              ? '#18181b'
                              : tokens.colors.backgroundSecondary,
                        },
                      ]}
                    >
                      <View style={[styles.iconChipCircle, { backgroundColor: pillColor }]}>
                        <PillIcon iconId={opt.id} size={26} color="#fff" />
                      </View>
                      <Text
                        style={[
                          styles.iconChipLabel,
                          { color: active ? tokens.brand.iris : tokens.colors.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.previewBig}>
                <View style={[styles.previewCircle, { backgroundColor: pillColor }]}>
                  <PillIcon iconId={pillIconId} size={48} color="#fff" />
                </View>
                <Text style={[styles.previewName, { color: tokens.colors.text }]} numberOfLines={1}>
                  {name.trim() || tr(language, 'Dori', 'Лекарство')}
                </Text>
                <Text style={[styles.previewMeta, { color: tokens.colors.textSecondary }]}>
                  {pillIconLabel(pillIconId, language)}
                </Text>
              </View>
            </ScrollView>
          ) : null}
        </View>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8, borderTopColor: sheetBorder, backgroundColor: sheetBg }]}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={goNext}
            disabled={submitting || (currentStep === 'name' && !name.trim())}
            style={{ opacity: currentStep === 'name' && !name.trim() ? 0.5 : 1 }}
          >
            <LinearGradient
              colors={[tokens.brand.iris, tokens.brand.lilac]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.footerBtn}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.footerBtnText}>
                    {stepIndex >= steps.length - 1
                      ? tr(language, 'Saqlash', 'Сохранить')
                      : tr(language, 'Keyingi', 'Далее')}
                  </Text>
                  <Ionicons name={stepIndex >= steps.length - 1 ? 'checkmark' : 'chevron-forward'} size={20} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { paddingHorizontal: 20, paddingBottom: 22 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroBack: { width: 36, height: 36, alignItems: 'flex-start', justifyContent: 'center' },
  heroPillName: { flex: 1, textAlign: 'center', color: '#fff', fontSize: 15, fontWeight: '700' },
  heroIconRow: { alignItems: 'flex-start', marginTop: 16 },
  heroIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroQuestion: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: 14,
    lineHeight: 30,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 18,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -12,
    paddingTop: 8,
    overflow: 'hidden',
  },
  nameStep: { padding: 20 },
  nameInput: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 16 : 12,
    fontSize: 18,
    fontWeight: '600',
  },
  optionList: { flex: 1 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  optionText: { fontSize: 17, fontWeight: '600', flex: 1 },
  timeStep: { flex: 1, paddingTop: 12 },
  doseHint: { textAlign: 'center', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  wheelWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: ROW_H * 5, marginTop: 8 },
  wheelCol: { width: 72, height: ROW_H * 5, overflow: 'hidden' },
  wheelHighlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ROW_H * 2,
    height: ROW_H,
    borderRadius: 12,
    zIndex: 0,
  },
  wheelRow: { height: ROW_H, alignItems: 'center', justifyContent: 'center' },
  wheelText: { fontSize: 22 },
  wheelColon: { fontSize: 28, fontWeight: '800', marginHorizontal: 6 },
  appearanceLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 20 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20, marginTop: 10 },
  colorDot: { width: 36, height: 36, borderRadius: 18 },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 10,
    justifyContent: 'space-between',
  },
  iconChip: {
    width: '23%',
    minWidth: 76,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 6,
  },
  iconChipCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  iconChipLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  previewBig: { alignItems: 'center', marginTop: 24, gap: 8, paddingHorizontal: 20 },
  previewCircle: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 5,
  },
  previewName: { fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  previewMeta: { fontSize: 13, fontWeight: '600' },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  footerBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
