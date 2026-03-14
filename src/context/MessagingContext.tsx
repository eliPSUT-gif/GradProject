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
import { STUDENT_PROFILES } from '../data/courses';
import { useAuth } from './AuthContext';
import {
  getSupabaseClient,
  getSupabaseConfigError,
  hasSupabaseConfig,
  isLocalDemoModeEnabled,
  supabaseRpc,
} from '../lib/supabase';

export interface AdvisorMessage {
  id: string;
  clientMessageId: string;
  senderId: string;
  recipientId: string;
  body: string;
  sentAt: string;
  deliveredAt: string | null;
  readAt: string | null;
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

interface PresenceState {
  isOnline: boolean;
  lastSeenAt: string | null;
}

interface MessagingContextValue {
  messages: AdvisorMessage[];
  isMessagingReady: boolean;
  getAssignedAdvisorId: (studentId: string) => string | null;
  getAdviseeIds: (advisorId: string) => string[];
  getConversationMessages: (userId: string, otherUserId: string) => AdvisorMessage[];
  getUnreadMessageCount: (userId: string) => number;
  getPresence: (userId: string) => PresenceState;
  markConversationDelivered: (otherUserId: string) => Promise<void>;
  markConversationRead: (otherUserId: string) => Promise<void>;
  sendMessage: (input: SendMessageInput) => Promise<MessageSendResult>;
}

interface RemoteMessageRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
  client_message_id: string | null;
}

interface StudentProfileRelation {
  user_id: string;
  advisor_id: string | null;
}

const MESSAGES_CHANNEL = 'messaging-realtime';
const PRESENCE_CHANNEL = 'messaging-presence';
const LAST_SEEN_TOUCH_INTERVAL_MS = 15000;
const ONLINE_WINDOW_MS = 45000;

const MessagingContext = createContext<MessagingContextValue | null>(null);

function createClientId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
    deliveredAt: incoming.deliveredAt ?? existing.deliveredAt,
    readAt: incoming.readAt ?? existing.readAt,
    optimistic: existing.optimistic && incoming.optimistic,
  };
}

