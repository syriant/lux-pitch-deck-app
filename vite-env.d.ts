/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  // Sunset switch: when set, deck creation is hidden and the dashboard points
  // users at this URL (the LUX-hosted pitch deck tool) instead.
  readonly VITE_MIGRATED_URL?: string;
}
