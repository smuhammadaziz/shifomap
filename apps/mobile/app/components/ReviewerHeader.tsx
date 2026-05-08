import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getFileUrl } from '../../lib/api';

type ReviewLike = {
  patientName?: string | null;
  patientAvatar?: string | null;
  createdAt: string;
  stars: number;
};

function resolveAvatar(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return getFileUrl(url) ?? null;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return '';
  }
}

export function reviewerName(
  r: { patientName?: string | null },
  language: string,
): string {
  const n = r.patientName?.trim();
  if (n) return n;
  if (language === 'ru') return 'Пользователь';
  if (language === 'en') return 'User';
  return 'Foydalanuvchi';
}

export default function ReviewerHeader({
  review,
  language,
  textColor,
  secondaryColor,
  starColor,
  size = 'md',
}: {
  review: ReviewLike;
  language: string;
  textColor: string;
  secondaryColor: string;
  starColor: string;
  size?: 'sm' | 'md';
}) {
  const name = reviewerName(review, language);
  const initial = (name[0] ?? '?').toUpperCase();
  const avatar = resolveAvatar(review.patientAvatar);
  const isSm = size === 'sm';
  const av = isSm ? styles.avatarSm : styles.avatarMd;

  return (
    <View style={styles.row}>
      {avatar ? (
        <Image source={{ uri: avatar }} style={av} />
      ) : (
        <View style={[av, styles.avatarFallback]}>
          <Text style={[styles.avatarInitial, { fontSize: isSm ? 12 : 14 }]}>{initial}</Text>
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{ color: textColor, fontWeight: '700', fontSize: isSm ? 13 : 14 }}
          numberOfLines={1}
        >
          {name}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Ionicons
                key={s}
                name={s <= review.stars ? 'star' : 'star-outline'}
                size={isSm ? 11 : 13}
                color={starColor}
              />
            ))}
          </View>
          <Text style={[styles.dot, { color: secondaryColor }]}>·</Text>
          <Text style={{ color: secondaryColor, fontSize: 11 }}>
            {formatDate(review.createdAt)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarSm: { width: 28, height: 28, borderRadius: 14 },
  avatarMd: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: {
    backgroundColor: '#1422AE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: '#fff', fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  starsRow: { flexDirection: 'row', gap: 1 },
  dot: { fontSize: 11, marginHorizontal: 2 },
});
