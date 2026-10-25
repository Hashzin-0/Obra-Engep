/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        aria-label="Instalar aplicativo OBra ENGEP"
        className={`flex items-center gap-1.5 font-medium transition active:scale-95 text-white bg-[#1F66D6] hover:bg-[#1A57B8] ${
          compact
            ? 'px-2.5 py-1.5 text-xs rounded-xl shadow-sm'
            : 'px-4 py-2.5 text-sm rounded-xl shadow-sm'
        }`}
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>Instalar App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          aria-label="Como instalar no iOS"
          className={`flex items-center gap-1.5 font-medium border transition active:scale-95 ${
            compact
              ? 'px-2.5 py-1.5 text-xs rounded-xl border-[#6B7F9E]/40 text-[#5B9BFF] hover:bg-[#1F66D6]/10'
              : 'px-3.5 py-2 text-xs rounded-xl border-[#6B7F9E]/40 text-[#5B9BFF] hover:bg-[#1F66D6]/10'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5 shrink-0" />
          <span>Instalar no iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#17243A] border border-[#2A3A55] p-5 shadow-2xl text-[#E8EDF5]">
              <div className="flex items-center justify-between pb-3 border-b border-[#2A3A55]">
                <h3 className="font-semibold text-base text-[#E8EDF5]">Instalar no iPhone / iPad</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-[#9FB0C8] hover:text-white"
                  aria-label="Fechar guia de instalação"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-sm text-[#9FB0C8]">
                <p className="flex items-start gap-2">
                  <span className="font-bold text-white bg-[#1F66D6] rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-xs">1</span>
                  <span>Toque no botão <strong>Compartilhar</strong> (ícone com quadrado e seta para cima) na barra do Safari.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-bold text-white bg-[#1F66D6] rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-xs">2</span>
                  <span>Role a lista para baixo e selecione <strong>Adicionar à Tela de Início</strong>.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-bold text-white bg-[#1F66D6] rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-xs">3</span>
                  <span>Toque em <strong>Adicionar</strong> no canto superior direito para concluir.</span>
                </p>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-[#1F66D6] py-2.5 text-sm font-medium text-white hover:bg-[#1A57B8]"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <button
      onClick={() => {
        // Fallback for desktop/browsers where beforeinstallprompt hasn't fired yet
        alert('Para instalar o app, utilize o ícone de instalação na barra de endereços do navegador ou o menu "Adicionar à tela inicial".');
      }}
      aria-label="Instalar OBra ENGEP PWA"
      className={`hidden sm:flex items-center gap-1.5 font-medium transition active:scale-95 text-[#9FB0C8] hover:text-white border border-[#6B7F9E]/30 hover:border-[#6B7F9E] ${
        compact ? 'px-2.5 py-1.5 text-xs rounded-xl' : 'px-3 py-2 text-xs rounded-xl'
      }`}
    >
      <Download className="w-3.5 h-3.5" />
      <span>Instalar PWA</span>
    </button>
  );
};
