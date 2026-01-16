import { Component, createSignal, Show, For, onCleanup, JSX } from 'solid-js';
import { A, useLocation } from '@solidjs/router';
import { isFeatureEnabled, FEATURE_FLAGS } from '../utils/featureFlags';
import PrivacyBadge from './PrivacyBadge';

/**
 * Navigation item type for primary and secondary navigation
 */
interface NavItem {
  href: string;
  label: string;
  icon: () => JSX.Element;
  featureFlag?: string;
}

/**
 * Primary navigation items - always visible
 */
const primaryNavItems: NavItem[] = [
  {
    href: '/',
    label: 'Home',
    icon: () => (
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    href: '/sql-mode',
    label: 'SQL Mode',
    icon: () => (
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
        />
      </svg>
    ),
  },
];

/**
 * Secondary navigation items - shown in "More Tools" dropdown
 */
const moreToolsItems: NavItem[] = [
  {
    href: '/compare',
    label: 'Compare',
    featureFlag: FEATURE_FLAGS.COMPARE_MODE,
    icon: () => (
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
        />
      </svg>
    ),
  },
  {
    href: '/batch',
    label: 'Batch',
    featureFlag: FEATURE_FLAGS.BATCH_MODE,
    icon: () => (
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    ),
  },
  {
    href: '/tree-mode',
    label: 'Tree Mode',
    featureFlag: FEATURE_FLAGS.TREE_MODE,
    icon: () => (
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
        />
      </svg>
    ),
  },
];

/**
 * Props for the Navigation component
 */
interface NavigationProps {
  /** Show back button with custom label */
  showBack?: boolean;
  /** Custom back URL (defaults to /) */
  backUrl?: string;
  /** Page title to show in center */
  title?: string;
  /** Additional class names for the container */
  class?: string;
  /** Whether this is a minimal header (just back button and title) */
  minimal?: boolean;
}

/**
 * Navigation Component
 *
 * Provides consistent navigation across all pages with:
 * - Primary nav: Home, SQL Mode (always visible)
 * - "More Tools" dropdown: Compare, Batch, Tree Mode (feature-flag gated)
 * - Active state highlighting
 * - Responsive design
 */
const Navigation: Component<NavigationProps> = (props) => {
  const [isDropdownOpen, setIsDropdownOpen] = createSignal(false);
  const location = useLocation();
  let dropdownRef: HTMLDivElement | undefined;

  // Get visible "More Tools" items based on feature flags
  const getVisibleMoreTools = () => {
    return moreToolsItems.filter(
      (item) => !item.featureFlag || isFeatureEnabled(item.featureFlag)
    );
  };

  // Check if any "More Tools" item is currently active
  const isMoreToolsActive = () => {
    return getVisibleMoreTools().some((item) => location.pathname === item.href);
  };

  // Close dropdown when clicking outside
  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
      setIsDropdownOpen(false);
    }
  };

  // Close dropdown on escape key
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  // Add event listeners when dropdown is open
  const toggleDropdown = () => {
    const newState = !isDropdownOpen();
    setIsDropdownOpen(newState);
    if (newState) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    }
  };

  onCleanup(() => {
    document.removeEventListener('click', handleClickOutside);
    document.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <>
      {/* Minimal mode - just back button and title */}
      <Show when={props.minimal}>
        <header
          class={`bg-slate-800/50 border-b border-slate-700 px-4 py-4 sm:px-8 ${props.class || ''}`}
        >
          <div class="max-w-7xl mx-auto flex items-center justify-between">
            <div class="flex items-center gap-4">
              <Show when={props.showBack !== false}>
                <A
                  href={props.backUrl || '/'}
                  class="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                >
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  <span class="text-sm font-medium">Back to Home</span>
                </A>
              </Show>
            </div>

            <Show when={props.title}>
              <div class="flex items-center gap-4">
                <h1 class="text-xl sm:text-2xl font-bold font-heading bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                  {props.title}
                </h1>
                <PrivacyBadge />
              </div>
            </Show>

            <div class="w-24" />
          </div>
        </header>
      </Show>

      {/* Full navigation mode */}
      <Show when={!props.minimal}>
        <nav
          class={`bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 px-4 py-3 sm:px-8 sticky top-0 z-40 ${props.class || ''}`}
        >
          <div class="max-w-7xl mx-auto flex items-center justify-between">
            {/* Logo / Brand */}
            <A
              href="/"
              class="flex items-center gap-2 text-white font-bold text-lg tracking-tight hover:opacity-80 transition-opacity"
            >
              <span class="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 font-heading">
                DataCert
              </span>
            </A>

            <PrivacyBadge />

            {/* Primary Navigation */}
            <div class="flex items-center gap-1">
              <For each={primaryNavItems}>
                {(item) => (
                  <A
                    href={item.href}
                    class={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${location.pathname === item.href
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    {item.icon()}
                    <span class="hidden sm:inline">{item.label}</span>
                  </A>
                )}
              </For>

              {/* More Tools Dropdown */}
              <Show when={getVisibleMoreTools().length > 0}>
                <div class="relative" ref={dropdownRef}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDropdown();
                    }}
                    class={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isMoreToolsActive()
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : isDropdownOpen()
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    aria-expanded={isDropdownOpen()}
                    aria-haspopup="true"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                      />
                    </svg>
                    <span class="hidden sm:inline">More Tools</span>
                    <svg
                      class={`w-3 h-3 transition-transform ${isDropdownOpen() ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  <Show when={isDropdownOpen()}>
                    <div class="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div class="p-1">
                        <For each={getVisibleMoreTools()}>
                          {(item) => (
                            <A
                              href={item.href}
                              onClick={() => setIsDropdownOpen(false)}
                              class={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${location.pathname === item.href
                                ? 'bg-purple-500/20 text-purple-400'
                                : 'text-slate-300 hover:text-white hover:bg-slate-700'
                                }`}
                            >
                              {item.icon()}
                              <span>{item.label}</span>
                              <Show when={location.pathname === item.href}>
                                <span class="ml-auto">
                                  <svg
                                    class="w-4 h-4 text-purple-400"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fill-rule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clip-rule="evenodd"
                                    />
                                  </svg>
                                </span>
                              </Show>
                            </A>
                          )}
                        </For>
                      </div>
                      <div class="px-3 py-2 bg-slate-900/50 border-t border-slate-700">
                        <p class="text-[10px] text-slate-500 uppercase tracking-wider">
                          Advanced analysis tools
                        </p>
                      </div>
                    </div>
                  </Show>
                </div>
              </Show>
            </div>
          </div>
        </nav>
      </Show>
    </>
  );
};

export default Navigation;
