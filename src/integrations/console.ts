import { Breadcrumb } from '../types';

// Store original console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
};

export interface ConsoleConfig {
  enabled: boolean;
  captureLog: boolean;
  captureError: boolean;
  captureWarn: boolean;
  captureInfo: boolean;
  captureDebug: boolean;
}

type BreadcrumbCallback = (breadcrumb: Breadcrumb) => void;
type ErrorCallback = (error: Error, context?: Record<string, unknown>) => void;
type MessageCallback = (message: string, level: 'debug' | 'info' | 'warning' | 'error' | 'fatal') => void;

/**
 * Setup console interceptor
 */
export function setupConsoleInterceptor(
  config: ConsoleConfig,
  onBreadcrumb: BreadcrumbCallback,
  onError?: ErrorCallback,
  onMessage?: MessageCallback
): void {
  if (!config.enabled) return;

  // Intercept console.error - also capture as error event
  if (config.captureError) {
    console.error = function (...args: unknown[]) {
      // Call original console.error
      originalConsole.error.apply(console, args);

      // Skip if this is an internal ErrorSentinel log (prevent infinite loop)
      const firstArg = String(args[0] || '');
      if (firstArg.includes('[ErrorSentinel]')) {
        return;
      }

      // Add breadcrumb
      onBreadcrumb({
        type: 'console',
        category: 'console.error',
        message: formatConsoleArgs(args),
        level: 'error',
        data: { args: sanitizeArgs(args) },
        timestamp: Date.now(),
      });

      // Also capture as error if it looks like an Error object
      if (args[0] instanceof Error && onError) {
        onError(args[0], { tags: { type: 'console_error' } });
      } else if (onMessage) {
        // Capture as message
        onMessage(formatConsoleArgs(args), 'error');
      }
    };
  }

  // Intercept console.warn
  if (config.captureWarn) {
    console.warn = function (...args: unknown[]) {
      originalConsole.warn.apply(console, args);

      // Skip if this is an internal ErrorSentinel log (prevent infinite loop)
      const firstArg = String(args[0] || '');
      if (firstArg.includes('[ErrorSentinel]')) {
        return;
      }

      onBreadcrumb({
        type: 'console',
        category: 'console.warn',
        message: formatConsoleArgs(args),
        level: 'warning',
        data: { args: sanitizeArgs(args) },
        timestamp: Date.now(),
      });
    };
  }

  // Intercept console.log
  if (config.captureLog) {
    console.log = function (...args: unknown[]) {
      originalConsole.log.apply(console, args);

      // Skip if this is an internal ErrorSentinel log (prevent infinite loop)
      const firstArg = String(args[0] || '');
      if (firstArg.includes('[ErrorSentinel]')) {
        return;
      }

      onBreadcrumb({
        type: 'console',
        category: 'console.log',
        message: formatConsoleArgs(args),
        level: 'info',
        data: { args: sanitizeArgs(args) },
        timestamp: Date.now(),
      });
    };
  }

  // Intercept console.info
  if (config.captureInfo) {
    console.info = function (...args: unknown[]) {
      originalConsole.info.apply(console, args);

      // Skip if this is an internal ErrorSentinel log (prevent infinite loop)
      const firstArg = String(args[0] || '');
      if (firstArg.includes('[ErrorSentinel]')) {
        return;
      }

      onBreadcrumb({
        type: 'console',
        category: 'console.info',
        message: formatConsoleArgs(args),
        level: 'info',
        data: { args: sanitizeArgs(args) },
        timestamp: Date.now(),
      });
    };
  }

  // Intercept console.debug
  if (config.captureDebug) {
    console.debug = function (...args: unknown[]) {
      originalConsole.debug.apply(console, args);

      // Skip if this is an internal ErrorSentinel log (prevent infinite loop)
      const firstArg = String(args[0] || '');
      if (firstArg.includes('[ErrorSentinel]')) {
        return;
      }

      onBreadcrumb({
        type: 'console',
        category: 'console.debug',
        message: formatConsoleArgs(args),
        level: 'debug',
        data: { args: sanitizeArgs(args) },
        timestamp: Date.now(),
      });
    };
  }
}

/**
 * Restore original console methods
 */
export function restoreConsole(): void {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;
}

/**
 * Helper to format console arguments
 */
function formatConsoleArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (typeof arg === 'string') return arg;
      if (arg instanceof Error) return arg.message;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(' ');
}

/**
 * Helper to sanitize console arguments (handle circular refs, sensitive data)
 */
function sanitizeArgs(args: unknown[]): unknown[] {
  return args.map((arg) => {
    if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean') {
      return arg;
    }
    if (arg instanceof Error) {
      return {
        name: arg.name,
        message: arg.message,
        stack: arg.stack,
      };
    }
    try {
      // Use JSON.parse(JSON.stringify()) to handle circular refs
      return JSON.parse(JSON.stringify(arg));
    } catch {
      return '[Circular or Non-Serializable]';
    }
  });
}
