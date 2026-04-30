import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Bell, ChevronDown, CircleUserRound, HeartPulse, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { dashboardNavItems } from '../../config/nav.config';
import {
  PAGE_VARIANTS,
  STATIC_PAGE_VARIANTS,
  TRANSITIONS,
} from '../../lib/animation.constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';

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
    color: isActive ? '#FFFFFF' : 'var(--color-text-secondary)',
    backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
    fontSize: '13px',
    fontWeight: 600,
    textDecoration: 'none',
    transition: 'background-color 160ms ease, color 160ms ease',
  };
}

export default function DashboardLayout() {
  const { session, signOut } = useAuth();
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();
  const [groupsOpen, setGroupsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const email = session?.user?.email;

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setGroupsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: '#F5F8FC',
        color: 'var(--color-text-primary)',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
      }}
    >
      <div className="flex min-h-screen w-full p-3 sm:p-4">
        <aside
          className="flex w-64 shrink-0 flex-col rounded-l-2xl border bg-white"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Link
            to="/dashboard"
            className="flex h-16 items-center gap-2 border-b px-5 no-underline"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-primary)',
              fontWeight: 800,
            }}
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: 'var(--color-primary-light)' }}
            >
              <HeartPulse size={18} strokeWidth={2.2} />
            </span>
            CareCircle
          </Link>

          <nav className="flex-1 px-4 py-5" aria-label="Dashboard navigation">
            <div className="space-y-2">
              {dashboardNavItems.map((item) => {
                const Icon = item.icon;

                if (item.children) {
                  return (
                    <div key={item.label} ref={dropdownRef}>
                      <button
                        type="button"
                        onClick={() => setGroupsOpen((open) => !open)}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') setGroupsOpen(false);
                        }}
                        aria-expanded={groupsOpen}
                        aria-controls="groups-nav-menu"
                        className="w-full"
                        style={{
                          ...getNavLinkStyle(false),
                          justifyContent: 'space-between',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: 'Plus Jakarta Sans, sans-serif',
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <Icon size={17} strokeWidth={1.9} />
                          {item.label}
                        </span>
                        <ChevronDown
                          size={16}
                          strokeWidth={1.9}
                          style={{
                            transform: groupsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 160ms ease',
                          }}
                        />
                      </button>

                      {groupsOpen && (
                        <div
                          id="groups-nav-menu"
                          className="ml-4 mt-2 space-y-1 border-l pl-3"
                          style={{ borderColor: 'var(--color-border)' }}
                        >
                          {item.children.map((child) => {
                            const ChildIcon = child.icon;

                            return (
                              <NavLink
                                key={child.path}
                                to={child.path}
                                onClick={() => setGroupsOpen(false)}
                                style={({ isActive }) => getNavLinkStyle(isActive)}
                              >
                                <ChildIcon size={16} strokeWidth={1.8} />
                                {child.label}
                              </NavLink>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <NavLink
                    key={item.path}
                    to={item.path ?? '/dashboard'}
                    style={({ isActive }) => getNavLinkStyle(isActive)}
                  >
                    <Icon size={17} strokeWidth={1.9} />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </nav>

          <div className="border-t p-4" style={{ borderColor: 'var(--color-border)' }}>
            <div
              className="rounded-xl border p-3"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: '#F8FBFF',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
                  style={{
                    backgroundColor: 'var(--color-primary-light)',
                    color: 'var(--color-primary)',
                  }}
                >
                  {getInitials(email)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">Caregiver</p>
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
          className="flex min-w-0 flex-1 flex-col rounded-r-2xl border-y border-r bg-white"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <header
            className="flex h-16 items-center justify-end gap-4 border-b px-8"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border bg-white"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              <Bell size={18} strokeWidth={1.8} />
              <span
                className="absolute right-2 top-2 h-2 w-2 rounded-full"
                style={{ backgroundColor: 'var(--color-status-critical)' }}
              />
            </button>
            <CircleUserRound size={34} strokeWidth={1.5} color="var(--color-primary)" />
          </header>

          <main className="flex-1 overflow-auto p-8">
            <AnimatePresence mode="wait">
              {/* Page transitions orient users after route changes without delaying content. */}
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
