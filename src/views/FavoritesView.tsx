/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Star, Trash2, ArrowUpRight, Bookmark } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { FavoriteItem, ModuleId } from '../types';

interface FavoritesViewProps {
  favorites: FavoriteItem[];
  onRemoveFavorite: (id: string) => void;
  onNavigateToItem: (moduleId: ModuleId, itemId?: string) => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  favorites,
  onRemoveFavorite,
  onNavigateToItem,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [selectedFilter, setSelectedFilter] = useState<string>('todos');

  const filterChips = [
    { id: 'todos', label: 'Todos' },
    { id: 'calculadora', label: 'Calculadoras' },
    { id: 'norma', label: 'Normas & NRs' },
    { id: 'produto', label: 'Produtos' },
    { id: 'projeto', label: 'Projetos' },
    { id: 'nota', label: 'Notas' },
  ];

  const filtered = favorites.filter(
    (item) => selectedFilter === 'todos' || item.type === selectedFilter
  );

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Seus Favoritos</h2>
          <p className="text-xs text-[#9FB0C8]">Itens marcados para acesso rápido em campo</p>
        </div>
        <span className="text-xs font-mono text-[#5B9BFF] px-2.5 py-1 rounded-full bg-[#1F66D6]/15 border border-[#1F66D6]/30">
          {favorites.length} itens
        </span>
      </div>

      {/* Filter Chips (Page 7 requirement: "Filtros em chips") */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {filterChips.map((chip) => (
          <button
            key={chip.id}
            onClick={() => setSelectedFilter(chip.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              selectedFilter === chip.id
                ? 'bg-[#1F66D6] text-white shadow-xs'
                : 'bg-[#17243A] text-[#9FB0C8] border border-[#2A3A55]'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* List or Empty State (Page 4 requirement: "Estado vazio: Texto curto e uma ação principal") */}
      {filtered.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-3">
          <Star className="w-10 h-10 text-[#5B9BFF]/40 mx-auto" />
          <h4 className="font-semibold text-white text-base">Nenhum favorito encontrado</h4>
          <p className="text-xs text-[#9FB0C8] max-w-xs mx-auto">
            Você pode salvar calculadoras, manuais, NRs ou fichas de produtos tocando no ícone de marcador.
          </p>
          <button
            onClick={() => onNavigateToItem('calculadoras')}
            className="px-4 py-2.5 rounded-xl bg-[#1F66D6] text-white text-xs font-semibold hover:bg-[#1A57B8] transition"
          >
            Explorar Calculadoras
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] flex items-center justify-between gap-3 group hover:border-[#1F66D6] transition"
            >
              <div
                onClick={() => onNavigateToItem(item.moduleId, item.id)}
                className="cursor-pointer space-y-1 min-w-0 flex-1"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B9BFF]">
                    {item.type}
                  </span>
                  <span className="text-[10px] text-[#9FB0C8]">
                    {new Date(item.addedAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-white truncate group-hover:text-[#5B9BFF] transition-colors">
                  {item.title}
                </h4>
                <p className="text-xs text-[#9FB0C8] truncate">{item.subtitle}</p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => onNavigateToItem(item.moduleId, item.id)}
                  aria-label={`Abrir ${item.title}`}
                  className="p-2 rounded-xl bg-white/5 hover:bg-[#1F66D6] text-[#9FB0C8] hover:text-white transition"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onRemoveFavorite(item.id)}
                  aria-label={`Remover ${item.title} dos favoritos`}
                  className="p-2 rounded-xl hover:bg-[#FF6B6B]/20 text-[#9FB0C8] hover:text-[#FF6B6B] transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
