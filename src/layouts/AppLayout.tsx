import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  Bot,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
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
    {
      title: 'Account',
      items: [
        { label: 'Profile', to: '/app/profile', icon: User },
        { label: 'Settings', to: '/app/settings', icon: Settings },
      ],
    },
  ],
  advisor: [
    {
      title: 'Main',
      items: [
        { label: 'Dashboard', to: '/app/advisor', icon: LayoutDashboard },
        { label: 'Course Analysis', to: '/app/advisor/courses', icon: BookOpen },
        { label: 'Messages', to: '/app/advisor/messages', icon: MessageSquare },
      ],
    },
    {
      title: 'Tools',
      items: [
        { label: 'Reports', to: '/app/advisor/reports', icon: ClipboardList },
        { label: 'Settings', to: '/app/advisor/settings', icon: Settings },
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
  '/app/profile': 'Profile',
  '/app/messages': 'Messages',
  '/app/settings': 'Settings',
  '/app/advisor': 'Advisor Dashboard',
  '/app/advisor/courses': 'Course Analysis',
  '/app/advisor/messages': 'Messages',
  '/app/advisor/reports': 'Reports',
  '/app/advisor/settings': 'Settings',
  '/app/admin': 'Admin Overview',
  '/app/admin/courses': 'Course Management',
  '/app/admin/users': 'User Management',
  '/app/admin/model': 'Model Status',
  '/app/admin/settings': 'Settings',
};

export default function AppLayout() {
  const { logout, user } = useAuth();
  const { getUnreadMessageCount } = useAppData();
  const location = useLocation();
  const navigate = useNavigate();
  const previousUnreadRef = useRef(0);
  const hideTimerRef = useRef<number | null>(null);
  const [messagePopup, setMessagePopup] = useState<string | null>(null);

  const role = user?.role ?? 'student';
  const sections = NAV[role];
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Dashboard';
  const unreadCount = user ? getUnreadMessageCount(user.id) : 0;
  const messageRoute = role === 'advisor' ? '/app/advisor/messages' : role === 'student' ? '/app/messages' : null;

  useEffect(() => {
    if (!user || !messageRoute) {
      previousUnreadRef.current = unreadCount;
      return;
    }

    const increasedBy = unreadCount - previousUnreadRef.current;
    const isOnInbox = location.pathname === messageRoute;
    if (increasedBy > 0 && !isOnInbox) {
      setMessagePopup(`${increasedBy} new message${increasedBy === 1 ? '' : 's'} in your inbox`);
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
      hideTimerRef.current = window.setTimeout(() => {
        setMessagePopup(null);
      }, 4500);
    }

    previousUnreadRef.current = unreadCount;
  }, [location.pathname, messageRoute, unreadCount, user]);

  useEffect(() => () => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
    }
  }, []);

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true, state: { authError: 'You have been signed out. Sign in again to continue.' } });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <aside className="flex w-60 shrink-0 flex-col bg-navy">
        <div className="flex items-center gap-2 px-6 pb-4 pt-6">
          <Sparkles className="h-6 w-6 text-blue-lt" />
          <span className="font-display text-lg font-bold text-white">
            Smart<span className="text-blue-pale">Advisor</span>
          </span>
        </div>

        <div className="mx-3 mb-4 rounded-xl bg-white/5 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue text-sm font-bold text-white">
              {user?.initials ?? '??'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user?.name ?? 'User'}</p>
              <p className="truncate text-xs text-blue-pale/70">{user?.subtitle ?? ''}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-blue-pale/40">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/app/advisor' || item.to === '/app/admin' || item.to === '/app/dashboard'}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-[rgba(37,99,235,0.3)] text-white'
                            : 'text-blue-pale/60 hover:bg-white/5 hover:text-white'
                        }`
                      }
                    >
                      <item.icon className="h-[18px] w-[18px]" />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="px-3 pb-5 pt-2">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-blue-pale/60 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-white px-8">
          <h1 className="font-display text-xl font-bold text-navy">{pageTitle}</h1>
          <button
            onClick={() => {
              if (messageRoute) {
                navigate(messageRoute);
              }
            }}
            className="relative rounded-lg p-2 transition hover:bg-bg"
          >
            <Bell className="h-5 w-5 text-slate" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          {messagePopup && messageRoute && (
            <button
              onClick={() => navigate(messageRoute)}
              className="mb-4 inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100"
            >
              <MessageSquare className="h-4 w-4" />
              {messagePopup}
            </button>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
