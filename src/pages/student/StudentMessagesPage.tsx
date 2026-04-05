import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { Check, Mail, Send, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useMessaging } from '../../context/MessagingContext';

const ASSISTANCE_MESSAGE_LABEL = 'Student has asked for assistance.';

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString();
}

function formatReceipt(sentAt: string, readAt: string | null) {
  if (readAt) {
    return {
      label: `Read ${formatTimestamp(readAt)}`,
      read: true,
    };
  }

  return {
    label: `Sent ${formatTimestamp(sentAt)}`,
    read: false,
  };
}

export default function StudentMessagesPage() {
  const location = useLocation();
  const { user, users } = useAuth();
  const { getAssignedAdvisorId, getConversationMessages, isMessagingReady, markConversationRead, sendMessage } = useMessaging();
  const [draft, setDraft] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const handledScrollRequestRef = useRef<string | null>(null);

  const studentId = user?.id ?? '';
  const advisorId = getAssignedAdvisorId(studentId);
  const advisor = users.find((account) => account.id === advisorId) ?? null;
  const conversation = advisorId ? getConversationMessages(studentId, advisorId) : [];
  const scrollRequestKey = `${location.key}:${String((location.state as { scrollToBottom?: boolean } | null)?.scrollToBottom ?? false)}`;

  const unreadFromAdvisor = conversation.filter(
    (message) => message.senderId === advisorId && message.recipientId === studentId && !message.readAt
  ).length;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  useEffect(() => {
    if (advisorId && unreadFromAdvisor > 0) {
      void markConversationRead(advisorId);
    }
  }, [advisorId, markConversationRead, unreadFromAdvisor]);

  useEffect(() => {
    const shouldScrollToBottom = (location.state as { scrollToBottom?: boolean } | null)?.scrollToBottom ?? false;
    if (!shouldScrollToBottom || conversation.length === 0) {
      return;
    }

    if (handledScrollRequestRef.current === scrollRequestKey) {
      return;
    }

    handledScrollRequestRef.current = scrollRequestKey;
    window.requestAnimationFrame(() => {
      scrollToBottom();
    });
  }, [conversation.length, location.state, scrollRequestKey]);

  useEffect(() => {
    if (conversation.length === 0) {
      return;
    }

    window.requestAnimationFrame(() => {
      scrollToBottom();
    });
  }, [advisorId, conversation.length]);

  const handleSend = async () => {
    if (!advisorId) {
      setFeedback('No advisor is assigned to this account yet.');
      return;
    }

    const result = await sendMessage({ senderId: studentId, recipientId: advisorId, body: draft });
    setFeedback(result.success ? 'Message sent to your advisor.' : result.error ?? 'Unable to send message.');
    if (result.success) {
      setDraft('');
      window.requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  };

  const handleDraftKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (!isMessagingReady || !advisorId || !draft.trim()) {
      return;
    }

    void handleSend();
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
          <Mail className="h-5 w-5 text-[#2563eb]" />
          Advisor Contact
        </h2>

        {advisor ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Assigned advisor</p>
              <p className="mt-2 text-base font-semibold text-[#0f1e3c]">{advisor.name}</p>
              <p className="mt-1 text-sm text-gray-500">{advisor.subtitle}</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-600">
              Use this inbox to ask about workload, prerequisites, and registration decisions.
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            No advisor is assigned to this account yet.
          </div>
        )}
      </aside>

      <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#0f1e3c]">Conversation</h2>
            <p className="text-sm text-gray-500">Send messages directly to your assigned advisor.</p>
          </div>
          {advisor && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#2563eb]">{advisor.name}</span>}
        </div>

        <div className="mb-5 h-[280px] space-y-3 overflow-y-auto rounded-xl bg-slate-50 p-3 sm:h-[420px] sm:p-4">
          {conversation.length > 0 ? (
            conversation.map((message) => {
              if (message.kind === 'assistance') {
                return (
                  <div key={message.id} className="flex justify-center">
                    <div className="rounded-full bg-white/80 px-4 py-2 text-center text-xs font-medium text-gray-400 shadow-sm">
                      <p>{ASSISTANCE_MESSAGE_LABEL}</p>
                      <p className="mt-1 text-[10px] text-gray-300">{formatTimestamp(message.sentAt)}</p>
                    </div>
                  </div>
                );
              }

              const isMine = message.senderId === studentId;
              const receipt = formatReceipt(message.sentAt, message.readAt);
              return (
                <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] rounded-2xl px-3 py-2.5 shadow-sm sm:max-w-xl sm:px-4 sm:py-3 ${isMine ? 'bg-[#2563eb] text-white' : 'bg-white text-slate-700'}`}>
                    <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider opacity-80">
                      <UserRound className="h-3.5 w-3.5" />
                      {isMine ? 'You' : advisor?.name ?? 'Advisor'}
                    </div>
                    <p className="text-sm leading-relaxed">{message.body}</p>
                    <div className={`mt-2 space-y-1 text-[11px] ${isMine ? 'text-blue-100' : 'text-gray-400'}`}>
                      <p>{formatTimestamp(message.sentAt)}</p>
                      {isMine ? (
                        <div className="inline-flex items-center gap-1.5">
                          <Check className={`h-3.5 w-3.5 ${receipt.read ? 'rounded-full bg-white p-0.5 text-blue-600' : 'text-white'}`} />
                          <span>{receipt.label}</span>
                        </div>
                      ) : message.readAt ? (
                        <p>Read {formatTimestamp(message.readAt)}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-sm text-gray-500">
              Start the conversation with your advisor.
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="space-y-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleDraftKeyDown}
            placeholder="Write a message to your advisor"
            rows={3}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm sm:px-4 sm:py-3 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            {feedback ? <p className="text-sm text-gray-600">{feedback}</p> : <p className="text-sm text-gray-500">Messages persist in the database and refresh instantly for connected participants.</p>}
            <button
              onClick={() => { void handleSend(); }}
              disabled={!advisorId || !isMessagingReady}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              <Send className="h-4 w-4" />
              Send to advisor
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}



