/// <reference types="vite/client" />

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DROPBOX_APP_KEY: string;
      DROPBOX_APP_SECRET: string;
      DROPBOX_REFRESH_TOKEN: string;
      VITE_GALLERY_ENABLED?: string;
    }
  }
}

interface ImportMetaEnv {
  readonly VITE_GALLERY_ENABLED?: string;
  readonly VITE_ANALYTICS_ENABLED?: string;
  readonly VITE_ANALYTICS_ADMIN_EMAILS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
