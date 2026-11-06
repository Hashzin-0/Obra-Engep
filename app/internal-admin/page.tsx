'use client';

import dynamic from 'next/dynamic';

const AdminApp = dynamic(() => import('../../src/admin/AdminApp'), {
  ssr: false,
  loading: () => (
    <main className="flex min-h-screen items-center justify-center bg-[#101827] text-sm text-slate-300" role="status">
      Carregando painel...
    </main>
  ),
});

export default function InternalAdminPage() {
  return <AdminApp />;
}
