import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

const projectRoot = process.cwd();

export default defineConfig(() => {
  return {
    root: projectRoot,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'apple-touch-icon.png', 'icon.svg', 'push-sw.js'],
        workbox: {
          importScripts: ['push-sw.js'],
          globIgnores: ['bd710978848ee759c9b7f24858aac90607361e767bda6c33.html', 'assets/bd710978848ee759c9b7f24858aac90607361e767bda6c33-*.js', 'assets/bd710978848ee759c9b7f24858aac90607361e767bda6c33-*.css'],
          navigateFallbackDenylist: [/^\/[a-f0-9]{128}$/],
        },
        manifest: {
          id: '/',
          name: 'OBra ENGEP',
          short_name: 'OBra ENGEP',
          description: 'Manual técnico inteligente para obras, instalações, segurança e estética automotiva.',
          theme_color: '#F5F2EC',
          background_color: '#F5F2EC',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    build: {
      rolldownOptions: {
        input: {
          app: path.resolve(projectRoot, 'index.html'),
          bd710978848ee7599c9b7f24858aac90607361e767bda6c33: path.resolve(projectRoot, 'bd710978848ee7599c9b7f24858aac90607361e767bda6c33.html'),
        },
      },
    },
    resolve: {
      alias: {
        '@': projectRoot,
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
