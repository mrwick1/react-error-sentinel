import { useEffect, useRef } from 'react';
import { useErrorTracker } from './useErrorTracker';

/**
 * Options for useNavigationBreadcrumbs hook
 */
export interface UseNavigationBreadcrumbsOptions {
  /**
   * Enable navigation breadcrumb capture
   * @default true
   */
  enabled?: boolean;

  /**
   * Include query string in navigation paths
   * @default true
   */
  captureSearch?: boolean;

  /**
   * Include hash in navigation paths
   * @default false
   */
  captureHash?: boolean;
}

/**
 * Hook to automatically capture navigation breadcrumbs
 * Works with React Router, Next.js, and any History-based router
 *
 * @example
 * ```tsx
 * function App() {
 *   // Enable navigation breadcrumbs
 *   useNavigationBreadcrumbs();
 *
 *   return <Router>...</Router>;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With options
 * useNavigationBreadcrumbs({
 *   captureSearch: true,
 *   captureHash: true,
 * });
 * ```
 */
export function useNavigationBreadcrumbs(
  options?: UseNavigationBreadcrumbsOptions
): void {
  const { addBreadcrumb } = useErrorTracker();
  const enabled = options?.enabled ?? true;
  const captureSearch = options?.captureSearch ?? true;
  const captureHash = options?.captureHash ?? false;

  // Track previous path
  const previousPathRef = useRef(buildPath(window.location, captureSearch, captureHash));

  useEffect(() => {
    if (!enabled) return;

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    const handleNavigation = (
      to: string,
      type: 'pushState' | 'replaceState' | 'popstate'
    ) => {
      const toUrl = new URL(to, window.location.origin);
      const newPath = buildPath(toUrl, captureSearch, captureHash);
      const from = previousPathRef.current;

      if (newPath !== from) {
        addBreadcrumb({
          type: 'navigation',
          category: 'navigation',
          message: `Navigated to ${newPath}`,
          level: 'info',
          data: { from, to: newPath, navigationType: type },
          timestamp: Date.now(),
        });

        previousPathRef.current = newPath;
      }
    };

    history.pushState = function (
      state: unknown,
      title: string,
      url?: string | URL | null
    ) {
      if (url) handleNavigation(String(url), 'pushState');
      return originalPushState.call(this, state, title, url);
    };

    history.replaceState = function (
      state: unknown,
      title: string,
      url?: string | URL | null
    ) {
      if (url) handleNavigation(String(url), 'replaceState');
      return originalReplaceState.call(this, state, title, url);
    };

    const handlePopState = () => {
      handleNavigation(window.location.href, 'popstate');
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', handlePopState);
    };
  }, [enabled, addBreadcrumb, captureSearch, captureHash]);
}

/**
 * Build path string from location/URL
 */
function buildPath(
  location: Location | URL,
  includeSearch: boolean,
  includeHash: boolean
): string {
  let path = location.pathname;
  if (includeSearch && location.search) {
    path += location.search;
  }
  if (includeHash && location.hash) {
    path += location.hash;
  }
  return path;
}
