import { Breadcrumb, ErrorContext } from '../types';

/**
 * Callback types for fetch wrapper
 */
type BreadcrumbCallback = (breadcrumb: Breadcrumb) => void;
type ErrorCallback = (error: Error, context?: ErrorContext) => void;

/**
 * Configuration for fetch wrapper
 */
export interface FetchWrapperConfig {
  /**
   * Only capture failed API calls (4xx, 5xx, network errors)
   * @default false
   */
  captureOnlyFailedApi?: boolean;

  /**
   * Capture request body in breadcrumbs
   * @default false
   */
  captureRequestBody?: boolean;

  /**
   * Capture response body in breadcrumbs (only for errors)
   * @default false
   */
  captureResponseBody?: boolean;

  /**
   * Maximum body length to capture
   * @default 1000
   */
  maxBodyLength?: number;

  /**
   * URLs to ignore (strings for includes, RegExp for pattern matching)
   */
  ignoredUrls?: (string | RegExp)[];

  /**
   * Treat 4xx responses as errors
   * @default true
   */
  capture4xxAsError?: boolean;

  /**
   * Treat 5xx responses as errors
   * @default true
   */
  capture5xxAsError?: boolean;
}

/**
 * Wrapped fetch function type
 */
export interface WrappedFetch {
  (input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  /**
   * Restore the original fetch function
   */
  restore: () => void;
}

/**
 * Wrap native fetch to capture API calls and errors
 *
 * @example
 * ```ts
 * const wrappedFetch = wrapFetch(
 *   (breadcrumb) => tracker.addBreadcrumb(breadcrumb),
 *   (error, context) => tracker.captureError(error, context),
 *   { captureOnlyFailedApi: true }
 * );
 *
 * // Later, to restore original fetch:
 * wrappedFetch.restore();
 * ```
 */
export function wrapFetch(
  onBreadcrumb: BreadcrumbCallback,
  onError: ErrorCallback,
  config?: FetchWrapperConfig
): WrappedFetch {
  const originalFetch = window.fetch;
  const shouldCaptureAllApis = !config?.captureOnlyFailedApi;
  const maxBodyLength = config?.maxBodyLength ?? 1000;
  const capture4xx = config?.capture4xxAsError ?? true;
  const capture5xx = config?.capture5xxAsError ?? true;

  const wrappedFetch = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    // Extract URL
    let url: string;
    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.href;
    } else {
      url = input.url;
    }

    const method = init?.method ?? 'GET';

    // Check if URL should be ignored
    if (shouldIgnoreUrl(url, config?.ignoredUrls)) {
      return originalFetch(input, init);
    }

    const startTime = Date.now();

    // Add request breadcrumb
    if (shouldCaptureAllApis) {
      const requestBreadcrumb: Breadcrumb = {
        type: 'api',
        category: 'fetch.request',
        message: `${method.toUpperCase()} ${truncateUrl(url)}`,
        level: 'info',
        data: {
          url,
          method: method.toUpperCase(),
        },
        timestamp: Date.now(),
      };

      if (config?.captureRequestBody && init?.body) {
        requestBreadcrumb.data = {
          ...requestBreadcrumb.data,
          body: truncate(stringifyBody(init.body), maxBodyLength),
        };
      }

      onBreadcrumb(requestBreadcrumb);
    }

    try {
      const response = await originalFetch(input, init);
      const duration = Date.now() - startTime;

      const isClientError = response.status >= 400 && response.status < 500;
      const isServerError = response.status >= 500;
      const isError =
        (isClientError && capture4xx) || (isServerError && capture5xx);

      if (response.ok) {
        // Success breadcrumb
        if (shouldCaptureAllApis) {
          onBreadcrumb({
            type: 'api',
            category: 'fetch.response',
            message: `${method.toUpperCase()} ${truncateUrl(url)} - ${response.status}`,
            level: 'info',
            data: {
              url,
              method: method.toUpperCase(),
              status: response.status,
              statusText: response.statusText,
              duration,
            },
            timestamp: Date.now(),
          });
        }
      } else {
        // Error response breadcrumb
        const errorBreadcrumb: Breadcrumb = {
          type: 'api',
          category: 'fetch.error',
          message: `${method.toUpperCase()} ${truncateUrl(url)} - ${response.status} ${response.statusText}`,
          level: 'error',
          data: {
            url,
            method: method.toUpperCase(),
            status: response.status,
            statusText: response.statusText,
            duration,
          },
          timestamp: Date.now(),
        };

        onBreadcrumb(errorBreadcrumb);

        // Capture as error event if configured
        if (isError) {
          const errorMessage = `Fetch Error: ${method.toUpperCase()} ${url} - ${response.status} ${response.statusText}`;
          const error = new Error(errorMessage);
          error.name = 'FetchError';

          onError(error, {
            tags: {
              type: 'fetch_error',
              status: String(response.status),
            },
            extra: {
              request: { url, method: method.toUpperCase() },
              response: {
                status: response.status,
                statusText: response.statusText,
              },
              duration,
            },
          });
        }
      }

      return response;
    } catch (networkError) {
      // Network error (no response)
      const duration = Date.now() - startTime;
      const error =
        networkError instanceof Error
          ? networkError
          : new Error(String(networkError));

      const errorMessage = `Fetch Network Error: ${method.toUpperCase()} ${url} - ${error.message}`;

      onBreadcrumb({
        type: 'api',
        category: 'fetch.error',
        message: errorMessage,
        level: 'error',
        data: {
          url,
          method: method.toUpperCase(),
          error: error.message,
          duration,
        },
        timestamp: Date.now(),
      });

      const wrappedError = new Error(errorMessage);
      wrappedError.name = 'FetchNetworkError';

      onError(wrappedError, {
        tags: { type: 'fetch_network_error' },
        extra: {
          request: { url, method: method.toUpperCase() },
          originalError: error.message,
          duration,
        },
      });

      throw networkError;
    }
  };

  // Install the wrapper
  window.fetch = wrappedFetch;

  // Add restore method
  wrappedFetch.restore = () => {
    window.fetch = originalFetch;
  };

  return wrappedFetch;
}

/**
 * Check if URL should be ignored
 */
function shouldIgnoreUrl(
  url: string,
  ignoredUrls?: (string | RegExp)[]
): boolean {
  if (!ignoredUrls || ignoredUrls.length === 0) {
    return false;
  }

  return ignoredUrls.some((pattern) => {
    if (typeof pattern === 'string') {
      return url.includes(pattern);
    }
    return pattern.test(url);
  });
}

/**
 * Truncate URL for display
 */
function truncateUrl(url: string, maxLength: number = 100): string {
  if (url.length <= maxLength) return url;
  return url.slice(0, maxLength) + '...';
}

/**
 * Truncate string to max length
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

/**
 * Convert body to string for logging
 */
function stringifyBody(body: BodyInit): string {
  if (typeof body === 'string') {
    return body;
  }
  if (body instanceof URLSearchParams) {
    return body.toString();
  }
  if (body instanceof FormData) {
    return '[FormData]';
  }
  if (body instanceof Blob) {
    return `[Blob: ${body.size} bytes]`;
  }
  if (body instanceof ArrayBuffer) {
    return `[ArrayBuffer: ${body.byteLength} bytes]`;
  }
  return '[Unknown Body Type]';
}
