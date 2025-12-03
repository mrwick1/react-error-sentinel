import {
  ErrorTrackerConfig,
  PartialErrorTrackerConfig,
  ErrorEvent,
  ErrorContext,
  UserInfo,
  Breadcrumb,
  Plugin,
  SeverityLevel,
} from '../types';
import { mergeConfig } from './config';
import { BreadcrumbManager } from './breadcrumbs';
import { ErrorQueue } from './queue';
import { Transport } from './transport';
import { DataSanitizer } from './sanitizer';
import { setupWindowHandlers } from '../integrations/window';
import { setupConsoleInterceptor, restoreConsole } from '../integrations/console';
import { getBrowserInfo, getOSInfo, getDeviceInfo } from '../utils/browser';
import { generateUUID, getCurrentURL, parseURL } from '../utils/helpers';
import { logger } from '../utils/logger';

/**
 * Main ErrorTracker singleton class
 */
export class ErrorTracker {
  private config!: ErrorTrackerConfig;
  private queue!: ErrorQueue;
  private transport!: Transport;
  private breadcrumbs!: BreadcrumbManager;
  private sanitizer!: DataSanitizer;
  private plugins: Map<string, Plugin> = new Map();
  private isInitialized: boolean = false;
  private flushIntervalId?: ReturnType<typeof setInterval>;
  private sendDebounceTimer?: ReturnType<typeof setTimeout>;
  private cleanupWindowHandlers?: () => void;
  private userInfo?: UserInfo;
  private contextData: Record<string, unknown> = {};

  /**
   * Initialize the tracker with configuration
   */
  init(userConfig: PartialErrorTrackerConfig): void {
    if (this.isInitialized) {
      logger.warn('ErrorTracker already initialized, reinitializing...');
      this.shutdown();
    }

    this.config = mergeConfig(userConfig);

    // Enable/disable debug logging
    if (this.config.debug) {
      logger.enable();
    } else {
      logger.disable();
    }

    // Initialize core modules
    this.breadcrumbs = new BreadcrumbManager(
      this.config.breadcrumbs.maxBreadcrumbs,
      this.config.breadcrumbRetentionMs
    );
    this.queue = new ErrorQueue(this.config.maxQueueSize);
    this.transport = new Transport(
      this.config.endpoint,
      this.config.authStrategy,
      this.config.authToken,
      this.config.payloadKey,
      this.config.retryAttempts
    );
    this.sanitizer = new DataSanitizer(
      this.config.sanitize.autoRedact,
      this.config.sanitize.customPatterns,
      this.config.sanitize.redactedValue
    );

    // Setup window error handlers
    this.cleanupWindowHandlers = setupWindowHandlers(
      this.captureError.bind(this),
      this.captureException.bind(this)
    );

    // Setup console interceptor
    setupConsoleInterceptor(
      this.config.console,
      this.addBreadcrumb.bind(this),
      this.captureError.bind(this),
      this.captureMessage.bind(this)
    );

    // Setup auto-flush interval (only if not in sendOnErrorOnly mode)
    if (!this.config.sendOnErrorOnly) {
      this.flushIntervalId = setInterval(() => {
        this.safeAsyncSend();
      }, this.config.flushInterval);
    }

    this.isInitialized = true;
    logger.info('ErrorTracker initialized', {
      environment: this.config.environment,
      sendOnErrorOnly: this.config.sendOnErrorOnly
    });
  }

  /**
   * Capture an error
   */
  captureError(error: Error, context?: ErrorContext): string {
    if (!this.isInitialized || !this.config.enabled) {
      return '';
    }

    // Check ignore patterns
    if (this.shouldIgnoreError(error.message)) {
      logger.debug('Error ignored by pattern:', error.message);
      return '';
    }

    // Apply sampling
    if (!this.shouldSample()) {
      logger.debug('Error dropped by sampling:', error.message);
      return '';
    }

    const eventId = generateUUID();
    const event = this.buildErrorEvent(eventId, error, context);

    this.queue.add(event);
    logger.debug('Error captured:', eventId, error.message);

    // If sendOnErrorOnly mode, debounce send to batch rapid errors
    if (this.config.sendOnErrorOnly) {
      this.debouncedSend();
    }

    return eventId;
  }

  /**
   * Capture an exception (can be Error or other types)
   */
  captureException(exception: unknown, context?: ErrorContext): string {
    if (!this.isInitialized || !this.config.enabled) {
      return '';
    }

    let error: Error;

    if (exception instanceof Error) {
      error = exception;
    } else {
      error = new Error(String(exception));
    }

    return this.captureError(error, context);
  }

  /**
   * Capture a message
   */
  captureMessage(message: string, level: SeverityLevel = 'info'): string {
    if (!this.isInitialized || !this.config.enabled) {
      return '';
    }

    // Check ignore patterns
    if (this.shouldIgnoreError(message)) {
      logger.debug('Message ignored by pattern:', message);
      return '';
    }

    // Apply sampling
    if (!this.shouldSample()) {
      logger.debug('Message dropped by sampling:', message);
      return '';
    }

    const eventId = generateUUID();
    const error = new Error(message);
    const event = this.buildErrorEvent(eventId, error, { level });

    this.queue.add(event);
    logger.debug('Message captured:', eventId, message);

    // If sendOnErrorOnly mode and level is error/fatal, debounce send
    if (this.config.sendOnErrorOnly && (level === 'error' || level === 'fatal')) {
      this.debouncedSend();
    }

    return eventId;
  }

  /**
   * Add a breadcrumb
   */
  addBreadcrumb(breadcrumb: Breadcrumb): void {
    if (!this.isInitialized || !this.config.breadcrumbs.enabled) {
      return;
    }

    this.breadcrumbs.add(breadcrumb);
  }

