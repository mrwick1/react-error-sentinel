import { ErrorEvent } from '../types';

/**
 * Configuration for fingerprint generation
 */
export interface FingerprintConfig {
  /**
   * Include error message in fingerprint
   * @default true
   */
  useMessage?: boolean;

  /**
   * Include error type/name in fingerprint
   * @default true
   */
  useType?: boolean;

  /**
   * Include first stack frame in fingerprint
   * @default true
   */
  useStackFrame?: boolean;

  /**
   * Custom fingerprint function
   */
  customFingerprint?: (error: Error, event: ErrorEvent) => string;
}

/**
 * Generate a fingerprint for error deduplication
 *
 * @example
 * ```ts
 * const fingerprint = generateFingerprint(error, event);
 * // Returns: "a1b2c3d4" (8-char hex hash)
 * ```
 */
export function generateFingerprint(
  error: Error,
  event: ErrorEvent,
  config?: FingerprintConfig
): string {
  // Use custom fingerprint function if provided
  if (config?.customFingerprint) {
    return config.customFingerprint(error, event);
  }

  const parts: string[] = [];

  // Include error type (name)
  if (config?.useType !== false) {
    parts.push(error.name || 'Error');
  }

  // Include normalized message
  if (config?.useMessage !== false) {
    parts.push(normalizeMessage(error.message));
  }

  // Include first meaningful stack frame
  if (config?.useStackFrame !== false && error.stack) {
    const frame = extractFirstMeaningfulFrame(error.stack);
    if (frame) {
      parts.push(frame);
    }
  }

  // Generate hash
  return hashString(parts.join('|'));
}

/**
 * Normalize error message by removing dynamic parts
 * This helps group similar errors together
 */
function normalizeMessage(message: string): string {
  return (
    message
      // Remove UUIDs
      .replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        '<UUID>'
      )
      // Remove numbers (potential IDs, timestamps)
      .replace(/\b\d+\b/g, '<NUM>')
      // Remove URLs
      .replace(/https?:\/\/[^\s"']+/g, '<URL>')
      // Remove file paths
      .replace(/\/[\w\-./@]+\.(js|ts|jsx|tsx|mjs|cjs)/g, '<FILE>')
      // Remove ISO timestamps
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '<TIMESTAMP>')
      // Remove memory addresses
      .replace(/0x[0-9a-f]+/gi, '<ADDR>')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Extract first meaningful stack frame (excluding node_modules)
 */
function extractFirstMeaningfulFrame(stack: string): string | null {
  const lines = stack.split('\n');

  for (const line of lines) {
    // Skip the error message line
    if (!line.includes('at ')) continue;

    // Skip node_modules and internal frames
    if (
      line.includes('node_modules') ||
      line.includes('<anonymous>') ||
      line.includes('webpack') ||
      line.includes('turbopack')
    ) {
      continue;
    }

    // Extract file:line:column
    const match = line.match(/at\s+(?:.*?\s+)?\(?(.+?):(\d+):(\d+)\)?$/);
    if (match) {
      const [, file, lineNum, col] = match;
      // Normalize file path (remove absolute path prefix)
      const normalizedFile = file
        .replace(/^.*\/(src|app|pages|components)\//, '$1/')
        .replace(/^.*\//, '');
      return `${normalizedFile}:${lineNum}:${col}`;
    }
  }

  return null;
}

/**
 * Simple string hash function (djb2)
 */
function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Deduplication entry
 */
interface DeduplicationEntry {
  count: number;
  firstSeen: number;
  lastSeen: number;
}

/**
 * Manager for error deduplication
 *
 * @example
 * ```ts
 * const dedup = new DeduplicationManager(60000, 5);
 *
 * const fingerprint = generateFingerprint(error, event);
 * if (dedup.shouldCapture(fingerprint)) {
 *   // Send error to backend
 *   tracker.captureError(error);
 * } else {
 *   // Error was deduplicated
 *   console.log('Duplicate error ignored');
 * }
 * ```
 */
export class DeduplicationManager {
  private seen: Map<string, DeduplicationEntry> = new Map();
  private windowMs: number;
  private maxCount: number;
  private pruneIntervalId?: ReturnType<typeof setInterval>;

  /**
   * Create a deduplication manager
   *
   * @param windowMs - Time window for deduplication (default: 60000ms / 1 minute)
   * @param maxCount - Max occurrences to capture within window (default: 5)
   */
  constructor(windowMs: number = 60000, maxCount: number = 5) {
    this.windowMs = windowMs;
    this.maxCount = maxCount;

    // Auto-prune every minute
    this.pruneIntervalId = setInterval(() => this.prune(), 60000);
  }

  /**
   * Check if error should be captured or deduplicated
   *
   * @returns true if error should be sent, false if deduplicated
   */
  shouldCapture(fingerprint: string): boolean {
    const now = Date.now();
    const existing = this.seen.get(fingerprint);

    if (!existing) {
      // First occurrence
      this.seen.set(fingerprint, {
        count: 1,
        firstSeen: now,
        lastSeen: now,
      });
      return true;
    }

    // If outside window, reset and allow
    if (now - existing.firstSeen > this.windowMs) {
      this.seen.set(fingerprint, {
        count: 1,
        firstSeen: now,
        lastSeen: now,
      });
      return true;
    }

    // Inside window, check count
    existing.count++;
    existing.lastSeen = now;

    // Allow up to maxCount within window
    return existing.count <= this.maxCount;
  }

  /**
   * Get deduplication stats for a fingerprint
   */
  getStats(fingerprint: string): DeduplicationEntry | null {
    return this.seen.get(fingerprint) ?? null;
  }

  /**
   * Get count of suppressed errors for a fingerprint
   */
  getSuppressedCount(fingerprint: string): number {
    const stats = this.getStats(fingerprint);
    if (!stats) return 0;
    return Math.max(0, stats.count - this.maxCount);
  }

  /**
   * Clear old entries
   */
  prune(): void {
    const now = Date.now();
    for (const [key, value] of this.seen.entries()) {
      if (now - value.lastSeen > this.windowMs) {
        this.seen.delete(key);
      }
    }
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.seen.clear();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.pruneIntervalId) {
      clearInterval(this.pruneIntervalId);
    }
    this.clear();
  }
}
