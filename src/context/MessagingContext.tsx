/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { STUDENT_PROFILES } from '../data/courses';
import { useAuth } from './AuthContext';
import {
  getSupabaseClient,
  getSupabaseConfigError,
  hasSupabaseConfig,
  isLocalDemoModeEnabled,
  supabaseRpc,
} from '../lib/supabase';
import { PASSWORD_INQUIRY_MESSAGE_PREFIX } from '../constants/messaging';

export interface AdvisorMessage {
  id: string;
  clientMessageId: string;
  senderId: string;
  recipientId: string;
  body: string;
  sentAt: string;
  readAt: string | null;
  kind: 'message' | 'assistance' | 'password_inquiry';
  optimistic?: boolean;
}

interface SendMessageInput {
  senderId: string;
  recipientId: string;
  body: string;
}

interface MessageSendResult {
  success: boolean;
  error?: string;
  message?: AdvisorMessage;
}

export interface AssistanceNotification {
  id: string;
  senderId: string;
  recipientId: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  kind: 'message' | 'assistance' | 'password_inquiry';
  senderId: string;
  recipientId: string;
  createdAt: string;
}

interface AssistanceRequestResult {
  success: boolean;
  error?: string;
}

interface MessagingContextValue {
  messages: AdvisorMessage[];
  notifications: AppNotification[];
  toastNotifications: AppNotification[];
  isMessagingReady: boolean;
  getAssignedAdvisorId: (studentId: string) => string | null;
  getAdviseeIds: (advisorId: string) => string[];
  getConversationMessages: (userId: string, otherUserId: string) => AdvisorMessage[];
  getUnreadMessageCount: (userId: string) => number;
  dismissNotification: (notificationId: string) => void;
  dismissNotificationToast: (notificationId: string) => void;
  markConversationRead: (otherUserId: string) => Promise<void>;
  sendAssistanceRequest: (input: { senderId: string; recipientId: string }) => Promise<AssistanceRequestResult>;
  sendMessage: (input: SendMessageInput) => Promise<MessageSendResult>;
}

interface RemoteMessageRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  sent_at: string;
  read_at: string | null;
  client_message_id: string | null;
}

interface StudentProfileRelation {
  user_id: string;
  advisor_id: string | null;
}

interface MessageCreatedBroadcast {
  messageId: string;
  clientMessageId: string;
  senderId: string;
  recipientId: string;
  sentAt: string;
}

interface MessageReadBroadcast {
  viewerId: string;
  otherUserId: string;
  readAt: string;
}

interface AssistanceRequestBroadcast {
  senderId: string;
  recipientId: string;
  requestedAt: string;
}

const BROADCAST_EVENT_CREATED = 'message.created';
const BROADCAST_EVENT_READ = 'message.read';
const BROADCAST_EVENT_ASSISTANCE = 'assistance.request';
const NOTIFICATIONS_SESSION_KEY = 'smart-advisor-notifications-v1';
const MAX_NOTIFICATIONS = 5;
const ASSISTANCE_MESSAGE_BODY = '__smart_advisor_assistance_request__';
const FALLBACK_RELATIONSHIPS = STUDENT_PROFILES.map((profile) => ({
  userId: profile.id,
  advisorId: profile.advisorId || null,
}));

const MessagingContext = createContext<MessagingContextValue | null>(null);

function createClientId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getMessageKind(body: string) {
  if (body === ASSISTANCE_MESSAGE_BODY) {
    return 'assistance' as const;
  }

  if (body.startsWith(PASSWORD_INQUIRY_MESSAGE_PREFIX)) {
    return 'password_inquiry' as const;
  }

  return 'message' as const;
}

function getMessageMergeKey(message: AdvisorMessage) {
  return message.clientMessageId || message.id;
}

function choosePreferredMessage(existing: AdvisorMessage, incoming: AdvisorMessage) {
  if (existing.optimistic && !incoming.optimistic) {
    return { ...existing, ...incoming, optimistic: false };
  }

  if (!existing.optimistic && incoming.optimistic) {
    return existing;
  }

  return {
    ...existing,
    ...incoming,
    readAt: incoming.readAt ?? existing.readAt,
    optimistic: Boolean(existing.optimistic && incoming.optimistic),
  };
}

