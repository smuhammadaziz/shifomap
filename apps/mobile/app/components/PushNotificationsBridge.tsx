import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

/**
 * Navigates to /chat/[id] when patient taps Expo Push (doctor message).
 */
export function PushNotificationsBridge() {
  const router = useRouter();
  const last = Notifications.useLastNotificationResponse();
  const handledTap = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!last?.notification?.request?.content?.data) return;
    if (last.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;

    const raw = last.notification.request.content.data;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
    const data = raw as Record<string, unknown>;

    if (data.type !== 'chat_message') return;
    const conversationId =
      typeof data.conversationId === 'string' ? data.conversationId : null;
    if (!conversationId?.trim()) return;

    const tapKey = `${last.notification.request.identifier}-${conversationId}`;
    if (handledTap.current === tapKey) return;
    handledTap.current = tapKey;

    router.push({ pathname: '/chat/[id]', params: { id: conversationId } });
    void Notifications.clearLastNotificationResponseAsync();
  }, [last, router]);

  return null;
}
