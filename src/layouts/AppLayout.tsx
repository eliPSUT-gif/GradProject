import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  Bot,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  X as CloseIcon,
  Settings,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMessaging } from '../context/MessagingContext';
import type { Role } from '../data/courses';

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface NotificationSummary {
  id: string;
  kind: 'message' | 'assistance';
  senderId: string;
  senderName: string;
  preview: string;
  sentAt: string;
  readAt: string | null;
}

const MAX_VISIBLE_NOTIFICATIONS = 5;
const TOAST_DURATION_MS = 5000;

const NAV: Record<Role, NavSection[]> = {
  student: [
    {
      title: 'Main',
      items: [
        { label: 'Dashboard', to: '/app/dashboard', icon: LayoutDashboard },
        { label: 'Course Planner', to: '/app/courses', icon: BookOpen },
        { label: 'Messages', to: '/app/messages', icon: MessageSquare },
      ],
    },
  ],
  advisor: [
    {
      title: 'Main',
      items: [
        { label: 'Dashboard', to: '/app/advisor', icon: LayoutDashboard },
        { label: 'Messages', to: '/app/advisor/messages', icon: MessageSquare },
      ],
    },
  ],
  admin: [
    {
      title: 'System',
      items: [
        { label: 'Overview', to: '/app/admin', icon: LayoutDashboard },
        { label: 'Courses', to: '/app/admin/courses', icon: BookOpen },
      ],
    },
    {
      title: 'Management',
      items: [
        { label: 'Users', to: '/app/admin/users', icon: Users },
        { label: 'Model Status', to: '/app/admin/model', icon: Bot },
        { label: 'Settings', to: '/app/admin/settings', icon: Settings },
      ],
    },
  ],
};

const PAGE_TITLES: Record<string, string> = {
  '/app/dashboard': 'Dashboard',
  '/app/courses': 'Course Planner',
  '/app/messages': 'Messages',
  '/app/advisor': 'Advisor Dashboard',
  '/app/advisor/messages': 'Messages',
  '/app/admin': 'Admin Overview',
  '/app/admin/courses': 'Course Management',
  '/app/admin/users': 'User Management',
  '/app/admin/model': 'Model Status',
  '/app/admin/settings': 'Settings',
};

function formatNotificationTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function AppLayout() {
  const { logout, user, users } = useAuth();
  const { dismissNotification, dismissNotificationToast, getUnreadMessageCount, notifications, toastNotifications } = useMessaging();
  const location = useLocation();
  const navigate = useNavigate();
  const notificationPanelRef = useRef<HTMLDivElement | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const role = user?.role ?? 'student';
  const sections = NAV[role];
  const pageTitle = location.pathname.startsWith('/app/advisor/student/')
    ? 'Student Details'
    : PAGE_TITLES[location.pathname] ?? 'Dashboard';
  const unreadCount = user ? getUnreadMessageCount(user.id) : 0;
  const messageRoute = role === 'advisor' ? '/app/advisor/messages' : role === 'student' ? '/app/messages' : null;
  const sidebarWidth = mobileOpen || !collapsed ? 240 : 64;

  const recentNotifications = useMemo(() => {
    if (!user) {
      return [] as NotificationSummary[];
    }

    return notifications
      .filter((notification) => notification.recipientId === user.id)
      .map((notification) => ({
        ...notification,
        senderName: users.find((account) => account.id === notification.senderId)?.name ?? 'Someone',
        preview: notification.kind === 'assistance'
          ? `${users.find((account) => account.id === notification.senderId)?.name ?? 'A student'} has asked for assistance.`
          : `${users.find((account) => account.id === notification.senderId)?.name ?? 'Someone'} sent you a message.`,
        sentAt: notification.createdAt,
        readAt: null,
      }))
      .sort((left, right) => right.sentAt.localeCompare(left.sentAt))
      .slice(0, MAX_VISIBLE_NOTIFICATIONS);
  }, [notifications, user, users]);

  const notificationCount = recentNotifications.length;

  const visibleToastNotifications = useMemo(() => {
    if (!user) {
      return [] as NotificationSummary[];
    }

    return toastNotifications
      .filter((notification) => notification.recipientId === user.id)
      .map((notification) => ({
        ...notification,
        senderName: users.find((account) => account.id === notification.senderId)?.name ?? 'Someone',
        preview: notification.kind === 'assistance'
          ? `${users.find((account) => account.id === notification.senderId)?.name ?? 'A student'} has asked for assistance.`
          : `${users.find((account) => account.id === notification.senderId)?.name ?? 'Someone'} sent you a message.`,
        sentAt: notification.createdAt,
        readAt: null,
      }));
  }, [toastNotifications, user, users]);

  useEffect(() => {
    if (visibleToastNotifications.length === 0) {
      return;
    }

    const timeoutIds = visibleToastNotifications.map((notification) =>
      window.setTimeout(() => {
        dismissNotificationToast(notification.id);
      }, TOAST_DURATION_MS)
    );

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [dismissNotificationToast, visibleToastNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!notificationPanelRef.current?.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNavAction = () => {
    setMobileOpen(false);
  };

  const handleOpenMessageThread = (senderId?: string) => {
    if (!messageRoute) {
      return;
    }

    handleNavAction();
    setNotificationsOpen(false);

    if (role === 'advisor' && senderId) {
      navigate(messageRoute, { state: { focusUserId: senderId, scrollToBottom: true } });
      return;
    }

    navigate(messageRoute, { state: { scrollToBottom: true } });
  };

  const handleOpenNotification = (notification: NotificationSummary) => {
    dismissNotification(notification.id);
    if (notification.kind === 'assistance') {
      navigate('/app/advisor/messages', { state: { focusUserId: notification.senderId, scrollToBottom: true } });
      return;
    }

    handleOpenMessageThread(notification.senderId);
  };

  const handleSignOut = async () => {
    handleNavAction();
    await logout();
    navigate('/login', { replace: true, state: { authError: 'You have been signed out. Sign in again to continue.' } });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {visibleToastNotifications.length > 0 && (
        <div className="pointer-events-none fixed right-4 top-20 z-[70] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
          {visibleToastNotifications.map((notification) => (
            <div
              key={notification.id}
              className="pointer-events-auto overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl"
            >
              <div className="px-4 py-3 transition-colors hover:bg-blue-50">
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => handleOpenNotification(notification)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 shrink-0 text-[#2563eb]" />
                      <p className="truncate text-sm font-semibold text-[#0f1e3c]">{notification.senderName}</p>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {notification.kind === 'assistance'
                        ? `${notification.senderName} has asked for assistance.`
                        : `You received a message from ${notification.senderName}.`}
                    </p>
                    <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-gray-400">
                      <Clock3 className="h-3.5 w-3.5" />
                      <span>{formatNotificationTime(notification.sentAt)}</span>
                    </div>
                  </button>
                  <button
                    onClick={() => dismissNotificationToast(notification.id)}
                    className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Close notification"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col overflow-hidden bg-navy transition-all duration-200 ease-in-out lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth, flexBasis: sidebarWidth }}
      >
        <div className="flex items-center justify-between px-4 pb-4 pt-6 lg:px-5">
          <div className="flex items-center gap-2 overflow-hidden">
            <Sparkles className="h-6 w-6 shrink-0 text-blue-lt" />
            <span className={`whitespace-nowrap font-display text-lg font-bold text-white transition-opacity duration-200 ${collapsed ? 'lg:hidden' : ''}`}>
              Smart<span className="text-blue-pale">Advisor</span>
            </span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1 text-blue-pale/60 transition-colors hover:text-white lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={`mx-3 mb-4 rounded-xl bg-white/5 px-3 py-3 ${collapsed ? 'lg:mx-2 lg:px-0 lg:py-2' : ''}`}>
          <div className={`flex items-center gap-3 ${collapsed ? 'lg:justify-center' : ''}`}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue text-sm font-bold text-white">
              {user?.initials ?? '??'}
            </div>
            <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
              <p className="truncate text-sm font-semibold text-white">{user?.name ?? 'User'}</p>
              <p className="truncate text-xs text-blue-pale/70">{user?.subtitle ?? ''}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3">
          {sections.map((section) => (
            <div key={section.title}>
              <p className={`mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-blue-pale/40 ${collapsed ? 'lg:text-center lg:px-0' : ''}`}>
                {collapsed ? section.title.charAt(0) : section.title}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const showMessageBadge = item.to === messageRoute && unreadCount > 0;
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.to === '/app/advisor' || item.to === '/app/admin' || item.to === '/app/dashboard'}
                        title={collapsed ? item.label : undefined}
                        onClick={handleNavAction}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            collapsed ? 'lg:justify-center lg:px-2' : ''
                          } ${
                            isActive
                              ? 'bg-[rgba(37,99,235,0.3)] text-white'
                              : 'text-blue-pale/60 hover:bg-white/5 hover:text-white'
                          }`
                        }
                      >
                        <span className="relative shrink-0">
                          <item.icon className="h-[18px] w-[18px]" />
                          {showMessageBadge && (
                            <span className="absolute -right-2 -top-2 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red px-1 text-[9px] font-bold text-white">
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}
                        </span>
                        <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="hidden px-3 pt-2 lg:block">
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-blue-pale/60 transition-colors hover:bg-white/5 hover:text-white ${collapsed ? 'justify-center px-2' : ''}`}
          >
            {collapsed ? <ChevronRight className="h-[18px] w-[18px]" /> : <ChevronLeft className="h-[18px] w-[18px]" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>

        <div className="px-3 pb-5 pt-1">
          <button
            onClick={() => { void handleSignOut(); }}
            title={collapsed ? 'Sign out' : undefined}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-blue-pale/60 transition-colors hover:bg-white/5 hover:text-white ${collapsed ? 'lg:justify-center lg:px-2' : ''}`}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            <span className={collapsed ? 'lg:hidden' : ''}>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-white px-4 sm:h-16 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-lg p-1.5 text-slate transition hover:bg-bg lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="font-display text-base font-bold text-navy sm:text-lg lg:text-xl">{pageTitle}</h1>
          </div>
          <div className="relative" ref={notificationPanelRef}>
            <button
              onClick={() => setNotificationsOpen((prev) => !prev)}
              className="relative rounded-lg p-2 transition hover:bg-bg"
            >
              <Bell className="h-5 w-5 text-slate" />
              {notificationCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red px-1 text-[10px] font-bold text-white">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-gray-200 bg-white p-3 shadow-xl">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#0f1e3c]">Recent notifications</p>
                  <span className="text-xs text-gray-400">{recentNotifications.length}</span>
                </div>
                <div className="max-h-80 space-y-2 overflow-y-auto">
                  {recentNotifications.length > 0 ? (
                    recentNotifications.map((summary) => (
                      <button
                        key={summary.id}
                        onClick={() => handleOpenNotification(summary)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#0f1e3c]">{summary.senderName}</p>
                            <p className="mt-1 line-clamp-2 text-xs text-gray-500">{summary.preview}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            {summary.kind === 'assistance' ? (
                              <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                                !
                              </span>
                            ) : !summary.readAt ? (
                              <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red px-1 text-[10px] font-bold text-white">
                                New
                              </span>
                            ) : null}
                            <p className="mt-1 text-[10px] text-gray-400">{formatNotificationTime(summary.sentAt)}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-200 px-3 py-6 text-center text-sm text-gray-500">
                      No recent notifications right now.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

