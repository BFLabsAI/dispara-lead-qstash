import { useApiSettingsStore } from "@/store/apiSettingsStore";

export const getEndpoints = () => {
  // This function should be called within a React component or a context
  // where the Zustand store is accessible.
  // For service files, we'll get the current state directly.
  // This is a simplified approach; in a larger app, you might pass endpoints
  // as arguments or use a context provider.
  return useApiSettingsStore.getState().endpoints;
};