function mergeMessages(...sources: AdvisorMessage[][]) {
  const deduped = new Map<string, AdvisorMessage>();

  sources.forEach((source) => {
    source.forEach((message) => {
      const key = getMessageMergeKey(message);
      const existing = deduped.get(key);
      deduped.set(key, existing ? choosePreferredMessage(existing, message) : message);
    });
  });

  return [...deduped.values()].sort((left, right) => {
    const timeCompare = left.sentAt.localeCompare(right.sentAt);
    if (timeCompare !== 0) {
      return timeCompare;
    }

    return left.id.localeCompare(right.id);
  });
}

function areMessagesEqual(left: AdvisorMessage[], right: AdvisorMessage[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((message, index) => {
    const other = right[index];
    return Boolean(other)
      && message.id === other.id
      && message.clientMessageId === other.clientMessageId
      && message.senderId === other.senderId
      && message.recipientId === other.recipientId
      && message.body === other.body
      && message.sentAt === other.sentAt
      && (message.readAt ?? null) === (other.readAt ?? null)
      && message.kind === other.kind
      && Boolean(message.optimistic) === Boolean(other.optimistic);
  });
}

function mapRemoteMessage(row: RemoteMessageRow, userIdByAppUserId: Record<string, string>) {
  const senderId = userIdByAppUserId[row.sender_id];
  const recipientId = userIdByAppUserId[row.recipient_id];

  if (!senderId || !recipientId) {
    return null;
  }

  return {
    id: row.id,
    clientMessageId: row.client_message_id ?? row.id,
    senderId,
    recipientId,
    body: row.body,
    sentAt: row.sent_at,
    readAt: row.read_at,
    kind: getMessageKind(row.body),
    optimistic: false,
  } satisfies AdvisorMessage;
}

function applyRead(messages: AdvisorMessage[], viewerId: string, otherUserId: string, readAt: string) {
  return messages.map((message) =>
    message.recipientId === viewerId && message.senderId === otherUserId && !message.readAt
      ? { ...message, readAt }
      : message
  );
}

function loadStoredNotifications() {
  if (typeof window === 'undefined') {
    return [] as AppNotification[];
  }

  try {
    const raw = window.sessionStorage.getItem(NOTIFICATIONS_SESSION_KEY);
    if (!raw) {
      return [] as AppNotification[];
    }

    const parsed = JSON.parse(raw) as AppNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as AppNotification[];
  }
}

function upsertNotification(
  notifications: AppNotification[],
  notification: AppNotification
) {
  const deduped = new Map<string, AppNotification>();
  [...notifications, notification].forEach((item) => {
    const existing = deduped.get(item.id);
    if (!existing || existing.createdAt.localeCompare(item.createdAt) < 0) {
      deduped.set(item.id, item);
    }
  });

  return [...deduped.values()]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, MAX_NOTIFICATIONS);
}

function buildNotificationFromMessage(message: AdvisorMessage) {
  return {
    id: `${message.kind}:${message.id}`,
    kind: message.kind,
    senderId: message.senderId,
    recipientId: message.recipientId,
    createdAt: message.sentAt,
  } satisfies AppNotification;
}

function buildUnreadMessageNotifications(messages: AdvisorMessage[], userId: string) {
  return messages
    .filter((message) => message.recipientId === userId && !message.readAt)
    .map(buildNotificationFromMessage)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, MAX_NOTIFICATIONS);
}

function mergeNotifications(...sources: AppNotification[][]) {
  return sources.reduce((current, source) => source.reduce(upsertNotification, current), [] as AppNotification[]);
}

function resolveAssignedAdvisorId(
  studentId: string,
  relationships: StudentProfileRelation[],
  appUserIdByUserId: Record<string, string>,
  userIdByAppUserId: Record<string, string>
) {
  const fallbackAdvisorId = FALLBACK_RELATIONSHIPS.find((profile) => profile.userId === studentId)?.advisorId ?? null;
  if (relationships.length === 0) {
    return fallbackAdvisorId;
  }

  const studentAppUserId = appUserIdByUserId[studentId];
  if (!studentAppUserId) {
    return fallbackAdvisorId;
  }

  const relation = relationships.find((profile) => profile.user_id === studentAppUserId);
  if (!relation?.advisor_id) {
    return fallbackAdvisorId;
  }

  return userIdByAppUserId[relation.advisor_id] ?? fallbackAdvisorId;
}

