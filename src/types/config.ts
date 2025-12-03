export type Environment = 'development' | 'production' | 'staging';
export type AuthStrategy = 'bearer' | 'apiKey' | 'none';
export type SeverityLevel = 'debug' | 'info' | 'warning' | 'error' | 'fatal';

export interface ErrorTrackerConfig {
  // Required
  endpoint: string;

  // Authentication
  authStrategy: AuthStrategy;
  authToken?: string;

  // Payload configuration
  payloadKey: string; // Key name for the events array in JSON payload (default: 'events')

  // Environment
  environment: Environment;
  enabled: boolean;

  // Capture settings
  captureState: boolean;
  stateConfig?: {
    redux?: {
      slices?: string[];
      exclude?: string[];
    };
    zustand?: {
      stores?: string[];
    };
    maxDepth?: number;
  };

  // Breadcrumbs
  breadcrumbs: {
    enabled: boolean;
    maxBreadcrumbs: number;
    captureClicks: boolean;
    captureNavigation: boolean;
    captureApiCalls: boolean;
    captureOnlyFailedApi: boolean; // If true, only capture failed API calls as breadcrumbs (not successful ones)
    captureStateChanges: boolean;
  };

  // Console capture
  console: {
    enabled: boolean;
    captureLog: boolean;
    captureError: boolean;
    captureWarn: boolean;
    captureInfo: boolean;
    captureDebug: boolean;
  };

  // Sampling
  sampleRate: number;

  // Sanitization
  sanitize: {
    autoRedact: boolean;
    customPatterns?: RegExp[];
    redactedValue?: string;
  };

  // Queue & Transport
  maxQueueSize: number;
  flushInterval: number;
  maxPayloadSize: number;
  retryAttempts: number;
  sendOnErrorOnly: boolean; // Only send to backend when actual error occurs
  breadcrumbRetentionMs: number; // How long to keep breadcrumbs in memory (default: 5 mins)
  debounceMs: number; // Wait time before sending to batch rapid errors (default: 100ms)

  // User identification
  getUserId?: () => string | null | undefined;

  // Tags
  tags?: string[]; // Array of tag strings to include with all events

  // Ignored errors
  ignoreErrors?: RegExp[];

  // Callbacks
  onTransportError?: (error: Error) => void;

  // Development
  debug: boolean;
}

export type PartialErrorTrackerConfig = Partial<ErrorTrackerConfig> & {
  endpoint: string;
};
