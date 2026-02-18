/**
 * Navigation configuration for role-based sidebar navigation
 * 
 * This module defines the navigation structure for all user roles in the application.
 * Each role has access to specific menu groups and items based on their permissions.
 */

import type { UserRole } from '@/shared/utils/roleAccess';
import {
  LayoutDashboard,
  Building2,
  FileText,
  BarChart3,
  AlertTriangle,
  FileSearch,
  GraduationCap,
  Calendar,
  ClipboardCheck,
  DollarSign,
  Receipt,
  MapPin,
  Trophy,
  CalendarDays,
  Tag,
  Image,
  FileBarChart,
  UserCog,
  Baby,
  CreditCard,
  MessageSquare,
  Warehouse,
  Users,
} from 'lucide-react';

/**
 * Navigation item interface
 */
export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon?: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  group?: string;
  exact?: boolean; // If true, only match exact path, otherwise match prefix
}

/**
 * Navigation group interface
 */
export interface NavigationGroup {
  id: string;
  label: string;
  items: NavigationItem[];
}

/**
 * Complete navigation configuration organized by role
 */
export const navigationConfig: Record<UserRole, NavigationGroup[]> = {
  SUPERADMIN: [
    {
      id: 'platform',
      label: 'Platform Management',
      items: [
        {
          id: 'academies',
          label: 'Academies',
          path: '/dashboard/platform/academies',
          icon: Building2,
          roles: ['SUPERADMIN'],
          group: 'platform',
        },
        {
          id: 'plans',
          label: 'Plans',
          path: '/dashboard/platform/plans',
          icon: FileText,
          roles: ['SUPERADMIN'],
          group: 'platform',
        },
      ],
    },
    {
      id: 'analytics',
      label: 'Analytics & Audit',
      items: [
        {
          id: 'stats',
          label: 'Statistics',
          path: '/dashboard/platform/stats',
          icon: BarChart3,
          roles: ['SUPERADMIN'],
          group: 'analytics',
        },
        {
          id: 'errors',
          label: 'Errors',
          path: '/dashboard/platform/errors',
          icon: AlertTriangle,
          roles: ['SUPERADMIN'],
          group: 'analytics',
        },
        {
          id: 'audit-logs',
          label: 'Audit Logs',
          path: '/dashboard/platform/audit-logs',
          icon: FileSearch,
          roles: ['SUPERADMIN'],
          group: 'analytics',
        },
      ],
    },
  ],

  OWNER: [
    {
      id: 'overview',
      label: 'Overview',
      items: [
        {
          id: 'owner-overview',
          label: 'Overview',
          path: '/dashboard/owner/overview',
          icon: LayoutDashboard,
          roles: ['OWNER'],
          group: 'overview',
        },
        {
          id: 'select-academy',
          label: 'Select Academy',
          path: '/dashboard/select-academy',
          icon: Building2,
          roles: ['OWNER'],
          group: 'overview',
        },
      ],
    },
    // Owner also has access to all ADMIN routes
    // These will be merged with ADMIN navigation
  ],

  ADMIN: [
    {
      id: 'overview',
      label: 'Overview',
      items: [
        {
          id: 'admin-overview',
          label: 'Overview',
          path: '/dashboard/admin/overview',
          icon: LayoutDashboard,
          roles: ['ADMIN', 'OWNER'],
          group: 'overview',
        },
      ],
    },
    {
      id: 'operations',
      label: 'Operations',
      items: [
        {
          id: 'students',
          label: 'Students',
          path: '/dashboard/students',
          icon: GraduationCap,
          roles: ['ADMIN', 'OWNER'],
          group: 'operations',
        },
        {
          id: 'classes',
          label: 'Classes',
          path: '/dashboard/classes',
          icon: Calendar,
          roles: ['ADMIN', 'OWNER'],
          group: 'operations',
        },
        {
          id: 'attendance',
          label: 'Attendance',
          path: '/dashboard/attendance',
          icon: ClipboardCheck,
          roles: ['ADMIN', 'OWNER'],
          group: 'operations',
        },
      ],
    },
    {
      id: 'finance',
      label: 'Finance',
      items: [
        {
          id: 'finance-items',
          label: 'Items',
          path: '/dashboard/finance/items',
          icon: Tag,
          roles: ['ADMIN', 'OWNER'],
          group: 'finance',
        },
        {
          id: 'invoices',
          label: 'Invoices',
          path: '/dashboard/finance/invoices',
          icon: FileText,
          roles: ['ADMIN', 'OWNER'],
          group: 'finance',
        },
        {
          id: 'receipts',
          label: 'Receipts',
          path: '/dashboard/finance/receipts',
          icon: Receipt,
          roles: ['ADMIN', 'OWNER'],
          group: 'finance',
        },
      ],
    },
    {
      id: 'management',
      label: 'Management',
      items: [
        {
          id: 'users',
          label: 'Users',
          path: '/dashboard/users',
          icon: UserCog,
          roles: ['ADMIN', 'OWNER'],
          group: 'management',
        },
        {
          id: 'media',
          label: 'Media',
          path: '/dashboard/media',
          icon: Image,
          roles: ['ADMIN', 'OWNER'],
          group: 'management',
        },
        {
          id: 'reports',
          label: 'Reports',
          path: '/dashboard/reports',
          icon: FileBarChart,
          roles: ['ADMIN', 'OWNER'],
          group: 'management',
        },
        {
          id: 'finance-overview',
          label: 'Finance Overview',
          path: '/dashboard/management/finance',
          icon: DollarSign,
          roles: ['ADMIN', 'OWNER'],
          group: 'management',
        },
        {
          id: 'facilities',
          label: 'Facilities',
          path: '/dashboard/management/facilities',
          icon: Warehouse,
          roles: ['ADMIN', 'OWNER'],
          group: 'management',
        },
        {
          id: 'staff',
          label: 'Staff',
          path: '/dashboard/management/staff',
          icon: Users,
          roles: ['ADMIN', 'OWNER'],
          group: 'management',
        },
        {
          id: 'feedback',
          label: 'Feedback',
          path: '/dashboard/feedback',
          icon: MessageSquare,
          roles: ['ADMIN', 'OWNER'],
          group: 'management',
        },
      ],
    },
    {
      id: 'settings',
      label: 'Settings',
      items: [
        {
          id: 'locations',
          label: 'Locations',
          path: '/dashboard/settings/locations',
          icon: MapPin,
          roles: ['ADMIN', 'OWNER'],
          group: 'settings',
        },
        {
          id: 'academy-settings',
          label: 'Academy',
          path: '/dashboard/settings/academy',
          icon: Building2,
          roles: ['ADMIN', 'OWNER'],
          group: 'settings',
        },
        {
          id: 'sports',
          label: 'Sports',
          path: '/dashboard/settings/sports',
          icon: Trophy,
          roles: ['ADMIN', 'OWNER'],
          group: 'settings',
        },
        {
          id: 'age-categories',
          label: 'Age Categories',
          path: '/dashboard/settings/age-categories',
          icon: Baby,
          roles: ['ADMIN', 'OWNER'],
          group: 'settings',
        },
        {
          id: 'terms',
          label: 'Terms',
          path: '/dashboard/settings/terms',
          icon: CalendarDays,
          roles: ['ADMIN', 'OWNER'],
          group: 'settings',
        },
        {
          id: 'pricing',
          label: 'Pricing',
          path: '/dashboard/settings/pricing',
          icon: DollarSign,
          roles: ['ADMIN', 'OWNER'],
          group: 'settings',
        },
      ],
    },
  ],

  COACH: [
    {
      id: 'overview',
      label: 'Overview',
      items: [
        {
          id: 'coach-overview',
          label: 'Overview',
          path: '/dashboard/coach/overview',
          icon: LayoutDashboard,
          roles: ['COACH'],
          group: 'overview',
        },
      ],
    },
    {
      id: 'coach-operations',
      label: 'Operations',
      items: [
        {
          id: 'coach-classes',
          label: 'Classes',
          path: '/dashboard/coach/classes',
          icon: Calendar,
          roles: ['COACH'],
          group: 'coach-operations',
        },
        {
          id: 'coach-attendance',
          label: 'Attendance',
          path: '/dashboard/coach/attendance',
          icon: ClipboardCheck,
          roles: ['COACH'],
          group: 'coach-operations',
        },
        {
          id: 'coach-media',
          label: 'Media',
          path: '/dashboard/coach/media',
          icon: Image,
          roles: ['COACH'],
          group: 'coach-operations',
        },
      ],
    },
  ],

  PARENT: [
    {
      id: 'overview',
      label: 'Overview',
      items: [
        {
          id: 'parent-overview',
          label: 'Overview',
          path: '/dashboard/parent/overview',
          icon: LayoutDashboard,
          roles: ['PARENT'],
          group: 'overview',
        },
      ],
    },
    {
      id: 'parent-operations',
      label: 'My Information',
      items: [
        {
          id: 'children',
          label: 'Children',
          path: '/dashboard/parent/children',
          icon: Baby,
          roles: ['PARENT'],
          group: 'parent-operations',
        },
        {
          id: 'parent-attendance',
          label: 'Attendance',
          path: '/dashboard/parent/attendance',
          icon: ClipboardCheck,
          roles: ['PARENT'],
          group: 'parent-operations',
        },
        {
          id: 'parent-invoices',
          label: 'Invoices',
          path: '/dashboard/parent/invoices',
          icon: CreditCard,
          roles: ['PARENT'],
          group: 'parent-operations',
        },
        {
          id: 'parent-media',
          label: 'Media',
          path: '/dashboard/parent/media',
          icon: Image,
          roles: ['PARENT'],
          group: 'parent-operations',
        },
        {
          id: 'feedback',
          label: 'Feedback',
          path: '/dashboard/parent/feedback',
          icon: MessageSquare,
          roles: ['PARENT'],
          group: 'parent-operations',
        },
      ],
    },
  ],
};

