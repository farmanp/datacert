// Mock for virtual:pwa-register in tests
export function registerSW(_options?: {
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegistered?: (registration: unknown) => void;
  onRegisterError?: (error: unknown) => void;
}) {
  // Return a no-op update function
  return async () => {
    // Mock implementation - does nothing in tests
  };
}
