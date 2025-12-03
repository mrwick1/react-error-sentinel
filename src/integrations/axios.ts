import { Breadcrumb, ErrorContext } from '../types';

// Minimal Axios types (to avoid importing axios as dependency)
interface AxiosRequestConfig {
  url?: string;
  method?: string;
  data?: unknown;
  headers?: Record<string, string>;
}

interface AxiosResponse {
  data: unknown;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: AxiosRequestConfig;
}

interface AxiosError extends Error {
  config?: AxiosRequestConfig;
  response?: AxiosResponse;
  request?: unknown;
  isAxiosError?: boolean;
}

interface AxiosInterceptorManager<T> {
  use(
    onFulfilled?: (value: T) => T | Promise<T>,
    onRejected?: (error: unknown) => unknown
  ): number;
  eject(id: number): void;
}

interface AxiosInstance {
  interceptors: {
    request: AxiosInterceptorManager<AxiosRequestConfig>;
    response: AxiosInterceptorManager<AxiosResponse>;
  };
}

type BreadcrumbCallback = (breadcrumb: Breadcrumb) => void;
type ErrorCallback = (error: Error, context?: ErrorContext) => void;

export interface AxiosWrapperConfig {
  captureOnlyFailedApi?: boolean; // If true, only capture failed API calls as breadcrumbs
  debug?: boolean; // Enable debug logging to console
}

/**
 * Wrap Axios instance to capture API calls and errors
 */
