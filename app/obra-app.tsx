'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';

const ObraApp = dynamic(() => import('../src/App'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center text-sm text-slate-400" role="status">
      Carregando aplicação...
    </div>
  ),
});

export default function ObraAppClient() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error: unknown) => {
      console.error('[PWA] Falha ao registrar o service worker:', error instanceof Error ? error.name : 'unknown');
    });
  }, []);
  return <ObraApp />;
}
