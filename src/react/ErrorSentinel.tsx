import React, { ReactNode, useMemo, ErrorInfo } from 'react';
import { ErrorTrackerProvider } from './ErrorTrackerProvider';
import { ErrorBoundary } from './ErrorBoundary';
import { PartialErrorTrackerConfig, Environment } from '../types';
import { presets, PresetName } from '../core/config';
import { detectEnvironment } from '../utils/environment';

/**
 * Error context passed to fallback render function
 */
export interface ErrorFallbackContext {
  error: Error;
  reset: () => void;
}

/**
 * Props for the ErrorSentinel component
 */
export interface ErrorSentinelProps {
  /**
   * API endpoint URL to send errors to (required)
   */
  url: string;

  /**
   * Authentication token (API key or Bearer token)
   * If provided, will use 'apiKey' auth strategy by default
   */
  token?: string;

  /**
   * Environment (auto-detected if not provided)
   */
  environment?: Environment;

  /**
   * Enable debug mode (auto-enabled in development if not set)
   */
  debug?: boolean;

  /**
   * Enable/disable error tracking
   * @default true
   */
  enabled?: boolean;

  /**
   * Sample rate for error capturing (0-1)
   * @default 1.0
   */
  sampleRate?: number;

  /**
   * Use a preset configuration
   * - 'development': Debug enabled, captures all console methods
   * - 'production': Debug disabled, captures only errors/warnings
   * - 'minimal': No breadcrumbs or console capture
   * - 'full': Maximum capture with all features enabled
   */
  preset?: PresetName;

  /**
   * Fallback UI to show when an error occurs
   * Can be a React node or a function receiving error context
   */
  fallback?: ReactNode | ((context: ErrorFallbackContext) => ReactNode);

  /**
   * Callback when an error is caught
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;

  /**
   * Advanced: Full config override
   * Merged with simple config options (simple options take precedence)
   */
  config?: Partial<PartialErrorTrackerConfig>;

  /**
   * Children to render
   */
  children: ReactNode;
}

/**
 * ErrorSentinel - One-liner error tracking setup for React apps
 *
 * Combines ErrorTrackerProvider + ErrorBoundary with simplified configuration.
 *
 * @example
 * ```tsx
 * // Minimal setup
 * <ErrorSentinel url="https://api.example.com/errors">
 *   <App />
 * </ErrorSentinel>
 *
 * // With authentication and preset
 * <ErrorSentinel
 *   url="https://api.example.com/errors"
 *   token="your-api-key"
 *   preset="production"
 * >
 *   <App />
 * </ErrorSentinel>
 *
 * // With custom fallback
 * <ErrorSentinel
 *   url="https://api.example.com/errors"
 *   fallback={({ error, reset }) => (
 *     <div>
 *       <p>Error: {error.message}</p>
 *       <button onClick={reset}>Try Again</button>
 *     </div>
 *   )}
 * >
 *   <App />
 * </ErrorSentinel>
 * ```
 */
export function ErrorSentinel({
  url,
  token,
  environment,
  debug,
  enabled = true,
  sampleRate,
  preset,
  fallback,
  onError,
  config,
  children,
}: ErrorSentinelProps) {
  // Build merged configuration
  const mergedConfig = useMemo<PartialErrorTrackerConfig>(() => {
    // Detect environment if not provided
    const detectedEnv = environment ?? detectEnvironment();

    // Get preset config if specified
    const presetConfig = preset ? presets[preset] : {};

    // Determine debug mode: explicit > preset > auto (true in development)
    const resolvedDebug =
      debug ?? (preset ? presetConfig.debug : detectedEnv === 'development');

    return {
      // Base preset config
      ...presetConfig,
      // User advanced config
      ...config,
      // Simple config options (highest priority)
      endpoint: url,
      authToken: token,
      authStrategy: token ? 'apiKey' : 'none',
      environment: detectedEnv,
      debug: resolvedDebug,
      enabled,
      ...(sampleRate !== undefined ? { sampleRate } : {}),
    };
  }, [url, token, environment, debug, enabled, sampleRate, preset, config]);

  // Transform fallback if it's a function to match ErrorBoundary's expected signature
  const boundaryFallback = useMemo(() => {
    if (typeof fallback === 'function') {
      // Wrap user's simple fallback to use ErrorBoundary's full context
      return (boundaryContext: { error: Error; reset: () => void }) => {
        const context: ErrorFallbackContext = {
          error: boundaryContext.error,
          reset: boundaryContext.reset,
        };
        return fallback(context);
      };
    }
    return fallback;
  }, [fallback]);

  return (
    <ErrorTrackerProvider config={mergedConfig}>
      <ErrorBoundary fallback={boundaryFallback} onError={onError}>
        {children}
      </ErrorBoundary>
    </ErrorTrackerProvider>
  );
}
