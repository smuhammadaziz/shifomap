import React from 'react';
import { ScrollView, TouchableOpacity, View, Text, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { getFileUrl } from '../../lib/api';
import type { StoryItem } from '../../lib/api';

const FALLBACK = 'https://images.unsplash.com/photo-1576091160399-112ba8e25d1d?w=300&q=80';

function resolveStoryImage(url: string): string {
  if (!url) return FALLBACK;
  if (url.startsWith('http')) return url;
  return getFileUrl(url) ?? FALLBACK;
}

export default function StoriesRibbon({
  stories,
  language,
}: {
  stories: StoryItem[];
  language: string;
}) {
  const router = useRouter();
  if (!stories.length) return null;

  return (
    <View style={{ marginTop: 16 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
      >
        {stories.map((s) => (
          <TouchableOpacity
            key={s._id}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/stories-viewer', params: { storyId: s._id } })}
          >
            <View style={[styles.ring, !s.seen ? styles.ringActive : styles.ringSeen]}>
              <Image source={{ uri: resolveStoryImage(s.imageUrl) }} style={styles.avatar} />
            </View>
            <Text style={styles.caption} numberOfLines={1}>
              {s.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { width: 72, height: 72, borderRadius: 36, padding: 2.5, alignItems: 'center', justifyContent: 'center' },
  ringActive: { backgroundColor: '#2563eb' },
  ringSeen: { backgroundColor: '#d1d5db' },
  avatar: { width: 66, height: 66, borderRadius: 33, backgroundColor: '#e5e7eb' },
  caption: { marginTop: 6, width: 72, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#374151' },
});
