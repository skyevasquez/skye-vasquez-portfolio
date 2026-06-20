import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    host: true,
    port: 5173,
    open: false
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    cssCodeSplit: false,
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/')) return 'vendor-three';
          if (id.includes('node_modules/gsap/')) return 'vendor-gsap';
          if (id.includes('node_modules/lenis/')) return 'vendor-lenis';
        }
      }
    }
  }
});
