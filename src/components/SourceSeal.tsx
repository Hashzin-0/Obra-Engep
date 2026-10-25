/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckCircle2, FileText, UserCheck, ExternalLink } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface SourceSealProps {
  type: 'Oficial' | 'Resumo' | 'Pessoal';
  date: string;
  officialUrl?: string;
  className?: string;
}

export const SourceSeal: React.FC<SourceSealProps> = ({
  type,
  date,
  officialUrl,
  className = '',
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  let colors = '';
  let Icon = CheckCircle2;

  if (type === 'Oficial') {
    Icon = CheckCircle2;
    colors = isDark
      ? 'bg-[#12301F] text-[#3DD68C] border-[#1f4830]'
      : 'bg-[#E3F7EC] text-[#12703F] border-[#b4e6c9]';
  } else if (type === 'Resumo') {
    Icon = FileText;
    colors = isDark
      ? 'bg-[#17243A] text-[#5B9BFF] border-[#2A3A55]'
      : 'bg-[#EAF1FD] text-[#1A5CC8] border-[#c2d7f8]';
  } else {
    Icon = UserCheck;
    colors = isDark
      ? 'bg-[#202C40] text-[#9FB0C8] border-[#2A3A55]'
      : 'bg-[#F0F4FA] text-[#5B6B82] border-[#D9E0EC]';
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colors} ${className}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>Fonte {type} · verif. {date}</span>
      {officialUrl && (
        <a
          href={officialUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Abrir fonte oficial externa de ${type}`}
          className="ml-1 opacity-70 hover:opacity-100 transition inline-flex items-center"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
};
