/**
 * Feature Flags Infrastructure
 *
 * Provides a simple API for gating features behind flags.
 * Supports configuration via:
 * - Default values (defined below)
 * - localStorage overrides: localStorage.setItem('ff_tree-mode', 'false')
 * - URL param overrides: ?ff_tree-mode=false
 *
 * Priority order (highest to lowest):
 * 1. URL params (for demos/sharing)
 * 2. localStorage (for dev/testing)
 * 3. Default values
 */

/**
 * Feature flag names as constants for type safety
 */
export const FEATURE_FLAGS = {
  TREE_MODE: 'tree-mode',
  BATCH_MODE: 'batch-mode',
  COMPARE_MODE: 'compare-mode',
  QUALITY_MODE: 'quality-mode',
} as const;

export type FeatureFlagName = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

/**
 * Default flag values
 * All features default to enabled for backwards compatibility
 */
const DEFAULT_FLAGS: Record<FeatureFlagName, boolean> = {
  [FEATURE_FLAGS.TREE_MODE]: true,
  [FEATURE_FLAGS.BATCH_MODE]: true,
  [FEATURE_FLAGS.COMPARE_MODE]: true,
  [FEATURE_FLAGS.QUALITY_MODE]: false, // Hidden until better defined
};

/**
 * Prefix for localStorage and URL param keys
 */
const FLAG_PREFIX = 'ff_';

/**
 * Get the localStorage key for a feature flag
 */
function getLocalStorageKey(flagName: string): string {
  return `${FLAG_PREFIX}${flagName}`;
}

/**
 * Get the URL param key for a feature flag
 */
function getUrlParamKey(flagName: string): string {
  return `${FLAG_PREFIX}${flagName}`;
}

/**
 * Parse a string value to boolean
 * Returns undefined if the value cannot be parsed
 */
function parseBoolean(value: string | null): boolean | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const lowered = value.toLowerCase().trim();
  if (lowered === 'true' || lowered === '1' || lowered === 'yes' || lowered === 'on') {
    return true;
  }
  if (lowered === 'false' || lowered === '0' || lowered === 'no' || lowered === 'off') {
    return false;
  }
  return undefined;
}

/**
 * Get URL param value for a flag
 */
function getUrlParamValue(flagName: string): boolean | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(getUrlParamKey(flagName));
    return parseBoolean(value);
  } catch {
    return undefined;
  }
}

/**
 * Get localStorage value for a flag
 */
function getLocalStorageValue(flagName: string): boolean | undefined {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return undefined;
  }
  try {
    const value = localStorage.getItem(getLocalStorageKey(flagName));
    return parseBoolean(value);
  } catch {
    return undefined;
  }
}

/**
 * Check if a feature flag is enabled
 *
 * Priority order:
 * 1. URL params (highest priority - for demos/sharing)
 * 2. localStorage (for dev/testing)
 * 3. Default values (lowest priority)
 *
 * @param flagName - The name of the feature flag (e.g., 'tree-mode')
 * @returns boolean - Whether the feature is enabled
 *
 * @example
 * // Check if tree mode is enabled
 * if (isFeatureEnabled('tree-mode')) {
 *   // Show tree mode UI
 * }
 *
 * // Disable via localStorage
 * localStorage.setItem('ff_tree-mode', 'false')
 *
 * // Disable via URL param
 * // ?ff_tree-mode=false
 */
export function isFeatureEnabled(flagName: string): boolean {
  // 1. Check URL params (highest priority)
  const urlValue = getUrlParamValue(flagName);
  if (urlValue !== undefined) {
    return urlValue;
  }

  // 2. Check localStorage
  const localValue = getLocalStorageValue(flagName);
  if (localValue !== undefined) {
    return localValue;
  }

  // 3. Return default value (or true for unknown flags)
  return DEFAULT_FLAGS[flagName as FeatureFlagName] ?? true;
}

/**
 * Set a feature flag value in localStorage
 * Useful for programmatic control during development/testing
 *
 * @param flagName - The name of the feature flag
 * @param enabled - Whether to enable the feature
 */
export function setFeatureFlag(flagName: string, enabled: boolean): void {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(getLocalStorageKey(flagName), String(enabled));
    } catch {
      // Ignore localStorage errors (quota exceeded, etc.)
    }
  }
}

/**
 * Clear a feature flag override from localStorage
 * Returns the flag to its default value (unless overridden by URL param)
 *
 * @param flagName - The name of the feature flag to clear
 */
export function clearFeatureFlag(flagName: string): void {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(getLocalStorageKey(flagName));
    } catch {
      // Ignore localStorage errors
    }
  }
}

/**
 * Get all feature flags and their current values
 * Useful for debugging and admin interfaces
 *
 * @returns Record of flag names to their current enabled state
 */
export function getAllFeatureFlags(): Record<string, boolean> {
  const flags: Record<string, boolean> = {};
  for (const flagName of Object.values(FEATURE_FLAGS)) {
    flags[flagName] = isFeatureEnabled(flagName);
  }
  return flags;
}
