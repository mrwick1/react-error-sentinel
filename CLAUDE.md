# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Build (outputs to dist/ with CJS, ESM, and .d.ts files)
npm run build

# Watch mode
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Architecture

This is a React error tracking library with three entry points exposed via package exports:

- `react-error-sentinel` (src/index.ts) - Core tracker singleton and types
- `react-error-sentinel/react` (src/react/index.tsx) - React components, hooks, and plugins
- `react-error-sentinel/dashboard` (src/dashboard/index.tsx) - Error dashboard component

### Core Module (`src/core/`)

- **tracker.ts** - `ErrorTracker` singleton class that orchestrates all error tracking. Use `tracker.init()` to configure, `tracker.captureError()` to capture errors, `tracker.registerPlugin()` for state management plugins.
- **breadcrumbs.ts** - `BreadcrumbManager` stores timestamped events leading up to errors (user actions, console logs, API calls)
- **queue.ts** - `ErrorQueue` manages error events before sending to backend
- **transport.ts** - `Transport` handles HTTP requests with auth (bearer/apiKey/none)
- **sanitizer.ts** - `DataSanitizer` auto-redacts sensitive data (passwords, tokens, etc.)
- **config.ts** - Default configuration and `mergeConfig()` utility

### React Module (`src/react/`)

- **ErrorTrackerProvider.tsx** - React context provider for tracker instance
- **ErrorBoundary.tsx** - React Error Boundary that captures component errors
- **useErrorTracker.ts** - Hook exposing `captureError`, `addBreadcrumb`, `setUser`, etc.

### Integrations (`src/integrations/`)

- **window.ts** - Global error and unhandledrejection handlers
- **console.ts** - Console method interceptors for log capture
- **axios.ts** - Axios interceptor wrapper for API call tracking

### Plugins (`src/plugins/`)

- **redux.ts** - Redux middleware for state snapshots via `createReduxPlugin(store, config)`

### Dashboard (`src/dashboard/`)

Standalone error viewing dashboard component with filtering, search, and detail modal.

## Key Patterns

- The tracker is a **singleton** - import `tracker` from core and call `tracker.init()` once
- Plugins implement the `Plugin` interface with `name` and optional `getState()` method
- All events go through the queue and are batched before transport
- `sendOnErrorOnly: true` mode only sends when actual errors occur (vs periodic flush)
- Use `PartialErrorTrackerConfig` type for user-provided config (only `endpoint` is required)

## TypeScript

- Strict mode enabled
- Never use `any` type
- Types are in `src/types/` with barrel export at `src/types/index.ts`
