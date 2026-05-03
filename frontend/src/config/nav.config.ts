import { HeartPulse, LayoutDashboard, Plus, Users } from 'lucide-react';
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

export const dashboardNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Groups',
    icon: Users,
    children: [
      {
        label: 'Create Group',
        path: '/groups/create',
        icon: Plus,
      },
      {
        label: 'List Groups',
        path: '/groups/list',
        icon: HeartPulse,
      },
    ],
  },
];
