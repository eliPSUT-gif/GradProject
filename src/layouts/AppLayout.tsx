import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  Bot,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Sparkles,
  User,
  Users,
  X,
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const role = user?.role ?? 'student';
  const sections = NAV[role];
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Dashboard';
  const unreadCount = user ? getUnreadMessageCount(user.id) : 0;
  const messageRoute = role === 'advisor' ? '/app/advisor/messages' : role === 'student' ? '/app/messages' : null;
  const sidebarWidth = mobileOpen || !collapsed ? 240 : 64;

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


  const handleNavAction = () => {
    setMobileOpen(false);
  };

  const handleSignOut = () => {
    handleNavAction();
    logout();
    navigate('/login', { replace: true, state: { authError: 'You have been signed out. Sign in again to continue.' } });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col overflow-hidden bg-navy transition-all duration-200 ease-in-out lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth, flexBasis: sidebarWidth }}
      >
        {/* Logo */}
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

        {/* User card */}
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

        {/* Navigation */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3">
          {sections.map((section) => (
            <div key={section.title}>
              <p className={`mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-blue-pale/40 ${collapsed ? 'lg:text-center lg:px-0' : ''}`}>
                {collapsed ? section.title.charAt(0) : section.title}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
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
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden px-3 pt-2 lg:block">
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-blue-pale/60 transition-colors hover:bg-white/5 hover:text-white ${collapsed ? 'justify-center px-2' : ''}`}
          >
            {collapsed ? <ChevronRight className="h-[18px] w-[18px]" /> : <ChevronLeft className="h-[18px] w-[18px]" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>

        {/* Sign out */}
        <div className="px-3 pb-5 pt-1">
          <button
            onClick={handleSignOut}
            title={collapsed ? 'Sign out' : undefined}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-blue-pale/60 transition-colors hover:bg-white/5 hover:text-white ${collapsed ? 'lg:justify-center lg:px-2' : ''}`}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            <span className={collapsed ? 'lg:hidden' : ''}>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-white px-4 sm:h-16 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-lg p-1.5 text-slate transition hover:bg-bg lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="font-display text-base font-bold text-navy sm:text-lg lg:text-xl">{pageTitle}</h1>
          </div>
          <button
            onClick={() => {
              if (messageRoute) {
                handleNavAction();
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

        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-5 lg:p-8">
          {messagePopup && messageRoute && (
            <button
              onClick={() => { handleNavAction(); navigate(messageRoute); }}
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





