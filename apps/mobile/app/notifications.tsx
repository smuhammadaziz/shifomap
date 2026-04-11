import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/auth-store';
import { useThemeStore } from '../store/theme-store';
import { getTranslations } from '../lib/translations';
import { getColors } from '../lib/theme';
import { useNotificationStore, type NotificationItem } from '../store/notification-store';

const CATEGORIES = ['all', 'reminders', 'clinicsTab', 'system'] as const;

export default function NotificationsScreen() {
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const theme = useThemeStore((s) => s.theme);
  const t = getTranslations(language);
  const colors = getColors(theme);
  const insets = useSafeAreaInsets();

  const { notifications, clearAll, removeNotification, markAsRead, markAllAsRead, hydrate } = useNotificationStore();
  const [activeCategory, setActiveCategory] = useState<typeof CATEGORIES[number]>('all');

  useEffect(() => {
    hydrate();
    // When visiting this screen, we could mark all as read.
    // Uncomment if desired:
    // markAllAsRead();
  }, [hydrate]);

  const filteredNotifications = useMemo(() => {
    if (activeCategory === 'all') return notifications;
    if (activeCategory === 'reminders') return notifications.filter(n => n.type === 'reminder');
    if (activeCategory === 'clinicsTab') return notifications.filter(n => n.type === 'clinic');
    if (activeCategory === 'system') return notifications.filter(n => n.type === 'system');
    return notifications;
  }, [activeCategory, notifications]);

  const sections = useMemo(() => {
    const now = Date.now();
    const todayCutoff = new Date().setHours(0, 0, 0, 0);
    const yesterdayCutoff = todayCutoff - 24 * 60 * 60 * 1000;

    const today = filteredNotifications.filter(n => n.time >= todayCutoff);
    const yesterday = filteredNotifications.filter(n => n.time >= yesterdayCutoff && n.time < todayCutoff);
    const older = filteredNotifications.filter(n => n.time < yesterdayCutoff);

    return [
      { title: t.today?.toUpperCase() || 'TODAY', data: today },
      { title: t.yesterday?.toUpperCase() || 'YESTERDAY', data: yesterday },
      { title: 'OLDER', data: older },
    ].filter(s => s.data.length > 0);
  }, [filteredNotifications, t]);

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 1000 / 60);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const renderNotification = (item: NotificationItem) => {
    const IconLib = item.iconLib === 'Ionicons' ? Ionicons : MaterialCommunityIcons;
    return (
      <View key={item.id} style={[styles.card, { backgroundColor: colors.backgroundCard, shadowColor: colors.text }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: item.iconColor + '15' }]}>
            <IconLib name={item.icon as any} size={22} color={item.iconColor} />
          </View>
          <View style={styles.cardTextContent}>
            <View style={styles.cardTitleRow}>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
              {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: colors.primaryLight }]} />}
            </View>
            <Text style={[styles.cardTime, { color: colors.textTertiary }]}>{formatTimeAgo(item.time)}</Text>
          </View>
        </View>
        
        <Text style={[styles.cardMessage, { color: colors.textSecondary }]}>{item.message}</Text>
        
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.primaryBg }]}
            activeOpacity={0.7}
            onPress={() => markAsRead(item.id)}
          >
            <Text style={[styles.actionBtnText, { color: colors.primaryLight }]}>{t.viewDetail || 'View Detail'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.backgroundSecondary }]}
            activeOpacity={0.7}
            onPress={() => removeNotification(item.id)}
          >
            <Text style={[styles.actionBtnSecondaryText, { color: colors.textSecondary }]}>{t.dismiss || 'Dismiss'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Improved Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={[styles.backBtn, { backgroundColor: colors.backgroundSecondary }]} 
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{t.notificationsTitle || 'Notifications'}</Text>
        <TouchableOpacity onPress={clearAll} hitSlop={12}>
          <Text style={[styles.clearBtn, { color: colors.primaryLight }]}>{t.clearAll || 'CLEAR ALL'}</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScrollContent}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={[
                styles.tab,
                activeCategory === cat 
                  ? { backgroundColor: colors.primary, borderColor: colors.primary } 
                  : { backgroundColor: colors.backgroundCard, borderColor: colors.border }
              ]}
            >
              <Text 
                style={[
                  styles.tabText, 
                  activeCategory === cat ? { color: '#fff' } : { color: colors.textSecondary }
                ]}
              >
                {t[cat] || cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]} showsVerticalScrollIndicator={false}>
        {sections.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.backgroundSecondary }]}>
              <Ionicons name="notifications-off-outline" size={48} color={colors.textTertiary} />
            </View>
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>{t.noResultsFound || 'No notifications'}</Text>
          </View>
        ) : (
          sections.map(section => (
            <View key={section.title} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{section.title}</Text>
              {section.data.map(item => renderNotification(item))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 60,
    gap: 12, // Ensure space between components
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20, // Slightly smaller to prevent wrap
    fontWeight: '700',
    flex: 1,
  },
  clearBtn: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tabsContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  tabsScrollContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextContent: {
    flex: 1,
    marginLeft: 14,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 10,
  },
  cardTime: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  cardMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    minWidth: 100,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtnSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
