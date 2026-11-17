import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(() => {
  const disableHmr =
    process.env.DISABLE_HMR === 'true' ||
    Boolean(process.env.K_SERVICE || process.env.CLOUD_RUN_JOB || process.env.AI_STUDIO);

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true as const,
      // HMR dinonaktifkan di AI Studio / Cloud Run preview agar tidak memicu error WebSocket closed without opened
      hmr: disableHmr ? false : { overlay: false },
      // Nonaktifkan file watcher saat HMR mati untuk menghemat CPU
      watch: disableHmr ? null : {},
    },
  };
});
