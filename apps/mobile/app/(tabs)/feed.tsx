import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../store/theme-store';
import { useAuthStore } from '../../store/auth-store';
import { getTokens } from '../../lib/design';
import {
  listPosts,
  togglePostLike,
  listPostComments,
  addPostComment,
  getFileUrl,
  type FeedPost,
  type PostComment,
} from '../../lib/api';

const { height: SCREEN_H } = Dimensions.get('window');

function resolveImage(url: string): string {
  if (url.startsWith('http')) return url;
  const resolved = getFileUrl(url);
  return resolved ?? url;
}

export default function FeedScreen() {
  const theme = useThemeStore((s) => s.theme);
  const language = useAuthStore((s) => s.language) ?? 'uz';
  const tokens = getTokens(theme);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeCommentsFor, setActiveCommentsFor] = useState<FeedPost | null>(null);

  useEffect(() => {
    listPosts(undefined, 30)
      .then((res) => setPosts(res.items))
      .catch(() => setPosts([]))
      .finally(() => setLoaded(true));
  }, []);

  const feedData = useMemo(() => {
    if (!posts.length) return [];
    const loops = 4;
    const out: FeedPost[] = [];
    for (let i = 0; i < loops; i++) out.push(...posts);
    return out;
  }, [posts]);

  const onLike = useCallback(async (post: FeedPost) => {
    const nextLiked = !post.likedByMe;
    setPosts((ps) =>
      ps.map((p) =>
        p._id === post._id
          ? { ...p, likedByMe: nextLiked, likesCount: nextLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1) }
          : p,
      ),
    );
    try {
      await togglePostLike(post._id, nextLiked);
    } catch {
      setPosts((ps) => ps.map((p) => (p._id === post._id ? { ...p, likedByMe: post.likedByMe, likesCount: post.likesCount } : p)));
    }
  }, []);

  const onShare = useCallback(async (post: FeedPost) => {
    try {
      await Share.share({
        message: `${post.caption ?? ''}\nhttps://shifoyol.uz/posts/${post._id}`,
      });
    } catch {
      /* noop */
    }
  }, []);

  if (!loaded) {
    return (
      <View style={[styles.center, { backgroundColor: tokens.colors.background }]}>
        <ActivityIndicator color={tokens.brand.iris} size="large" />
      </View>
    );
  }

  if (!posts.length) {
    return (
      <SafeAreaView style={[{ flex: 1 }, { backgroundColor: tokens.colors.background }]} edges={['top']}>
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: tokens.colors.backgroundSecondary }]}>
            <Ionicons name="play-circle-outline" size={40} color={tokens.brand.iris} />
          </View>
          <Text style={[tokens.type.titleLg, { color: tokens.colors.text, textAlign: 'center', marginTop: 14 }]}>
            {language === 'uz' ? 'Lenta bo‘sh' : 'Лента пуста'}
          </Text>
          <Text style={{ color: tokens.colors.textTertiary, textAlign: 'center', marginTop: 6, paddingHorizontal: 40 }}>
            {language === 'uz'
              ? "Yaqinda salomatlik haqidagi postlar shu yerda ko'rinadi"
              : 'Скоро здесь появятся посты о здоровье'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <FlatList
        data={feedData}
        keyExtractor={(item, idx) => `${item._id}-${idx}`}
        pagingEnabled
        snapToInterval={SCREEN_H}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onLike={() => onLike(item)}
            onCommentOpen={() => setActiveCommentsFor(item)}
            onShare={() => onShare(item)}
            language={language}
          />
        )}
      />
      <CommentsModal
        post={activeCommentsFor}
        onClose={() => setActiveCommentsFor(null)}
        onCommentAdded={(postId) => {
          setPosts((ps) => ps.map((p) => (p._id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p)));
        }}
        language={language}
      />
    </View>
  );
}

