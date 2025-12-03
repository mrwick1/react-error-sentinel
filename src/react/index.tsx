// Components
export { ErrorSentinel } from './ErrorSentinel';
export type { ErrorSentinelProps, ErrorFallbackContext } from './ErrorSentinel';
export { ErrorBoundary } from './ErrorBoundary';
export type { ErrorBoundaryProps, ErrorBoundaryContext, FallbackRender } from './ErrorBoundary';
export { ErrorTrackerProvider, ErrorTrackerContext } from './ErrorTrackerProvider';

// Hooks
export { useErrorTracker, useCapture, useBreadcrumb } from './useErrorTracker';
export type { UseErrorTrackerReturn } from './useErrorTracker';
export {
  useCaptureError,
  useCaptureQueryError,
  useCaptureAsyncError,
} from './useCaptureError';
export type {
  UseCaptureErrorOptions,
  UseCaptureQueryErrorOptions,
  UseCaptureAsyncErrorOptions,
} from './useCaptureError';
export { useNavigationBreadcrumbs } from './useNavigationBreadcrumbs';
export type { UseNavigationBreadcrumbsOptions } from './useNavigationBreadcrumbs';

// Re-export core tracker and config for convenience
export { tracker } from '../core/tracker';
export { presets, fromSimpleConfig } from '../core/config';
export type { PresetName, SimpleConfig } from '../core/config';

// Plugins
export { createReduxPlugin } from '../plugins/redux';
export type { ReduxPluginConfig } from '../plugins/redux';
export { createZustandPlugin, createZustandPlugins } from '../plugins/zustand';
export type { ZustandPluginConfig, ZustandPlugin } from '../plugins/zustand';

// Integrations (re-exported for convenience)
export { wrapAxiosInstance } from '../integrations/axios';
export type { AxiosWrapperConfig } from '../integrations/axios';
export { wrapFetch } from '../integrations/fetch';
export type { FetchWrapperConfig } from '../integrations/fetch';

// Types
export type { PartialErrorTrackerConfig, ErrorContext, UserInfo } from '../types';