/**
 * Get navigation items for a specific role
 * Merges OWNER navigation with ADMIN navigation since OWNER has access to both
 */
export function getNavigationForRole(role: UserRole | null): NavigationGroup[] {
  if (!role) {
    return [];
  }

  if (role === 'OWNER') {
    // OWNER gets both OWNER-specific items and ADMIN items
    const ownerGroups = navigationConfig.OWNER;
    const adminGroups = navigationConfig.ADMIN;
    
    // Merge groups, combining items from both
    const groupMap = new Map<string, NavigationGroup>();

    // Add OWNER groups
    ownerGroups.forEach(group => {
      groupMap.set(group.id, { ...group, items: [...group.items] });
    });

    // Merge ADMIN groups
    adminGroups.forEach(group => {
      if (groupMap.has(group.id)) {
        // Merge items if group exists
        const existing = groupMap.get(group.id)!;
        existing.items = [...existing.items, ...group.items];
      } else {
        // Add new group
        groupMap.set(group.id, { ...group, items: [...group.items] });
      }
    });

    return Array.from(groupMap.values());
  }

  return navigationConfig[role] || [];
}

/**
 * Check if a route is active based on current pathname
 * Supports both exact matches and prefix matches for nested routes
 */
export function isRouteActive(pathname: string, item: NavigationItem): boolean {
  if (item.exact) {
    return pathname === item.path;
  }
  
  // For non-exact matches, check if pathname starts with item path
  // This handles nested routes like /dashboard/students/123
  if (pathname === item.path) {
    return true;
  }
  
  // Check if pathname starts with item path followed by /
  // This ensures /dashboard/students matches but /dashboard/students-new doesn't
  return pathname.startsWith(item.path + '/');
}

