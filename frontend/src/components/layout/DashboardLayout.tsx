import { useEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  ChevronDown,
  CircleUserRound,
  HeartPulse,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  buildGroupNavPath,
  dashboardNavItems,
  getActiveGroupId,
  groupContextNavItems,
  isGroupContextNavActive,
} from '../../config/nav.config';
import {
  DROPDOWN_VARIANTS,
  PAGE_VARIANTS,
  STATIC_DROPDOWN_VARIANTS,
  STATIC_PAGE_VARIANTS,
  TRANSITIONS,
} from '../../lib/animation.constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { usePushRegistration } from '../../hooks/usePushRegistration';
import { useGroupDetail } from '../../hooks/groups/useGroupDetail';

function getInitials(email?: string): string {
  if (!email) return 'CC';
  return email.slice(0, 2).toUpperCase();
}

function getNavLinkStyle(isActive: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    height: '38px',
    padding: '0 12px',
    borderRadius: '8px',
    color: isActive ? 'var(--color-nav-active-text)' : 'var(--color-text-secondary)',
    backgroundColor: 'transparent',
    fontSize: '13px',
    fontWeight: 600,
    textDecoration: 'none',
    position: 'relative',
    overflow: 'hidden',
    transition: 'background-color 160ms ease, color 160ms ease',
  };
}

function getChildNavLinkStyle(isActive: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    height: '34px',
    padding: '0 10px',
    borderRadius: '8px',
    color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
    backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
    fontSize: '12px',
    fontWeight: 600,
    textDecoration: 'none',
    transition: 'background-color 160ms ease, color 160ms ease',
  };
}

function getGroupContextNavLinkStyle(isActive: boolean): CSSProperties {
  return {
    ...getChildNavLinkStyle(isActive),
    height: '36px',
    padding: '0 12px',
    fontSize: '13px',
  };
}

function ActiveNavPill({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <motion.span
      layoutId="dashboard-active-nav"
      className="absolute inset-0 rounded-lg"
      style={{ backgroundColor: 'var(--color-primary)' }}
      transition={TRANSITIONS.card}
    />
  );
}

const dashboardNavigationHistoryStorageKey = 'carecircle:dashboard-history';

interface DashboardNavigationHistoryEntry {
  key: string;
  url: string;
}

interface DashboardLocationSnapshot {
  key: string;
  url: string;
}

