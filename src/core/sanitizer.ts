import { safeClone } from '../utils/helpers';

/**
 * Built-in patterns for sensitive data
 */
const DEFAULT_REDACT_PATTERNS = [
  /password/i,
  /token/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /api[_-]?key/i,
  /secret/i,
  /auth/i,
  /bearer/i,
  /authorization/i,
];

/**
 * Data sanitizer for redacting sensitive information
 */
export class DataSanitizer {
  private autoRedact: boolean;
  private customPatterns: RegExp[];
  private redactedValue: string;

  constructor(
    autoRedact: boolean = true,
    customPatterns: RegExp[] = [],
    redactedValue: string = '[REDACTED]'
  ) {
    this.autoRedact = autoRedact;
    this.customPatterns = customPatterns;
    this.redactedValue = redactedValue;
  }

  /**
   * Sanitize data (remove sensitive fields)
   */
  sanitize<T>(data: T, maxDepth = 10): unknown {
    if (!this.autoRedact && this.customPatterns.length === 0) {
      return safeClone(data, maxDepth);
    }

    return this.sanitizeRecursive(data, maxDepth, 0);
  }

  private sanitizeRecursive(value: unknown, maxDepth: number, currentDepth: number): unknown {
    if (currentDepth >= maxDepth) {
      return '[Max Depth Reached]';
    }

    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value !== 'object') {
      return value;
    }

    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeRecursive(item, maxDepth, currentDepth + 1));
    }

    // Object sanitization
    try {
      const sanitized: Record<string, unknown> = {};
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          if (this.shouldRedact(key)) {
            sanitized[key] = this.redactedValue;
          } else {
            sanitized[key] = this.sanitizeRecursive(
              (value as Record<string, unknown>)[key],
              maxDepth,
              currentDepth + 1
            );
          }
        }
      }
      return sanitized;
    } catch {
      return '[Circular Reference]';
    }
  }

  /**
   * Check if a key should be redacted
   */
  private shouldRedact(key: string): boolean {
    const patterns = this.autoRedact
      ? [...DEFAULT_REDACT_PATTERNS, ...this.customPatterns]
      : this.customPatterns;

    return patterns.some((pattern) => pattern.test(key));
  }

  /**
   * Update configuration
   */
  updateConfig(autoRedact?: boolean, customPatterns?: RegExp[], redactedValue?: string): void {
    if (autoRedact !== undefined) {
      this.autoRedact = autoRedact;
    }
    if (customPatterns !== undefined) {
      this.customPatterns = customPatterns;
    }
    if (redactedValue !== undefined) {
      this.redactedValue = redactedValue;
    }
  }
}
