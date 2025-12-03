import React, { Component, ReactNode, ErrorInfo } from 'react';
import { tracker } from '../core/tracker';

/**
 * Context passed to fallback render functions
 */
export interface ErrorBoundaryContext {
  error: Error;
  errorInfo: ErrorInfo | null;
  eventId: string | null;
  reset: () => void;
  retry: () => void;
}

/**
 * Fallback render function type
 */
export type FallbackRender = (context: ErrorBoundaryContext) => ReactNode;

/**
 * Props for ErrorBoundary component
 */
export interface ErrorBoundaryProps {
  /**
   * Fallback UI to render when an error occurs
   * Can be a React node or a function receiving error context
   */
  fallback?: ReactNode | FallbackRender;

  /**
   * Callback when an error is caught
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;

  /**
   * Callback when the error boundary is reset
   */
  onReset?: () => void;

  /**
   * Reset the error boundary when any of these values change
   * Useful for resetting on navigation or state changes
   */
  resetKeys?: unknown[];

  /**
   * Component name for error attribution
   * Helps identify which component caused the error
   */
  componentName?: string;

  /**
   * Children to render
   */
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  eventId: string | null;
}

/**
 * Error Boundary component with retry/reset capabilities
 * Must be a class component due to React limitations
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Build context with component attribution
    const tags: Record<string, string> = { type: 'react_error' };
    if (this.props.componentName) {
      tags.component = this.props.componentName;
    }

    // Capture to error tracker and store event ID
    const eventId = tracker.captureError(error, {
      tags,
      extra: {
        componentStack: errorInfo.componentStack,
        componentName: this.props.componentName,
      },
    });

    this.setState({
      errorInfo,
      eventId,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset when resetKeys change
    if (this.state.hasError && this.props.resetKeys && prevProps.resetKeys) {
      if (!areArraysEqual(this.props.resetKeys, prevProps.resetKeys)) {
        this.reset();
      }
    }
  }

  /**
   * Reset the error boundary state
   */
  reset = (): void => {
    this.props.onReset?.();
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
    });
  };

  /**
   * Retry by resetting the error boundary (alias for reset)
   */
  retry = (): void => {
    this.reset();
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      const context: ErrorBoundaryContext = {
        error: this.state.error,
        errorInfo: this.state.errorInfo,
        eventId: this.state.eventId,
        reset: this.reset,
        retry: this.retry,
      };

      // Render custom fallback if provided
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(context);
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI with reset button
      return <DefaultErrorFallback {...context} />;
    }

    return this.props.children;
  }
}

/**
 * Check if two arrays are equal (shallow comparison)
 */
function areArraysEqual(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index) => Object.is(item, b[index]));
}

/**
 * Default error fallback UI with retry button
 */
function DefaultErrorFallback({
  error,
  eventId,
  reset,
}: ErrorBoundaryContext) {
  return (
    <div
      style={{
        padding: '20px',
        margin: '20px',
        border: '1px solid #f5c6cb',
        borderRadius: '4px',
        backgroundColor: '#f8d7da',
        color: '#721c24',
      }}
    >
      <h2 style={{ margin: '0 0 10px 0' }}>Something went wrong</h2>
      {eventId && (
        <p style={{ fontSize: '12px', color: '#856404', margin: '0 0 15px 0' }}>
          Error ID: {eventId}
        </p>
      )}
      <div style={{ marginBottom: '15px' }}>
        <button
          onClick={reset}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: '#721c24',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </div>
      <details style={{ whiteSpace: 'pre-wrap' }}>
        <summary style={{ cursor: 'pointer' }}>Error details</summary>
        <p style={{ marginTop: '10px' }}>
          <strong>{error.name}:</strong> {error.message}
        </p>
        {error.stack && (
          <pre
            style={{
              marginTop: '10px',
              padding: '10px',
              backgroundColor: '#fff',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto',
            }}
          >
            {error.stack}
          </pre>
        )}
      </details>
    </div>
  );
}
