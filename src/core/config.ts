import {
  ErrorTrackerConfig,
  PartialErrorTrackerConfig,
  Environment,
} from '../types/config';

/**
 * Preset name type
 */
export type PresetName = 'development' | 'production' | 'minimal' | 'full';

/**
 * Configuration presets for common use cases
 */
export const presets: Record<PresetName, Partial<ErrorTrackerConfig>> = {
  development: {
    debug: true,
    environment: 'development',
    sampleRate: 1.0,
    console: {
      enabled: true,
      captureLog: true,
      captureError: true,
      captureWarn: true,
      captureInfo: true,
      captureDebug: true,
    },
  },
  production: {
    debug: false,
    environment: 'production',
    sampleRate: 1.0,
    console: {
      enabled: true,
      captureLog: false,
      captureError: true,
      captureWarn: true,
      captureInfo: false,
      captureDebug: false,
    },
  },
  minimal: {
    breadcrumbs: {
      enabled: false,
      maxBreadcrumbs: 0,
      captureClicks: false,
      captureNavigation: false,
      captureApiCalls: false,
      captureOnlyFailedApi: false,
      captureStateChanges: false,
    },
    console: {
      enabled: false,
      captureLog: false,
      captureError: false,
      captureWarn: false,
      captureInfo: false,
      captureDebug: false,
    },
    captureState: false,
  },
  full: {
    debug: true,
    sampleRate: 1.0,
    breadcrumbs: {
      enabled: true,
      maxBreadcrumbs: 100,
      captureClicks: true,
      captureNavigation: true,
      captureApiCalls: true,
      captureOnlyFailedApi: false,
      captureStateChanges: true,
    },
    console: {
      enabled: true,
      captureLog: true,
      captureError: true,
      captureWarn: true,
      captureInfo: true,
      captureDebug: true,
    },
    captureState: true,
  },
};

/**
 * Simple configuration for quick setup
 */
export interface SimpleConfig {
  url: string;
  token?: string;
  environment?: Environment;
  debug?: boolean;
  enabled?: boolean;
  sampleRate?: number;
  preset?: PresetName;
}

/**
 * Convert simple config to full partial config
 */
export function fromSimpleConfig(simple: SimpleConfig): PartialErrorTrackerConfig {
  const presetConfig = simple.preset ? presets[simple.preset] : {};

  return {
    endpoint: simple.url,
    authToken: simple.token,
    authStrategy: simple.token ? 'apiKey' : 'none',
    environment: simple.environment,
    debug: simple.debug,
    enabled: simple.enabled,
    sampleRate: simple.sampleRate,
    ...presetConfig,
  };
}

/**
 * Default configuration
 */
export const defaultConfig: ErrorTrackerConfig = {
  endpoint: '',
  authStrategy: 'none',
  payloadKey: 'events',
  environment: 'development',
  enabled: true,
  captureState: true,
  breadcrumbs: {
    enabled: true,
    maxBreadcrumbs: 50,
    captureClicks: false, // MVP: disabled for now
    captureNavigation: false, // MVP: disabled for now
    captureApiCalls: true,
    captureOnlyFailedApi: false, // Capture both successful and failed API calls
    captureStateChanges: false, // MVP: disabled for now
  },
  console: {
    enabled: true,
    captureLog: true,
    captureError: true,
    captureWarn: true,
    captureInfo: false,
    captureDebug: false,
  },
  sampleRate: 1.0,
  sanitize: {
    autoRedact: true,
    redactedValue: '[REDACTED]',
  },
  maxQueueSize: 50,
  flushInterval: 10000, // 10 seconds
  maxPayloadSize: 100 * 1024, // 100KB
  retryAttempts: 3,
  sendOnErrorOnly: true, // Only send when actual error occurs (no auto-flush for breadcrumbs)
  breadcrumbRetentionMs: 5 * 60 * 1000, // 5 minutes
  debounceMs: 100, // Wait 100ms to batch rapid errors
  debug: false,
};

/**
 * Merge user config with defaults
 */
export function mergeConfig(userConfig: PartialErrorTrackerConfig): ErrorTrackerConfig {
  return {
    ...defaultConfig,
    ...userConfig,
    breadcrumbs: {
      ...defaultConfig.breadcrumbs,
      ...(userConfig.breadcrumbs || {}),
    },
    console: {
      ...defaultConfig.console,
      ...(userConfig.console || {}),
    },
    sanitize: {
      ...defaultConfig.sanitize,
      ...(userConfig.sanitize || {}),
    },
    stateConfig: userConfig.stateConfig
      ? {
          ...userConfig.stateConfig,
          redux: userConfig.stateConfig.redux
            ? {
                ...userConfig.stateConfig.redux,
              }
            : undefined,
          zustand: userConfig.stateConfig.zustand
            ? {
                ...userConfig.stateConfig.zustand,
              }
            : undefined,
        }
      : undefined,
  };
}
