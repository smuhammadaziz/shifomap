import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type * as Notifications from 'expo-notifications';
import { registerPatientExpoPushToken } from './api';

async function ensureRemotePushPermission(Mod: typeof Notifications): Promise<boolean> {
  const cur = await Mod.getPermissionsAsync();
  if (cur.granted) return true;
  const req = await Mod.requestPermissionsAsync();
  return req.granted ?? false;
}

/**
 * Obtains Expo push token for remote notifications (doctor chat) and uploads to API.
 * Must run on a hardware device with notification permission for real tokens (simulator unreliable).
 */
export async function refreshExpoPushTokenOnBackend(): Promise<void> {
  if (Platform.OS === 'web') return;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;

  try {
    const Mod = await import('expo-notifications');
    const ok = await ensureRemotePushPermission(Mod);
    if (!ok) return;

    if (!projectId || typeof projectId !== 'string') {
      console.warn('[remote-push] Missing EAS projectId in app config (extra.eas.projectId)');
      return;
    }

    const { data } = await Mod.getExpoPushTokenAsync({ projectId });
    if (!data) return;

    await registerPatientExpoPushToken(data);
  } catch {
    /* physical device push token unavailable in some environments */
  }
}
