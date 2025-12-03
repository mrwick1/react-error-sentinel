import { Plugin, Breadcrumb } from '../types';
import { omit, pick } from '../utils/helpers';

/**
 * Configuration for Zustand plugin
 */
export interface ZustandPluginConfig {
  /**
   * Custom name for this store (used in error reports)
   * @default 'zustand'
   */
  storeName?: string;

  /**
   * Specific keys to include in state capture
   * If provided, only these keys will be captured
   */
  include?: string[];

  /**
   * Keys to exclude from state capture
   */
  exclude?: string[];

  /**
   * Capture state changes as breadcrumbs
   * @default false
   */
  captureChanges?: boolean;
}

/**
 * Callback type for breadcrumbs
 */
type BreadcrumbCallback = (breadcrumb: Breadcrumb) => void;

/**
 * Minimal Zustand store interface
 */
interface ZustandStore<T = Record<string, unknown>> {
  getState: () => T;
  subscribe: (listener: (state: T, prevState: T) => void) => () => void;
}

/**
 * Extended plugin interface with cleanup
 */
export interface ZustandPlugin extends Plugin {
  /**
   * Cleanup subscription
   */
  destroy?: () => void;
}

/**
 * Create Zustand plugin for state capture
 *
 * @example
 * ```ts
 * import { useUserStore } from './stores/user';
 * import { createZustandPlugin } from 'react-error-sentinel/react';
 *
 * const userPlugin = createZustandPlugin(useUserStore, {
 *   storeName: 'user',
 *   exclude: ['password', 'token'],
 * });
 *
 * tracker.registerPlugin(userPlugin);
 * ```
 *
 * @example
 * ```ts
 * // With state change breadcrumbs
 * const plugin = createZustandPlugin(useStore, {
 *   storeName: 'app',
 *   captureChanges: true,
 * }, (breadcrumb) => tracker.addBreadcrumb(breadcrumb));
 * ```
 */
export function createZustandPlugin<T extends Record<string, unknown>>(
  store: ZustandStore<T>,
  config?: ZustandPluginConfig,
  onBreadcrumb?: BreadcrumbCallback
): ZustandPlugin {
  const storeName = config?.storeName ?? 'zustand';
  let unsubscribe: (() => void) | null = null;

  // Subscribe to state changes for breadcrumbs
  if (config?.captureChanges && onBreadcrumb) {
    unsubscribe = store.subscribe((state, prevState) => {
      // Find changed keys
      const changedKeys: string[] = [];
      const allKeys = new Set([
        ...Object.keys(state),
        ...Object.keys(prevState),
      ]);

      for (const key of allKeys) {
        if (state[key] !== prevState[key]) {
          changedKeys.push(key);
        }
      }

      if (changedKeys.length > 0) {
        onBreadcrumb({
          type: 'state',
          category: `${storeName}.change`,
          message: `State changed: ${changedKeys.join(', ')}`,
          level: 'info',
          data: {
            store: storeName,
            changedKeys,
          },
          timestamp: Date.now(),
        });
      }
    });
  }

  return {
    name: storeName,

    getState: (): Record<string, unknown> => {
      const state = store.getState() as Record<string, unknown>;

      // Include specific keys if configured
      if (config?.include && config.include.length > 0) {
        return pick(state, config.include as (keyof typeof state)[]);
      }

      // Exclude specific keys if configured
      if (config?.exclude && config.exclude.length > 0) {
        return omit(state, config.exclude as (keyof typeof state)[]);
      }

      return state;
    },

    destroy: () => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    },
  };
}

/**
 * Create multiple Zustand store plugins at once
 *
 * @example
 * ```ts
 * const plugins = createZustandPlugins({
 *   user: useUserStore,
 *   cart: useCartStore,
 *   settings: useSettingsStore,
 * }, {
 *   exclude: ['password', 'token'],
 * });
 *
 * plugins.forEach(plugin => tracker.registerPlugin(plugin));
 * ```
 */
export function createZustandPlugins(
  stores: Record<string, ZustandStore>,
  globalConfig?: Omit<ZustandPluginConfig, 'storeName'>,
  onBreadcrumb?: BreadcrumbCallback
): ZustandPlugin[] {
  return Object.entries(stores).map(([name, store]) =>
    createZustandPlugin(store, { ...globalConfig, storeName: name }, onBreadcrumb)
  );
}
