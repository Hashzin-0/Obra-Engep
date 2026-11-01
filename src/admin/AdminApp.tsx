import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  Activity, AlertCircle, Archive, ArrowDownToLine, BarChart3, Check, CheckCircle2,
  ChevronDown, Clock3, ExternalLink, Eye, EyeOff, LayoutDashboard, LogOut,
  MessageSquareText, Package, Plus, RefreshCw, Search, ShieldCheck, Trash2,
  Users, X
} from 'lucide-react';
import { adminAuthClient } from './adminAuth';

type Tab = 'overview' | 'feedback' | 'products';
type FeedbackStatus = 'aberto' | 'em_analise' | 'resolvido';

type AdminProfile = { id: string; display_name: string; profession: string | null; company: string | null; created_at: string };

type FeedbackItem = {
  id: string;
  user_id: string;
  message: string;
  contact_email: string | null;
  page: string | null;
  status: FeedbackStatus;
  created_at: string;
};

type CatalogProduct = {
  id: string;
  category: string;
  name: string;
  manufacturer: string;
  ph_type: string;
  target_surfaces: string[];
  dilution_ratio: string;
  dilution_number: number;
  action_time_minutes: string;
  yield_info: string;
  instructions: string;
  cautions: string[];
  source_label: string;
  source_url: string | null;
  image_url: string | null;
  verified_date: string | null;
  is_published: boolean;
  sort_order: number;
};

type DashboardStats = Record<string, number>;

const EMPTY_PRODUCT: Omit<CatalogProduct, 'id'> = {
  category: 'Geral',
  name: '',
  manufacturer: '',
  ph_type: 'Neutro',
  target_surfaces: [],
  dilution_ratio: '',
  dilution_number: 1,
  action_time_minutes: '',
  yield_info: '',
  instructions: '',
  cautions: [],
  source_label: '',
  source_url: null,
  image_url: null,
  verified_date: new Date().toISOString().slice(0, 10),
  is_published: true,
  sort_order: 0,
};

const STAT_LABELS: Array<{ key: string; label: string; icon: React.ElementType }> = [
  { key: 'registered_users', label: 'Perfis cadastrados', icon: Users },
  { key: 'projects', label: 'Projetos', icon: LayoutDashboard },
  { key: 'calculations', label: 'Cálculos salvos', icon: BarChart3 },
  { key: 'deadlines', label: 'Prazos', icon: Clock3 },
  { key: 'favorites', label: 'Favoritos', icon: Activity },
  { key: 'personal_products', label: 'Produtos pessoais', icon: Package },
  { key: 'catalog_products', label: 'Produtos no catálogo', icon: Package },
  { key: 'push_subscriptions', label: 'Dispositivos com push', icon: Activity },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function statusLabel(status: FeedbackStatus) {
  return status === 'aberto' ? 'Aberto' : status === 'em_analise' ? 'Em análise' : 'Resolvido';
}

function StatusPill({ status }: { status: FeedbackStatus }) {
  const styles = status === 'aberto'
    ? 'bg-amber-400/10 text-amber-300 border-amber-400/20'
    : status === 'em_analise'
      ? 'bg-sky-400/10 text-sky-300 border-sky-400/20'
      : 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20';
  return <span className={'inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ' + styles}>{statusLabel(status)}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-xs font-medium text-slate-300">{label}</span>{children}</label>;
}

const inputClass = 'w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-400';
const textareaClass = inputClass + ' min-h-24 resize-y';

async function adminApi<T>(url: string, body?: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: body ? 'POST' : 'GET',
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.error === 'string' ? payload.error : 'Falha na comunicação administrativa.');
  }
  return payload as T;
}


