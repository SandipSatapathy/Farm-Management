import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { localPgPlugin } from './src/server/localPgPlugin';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), localPgPlugin()],
  server: {
    port: 3000,
    open: false,
  },
});

