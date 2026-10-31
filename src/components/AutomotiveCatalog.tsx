import React, { useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, Package, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

type PublicCatalogProduct = {
  id: string;
  category: string;
  name: string;
  manufacturer: string;
  ph_type: string;
  target_surfaces: string[];
  dilution_ratio: string;
  action_time_minutes: string;
  yield_info: string;
  instructions: string;
  cautions: string[];
  source_label: string;
  source_url: string | null;
  image_url: string | null;
  verified_date: string | null;
};

export const AutomotiveCatalog: React.FC = () => {
  const [items, setItems] = useState<PublicCatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) {
      setError('Catálogo indisponível no momento.');
      setLoading(false);
      return;
    }
    let active = true;
    void supabase.from('automotive_catalog')
      .select('id,category,name,manufacturer,ph_type,target_surfaces,dilution_ratio,action_time_minutes,yield_info,instructions,cautions,source_label,source_url,image_url,verified_date')
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) setError('Não foi possível carregar o catálogo.');
        else setItems((data ?? []) as PublicCatalogProduct[]);
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (loading) return <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#2A3A55] bg-[#17243A] p-8 text-sm text-[#9FB0C8]"><RefreshCw className="h-4 w-4 animate-spin" />Carregando catálogo...</div>;
  if (error) return <div role="alert" className="rounded-2xl border border-[#F87171]/30 bg-[#3A1717]/30 p-4 text-sm text-[#FCA5A5]">{error}</div>;
  if (!items.length) return <div className="rounded-2xl border border-dashed border-[#2A3A55] bg-[#17243A] p-8 text-center"><Package className="mx-auto h-8 w-8 text-[#5B9BFF]" /><h3 className="mt-2 text-sm font-semibold text-white">Catálogo em atualização</h3><p className="mt-1 text-xs text-[#9FB0C8]">Os produtos recomendados serão exibidos aqui quando forem publicados.</p></div>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#9FB0C8]">Produtos selecionados pela administração. Consulte sempre o rótulo e a FISPQ/FDS antes do uso.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <article key={item.id} className="overflow-hidden rounded-2xl border border-[#2A3A55] bg-[#17243A]">
            {item.image_url && <img src={item.image_url} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-36 w-full bg-black/20 object-contain" />}
            <div className="space-y-2.5 p-4">
              <div><span className="text-[10px] font-bold uppercase tracking-wider text-[#5B9BFF]">{item.category}</span><h3 className="mt-1 font-bold text-white">{item.name}</h3><p className="text-xs text-[#9FB0C8]">{item.manufacturer || 'Fabricante não informado'}</p></div>
              <div className="flex flex-wrap gap-2 text-[11px] text-[#9FB0C8]"><span>pH {item.ph_type}</span><span>·</span><span>Diluição {item.dilution_ratio || 'conforme rótulo'}</span><span>·</span><span>{item.action_time_minutes || 'Tempo conforme rótulo'}</span></div>
              {item.target_surfaces.length > 0 && <p className="text-xs text-[#E8EDF5]"><strong>Superfícies:</strong> {item.target_surfaces.join(', ')}</p>}
              {item.instructions && <p className="whitespace-pre-wrap text-xs leading-5 text-[#E8EDF5]">{item.instructions}</p>}
              {item.cautions.length > 0 && <div className="rounded-xl border border-[#F5B93A]/20 bg-[#3A2E10]/30 p-3 text-xs text-[#F5B93A]"><p className="mb-1 flex items-center gap-1.5 font-semibold"><AlertTriangle className="h-3.5 w-3.5" />Cautelas</p><ul className="list-disc space-y-1 pl-4">{item.cautions.map((caution, index) => <li key={index}>{caution}</li>)}</ul></div>}
              {item.source_label && <p className="text-[11px] text-[#6B7F9E]">Fonte: {item.source_label}</p>}
              {item.source_url && <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[#5B9BFF] hover:underline">Consultar fonte <ExternalLink className="h-3 w-3" /></a>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
