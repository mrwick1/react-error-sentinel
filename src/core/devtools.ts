import { ErrorTracker } from './tracker';
import { Breadcrumb, ErrorEvent } from '../types';

/**
 * DevTools API exposed on window.__ERROR_SENTINEL__
 */
export interface DevToolsAPI {
  /**
   * Get the tracker instance
   */
  getTracker: () => ErrorTracker;

  /**
   * Get current breadcrumbs
   */
  getBreadcrumbs: () => Breadcrumb[];

  /**
   * Get queued error events
   */
  getQueue: () => ErrorEvent[];

  /**
   * Get current configuration
   */
  getConfig: () => Record<string, unknown>;

  /**
   * Send a test error
   */
  testError: (message?: string) => string;

  /**
   * Add a test breadcrumb
   */
  testBreadcrumb: (message?: string) => void;

  /**
   * Manually flush the queue
   */
  flush: () => Promise<void>;

  /**
   * Clear queue and breadcrumbs
   */
  clear: () => void;

  /**
   * Get version info
   */
  version: string;
}

/**
 * Window with DevTools
 */
declare global {
  interface Window {
    __ERROR_SENTINEL__?: DevToolsAPI;
  }
}

/**
 * Internal tracker interface for accessing private members
 */
interface TrackerInternals {
  breadcrumbs?: {
    getAll: () => Breadcrumb[];
    clear: () => void;
  };
  queue?: {
    getAll: () => ErrorEvent[];
    clear: () => void;
  };
  config?: Record<string, unknown>;
}

/**
 * Install developer tools in the browser console
 *
 * @example
 * ```ts
 * // In your app initialization
 * if (process.env.NODE_ENV === 'development') {
 *   installDevTools(tracker);
 * }
 *
 * // Then in browser console:
 * window.__ERROR_SENTINEL__.getBreadcrumbs()
 * window.__ERROR_SENTINEL__.testError('Test error')
 * window.__ERROR_SENTINEL__.flush()
 * ```
 */
export function installDevTools(tracker: ErrorTracker): DevToolsAPI {
  const internals = tracker as unknown as TrackerInternals;

  const devtools: DevToolsAPI = {
    version: '0.3.0',

    getTracker: () => tracker,

    getBreadcrumbs: () => {
      return internals.breadcrumbs?.getAll() ?? [];
    },

    getQueue: () => {
      return internals.queue?.getAll() ?? [];
    },

    getConfig: () => {
      return internals.config ?? {};
    },

    testError: (message?: string) => {
      const error = new Error(message ?? 'Test error from DevTools');
      error.name = 'DevToolsTestError';
      const eventId = tracker.captureError(error, {
        tags: { type: 'devtools_test' },
      });
      logDevTools(`Test error captured with ID: ${eventId}`);
      return eventId;
    },

    testBreadcrumb: (message?: string) => {
      tracker.addBreadcrumb({
        type: 'manual',
        category: 'devtools.test',
        message: message ?? 'Test breadcrumb from DevTools',
        level: 'info',
        timestamp: Date.now(),
      });
      logDevTools('Test breadcrumb added');
    },

    flush: async () => {
      await tracker.flush();
      logDevTools('Queue flushed');
    },

    clear: () => {
      internals.queue?.clear();
      internals.breadcrumbs?.clear();
      logDevTools('Queue and breadcrumbs cleared');
    },
  };

  // Install on window
  if (typeof window !== 'undefined') {
    window.__ERROR_SENTINEL__ = devtools;

    // Log installation message
    console.log(
      '%c[ErrorSentinel]%c DevTools installed',
      'color: #4CAF50; font-weight: bold',
      'color: inherit'
    );
    console.log(
      '%cAccess via: %cwindow.__ERROR_SENTINEL__',
      'color: #666',
      'color: #2196F3; font-family: monospace'
    );
    console.log(
      '%cCommands:%c\n' +
        '  .getBreadcrumbs() - View breadcrumbs\n' +
        '  .getQueue()       - View queued errors\n' +
        '  .getConfig()      - View configuration\n' +
        '  .testError()      - Send test error\n' +
        '  .testBreadcrumb() - Add test breadcrumb\n' +
        '  .flush()          - Send queue now\n' +
        '  .clear()          - Clear queue/breadcrumbs',
      'color: #9C27B0; font-weight: bold',
      'color: #666; font-family: monospace'
    );
  }

  return devtools;
}

/**
 * Log a DevTools message
 */
function logDevTools(message: string): void {
  console.log(
    '%c[ErrorSentinel DevTools]%c ' + message,
    'color: #4CAF50; font-weight: bold',
    'color: inherit'
  );
}

/**
 * Check if DevTools are installed
 */
export function isDevToolsInstalled(): boolean {
  return typeof window !== 'undefined' && !!window.__ERROR_SENTINEL__;
}

/**
 * Uninstall DevTools
 */
export function uninstallDevTools(): void {
  if (typeof window !== 'undefined') {
    delete window.__ERROR_SENTINEL__;
  }
}
