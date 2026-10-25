import React, { useEffect, useMemo, useState } from 'react';
import { Box, Cuboid, Plus, Search, X } from 'lucide-react';
import { FURNITURE_CATALOG, FURNITURE_CATEGORIES, type FurnitureCatalogItem } from '../data/furnitureCatalog';

interface Props { onAdd: (item: FurnitureCatalogItem) => void; onClose: () => void; }
const MODEL_VIEWER_SCRIPT = 'https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js';

export const FurnitureCatalog: React.FC<Props> = ({ onAdd, onClose }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todos');
  const [mode, setMode] = useState<'2d' | '3d'>('2d');

  useEffect(() => {
    if (document.querySelector(`script[src="${MODEL_VIEWER_SCRIPT}"]`)) return;
    const script = document.createElement('script');
    script.type = 'module';
    script.src = MODEL_VIEWER_SCRIPT;
    document.head.appendChild(script);
  }, []);

  const items = useMemo(() => FURNITURE_CATALOG.filter(item => {
    const matchesQuery = `${item.name} ${item.category} ${item.id}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'));
    return matchesQuery && (category === 'Todos' || item.category === category) && (mode === '2d' || Boolean(item.modelUrl));
  }), [query, category, mode]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label="Catálogo de objetos 2D e 3D">
      <section className="flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl border border-[#2A3A55] bg-[#101827] text-white shadow-2xl sm:rounded-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-[#2A3A55] px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl bg-blue-500/15 p-2 text-blue-300"><Cuboid className="h-5 w-5" /></div>
            <div className="min-w-0"><h2 className="text-base font-bold sm:text-lg">Biblioteca de objetos</h2><p className="text-xs text-slate-400">96 símbolos arquitetônicos · 32 modelos 3D vinculados a assets reais</p></div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Fechar catálogo"><X className="h-5 w-5" /></button>
        </header>
        <div className="grid gap-3 border-b border-[#2A3A55] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-4">
          <label className="flex min-w-0 items-center gap-2 rounded-xl border border-[#2A3A55] bg-[#17243A] px-3"><Search className="h-4 w-4 shrink-0 text-slate-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar sofá, cama, pia, armário..." className="min-h-11 w-full bg-transparent text-sm outline-none placeholder:text-slate-500" aria-label="Buscar objetos" /></label>
          <div className="flex rounded-xl border border-[#2A3A55] bg-[#17243A] p-1" role="tablist" aria-label="Tipo de visualização">
            <button type="button" onClick={() => setMode('2d')} className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm ${mode === '2d' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}><Box className="h-4 w-4" /> Planta 2D</button>
            <button type="button" onClick={() => setMode('3d')} className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm ${mode === '3d' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}><Cuboid className="h-4 w-4" /> Modelos 3D</button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 sm:col-span-2">{['Todos', ...FURNITURE_CATEGORIES].map(value => <button key={value} type="button" onClick={() => setCategory(value)} className={`min-h-9 shrink-0 rounded-full border px-3 text-xs font-medium ${category === value ? 'border-blue-500 bg-blue-500/15 text-blue-200' : 'border-[#2A3A55] text-slate-400 hover:text-white'}`}>{value}</button>)}</div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          {items.length === 0 ? <div className="grid min-h-48 place-items-center text-center text-sm text-slate-400">Nenhum objeto encontrado com esses filtros.</div> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {items.map(item => <article key={item.id} className="group overflow-hidden rounded-xl border border-[#2A3A55] bg-[#17243A] transition hover:border-blue-500/70">
              {mode === '2d' ? <div className="grid h-32 place-items-center bg-[#f8fafc] p-3"><img src={item.symbolUrl} alt={`Símbolo 2D de ${item.name}`} loading="lazy" className="h-full w-full object-contain" /></div> : <div className="h-36 bg-[#f8fafc]">{React.createElement('model-viewer' as any, { src:item.modelUrl, poster:item.thumbnailUrl ?? undefined, alt:`Modelo 3D de ${item.name}`, 'camera-controls':true, 'auto-rotate':true, 'rotation-per-second':'18deg', 'shadow-intensity':'0.7', exposure:'1', 'interaction-prompt':'none', style:{width:'100%',height:'100%',backgroundColor:'#f8fafc'} })}</div>}
              <div className="space-y-2 p-3"><div className="min-h-10"><h3 className="line-clamp-2 text-sm font-semibold">{item.name}</h3><p className="mt-0.5 text-[11px] text-slate-400">{item.category}</p></div>
                <p className="text-[11px] tabular-nums text-slate-400">{(item.widthIn * 0.0254).toFixed(2)} × {(item.depthIn * 0.0254).toFixed(2)} m</p>
                <button type="button" onClick={() => onAdd(item)} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-2 text-xs font-semibold text-white transition hover:bg-blue-500 active:scale-[.98]"><Plus className="h-4 w-4" /> Inserir na planta</button>
                <p className="text-[10px] leading-4 text-slate-500">{mode === '2d' ? 'Símbolo CC0 · FloorPlanner' : 'Modelo CC0 · Kenney Furniture Kit'}</p>
              </div>
            </article>)}
          </div>}
        </div>
        <footer className="border-t border-[#2A3A55] px-4 py-2 text-[10px] leading-4 text-slate-500">Fontes externas: <a className="underline hover:text-slate-300" href="https://github.com/pjm4github/FloorPlanner" target="_blank" rel="noreferrer">símbolos 2D CC0</a> e <a className="underline hover:text-slate-300" href="https://kenney.nl/assets/furniture-kit" target="_blank" rel="noreferrer">modelos Kenney CC0</a> via espelho público. Os modelos são carregados sob demanda pela internet.</footer>
      </section>
    </div>
  );
};
