const DEFAULT_PUBLIC_APP_URL = 'https://disparalead.bflabs.com.br';

const LOCAL_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
]);

export function getPublicAppUrl() {
  const configuredUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, '');
  }

  if (typeof window === 'undefined') {
    return DEFAULT_PUBLIC_APP_URL;
  }

  if (LOCAL_HOSTNAMES.has(window.location.hostname)) {
    return DEFAULT_PUBLIC_APP_URL;
  }

  return window.location.origin.replace(/\/+$/, '');
}
