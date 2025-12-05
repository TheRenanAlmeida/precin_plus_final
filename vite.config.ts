
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
// FIX: Import fileURLToPath to get the directory name in an ES module context.
import { fileURLToPath } from 'url';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          // FIX: Replaced __dirname with the standard ESM equivalent to avoid "Cannot find name" error.
          '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.'),
        }
      },
      build: {
        rollupOptions: {
          // Externaliza dependências que são carregadas via CDN (importmap) para evitar erros de build
          external: ['html2canvas', 'jspdf'],
          output: {
            globals: {
              html2canvas: 'html2canvas',
              jspdf: 'jspdf'
            }
          }
        }
      }
    };
});
