import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import devServer from '@hono/vite-dev-server';
import pages from '@hono/vite-cloudflare-pages';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      devServer({
        entry: 'src/index.ts',
        exclude: [/^\/(src|node_modules|@vite|@react-refresh|@fs)\/.*/, /.*\.(ts|tsx|js|jsx|css|scss|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/, /^\/$/],
      }),
      pages({
        entry: 'src/index.ts',
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
