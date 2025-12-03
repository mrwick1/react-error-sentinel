import { useContext, useMemo } from 'react';
import { ErrorTrackerContext } from './ErrorTrackerProvider';
import { ErrorContext, Breadcrumb, UserInfo, SeverityLevel } from '../types';

/**
 * Return type for useErrorTracker hook
 */
export interface UseErrorTrackerReturn {
  /**
   * Unified method to capture errors or messages
   * @param errorOrMessage - Error object or string message
   * @param context - Optional context with tags, extra data, level
   */
  capture: (errorOrMessage: Error | string, context?: ErrorContext) => string;

  /**
   * Add a breadcrumb to the trail
   */
  addBreadcrumb: (breadcrumb: Breadcrumb) => void;

  /**
   * Set user information for error attribution
   */
  setUser: (user: UserInfo) => void;

  /**
   * Set custom context data
   */
  setContext: (key: string, value: unknown) => void;

  /**
   * Manually flush the error queue
   */
  flush: () => Promise<void>;

  /**
   * Capture an error (legacy - use capture() instead)
   */
  captureError: (error: Error, context?: ErrorContext) => string;

  /**
   * Capture an exception (legacy - use capture() instead)
   */
  captureException: (exception: unknown, context?: ErrorContext) => string;

  /**
   * Capture a message (legacy - use capture() instead)
   */
  captureMessage: (message: string, level?: SeverityLevel) => string;
}

/**
 * Hook to access error tracker with memoized methods
 * Must be used within ErrorTrackerProvider or ErrorSentinel
 */
export function useErrorTracker(): UseErrorTrackerReturn {
  const tracker = useContext(ErrorTrackerContext);

  if (!tracker) {
    throw new Error(
      'useErrorTracker must be used within ErrorTrackerProvider or ErrorSentinel'
    );
  }

  // Memoize all methods to prevent unnecessary re-renders
  return useMemo(() => {
    // Bind all methods once
    const boundCaptureError = tracker.captureError.bind(tracker);
    const boundCaptureException = tracker.captureException.bind(tracker);
    const boundCaptureMessage = tracker.captureMessage.bind(tracker);
    const boundAddBreadcrumb = tracker.addBreadcrumb.bind(tracker);
    const boundSetUser = tracker.setUser.bind(tracker);
    const boundSetContext = tracker.setContext.bind(tracker);
    const boundFlush = tracker.flush.bind(tracker);

    return {
      // Unified capture method
      capture: (errorOrMessage: Error | string, context?: ErrorContext): string => {
        if (typeof errorOrMessage === 'string') {
          return boundCaptureMessage(errorOrMessage, context?.level ?? 'error');
        }
        return boundCaptureError(errorOrMessage, context);
      },

      // Core methods (stable references)
      addBreadcrumb: boundAddBreadcrumb,
      setUser: boundSetUser,
      setContext: boundSetContext,
      flush: boundFlush,

      // Legacy methods - kept for backwards compatibility
      captureError: boundCaptureError,
      captureException: boundCaptureException,
      captureMessage: boundCaptureMessage,
    };
  }, [tracker]);
}

/**
 * Convenience hook to get just the capture function
 */
export function useCapture(): (
  errorOrMessage: Error | string,
  context?: ErrorContext
) => string {
  const { capture } = useErrorTracker();
  return capture;
}

/**
 * Convenience hook to get just the breadcrumb function
 */
export function useBreadcrumb(): (breadcrumb: Breadcrumb) => void {
  const { addBreadcrumb } = useErrorTracker();
  return addBreadcrumb;
}
