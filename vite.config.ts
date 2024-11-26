import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  // Create a properly stringified version of the env variables
  const envWithStringifiedValues = Object.fromEntries(
    Object.entries(env).map(([key, value]) => [key, JSON.stringify(value)])
  );

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
      sourcemap: true,
    },
    define: {
      // Provide global variables
      global: {},
      // Provide all env variables
      'process.env': envWithStringifiedValues,
    },
    server: {
      // Enable HMR
      hmr: true,
      // Handle 404s in SPA
      historyApiFallback: true,
    },
  };
});