export function wrapAxiosInstance(
  axiosInstance: AxiosInstance,
  onBreadcrumb: BreadcrumbCallback,
  onError: ErrorCallback,
  wrapperConfig?: AxiosWrapperConfig
): void {
  const shouldCaptureAllApis = !wrapperConfig?.captureOnlyFailedApi;
  const debug = wrapperConfig?.debug || false;

  if (debug) {
    console.log('[ErrorSentinel] Axios wrapper initialized', {
      captureOnlyFailedApi: wrapperConfig?.captureOnlyFailedApi,
      shouldCaptureAllApis,
      debug
    });
  }

  // Request interceptor - add breadcrumb (only if capturing all APIs)
  axiosInstance.interceptors.request.use(
    (requestConfig) => {
      if (shouldCaptureAllApis && requestConfig.url) {
        if (debug) {
          console.log('[ErrorSentinel] Capturing API request breadcrumb', { url: requestConfig.url });
        }
        onBreadcrumb({
          type: 'api',
          category: 'http.request',
          message: `${requestConfig.method?.toUpperCase() || 'GET'} ${requestConfig.url}`,
          level: 'info',
          data: {
            url: requestConfig.url,
            method: requestConfig.method,
          },
          timestamp: Date.now(),
        });
      }
      return requestConfig;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor - capture errors and success breadcrumbs
  axiosInstance.interceptors.response.use(
    (response) => {
      // Success breadcrumb (only if capturing all APIs)
      if (shouldCaptureAllApis) {
        if (debug) {
          console.log('[ErrorSentinel] Capturing API response breadcrumb', {
            url: response.config.url,
            status: response.status
          });
        }
        onBreadcrumb({
          type: 'api',
          category: 'http.response',
          message: `${response.config.method?.toUpperCase() || 'GET'} ${response.config.url} - ${response.status}`,
          level: 'info',
          data: {
            url: response.config.url,
            method: response.config.method,
            status: response.status,
            statusText: response.statusText,
          },
          timestamp: Date.now(),
        });
      }
      return response;
    },
    (error: unknown) => {
      // Unwrap custom error wrappers
      let axiosError = error;

      // Check if this is a wrapped error with the actual axios error inside
      // Format: { error: AxiosError, data: ... }
      if (error && typeof error === 'object' && 'error' in error && typeof (error as any).error === 'object') {
        if (debug) {
          console.log('[ErrorSentinel] Detected wrapped error, unwrapping...', {
            originalErrorKeys: Object.keys(error as object),
            hasNestedError: true
          });
        }
        axiosError = (error as any).error;
      }

      // Type guard for axios error
      const typedAxiosError = axiosError as AxiosError;

      // Build error message with meaningful details
      let errorMessage = 'API Error';
      if (typedAxiosError.response) {
        errorMessage = `API Error: ${typedAxiosError.config?.method?.toUpperCase() || 'REQUEST'} ${typedAxiosError.config?.url || 'unknown'} - ${typedAxiosError.response.status} ${typedAxiosError.response.statusText}`;
      } else if (typedAxiosError.message) {
        // Ensure message is always a string
        errorMessage = typeof typedAxiosError.message === 'string'
          ? typedAxiosError.message
          : JSON.stringify(typedAxiosError.message);
      } else if (typedAxiosError.config) {
        errorMessage = `API Error: ${typedAxiosError.config.method?.toUpperCase() || 'REQUEST'} ${typedAxiosError.config.url || 'unknown'}`;
      }

      // Debug: Log axios error structure
      if (debug) {
        console.log('[ErrorSentinel] Axios error structure (after unwrapping):', {
          wasWrapped: error !== axiosError,
          hasConfig: !!typedAxiosError.config,
          hasResponse: !!typedAxiosError.response,
          responseType: typeof typedAxiosError.response?.data,
          responseDataLength: typeof typedAxiosError.response?.data === 'string' ? (typedAxiosError.response.data as string).length : undefined,
          configKeys: typedAxiosError.config ? Object.keys(typedAxiosError.config) : [],
          responseKeys: typedAxiosError.response ? Object.keys(typedAxiosError.response) : [],
          errorType: typeof axiosError,
          errorKeys: Object.keys(axiosError as object)
        });
      }

      // Capture API error with context
      // Build request object - be defensive about extraction
      const requestData: Record<string, unknown> = {};
      if (typedAxiosError.config) {
        if (typedAxiosError.config.url !== undefined) {
          requestData.url = typedAxiosError.config.url;
        }
        if (typedAxiosError.config.method !== undefined) {
          requestData.method = typedAxiosError.config.method?.toUpperCase();
        }
        if (typedAxiosError.config.data !== undefined) {
          requestData.data = typedAxiosError.config.data;
        }
        if (typedAxiosError.config.headers !== undefined) {
          requestData.headers = typedAxiosError.config.headers;
        }
      }

      // Build response object - include raw data (HTML, JSON, whatever)
      const responseData: Record<string, unknown> = {};
      if (typedAxiosError.response) {
        if (typedAxiosError.response.status !== undefined) {
          responseData.status = typedAxiosError.response.status;
        }
        if (typedAxiosError.response.statusText !== undefined) {
          responseData.statusText = typedAxiosError.response.statusText;
        }
        if (typedAxiosError.response.headers !== undefined) {
          responseData.headers = typedAxiosError.response.headers;
        }
        if (typedAxiosError.response.data !== undefined) {
          // Store raw response data (HTML string, JSON object, whatever)
          responseData.data = typedAxiosError.response.data;
        }
      }

      // Build context with request and response
      const extraData: Record<string, unknown> = {
        request: requestData,
      };

      // Always include response if it exists (even if empty)
      if (Object.keys(responseData).length > 0) {
        extraData.response = responseData;
      }

      const context: ErrorContext = {
        tags: { type: 'api_error' },
        extra: extraData,
      };

      // Create Error object with proper message
      const errorObj = typedAxiosError instanceof Error ?
        new Error(errorMessage) :
        new Error(errorMessage);

      // Preserve original stack trace if available
      if (typedAxiosError.stack) {
        errorObj.stack = typedAxiosError.stack;
      }

      // Add breadcrumb for failed API call (regardless of config)
      if (debug) {
        console.log('[ErrorSentinel] Capturing API error', {
          url: typedAxiosError.config?.url,
          status: typedAxiosError.response?.status,
          requestDataKeys: Object.keys(requestData),
          responseDataKeys: Object.keys(responseData),
          hasRequestData: Object.keys(requestData).length > 0,
          hasResponseData: Object.keys(responseData).length > 0,
          requestData: requestData,
          responseData: responseData
        });
      }

      onBreadcrumb({
        type: 'api',
        category: 'http.error',
        message: errorMessage,
        level: 'error',
        data: {
          url: typedAxiosError.config?.url,
          method: typedAxiosError.config?.method,
          status: typedAxiosError.response?.status,
          statusText: typedAxiosError.response?.statusText,
        },
        timestamp: Date.now(),
      });

      onError(errorObj, context);

      return Promise.reject(error);
    }
  );
}
