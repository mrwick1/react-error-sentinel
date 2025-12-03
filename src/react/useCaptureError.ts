import { useEffect, useRef } from 'react';
import { useErrorTracker } from './useErrorTracker';
import { ErrorContext } from '../types';

/**
 * Options for useCaptureError hook
 */
export interface UseCaptureErrorOptions {
  /**
   * The error to capture (null/undefined means no error)
   */
  error: Error | null | undefined;

  /**
   * Additional context to attach to the error
   */
  context?: ErrorContext;

  /**
   * Whether capturing is enabled
   * @default true
   */
  enabled?: boolean;

  /**
   * Only capture the first occurrence of each error
   * Uses error name + message as fingerprint
   * @default true
   */
  captureOnce?: boolean;
}

/**
 * Declaratively capture errors when they occur
 * Useful for capturing errors from async operations, API calls, etc.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { data, error } = useSomeAsyncHook();
 *
 *   // Automatically capture error when it occurs
 *   useCaptureError({ error });
 *
 *   return <div>{data}</div>;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With context
 * useCaptureError({
 *   error,
 *   context: {
 *     tags: { source: 'api' },
 *     extra: { endpoint: '/users' },
 *   },
 * });
 * ```
 *
 * @returns The event ID if an error was captured, null otherwise
 */
export function useCaptureError({
  error,
  context,
  enabled = true,
  captureOnce = true,
}: UseCaptureErrorOptions): string | null {
  const { captureError } = useErrorTracker();
  const capturedRef = useRef<Set<string>>(new Set());
  const eventIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !error) {
      return;
    }

    // Create a fingerprint for deduplication
    const fingerprint = `${error.name}:${error.message}`;

    if (captureOnce && capturedRef.current.has(fingerprint)) {
      return;
    }

    const eventId = captureError(error, context);
    eventIdRef.current = eventId;
    capturedRef.current.add(fingerprint);
  }, [error, enabled, captureError, context, captureOnce]);

  return eventIdRef.current;
}

/**
 * Options for useCaptureQueryError hook
 */
export interface UseCaptureQueryErrorOptions<TError = Error> {
  /**
   * The query error (from React Query, SWR, etc.)
   */
  error: TError | null | undefined;

  /**
   * Query key for identification in error reports
   */
  queryKey?: string | string[];

  /**
   * Whether capturing is enabled
   * @default true
   */
  enabled?: boolean;
}

/**
 * Hook to capture errors from React Query / TanStack Query / SWR
 *
 * @example
 * ```tsx
 * function UserProfile({ userId }) {
 *   const { data, error } = useQuery(['user', userId], fetchUser);
 *
 *   useCaptureQueryError({ error, queryKey: ['user', userId] });
 *
 *   return <div>{data?.name}</div>;
 * }
 * ```
 *
 * @returns The event ID if an error was captured, null otherwise
 */
export function useCaptureQueryError<TError = Error>({
  error,
  queryKey,
  enabled = true,
}: UseCaptureQueryErrorOptions<TError>): string | null {
  // Convert to Error if not already
  const errorObj = error instanceof Error ? error : null;

  // Build query key string for context
  const queryKeyStr = Array.isArray(queryKey)
    ? queryKey.join('/')
    : queryKey ?? 'unknown';

  return useCaptureError({
    error: errorObj,
    enabled: enabled && errorObj !== null,
    context: {
      tags: { type: 'query_error', queryKey: queryKeyStr },
      extra: { queryKey },
    },
  });
}

/**
 * Options for useCaptureAsyncError hook
 */
export interface UseCaptureAsyncErrorOptions {
  /**
   * Tags to attach to captured errors
   */
  tags?: Record<string, string>;

  /**
   * Extra data to attach to captured errors
   */
  extra?: Record<string, unknown>;
}

/**
 * Hook that returns a wrapper function for async operations
 * Automatically captures any errors thrown
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const captureAsync = useCaptureAsyncError();
 *
 *   const handleClick = async () => {
 *     await captureAsync(async () => {
 *       const result = await riskyOperation();
 *       // ... use result
 *     });
 *   };
 *
 *   return <button onClick={handleClick}>Do Something</button>;
 * }
 * ```
 */
export function useCaptureAsyncError(options?: UseCaptureAsyncErrorOptions) {
  const { captureError } = useErrorTracker();

  return async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof Error) {
        captureError(error, {
          tags: { type: 'async_error', ...options?.tags },
          extra: options?.extra,
        });
      }
      throw error;
    }
  };
}
