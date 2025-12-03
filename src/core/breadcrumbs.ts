import { Breadcrumb } from '../types';
import { logger } from '../utils/logger';

/**
 * Circular buffer for breadcrumbs with time-based retention
 */
export class BreadcrumbManager {
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs: number;
  private retentionMs: number;
  private pruneIntervalId?: ReturnType<typeof setInterval>;

  constructor(maxBreadcrumbs: number = 50, retentionMs: number = 5 * 60 * 1000) {
    this.maxBreadcrumbs = maxBreadcrumbs;
    this.retentionMs = retentionMs;

    // Auto-prune every 30 seconds
    this.pruneIntervalId = setInterval(() => {
      this.pruneOldBreadcrumbs();
    }, 30000);
  }

  /**
   * Add a breadcrumb to the buffer
   */
  add(breadcrumb: Breadcrumb): void {
    this.breadcrumbs.push(breadcrumb);

    // Prune old breadcrumbs based on retention time
    this.pruneOldBreadcrumbs();

    // Keep only the last N breadcrumbs (circular buffer)
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }

    logger.debug('Breadcrumb added:', breadcrumb.category, breadcrumb.message);
  }

  /**
   * Prune breadcrumbs older than retention time
   */
  private pruneOldBreadcrumbs(): void {
    const now = Date.now();
    const countBefore = this.breadcrumbs.length;

    this.breadcrumbs = this.breadcrumbs.filter((breadcrumb) => {
      return now - breadcrumb.timestamp < this.retentionMs;
    });

    const pruned = countBefore - this.breadcrumbs.length;
    if (pruned > 0) {
      logger.debug(`Pruned ${pruned} old breadcrumbs`);
    }
  }

  /**
   * Get all breadcrumbs
   */
  getAll(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }

  /**
   * Clear all breadcrumbs
   */
  clear(): void {
    this.breadcrumbs = [];
    logger.debug('Breadcrumbs cleared');
  }

  /**
   * Get breadcrumbs count
   */
  count(): number {
    return this.breadcrumbs.length;
  }

  /**
   * Cleanup and stop pruning interval
   */
  destroy(): void {
    if (this.pruneIntervalId) {
      clearInterval(this.pruneIntervalId);
      this.pruneIntervalId = undefined;
    }
    logger.debug('BreadcrumbManager destroyed');
  }
}