function resolveAdviseeIds(
  advisorId: string,
  relationships: StudentProfileRelation[],
  appUserIdByUserId: Record<string, string>,
  userIdByAppUserId: Record<string, string>
) {
  const fallbackAdviseeIds = FALLBACK_RELATIONSHIPS
    .filter((profile) => profile.advisorId === advisorId)
    .map((profile) => profile.userId);

  if (relationships.length === 0) {
    return fallbackAdviseeIds;
  }

  const advisorAppUserId = appUserIdByUserId[advisorId];
  if (!advisorAppUserId) {
    return fallbackAdviseeIds;
  }

  const remoteAdviseeIds = relationships
    .filter((profile) => profile.advisor_id === advisorAppUserId)
    .map((profile) => userIdByAppUserId[profile.user_id])
    .filter(Boolean) as string[];

  return remoteAdviseeIds.length > 0 ? remoteAdviseeIds : fallbackAdviseeIds;
}

function isMessagePairAllowed(
  senderId: string,
  recipientId: string,
  relationships: StudentProfileRelation[],
  appUserIdByUserId: Record<string, string>,
  userIdByAppUserId: Record<string, string>
) {
  const senderAdvisorId = resolveAssignedAdvisorId(senderId, relationships, appUserIdByUserId, userIdByAppUserId);
  const recipientAdvisorId = resolveAssignedAdvisorId(recipientId, relationships, appUserIdByUserId, userIdByAppUserId);
  return senderAdvisorId === recipientId || recipientAdvisorId === senderId;
}

function getConversationTopic(leftAppUserId: string, rightAppUserId: string) {
  const [first, second] = [leftAppUserId, rightAppUserId].toSorted();
  return `chat:pair:${first}:${second}`;
}

function buildConversationTopics(
  currentUserId: string,
  currentRole: string,
  relationships: StudentProfileRelation[],
  appUserIdByUserId: Record<string, string>,
  userIdByAppUserId: Record<string, string>
) {
  const currentAppUserId = appUserIdByUserId[currentUserId];
  if (!currentAppUserId) {
    return [] as string[];
  }

  if (currentRole === 'student') {
    const advisorId = resolveAssignedAdvisorId(currentUserId, relationships, appUserIdByUserId, userIdByAppUserId);
    const advisorAppUserId = advisorId ? appUserIdByUserId[advisorId] : null;
    return advisorAppUserId ? [getConversationTopic(currentAppUserId, advisorAppUserId)] : [];
  }

  if (currentRole === 'advisor') {
    return resolveAdviseeIds(currentUserId, relationships, appUserIdByUserId, userIdByAppUserId)
      .map((adviseeId) => appUserIdByUserId[adviseeId])
      .filter(Boolean)
      .map((adviseeAppUserId) => getConversationTopic(currentAppUserId, adviseeAppUserId!));
  }

  return [] as string[];
}

