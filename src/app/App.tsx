import { Component, lazy } from 'solid-js';
import { Route } from '@solidjs/router';
import Home from './pages/Home';
import Compare from './pages/Compare';
import Batch from './pages/Batch';
import InstallPrompt from './components/InstallPrompt';
import UpdateNotification from './components/UpdateNotification';

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
      <Route path="/compare" component={Compare} />
      <Route path="/batch" component={Batch} />
      <Route path="/sql-mode" component={SqlMode} />
      <Route path="/tree-mode" component={TreeMode} />
      <Route path="/spike/duckdb" component={DuckDBSpike} />
      <InstallPrompt />
      <UpdateNotification />
    </>
  );
};

export default App;
