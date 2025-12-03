import { ErrorContext } from '../types';

type ErrorHandler = (error: Error, context?: ErrorContext) => void;
type ExceptionHandler = (exception: unknown, context?: ErrorContext) => void;

/**
 * Setup window error handlers
 */
export function setupWindowHandlers(
  onError: ErrorHandler,
  onException: ExceptionHandler
): () => void {
  // Handler for unhandled errors
  const errorHandler = (event: ErrorEvent) => {
    if (event.error) {
      onError(event.error, {
        tags: { type: 'unhandled_error' },
        extra: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          message: event.message,
        },
      });
    }
  };

  // Handler for unhandled promise rejections
  const rejectionHandler = (event: PromiseRejectionEvent) => {
    onException(event.reason, {
      tags: { type: 'unhandled_rejection' },
      extra: {
        promise: 'Promise rejection',
      },
    });
  };

  // Attach handlers
  window.addEventListener('error', errorHandler);
  window.addEventListener('unhandledrejection', rejectionHandler);

  // Return cleanup function
  return () => {
    window.removeEventListener('error', errorHandler);
    window.removeEventListener('unhandledrejection', rejectionHandler);
  };
}
