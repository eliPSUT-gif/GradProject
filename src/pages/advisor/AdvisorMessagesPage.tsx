import { useDeferredValue, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { Check, Mail, Search, Send, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
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

export default function AdvisorMessagesPage() {
  const { user, users } = useAuth();
  const location = useLocation();
  const { isAppDataReady, studentInsights } = useAppData();
  const { getAdviseeIds, getConversationMessages, isMessagingReady, markConversationRead, sendMessage } = useMessaging();
  const [search, setSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [draft, setDraft] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const handledScrollRequestRef = useRef<string | null>(null);

  const advisorId = user?.id ?? '';
  const adviseeIds = useMemo(() => new Set(getAdviseeIds(advisorId)), [advisorId, getAdviseeIds]);
  const advisees = useMemo(
    () => studentInsights.filter((student) => adviseeIds.has(student.id)),
    [adviseeIds, studentInsights]
  );

  const filteredStudents = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return advisees.filter((student) => {
      if (!query) return true;
      return student.name.toLowerCase().includes(query) || student.id.toLowerCase().includes(query);
    });
  }, [advisees, deferredSearch]);

  const focusedStudentId = (location.state as { focusUserId?: string } | null)?.focusUserId ?? '';
  const shouldScrollFromNotification = (location.state as { scrollToBottom?: boolean } | null)?.scrollToBottom ?? false;
  const preferredStudentId = selectedStudentId || focusedStudentId;

  const activeStudentId = filteredStudents.some((student) => student.id === preferredStudentId)
    ? preferredStudentId
    : filteredStudents[0]?.id ?? advisees[0]?.id ?? '';

  const studentThreads = useMemo(() => {
    return filteredStudents
      .map((student) => {
        const messages = getConversationMessages(advisorId, student.id);
        const lastMessage = messages[messages.length - 1] ?? null;
        const unreadCount = messages.filter(
          (message) => message.recipientId === advisorId && message.senderId === student.id && !message.readAt
        ).length;

        return {
          student,
          lastMessage,
          unreadCount,
          preview: lastMessage
            ? lastMessage.kind === 'assistance'
              ? ASSISTANCE_MESSAGE_LABEL
              : lastMessage.body
            : 'No messages yet.',
        };
      })
      .sort((left, right) => {
        const leftTime = left.lastMessage?.sentAt ?? '';
        const rightTime = right.lastMessage?.sentAt ?? '';
        return rightTime.localeCompare(leftTime);
      });
  }, [advisorId, filteredStudents, getConversationMessages]);

  const activeStudent = advisees.find((student) => student.id === activeStudentId) ?? null;
  const conversation = useMemo(
    () => (activeStudentId ? getConversationMessages(advisorId, activeStudentId) : []),
    [activeStudentId, advisorId, getConversationMessages]
  );
  const scrollRequestKey = `${location.key}:${activeStudentId}:${String(shouldScrollFromNotification)}`;

  const unreadFromStudent = conversation.filter(
    (message) => message.recipientId === advisorId && message.senderId === activeStudentId && !message.readAt
  ).length;

  useEffect(() => {
    if (activeStudentId && unreadFromStudent > 0) {
      void markConversationRead(activeStudentId);
    }
  }, [activeStudentId, markConversationRead, unreadFromStudent]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  useEffect(() => {
    if (!shouldScrollFromNotification || !activeStudentId || conversation.length === 0) {
      return;
    }

    if (handledScrollRequestRef.current === scrollRequestKey) {
      return;
    }

    handledScrollRequestRef.current = scrollRequestKey;
    window.requestAnimationFrame(() => {
      scrollToBottom();
    });
  }, [activeStudentId, conversation.length, scrollRequestKey, shouldScrollFromNotification]);

  useEffect(() => {
    if (!activeStudentId || conversation.length === 0) {
      return;
    }

    window.requestAnimationFrame(() => {
      scrollToBottom();
    });
  }, [activeStudentId, conversation.length]);

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    setDraft('');
    setFeedback(null);
  };

  const handleSend = async () => {
    if (!activeStudentId) {
      setFeedback('Select a student conversation first.');
      return;
    }

    const result = await sendMessage({ senderId: advisorId, recipientId: activeStudentId, body: draft });
    setFeedback(result.success ? 'Message sent to student.' : result.error ?? 'Unable to send message.');
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

    if (!isMessagingReady || !activeStudentId || !draft.trim()) {
      return;
    }

    void handleSend();
  };

  if (!isAppDataReady) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-sm text-gray-500">
        Loading advisee conversations...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
        <div className="mb-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
            <Mail className="h-5 w-5 text-[#2563eb]" />
            Student Inbox
          </h2>
          <p className="mt-1 text-sm text-gray-500">Review and reply to advisee questions.</p>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search students"
            className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
          />
        </div>

        <div className="max-h-[320px] space-y-2 overflow-y-auto xl:max-h-none">
          {studentThreads.length > 0 ? (
            studentThreads.map(({ student, preview, unreadCount }) => (
              <button
                key={student.id}
                onClick={() => handleSelectStudent(student.id)}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${activeStudentId === student.id ? 'border-[#2563eb] bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-slate-50'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#0f1e3c]">{student.name}</p>
                    <p className="text-[11px] text-gray-400">ID {student.id}</p>
                  </div>
                  {unreadCount > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">{unreadCount}</span>}
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-gray-500">{preview}</p>
              </button>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
              No advisee conversations match your search.
            </div>
          )}
        </div>
      </aside>

      <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        {activeStudent ? (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#0f1e3c]">{activeStudent.name}</h2>
                <p className="text-sm text-gray-500">ID {activeStudent.id} | GPA {activeStudent.gpa.toFixed(2)}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{activeStudent.creditsCompleted} completed credits</span>
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

                  const isMine = message.senderId === advisorId;
                  const sender = users.find((account) => account.id === message.senderId);
                  const receipt = formatReceipt(message.sentAt, message.readAt);
                  return (
                    <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[88%] rounded-2xl px-3 py-2.5 shadow-sm sm:max-w-xl sm:px-4 sm:py-3 ${isMine ? 'bg-[#2563eb] text-white' : 'bg-white text-slate-700'}`}>
                        <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider opacity-80">
                          <UserRound className="h-3.5 w-3.5" />
                          {isMine ? 'You' : sender?.name ?? activeStudent.name}
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
                  Start the conversation with this student.
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="space-y-3">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleDraftKeyDown}
                placeholder="Write a message to this student"
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm sm:px-4 sm:py-3 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                {feedback ? <p className="text-sm text-gray-600">{feedback}</p> : <p className="text-sm text-gray-500">Messages persist in the database and refresh instantly for connected participants.</p>}
                <button
                  onClick={() => { void handleSend(); }}
                  disabled={!isMessagingReady}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                  <Send className="h-4 w-4" />
                  Send message
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-slate-50 text-sm text-gray-500 sm:h-[560px]">
            No advisee selected.
          </div>
        )}
      </section>
    </div>
  );
}