/**
 * Get all navigation items flattened (for validation purposes)
 */
export function getAllNavigationItems(): NavigationItem[] {
  const items: NavigationItem[] = [];
  
  Object.values(navigationConfig).forEach(groups => {
    groups.forEach(group => {
      items.push(...group.items);
    });
  });
  
  return items;
}

/**
 * Extract all route paths from router configuration
 * This is a helper for validation - actual router paths should be passed in
 */
export function extractRoutePaths(routerRoutes: Array<{ path: string }>): string[] {
  const paths: string[] = [];
  
  function extractPaths(routes: Array<{ path: string; children?: Array<{ path: string }> }>, prefix = '') {
    routes.forEach(route => {
      const fullPath = prefix + route.path;
      if (fullPath && fullPath !== '*') {
        paths.push(fullPath);
      }
      
      if (route.children) {
        extractPaths(route.children, fullPath);
      }
    });
  }
  
  extractPaths(routerRoutes);
  return paths;
}

/**
 * Validate that all navigation links exist in router
 * Returns a validation report
 */
export function validateNavigationLinks(
  routerPaths: string[],
  navigationItems: NavigationItem[] = getAllNavigationItems()
): {
  valid: NavigationItem[];
  invalid: Array<{ item: NavigationItem; reason: string }>;
} {
  const valid: NavigationItem[] = [];
  const invalid: Array<{ item: NavigationItem; reason: string }> = [];
  
  navigationItems.forEach(item => {
    // Check if exact path exists
    if (routerPaths.includes(item.path)) {
      valid.push(item);
      return;
    }
    
    // Check if a parent route exists (for dynamic routes)
    // e.g., /dashboard/students/:id should match /dashboard/students
    const pathParts = item.path.split('/');
    if (pathParts.length > 0) {
      // Try to find a matching route pattern
      const hasMatch = routerPaths.some(routePath => {
        // Exact match
        if (routePath === item.path) return true;
        
        // Check if routePath is a parent (e.g., /dashboard/students matches /dashboard/students/:id)
        if (item.path.startsWith(routePath + '/')) return true;
        
        // Check if routePath is a dynamic route that could match
        // e.g., /dashboard/students/:id matches /dashboard/students
        const routeParts = routePath.split('/');
        if (routeParts.length === pathParts.length) {
          // Check if all non-param parts match
          return routeParts.every((part, idx) => {
            if (part.startsWith(':')) return true; // Dynamic segment
            return part === pathParts[idx];
          });
        }
      });
      
      if (hasMatch) {
        valid.push(item);
      } else {
        invalid.push({
          item,
          reason: `Route ${item.path} not found in router`,
        });
      }
    } else {
      invalid.push({
        item,
        reason: 'Invalid path format',
      });
    }
  });
  
  return { valid, invalid };
}
