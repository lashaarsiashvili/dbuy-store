import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig } from 'vite';

function copyUploadsPlugin() {
  return {
    name: 'copy-uploads-to-dist',
    closeBundle() {
      const distUploads = path.resolve(__dirname, 'dist/uploads');
      const publicUploads = path.resolve(__dirname, 'public/uploads');
      const dataUploads = path.resolve(__dirname, 'data/uploads');

      try {
        fs.mkdirSync(distUploads, { recursive: true });
        if (fs.existsSync(publicUploads)) {
          fs.cpSync(publicUploads, distUploads, { recursive: true, force: true });
        }
        if (fs.existsSync(dataUploads)) {
          fs.cpSync(dataUploads, distUploads, { recursive: true, force: true });
        }
        console.log('[copy-uploads-plugin] Successfully copied all upload assets into dist/uploads!');
      } catch (err) {
        console.warn('[copy-uploads-plugin] Warning copying uploads:', err);
      }
    },
  };
}

export default defineConfig(() => {
  return {
    publicDir: 'public',
    plugins: [react(), tailwindcss(), copyUploadsPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: {
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || process.env.FIREBASE_API_KEY || ''),
      'process.env.PROJECT_ID': JSON.stringify(process.env.PROJECT_ID || process.env.FIREBASE_PROJECT_ID || ''),
      'process.env.FIREBASE_API_KEY': JSON.stringify(process.env.FIREBASE_API_KEY || process.env.API_KEY || ''),
      'process.env.FIREBASE_PROJECT_ID': JSON.stringify(process.env.FIREBASE_PROJECT_ID || process.env.PROJECT_ID || ''),
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR === 'true' ? false : { overlay: false },
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
