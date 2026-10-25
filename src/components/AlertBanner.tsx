/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Info, AlertTriangle, AlertOctagon } from 'lucide-react';
import { AlertLevel } from '../types';
import { useTheme } from '../context/ThemeContext';

interface AlertBannerProps {
  level: AlertLevel;
  title?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  level,
  title,
  children,
  className = '',
  action,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const config = {
    info: {
      label: 'Informação',
      defaultTitle: 'Dica ou contexto',
      Icon: Info,
      containerClasses: isDark
        ? 'bg-[#17243A] text-[#5B9BFF] border-[#2A3A55]'
        : 'bg-[#EAF1FD] text-[#1A5CC8] border-[#CBDCF8]',
      badgeClasses: isDark
        ? 'bg-[#1F66D6]/20 text-[#5B9BFF] border-[#1F66D6]/40'
        : 'bg-[#1F66D6]/15 text-[#1A5CC8] border-[#1F66D6]/30',
    },
    warning: {
      label: 'Atenção',
      defaultTitle: 'Cautela antes de agir',
      Icon: AlertTriangle,
      containerClasses: isDark
        ? 'bg-[#3A2E10] text-[#F5B93A] border-[#5B481A]'
        : 'bg-[#FFF4D6] text-[#8A5A00] border-[#F5D77F]',
      badgeClasses: isDark
        ? 'bg-[#F5B93A]/20 text-[#F5B93A] border-[#F5B93A]/40'
        : 'bg-[#8A5A00]/15 text-[#8A5A00] border-[#8A5A00]/30',
    },
    danger: {
      label: 'Perigo',
      defaultTitle: 'Risco ou bloqueio',
      Icon: AlertOctagon,
      containerClasses: isDark
        ? 'bg-[#3B1A1C] text-[#FF6B6B] border-[#662B2F]'
        : 'bg-[#FDE8E6] text-[#B42318] border-[#F8B4B4]',
      badgeClasses: isDark
        ? 'bg-[#FF6B6B]/20 text-[#FF6B6B] border-[#FF6B6B]/40'
        : 'bg-[#B42318]/15 text-[#B42318] border-[#B42318]/30',
    },
  }[level];

  const Icon = config.Icon;

  return (
    <div
      role="alert"
      className={`rounded-2xl border p-3.5 sm:p-4 text-xs sm:text-sm flex flex-col gap-2 transition-all ${config.containerClasses} ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold">
          <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className={`text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${config.badgeClasses}`}>
            {config.label}
          </span>
          <span className="font-medium text-xs opacity-90">
            {title || config.defaultTitle}
          </span>
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="text-xs sm:text-[13px] leading-relaxed opacity-95 pl-6">
        {children}
      </div>
    </div>
  );
};
