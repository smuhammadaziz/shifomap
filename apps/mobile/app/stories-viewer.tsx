import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  ImageBackground,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/auth-store';
import { getFileUrl } from '../lib/api';
import { listStories, markStorySeen, type StoryItem } from '../lib/api';

const { width: W, height: H } = Dimensions.get('window');

function resolveStoryImage(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return getFileUrl(url) ?? url;
}

export default function StoriesViewerScreen() {
  const router = useRouter();
  const { storyId } = useLocalSearchParams<{ storyId?: string }>();
  const language = useAuthStore((s) => s.language) ?? 'uz';
  const [items, setItems] = useState<StoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    listStories(40)
      .then((rows) => {
        if (!mounted) return;
        setItems(rows);
        const idx = storyId ? rows.findIndex((s) => s._id === storyId) : 0;
        setActive(idx >= 0 ? idx : 0);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [storyId]);

  const initialIndex = useMemo(() => {
    const idx = storyId ? items.findIndex((s) => s._id === storyId) : 0;
    return idx >= 0 ? idx : 0;
  }, [items, storyId]);

  useEffect(() => {
    const current = items[active];
    if (!current || seenRef.current.has(current._id) || current.seen) return;
    seenRef.current.add(current._id);
    markStorySeen(current._id).catch(() => {});
  }, [active, items]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!items.length) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#fff' }}>{language === 'uz' ? 'Stories topilmadi' : 'Сторис не найдены'}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <FlatList
        horizontal
        pagingEnabled
        data={items}
        keyExtractor={(i) => i._id}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, idx) => ({ length: W, offset: W * idx, index: idx })}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / W);
          setActive(i);
        }}
        renderItem={({ item }) => (
          <ImageBackground source={{ uri: resolveStoryImage(item.imageUrl) }} style={styles.slide} resizeMode="contain">
            <View style={styles.overlay}>
              <Text style={styles.title}>{item.title}</Text>
            </View>
          </ImageBackground>
        )}
      />
      <TouchableOpacity style={styles.close} onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="close" size={30} color="#fff" />
      </TouchableOpacity>
      <View style={styles.topProgress}>
        {items.map((it, i) => (
          <View key={it._id} style={[styles.p, i <= active ? styles.pOn : null]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  slide: { width: W, height: H, justifyContent: 'flex-end' },
  overlay: { padding: 24, backgroundColor: 'rgba(0,0,0,0.25)' },
  title: { color: '#fff', fontSize: 24, fontWeight: '800' },
  close: { position: 'absolute', top: 48, right: 18 },
  topProgress: { position: 'absolute', top: 24, left: 12, right: 12, flexDirection: 'row', gap: 6 },
  p: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
  pOn: { backgroundColor: '#fff' },
});