export function MessagingProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAuthReady, user, users } = useAuth();
  const [messages, setMessages] = useState<AdvisorMessage[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>(loadStoredNotifications);
  const [toastNotifications, setToastNotifications] = useState<AppNotification[]>([]);
  const [relationships, setRelationships] = useState<StudentProfileRelation[]>([]);
  const [isMessagingReady, setIsMessagingReady] = useState(hasSupabaseConfig() || isLocalDemoModeEnabled());
  const refreshQueuedRef = useRef(false);
  const refreshInFlightRef = useRef(false);
  const channelByTopicRef = useRef(new Map<string, RealtimeChannel>());
  const knownUnreadNotificationIdsRef = useRef(new Set<string>());
  const mappedUsers = useMemo(
    () => users.filter((account) => account.appUserId),
    [users]
  );

  const appUserIdByUserId = useMemo(
    () =>
      Object.fromEntries(
        mappedUsers.map((account) => [account.id, account.appUserId!])
      ),
    [mappedUsers]
  );

  const userIdByAppUserId = useMemo(
    () =>
      Object.fromEntries(
        mappedUsers.map((account) => [account.appUserId!, account.id])
      ),
    [mappedUsers]
  );

  const currentAppUserId = user?.appUserId ?? appUserIdByUserId[user?.id ?? ''] ?? null;

  useEffect(() => {
    knownUnreadNotificationIdsRef.current = new Set();
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.sessionStorage.setItem(NOTIFICATIONS_SESSION_KEY, JSON.stringify(notifications));
  }, [notifications]);

  const getAssignedAdvisorId = useCallback(
    (studentId: string) => resolveAssignedAdvisorId(studentId, relationships, appUserIdByUserId, userIdByAppUserId),
    [appUserIdByUserId, relationships, userIdByAppUserId]
  );

  const getAdviseeIds = useCallback(
    (advisorId: string) => resolveAdviseeIds(advisorId, relationships, appUserIdByUserId, userIdByAppUserId),
    [appUserIdByUserId, relationships, userIdByAppUserId]
  );

  const dismissNotificationToast = useCallback((notificationId: string) => {
    setToastNotifications((current) => current.filter((notification) => notification.id !== notificationId));
  }, []);

  const dismissNotification = useCallback((notificationId: string) => {
    setNotifications((current) => current.filter((notification) => notification.id !== notificationId));
    setToastNotifications((current) => current.filter((notification) => notification.id !== notificationId));
  }, []);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setToastNotifications([]);
      return;
    }

    const unreadNotifications = buildUnreadMessageNotifications(messages, user.id);
    const unreadNotificationIds = new Set(unreadNotifications.map((notification) => notification.id));
    const newToastNotifications = unreadNotifications.filter(
      (notification) => !knownUnreadNotificationIdsRef.current.has(notification.id)
    );

    knownUnreadNotificationIdsRef.current = unreadNotificationIds;

    setNotifications((current) =>
      mergeNotifications(
        current.filter((notification) =>
          notification.recipientId !== user.id || unreadNotificationIds.has(notification.id)
        ),
        unreadNotifications
      )
    );

    if (newToastNotifications.length > 0) {
      setToastNotifications((current) => mergeNotifications(current, newToastNotifications));
    }
  }, [messages, user]);

  const markConversationRead = useCallback(async (otherUserId: string) => {
    if (!user) {
      return;
    }

    const readAt = new Date().toISOString();

    if (!hasSupabaseConfig()) {
      if (isLocalDemoModeEnabled()) {
        setMessages((current) => applyRead(current, user.id, otherUserId, readAt));
      }
      return;
    }

    const otherAppUserId = appUserIdByUserId[otherUserId];
    const currentUserAppUserId = appUserIdByUserId[user.id];
    if (!otherAppUserId || !currentUserAppUserId) {
      return;
    }

    try {
      await supabaseRpc<number>('mark_conversation_read', { other_user_id: otherAppUserId });
      setMessages((current) => applyRead(current, user.id, otherUserId, readAt));

      const topic = getConversationTopic(currentUserAppUserId, otherAppUserId);
      const channel = channelByTopicRef.current.get(topic);
      if (channel) {
        const status = await channel.send({
          type: 'broadcast',
          event: BROADCAST_EVENT_READ,
          payload: {
            viewerId: user.id,
            otherUserId,
            readAt,
          } satisfies MessageReadBroadcast,
        });

        if (status !== 'ok') {
          console.error('Supabase read broadcast was not acknowledged.', status);
        }
      }
    } catch (error) {
      console.error('Unable to mark messages as read.', error);
    }
  }, [appUserIdByUserId, user]);

  useEffect(() => {
    if (!hasSupabaseConfig()) {
      if (isLocalDemoModeEnabled()) {
        setRelationships(
          FALLBACK_RELATIONSHIPS.map((profile) => ({ user_id: profile.userId, advisor_id: profile.advisorId }))
        );
        setIsMessagingReady(true);
      } else {
        setMessages([]);
        setRelationships([]);
        setIsMessagingReady(false);
      }
      return;
    }

    if (!isAuthReady) {
      setIsMessagingReady(false);
      return;
    }

    if (!isAuthenticated || !user || !currentAppUserId) {
      setMessages([]);
      setRelationships([]);
      setIsMessagingReady(true);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setIsMessagingReady(false);
      return;
    }

    let cancelled = false;
    const activeChannels = new Map<string, RealtimeChannel>();

    const loadMessagesSnapshot = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('id,sender_id,recipient_id,body,sent_at,read_at,client_message_id')
        .or(`sender_id.eq.${currentAppUserId},recipient_id.eq.${currentAppUserId}`)
        .order('sent_at', { ascending: true });

      if (error) {
        throw error;
      }

      if (cancelled) {
        return;
      }

      const snapshotMessages = (data ?? [])
        .map((row) => mapRemoteMessage(row as RemoteMessageRow, userIdByAppUserId))
        .filter(Boolean) as AdvisorMessage[];

      startTransition(() => {
        setMessages((current) => {
          const nextMessages = mergeMessages(snapshotMessages, current.filter((message) => message.optimistic));
          return areMessagesEqual(current, nextMessages) ? current : nextMessages;
        });
      });
    };

    const queueMessagesRefresh = async () => {
      if (refreshInFlightRef.current) {
        refreshQueuedRef.current = true;
        return;
      }

      refreshInFlightRef.current = true;

      try {
        do {
          refreshQueuedRef.current = false;
          await loadMessagesSnapshot();
        } while (!cancelled && refreshQueuedRef.current);
      } catch (error) {
        console.error('Unable to refresh messaging snapshot.', error);
      } finally {
        refreshInFlightRef.current = false;
      }
    };

    const initialize = async () => {
      setIsMessagingReady(false);

      const { data: relationRows, error: relationError } = await supabase
        .from('student_profiles')
        .select('user_id,advisor_id');

      if (relationError) {
        throw relationError;
      }

      if (cancelled) {
        return;
      }

      const nextRelationships = (relationRows ?? []) as StudentProfileRelation[];
      startTransition(() => {
        setRelationships(nextRelationships);
      });

      await loadMessagesSnapshot();

      const topics = buildConversationTopics(
        user.id,
        user.role,
        nextRelationships,
        appUserIdByUserId,
        userIdByAppUserId
      );

      topics.forEach((topic) => {
        const channel = supabase.channel(topic, {
          config: {
            private: true,
          },
        })
          .on('broadcast', { event: BROADCAST_EVENT_CREATED }, () => {
            void queueMessagesRefresh();
          })
          .on('broadcast', { event: BROADCAST_EVENT_READ }, () => {
            void queueMessagesRefresh();
          })
          .on('broadcast', { event: BROADCAST_EVENT_ASSISTANCE }, () => {
            void queueMessagesRefresh();
          })
          .subscribe((status) => {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.error('Supabase broadcast channel failed.', topic, status);
            }
          });

        activeChannels.set(topic, channel);
      });

      const inboxChannel = supabase.channel(`messages:recipient:${currentAppUserId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `recipient_id=eq.${currentAppUserId}`,
          },
          ({ new: insertedRow }) => {
            const insertedMessage = mapRemoteMessage(insertedRow as RemoteMessageRow, userIdByAppUserId);
            if (insertedMessage?.recipientId === user.id) {
              startTransition(() => {
                setMessages((current) => mergeMessages(current, [insertedMessage]));
              });
            }

            void queueMessagesRefresh();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `recipient_id=eq.${currentAppUserId}`,
          },
          () => {
            void queueMessagesRefresh();
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('Supabase inbox changes channel failed.', status);
          }
        });

      activeChannels.set(`messages:recipient:${currentAppUserId}`, inboxChannel);

      channelByTopicRef.current = activeChannels;
      setIsMessagingReady(true);
    };

    void initialize().catch((error) => {
      console.error('Unable to initialize messaging.', error);
      if (!cancelled) {
        setIsMessagingReady(false);
      }
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void queueMessagesRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      refreshQueuedRef.current = false;
      refreshInFlightRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      activeChannels.forEach((channel) => {
        void supabase.removeChannel(channel);
      });

      channelByTopicRef.current = new Map();
    };
  }, [appUserIdByUserId, currentAppUserId, isAuthenticated, isAuthReady, user, userIdByAppUserId]);

  const getConversationMessages = useCallback(
    (userId: string, otherUserId: string) =>
      messages.filter(
        (message) =>
          (message.senderId === userId && message.recipientId === otherUserId)
          || (message.senderId === otherUserId && message.recipientId === userId)
      ),
    [messages]
  );

  const getUnreadMessageCount = useCallback(
    (userId: string) => messages.filter((message) => message.recipientId === userId && !message.readAt).length,
    [messages]
  );

  const sendAssistanceRequest = useCallback(async ({
    senderId,
    recipientId,
  }: {
    senderId: string;
    recipientId: string;
  }): Promise<AssistanceRequestResult> => {
    const pairAllowed = isMessagePairAllowed(
      senderId,
      recipientId,
      relationships,
      appUserIdByUserId,
      userIdByAppUserId
    );

    if (!pairAllowed) {
      return { success: false, error: 'Assistance requests can only be sent to your assigned advisor.' };
    }

    if (!hasSupabaseConfig()) {
      if (isLocalDemoModeEnabled()) {
        const assistanceMessage: AdvisorMessage = {
          id: `assistance-${Date.now()}`,
          clientMessageId: createClientId(),
          senderId,
          recipientId,
          body: ASSISTANCE_MESSAGE_BODY,
          sentAt: new Date().toISOString(),
          readAt: null,
          kind: 'assistance',
          optimistic: false,
        };

        setMessages((current) => mergeMessages(current, [assistanceMessage]));
        return { success: true };
      }

      return {
        success: false,
        error: `${getSupabaseConfigError()} Add the Supabase URL and anon key to the deployment environment and rebuild.`,
      };
    }

    const senderAppUserId = appUserIdByUserId[senderId];
    const recipientAppUserId = appUserIdByUserId[recipientId];
    if (!senderAppUserId || !recipientAppUserId) {
      return { success: false, error: 'Messaging is still syncing user records. Please try again in a few seconds.' };
    }

    const topic = getConversationTopic(senderAppUserId, recipientAppUserId);
    const channel = channelByTopicRef.current.get(topic);
    if (!channel) {
      return { success: false, error: 'The advisor notification channel is not ready yet. Please try again.' };
    }

    const requestedAt = new Date().toISOString();
    const clientMessageId = createClientId();
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Supabase client is not available right now.' };
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderAppUserId,
        recipient_id: recipientAppUserId,
        body: ASSISTANCE_MESSAGE_BODY,
        sent_at: requestedAt,
        client_message_id: clientMessageId,
      })
      .select('id,sender_id,recipient_id,body,sent_at,read_at,client_message_id')
      .single();

    if (error) {
      console.error('Unable to save assistance request to Supabase.', error);
      return { success: false, error: error.message || 'Unable to send the assistance alert right now. Please try again.' };
    }

    const assistanceMessage = data ? mapRemoteMessage(data as RemoteMessageRow, userIdByAppUserId) : null;
    if (!assistanceMessage) {
      return { success: false, error: 'Unable to prepare the assistance request right now. Please try again.' };
    }

    setMessages((current) => mergeMessages(current, [assistanceMessage]));

    const status = await channel.send({
      type: 'broadcast',
      event: BROADCAST_EVENT_ASSISTANCE,
      payload: {
        senderId,
        recipientId,
        requestedAt,
      } satisfies AssistanceRequestBroadcast,
    });

    if (status !== 'ok') {
      console.error('Supabase assistance broadcast was not acknowledged.', status);
      return { success: false, error: 'Unable to send the assistance alert right now. Please try again.' };
    }

    return { success: true };
  }, [appUserIdByUserId, relationships, userIdByAppUserId]);

  const sendMessage = useCallback(async ({ senderId, recipientId, body }: SendMessageInput): Promise<MessageSendResult> => {
    const trimmedBody = body.trim();
    if (!trimmedBody) {
      return { success: false, error: 'Message cannot be empty.' };
    }

    const pairAllowed = isMessagePairAllowed(
      senderId,
      recipientId,
      relationships,
      appUserIdByUserId,
      userIdByAppUserId
    );

    if (!pairAllowed) {
      return { success: false, error: 'Messages can only be exchanged between a student and their assigned advisor.' };
    }

    const clientMessageId = createClientId();
    const optimisticMessage: AdvisorMessage = {
      id: `optimistic-${clientMessageId}`,
      clientMessageId,
      senderId,
      recipientId,
      body: trimmedBody,
      sentAt: new Date().toISOString(),
      readAt: null,
      kind: 'message',
      optimistic: true,
    };

    setMessages((current) => mergeMessages(current, [optimisticMessage]));

    if (!hasSupabaseConfig()) {
      if (isLocalDemoModeEnabled()) {
        return { success: true, message: { ...optimisticMessage, optimistic: false } };
      }

      setMessages((current) => current.filter((message) => message.clientMessageId !== clientMessageId));
      return {
        success: false,
        error: `${getSupabaseConfigError()} Add the Supabase URL and anon key to the deployment environment and rebuild.`,
      };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setMessages((current) => current.filter((message) => message.clientMessageId !== clientMessageId));
      return { success: false, error: 'Supabase client is not available right now.' };
    }

    const senderAppUserId = appUserIdByUserId[senderId];
    const recipientAppUserId = appUserIdByUserId[recipientId];
    if (!senderAppUserId || !recipientAppUserId) {
      setMessages((current) => current.filter((message) => message.clientMessageId !== clientMessageId));
      return { success: false, error: 'Messaging is still syncing user records. Please try again in a few seconds.' };
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: senderAppUserId,
          recipient_id: recipientAppUserId,
          body: optimisticMessage.body,
          sent_at: optimisticMessage.sentAt,
          client_message_id: clientMessageId,
        })
        .select('id,sender_id,recipient_id,body,sent_at,read_at,client_message_id')
        .single();

      if (error) {
        throw error;
      }

      const insertedMessage = data ? mapRemoteMessage(data as RemoteMessageRow, userIdByAppUserId) : null;
      if (!insertedMessage) {
        throw new Error('The server did not return the saved message.');
      }

      setMessages((current) => mergeMessages(current, [insertedMessage]));

      const topic = getConversationTopic(senderAppUserId, recipientAppUserId);
      const channel = channelByTopicRef.current.get(topic);
      if (channel) {
        const status = await channel.send({
          type: 'broadcast',
          event: BROADCAST_EVENT_CREATED,
          payload: {
            messageId: insertedMessage.id,
            clientMessageId: insertedMessage.clientMessageId,
            senderId: insertedMessage.senderId,
            recipientId: insertedMessage.recipientId,
            sentAt: insertedMessage.sentAt,
          } satisfies MessageCreatedBroadcast,
        });

        if (status !== 'ok') {
          console.error('Supabase message broadcast was not acknowledged.', status);
        }
      }

      return { success: true, message: insertedMessage };
    } catch (error) {
      console.error('Unable to save message to Supabase.', error);
      setMessages((current) => current.filter((message) => message.clientMessageId !== clientMessageId));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to save the message right now. Please try again.',
      };
    }
  }, [appUserIdByUserId, relationships, userIdByAppUserId]);

  const value = useMemo<MessagingContextValue>(
    () => ({
      messages,
      notifications,
      toastNotifications,
      isMessagingReady,
      getAssignedAdvisorId,
      getAdviseeIds,
      getConversationMessages,
      getUnreadMessageCount,
      dismissNotification,
      dismissNotificationToast,
      markConversationRead,
      sendAssistanceRequest,
      sendMessage,
    }),
    [
      dismissNotificationToast,
      getAdviseeIds,
      getAssignedAdvisorId,
      getConversationMessages,
      getUnreadMessageCount,
      dismissNotification,
      isMessagingReady,
      markConversationRead,
      messages,
      notifications,
      sendAssistanceRequest,
      sendMessage,
      toastNotifications,
    ]
  );

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
}

export function useMessaging() {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error('useMessaging must be used within MessagingProvider');
  }

  return context;
}
