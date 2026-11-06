import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'OBra ENGEP',
    short_name: 'OBra ENGEP',
    description: 'Manual técnico inteligente para obras, instalações, segurança e estética automotiva.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#F5F2EC',
    theme_color: '#F5F2EC',
    icons: [
      { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