function mergeMessages(...sources: AdvisorMessage[][]) {
  const deduped = new Map<string, AdvisorMessage>();

  sources.forEach((source) => {
    source.forEach((message) => {
      const key = message.clientMessageId || message.id;
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
    deliveredAt: row.delivered_at,
    readAt: row.read_at,
    optimistic: false,
  } satisfies AdvisorMessage;
}

function applyDelivery(messages: AdvisorMessage[], viewerId: string, otherUserId: string, deliveredAt: string) {
  return messages.map((message) =>
    message.recipientId === viewerId && message.senderId === otherUserId && !message.deliveredAt
      ? { ...message, deliveredAt }
      : message
  );
}

function applyRead(messages: AdvisorMessage[], viewerId: string, otherUserId: string, readAt: string) {
  return messages.map((message) =>
    message.recipientId === viewerId && message.senderId === otherUserId
      ? {
          ...message,
          deliveredAt: message.deliveredAt ?? readAt,
          readAt: message.readAt ?? readAt,
        }
      : message
  );
}

function isRecentlyOnline(lastSeenAt: string | null) {
  if (!lastSeenAt) {
    return false;
  }

  return Date.now() - new Date(lastSeenAt).getTime() <= ONLINE_WINDOW_MS;
}

const FALLBACK_RELATIONSHIPS = STUDENT_PROFILES.map((profile) => ({
  userId: profile.id,
  advisorId: profile.advisorId || null,
}));

export function MessagingProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAuthReady, user, users } = useAuth();
  const [messages, setMessages] = useState<AdvisorMessage[]>([]);
  const [relationships, setRelationships] = useState<StudentProfileRelation[]>([]);
  const [onlineAppUserIds, setOnlineAppUserIds] = useState<Set<string>>(new Set());
  const [isMessagingReady, setIsMessagingReady] = useState(hasSupabaseConfig() || isLocalDemoModeEnabled());
  const hasLoadedSnapshotRef = useRef(false);
  const pendingDeliveryRef = useRef<Set<string>>(new Set());
  const pendingReadRef = useRef<Set<string>>(new Set());
  const snapshotRef = useRef<(() => Promise<void>) | null>(null);
  const markConversationDeliveredRef = useRef<typeof markConversationDelivered>(null!);
  const touchLastSeenRef = useRef<typeof touchLastSeen>(null!);
  const userRef = useRef(user);
  const appUserMapsRef = useRef<{
    key: string;
    appUserIdByUserId: Record<string, string>;
    userIdByAppUserId: Record<string, string>;
  }>({
    key: '',
    appUserIdByUserId: {},
    userIdByAppUserId: {},
  });

  const appUserMappingKey = users
    .filter((account) => account.appUserId)
    .map((account) => `${account.id}:${account.appUserId}`)
    .join('|');

  if (appUserMapsRef.current.key !== appUserMappingKey) {
    appUserMapsRef.current = {
      key: appUserMappingKey,
      appUserIdByUserId: Object.fromEntries(
        users
          .filter((account) => account.appUserId)
          .map((account) => [account.id, account.appUserId!])
      ),
      userIdByAppUserId: Object.fromEntries(
        users
          .filter((account) => account.appUserId)
          .map((account) => [account.appUserId!, account.id])
      ),
    };
  }

  const { appUserIdByUserId, userIdByAppUserId } = appUserMapsRef.current;
  const currentAppUserId = user?.appUserId ?? appUserIdByUserId[user?.id ?? ''] ?? null;

  const touchLastSeen = useCallback(async () => {
    if (!hasSupabaseConfig() || !isAuthenticated) {
      return;
    }

    try {
      await supabaseRpc<null>('touch_last_seen');
    } catch (error) {
      console.error('Unable to update last seen state.', error);
    }
  }, [isAuthenticated]);

  const getAssignedAdvisorId = useCallback(
    (studentId: string) => {
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
    },
    [appUserIdByUserId, relationships, userIdByAppUserId]
  );

  const getAdviseeIds = useCallback(
    (advisorId: string) => {
      const fallbackAdviseeIds = FALLBACK_RELATIONSHIPS.filter((profile) => profile.advisorId === advisorId).map((profile) => profile.userId);
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
    },
    [appUserIdByUserId, relationships, userIdByAppUserId]
  );

  const isMessagePairAllowed = useCallback(
    (senderId: string, recipientId: string) => {
      const senderAdvisorId = getAssignedAdvisorId(senderId);
      const recipientAdvisorId = getAssignedAdvisorId(recipientId);
      return senderAdvisorId === recipientId || recipientAdvisorId === senderId;
    },
    [getAssignedAdvisorId]
  );

  const markConversationDelivered = useCallback(async (otherUserId: string) => {
    if (!user) {
      return;
    }

    if (!hasSupabaseConfig()) {
      if (!isLocalDemoModeEnabled()) {
        return;
      }

      const deliveredAt = new Date().toISOString();
      setMessages((current) => applyDelivery(current, user.id, otherUserId, deliveredAt));
      return;
    }

    const otherAppUserId = appUserIdByUserId[otherUserId];
    if (!otherAppUserId || pendingDeliveryRef.current.has(otherUserId)) {
      return;
    }

    pendingDeliveryRef.current.add(otherUserId);
    const deliveredAt = new Date().toISOString();

    try {
      await supabaseRpc<number>('mark_conversation_delivered', { other_user_id: otherAppUserId });
      setMessages((current) => applyDelivery(current, user.id, otherUserId, deliveredAt));
    } catch (error) {
      console.error('Unable to mark messages as delivered.', error);
    } finally {
      pendingDeliveryRef.current.delete(otherUserId);
    }
  }, [appUserIdByUserId, user]);

  const markConversationRead = useCallback(async (otherUserId: string) => {
    if (!user) {
      return;
    }

    if (!hasSupabaseConfig()) {
      if (!isLocalDemoModeEnabled()) {
        return;
      }

      const readAt = new Date().toISOString();
      setMessages((current) => applyRead(current, user.id, otherUserId, readAt));
      return;
    }

    const otherAppUserId = appUserIdByUserId[otherUserId];
    if (!otherAppUserId || pendingReadRef.current.has(otherUserId)) {
      return;
    }

    pendingReadRef.current.add(otherUserId);
    const readAt = new Date().toISOString();

    try {
      await supabaseRpc<number>('mark_conversation_read', { other_user_id: otherAppUserId });
      setMessages((current) => applyRead(current, user.id, otherUserId, readAt));
    } catch (error) {
      console.error('Unable to mark messages as read.', error);
    } finally {
      pendingReadRef.current.delete(otherUserId);
    }
  }, [appUserIdByUserId, user]);

  markConversationDeliveredRef.current = markConversationDelivered;
  touchLastSeenRef.current = touchLastSeen;
  userRef.current = user;

  useEffect(() => {
    if (!user) {
      return;
    }

    const incomingSenders = new Set(
      messages
        .filter((message) => message.recipientId === user.id && !message.deliveredAt)
        .map((message) => message.senderId)
    );

    incomingSenders.forEach((senderId) => {
      void markConversationDelivered(senderId);
    });
  }, [markConversationDelivered, messages, user]);

  useEffect(() => {
    if (!hasSupabaseConfig()) {
      snapshotRef.current = null;
      hasLoadedSnapshotRef.current = true;
      if (isLocalDemoModeEnabled()) {
        setRelationships(
          FALLBACK_RELATIONSHIPS.map((profile) => ({ user_id: profile.userId, advisor_id: profile.advisorId }))
        );
        setIsMessagingReady(true);
      } else {
        setMessages([]);
        setRelationships([]);
        setOnlineAppUserIds(new Set());
        setIsMessagingReady(false);
      }
      return;
    }

    if (!isAuthReady) {
      snapshotRef.current = null;
      hasLoadedSnapshotRef.current = false;
      setIsMessagingReady(false);
      return;
    }

    if (!isAuthenticated || !currentAppUserId) {
      snapshotRef.current = null;
      setMessages([]);
      setRelationships([]);
      setOnlineAppUserIds(new Set());
      hasLoadedSnapshotRef.current = false;
      setIsMessagingReady(true);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      snapshotRef.current = null;
      hasLoadedSnapshotRef.current = false;
      setIsMessagingReady(true);
      return;
    }

    let cancelled = false;
    hasLoadedSnapshotRef.current = false;
    setIsMessagingReady(false);

    const loadSnapshot = async () => {
      const [{ data: messageRows, error: messageError }, { data: relationRows, error: relationError }] = await Promise.all([
        supabase
          .from('messages')
          .select('id,sender_id,recipient_id,body,sent_at,delivered_at,read_at,client_message_id')
          .or(`sender_id.eq.${currentAppUserId},recipient_id.eq.${currentAppUserId}`)
          .order('sent_at', { ascending: true }),
        supabase
          .from('student_profiles')
          .select('user_id,advisor_id'),
      ]);

      if (cancelled) {
        return;
      }

      if (messageError) {
        throw messageError;
      }

      if (relationError) {
        throw relationError;
      }

      const nextMessages = (messageRows ?? [])
        .map((row) => mapRemoteMessage(row as RemoteMessageRow, userIdByAppUserId))
        .filter(Boolean) as AdvisorMessage[];

      startTransition(() => {
        setRelationships((relationRows ?? []) as StudentProfileRelation[]);
        setMessages(nextMessages);
        hasLoadedSnapshotRef.current = true;
        setIsMessagingReady(true);
      });
    };

    snapshotRef.current = loadSnapshot;

    const handleRealtimeMessage = (row: RemoteMessageRow | null | undefined) => {
      if (!row) {
        return;
      }

      if (row.sender_id !== currentAppUserId && row.recipient_id !== currentAppUserId) {
        return;
      }

      const mapped = mapRemoteMessage(row, userIdByAppUserId);
      if (!mapped) {
        return;
      }

      startTransition(() => {
        setMessages((current) => mergeMessages(current, [mapped]));
      });

      if (mapped.recipientId === userRef.current?.id && !mapped.deliveredAt) {
        void markConversationDeliveredRef.current(mapped.senderId);
      }
    };

    const messagesChannel = supabase.channel(`${MESSAGES_CHANNEL}:${currentAppUserId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, ({ new: next }) => {
        handleRealtimeMessage(next as RemoteMessageRow);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, ({ new: next }) => {
        handleRealtimeMessage(next as RemoteMessageRow);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          return;
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Supabase messages channel failed to subscribe.', status);
          if (!cancelled) {
            setIsMessagingReady(false);
          }
        }
      });

    const presenceChannel = supabase.channel(PRESENCE_CHANNEL, {
      config: {
        presence: {
          key: currentAppUserId,
        },
      },
    })
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        startTransition(() => {
          setOnlineAppUserIds(new Set(Object.keys(state)));
        });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void presenceChannel.track({ universityId: userRef.current?.id ?? '', connectedAt: new Date().toISOString() });
          void touchLastSeenRef.current();
          return;
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Supabase presence channel failed to subscribe.', status);
        }
      });

    void loadSnapshot().catch((error) => {
      console.error('Unable to load messaging snapshot.', error);
      if (!cancelled) {
        hasLoadedSnapshotRef.current = true;
        setIsMessagingReady(false);
      }
    });

    const lastSeenInterval = window.setInterval(() => {
      if (document.visibilityState === 'hidden') {
        return;
      }

      void touchLastSeenRef.current();
    }, LAST_SEEN_TOUCH_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void touchLastSeenRef.current();
        return;
      }

      if (!hasLoadedSnapshotRef.current) {
        return;
      }

      void snapshotRef.current?.().catch((error) => {
        console.error('Unable to refresh messaging snapshot on visibility change.', error);
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      snapshotRef.current = null;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(lastSeenInterval);
      setOnlineAppUserIds(new Set());
      void touchLastSeenRef.current();
      void supabase.removeChannel(messagesChannel);
      void supabase.removeChannel(presenceChannel);
    };
  }, [currentAppUserId, isAuthenticated, isAuthReady, userIdByAppUserId]);

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

  const getPresence = useCallback(
    (userId: string) => {
      const appUserId = appUserIdByUserId[userId];
      const matchedUser = users.find((account) => account.id === userId);
      const lastSeenAt = matchedUser?.lastSeenAt ?? null;

      return {
        isOnline: userId === user?.id || Boolean(appUserId && onlineAppUserIds.has(appUserId)) || isRecentlyOnline(lastSeenAt),
        lastSeenAt,
      } satisfies PresenceState;
    },
    [appUserIdByUserId, onlineAppUserIds, user?.id, users]
  );

  const sendMessage = useCallback(async ({ senderId, recipientId, body }: SendMessageInput): Promise<MessageSendResult> => {
    const trimmedBody = body.trim();
    if (!trimmedBody) {
      return { success: false, error: 'Message cannot be empty.' };
    }

    if (!isMessagePairAllowed(senderId, recipientId)) {
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
      deliveredAt: null,
      readAt: null,
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
        .select('id,sender_id,recipient_id,body,sent_at,delivered_at,read_at,client_message_id')
        .single();

      if (error) {
        throw error;
      }

      const insertedMessage = data ? mapRemoteMessage(data as RemoteMessageRow, userIdByAppUserId) : null;
      if (!insertedMessage) {
        throw new Error('The server did not return the saved message.');
      }

      setMessages((current) => mergeMessages(current, [insertedMessage]));
      return { success: true, message: insertedMessage };
    } catch (error) {
      console.error('Unable to save message to Supabase.', error);
      setMessages((current) => current.filter((message) => message.clientMessageId !== clientMessageId));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to save the message right now. Please try again.',
      };
    }
  }, [appUserIdByUserId, isMessagePairAllowed, userIdByAppUserId]);

  const value = useMemo<MessagingContextValue>(
    () => ({
      messages,
      isMessagingReady,
      getAssignedAdvisorId,
      getAdviseeIds,
      getConversationMessages,
      getUnreadMessageCount,
      getPresence,
      markConversationDelivered,
      markConversationRead,
      sendMessage,
    }),
    [
      getAdviseeIds,
      getAssignedAdvisorId,
      getConversationMessages,
      getPresence,
      getUnreadMessageCount,
      isMessagingReady,
      markConversationDelivered,
      markConversationRead,
      messages,
      sendMessage,
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







