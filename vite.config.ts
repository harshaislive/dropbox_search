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
      // Expose .env variables to client-side code
      'process.env': {
        VITE_POSTGRES_URL: JSON.stringify(env.VITE_POSTGRES_URL),
        DROPBOX_APP_KEY: JSON.stringify(env.DROPBOX_APP_KEY),
        DROPBOX_APP_SECRET: JSON.stringify(env.DROPBOX_APP_SECRET),
        DROPBOX_REFRESH_TOKEN: JSON.stringify(env.DROPBOX_REFRESH_TOKEN),
        VITE_ANALYTICS_ENABLED: JSON.stringify(env.VITE_ANALYTICS_ENABLED),
        VITE_ANALYTICS_ADMIN_EMAILS: JSON.stringify(env.VITE_ANALYTICS_ADMIN_EMAILS),
        VITE_ANALYTICS_SESSION_DURATION: JSON.stringify(env.VITE_ANALYTICS_SESSION_DURATION)
      }
    },
  };
});
