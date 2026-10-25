/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-96 z-40 flex items-center justify-between gap-3 rounded-2xl bg-[#3A2E10] border border-[#F5B93A]/50 px-4 py-3 text-xs font-medium text-[#F5B93A] shadow-xl animate-fade-in"
    >
      <div className="flex items-center gap-2.5">
        <WifiOff className="w-4 h-4 shrink-0 text-[#F5B93A]" />
        <div>
          <span className="font-semibold block text-white">Modo Offline Ativo</span>
          <span>Calculadoras, caderno e consultas em cache permanecem disponíveis.</span>
        </div>
      </div>
      <span className="shrink-0 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#F5B93A]/20 border border-[#F5B93A]/40">
        Local
      </span>
    </div>
  );
};
