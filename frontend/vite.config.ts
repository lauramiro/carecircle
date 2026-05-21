import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const srcDir = path.join(projectRoot, 'src');

const TS_SRC_ALIASES = [
  'api',
  'components',
  'config',
  'constants',
  'contexts',
  'hooks',
  'lib',
  'pages',
  'services',
  'test',
  'utils',
] as const;

const srcAliases = Object.fromEntries([
  ...TS_SRC_ALIASES.map(name => [`@${name}`, path.join(srcDir, name)] as const),
  ['@typings', path.join(srcDir, 'types')] as const,
]);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: srcAliases,
  },
  server: {
    port: 5173,
    proxy: {
      '/api' : {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  
  },
});
