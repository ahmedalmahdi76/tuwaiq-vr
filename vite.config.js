import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// BASE_PATH is set by the GitHub Pages build (e.g. "/tuwaiq-vr/").
// Local dev and preview use "/".
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [basicSsl()],
  resolve: {
    // "three" is pinned in package.json to the same super-three A-Frame uses.
    // dedupe makes sure every import (A-Frame, troika) resolves to that one copy.
    dedupe: ['three'],
  },
  build: {
    chunkSizeWarningLimit: 2000, // A-Frame alone is ~1.3 MB minified
  },
  server: {
    host: true, // listen on the LAN so a phone on the same Wi-Fi can connect
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
});
