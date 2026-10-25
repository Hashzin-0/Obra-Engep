/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  Layers,
  Zap,
  Droplets,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Download,
  Save,
  Plus,
  Trash2,
  Move,
  Square,
  DoorOpen,
  Maximize2,
  FileSpreadsheet,
  CheckCircle,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { FloorPlanProject, WallSegment, OpeningItem, ElectricalItem, HydraulicItem, ProjectDeadline } from '../types';
import { createEmptyProject } from '../data/referenceData';
import { ensureUuid } from '../utils/uuid';
import { LimitBar } from '../components/LimitBar';
import { AlertBanner } from '../components/AlertBanner';
import { Calendar, Bell, CalendarCheck } from 'lucide-react';
import { exportToLocalCalendar, getGoogleCalendarUrl } from '../utils/calendarSync';

type ToolMode = 'select' | 'wall' | 'door' | 'window' | 'socket' | 'light' | 'cold_water' | 'dimension';

interface FloorPlanEditorViewProps {
  onOpenCalendarModal?: () => void;
  deadlines?: ProjectDeadline[];
  projects?: FloorPlanProject[];
  onSaveProject?: (project: FloorPlanProject) => void;
  onDeleteProject?: (id: string) => void;
}

export const FloorPlanEditorView: React.FC<FloorPlanEditorViewProps> = ({
  onOpenCalendarModal,
  deadlines = [],
  projects = [],
  onSaveProject,
  onDeleteProject,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [project, setProject] = useState<FloorPlanProject>(() => {
    const saved = localStorage.getItem('obra_engep_active_project');
    if (saved) {
      const parsed = JSON.parse(saved) as FloorPlanProject;
      return { ...parsed, id: ensureUuid(parsed.id) };
    }
    return projects[0] ?? createEmptyProject();
  });

  const [history, setHistory] = useState<FloorPlanProject[]>([project]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Active layers
  const [showArchLayer, setShowArchLayer] = useState(true);
  const [showElecLayer, setShowElecLayer] = useState(true);
  const [showHydLayer, setShowHydLayer] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  // Tool
  const [tool, setTool] = useState<ToolMode>('select');
  const [zoom, setZoom] = useState(1);
  const [stage, setStage] = useState<'estudo_preliminar' | 'executivo'>(project.stage);

  // Drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentMouse, setCurrentMouse] = useState<{ x: number; y: number } | null>(null);

  // Push state to undo history
  const updateProjectState = (newProject: FloorPlanProject) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newProject);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setProject(newProject);
    localStorage.setItem('obra_engep_active_project', JSON.stringify(newProject));
    onSaveProject?.(newProject);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setProject(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setProject(history[historyIndex + 1]);
    }
  };

  // Canvas redraw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.clientWidth || 600;
    const height = 440;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr * zoom, dpr * zoom);

    // Background
    ctx.fillStyle = isDark ? '#101827' : '#F8FAFC';
    ctx.fillRect(0, 0, width / zoom, height / zoom);

    // Grid (1 grid cell = 20px = 0.5m in 1:50 scale)
    if (showGrid) {
      ctx.strokeStyle = isDark ? '#1e293b' : '#E2E8F0';
      ctx.lineWidth = 1;
      const step = 20;
      for (let x = 0; x < width / zoom; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height / zoom);
        ctx.stroke();
      }
      for (let y = 0; y < height / zoom; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width / zoom, y);
        ctx.stroke();
      }
    }

    // ARCHITECTURAL LAYER: Walls
    if (showArchLayer) {
      project.walls.forEach((w) => {
        ctx.strokeStyle = isDark ? '#E8EDF5' : '#1E293B';
        ctx.lineWidth = w.thickness / 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(w.x1, w.y1);
        ctx.lineTo(w.x2, w.y2);
        ctx.stroke();

        // Dimension text along wall if dimensions enabled
        if (showDimensions) {
          const dx = w.x2 - w.x1;
          const dy = w.y2 - w.y1;
          const lengthPx = Math.sqrt(dx * dx + dy * dy);
          const lengthM = (lengthPx / 40).toFixed(2); // 40px = 1.00m

          const midX = (w.x1 + w.x2) / 2;
          const midY = (w.y1 + w.y2) / 2;

          ctx.fillStyle = '#5B9BFF';
          ctx.font = '10px Roboto, sans-serif';
          ctx.fillText(`${lengthM} m`, midX - 12, midY - 6);
        }
      });

      // Doors and Windows
      project.openings.forEach((op) => {
        if (op.type === 'door') {
          ctx.strokeStyle = '#F5B93A';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(op.x, op.y, 25, 0, Math.PI / 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(op.x, op.y);
          ctx.lineTo(op.x + 25, op.y);
          ctx.stroke();
        } else {
          // Window
          ctx.strokeStyle = '#06B6D4';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(op.x - 20, op.y);
          ctx.lineTo(op.x + 20, op.y);
          ctx.stroke();
        }
      });
    }

    // ELECTRICAL LAYER
    if (showElecLayer) {
      project.electrical.forEach((el) => {
        if (el.type === 'light') {
          ctx.fillStyle = '#EAB308';
          ctx.strokeStyle = '#CA8A04';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(el.x, el.y, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          // Cross inside lamp
          ctx.beginPath();
          ctx.moveTo(el.x - 5, el.y - 5);
          ctx.lineTo(el.x + 5, el.y + 5);
          ctx.moveTo(el.x + 5, el.y - 5);
          ctx.lineTo(el.x - 5, el.y + 5);
          ctx.stroke();
        } else if (el.type === 'socket') {
          ctx.fillStyle = '#FF6B6B';
          ctx.strokeStyle = '#DC2626';
          ctx.beginPath();
          ctx.arc(el.x, el.y, 6, 0, Math.PI);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (el.type === 'panel') {
          ctx.fillStyle = '#1F66D6';
          ctx.fillRect(el.x - 8, el.y - 8, 16, 16);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '8px monospace';
          ctx.fillText('QDG', el.x - 7, el.y + 3);
        }
      });
    }

    // HYDRAULIC LAYER
    if (showHydLayer) {
      project.hydraulic.forEach((hy) => {
        if (hy.type === 'cold_water') {
          ctx.fillStyle = '#06B6D4';
          ctx.beginPath();
          ctx.arc(hy.x, hy.y, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '7px sans-serif';
          ctx.fillText('AF', hy.x - 4, hy.y + 3);
        } else if (hy.type === 'sewage') {
          ctx.fillStyle = '#854D0E';
          ctx.beginPath();
          ctx.arc(hy.x, hy.y, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '7px sans-serif';
          ctx.fillText('ESG', hy.x - 6, hy.y + 3);
        }
      });
    }

    // Temporary line while drawing a wall
    if (isDrawing && startPoint && currentMouse && tool === 'wall') {
      ctx.strokeStyle = '#3DD68C';
      ctx.lineWidth = 6;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(startPoint.x, startPoint.y);
      ctx.lineTo(currentMouse.x, currentMouse.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [
    project,
    zoom,
    showArchLayer,
    showElecLayer,
    showHydLayer,
    showDimensions,
    showGrid,
    isDrawing,
    startPoint,
    currentMouse,
    tool,
    isDark,
  ]);

  const snap = (coord: number) => Math.round(coord / 20) * 20;

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = snap((e.clientX - rect.left) / zoom);
    const y = snap((e.clientY - rect.top) / zoom);

    if (tool === 'wall') {
      setIsDrawing(true);
      setStartPoint({ x, y });
      setCurrentMouse({ x, y });
    } else if (tool === 'door') {
      const newOp: OpeningItem = {
        id: `door-${Date.now()}`,
        type: 'door',
        wallId: 'w1',
        x,
        y,
        width: 80,
      };
      updateProjectState({
        ...project,
        openings: [...project.openings, newOp],
      });
    } else if (tool === 'window') {
      const newOp: OpeningItem = {
        id: `win-${Date.now()}`,
        type: 'window',
        wallId: 'w1',
        x,
        y,
        width: 100,
      };
      updateProjectState({
        ...project,
        openings: [...project.openings, newOp],
      });
    } else if (tool === 'light') {
      const newEl: ElectricalItem = {
        id: `light-${Date.now()}`,
        type: 'light',
        x,
        y,
        circuit: 'Circuito 1',
        label: 'Ponto de Luz 100W',
      };
      updateProjectState({
        ...project,
        electrical: [...project.electrical, newEl],
      });
    } else if (tool === 'socket') {
      const newEl: ElectricalItem = {
        id: `socket-${Date.now()}`,
        type: 'socket',
        x,
        y,
        circuit: 'Circuito 2',
        label: 'Tomada 10A TUG',
      };
      updateProjectState({
        ...project,
        electrical: [...project.electrical, newEl],
      });
    } else if (tool === 'cold_water') {
      const newHy: HydraulicItem = {
        id: `af-${Date.now()}`,
        type: 'cold_water',
        x,
        y,
        diameterMm: 25,
        label: 'Ponto AF 25mm',
      };
      updateProjectState({
        ...project,
        hydraulic: [...project.hydraulic, newHy],
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = snap((e.clientX - rect.left) / zoom);
    const y = snap((e.clientY - rect.top) / zoom);
    setCurrentMouse({ x, y });
  };

  const handleMouseUp = () => {
    if (isDrawing && startPoint && currentMouse && tool === 'wall') {
      if (startPoint.x !== currentMouse.x || startPoint.y !== currentMouse.y) {
        const newWall: WallSegment = {
          id: `wall-${Date.now()}`,
          x1: startPoint.x,
          y1: startPoint.y,
          x2: currentMouse.x,
          y2: currentMouse.y,
          thickness: 15,
        };
        updateProjectState({
          ...project,
          walls: [...project.walls, newWall],
        });
      }
    }
    setIsDrawing(false);
    setStartPoint(null);
  };

  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `OBra-ENGEP-Planta-${project.name.replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Top Project Bar */}
      <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={project.id}
              onChange={(event) => {
                const selected = projects.find((item) => item.id === event.target.value);
                if (selected) {
                  setProject(selected);
                  setHistory([selected]);
                  setHistoryIndex(0);
                  setStage(selected.stage);
                  localStorage.setItem('obra_engep_active_project', JSON.stringify(selected));
                }
              }}
              className="bg-transparent text-sm font-bold text-white outline-none border border-[#2A3A55] rounded-lg px-2 py-1"
              aria-label="Selecionar projeto"
            >
              {!projects.some((item) => item.id === project.id) && (
                <option value={project.id} className="bg-[#17243A]">{project.name}</option>
              )}
              {projects.map((item) => (
                <option key={item.id} value={item.id} className="bg-[#17243A]">{item.name}</option>
              ))}
            </select>
            <span
              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                stage === 'estudo_preliminar'
                  ? 'bg-[#F5B93A]/20 text-[#F5B93A] border-[#F5B93A]/30'
                  : 'bg-[#3DD68C]/20 text-[#3DD68C] border-[#3DD68C]/30'
              }`}
            >
              {stage === 'estudo_preliminar' ? 'Estudo Preliminar' : 'Executivo'}
            </span>
          </div>
          <span className="text-xs text-[#9FB0C8]">
            Escala fixa: {project.scale} · 40 px = 1,00 m · Grade 20 cm
          </span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5">
          {onOpenCalendarModal && (
            <button
              onClick={onOpenCalendarModal}
              className="px-2.5 py-1.5 rounded-xl bg-[#F5B93A]/20 hover:bg-[#F5B93A]/30 text-[#F5B93A] border border-[#F5B93A]/40 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
              title="Gerenciar cronograma, prazos e sincronizar calendário"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Prazos & Calendário</span>
            </button>
          )}
          <button
            onClick={() => {
              const next = stage === 'estudo_preliminar' ? 'executivo' : 'estudo_preliminar';
              setStage(next);
              updateProjectState({ ...project, stage: next });
            }}
            className="px-2.5 py-1.5 rounded-xl border border-[#2A3A55] text-xs text-[#9FB0C8] hover:text-white"
          >
            Mudar Estágio
          </button>
          <button
            onClick={() => {
              const name = window.prompt('Nome do novo projeto:', 'Novo projeto');
              if (!name?.trim()) return;
              const created = { ...createEmptyProject(), name: name.trim() };
              setProject(created);
              setHistory([created]);
              setHistoryIndex(0);
              setStage(created.stage);
              localStorage.setItem('obra_engep_active_project', JSON.stringify(created));
              onSaveProject?.(created);
            }}
            className="p-2 rounded-xl border border-[#2A3A55] text-[#9FB0C8] hover:text-white"
            aria-label="Criar novo projeto"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              localStorage.setItem('obra_engep_active_project', JSON.stringify(project));
              onSaveProject?.(project);
            }}
            className="p-2 rounded-xl bg-[#3DD68C] text-[#101827]"
            aria-label="Salvar projeto"
          >
            <Save className="w-3.5 h-3.5" />
          </button>
          {onDeleteProject && projects.some((item) => item.id === project.id) && (
            <button
              onClick={() => {
                if (!window.confirm(`Excluir o projeto "${project.name}"?`)) return;
                onDeleteProject(project.id);
                const next = projects.find((item) => item.id !== project.id) ?? createEmptyProject();
                setProject(next);
                setHistory([next]);
                setHistoryIndex(0);
                setStage(next.stage);
              }}
              className="p-2 rounded-xl border border-[#2A3A55] text-[#F87171] hover:text-white"
              aria-label="Excluir projeto"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleExportPNG}
            aria-label="Exportar imagem da planta"
            className="p-2 rounded-xl bg-[#1F66D6] hover:bg-[#1A57B8] text-white text-xs flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar PNG</span>
          </button>
        </div>
      </div>

      {/* Layer Toggles Bar (Page 7: Camadas liga/desliga) */}
      <div className="flex items-center gap-2 p-2 rounded-xl bg-[#17243A] border border-[#2A3A55] overflow-x-auto no-scrollbar text-xs">
        <span className="text-[#9FB0C8] font-bold text-[11px] px-2 uppercase tracking-wider flex items-center gap-1">
          <Layers className="w-3.5 h-3.5" />
          Camadas:
        </span>
        <button
          onClick={() => setShowArchLayer(!showArchLayer)}
          className={`px-3 py-1 rounded-lg border transition ${
            showArchLayer
              ? 'bg-[#1F66D6] text-white border-[#1F66D6]'
              : 'border-[#2A3A55] text-[#9FB0C8]'
          }`}
        >
          Arquitetura (Paredes)
        </button>
        <button
          onClick={() => setShowElecLayer(!showElecLayer)}
          className={`px-3 py-1 rounded-lg border transition flex items-center gap-1 ${
            showElecLayer
              ? 'bg-[#EAB308] text-black font-semibold border-[#EAB308]'
              : 'border-[#2A3A55] text-[#9FB0C8]'
          }`}
        >
          <Zap className="w-3 h-3" />
          Elétrica (Tomadas/Pontos)
        </button>
        <button
          onClick={() => setShowHydLayer(!showHydLayer)}
          className={`px-3 py-1 rounded-lg border transition flex items-center gap-1 ${
            showHydLayer
              ? 'bg-[#06B6D4] text-white border-[#06B6D4]'
              : 'border-[#2A3A55] text-[#9FB0C8]'
          }`}
        >
          <Droplets className="w-3 h-3" />
          Hidráulica (AF/ESG)
        </button>
        <button
          onClick={() => setShowDimensions(!showDimensions)}
          className={`px-3 py-1 rounded-lg border transition ${
            showDimensions
              ? 'bg-[#5B9BFF] text-white border-[#5B9BFF]'
              : 'border-[#2A3A55] text-[#9FB0C8]'
          }`}
        >
          Cotas (m)
        </button>
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`px-3 py-1 rounded-lg border transition ${
            showGrid ? 'bg-white/10 text-white border-white/20' : 'border-[#2A3A55] text-[#9FB0C8]'
          }`}
        >
          Grade
        </button>
      </div>

      {/* Real Interactive Canvas (Page 6: "Canvas com grade, escala, paredes, portas, janelas, cotas...") */}
      <div className="relative rounded-2xl border border-[#2A3A55] overflow-hidden shadow-inner bg-[#101827]">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="w-full cursor-crosshair touch-none"
        />

        {/* Floating Zoom & Undo Controls */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#17243A]/90 backdrop-blur-sm p-1.5 rounded-xl border border-[#2A3A55]">
          <button
            onClick={handleUndo}
            disabled={historyIndex === 0}
            className="p-1.5 rounded-lg text-[#9FB0C8] hover:text-white disabled:opacity-30"
            title="Desfazer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 rounded-lg text-[#9FB0C8] hover:text-white disabled:opacity-30"
            title="Refazer"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-[#2A3A55]" />
          <button
            onClick={() => setZoom(Math.max(0.6, zoom - 0.1))}
            className="p-1.5 rounded-lg text-[#9FB0C8] hover:text-white"
            title="Diminuir Zoom"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono text-[#5B9BFF] px-1">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(Math.min(2.0, zoom + 0.1))}
            className="p-1.5 rounded-lg text-[#9FB0C8] hover:text-white"
            title="Aumentar Zoom"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Legend Overlay at bottom left */}
        <div className="absolute bottom-3 left-3 bg-[#17243A]/95 p-2 rounded-xl border border-[#2A3A55] text-[10px] space-y-1">
          <div className="font-bold text-white uppercase tracking-wider">Legenda de Instalações:</div>
          <div className="flex items-center gap-3 text-[#9FB0C8]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#EAB308]" /> Luz
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#FF6B6B]" /> Tomada
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#06B6D4]" /> Água Fria
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#854D0E]" /> Esgoto
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Tools Toolbar (Page 6 briefing: "Barra de ferramentas inferior") */}
      <div className="p-2.5 rounded-2xl bg-[#17243A] border border-[#2A3A55] flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
        {[
          { id: 'select' as ToolMode, label: 'Mover/Selecionar', icon: Move },
          { id: 'wall' as ToolMode, label: '+ Parede', icon: Square },
          { id: 'door' as ToolMode, label: '+ Porta', icon: DoorOpen },
          { id: 'window' as ToolMode, label: '+ Janela', icon: Maximize2 },
          { id: 'light' as ToolMode, label: '+ Ponto Luz', icon: Zap },
          { id: 'socket' as ToolMode, label: '+ Tomada', icon: Zap },
          { id: 'cold_water' as ToolMode, label: '+ Ponto Água', icon: Droplets },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTool(id)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 min-h-[40px] ${
              tool === id
                ? 'bg-[#1F66D6] text-white shadow-xs'
                : 'text-[#9FB0C8] hover:text-white hover:bg-white/5'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Project Milestones and Calendar Sync Section */}
      <div className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-[#F5B93A]" />
            <h4 className="font-bold text-sm text-white">Cronograma & Prazos da Casa Unifamiliar</h4>
          </div>
          {onOpenCalendarModal && (
            <button
              onClick={onOpenCalendarModal}
              className="text-xs font-semibold text-[#5B9BFF] hover:underline"
            >
              Ver todos ({deadlines.length})
            </button>
          )}
        </div>

        <div className="space-y-2 text-xs">
          {deadlines.slice(0, 3).map((d) => (
            <div
              key={d.id}
              className="p-2.5 rounded-xl bg-black/25 border border-white/5 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="font-semibold text-white truncate">{d.title}</div>
                <div className="text-[11px] text-[#9FB0C8]">
                  Vencimento: {d.dueDate.split('-').reverse().join('/')} às {d.dueTime || '09:00'} · {d.category}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={getGoogleCalendarUrl(d)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 rounded-lg bg-[#1F66D6]/20 text-[#5B9BFF] text-[10px] font-bold flex items-center gap-1"
                >
                  <Calendar className="w-3 h-3" />
                  <span>Google Cal</span>
                </a>
                <button
                  onClick={() => exportToLocalCalendar([d])}
                  className="px-2 py-1 rounded-lg bg-white/10 text-white text-[10px] font-bold flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>.ICS</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-1 flex items-center justify-between text-xs">
          <span className="text-[#9FB0C8]">Alertas Android Push ativáveis</span>
          {onOpenCalendarModal && (
            <button
              onClick={onOpenCalendarModal}
              className="px-3 py-1.5 rounded-xl bg-[#1F66D6] hover:bg-[#1A57B8] text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Sincronizar com Calendário</span>
            </button>
          )}
        </div>
      </div>

      <LimitBar message="O editor gráfico gera representações conceituais e quantitativos preliminares. Plantas executivas para aprovação em prefeitura exigem assinatura e ART de profissional habilitado." />
    </div>
  );
};