export default function AdminApp() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<DashboardStats>({});
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [recentUsers, setRecentUsers] = useState<AdminProfile[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [feedbackFilter, setFeedbackFilter] = useState<'todos' | FeedbackStatus>('todos');
  const [feedbackSearch, setFeedbackSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        const cookieSession = await fetch('/api/admin/session', { credentials: 'same-origin' });
        if (cookieSession.ok) {
          const payload = await cookieSession.json();
          if (active) setUser(payload.user as User);
          return;
        }
        if (!adminAuthClient) {
          if (active) setError('O serviço de autenticação não está configurado.');
          return;
        }
        const { data: { session } } = await adminAuthClient.auth.getSession();
        if (!session?.access_token) return;
        let exchange: Response | null = null;
        let payload: Record<string, unknown> = {};
        try {
          exchange = await fetch('/api/admin/session', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          payload = await exchange.json().catch(() => ({}));
        } finally {
          await adminAuthClient.auth.signOut({ scope: 'local' });
        }
        if (!exchange) throw new Error('Não foi possível trocar a sessão administrativa.');
        if (!exchange.ok) {
          if (active) setError(typeof payload.error === 'string' ? payload.error : 'Esta conta não possui autorização administrativa.');
          return;
        }
        if (active) setUser(payload.user as User);
      } catch {
        if (active) setError('Não foi possível validar a sessão administrativa.');
      } finally {
        if (active) setAuthLoading(false);
      }
    };
    void initialize();
    return () => { active = false; };
  }, []);

  const isAdmin = user?.app_metadata?.is_admin === true;

  const loadAdminData = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    try {
      const [statsResult, feedbackResult, productResult, usersResult] = await Promise.all([
        adminApi<{ data: DashboardStats }>('/api/admin/data?resource=stats'),
        adminApi<{ data: FeedbackItem[] }>('/api/admin/data?resource=feedback'),
        adminApi<{ data: CatalogProduct[] }>('/api/admin/data?resource=products'),
        adminApi<{ data: AdminProfile[] }>('/api/admin/data?resource=users'),
      ]);
      setStats(statsResult.data ?? {});
      setFeedbacks(feedbackResult.data ?? []);
      setProducts(productResult.data ?? []);
      setRecentUsers(usersResult.data ?? []);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Não foi possível carregar os dados administrativos.';
      setError(message);
      if (message.toLowerCase().includes('sessão')) setUser(null);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) void loadAdminData();
  }, [isAdmin, loadAdminData]);

  const filteredFeedbacks = useMemo(() => feedbacks.filter((item) => {
    const matchesStatus = feedbackFilter === 'todos' || item.status === feedbackFilter;
    const term = feedbackSearch.trim().toLowerCase();
    const matchesSearch = !term || [item.message, item.contact_email ?? '', item.page ?? '', item.user_id].some((value) => value.toLowerCase().includes(term));
    return matchesStatus && matchesSearch;
  }), [feedbacks, feedbackFilter, feedbackSearch]);

  const filteredProducts = useMemo(() => products.filter((item) =>
    [item.name, item.manufacturer, item.category].some((value) => value.toLowerCase().includes(productSearch.toLowerCase()))
  ), [products, productSearch]);

  const signIn = async () => {
    if (!adminAuthClient) {
      setError('O serviço de autenticação não está configurado.');
      return;
    }
    setError('');
    const { error: signInError } = await adminAuthClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname, queryParams: { prompt: 'select_account' } },
    });
    if (signInError) setError(signInError.message);
  };

  const signOut = async () => {
    try {
      await fetch('/api/admin/session', { method: 'DELETE', credentials: 'same-origin' });
      await adminAuthClient?.auth.signOut({ scope: 'local' });
    } finally {
      setUser(null);
    }
  };

  const updateFeedbackStatus = async (id: string, status: FeedbackStatus) => {
    try {
      await adminApi('/api/admin/data', { action: 'update_feedback', id, status });
      setFeedbacks((current) => current.map((item) => item.id === id ? { ...item, status } : item));
      setNotice('Status do feedback atualizado.');
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Não foi possível atualizar o feedback.');
    }
  };

  const deleteFeedback = async (item: FeedbackItem) => {
    if (!window.confirm('Excluir permanentemente este feedback?')) return;
    try {
      await adminApi('/api/admin/data', { action: 'delete_feedback', id: item.id });
      setFeedbacks((current) => current.filter((entry) => entry.id !== item.id));
      setNotice('Feedback excluído.');
      void loadAdminData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Não foi possível excluir o feedback.');
    }
  };

  const saveProduct = async (form: Omit<CatalogProduct, 'id'> & { id?: string }) => {
    setError('');
    const payload = {
      ...form,
      name: form.name.trim(),
      category: form.category.trim() || 'Geral',
      manufacturer: form.manufacturer.trim(),
      source_label: form.source_label.trim(),
      source_url: form.source_url?.trim() || null,
      image_url: form.image_url?.trim() || null,
    };
    try {
      await adminApi('/api/admin/data', { action: 'save_product', product: payload });
      setShowProductForm(false);
      setEditingProduct(null);
      setNotice('Produto salvo no catálogo.');
      await loadAdminData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar o produto.');
    }
  };

  const deleteProduct = async (item: CatalogProduct) => {
    if (!window.confirm('Excluir permanentemente ' + item.name + ' do catálogo?')) return;
    try {
      await adminApi('/api/admin/data', { action: 'delete_product', id: item.id });
      setNotice('Produto excluído.');
      await loadAdminData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Não foi possível excluir o produto.');
    }
  };

  const togglePublished = async (item: CatalogProduct) => {
    try {
      await adminApi('/api/admin/data', { action: 'toggle_published', id: item.id, is_published: !item.is_published });
      await loadAdminData();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Não foi possível alterar a publicação.');
    }
  };

  if (authLoading) {
    return <div className="min-h-screen grid place-items-center bg-[#101827] text-slate-300"><RefreshCw className="h-5 w-5 animate-spin" /></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#101827] px-4 py-12 text-slate-100 grid place-items-center">
        <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-[#17243A] p-7 shadow-2xl">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300"><ShieldCheck /></div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">Área restrita</p>
          <h1 className="mt-2 text-2xl font-bold">Administração</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Entre com a conta Google autorizada para acessar os dados administrativos.</p>
          {error && <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
          <button onClick={() => void signIn()} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500">
            Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#101827] px-4 py-12 text-slate-100 grid place-items-center">
        <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-[#17243A] p-7 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-amber-300" />
          <h1 className="mt-4 text-xl font-bold">Acesso não autorizado</h1>
          <p className="mt-2 text-sm text-slate-400">Esta conta não possui permissões administrativas.</p>
          <button onClick={() => void signOut()} className="mt-5 rounded-xl border border-slate-600 px-4 py-2 text-sm">Sair da conta</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#101827] text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#101827]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300"><ShieldCheck /></div>
            <div><p className="text-sm font-bold">OBra ENGEP</p><p className="text-[11px] text-slate-500">Painel administrativo</p></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-slate-400 sm:block">{user.email}</span>
            <button onClick={() => void loadAdminData()} disabled={loading} title="Atualizar dados" className="rounded-xl border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 disabled:opacity-50"><RefreshCw className={'h-4 w-4 ' + (loading ? 'animate-spin' : '')} /></button>
            <button onClick={() => void signOut()} title="Sair" className="rounded-xl border border-slate-700 p-2 text-slate-300 hover:bg-slate-800"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">Visão administrativa</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">Central de controle</h1><p className="mt-1 text-sm text-slate-400">Indicadores operacionais, atendimento e catálogo de produtos.</p></div>
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300">Sessão administrativa ativa</span>
        </div>

        <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-800 bg-[#17243A] p-1.5">
          {([
            ['overview', 'Visão geral', LayoutDashboard],
            ['feedback', 'Feedbacks', MessageSquareText],
            ['products', 'Produtos automotivos', Package],
          ] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)} className={'flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ' + (tab === id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white')}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </nav>

        {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
        {notice && <div role="status" className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Fechar aviso"><X className="h-4 w-4" /></button></div>}

        {tab === 'overview' && (
          <section className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {STAT_LABELS.map(({ key, label, icon: Icon }) => (
                <div key={key} className="rounded-2xl border border-slate-800 bg-[#17243A] p-4">
                  <div className="flex items-center justify-between gap-2"><span className="text-xs text-slate-400">{label}</span><Icon className="h-4 w-4 text-blue-300" /></div>
                  <p className="mt-3 text-2xl font-bold tabular-nums">{stats[key] ?? '—'}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-[#17243A] p-5 lg:col-span-2">
                <div className="flex items-center justify-between"><h2 className="font-bold">Atendimento</h2><button onClick={() => setTab('feedback')} className="text-xs text-blue-300 hover:text-blue-200">Ver feedbacks</button></div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-slate-950/50 p-3"><p className="text-[11px] text-slate-500">Abertos</p><p className="mt-1 text-xl font-bold text-amber-300">{stats.feedback_open ?? 0}</p></div>
                  <div className="rounded-xl bg-slate-950/50 p-3"><p className="text-[11px] text-slate-500">Em análise</p><p className="mt-1 text-xl font-bold text-sky-300">{stats.feedback_review ?? 0}</p></div>
                  <div className="rounded-xl bg-slate-950/50 p-3"><p className="text-[11px] text-slate-500">Resolvidos</p><p className="mt-1 text-xl font-bold text-emerald-300">{stats.feedback_resolved ?? 0}</p></div>
                </div>
                <div className="mt-4 space-y-2">
                  {feedbacks.slice(0, 4).map((item) => <div key={item.id} className="flex items-start justify-between gap-3 border-t border-slate-800 pt-3"><div className="min-w-0"><p className="truncate text-sm text-slate-200">{item.message}</p><p className="mt-1 text-[11px] text-slate-500">{formatDate(item.created_at)}</p></div><StatusPill status={item.status} /></div>)}
                  {feedbacks.length === 0 && <p className="py-5 text-center text-sm text-slate-500">Nenhum feedback recebido ainda.</p>}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#17243A] p-5">
                <h2 className="font-bold">Conteúdo publicado</h2>
                <div className="mt-4 space-y-4">
                  <div><div className="flex justify-between text-xs"><span className="text-slate-400">Produtos publicados</span><span>{stats.published_products ?? 0}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-emerald-400" style={{ width: (stats.catalog_products ? Math.min(100, (stats.published_products / stats.catalog_products) * 100) : 0) + '%' }} /></div></div>
                  <div className="flex items-center justify-between text-xs"><span className="text-slate-400">Atualizações do app</span><span className="font-semibold">{stats.app_updates ?? 0}</span></div>
                  <div className="flex items-center justify-between text-xs"><span className="text-slate-400">Total de feedbacks</span><span className="font-semibold">{stats.feedback_total ?? 0}</span></div>
                  <button onClick={() => setTab('products')} className="w-full rounded-xl border border-slate-700 px-3 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800">Gerenciar catálogo</button>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-[#17243A] p-5">
              <div className="flex items-center justify-between gap-3"><h2 className="font-bold">Usuários recentes</h2><span className="text-[11px] text-slate-500">Últimos 12 perfis</span></div>
              <div className="mt-3 divide-y divide-slate-800">
                {recentUsers.map((profile) => <div key={profile.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><div><p className="text-sm font-semibold text-slate-200">{profile.display_name || 'Usuário'}</p><p className="text-[11px] text-slate-500">{[profile.profession, profile.company].filter(Boolean).join(' · ') || 'Perfil sem detalhes adicionais'}</p></div><span className="text-[11px] text-slate-500">{new Date(profile.created_at).toLocaleDateString('pt-BR')}</span></div>)}
                {recentUsers.length === 0 && <p className="py-5 text-sm text-slate-500">Nenhum perfil encontrado.</p>}
              </div>
            </div>
          </section>
        )}

        {tab === 'feedback' && (
          <section className="space-y-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div><h2 className="text-xl font-bold">Feedbacks dos usuários</h2><p className="mt-1 text-xs text-slate-400">{filteredFeedbacks.length} registros encontrados · até 250 mais recentes</p></div>
              <div className="flex flex-wrap gap-2">
                <div className="relative min-w-48 flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" /><input value={feedbackSearch} onChange={(event) => setFeedbackSearch(event.target.value)} placeholder="Buscar mensagem ou e-mail" className={inputClass + ' pl-9'} /></div>
                <select value={feedbackFilter} onChange={(event) => setFeedbackFilter(event.target.value as typeof feedbackFilter)} className={inputClass + ' sm:w-40'}><option value="todos">Todos os status</option><option value="aberto">Abertos</option><option value="em_analise">Em análise</option><option value="resolvido">Resolvidos</option></select>
              </div>
            </div>
            <div className="space-y-3">
              {filteredFeedbacks.map((item) => (
                <article key={item.id} className="rounded-2xl border border-slate-800 bg-[#17243A] p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-100">{item.message}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500"><span>{formatDate(item.created_at)}</span>{item.contact_email && <a className="text-blue-300 hover:underline" href={'mailto:' + item.contact_email}>{item.contact_email}</a>}{item.page && <span>Página: {item.page}</span>}<span>ID: {item.user_id.slice(0, 8)}…</span></div></div><StatusPill status={item.status} /></div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3"><label className="flex items-center gap-2 text-xs text-slate-400">Status <select value={item.status} onChange={(event) => void updateFeedbackStatus(item.id, event.target.value as FeedbackStatus)} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"><option value="aberto">Aberto</option><option value="em_analise">Em análise</option><option value="resolvido">Resolvido</option></select></label><button onClick={() => void deleteFeedback(item)} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" />Excluir</button></div>
                </article>
              ))}
              {filteredFeedbacks.length === 0 && <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-500">Nenhum feedback corresponde ao filtro.</div>}
            </div>
          </section>
        )}

        {tab === 'products' && (
          <section className="space-y-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div><h2 className="text-xl font-bold">Catálogo automotivo</h2><p className="mt-1 text-xs text-slate-400">Produtos cadastrados aqui podem ser exibidos a todos os usuários quando publicados.</p></div>
              <button onClick={() => { setEditingProduct(null); setShowProductForm(true); }} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500"><Plus className="h-4 w-4" />Cadastrar produto</button>
            </div>
            <div className="relative max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" /><input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Buscar por nome, fabricante ou categoria" className={inputClass + ' pl-9'} /></div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((item) => (
                <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-[#17243A]">
                  {item.image_url && <img src={item.image_url} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-36 w-full bg-slate-950 object-contain" />}
                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wider text-blue-300">{item.category}</p><h3 className="mt-1 truncate font-bold">{item.name}</h3><p className="text-xs text-slate-400">{item.manufacturer || 'Fabricante não informado'}</p></div><span className={'rounded-full px-2 py-1 text-[10px] font-semibold ' + (item.is_published ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-700 text-slate-300')}>{item.is_published ? 'Publicado' : 'Rascunho'}</span></div>
                    <p className="line-clamp-3 text-xs leading-5 text-slate-300">{item.instructions || 'Sem instruções cadastradas.'}</p>
                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-400"><span>pH: {item.ph_type}</span><span>·</span><span>Diluição: {item.dilution_ratio || '—'}</span></div>
                    <div className="flex items-center justify-between border-t border-slate-800 pt-3"><button onClick={() => void togglePublished(item)} className="text-xs text-blue-300 hover:underline">{item.is_published ? 'Despublicar' : 'Publicar'}</button><div className="flex gap-1"><button onClick={() => { setEditingProduct(item); setShowProductForm(true); }} aria-label="Editar" className="rounded-lg p-2 text-slate-300 hover:bg-slate-700"><Eye className="h-4 w-4" /></button><button onClick={() => void deleteProduct(item)} aria-label="Excluir" className="rounded-lg p-2 text-red-300 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button></div></div>
                    {item.source_url && <a href={item.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-blue-300 hover:underline">Fonte do produto <ExternalLink className="h-3 w-3" /></a>}
                  </div>
                </article>
              ))}
            </div>
            {filteredProducts.length === 0 && <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-500">Nenhum produto cadastrado.</div>}
          </section>
        )}
      </main>

      {showProductForm && <ProductEditor initial={editingProduct} onClose={() => setShowProductForm(false)} onSave={(value) => void saveProduct(value)} />}
    </div>
  );
}

function ProductEditor({ initial, onClose, onSave }: {
  initial: CatalogProduct | null;
  onClose: () => void;
  onSave: (value: Omit<CatalogProduct, 'id'> & { id?: string }) => void;
}) {
  const [form, setForm] = useState(() => initial ? { ...initial } : { ...EMPTY_PRODUCT });
  const [surfaces, setSurfaces] = useState((initial?.target_surfaces ?? []).join(', '));
  const [cautions, setCautions] = useState((initial?.cautions ?? []).join('\n'));
  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    if (form.source_url && !/^https:\/\//i.test(form.source_url)) return;
    if (form.image_url && !/^https:\/\//i.test(form.image_url)) return;
    onSave({
      ...form,
      id: initial?.id,
      target_surfaces: surfaces.split(',').map((item) => item.trim()).filter(Boolean),
      cautions: cautions.split('\n').map((item) => item.trim()).filter(Boolean),
      dilution_number: Number(form.dilution_number) || 1,
      verified_date: form.verified_date || null,
    });
  };
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-3 sm:p-6">
      <div className="mx-auto my-4 max-w-3xl rounded-2xl border border-slate-700 bg-[#17243A] shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4"><div><h2 className="font-bold">{initial ? 'Editar produto' : 'Novo produto'}</h2><p className="text-xs text-slate-400">Dados técnicos e fonte de referência</p></div><button onClick={onClose} aria-label="Fechar" className="rounded-lg p-2 hover:bg-slate-800"><X className="h-4 w-4" /></button></div>
        <form onSubmit={submit} className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome do produto"><input required maxLength={180} value={form.name} onChange={(e) => update('name', e.target.value)} className={inputClass} /></Field>
            <Field label="Fabricante"><input value={form.manufacturer} onChange={(e) => update('manufacturer', e.target.value)} className={inputClass} /></Field>
            <Field label="Categoria"><input maxLength={80} value={form.category} onChange={(e) => update('category', e.target.value)} className={inputClass} placeholder="APC, shampoo, descontaminante..." /></Field>
            <Field label="Classificação de pH"><select value={form.ph_type} onChange={(e) => update('ph_type', e.target.value)} className={inputClass}><option>Neutro</option><option>Ácido</option><option>Alcalino</option><option>Não informado</option></select></Field>
            <Field label="Superfícies (separadas por vírgula)"><input value={surfaces} onChange={(e) => setSurfaces(e.target.value)} className={inputClass} placeholder="Plástico, tecido, pintura..." /></Field>
            <Field label="Diluição conforme rótulo"><input value={form.dilution_ratio} onChange={(e) => update('dilution_ratio', e.target.value)} className={inputClass} placeholder="1:10, pronto uso..." /></Field>
            <Field label="Fator numérico da diluição"><input type="number" min="0.01" step="0.01" value={form.dilution_number} onChange={(e) => update('dilution_number', Number(e.target.value))} className={inputClass} /></Field>
            <Field label="Tempo de ação"><input value={form.action_time_minutes} onChange={(e) => update('action_time_minutes', e.target.value)} className={inputClass} placeholder="2–5 minutos" /></Field>
            <Field label="Rendimento"><input value={form.yield_info} onChange={(e) => update('yield_info', e.target.value)} className={inputClass} /></Field>
            <Field label="Data de verificação"><input type="date" value={form.verified_date ?? ''} onChange={(e) => update('verified_date', e.target.value || null)} className={inputClass} /></Field>
            <Field label="URL da fonte (HTTPS)"><input type="url" value={form.source_url ?? ''} onChange={(e) => update('source_url', e.target.value || null)} className={inputClass} placeholder="https://" /></Field>
            <Field label="URL da imagem (HTTPS)"><input type="url" value={form.image_url ?? ''} onChange={(e) => update('image_url', e.target.value || null)} className={inputClass} placeholder="https://" /></Field>
          </div>
          <Field label="Instruções de uso"><textarea value={form.instructions} onChange={(e) => update('instructions', e.target.value)} className={textareaClass} /></Field>
          <Field label="Cautelas (uma por linha)"><textarea value={cautions} onChange={(e) => setCautions(e.target.value)} className={textareaClass} /></Field>
          <Field label="Fonte / identificação do rótulo ou FISPQ"><input value={form.source_label} onChange={(e) => update('source_label', e.target.value)} className={inputClass} /></Field>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
            <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={form.is_published} onChange={(e) => update('is_published', e.target.checked)} /> Publicar para os usuários</label>
            <div className="flex gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm">Cancelar</button><button type="submit" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500">Salvar produto</button></div>
          </div>
        </form>
      </div>
    </div>
  );
}
