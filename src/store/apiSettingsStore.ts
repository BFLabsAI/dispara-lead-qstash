import { create } from 'zustand';

interface ApiEndpoints {
  BUSCA_INSTANCIAS: string;
  QR_CODE: string;
  DISPARO: string;
  FILE_UPLOAD: string;
  DASHBOARD_DATA: string;
}

interface ApiSettingsState {
  apiBaseUrl: string;
  endpoints: ApiEndpoints;
  setApiBaseUrl: (url: string) => void;
  setEndpoint: (key: keyof ApiEndpoints, url: string) => void;
  getEndpoints: () => ApiEndpoints;
}

const DEFAULT_API_BASE_URL = "https://webhook.bflabs.com.br/webhook";

const getInitialState = () => {
  if (typeof window !== 'undefined') {
    const storedBaseUrl = localStorage.getItem('apiBaseUrl');
    const storedEndpoints = localStorage.getItem('apiEndpoints');

    const base = storedBaseUrl || DEFAULT_API_BASE_URL;

    const defaultEndpoints: ApiEndpoints = {
      BUSCA_INSTANCIAS: `${base}/busca-instancias-nw`,
      QR_CODE: `${base}/atualizar-qr-code-nw`,
      DISPARO: `${base}/disparar`,
      FILE_UPLOAD: `${base}/file-upload`,
      DASHBOARD_DATA: `${base}/busca-dados-r7`,
    };

    if (storedEndpoints) {
      try {
        const parsedEndpoints = JSON.parse(storedEndpoints);
        // Merge stored endpoints with defaults to ensure all keys are present
        return {
          apiBaseUrl: base,
          endpoints: { ...defaultEndpoints, ...parsedEndpoints },
        };
      } catch (e) {
        console.error("Failed to parse stored API endpoints, using defaults.", e);
      }
    }
    return { apiBaseUrl: base, endpoints: defaultEndpoints };
  }
  // Default for server-side rendering or initial load
  return {
    apiBaseUrl: DEFAULT_API_BASE_URL,
    endpoints: {
      BUSCA_INSTANCIAS: `${DEFAULT_API_BASE_URL}/busca-instancias-nw`,
      QR_CODE: `${DEFAULT_API_BASE_URL}/atualizar-qr-code-nw`,
      DISPARO: `${DEFAULT_API_BASE_URL}/disparar`,
      FILE_UPLOAD: `${DEFAULT_API_BASE_URL}/file-upload`,
      DASHBOARD_DATA: `${DEFAULT_API_BASE_URL}/busca-dados-r7`,
    },
  };
};

export const useApiSettingsStore = create<ApiSettingsState>((set, get) => ({
  ...getInitialState(),

  setApiBaseUrl: (url: string) => {
    set((state) => {
      const newEndpoints: ApiEndpoints = {
        BUSCA_INSTANCIAS: `${url}/busca-instancias-nw`,
        QR_CODE: `${url}/atualizar-qr-code-nw`,
        DISPARO: `${url}/disparar`,
        FILE_UPLOAD: `${url}/file-upload`,
        DASHBOARD_DATA: `${url}/busca-dados-r7`,
      };
      localStorage.setItem('apiBaseUrl', url);
      localStorage.setItem('apiEndpoints', JSON.stringify(newEndpoints));
      return { apiBaseUrl: url, endpoints: newEndpoints };
    });
  },

  setEndpoint: (key: keyof ApiEndpoints, url: string) => {
    set((state) => {
      const newEndpoints = { ...state.endpoints, [key]: url };
      localStorage.setItem('apiEndpoints', JSON.stringify(newEndpoints));
      return { endpoints: newEndpoints };
    });
  },

  getEndpoints: () => get().endpoints,
}));