import { storage } from '../utils/storage';
import { generateUUID } from '../utils/helpers';

const SESSION_KEY = 'sentinel_session';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Session data structure
 */
export interface SessionData {
  /**
   * Unique session identifier
   */
  sessionId: string;

  /**
   * When the session started
   */
  startedAt: number;

  /**
   * Last activity timestamp
   */
  lastActiveAt: number;

  /**
   * Number of page views in this session
   */
  pageViews: number;

  /**
   * Number of errors captured in this session
   */
  errorCount: number;

  /**
   * Whether this is a new session (started in current page load)
   */
  isNew: boolean;
}

/**
 * Session manager for tracking user sessions
 *
 * @example
 * ```ts
 * const sessionManager = new SessionManager();
 *
 * // Get session ID for error events
 * const sessionId = sessionManager.getSessionId();
 *
 * // Record activity
 * sessionManager.recordPageView();
 * sessionManager.recordError();
 *
 * // Get full session data
 * const session = sessionManager.getSession();
 * console.log(session.pageViews, session.errorCount);
 * ```
 */
export class SessionManager {
  private session: SessionData | null = null;
  private activityThrottleMs: number = 60000; // 1 minute
  private lastActivityUpdate: number = 0;
  private saveDebounceId?: ReturnType<typeof setTimeout>;

  constructor() {
    this.initSession();
  }

  /**
   * Get current session data
   */
  getSession(): SessionData {
    if (!this.session) {
      this.initSession();
    }
    return this.session!;
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.getSession().sessionId;
  }

  /**
   * Check if this is a new session
   */
  isNewSession(): boolean {
    return this.getSession().isNew;
  }

  /**
   * Record a page view
   */
  recordPageView(): void {
    if (this.session) {
      this.session.pageViews++;
      this.updateActivity();
    }
  }

  /**
   * Record an error
   */
  recordError(): void {
    if (this.session) {
      this.session.errorCount++;
      this.updateActivity();
    }
  }

  /**
   * Touch session (update last activity without incrementing counters)
   */
  touch(): void {
    this.updateActivity();
  }

  /**
   * Get session duration in milliseconds
   */
  getDuration(): number {
    if (!this.session) return 0;
    return Date.now() - this.session.startedAt;
  }

  /**
   * Initialize or restore session
   */
  private initSession(): void {
    const stored = this.loadSession();
    const now = Date.now();

    if (stored && now - stored.lastActiveAt < SESSION_TIMEOUT_MS) {
      // Resume existing session
      this.session = {
        ...stored,
        lastActiveAt: now,
        isNew: false,
      };
    } else {
      // Start new session
      this.session = {
        sessionId: generateUUID(),
        startedAt: now,
        lastActiveAt: now,
        pageViews: 1,
        errorCount: 0,
        isNew: true,
      };
    }

    this.saveSession();
  }

  /**
   * Update last activity time (throttled)
   */
  private updateActivity(): void {
    if (!this.session) return;

    const now = Date.now();

    // Always update in memory
    this.session.lastActiveAt = now;

    // Throttle saves to storage
    if (now - this.lastActivityUpdate > this.activityThrottleMs) {
      this.lastActivityUpdate = now;
      this.saveSession();
    } else {
      // Debounce save for non-throttled updates
      this.debouncedSave();
    }
  }

  /**
   * Debounced save to avoid too many storage writes
   */
  private debouncedSave(): void {
    if (this.saveDebounceId) {
      clearTimeout(this.saveDebounceId);
    }
    this.saveDebounceId = setTimeout(() => {
      this.saveSession();
    }, 5000);
  }

  /**
   * Load session from storage
   */
  private loadSession(): Omit<SessionData, 'isNew'> | null {
    try {
      const data = storage.getItem(SESSION_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        // Validate structure
        if (
          typeof parsed.sessionId === 'string' &&
          typeof parsed.startedAt === 'number' &&
          typeof parsed.lastActiveAt === 'number'
        ) {
          return parsed as Omit<SessionData, 'isNew'>;
        }
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  }

  /**
   * Save session to storage
   */
  private saveSession(): void {
    if (!this.session) return;

    try {
      // Don't save isNew flag to storage
      const toSave: Omit<SessionData, 'isNew'> = {
        sessionId: this.session.sessionId,
        startedAt: this.session.startedAt,
        lastActiveAt: this.session.lastActiveAt,
        pageViews: this.session.pageViews,
        errorCount: this.session.errorCount,
      };
      storage.setItem(SESSION_KEY, JSON.stringify(toSave));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * End the current session
   */
  endSession(): void {
    this.saveSession();
    this.session = null;
    try {
      storage.removeItem(SESSION_KEY);
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.saveDebounceId) {
      clearTimeout(this.saveDebounceId);
    }
    this.saveSession();
  }
}

// Singleton instance
let sessionManagerInstance: SessionManager | null = null;

/**
 * Get the singleton session manager instance
 */
export function getSessionManager(): SessionManager {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new SessionManager();
  }
  return sessionManagerInstance;
}
