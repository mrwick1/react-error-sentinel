/**
 * Safe localStorage wrapper with fallbacks
 */
class SafeStorage {
  private isAvailable: boolean;
  private memoryStore: Map<string, string>;

  constructor() {
    this.isAvailable = this.checkAvailability();
    this.memoryStore = new Map();
  }

  private checkAvailability(): boolean {
    try {
      const testKey = '__sentinel_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  getItem(key: string): string | null {
    if (this.isAvailable) {
      try {
        return localStorage.getItem(key);
      } catch {
        // Fall through to memory store
      }
    }
    return this.memoryStore.get(key) || null;
  }

  setItem(key: string, value: string): void {
    if (this.isAvailable) {
      try {
        localStorage.setItem(key, value);
        return;
      } catch {
        // Fall through to memory store
      }
    }
    this.memoryStore.set(key, value);
  }

  removeItem(key: string): void {
    if (this.isAvailable) {
      try {
        localStorage.removeItem(key);
        return;
      } catch {
        // Fall through to memory store
      }
    }
    this.memoryStore.delete(key);
  }

  clear(): void {
    if (this.isAvailable) {
      try {
        // Only clear sentinel keys
        const keys = Object.keys(localStorage);
        keys.forEach((key) => {
          if (key.startsWith('sentinel_')) {
            localStorage.removeItem(key);
          }
        });
        return;
      } catch {
        // Fall through to memory store
      }
    }
    this.memoryStore.clear();
  }
}

export const storage = new SafeStorage();
