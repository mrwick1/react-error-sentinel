import { ErrorEvent, TransportResponse } from '../types';
import { AuthStrategy } from '../types/config';
import { logger } from '../utils/logger';

const DEFAULT_RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

/**
 * HTTP transport layer for sending errors to backend
 */
export class Transport {
  private endpoint: string;
  private authStrategy: AuthStrategy;
  private authToken?: string;
  private payloadKey: string;
  private maxAttempts: number;
  private baseDelayMs: number;
  private maxDelayMs: number;

  constructor(
    endpoint: string,
    authStrategy: AuthStrategy = 'none',
    authToken?: string,
    payloadKey: string = 'events',
    retryAttempts: number = DEFAULT_RETRY_CONFIG.maxAttempts
  ) {
    this.endpoint = endpoint;
    this.authStrategy = authStrategy;
    this.authToken = authToken;
    this.payloadKey = payloadKey;
    this.maxAttempts = retryAttempts;
    this.baseDelayMs = DEFAULT_RETRY_CONFIG.baseDelayMs;
    this.maxDelayMs = DEFAULT_RETRY_CONFIG.maxDelayMs;
  }

  /**
   * Send events to backend with retry logic
   */
  async send(events: ErrorEvent[]): Promise<TransportResponse> {
    if (!this.endpoint) {
      logger.error('No endpoint configured');
      return { success: false, error: 'No endpoint configured' };
    }

    if (events.length === 0) {
      return { success: true, eventIds: [] };
    }

    let lastError = '';
    let lastStatus: number | null = null;

    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      try {
        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: this.buildHeaders(),
          body: JSON.stringify({ [this.payloadKey]: events }),
        });

        if (response.ok) {
          const data = await response.json();
          logger.debug('Events sent successfully:', events.length);
          return {
            success: true,
            eventIds: data.event_ids || events.map((e) => e.event_id),
          };
        }

        // Request completed but with error status
        lastStatus = response.status;
        lastError = await response.text();
        logger.warn(
          `Send attempt ${attempt + 1}/${this.maxAttempts} failed:`,
          response.status,
          lastError
        );

        // Check if we should retry
        if (!this.isRetryableError(response.status)) {
          logger.error('Non-retryable error, giving up:', response.status);
          return {
            success: false,
            error: `HTTP ${response.status}: ${lastError}`,
          };
        }

        // Calculate delay, respecting Retry-After header if present
        let delay = this.calculateBackoffDelay(attempt);
        const retryAfter = response.headers.get('Retry-After');
        if (retryAfter) {
          const retryAfterSeconds = parseInt(retryAfter, 10);
          if (!isNaN(retryAfterSeconds)) {
            delay = Math.min(retryAfterSeconds * 1000, this.maxDelayMs);
          }
        }

        // Wait before retrying (unless this was the last attempt)
        if (attempt < this.maxAttempts - 1) {
          logger.debug(`Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      } catch (error) {
        // Network error
        lastStatus = null;
        lastError = error instanceof Error ? error.message : 'Network error';
        logger.warn(
          `Send attempt ${attempt + 1}/${this.maxAttempts} network error:`,
          lastError
        );

        // Wait before retrying (unless this was the last attempt)
        if (attempt < this.maxAttempts - 1) {
          const delay = this.calculateBackoffDelay(attempt);
          logger.debug(`Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    // All attempts failed
    logger.error(
      `Failed to send events after ${this.maxAttempts} attempts:`,
      lastError
    );
    return {
      success: false,
      error: lastStatus !== null ? `HTTP ${lastStatus}: ${lastError}` : lastError,
    };
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateBackoffDelay(attempt: number): number {
    const exponentialDelay = this.baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * 0.3 * exponentialDelay;
    return Math.min(Math.floor(exponentialDelay + jitter), this.maxDelayMs);
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(status: number): boolean {
    // 5xx server errors are retryable
    if (status >= 500 && status < 600) {
      return true;
    }
    // 429 Too Many Requests is retryable
    if (status === 429) {
      return true;
    }
    // 408 Request Timeout is retryable
    if (status === 408) {
      return true;
    }
    // 4xx client errors (except 429, 408) are NOT retryable
    return false;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Fetch errors from backend (for dashboard)
   */
  async fetch(): Promise<ErrorEvent[]> {
    if (!this.endpoint) {
      logger.error('No endpoint configured');
      throw new Error('No endpoint configured');
    }

    try {
      const response = await fetch(this.endpoint, {
        method: 'GET',
        headers: this.buildHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Failed to fetch errors:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      logger.debug('Errors fetched successfully');

      let logs: ErrorEvent[] = [];

      // Handle paginated response with results array
      if (data && Array.isArray(data.results)) {
        // Extract log arrays from each result and flatten them
        data.results.forEach((result: { log?: ErrorEvent[] }) => {
          if (result.log && Array.isArray(result.log)) {
            logs.push(...result.log);
          }
        });
      }
      // Fallback: single result with log array
      else if (data && Array.isArray(data.log)) {
        logs = data.log;
      }
      // Fallback: if response is directly an array
      else if (Array.isArray(data)) {
        logs = data;
      } else {
        logger.warn('Unexpected response format, returning empty array');
        return [];
      }

      // Normalize tags: convert old format (object) to new format (string array)
      return logs.map((log) => {
        const normalizedLog = { ...log };

        // Check if tags exists and is an object (old format)
        if (normalizedLog.tags && typeof normalizedLog.tags === 'object' && !Array.isArray(normalizedLog.tags)) {
          // Convert object to string array: {type: "api_error"} => ["type:api_error"]
          const tagsArray: string[] = [];
          Object.entries(normalizedLog.tags as Record<string, string>).forEach(([key, value]) => {
            tagsArray.push(`${key}:${value}`);
          });
          normalizedLog.tags = tagsArray;
        }

        // If tags is already an array or undefined, leave it as is
        return normalizedLog;
      });
    } catch (error) {
      logger.error('Network error fetching errors:', error);
      throw error instanceof Error ? error : new Error('Network error');
    }
  }

  /**
   * Build HTTP headers
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authStrategy === 'bearer' && this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    } else if (this.authStrategy === 'apiKey' && this.authToken) {
      headers['X-API-Key'] = this.authToken;
    }

    return headers;
  }

  /**
   * Update configuration
   */
  updateConfig(
    endpoint?: string,
    authStrategy?: AuthStrategy,
    authToken?: string,
    payloadKey?: string,
    retryAttempts?: number
  ): void {
    if (endpoint !== undefined) {
      this.endpoint = endpoint;
    }
    if (authStrategy !== undefined) {
      this.authStrategy = authStrategy;
    }
    if (authToken !== undefined) {
      this.authToken = authToken;
    }
    if (payloadKey !== undefined) {
      this.payloadKey = payloadKey;
    }
    if (retryAttempts !== undefined) {
      this.maxAttempts = retryAttempts;
    }
  }
}
