# react-error-sentinel

Lightweight error tracking and crash reporting for React applications

## Features

- **One-liner setup** - `<ErrorSentinel>` component wraps your app in seconds
- **Configuration presets** - development, production, minimal, full
- **Environment auto-detection** - Automatically detects dev/prod/staging
- **Console log capture** - Intercept console.log, console.error, console.warn
- **Redux & Zustand support** - Capture state snapshots when errors occur
- **API error tracking** - Axios and native fetch wrappers
- **Error boundaries** - React Error Boundary with retry/reset capabilities
- **Breadcrumbs** - Track user actions, navigation, and clicks
- **TanStack Query integration** - Track query and mutation errors
- **Data sanitization** - Auto-redact sensitive data (tokens, passwords)
- **Error fingerprinting** - Deduplicate similar errors
- **Session tracking** - Track errors across user sessions
- **DevTools** - Browser console integration for debugging
- **TypeScript** - Full TypeScript support with type definitions
- **React 17/18/19** - Compatible with all modern React versions

## Installation

```bash
npm install react-error-sentinel
```

## Quick Start

### One-Liner Setup (Recommended)

```tsx
import { ErrorSentinel } from 'react-error-sentinel/react';

function App() {
  return (
    <ErrorSentinel url="https://your-backend.com/api/errors">
      <YourApp />
    </ErrorSentinel>
  );
}
```

### With Authentication & Preset

```tsx
import { ErrorSentinel } from 'react-error-sentinel/react';

function App() {
  return (
    <ErrorSentinel
      url="https://your-backend.com/api/errors"
      token="your-api-key"
      preset="production"
    >
      <YourApp />
    </ErrorSentinel>
  );
}
```

### With Custom Fallback UI

```tsx
import { ErrorSentinel } from 'react-error-sentinel/react';

function App() {
  return (
    <ErrorSentinel
      url="https://your-backend.com/api/errors"
      fallback={({ error, reset }) => (
        <div>
          <h1>Something went wrong</h1>
          <p>{error.message}</p>
          <button onClick={reset}>Try Again</button>
        </div>
      )}
    >
      <YourApp />
    </ErrorSentinel>
  );
}
```

## ErrorSentinel Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `url` | `string` | required | API endpoint URL to send errors to |
| `token` | `string` | - | Authentication token (API key or Bearer token) |
| `environment` | `'development' \| 'production' \| 'staging'` | auto-detected | Environment name |
| `debug` | `boolean` | auto | Enable debug mode (auto-enabled in development) |
| `enabled` | `boolean` | `true` | Enable/disable error tracking |
| `sampleRate` | `number` | `1.0` | Sample rate for error capturing (0-1) |
| `preset` | `'development' \| 'production' \| 'minimal' \| 'full'` | - | Configuration preset |
| `fallback` | `ReactNode \| ((ctx) => ReactNode)` | - | Fallback UI when error occurs |
| `onError` | `(error, errorInfo) => void` | - | Callback when error is caught |
| `config` | `object` | - | Advanced config override |

## Configuration Presets

Use presets for common configurations:

```tsx
// Development: debug enabled, captures all console methods
<ErrorSentinel url="..." preset="development">

// Production: debug disabled, captures only errors/warnings
<ErrorSentinel url="..." preset="production">

// Minimal: no breadcrumbs or console capture
<ErrorSentinel url="..." preset="minimal">

// Full: maximum capture with all features enabled
<ErrorSentinel url="..." preset="full">
```

## Advanced Setup (Manual Configuration)

For more control, use the provider and boundary separately:

