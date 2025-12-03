import { Environment } from '../types/config';

/**
 * Next.js data structure type
 */
interface NextData {
  runtimeConfig?: {
    environment?: string;
  };
}

/**
 * Vite environment type
 */
interface ViteEnv {
  MODE?: string;
  PROD?: boolean;
  DEV?: boolean;
}

/**
 * Process type for bundler-injected env vars
 */
declare const process: { env?: { NODE_ENV?: string } } | undefined;

/**
 * Detect environment from various sources
 * Priority: explicit env var > framework detection > hostname patterns > default
 */
export function detectEnvironment(): Environment {
  // 1. Check NODE_ENV (works in Node.js and bundlers that replace it)
  if (typeof process !== 'undefined' && process?.env) {
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === 'production') return 'production';
    if (nodeEnv === 'staging' || nodeEnv === 'test') return 'staging';
    if (nodeEnv === 'development') return 'development';
  }

  // 2. Browser-specific detection
  if (typeof window !== 'undefined') {
    // Next.js detection
    const nextData = (window as unknown as { __NEXT_DATA__?: NextData }).__NEXT_DATA__;
    if (nextData?.runtimeConfig?.environment) {
      const env = nextData.runtimeConfig.environment;
      if (env === 'production' || env === 'staging' || env === 'development') {
        return env;
      }
    }

    // Vite detection via import.meta.env (if available)
    try {
      const viteMeta = (import.meta as unknown as { env?: ViteEnv }).env;
      if (viteMeta) {
        if (viteMeta.PROD) return 'production';
        if (viteMeta.DEV) return 'development';
        if (viteMeta.MODE === 'staging') return 'staging';
      }
    } catch {
      // import.meta not available, skip
    }

    // Hostname-based detection
    const hostname = window.location?.hostname;
    if (hostname) {
      // Localhost or local IP
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.')
      ) {
        return 'development';
      }

      // Staging patterns
      if (
        hostname.includes('staging') ||
        hostname.includes('stage') ||
        hostname.includes('stg') ||
        hostname.includes('preprod') ||
        hostname.includes('uat')
      ) {
        return 'staging';
      }

      // Preview/dev patterns (Vercel, Netlify, etc.)
      if (
        hostname.includes('.vercel.app') ||
        hostname.includes('.netlify.app') ||
        hostname.includes('preview') ||
        hostname.includes('-dev.')
      ) {
        return 'staging';
      }
    }
  }

  // Default to development for safety (more verbose logging)
  return 'development';
}

/**
 * Check if running in browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return detectEnvironment() === 'development';
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return detectEnvironment() === 'production';
}
