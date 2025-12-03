import { ErrorEvent } from '../types';
import { storage } from '../utils/storage';
import { logger } from '../utils/logger';

const QUEUE_STORAGE_KEY = 'sentinel_error_queue';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Error queue with localStorage persistence
 */
export class ErrorQueue {
  private queue: ErrorEvent[] = [];
  private maxSize: number;

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
    this.restore();
  }

  /**
   * Add an error event to the queue
   */
  add(event: ErrorEvent): void {
    this.queue.push(event);

    // Keep only the last N events (circular buffer)
    if (this.queue.length > this.maxSize) {
      this.queue.shift();
    }

    this.persist();
    logger.debug('Error added to queue:', event.event_id);
  }

  /**
   * Get all events from the queue
   */
  getAll(): ErrorEvent[] {
    return [...this.queue];
  }

  /**
   * Flush the queue (get all events and clear)
   */
  flush(): ErrorEvent[] {
    const events = this.getAll();
    this.clear();
    logger.debug('Queue flushed:', events.length, 'events');
    return events;
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = [];
    this.persist();
    logger.debug('Queue cleared');
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Persist queue to localStorage
   */
  private persist(): void {
    try {
      const data = JSON.stringify(this.queue);
      storage.setItem(QUEUE_STORAGE_KEY, data);
    } catch (error) {
      // Check if this is a quota exceeded error
      const isQuotaError =
        error instanceof DOMException &&
        (error.name === 'QuotaExceededError' ||
          error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
          error.code === 22);

      if (isQuotaError) {
        logger.warn('Storage quota exceeded, attempting to free space');
        this.handleQuotaExceeded();
      } else {
        logger.error('Failed to persist queue:', error);
      }
    }
  }

  /**
   * Handle storage quota exceeded by removing old events
   */
  private handleQuotaExceeded(): void {
    const originalLength = this.queue.length;

    while (this.queue.length > 0) {
      // Remove oldest event (first in queue)
      this.queue.shift();

      try {
        const data = JSON.stringify(this.queue);
        storage.setItem(QUEUE_STORAGE_KEY, data);
        logger.warn(
          `Removed ${originalLength - this.queue.length} old events to free storage space`
        );
        return;
      } catch {
        // Still over quota, continue removing
      }
    }

    // If queue is empty and still can't persist, clear storage key
    try {
      storage.removeItem(QUEUE_STORAGE_KEY);
      logger.warn('Cleared queue storage due to quota issues');
    } catch {
      // Ignore storage removal errors
    }
  }

  /**
   * Restore queue from localStorage
   */
  private restore(): void {
    try {
      const data = storage.getItem(QUEUE_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data) as ErrorEvent[];

        // Validate that parsed is an array
        if (!Array.isArray(parsed)) {
          logger.warn('Queue data is not an array, clearing queue');
          this.queue = [];
          storage.removeItem(QUEUE_STORAGE_KEY);
          return;
        }

        // Filter out old events (older than 7 days)
        const now = Date.now();
        this.queue = parsed.filter((event) => {
          return now - event.timestamp < MAX_AGE_MS;
        });

        logger.debug('Queue restored:', this.queue.length, 'events');

        // Persist cleaned queue
        if (this.queue.length !== parsed.length) {
          this.persist();
        }
      }
    } catch (error) {
      logger.error('Failed to restore queue:', error);
      this.queue = [];
      // Clear corrupted data from storage
      try {
        storage.removeItem(QUEUE_STORAGE_KEY);
      } catch {
        // Ignore storage removal errors
      }
    }
  }

  /**
   * Remove specific events from queue
   */
  remove(eventIds: string[]): void {
    const idsSet = new Set(eventIds);
    this.queue = this.queue.filter((event) => !idsSet.has(event.event_id));
    this.persist();
    logger.debug('Removed events from queue:', eventIds.length);
  }
}