```tsx
import { tracker } from 'react-error-sentinel';
import { ErrorTrackerProvider, ErrorBoundary } from 'react-error-sentinel/react';

// Initialize tracker
tracker.init({
  endpoint: 'https://your-backend.com/api/errors',
  authStrategy: 'apiKey',
  authToken: 'your-api-key',
  environment: 'production',

  console: {
    enabled: true,
    captureLog: false,
    captureError: true,
    captureWarn: true,
    captureInfo: false,
    captureDebug: false,
  },

  breadcrumbs: {
    enabled: true,
    maxBreadcrumbs: 50,
    captureClicks: true,
    captureNavigation: true,
    captureApiCalls: true,
    captureOnlyFailedApi: false,
    captureStateChanges: true,
  },

  sanitize: {
    autoRedact: true,
    customPatterns: [/creditCard/i, /ssn/i],
  },
});

function App() {
  return (
    <ErrorTrackerProvider config={{ endpoint: 'https://your-backend.com/api/errors' }}>
      <ErrorBoundary
        fallback={<ErrorPage />}
        onReset={() => window.location.reload()}
      >
        <YourApp />
      </ErrorBoundary>
    </ErrorTrackerProvider>
  );
}
```

## Hooks

### useErrorTracker

Main hook for error tracking operations:

```tsx
import { useErrorTracker } from 'react-error-sentinel/react';

function MyComponent() {
  const {
    capture,           // Unified capture method
    captureError,      // Capture Error objects
    captureMessage,    // Capture string messages
    addBreadcrumb,     // Add custom breadcrumb
    setUser,           // Set user context
    isEnabled,         // Check if tracking is enabled
  } = useErrorTracker();

  // Unified capture - handles both errors and messages
  capture(new Error('Something went wrong'), { tags: ['critical'] });
  capture('User action logged', 'info', { extra: { action: 'click' } });

  // Or use specific methods
  captureError(error, { tags: ['api-error'] });
  captureMessage('Important event', 'warning');
}
```

### useCaptureError

Declarative error capture hook:

```tsx
import { useCaptureError } from 'react-error-sentinel/react';

function MyComponent() {
  const [error, setError] = useState<Error | null>(null);

  // Automatically captures error when it changes
  useCaptureError(error, {
    tags: ['component-error'],
    extra: { component: 'MyComponent' },
  });

  return <div>...</div>;
}
```

### useCaptureAsyncError

Capture errors from async operations:

```tsx
import { useCaptureAsyncError } from 'react-error-sentinel/react';

function MyComponent() {
  const captureAsync = useCaptureAsyncError({
    tags: ['async-operation'],
  });

  const handleClick = () => {
    captureAsync(async () => {
      const result = await fetchData();
      return result;
    });
  };
}
```

### useCaptureQueryError

For React Query / TanStack Query errors:

```tsx
import { useCaptureQueryError } from 'react-error-sentinel/react';
import { useQuery } from '@tanstack/react-query';

function MyComponent() {
  const query = useQuery({ queryKey: ['data'], queryFn: fetchData });

  // Automatically captures query errors
  useCaptureQueryError(query, {
    tags: ['query-error'],
  });
}
```

## Integrations

### Native Fetch Wrapper

Track API calls with native fetch:

```tsx
import { wrapFetch } from 'react-error-sentinel/react';
import { tracker } from 'react-error-sentinel';

const trackedFetch = wrapFetch(
  fetch,
  (breadcrumb) => tracker.addBreadcrumb(breadcrumb),
  (error, context) => tracker.captureError(error, context)
);

// Use trackedFetch instead of fetch
const response = await trackedFetch('/api/data');
```

### Axios Integration

```tsx
import { wrapAxiosInstance } from 'react-error-sentinel/react';
import { tracker } from 'react-error-sentinel';
import axios from 'axios';

const apiClient = axios.create({ baseURL: '/api' });

wrapAxiosInstance(
  apiClient,
  (breadcrumb) => tracker.addBreadcrumb(breadcrumb),
  (error, context) => tracker.captureError(error, context)
);
```

### Redux Plugin

```tsx
import { tracker, createReduxPlugin } from 'react-error-sentinel';
import { store } from './store';

const reduxPlugin = createReduxPlugin(store, {
  slices: ['user', 'auth', 'app'],
  exclude: ['largeData'],
});

tracker.registerPlugin(reduxPlugin);
```

### Zustand Plugin

