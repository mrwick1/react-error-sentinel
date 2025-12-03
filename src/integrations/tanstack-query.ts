import { Breadcrumb, ErrorContext } from '../types';

/**
 * Callback types
 */
type BreadcrumbCallback = (breadcrumb: Breadcrumb) => void;
type ErrorCallback = (error: Error, context?: ErrorContext) => void;

/**
 * Minimal TanStack Query cache event types
 */
interface QueryCacheNotifyEvent {
  type: string;
  query: {
    queryKey: unknown[];
    queryHash: string;
    state: {
      status: 'pending' | 'error' | 'success';
      error?: Error | null;
      fetchStatus: 'fetching' | 'paused' | 'idle';
    };
  };
}

interface MutationCacheNotifyEvent {
  type: string;
  mutation: {
    mutationId: number;
    options: {
      mutationKey?: unknown[];
    };
    state: {
      status: 'idle' | 'pending' | 'error' | 'success';
      error?: Error | null;
    };
  };
}

/**
 * Minimal TanStack Query cache interfaces
 */
interface QueryCache {
  subscribe: (callback: (event: QueryCacheNotifyEvent) => void) => () => void;
}

interface MutationCache {
  subscribe: (callback: (event: MutationCacheNotifyEvent) => void) => () => void;
}

/**
 * Configuration for TanStack Query tracking
 */
export interface TanStackQueryConfig {
  /**
   * Capture query events
   * @default true
   */
  captureQueries?: boolean;

  /**
   * Capture mutation events
   * @default true
   */
  captureMutations?: boolean;

  /**
   * Only capture error events (not success)
   * @default false
   */
  captureOnlyErrors?: boolean;

  /**
   * Query keys to ignore (uses JSON.stringify for comparison)
   */
  ignoredQueryKeys?: string[];
}

/**
 * Setup TanStack Query error tracking
 *
 * @example
 * ```ts
 * import { QueryClient } from '@tanstack/react-query';
 *
 * const queryClient = new QueryClient();
 *
 * const cleanup = setupTanStackQueryTracking(
 *   queryClient.getQueryCache(),
 *   queryClient.getMutationCache(),
 *   (breadcrumb) => tracker.addBreadcrumb(breadcrumb),
 *   (error, context) => tracker.captureError(error, context),
 *   { captureOnlyErrors: true }
 * );
 *
 * // Later, to cleanup:
 * cleanup();
 * ```
 *
 * @returns Cleanup function to unsubscribe from caches
 */
export function setupTanStackQueryTracking(
  queryCache: QueryCache,
  mutationCache: MutationCache,
  onBreadcrumb: BreadcrumbCallback,
  onError: ErrorCallback,
  config?: TanStackQueryConfig
): () => void {
  const captureQueries = config?.captureQueries ?? true;
  const captureMutations = config?.captureMutations ?? true;
  const captureOnlyErrors = config?.captureOnlyErrors ?? false;
  const ignoredQueryKeys = config?.ignoredQueryKeys ?? [];

  const cleanups: (() => void)[] = [];

  // Track query events
  if (captureQueries) {
    const unsubscribeQueries = queryCache.subscribe((event) => {
      const queryKeyStr = JSON.stringify(event.query.queryKey);

      // Check if query key should be ignored
      if (ignoredQueryKeys.includes(queryKeyStr)) {
        return;
      }

      // Only handle state updates
      if (event.type !== 'updated') {
        return;
      }

      const { status, error } = event.query.state;

      if (status === 'error' && error) {
        // Error breadcrumb
        onBreadcrumb({
          type: 'api',
          category: 'query.error',
          message: `Query failed: ${truncateQueryKey(queryKeyStr)}`,
          level: 'error',
          data: {
            queryKey: event.query.queryKey,
            queryHash: event.query.queryHash,
            error: error.message,
          },
          timestamp: Date.now(),
        });

        // Capture as error event
        onError(error, {
          tags: { type: 'query_error' },
          extra: {
            queryKey: event.query.queryKey,
            queryHash: event.query.queryHash,
          },
        });
      } else if (!captureOnlyErrors && status === 'success') {
        // Success breadcrumb
        onBreadcrumb({
          type: 'api',
          category: 'query.success',
          message: `Query succeeded: ${truncateQueryKey(queryKeyStr)}`,
          level: 'info',
          data: {
            queryKey: event.query.queryKey,
            queryHash: event.query.queryHash,
          },
          timestamp: Date.now(),
        });
      }
    });
    cleanups.push(unsubscribeQueries);
  }

  // Track mutation events
  if (captureMutations) {
    const unsubscribeMutations = mutationCache.subscribe((event) => {
      // Only handle state updates
      if (event.type !== 'updated') {
        return;
      }

      const mutationKey = event.mutation.options.mutationKey
        ? JSON.stringify(event.mutation.options.mutationKey)
        : `mutation-${event.mutation.mutationId}`;

      const { status, error } = event.mutation.state;

      if (status === 'error' && error) {
        // Error breadcrumb
        onBreadcrumb({
          type: 'api',
          category: 'mutation.error',
          message: `Mutation failed: ${truncateQueryKey(mutationKey)}`,
          level: 'error',
          data: {
            mutationKey: event.mutation.options.mutationKey,
            mutationId: event.mutation.mutationId,
            error: error.message,
          },
          timestamp: Date.now(),
        });

        // Capture as error event
        onError(error, {
          tags: { type: 'mutation_error' },
          extra: {
            mutationKey: event.mutation.options.mutationKey,
            mutationId: event.mutation.mutationId,
          },
        });
      } else if (!captureOnlyErrors && status === 'success') {
        // Success breadcrumb
        onBreadcrumb({
          type: 'api',
          category: 'mutation.success',
          message: `Mutation succeeded: ${truncateQueryKey(mutationKey)}`,
          level: 'info',
          data: {
            mutationKey: event.mutation.options.mutationKey,
            mutationId: event.mutation.mutationId,
          },
          timestamp: Date.now(),
        });
      }
    });
    cleanups.push(unsubscribeMutations);
  }

  // Return cleanup function
  return () => {
    cleanups.forEach((cleanup) => cleanup());
  };
}

/**
 * Truncate query key for display
 */
function truncateQueryKey(key: string, maxLength: number = 50): string {
  if (key.length <= maxLength) return key;
  return key.slice(0, maxLength) + '...';
}
