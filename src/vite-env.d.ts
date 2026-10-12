/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PAYPAL_CLIENT_ID?: string;
  readonly VITE_OTHER_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  posthog?: {
    capture: (event: string, properties?: Record<string, any>) => void;
    identify: (id: string, properties?: Record<string, any>) => void;
    reset: () => void;
    [key: string]: any;
  };
}