interface DashboardNavigationHistoryState {
  entries: DashboardNavigationHistoryEntry[];
  index: number;
  currentKey: string;
  currentUrl: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDashboardNavigationHistoryEntry(
  value: unknown,
): value is DashboardNavigationHistoryEntry {
  return (
    isRecord(value) &&
    typeof value.key === 'string' &&
    typeof value.url === 'string'
  );
}

function isDashboardNavigationHistoryState(
  value: unknown,
): value is DashboardNavigationHistoryState {
  return (
    isRecord(value) &&
    Array.isArray(value.entries) &&
    value.entries.every(isDashboardNavigationHistoryEntry) &&
    typeof value.index === 'number' &&
    typeof value.currentKey === 'string' &&
    typeof value.currentUrl === 'string'
  );
}

function createDashboardNavigationHistoryState(
  location: DashboardLocationSnapshot,
): DashboardNavigationHistoryState {
  return {
    entries: [location],
    index: 0,
    currentKey: location.key,
    currentUrl: location.url,
  };
}

function restoreDashboardNavigationHistoryState(
  location: DashboardLocationSnapshot,
): DashboardNavigationHistoryState {
  const storedHistory = window.sessionStorage.getItem(
    dashboardNavigationHistoryStorageKey,
  );

  if (!storedHistory) {
    return createDashboardNavigationHistoryState(location);
  }

  try {
    const parsedHistory: unknown = JSON.parse(storedHistory);

    if (!isDashboardNavigationHistoryState(parsedHistory)) {
      return createDashboardNavigationHistoryState(location);
    }

    const matchingIndex = parsedHistory.entries.findIndex(
      (entry) => entry.key === location.key || entry.url === location.url,
    );

    if (matchingIndex < 0) {
      return createDashboardNavigationHistoryState(location);
    }

    const entries = parsedHistory.entries.map((entry, index) =>
      index === matchingIndex ? location : entry,
    );

    return {
      entries,
      index: matchingIndex,
      currentKey: location.key,
      currentUrl: location.url,
    };
  } catch {
    return createDashboardNavigationHistoryState(location);
  }
}

function dashboardNavigationHistoryReducer(
  state: DashboardNavigationHistoryState,
  location: DashboardLocationSnapshot,
): DashboardNavigationHistoryState {
  if (state.currentKey === location.key && state.currentUrl === location.url) {
    return state;
  }

  const existingIndex = state.entries.findIndex(
    (entry) => entry.key === location.key || entry.url === location.url,
  );

  if (existingIndex >= 0) {
    const entries = state.entries.map((entry, index) =>
      index === existingIndex ? location : entry,
    );

    return {
      ...state,
      entries,
      index: existingIndex,
      currentKey: location.key,
      currentUrl: location.url,
    };
  }

  const entries = [...state.entries.slice(0, state.index + 1), location];

  return {
    entries,
    index: entries.length - 1,
    currentKey: location.key,
    currentUrl: location.url,
  };
}

function useDashboardNavigationHistory(location: DashboardLocationSnapshot) {
  const [historyState, updateHistoryState] = useReducer(
    dashboardNavigationHistoryReducer,
    location,
    restoreDashboardNavigationHistoryState,
  );

  useEffect(() => {
    updateHistoryState(location);
  }, [location]);

  useEffect(() => {
    window.sessionStorage.setItem(
      dashboardNavigationHistoryStorageKey,
      JSON.stringify(historyState),
    );
  }, [historyState]);

  return {
    canGoBack: historyState.index > 0,
    canGoForward: historyState.index < historyState.entries.length - 1,
  };
}

export default function DashboardLayout() {
  const { session, signOut } = useAuth();
  const pushRegistration = usePushRegistration();
  const location = useLocation();
  const navigate = useNavigate();
  const locationSnapshot = useMemo(
    () => ({
      key: location.key,
      url: `${location.pathname}${location.search}${location.hash}`,
    }),
    [location.hash, location.key, location.pathname, location.search],
  );
  const { canGoBack, canGoForward } =
    useDashboardNavigationHistory(locationSnapshot);
  const shouldReduceMotion = useReducedMotion();
  const groupsActive = location.pathname.startsWith('/groups');
  const activeGroupId = useMemo(
    () => getActiveGroupId(location.pathname),
    [location.pathname],
  );
  const { group: activeGroup, loading: activeGroupLoading } = useGroupDetail(
    activeGroupId ?? undefined,
  );
  const [groupsOpen, setGroupsOpen] = useState(groupsActive);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const email = session?.user?.email;

  useEffect(() => {
    if (groupsActive) {
      setGroupsOpen(true);
    }
  }, [groupsActive]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !location.pathname.startsWith('/groups')
      ) {
        setGroupsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [location.pathname]);

  function closeMobileSidebar() {
    setMobileSidebarOpen(false);
  }

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: 'var(--color-bg-page)',
        color: 'var(--color-text-primary)',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
      }}
    >
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 z-30 lg:hidden"
            style={{ backgroundColor: 'var(--color-overlay)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMobileSidebar}
          />
        )}
      </AnimatePresence>

      <div className="flex min-h-screen w-full p-0 lg:p-4">
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r bg-white transition-transform duration-200 ease-out lg:static lg:w-64 lg:translate-x-0 lg:rounded-l-2xl lg:border ${
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div
            className="flex h-16 items-center gap-2 border-b px-5 lg:rounded-tl-2xl"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <Link
              to="/dashboard"
              onClick={closeMobileSidebar}
              className="flex min-w-0 flex-1 items-center gap-2 no-underline"
              style={{
                color: 'var(--color-primary)',
                fontWeight: 800,
              }}
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: 'var(--color-primary-light)' }}
              >
                <HeartPulse size={18} strokeWidth={2.2} />
              </span>
              <span className="truncate">CareCircle</span>
            </Link>
            <button
              type="button"
              aria-label="Close navigation"
              onClick={closeMobileSidebar}
              className="flex h-9 w-9 items-center justify-center rounded-lg lg:hidden"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <X size={18} strokeWidth={1.8} />
            </button>
          </div>

          <nav
            className="flex-1 overflow-y-auto px-4 py-5"
            aria-label="Dashboard navigation"
          >
            <div className="space-y-2">
              {dashboardNavItems.map((item) => {
                const Icon = item.icon;

                if (item.children && item.path) {
                  return (
                    <div key={item.label} ref={dropdownRef}>
                      <div
                        className="relative flex items-center"
                        style={{ height: '38px', borderRadius: '8px' }}
                      >
                        <ActiveNavPill active={groupsActive} />
                        <NavLink
                          to={item.path}
                          onClick={closeMobileSidebar}
                          style={{
                            ...getNavLinkStyle(groupsActive),
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <Icon size={17} strokeWidth={1.9} />
                          {item.label}
                        </NavLink>
                        <button
                          type="button"
                          aria-label="Toggle groups menu"
                          aria-expanded={groupsOpen}
                          aria-controls="groups-nav-menu"
                          onClick={() => setGroupsOpen((open) => !open)}
                          className="relative z-10 mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: groupsActive ? 'var(--color-nav-active-text)' : 'var(--color-text-secondary)',
                          }}
                        >
                          <ChevronDown
                            size={16}
                            strokeWidth={1.9}
                            style={{
                              transform: groupsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 160ms ease',
                            }}
                          />
                        </button>
                      </div>

                      <AnimatePresence initial={false}>
                        {groupsOpen && (
                          <motion.div
                            id="groups-nav-menu"
                            className="overflow-hidden"
                            variants={
                              shouldReduceMotion
                                ? STATIC_DROPDOWN_VARIANTS
                                : DROPDOWN_VARIANTS
                            }
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={TRANSITIONS.dropdown}
                          >
                            <div
                              className="ml-4 mt-2 space-y-1 border-l pl-3"
                              style={{ borderColor: 'var(--color-border)' }}
                            >
                              {item.children.map((child) => {
                                const ChildIcon = child.icon;

                                return (
                                  <NavLink
                                    key={child.path}
                                    to={child.path}
                                    onClick={closeMobileSidebar}
                                    style={({ isActive }) => getChildNavLinkStyle(isActive)}
                                  >
                                    <ChildIcon size={16} strokeWidth={1.8} />
                                    {child.label}
                                  </NavLink>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }

                return (
                  <NavLink
                    key={item.path}
                    to={item.path ?? '/dashboard'}
                    onClick={closeMobileSidebar}
                    style={({ isActive }) => getNavLinkStyle(isActive)}
                  >
                    {({ isActive }) => (
                      <>
                        <ActiveNavPill active={isActive} />
                        <span className="relative z-10 flex">
                          <Icon size={17} strokeWidth={1.9} />
                        </span>
                        <span className="relative z-10">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>

            {activeGroupId && (
              <div className="mt-6">
                <p
                  className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wide"
                  style={{ color: 'var(--color-text-hint)' }}
                >
                  Current care circle
                </p>

                <div
                  className="mb-3 rounded-xl border p-3"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-bg-muted)',
                  }}
                >
                  {activeGroupLoading ? (
                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      Loading care circle...
                    </p>
                  ) : (
                    <>
                      <p
                        className="truncate text-sm font-bold"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {activeGroup?.name ?? 'Care circle'}
                      </p>
                      {activeGroup?.role ? (
                        <p className="mt-0.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          Your role: {activeGroup.role}
                        </p>
                      ) : null}
                      <Link
                        to={`/groups/${activeGroupId}/profile`}
                        onClick={closeMobileSidebar}
                        className="mt-2 inline-block text-xs font-semibold no-underline"
                        style={{ color: 'var(--color-primary)' }}
                      >
                        View profile →
                      </Link>
                    </>
                  )}
                </div>

                <div className="space-y-1">
                  {groupContextNavItems.map((contextItem) => {
                    const ContextIcon = contextItem.icon;
                    const contextPath = buildGroupNavPath(
                      activeGroupId,
                      contextItem.segment,
                    );
                    const isActive = isGroupContextNavActive(
                      location.pathname,
                      activeGroupId,
                      contextItem,
                    );

                    return (
                      <NavLink
                        key={contextItem.segment || 'overview'}
                        to={contextPath}
                        onClick={closeMobileSidebar}
                        style={getGroupContextNavLinkStyle(isActive)}
                      >
                        <ContextIcon size={16} strokeWidth={1.8} />
                        {contextItem.label}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            )}
          </nav>

          <div className="border-t p-4" style={{ borderColor: 'var(--color-border)' }}>
            <div
              className="rounded-xl border p-3"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-muted)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  style={{
                    backgroundColor: 'var(--color-primary-light)',
                    color: 'var(--color-primary)',
                  }}
                >
                  {getInitials(email)}
                </div>
                <div className="min-w-0">
                  <p
                    className="truncate text-sm font-semibold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {activeGroup?.name ?? 'Caregiver'}
                  </p>
                  <p
                    className="truncate text-xs"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {email ?? 'Signed in'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="mt-3 flex items-center gap-2 text-xs font-semibold"
                style={{
                  color: 'var(--color-primary)',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                }}
              >
                <LogOut size={14} strokeWidth={1.8} />
                Sign out
              </button>
            </div>
          </div>
        </aside>

        <div
          className="flex min-w-0 flex-1 flex-col bg-[var(--color-card)] lg:rounded-r-2xl lg:border-y lg:border-r"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <header
            className="flex h-16 items-center justify-between gap-4 border-b px-4 lg:justify-end lg:px-8"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setMobileSidebarOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full border bg-white lg:hidden"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <Menu size={18} strokeWidth={1.8} />
            </button>

            <div className="ml-auto flex items-center gap-2 lg:ml-0" aria-label="Page history controls">
              <motion.button
                type="button"
                aria-label="Go back"
                onClick={() => navigate(-1)}
                disabled={!canGoBack}
                className="flex h-10 w-10 items-center justify-center rounded-full border bg-white"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  cursor: canGoBack ? 'pointer' : 'not-allowed',
                  opacity: canGoBack ? 1 : 0.45,
                }}
                whileTap={shouldReduceMotion || !canGoBack ? undefined : { scale: 0.97 }}
              >
                <ArrowLeft size={18} strokeWidth={1.8} />
              </motion.button>
              <motion.button
                type="button"
                aria-label="Go forward"
                onClick={() => navigate(1)}
                disabled={!canGoForward}
                className="flex h-10 w-10 items-center justify-center rounded-full border bg-white"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  cursor: canGoForward ? 'pointer' : 'not-allowed',
                  opacity: canGoForward ? 1 : 0.45,
                }}
                whileTap={shouldReduceMotion || !canGoForward ? undefined : { scale: 0.97 }}
              >
                <ArrowRight size={18} strokeWidth={1.8} />
              </motion.button>
            </div>
            <button
              type="button"
              aria-label={
                pushRegistration.status === 'registered'
                  ? 'Notifications enabled'
                  : 'Enable notifications'
              }
              title={
                pushRegistration.status === 'registered'
                  ? 'Notifications enabled'
                  : pushRegistration.errorMessage ?? 'Enable browser notifications for medication and appointment alerts'
              }
              onClick={() => void pushRegistration.register()}
              disabled={pushRegistration.status === 'prompting' || pushRegistration.status === 'unsupported'}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border bg-white disabled:opacity-60"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              <Bell size={18} strokeWidth={1.8} />
              {pushRegistration.status !== 'registered' && (
                <span
                  className="absolute right-2 top-2 h-2 w-2 rounded-full"
                  style={{ backgroundColor: 'var(--color-status-critical)' }}
                />
              )}
            </button>
            <CircleUserRound size={34} strokeWidth={1.5} color="var(--color-primary)" />
          </header>

          <main className="flex-1 overflow-auto p-4 lg:p-8">
            {pushRegistration.status !== 'registered' &&
              pushRegistration.status !== 'unsupported' &&
              pushRegistration.status !== 'prompting' && (
                <div
                  className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      Enable notifications
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {pushRegistration.errorMessage ??
                        'Allow browser notifications for overdue medication alerts and appointment reminders (24h and 1h before). The backend must be running locally.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void pushRegistration.register()}
                    className="h-9 rounded-lg px-4 text-sm font-bold text-white"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    Enable notifications
                  </button>
                </div>
              )}
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                variants={shouldReduceMotion ? STATIC_PAGE_VARIANTS : PAGE_VARIANTS}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={TRANSITIONS.page}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
