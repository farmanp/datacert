import { Component, lazy, Show } from 'solid-js';
import { Route } from '@solidjs/router';
import Home from './pages/Home';
import Compare from './pages/Compare';
import Batch from './pages/Batch';
import InstallPrompt from './components/InstallPrompt';
import UpdateNotification from './components/UpdateNotification';
import { isFeatureEnabled, FEATURE_FLAGS } from './utils/featureFlags';

// Lazy-loaded pages for code splitting (prevents DuckDB from loading on startup)
const SqlMode = lazy(() => import('./pages/SqlMode'));
const DuckDBSpike = lazy(() => import('./pages/DuckDBSpike'));
const TreeMode = lazy(() => import('./pages/TreeMode'));

/**
 * App Component
 *
 * Root component for the DataCert application.
 * Includes routing for:
 * - Home (single-file profiling)
 * - Compare (dual-file comparison)
 * - Batch (multi-file batch processing)
 *
 * PWA components (InstallPrompt and UpdateNotification) are rendered
 * at the root level using fixed positioning for overlay behavior.
 */
const App: Component = () => {
  return (
    <>
      <Route path="/" component={Home} />
      <Show when={isFeatureEnabled(FEATURE_FLAGS.COMPARE_MODE)}>
        <Route path="/compare" component={Compare} />
      </Show>
      <Show when={isFeatureEnabled(FEATURE_FLAGS.BATCH_MODE)}>
        <Route path="/batch" component={Batch} />
      </Show>
      <Route path="/sql-mode" component={SqlMode} />
      <Show when={isFeatureEnabled(FEATURE_FLAGS.TREE_MODE)}>
        <Route path="/tree-mode" component={TreeMode} />
      </Show>
      <Route path="/spike/duckdb" component={DuckDBSpike} />
      <InstallPrompt />
      <UpdateNotification />
    </>
  );
};

export default App;
