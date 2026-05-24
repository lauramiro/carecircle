import {
  Bot,
  CalendarHeart,
  ClipboardList,
  FileText,
  FolderOpen,
  LayoutDashboard,
  NotebookText,
  Pill,
  Plus,
  Settings,
  Users,
} from 'lucide-react';
import type { ComponentType } from 'react';

export interface NavChildItem {
  label: string;
  path: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
}

export interface NavItem {
  label: string;
  path?: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  children?: NavChildItem[];
}

export interface GroupContextNavItem {
  label: string;
  segment: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  exact?: boolean;
}

export const dashboardNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Groups',
    path: '/groups/list',
    icon: Users,
    children: [
      {
        label: 'All groups',
        path: '/groups/list',
        icon: FolderOpen,
      },
      {
        label: 'Create group',
        path: '/groups/create',
        icon: Plus,
      },
    ],
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: Settings,
  },
];

export const groupContextNavItems: GroupContextNavItem[] = [
  { label: 'Overview', segment: '', icon: LayoutDashboard, exact: true },
  { label: 'Members', segment: 'members', icon: Users },
  { label: "Today's medications", segment: 'checklist', icon: ClipboardList },
  { label: 'Schedule', segment: 'medications', icon: Pill },
  { label: 'Journal', segment: 'journal', icon: NotebookText },
  { label: 'Appointments', segment: 'appointments', icon: CalendarHeart },
  { label: 'Administration log', segment: 'administration-log', icon: FileText },
  { label: 'AI assistant', segment: 'ai-assistant', icon: Bot },
];

export function getActiveGroupId(pathname: string): string | null {
  const match = pathname.match(/^\/groups\/(?!create|list)([^/]+)/);
  return match?.[1] ?? null;
}

export function buildGroupNavPath(groupId: string, segment: string): string {
  return segment ? `/groups/${groupId}/${segment}` : `/groups/${groupId}`;
}

export function isGroupContextNavActive(
  pathname: string,
  groupId: string,
  item: GroupContextNavItem,
): boolean {
  const itemPath = buildGroupNavPath(groupId, item.segment);

  if (item.exact) {
    return pathname === itemPath;
  }

  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}
