import { Plugin } from '../types';
import { pick, omit } from '../utils/helpers';

export interface ReduxPluginConfig {
  slices?: string[];
  exclude?: string[];
  captureActions?: boolean;
}

// Minimal Redux store interface
interface ReduxStore {
  getState: () => Record<string, unknown>;
  dispatch?: (action: unknown) => unknown;
  subscribe?: (listener: () => void) => () => void;
}

/**
 * Create Redux plugin for state capture
 */
export function createReduxPlugin(
  store: ReduxStore,
  config?: ReduxPluginConfig
): Plugin {
  return {
    name: 'redux',

    // Get state snapshot
    getState: () => {
      const state = store.getState();

      // Return specific slices if configured
      if (config?.slices && config.slices.length > 0) {
        return pick(state, config.slices as (keyof typeof state)[]);
      }

      // Exclude specific slices if configured
      if (config?.exclude && config.exclude.length > 0) {
        return omit(state, config.exclude as (keyof typeof state)[]);
      }

      // Return full state
      return state;
    },

    // Optional: Redux middleware for action breadcrumbs (not used in MVP)
    // middleware: store => next => action => { ... }
  };
}