  /**
   * Set user information
   */
  setUser(user: UserInfo): void {
    this.userInfo = user;
    logger.debug('User set:', user.id);
  }

  /**
   * Set custom context
   */
  setContext(key: string, value: unknown): void {
    this.contextData[key] = value;
    logger.debug('Context set:', key);
  }

  /**
   * Register a plugin (for state management)
   */
  registerPlugin(plugin: Plugin): void {
    this.plugins.set(plugin.name, plugin);
    logger.debug('Plugin registered:', plugin.name);
  }

  /**
   * Manual flush
   */
  async flush(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    await this.sendQueuedEvents();
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    // Cleanup interval
    if (this.flushIntervalId) {
      clearInterval(this.flushIntervalId);
      this.flushIntervalId = undefined;
    }

    // Cleanup debounce timer
    if (this.sendDebounceTimer) {
      clearTimeout(this.sendDebounceTimer);
      this.sendDebounceTimer = undefined;
    }

    // Cleanup window handlers
    if (this.cleanupWindowHandlers) {
      this.cleanupWindowHandlers();
      this.cleanupWindowHandlers = undefined;
    }

    // Restore console
    restoreConsole();

    // Cleanup breadcrumbs manager
    this.breadcrumbs.destroy();

    // Final flush - await to ensure all events are sent
    try {
      await this.sendQueuedEvents();
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Final flush failed during shutdown:', err.message);
      if (this.config.onTransportError) {
        this.config.onTransportError(err);
      }
    }

    this.isInitialized = false;
    logger.info('ErrorTracker shutdown');
  }

  /**
   * Build error event
   */
  private buildErrorEvent(
    eventId: string,
    error: Error,
    context?: ErrorContext
  ): ErrorEvent {
    const timestamp = Date.now();
    const currentURL = getCurrentURL();
    const { url, query_string } = parseURL(currentURL);

    // Get state from plugins
    const state: Record<string, unknown> = {};
    if (this.config.captureState) {
      this.plugins.forEach((plugin) => {
        if (plugin.getState) {
          state[plugin.name] = plugin.getState();
        }
      });
    }

    // Get user ID from config function if available
    let userId: string | null | undefined = this.userInfo?.id;
    if (!userId && this.config.getUserId) {
      userId = this.config.getUserId();
    }

    // Merge tags from config and context
    const tags: string[] = [];
    if (this.config.tags) {
      tags.push(...this.config.tags);
    }
    // Convert context tags (Record<string, string>) to array of strings
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        tags.push(`${key}:${value}`);
      });
    }

    const event: ErrorEvent = {
      event_id: eventId,
      timestamp,
      environment: this.config.environment,
      level: context?.level || 'error',
      platform: 'javascript',
      error: {
        message: error.message,
        type: error.name,
        stack_trace: error.stack,
        handled: false,
      },
      context: {
        browser: getBrowserInfo(),
        os: getOSInfo(),
        device: getDeviceInfo(),
      },
      user: userId
        ? {
            id: userId,
            ...this.userInfo,
            ...context?.user,
          }
        : context?.user,
      request: {
        url,
        method: 'GET',
        query_string,
      },
      request_url: currentURL, // Top-level request URL
      state: this.sanitizer.sanitize(state) as Record<string, unknown>,
      breadcrumbs: this.breadcrumbs.getAll(),
      tags: tags.length > 0 ? tags : undefined, // Array of tag strings
      extra: {
        ...this.contextData,
        ...context?.extra,
      },
    };

    return event;
  }

  /**
   * Check if this event should be sampled based on sampleRate
   */
  private shouldSample(): boolean {
    if (this.config.sampleRate >= 1.0) {
      return true;
    }
    if (this.config.sampleRate <= 0) {
      return false;
    }
    return Math.random() < this.config.sampleRate;
  }

  /**
   * Check if error message matches any ignore patterns
   */
  private shouldIgnoreError(message: string): boolean {
    if (!this.config.ignoreErrors || this.config.ignoreErrors.length === 0) {
      return false;
    }

    return this.config.ignoreErrors.some((pattern) => {
      try {
        return pattern.test(message);
      } catch {
        logger.warn('Invalid ignoreErrors pattern:', pattern);
        return false;
      }
    });
  }

  /**
   * Safe async send with error handling
   */
  private safeAsyncSend(): void {
    this.sendQueuedEvents().catch((error: unknown) => {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Async send failed:', err.message);
      if (this.config.onTransportError) {
        this.config.onTransportError(err);
      }
    });
  }

  /**
   * Debounced send - waits for rapid errors to batch them
   */
  private debouncedSend(): void {
    // Clear existing timer
    if (this.sendDebounceTimer) {
      clearTimeout(this.sendDebounceTimer);
    }

    // Start new timer
    this.sendDebounceTimer = setTimeout(() => {
      this.safeAsyncSend();
    }, this.config.debounceMs);

    logger.debug('Send debounced for', this.config.debounceMs, 'ms');
  }

  /**
   * Send queued events to backend
   */
  private async sendQueuedEvents(): Promise<void> {
    const events = this.queue.getAll();

    if (events.length === 0) {
      return;
    }

    logger.debug('Sending queued events:', events.length);

    const response = await this.transport.send(events);

    if (response.success) {
      // Clear successfully sent events
      if (response.eventIds) {
        this.queue.remove(response.eventIds);
      } else {
        this.queue.clear();
      }
      logger.info('Events sent successfully:', events.length);
    } else {
      logger.error('Failed to send events:', response.error);
      // Events remain in queue for retry
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ErrorTrackerConfig {
    return this.config;
  }
}

// Export singleton instance
export const tracker = new ErrorTracker();