```tsx
import { createZustandPlugin, createZustandPlugins } from 'react-error-sentinel/react';
import { tracker } from 'react-error-sentinel';
import { useUserStore } from './stores/user';
import { useCartStore } from './stores/cart';

// Single store
const userPlugin = createZustandPlugin('user', useUserStore, {
  pick: ['id', 'email', 'role'],
});
tracker.registerPlugin(userPlugin);

// Multiple stores at once
const plugins = createZustandPlugins({
  user: { store: useUserStore, pick: ['id', 'email'] },
  cart: { store: useCartStore, omit: ['paymentDetails'] },
});
plugins.forEach(plugin => tracker.registerPlugin(plugin));
```

### TanStack Query Integration

```tsx
import { setupTanStackQueryTracking } from 'react-error-sentinel/react';
import { tracker } from 'react-error-sentinel';
import { queryClient } from './queryClient';

setupTanStackQueryTracking(
  queryClient,
  (breadcrumb) => tracker.addBreadcrumb(breadcrumb),
  (error, context) => tracker.captureError(error, context),
  {
    trackQueries: true,
    trackMutations: true,
    captureQueryErrors: true,
    captureMutationErrors: true,
  }
);
```

### Navigation Breadcrumbs

```tsx
import { setupNavigationBreadcrumbs } from 'react-error-sentinel/react';
import { tracker } from 'react-error-sentinel';

// Setup once at app initialization
const cleanup = setupNavigationBreadcrumbs(
  (breadcrumb) => tracker.addBreadcrumb(breadcrumb)
);

// Or use the React hook
import { useNavigationBreadcrumbs } from 'react-error-sentinel/react';

function App() {
  useNavigationBreadcrumbs(); // Automatically tracks navigation
  return <YourApp />;
}
```

### Click Breadcrumbs

```tsx
import { setupClickBreadcrumbs } from 'react-error-sentinel/react';
import { tracker } from 'react-error-sentinel';

const cleanup = setupClickBreadcrumbs(
  (breadcrumb) => tracker.addBreadcrumb(breadcrumb),
  {
    target: document,
    includeText: true,
    maxTextLength: 100,
    ignoreSelectors: ['.ignore-clicks', '[data-no-track]'],
  }
);
```

## Enhanced Error Boundary

The ErrorBoundary component supports retry/reset capabilities:

```tsx
import { ErrorBoundary } from 'react-error-sentinel/react';

<ErrorBoundary
  fallback={({ error, reset, retry }) => (
    <div>
      <p>Error: {error.message}</p>
      <button onClick={reset}>Reset</button>
      <button onClick={retry}>Retry</button>
    </div>
  )}
  onError={(error, errorInfo) => console.log('Error caught:', error)}
  onReset={() => console.log('Error boundary reset')}
  resetKeys={[userId]} // Auto-reset when these values change
  componentName="MyFeature" // For error attribution
>
  <MyComponent />
</ErrorBoundary>
```

## DevTools

Access error tracking state in browser console:

```tsx
import { installDevTools } from 'react-error-sentinel/react';
import { tracker } from 'react-error-sentinel';

// Install in development
if (process.env.NODE_ENV === 'development') {
  installDevTools(tracker);
}

// Then in browser console:
// window.__ERROR_SENTINEL__.getErrors()
// window.__ERROR_SENTINEL__.getBreadcrumbs()
// window.__ERROR_SENTINEL__.getConfig()
// window.__ERROR_SENTINEL__.capture(new Error('test'))
```

## Session Tracking

Track errors across user sessions:

```tsx
import { SessionManager } from 'react-error-sentinel/react';

const sessionManager = new SessionManager({
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  persistSession: true,
});

const sessionId = sessionManager.getSessionId();
const sessionData = sessionManager.getSessionData();

// Session data includes:
// - id: unique session ID
// - startedAt: session start timestamp
// - lastActivityAt: last activity timestamp
// - pageViews: number of page views
// - errorCount: number of errors in session
```

## Error Fingerprinting

Automatically deduplicate similar errors:

```tsx
import { DeduplicationManager, generateFingerprint } from 'react-error-sentinel/react';

const deduper = new DeduplicationManager({
  windowMs: 5000,      // 5 second dedup window
  maxOccurrences: 3,   // Allow max 3 occurrences per window
});

// Check if error should be captured
if (deduper.shouldCapture(error)) {
  tracker.captureError(error);
}

// Get occurrence count
const count = deduper.getOccurrenceCount(error);

// Generate fingerprint manually
const fingerprint = generateFingerprint(error);
```

