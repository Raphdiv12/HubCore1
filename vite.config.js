import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  publicDir: 'assets',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        atelier: resolve(import.meta.dirname, 'atelier/index.html'),
        works: resolve(import.meta.dirname, 'works/index.html'),
        contact: resolve(import.meta.dirname, 'contact/index.html'),
        admin: resolve(import.meta.dirname, 'admin/index.html'),
        adminLogin: resolve(import.meta.dirname, 'admin/login.html'),
      },
    },
  },
  server: {
    port: 3030,
    strictPort: true,
    open: false,
  },
});
