import React, { createContext, useEffect, useRef, ReactNode } from 'react';
import { tracker } from '../core/tracker';
import { ErrorTracker } from '../core/tracker';
import { PartialErrorTrackerConfig } from '../types';

/**
 * Context for accessing tracker instance
 */
export const ErrorTrackerContext = createContext<ErrorTracker | null>(null);

interface ErrorTrackerProviderProps {
  config: PartialErrorTrackerConfig;
  children: ReactNode;
}

/**
 * ErrorTracker Provider (functional component)
 */
export function ErrorTrackerProvider({ config, children }: ErrorTrackerProviderProps) {
  // Store initial config in ref to prevent re-initialization on re-renders
  const initialConfigRef = useRef<PartialErrorTrackerConfig | null>(null);
  const isInitializedRef = useRef(false);

  // Capture initial config only once
  if (initialConfigRef.current === null) {
    initialConfigRef.current = config;
  }

  useEffect(() => {
    // Only initialize once
    if (!isInitializedRef.current && initialConfigRef.current) {
      tracker.init(initialConfigRef.current);
      isInitializedRef.current = true;
    }

    // Cleanup on unmount
    return () => {
      tracker.shutdown();
      isInitializedRef.current = false;
    };
  }, []);

  return (
    <ErrorTrackerContext.Provider value={tracker}>
      {children}
    </ErrorTrackerContext.Provider>
  );
}