function PostCard({
  post,
  onLike,
  onCommentOpen,
  onShare,
  language,
}: {
  post: FeedPost;
  onLike: () => void;
  onCommentOpen: () => void;
  onShare: () => void;
  language: string;
}) {
  return (
    <View style={[styles.card, { height: SCREEN_H }]}>
      <View style={styles.mediaWrap}>
        <Image source={{ uri: resolveImage(post.imageUrl) }} style={styles.mediaImage} resizeMode="contain" />
      </View>
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={onLike} activeOpacity={0.8}>
          <Ionicons name={post.likedByMe ? 'heart' : 'heart-outline'} size={30} color={post.likedByMe ? '#f43f5e' : '#fff'} />
          <Text style={styles.actionCount}>{post.likesCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onCommentOpen} activeOpacity={0.8}>
          <Ionicons name="chatbubble-outline" size={28} color="#fff" />
          <Text style={styles.actionCount}>{post.commentsCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onShare} activeOpacity={0.8}>
          <Ionicons name="share-social-outline" size={28} color="#fff" />
          <Text style={styles.actionCount}>{language === 'uz' ? 'Ulash' : 'Поделиться'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottom}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {(post.tags ?? []).slice(0, 4).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>#{tag}</Text>
            </View>
          ))}
        </View>
        {post.caption ? (
          <Text style={styles.caption} numberOfLines={3}>
            {post.caption}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function CommentsModal({
  post,
  onClose,
  onCommentAdded,
  language,
}: {
  post: FeedPost | null;
  onClose: () => void;
  onCommentAdded: (postId: string) => void;
  language: string;
}) {
  const theme = useThemeStore((s) => s.theme);
  const tokens = getTokens(theme);
  const [items, setItems] = useState<PostComment[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!post) return;
    if (loadedFor.current === post._id) return;
    loadedFor.current = post._id;
    listPostComments(post._id)
      .then(setItems)
      .catch(() => setItems([]));
  }, [post]);

  const send = async () => {
    if (!post || !text.trim()) return;
    setSending(true);
    try {
      const created = await addPostComment(post._id, text.trim());
      setItems((list) => [created, ...list]);
      onCommentAdded(post._id);
      setText('');
    } catch {
      /* noop */
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={!!post} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={[styles.modalSheet, { backgroundColor: tokens.colors.background }]}>
          <View style={styles.modalHandle} />
          <Text style={[tokens.type.titleLg, { color: tokens.colors.text, marginBottom: 14, paddingHorizontal: 20 }]}>
            {language === 'uz' ? 'Fikrlar' : 'Комментарии'} · {items.length}
          </Text>
          <FlatList
            data={items}
            keyExtractor={(i) => i._id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
            ListEmptyComponent={
              <Text style={{ color: tokens.colors.textTertiary, textAlign: 'center', padding: 20 }}>
                {language === 'uz' ? 'Hozircha fikrlar yo‘q' : 'Пока нет комментариев'}
              </Text>
            }
            renderItem={({ item }) => (
              <View style={{ paddingVertical: 10 }}>
                <Text style={{ color: tokens.colors.text, fontWeight: '700', fontSize: 13 }}>
                  {item.patientName ?? '—'}
                </Text>
                <Text style={{ color: tokens.colors.textSecondary, fontSize: 13, marginTop: 2 }}>{item.text}</Text>
              </View>
            )}
          />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.inputRow, { borderTopColor: tokens.colors.border, backgroundColor: tokens.colors.background }]}>
              <TextInput
                placeholder={language === 'uz' ? 'Fikr yozing...' : 'Написать комментарий...'}
                value={text}
                onChangeText={setText}
                style={[styles.inputField, { backgroundColor: tokens.colors.backgroundInput, color: tokens.colors.text }]}
                placeholderTextColor={tokens.colors.textPlaceholder ?? tokens.colors.textTertiary}
                editable={!sending}
              />
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: tokens.brand.iris, opacity: text.trim() && !sending ? 1 : 0.5 }]}
                onPress={send}
                disabled={!text.trim() || sending}
              >
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  card: { width: '100%', backgroundColor: '#111' },
  mediaWrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  actions: { position: 'absolute', right: 14, bottom: 160, gap: 22, alignItems: 'center' },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionCount: { color: '#fff', fontSize: 12, fontWeight: '700' },
  bottom: { position: 'absolute', left: 20, right: 80, bottom: 160 },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)' },
  caption: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: { height: '70%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8 },
  modalHandle: { width: 44, height: 4, borderRadius: 2, backgroundColor: '#d1d5db', alignSelf: 'center', marginBottom: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, borderTopWidth: StyleSheet.hairlineWidth },
  inputField: { flex: 1, height: 44, borderRadius: 22, paddingHorizontal: 16, fontSize: 14 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
