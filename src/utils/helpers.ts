/**
 * Generate UUID v4
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get current timestamp in milliseconds
 */
export function getTimestamp(): number {
  return Date.now();
}

/**
 * Parse and sanitize URL
 */
export function parseURL(url: string): { url: string; query_string: string } {
  try {
    const parsed = new URL(url);
    return {
      url: `${parsed.protocol}//${parsed.host}${parsed.pathname}`,
      query_string: parsed.search,
    };
  } catch {
    return {
      url: url,
      query_string: '',
    };
  }
}

/**
 * Get current page URL
 */
export function getCurrentURL(): string {
  return window.location.href;
}

/**
 * Simple object picker
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

/**
 * Simple object omitter
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach((key) => {
    delete result[key];
  });
  return result as Omit<T, K>;
}

/**
 * Deep clone with circular reference handling
 */
export function safeClone<T>(obj: T, maxDepth = 10, currentDepth = 0): unknown {
  if (currentDepth >= maxDepth) {
    return '[Max Depth Reached]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      stack: obj.stack,
    };
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => safeClone(item, maxDepth, currentDepth + 1));
  }

  try {
    const cloned: Record<string, unknown> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = safeClone(obj[key], maxDepth, currentDepth + 1);
      }
    }
    return cloned;
  } catch {
    return '[Circular Reference]';
  }
}
