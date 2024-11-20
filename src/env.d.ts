/// <reference types="vite/client" />

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DROPBOX_APP_KEY: string;
      DROPBOX_APP_SECRET: string;
      DROPBOX_REFRESH_TOKEN: string;
    }
  }
}
