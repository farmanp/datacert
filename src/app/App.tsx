import { Component } from 'solid-js';
import Home from './pages/Home';
import InstallPrompt from './components/InstallPrompt';
import UpdateNotification from './components/UpdateNotification';

/**
 * App Component
 *
 * Root component for the DataLens Profiler application.
 * Currently renders the Home page directly.
 * Future versions may include routing for multiple pages.
 *
 * PWA components (InstallPrompt and UpdateNotification) are rendered
 * at the root level using fixed positioning for overlay behavior.
 */
const App: Component = () => {
  return (
    <>
      <Home />
      <InstallPrompt />
      <UpdateNotification />
    </>
  );
};

export default App;
