import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    optimizeDeps: {
      include: ['react-router-dom'],
      exclude: ['lucide-react'],
    },
    build: {
      rollupOptions: {
        external: [],
      },
    },
    define: {
      // Provide global variables
      global: {},
      // Polyfill process
      'process.env': {
        ...env,
        VITE_POSTGRES_URL: JSON.stringify(env.VITE_POSTGRES_URL),
        VITE_DROPBOX_APP_KEY: JSON.stringify(env.VITE_DROPBOX_APP_KEY),
        VITE_DROPBOX_APP_SECRET: JSON.stringify(env.VITE_DROPBOX_APP_SECRET),
        VITE_DROPBOX_REFRESH_TOKEN: JSON.stringify(env.VITE_DROPBOX_REFRESH_TOKEN),
        VITE_N8N_WEBHOOK_URL: JSON.stringify(env.VITE_N8N_WEBHOOK_URL),
        VITE_ANALYTICS_ENABLED: JSON.stringify(env.VITE_ANALYTICS_ENABLED),
        VITE_ANALYTICS_ADMIN_EMAILS: JSON.stringify(env.VITE_ANALYTICS_ADMIN_EMAILS),
        VITE_ANALYTICS_SESSION_DURATION: JSON.stringify(env.VITE_ANALYTICS_SESSION_DURATION)
      }
    },
  };
});
