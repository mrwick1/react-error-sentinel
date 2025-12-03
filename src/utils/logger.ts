/**
 * Internal logger for debugging (only in debug mode)
 */
class Logger {
  private enabled: boolean = false;
  private prefix: string = '[ErrorSentinel]';

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  debug(...args: unknown[]): void {
    if (this.enabled) {
      console.log(this.prefix, ...args);
    }
  }

  info(...args: unknown[]): void {
    if (this.enabled) {
      console.info(this.prefix, ...args);
    }
  }

  warn(...args: unknown[]): void {
    if (this.enabled) {
      console.warn(this.prefix, ...args);
    }
  }

  error(...args: unknown[]): void {
    // Always log errors, even if debug is disabled
    console.error(this.prefix, ...args);
  }
}

export const logger = new Logger();
