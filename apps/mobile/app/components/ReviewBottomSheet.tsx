import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/theme-store';
import { getTranslations } from '../../lib/translations';
import { useAuthStore } from '../../store/auth-store';
import { getColors } from '../../lib/theme';
import { submitReview } from '../../lib/api';

export type ReviewTarget = 'clinic' | 'service' | 'doctor';

export interface ReviewBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  clinicId: string;
  serviceId?: string | null;
  doctorId?: string | null;
  target: ReviewTarget;
  entityName: string;
}

export default function ReviewBottomSheet({
  visible,
  onClose,
  onSuccess,
  clinicId,
  serviceId,
  doctorId,
  target,
  entityName,
}: ReviewBottomSheetProps) {
  const theme = useThemeStore((s) => s.theme);
  const language = useAuthStore((s) => s.language);
  const token = useAuthStore((s) => s.token);
  const t = getTranslations(language);
  const colors = getColors(theme);
  const [stars, setStars] = useState(5);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      setStars(5);
      setText('');
    }
  }, [visible]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitReview({
        clinicId,
        serviceId: target === 'service' ? serviceId ?? undefined : undefined,
        doctorId: target === 'doctor' ? doctorId ?? undefined : undefined,
        stars,
        text: text.trim() || null,
      });
      onSuccess?.();
      onClose();
    } catch {
      // keep sheet open on error
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackdropPress = () => {
    Keyboard.dismiss();
    onClose();
  };

  if (!visible) return null;

  const sheetBg = colors.backgroundCard ?? '#18181b';
  const sheetBorder = colors.border ?? '#27272a';
  const inputBg = colors.backgroundSecondary ?? '#27272a';
  const primaryBtn = colors.primaryLight ?? '#6366f1';

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
      </TouchableWithoutFeedback>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={[styles.sheet, { backgroundColor: sheetBg, borderColor: sheetBorder }]}>
            <View style={styles.handleWrap}>
              <View style={[styles.handle, { backgroundColor: colors.textTertiary }]} />
            </View>
            <View style={[styles.header, { borderBottomColor: sheetBorder }]}>
              <View style={styles.headerTitleWrap}>
                <Ionicons name="star" size={22} color={colors.warning} />
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                  {t.writeReview} — {entityName}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
                <Ionicons name="close-circle" size={28} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollRef}
              style={styles.bodyScroll}
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t.yourRating}</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setStars(s)}
                    style={styles.starBtn}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={s <= stars ? 'star' : 'star-outline'}
                      size={40}
                      color={colors.warning}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.textSecondary }]}>{t.reviewText}</Text>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={language === 'ru' ? 'Текст отзыва (необязательно)' : "Sharh matni (ixtiyoriy)"}
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.input,
                  {
                    backgroundColor: inputBg,
                    color: colors.text,
                    borderColor: sheetBorder,
                  },
                ]}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                onFocus={() => {
                  setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
                }}
              />

              {!token && (
                <Text style={[styles.loginHint, { color: colors.textTertiary }]}>
                  {language === 'ru' ? 'Войдите в аккаунт, чтобы оставить отзыв' : "Sharh yozish uchun hisobingizga kiring"}
                </Text>
              )}
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: primaryBtn, opacity: token ? 1 : 0.6 }]}
                onPress={handleSubmit}
                disabled={submitting || !token}
                activeOpacity={0.9}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>{t.submitReview}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingBottom: 34,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  bodyScroll: {
    maxHeight: 400,
  },
  label: {
    fontSize: 13,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 24,
  },
  starBtn: {
    padding: 6,
  },
  input: {
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    minHeight: 100,
    borderWidth: 1,
    marginBottom: 20,
  },
  loginHint: { fontSize: 13, textAlign: 'center', marginBottom: 12 },
  submitBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
