/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_SHEET_URL?: string;
  readonly VITE_GOOGLE_APPS_SCRIPT_WEBHOOK_URL?: string;
  readonly VITE_ASSISTANT_NAME?: string;
  readonly VITE_APP_TITLE?: string;
  readonly [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
