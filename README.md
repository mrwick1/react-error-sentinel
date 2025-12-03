# react-error-sentinel

🛡️ Lightweight error tracking and crash reporting for React applications

## Features

- ✅ **Console log capture** - Intercept console.log, console.error, console.warn
- ✅ **Redux state snapshot** - Capture Redux state when errors occur
- ✅ **API error tracking** - Automatic Axios request/response capture
- ✅ **Error boundaries** - React Error Boundary with custom fallback UI
- ✅ **Breadcrumbs** - Track user actions leading up to errors
- ✅ **Data sanitization** - Auto-redact sensitive data (tokens, passwords)
- ✅ **Offline queue** - Queue errors in localStorage, retry when online
- ✅ **TypeScript** - Full TypeScript support with type definitions
- ✅ **React 17/18/19** - Compatible with all modern React versions

## Installation

```bash
npm install react-error-sentinel
```

## Quick Start

### 1. Basic Setup (No State Management)

```typescript
import { tracker } from 'react-error-sentinel';
import { ErrorTrackerProvider, ErrorBoundary } from 'react-error-sentinel/react';

// Initialize tracker
tracker.init({
  endpoint: 'https://your-backend.com/api/errors',
  authStrategy: 'bearer',
  authToken: 'your-api-token',
  environment: process.env.NODE_ENV as 'development' | 'production',
});

// Wrap your app
function App() {
  return (
    <ErrorTrackerProvider config={{ endpoint: 'https://your-backend.com/api/errors' }}>
      <ErrorBoundary>
        <YourApp />
      </ErrorBoundary>
    </ErrorTrackerProvider>
  );
}
```

### 2. With Redux State Capture

```typescript
import { tracker, createReduxPlugin } from 'react-error-sentinel';
import { ErrorTrackerProvider, ErrorBoundary, wrapAxiosInstance } from 'react-error-sentinel/react';
import { store } from './redux/store';
import { apiClient } from './api/apiClient';

// Initialize tracker
tracker.init({
  endpoint: process.env.REACT_APP_ERROR_TRACKER_URL!,
  authStrategy: 'apiKey',
  authToken: process.env.REACT_APP_ERROR_TRACKER_TOKEN,
  environment: process.env.NODE_ENV as 'development' | 'production',
  enabled: true,

  // Console capture (dev only)
  console: {
    enabled: true,
    captureLog: process.env.NODE_ENV === 'development',
    captureError: true,
    captureWarn: true,
    captureInfo: false,
    captureDebug: false,
  },

  // State capture
  stateConfig: {
    redux: {
      slices: ['user', 'auth', 'app'], // Specify which slices to capture
    },
  },

  // Data sanitization
  sanitize: {
    autoRedact: true,
    customPatterns: [/creditCard/i, /ssn/i],
  },

  // User identification
  getUserId: () => store.getState().user?.id || null,
});

// Register Redux plugin
const reduxPlugin = createReduxPlugin(store, {
  slices: ['user', 'auth', 'app'],
});
tracker.registerPlugin(reduxPlugin);

// Wrap Axios instance
wrapAxiosInstance(apiClient,
  (breadcrumb) => tracker.addBreadcrumb(breadcrumb),
  (error, context) => tracker.captureError(error, context)
);

// Render app
ReactDOM.render(
  <Provider store={store}>
    <ErrorTrackerProvider config={{ endpoint: process.env.REACT_APP_ERROR_TRACKER_URL! }}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </ErrorTrackerProvider>
  </Provider>,
  document.getElementById('root')
);
```

## Usage

### Manual Error Capture

```typescript
import { useErrorTracker } from 'react-error-sentinel/react';

function MyComponent() {
  const { captureError, captureMessage } = useErrorTracker();

  const handleAction = async () => {
    try {
      await riskyOperation();
    } catch (error) {
      captureError(error as Error, {
        tags: { component: 'MyComponent', action: 'handleAction' },
        extra: { someContext: 'value' },
      });
    }
  };

  return <button onClick={handleAction}>Do Something</button>;
}
```

### Custom Breadcrumbs

```typescript
const { addBreadcrumb } = useErrorTracker();

addBreadcrumb({
  type: 'manual',
  category: 'user.action',
  message: 'User clicked checkout button',
  level: 'info',
  data: { cartTotal: 99.99 },
  timestamp: Date.now(),
});
```

### Set User Context

```typescript
const { setUser } = useErrorTracker();

setUser({
  id: 'user-123',
  email: 'user@example.com',
  username: 'john_doe',
});
```

## Configuration

### ErrorTrackerConfig

```typescript
interface ErrorTrackerConfig {
  // Required
  endpoint: string; // Backend API endpoint

  // Authentication
  authStrategy: 'bearer' | 'apiKey' | 'none';
  authToken?: string;

  // Environment
  environment: 'development' | 'production' | 'staging';
  enabled: boolean;

  // State capture
  captureState: boolean;
  stateConfig?: {
    redux?: {
      slices?: string[]; // Specific slices to capture
      exclude?: string[]; // Slices to exclude
    };
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

  // Breadcrumbs
  breadcrumbs: {
    enabled: boolean;
    maxBreadcrumbs: number; // Default: 50
    captureApiCalls: boolean;
  };

  // Sanitization
  sanitize: {
    autoRedact: boolean;
    customPatterns?: RegExp[];
    redactedValue?: string; // Default: '[REDACTED]'
  };

  // Queue & Transport
  maxQueueSize: number; // Default: 50
  flushInterval: number; // Default: 10000ms (10 seconds)

  // User identification
  getUserId?: () => string | null;

  // Development
  debug: boolean;
}
```

## Backend API Contract

### POST `/api/errors` (or your configured endpoint)

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
      "user": {
        "id": "user-123",
        "email": "user@example.com"
      },
      "request": {
        "url": "https://app.example.com/page",
        "method": "GET"
      },
      "state": {
        "redux": {
          "user": { "id": 123, "name": "John" }
        }
      },
      "breadcrumbs": [
        {
          "timestamp": 1234567880,
          "type": "console",
          "category": "console.log",
          "message": "Debug info",
          "level": "info"
        }
      ],
      "tags": { "type": "api_error" },
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

## Dashboard (Optional)

```typescript
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

## Bundle Size

- **Core**: ~24KB (uncompressed), ~8KB gzipped
- **React**: ~30KB (uncompressed), ~10KB gzipped
- **Dashboard**: ~1KB (uncompressed)

## TypeScript

Full TypeScript support with type definitions included.

```typescript
import type {
  ErrorTrackerConfig,
  ErrorContext,
  UserInfo,
  Breadcrumb,
} from 'react-error-sentinel';
```

## Examples

See the `/examples` directory for complete integration examples:

- CRA + Redux
- Next.js + Zustand
- Vite + React

## License

MIT

## Contributing

Contributions welcome! Please open an issue or submit a PR.

## Support

For issues and questions, please open an issue on GitHub.
