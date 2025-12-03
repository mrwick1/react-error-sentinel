// Core
export { tracker } from './core/tracker';
export { defaultConfig, presets, fromSimpleConfig } from './core/config';
export type { PresetName, SimpleConfig } from './core/config';

// Error fingerprinting and deduplication
export { generateFingerprint, DeduplicationManager } from './core/fingerprint';
export type { FingerprintConfig } from './core/fingerprint';

// Session tracking
export { SessionManager, getSessionManager } from './core/session';
export type { SessionData } from './core/session';

// DevTools
export { installDevTools, isDevToolsInstalled, uninstallDevTools } from './core/devtools';
export type { DevToolsAPI } from './core/devtools';

// Environment utilities
export { detectEnvironment, isBrowser, isDevelopment, isProduction } from './utils/environment';

// Types
export type {
  ErrorTrackerConfig,
  PartialErrorTrackerConfig,
  Environment,
  AuthStrategy,
  SeverityLevel,
} from './types/config';

export type {
  Breadcrumb,
  BreadcrumbType,
  BreadcrumbLevel,
} from './types/breadcrumb';

export type {
  ErrorEvent,
  ErrorContext,
  UserInfo,
  ErrorInfo,
  Plugin,
  TransportResponse,
} from './types/error';

// Integrations
export { setupWindowHandlers } from './integrations/window';
export { setupConsoleInterceptor, restoreConsole } from './integrations/console';
export { wrapFetch } from './integrations/fetch';
export type { FetchWrapperConfig, WrappedFetch } from './integrations/fetch';
export { setupNavigationBreadcrumbs } from './integrations/navigation';
export type { NavigationBreadcrumbsConfig } from './integrations/navigation';
export { setupClickBreadcrumbs } from './integrations/clicks';
export type { ClickBreadcrumbsConfig } from './integrations/clicks';
export { setupTanStackQueryTracking } from './integrations/tanstack-query';
export type { TanStackQueryConfig } from './integrations/tanstack-query';
