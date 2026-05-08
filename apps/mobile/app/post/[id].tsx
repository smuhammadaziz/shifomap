import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Share,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useThemeStore } from '../../store/theme-store';
import { useAuthStore } from '../../store/auth-store';
import { getTokens } from '../../lib/design';
import { IconButton } from '../../components/ui';
import {
  getPostById,
  togglePostLike,
  listPostComments,
  addPostComment,
  getFileUrl,
  type FeedPost,
  type PostComment,
} from '../../lib/api';

function resolveImage(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return getFileUrl(url) ?? url;
}

function commentDisplayName(c: PostComment, language: 'uz' | 'ru' | 'en'): string {
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

function commentTimeAgo(iso: string, language: 'uz' | 'ru' | 'en'): string {
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

const { width: SCREEN_W } = Dimensions.get('window');

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useThemeStore((s) => s.theme);
  const language = (useAuthStore((s) => s.language) ?? 'uz') as 'uz' | 'ru' | 'en';
  const tokens = getTokens(theme);
  const tr = (u: string, r: string, e: string) => (language === 'uz' ? u : language === 'ru' ? r : e);

  const [post, setPost] = useState<FeedPost | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  const sliderRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([getPostById(id), listPostComments(id)])
      .then(([p, c]) => {
        setPost(p);
        setComments(c);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const onLike = async () => {
    if (!post) return;
    const next = !post.likedByMe;
    setPost({ ...post, likedByMe: next, likesCount: next ? post.likesCount + 1 : Math.max(0, post.likesCount - 1) });
    try {
      await togglePostLike(post._id, next);
    } catch {
      setPost((p) => (p ? { ...p, likedByMe: !next, likesCount: next ? p.likesCount - 1 : p.likesCount + 1 } : p));
    }
  };

  const onShare = async () => {
    if (!post) return;
    try {
      await Share.share({ message: `${post.caption ?? ''}\nhttps://shifoyol.uz/posts/${post._id}` });
    } catch {
      /* noop */
    }
  };

  const send = async () => {
    if (!post || !text.trim()) return;
    setSending(true);
    try {
      const created = await addPostComment(post._id, text.trim());
      setComments((list) => [created, ...list]);
      setPost((p) => (p ? { ...p, commentsCount: p.commentsCount + 1 } : p));
      setText('');
    } finally {
      setSending(false);
    }
  };

  const imageUrls = post.imageUrls?.length ? post.imageUrls : [post.imageUrl];
  const goToImage = (next: number) => {
    const clamped = Math.max(0, Math.min(imageUrls.length - 1, next));
    sliderRef.current?.scrollTo({ x: clamped * SCREEN_W, animated: true });
    setImgIndex(clamped);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: tokens.colors.background }]}>
        <ActivityIndicator color={tokens.brand.iris} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.center, { backgroundColor: tokens.colors.background }]}>
        <Text style={{ color: tokens.colors.text }}>{tr('Topilmadi', 'Не найдено', 'Not found')}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: tokens.colors.background }}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text style={[tokens.type.title, { color: tokens.colors.text }]}>{tr('Post', 'Пост', 'Post')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.sliderWrap}>
          {(post.imageUrls?.length ?? 1) > 1 ? (
            <ScrollView
              ref={sliderRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                const x = e.nativeEvent.contentOffset.x;
                setImgIndex(Math.round(x / SCREEN_W));
              }}
            >
              {(post.imageUrls ?? [post.imageUrl]).map((u, i) => (
                <Image key={`${u}-${i}`} source={{ uri: resolveImage(u) }} style={styles.image} resizeMode="contain" />
              ))}
            </ScrollView>
          ) : (
            <Image source={{ uri: resolveImage(post.imageUrl) }} style={styles.image} resizeMode="contain" />
          )}
          {(post.imageUrls?.length ?? 1) > 1 ? (
            <>
              <TouchableOpacity style={[styles.navBtn, styles.navLeft]} activeOpacity={0.85} onPress={() => goToImage(imgIndex - 1)}>
                <Ionicons name="chevron-back" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.navBtn, styles.navRight]} activeOpacity={0.85} onPress={() => goToImage(imgIndex + 1)}>
                <Ionicons name="chevron-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </>
          ) : null}
          {(post.imageUrls?.length ?? 1) > 1 ? (
            <View style={styles.slideDots}>
              {(post.imageUrls ?? []).map((_, i) => (
                <View key={i} style={[styles.slideDot, i === imgIndex ? styles.slideDotActive : null]} />
              ))}
            </View>
          ) : null}
        </View>

        <View style={{ padding: 20, gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 20, alignItems: 'center' }}>
            <TouchableOpacity onPress={onLike} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name={post.likedByMe ? 'heart' : 'heart-outline'} size={26} color={post.likedByMe ? '#f43f5e' : tokens.colors.text} />
              <Text style={{ color: tokens.colors.text, fontWeight: '700' }}>{post.likesCount}</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="chatbubble-outline" size={24} color={tokens.colors.text} />
              <Text style={{ color: tokens.colors.text, fontWeight: '700' }}>{post.commentsCount}</Text>
            </View>
            <TouchableOpacity onPress={onShare} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="share-social-outline" size={24} color={tokens.colors.text} />
              <Text style={{ color: tokens.colors.text, fontWeight: '700' }}>{tr('Ulash', 'Поделиться', 'Share')}</Text>
            </TouchableOpacity>
          </View>

          {post.tags?.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {post.tags.map((t) => (
                <View key={t} style={[styles.tag, { backgroundColor: tokens.brand.iris + '1a' }]}>
                  <Text style={{ color: tokens.brand.iris, fontSize: 12, fontWeight: '700' }}>#{t}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {post.caption ? (
            <Text style={{ color: tokens.colors.text, fontSize: 14, lineHeight: 22 }}>{post.caption}</Text>
          ) : null}

          <Text style={[tokens.type.title, { color: tokens.colors.text, marginTop: 10 }]}>
            {tr('Fikrlar', 'Комментарии', 'Comments')} · {comments.length}
          </Text>

          {comments.length === 0 ? (
            <Text style={{ color: tokens.colors.textTertiary }}>
              {tr('Birinchi bo‘lib fikr bildiring', 'Оставьте первый комментарий', 'Be the first to comment')}
            </Text>
          ) : (
            comments.map((c) => {
              const name = commentDisplayName(c, language);
              const initial = (name[0] ?? '?').toUpperCase();
              const avatar = c.patientAvatar ? resolveImage(c.patientAvatar) : null;
              return (
                <View key={c._id} style={styles.commentRow}>
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
                        {commentTimeAgo(c.createdAt, language)}
                      </Text>
                    </View>
                    <Text style={{ color: tokens.colors.text, fontSize: 14, marginTop: 2, lineHeight: 19 }}>
                      {c.text}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <View style={[styles.composer, { backgroundColor: tokens.colors.background, borderTopColor: tokens.colors.border, paddingBottom: insets.bottom + 10 }]}>
        <TextInput
          placeholder={tr('Fikr yozing...', 'Написать комментарий...', 'Write a comment...')}
          value={text}
          onChangeText={setText}
          editable={!sending}
          style={[styles.input, { backgroundColor: tokens.colors.backgroundInput, color: tokens.colors.text, borderColor: tokens.colors.border }]}
          placeholderTextColor={tokens.colors.textTertiary}
        />
        <TouchableOpacity
          onPress={send}
          disabled={!text.trim() || sending}
          style={[styles.sendBtn, { backgroundColor: tokens.brand.iris, opacity: text.trim() && !sending ? 1 : 0.5 }]}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: { paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sliderWrap: { width: SCREEN_W, aspectRatio: 1, backgroundColor: '#000' },
  image: { width: SCREEN_W, aspectRatio: 1 },
  slideDots: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  slideDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
  slideDotActive: { width: 18, backgroundColor: '#fff' },
  navBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLeft: { left: 10 },
  navRight: { right: 10 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  composer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    padding: 12,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, height: 44, borderRadius: 22, paddingHorizontal: 16, fontSize: 14, borderWidth: StyleSheet.hairlineWidth },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
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
});
