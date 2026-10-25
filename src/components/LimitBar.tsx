/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface LimitBarProps {
  message: string;
  className?: string;
  onLearnMore?: () => void;
}

export const LimitBar: React.FC<LimitBarProps> = ({
  message,
  className = '',
  onLearnMore,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div
      className={`w-full rounded-xl border p-2.5 sm:p-3 text-xs flex items-center justify-between gap-3 transition-colors ${
        isDark
          ? 'bg-[#17243A]/90 border-[#2A3A55] text-[#9FB0C8]'
          : 'bg-[#F0F4FA] border-[#D9E0EC] text-[#5B6B82]'
      } ${className}`}
    >
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-[#F5B93A] shrink-0" aria-hidden="true" />
        <span className="leading-snug">
          <strong className="font-semibold text-white/90 dark:text-white mr-1">Limite técnico:</strong>
          {message}
        </span>
      </div>
      {onLearnMore && (
        <button
          onClick={onLearnMore}
          className="shrink-0 text-[11px] font-medium text-[#5B9BFF] hover:underline"
        >
          Saiba mais
        </button>
      )}
    </div>
  );
};
