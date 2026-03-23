/**
 * Navigation validation utility
 * 
 * Validates that all navigation links correspond to valid router paths
 */

import { getAllNavigationItems, validateNavigationLinks, extractRoutePaths } from './navigation';
import type { RouteObject } from 'react-router-dom';

/**
 * Validate navigation against router configuration
 * 
 * @param routerRoutes - Array of route objects from React Router
 * @returns Validation report with valid and invalid navigation items
 */
export function validateNavigationAgainstRouter(
  routerRoutes: RouteObject[]
): {
  valid: number;
  invalid: number;
  invalidItems: Array<{ path: string; label: string; reason: string }>;
  allRoutes: string[];
  allNavItems: string[];
} {
  const allRoutes = extractRoutePaths(routerRoutes as any);
  const allNavItems = getAllNavigationItems();
  
  // Normalize routes to include /dashboard prefix for nested routes
  const normalizedRoutes = allRoutes.map(route => {
    // If route doesn't start with /dashboard but is a child route, add prefix
    if (route && !route.startsWith('/') && !route.startsWith('*')) {
      return `/dashboard/${route}`;
    }
    return route;
  });

  const validation = validateNavigationLinks(normalizedRoutes, allNavItems);

  return {
    valid: validation.valid.length,
    invalid: validation.invalid.length,
    invalidItems: validation.invalid.map(({ item, reason }) => ({
      path: item.path,
      label: item.label,
      reason,
    })),
    allRoutes: normalizedRoutes,
    allNavItems: allNavItems.map(item => item.path),
  };
}

/**
 * Generate a coverage report showing which routes have navigation items
 */
export function generateCoverageReport(
  routerRoutes: RouteObject[]
): {
  routesWithNav: string[];
  routesWithoutNav: string[];
  navItemsWithoutRoutes: string[];
} {
  const allRoutes = extractRoutePaths(routerRoutes as any);
  const allNavItems = getAllNavigationItems();
  
  // Normalize routes
  const normalizedRoutes = allRoutes.map(route => {
    if (route && !route.startsWith('/') && !route.startsWith('*')) {
      return `/dashboard/${route}`;
    }
    return route;
  });

  const navPaths = new Set(allNavItems.map(item => item.path));

  // Routes that have navigation items
  const routesWithNav = normalizedRoutes.filter(route => {
    if (
      !route ||
      route === '*' ||
      route.startsWith('/onboarding') ||
      route.startsWith('/accept-invite') ||
      route.startsWith('/auth/invite/accept')
    ) {
      return false;
    }
    // Check if any nav item matches this route
    return Array.from(navPaths).some(navPath => {
      if (navPath === route) return true;
      if (route.startsWith(navPath + '/')) return true;
      // Check for dynamic routes
      const routeParts = route.split('/');
      const navParts = navPath.split('/');
      if (routeParts.length === navParts.length) {
        return routeParts.every((part, idx) => {
          if (navParts[idx]?.startsWith(':')) return true;
          return part === navParts[idx];
        });
      }
      return false;
    });
  });

  // Routes without navigation items (dashboard routes only)
  const routesWithoutNav = normalizedRoutes.filter(route => {
    if (!route || route === '*' || !route.startsWith('/dashboard')) {
      return false;
    }
    return !routesWithNav.includes(route);
  });

  // Navigation items without routes
  const navItemsWithoutRoutes = Array.from(navPaths).filter(navPath => {
    return !normalizedRoutes.some(route => {
      if (route === navPath) return true;
      if (navPath.startsWith(route + '/')) return true;
      // Check for dynamic routes
      const routeParts = route.split('/');
      const navParts = navPath.split('/');
      if (routeParts.length === navParts.length) {
        return routeParts.every((part, idx) => {
          if (routeParts[idx]?.startsWith(':')) return true;
          return part === navParts[idx];
        });
      }
      return false;
    });
  });

  return {
    routesWithNav,
    routesWithoutNav,
    navItemsWithoutRoutes,
  };
}