## Backend API Contract

### POST `/api/errors`

**Request Body:**
```json
{
  "events": [
    {
      "event_id": "uuid-v4",
      "timestamp": 1234567890,
      "environment": "production",
      "level": "error",
      "platform": "javascript",
      "error": {
        "message": "Cannot read property 'x' of undefined",
        "type": "TypeError",
        "stack_trace": "Error: ...",
        "handled": false
      },
      "context": {
        "browser": { "name": "Chrome", "version": "120.0" },
        "os": { "name": "macOS", "version": "14.0" },
        "device": { "screen_width": 1920, "screen_height": 1080 }
      },
      "user": { "id": "user-123", "email": "user@example.com" },
      "request": { "url": "https://app.example.com/page", "method": "GET" },
      "state": { "redux": { "user": { "id": 123 } } },
      "breadcrumbs": [
        {
          "timestamp": 1234567880,
          "type": "navigation",
          "category": "navigation",
          "message": "Navigated to /dashboard",
          "level": "info"
        }
      ],
      "tags": ["api-error", "critical"],
      "extra": { "custom": "data" }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "event_ids": ["uuid-v4"]
}
```

### GET `/api/errors`

Returns error events for the dashboard.

## Dashboard

```tsx
import { ErrorDashboard } from 'react-error-sentinel/dashboard';

function AdminPage() {
  return (
    <ErrorDashboard
      apiEndpoint="https://your-backend.com/api/errors"
      authToken={localStorage.getItem('accessToken') || undefined}
    />
  );
}
```

## Full Configuration Reference

```typescript
interface ErrorTrackerConfig {
  // Required
  endpoint: string;

  // Authentication
  authStrategy: 'bearer' | 'apiKey' | 'none';
  authToken?: string;

  // Payload configuration
  payloadKey: string; // Key name for events array (default: 'events')

  // Environment
  environment: 'development' | 'production' | 'staging';
  enabled: boolean;

  // State capture
  captureState: boolean;
  stateConfig?: {
    redux?: { slices?: string[]; exclude?: string[] };
    zustand?: { stores?: string[] };
    maxDepth?: number;
  };

  // Breadcrumbs
  breadcrumbs: {
    enabled: boolean;
    maxBreadcrumbs: number;
    captureClicks: boolean;
    captureNavigation: boolean;
    captureApiCalls: boolean;
    captureOnlyFailedApi: boolean;
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
  sampleRate: number; // 0-1, default: 1.0

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
  sendOnErrorOnly: boolean;
  breadcrumbRetentionMs: number;
  debounceMs: number;

  // User identification
  getUserId?: () => string | null | undefined;

  // Tags
  tags?: string[];

  // Ignored errors
  ignoreErrors?: RegExp[];

  // Callbacks
  onTransportError?: (error: Error) => void;

  // Development
  debug: boolean;
}
```

## TypeScript

Full TypeScript support with type definitions:

```typescript
import type {
  ErrorTrackerConfig,
  PartialErrorTrackerConfig,
  ErrorContext,
  UserInfo,
  Breadcrumb,
  ErrorEvent,
  Environment,
  SeverityLevel,
} from 'react-error-sentinel';

import type {
  ErrorSentinelProps,
  ErrorFallbackContext,
  FallbackRender,
} from 'react-error-sentinel/react';
```

## Migration from v0.2.x

v0.3.x is backwards compatible. Your existing code will continue to work. New features are additive:

```tsx
// Old way (still works)
<ErrorTrackerProvider config={{ endpoint: '...' }}>
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
</ErrorTrackerProvider>

// New way (recommended)
<ErrorSentinel url="..." preset="production">
  <App />
</ErrorSentinel>
```

## License

MIT

## Contributing

Contributions welcome! Please open an issue or submit a PR.

## Support

For issues and questions, please open an issue on [GitHub](https://github.com/mrwick1/react-error-sentinel/issues).
