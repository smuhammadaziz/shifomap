import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { CustomReminder } from './api';

/** AsyncStorage: user allows local pill alarms (Settings → pill reminders). Default true. */
export const PILLS_LOCAL_NOTIF_KEY = '@shifo_pills_local_notif_enabled';

/** Stable notification request ids so reschedule replaces instead of duplicating */
const PILL_IDENTIFIER_PREFIX = 'shifo-pill-reminder-';

/** content.data.type filter + notification channel */
const DATA_TYPE = 'pill-reminder';
const ANDROID_CHANNEL_ID = 'pill-reminders';

/** Only web has no native notification APIs. Do not exclude Expo Go — reminders must load there too. */
function canUseNativePillNotifications(): boolean {
  return Platform.OS !== 'web';
}

let cachedNotifications: typeof import('expo-notifications') | undefined;

async function loadNotifications(): Promise<typeof import('expo-notifications') | null> {
  if (!canUseNativePillNotifications()) return null;
  if (cachedNotifications) return cachedNotifications;
  cachedNotifications = await import('expo-notifications');
  return cachedNotifications;
}

let androidChannelReady = false;

async function ensureAndroidChannel(N: typeof import('expo-notifications')): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (androidChannelReady) return;
  await N.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Pill reminders',
    importance: N.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    sound: 'default',
    bypassDnd: false,
  });
  androidChannelReady = true;
}

/** Foreground banner behavior (standalone + Expo Go). */
export async function initPillNotificationsForeground(): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Onboarding: opens the system Allow / Don't allow sheet (Android + iOS).
 * @returns whether alerts are allowed after the prompt (or already were).
 */
export async function promptNotificationPermissionInOnboarding(): Promise<boolean> {
  if (!canUseNativePillNotifications()) return false;
  const Notifications = await loadNotifications();
  if (!Notifications) return false;

  await ensureAndroidChannel(Notifications);

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;

  const result = await Notifications.requestPermissionsAsync();
  return result.granted ?? false;
}

export async function getPillsLocalNotificationsEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(PILLS_LOCAL_NOTIF_KEY);
    if (v === null) return true;
    return v === 'true';
  } catch {
    return true;
  }
}

export async function setPillsLocalNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(PILLS_LOCAL_NOTIF_KEY, enabled ? 'true' : 'false');
}

/** HH:mm → hour/minute in local time (0–23 / 0–59) */
export function parseReminderTime(time: string): { hour: number; minute: number } | null {
  if (!/^\d{2}:\d{2}$/.test(time)) return null;
  const [h, m] = time.split(':').map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { hour: h, minute: m };
}

async function cancelScheduledPillRemindersByPrefix(): Promise<void> {
  if (Platform.OS === 'web') return;
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((req) => req.identifier.startsWith(PILL_IDENTIFIER_PREFIX))
      .map((req) => Notifications.cancelScheduledNotificationAsync(req.identifier))
  );
}

/** Clears all local pill schedules (e.g. logout). */
export async function cancelAllScheduledPillReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  await cancelScheduledPillRemindersByPrefix();
}

export async function ensurePillNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const Notifications = await loadNotifications();
  if (!Notifications) return false;

  await ensureAndroidChannel(Notifications);

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;

  const req = await Notifications.requestPermissionsAsync();
  return req.granted ?? false;
}

/**
 * Reconciles OS scheduled notifications with server reminder list.
 * Call after loading reminders, when toggling settings, or after login.
 */
export async function syncPillReminderNotifications(reminders: CustomReminder[]): Promise<void> {
  if (Platform.OS === 'web') return;

  const optedIn = await getPillsLocalNotificationsEnabled();
  const Notifications = await loadNotifications();
  if (!Notifications) return;

  await ensureAndroidChannel(Notifications);

  if (!optedIn) {
    await cancelScheduledPillRemindersByPrefix();
    return;
  }

  const granted = await ensurePillNotificationPermissions();
  if (!granted) {
    await cancelScheduledPillRemindersByPrefix();
    return;
  }

  await cancelScheduledPillRemindersByPrefix();

  const active = reminders.filter((r) => r.isActive !== false);
  await Promise.all(
    active.map(async (r) => {
      const parsed = parseReminderTime(r.time);
      if (!parsed) return;

      const note = r.notes?.trim();
      const body = note ? `${r.time} • ${note}` : r.time;

      await Notifications.scheduleNotificationAsync({
        identifier: `${PILL_IDENTIFIER_PREFIX}${r.id}`,
        content: {
          title: r.pillName,
          body,
          data: {
            type: DATA_TYPE,
            reminderId: r.id,
          },
          sound: true,
          ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: parsed.hour,
          minute: parsed.minute,
          ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
        },
      });
    })
  );
}
