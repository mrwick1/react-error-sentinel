import { Breadcrumb } from '../types';

/**
 * Callback type for breadcrumbs
 */
type BreadcrumbCallback = (breadcrumb: Breadcrumb) => void;

/**
 * Configuration for navigation breadcrumbs
 */
export interface NavigationBreadcrumbsConfig {
  /**
   * Include query string in breadcrumbs
   * @default true
   */
  captureSearch?: boolean;

  /**
   * Include hash in breadcrumbs
   * @default false
   */
  captureHash?: boolean;
}

/**
 * Setup navigation breadcrumbs using History API
 * Works with React Router, Next.js, and any History-based router
 *
 * @example
 * ```ts
 * const cleanup = setupNavigationBreadcrumbs(
 *   (breadcrumb) => tracker.addBreadcrumb(breadcrumb)
 * );
 *
 * // Later, to cleanup:
 * cleanup();
 * ```
 *
 * @returns Cleanup function to remove listeners and restore original methods
 */
export function setupNavigationBreadcrumbs(
  onBreadcrumb: BreadcrumbCallback,
  config?: NavigationBreadcrumbsConfig
): () => void {
  const captureSearch = config?.captureSearch ?? true;
  const captureHash = config?.captureHash ?? false;

  // Track previous location
  let previousFullPath = buildFullPath(window.location, captureSearch, captureHash);

  /**
   * Create a navigation breadcrumb
   */
  const createNavigationBreadcrumb = (
    from: string,
    to: string,
    navigationType: 'pushState' | 'replaceState' | 'popstate'
  ) => {
    onBreadcrumb({
      type: 'navigation',
      category: 'navigation',
      message: `Navigated to ${to}`,
      level: 'info',
      data: {
        from,
        to,
        navigationType,
      },
      timestamp: Date.now(),
    });
  };

  // Store original methods
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  // Wrap pushState
  history.pushState = function (
    state: unknown,
    title: string,
    url?: string | URL | null
  ) {
    if (url) {
      const urlObj = new URL(String(url), window.location.origin);
      const newPath = buildFullPath(urlObj, captureSearch, captureHash);

      if (newPath !== previousFullPath) {
        createNavigationBreadcrumb(previousFullPath, newPath, 'pushState');
        previousFullPath = newPath;
      }
    }
    return originalPushState.call(this, state, title, url);
  };

  // Wrap replaceState
  history.replaceState = function (
    state: unknown,
    title: string,
    url?: string | URL | null
  ) {
    if (url) {
      const urlObj = new URL(String(url), window.location.origin);
      const newPath = buildFullPath(urlObj, captureSearch, captureHash);

      if (newPath !== previousFullPath) {
        createNavigationBreadcrumb(previousFullPath, newPath, 'replaceState');
        previousFullPath = newPath;
      }
    }
    return originalReplaceState.call(this, state, title, url);
  };

  // Handle popstate (back/forward)
  const handlePopState = () => {
    const newPath = buildFullPath(window.location, captureSearch, captureHash);

    if (newPath !== previousFullPath) {
      createNavigationBreadcrumb(previousFullPath, newPath, 'popstate');
      previousFullPath = newPath;
    }
  };

  window.addEventListener('popstate', handlePopState);

  // Return cleanup function
  return () => {
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
    window.removeEventListener('popstate', handlePopState);
  };
}

/**
 * Build full path from location/URL object
 */
function buildFullPath(
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
