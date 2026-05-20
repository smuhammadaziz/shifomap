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
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
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

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');
/** Pagination dots sit above caption + safe area (visible, not under UI). */
const SLIDE_DOTS_BOTTOM = 108;

function resolveImage(url: string): string {
  if (url.startsWith('http')) return url;
  const resolved = getFileUrl(url);
  return resolved ?? url;
}

function PostImageSlider({ imageUrls }: { imageUrls: string[] }) {
  const safeUrls = imageUrls.filter(Boolean);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [safeUrls.length]);

  if (safeUrls.length <= 1) {
    const uri = safeUrls[0] ?? '';
    return (
      <View style={{ width: '100%', height: '100%' }}>
        <Image source={{ uri: resolveImage(uri) }} style={styles.mediaImage} resizeMode="contain" />
      </View>
    );
  }

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const next = Math.round(x / SCREEN_W);
    if (next !== index) setIndex(next);
  };

  return (
    <View style={{ width: '100%', height: '100%' }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        directionalLockEnabled
        nestedScrollEnabled
        scrollEventThrottle={16}
        onMomentumScrollEnd={onScroll}
      >
        {safeUrls.map((u, i) => (
          <Image key={`${u}-${i}`} source={{ uri: resolveImage(u) }} style={styles.mediaImage} resizeMode="contain" />
        ))}
      </ScrollView>
      <View style={[styles.slideDots, { bottom: SLIDE_DOTS_BOTTOM }]}>
        {safeUrls.map((_, i) => (
          <View key={i} style={[styles.slideDot, i === index ? styles.slideDotActive : null]} />
        ))}
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const theme = useThemeStore((s) => s.theme);
  const language = useAuthStore((s) => s.language) ?? 'uz';
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
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
        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + 8 }]}
          onPress={() => navigation.navigate('index' as never)}
          activeOpacity={0.85}
        >
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
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
            bottomInset={insets.bottom}
            onLike={() => onLike(item)}
            onCommentOpen={() => setActiveCommentsFor(item)}
            onShare={() => onShare(item)}
            language={language}
          />
        )}
      />

      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 8 }]}
        onPress={() => navigation.navigate('index' as never)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={language === 'uz' ? 'Orqaga' : 'Назад'}
      >
        <Ionicons name="chevron-back" size={26} color="#fff" />
      </TouchableOpacity>

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
  bottomInset,
  onLike,
  onCommentOpen,
  onShare,
  language,
}: {
  post: FeedPost;
  bottomInset: number;
  onLike: () => void;
  onCommentOpen: () => void;
  onShare: () => void;
  language: string;
}) {
  const imageUrls = post.imageUrls?.length ? post.imageUrls : [post.imageUrl];
  const footerBottom = Math.max(bottomInset, 12) + 16;

  return (
    <View style={[styles.card, { height: SCREEN_H }]}>
      <View style={styles.mediaWrap}>
        <PostImageSlider imageUrls={imageUrls} />
      </View>
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.75)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <View style={[styles.actionsRail, { bottom: footerBottom + 72 }]}>
        <TouchableOpacity style={styles.railBtn} onPress={onLike} activeOpacity={0.75}>
          <Ionicons
            name={post.likedByMe ? 'heart' : 'heart-outline'}
            size={30}
            color={post.likedByMe ? '#f43f5e' : '#fff'}
          />
          <Text style={styles.railCount}>{post.likesCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.railBtn} onPress={onCommentOpen} activeOpacity={0.75}>
          <Ionicons name="chatbubble-outline" size={28} color="#fff" />
          <Text style={styles.railCount}>{post.commentsCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.railBtn} onPress={onShare} activeOpacity={0.75}>
          <Ionicons name="paper-plane-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={[styles.footer, { bottom: footerBottom, paddingRight: 64 }]}>
        {(post.tags ?? []).length > 0 ? (
          <View style={styles.tagsRow}>
            {(post.tags ?? []).slice(0, 4).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {post.caption ? (
          <Text style={styles.caption} numberOfLines={4}>
            {post.caption}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function commentDisplayName(c: PostComment, language: string): string {
  const name = c.patientName?.trim();
  if (name) return name;
  const phone = c.patientPhone?.trim();
  if (phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 4) return `+${digits.slice(0, -4)} ··· ${digits.slice(-4)}`.replace(/^\+\s/, '+');
    return phone;
  }
  return language === 'uz' ? 'Foydalanuvchi' : language === 'ru' ? 'Пользователь' : 'User';
}

function commentTimeAgo(iso: string, language: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (language === 'ru') {
    if (diffSec < 60) return 'только что';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} мин`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} ч`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} д`;
    return `${Math.floor(diffSec / 604800)} нед`;
  }
  if (diffSec < 60) return 'hozir';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} daq`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} soat`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} kun`;
  return `${Math.floor(diffSec / 604800)} hafta`;
}

function CommentRow({ item, language, tokens }: { item: PostComment; language: string; tokens: ReturnType<typeof getTokens> }) {
  const name = commentDisplayName(item, language);
  const initial = (name[0] ?? '?').toUpperCase();
  const avatar = item.patientAvatar ? resolveImage(item.patientAvatar) : null;
  return (
    <View style={styles.commentRow}>
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.commentAvatar} />
      ) : (
        <View style={[styles.commentAvatar, { backgroundColor: tokens.brand.iris, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>{initial}</Text>
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text style={{ color: tokens.colors.text, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>
            {name}
          </Text>
          <Text style={{ color: tokens.colors.textTertiary, fontSize: 11 }}>
            {commentTimeAgo(item.createdAt, language)}
          </Text>
        </View>
        <Text style={{ color: tokens.colors.text, fontSize: 14, marginTop: 2, lineHeight: 19 }}>
          {item.text}
        </Text>
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
  const insets = useSafeAreaInsets();
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
        keyboardVerticalOffset={0}
      >
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={[styles.modalSheet, { backgroundColor: tokens.colors.background }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={[tokens.type.titleLg, { color: tokens.colors.text }]}>
              {language === 'uz' ? 'Fikrlar' : 'Комментарии'} · {items.length}
            </Text>
          </View>
          <FlatList
            data={items}
            keyExtractor={(i) => i._id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListEmptyComponent={
              <View style={{ alignItems: 'center', padding: 28 }}>
                <View style={{
                  width: 56, height: 56, borderRadius: 18,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: tokens.colors.backgroundSecondary,
                }}>
                  <Ionicons name="chatbubble-outline" size={24} color={tokens.brand.iris} />
                </View>
                <Text style={{ color: tokens.colors.text, fontWeight: '700', fontSize: 14, marginTop: 12 }}>
                  {language === 'uz' ? 'Hozircha fikrlar yo‘q' : 'Пока нет комментариев'}
                </Text>
                <Text style={{ color: tokens.colors.textTertiary, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                  {language === 'uz' ? 'Birinchi bo‘lib fikr bildiring' : 'Будьте первым, кто оставит комментарий'}
                </Text>
              </View>
            }
            renderItem={({ item }) => <CommentRow item={item} language={language} tokens={tokens} />}
          />
          <View
            style={[
              styles.inputRow,
              {
                borderTopColor: tokens.colors.border,
                backgroundColor: tokens.colors.background,
                paddingBottom: 10 + (Platform.OS === 'ios' ? insets.bottom : 0),
              },
            ]}
          >
            <TextInput
              placeholder={language === 'uz' ? 'Fikr yozing...' : 'Написать комментарий...'}
              value={text}
              onChangeText={setText}
              style={[
                styles.inputField,
                {
                  backgroundColor: tokens.colors.backgroundInput,
                  color: tokens.colors.text,
                  borderColor: tokens.colors.border,
                },
              ]}
              placeholderTextColor={tokens.colors.textPlaceholder ?? tokens.colors.textTertiary}
              editable={!sending}
              multiline
              maxLength={500}
              returnKeyType="send"
              blurOnSubmit
              onSubmitEditing={send}
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: tokens.brand.iris, opacity: text.trim() && !sending ? 1 : 0.5 }]}
              onPress={send}
              disabled={!text.trim() || sending}
              activeOpacity={0.85}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  backBtn: {
    position: 'absolute',
    left: 12,
    zIndex: 30,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { width: '100%', backgroundColor: '#111' },
  mediaWrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaImage: { width: SCREEN_W, height: '100%' },
  slideDots: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    zIndex: 8,
  },
  slideDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
  slideDotActive: { width: 18, backgroundColor: '#fff' },
  actionsRail: {
    position: 'absolute',
    right: 14,
    alignItems: 'center',
    gap: 22,
    zIndex: 12,
  },
  railBtn: {
    alignItems: 'center',
    gap: 4,
  },
  railCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  footer: {
    position: 'absolute',
    left: 16,
    gap: 10,
    zIndex: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  tagText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  caption: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    height: '75%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    overflow: 'hidden',
  },
  modalHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
    alignSelf: 'center',
    marginBottom: 6,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.18)',
    marginBottom: 4,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1422AE',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputField: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
