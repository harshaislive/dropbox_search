import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    define: {
      'process.env.DROPBOX_APP_KEY': JSON.stringify(env.DROPBOX_APP_KEY),
      'process.env.DROPBOX_APP_SECRET': JSON.stringify(env.DROPBOX_APP_SECRET),
      'process.env.DROPBOX_REFRESH_TOKEN': JSON.stringify(env.DROPBOX_REFRESH_TOKEN),
    },
  };
});
