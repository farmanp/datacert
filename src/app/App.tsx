import { Component } from 'solid-js';
import { Route } from '@solidjs/router';
import Home from './pages/Home';
import Compare from './pages/Compare';
import Batch from './pages/Batch';
import DuckDBSpike from './pages/DuckDBSpike';
import InstallPrompt from './components/InstallPrompt';
import UpdateNotification from './components/UpdateNotification';

/**
 * App Component
 *
 * Root component for the DataLens Profiler application.
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
      <Route path="/spike/duckdb" component={DuckDBSpike} />
      <InstallPrompt />
      <UpdateNotification />
    </>
  );
};

export default App;
