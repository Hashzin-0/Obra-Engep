/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { FloorPlan3DView } from '../components/FloorPlan3DView';
import {
  Layers,
  Zap,
  Droplets,
  RotateCcw,
  RotateCw,
  Copy,
  ZoomIn,
  ZoomOut,
  Download,
  Save,
  Plus,
  Trash2,
  Square,
  DoorOpen,
  Maximize2,
  FileSpreadsheet,
  CheckCircle,
  Lock,
  Unlock,
  Sun,
  Moon,
  Building2,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { FloorPlanProject, FloorPlanLevel, FloorPlanRoom, FloorMaterial, WallSegment, OpeningItem, ElectricalItem, HydraulicItem, ProjectDeadline } from '../types';
import { createEmptyProject } from '../data/referenceData';
import { ensureUuid } from '../utils/uuid';
import { LimitBar } from '../components/LimitBar';
import { AlertBanner } from '../components/AlertBanner';
import { Calendar, Bell, CalendarCheck } from 'lucide-react';
import { exportToLocalCalendar, getGoogleCalendarUrl } from '../utils/calendarSync';
import { FurnitureCatalog } from '../components/FurnitureCatalog';
import { FURNITURE_CATALOG, type FurnitureCatalogItem } from '../data/furnitureCatalog';

type ToolMode = 'select' | 'wall' | 'door' | 'window' | 'socket' | 'light' | 'cold_water' | 'dimension' | 'wire' | 'conduit' | 'switch' | 'panel' | 'data_point' | 'grounding' | 'solar_panel' | 'water_pipe' | 'sewage_pipe' | 'vent_pipe' | 'rain_pipe' | 'sink' | 'faucet' | 'shower' | 'toilet' | 'floor_drain' | 'cleanout' | 'inspection_box' | 'tank' | 'heater' | 'grease_trap' | 'pool';

interface FloorPlanEditorViewProps {
  onOpenCalendarModal?: () => void;
  deadlines?: ProjectDeadline[];
  projects?: FloorPlanProject[];
  onSaveProject?: (project: FloorPlanProject) => void;
  onDeleteProject?: (id: string) => void;
}


const ensureProjectLevels = (project: FloorPlanProject): FloorPlanProject => {
  const levels = project.levels?.length ? project.levels : [{ id: 'ground-floor', name: 'Térreo', kind: 'terreo' as const, level: 0, elevation: 0, walls: project.walls ?? [], rooms: project.rooms ?? [], openings: project.openings ?? [], electrical: project.electrical ?? [], hydraulic: project.hydraulic ?? [], furniture: project.furniture ?? [] }];
  const activeLevelId = project.activeLevelId && levels.some(level => level.id === project.activeLevelId) ? project.activeLevelId : levels[0].id;
  const active = levels.find(level => level.id === activeLevelId)!;
  return { ...project, levels, activeLevelId, walls: active.walls, rooms: active.rooms ?? [], openings: active.openings, electrical: active.electrical, hydraulic: active.hydraulic, furniture: active.furniture ?? [], isNightMode: project.isNightMode ?? false };
};
const captureActiveLevel = (project: FloorPlanProject, activeLevelId: string): FloorPlanLevel[] => {
  const current = project.levels?.find(level => level.id === activeLevelId);
  const snapshot: FloorPlanLevel = { ...(current ?? { id: activeLevelId, name: 'Térreo', kind: 'terreo', level: 0, elevation: 0 }), id: activeLevelId, walls: project.walls, rooms: project.rooms ?? [], openings: project.openings, electrical: project.electrical, hydraulic: project.hydraulic, furniture: project.furniture ?? [] };
  return [...(project.levels ?? []).filter(level => level.id !== activeLevelId), snapshot];
};

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
      return ensureProjectLevels({ ...parsed, id: ensureUuid(parsed.id) });
    }
    return ensureProjectLevels(projects[0] ?? createEmptyProject());
  });

  const [activeLevelId, setActiveLevelId] = useState(project.activeLevelId ?? 'ground-floor');
  const [isNightMode, setIsNightMode] = useState(project.isNightMode ?? false);
  const [history, setHistory] = useState<FloorPlanProject[]>([project]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Active layers
  const [showArchLayer, setShowArchLayer] = useState(true);
  const [showElecLayer, setShowElecLayer] = useState(true);
  const [showHydLayer, setShowHydLayer] = useState(true);
  const [showFurnitureLayer, setShowFurnitureLayer] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);
  const [showWallVertices, setShowWallVertices] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [gapEnabled, setGapEnabled] = useState(true);
  const [gapDistance, setGapDistance] = useState(20);
  const [moveAttachedParts, setMoveAttachedParts] = useState(true);

  // Tool
  const [tool, setTool] = useState<ToolMode>('select');
  const [wallDrawMode, setWallDrawMode] = useState<'segment' | 'sequence'>('segment');
  const [wallSequencePoints, setWallSequencePoints] = useState<Array<{x:number;y:number}>>([]);
  const [routeSequencePoints, setRouteSequencePoints] = useState<Array<{x:number;y:number}>>([]);
  useEffect(() => { if (!['wire','conduit','water_pipe','sewage_pipe','vent_pipe','rain_pipe'].includes(tool)) setRouteSequencePoints([]); }, [tool]);
  const [zoom, setZoom] = useState(1);
  const [show3D, setShow3D] = useState(false);
  const [showFurnitureCatalog, setShowFurnitureCatalog] = useState(false);
  const [selectedObjects, setSelectedObjects] = useState<Array<{ kind: 'wall' | 'opening' | 'electrical' | 'hydraulic' | 'furniture'; id: string }>>([]);
  const [selectionRect, setSelectionRect] = useState<{x1:number;y1:number;x2:number;y2:number}|null>(null);
  const selectionStartRef = useRef<{x:number;y:number}|null>(null);
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>());
  const panGestureRef = useRef<{ x: number; y: number; centerX: number; centerY: number; distance:number; zoom:number } | null>(null);
  const [stage, setStage] = useState<'estudo_preliminar' | 'executivo'>(project.stage);
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (projects.length > 0 && !projects.some((item) => item.id === project.id)) {
      const next = ensureProjectLevels(projects[0]);
      setProject(next); setActiveLevelId(next.activeLevelId ?? 'ground-floor'); setIsNightMode(next.isNightMode ?? false);
      setHistory([next]); setHistoryIndex(0); setStage(next.stage);
      localStorage.setItem('obra_engep_active_project', JSON.stringify(next));
    }
  }, [projects, project.id]);

  // Drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentMouse, setCurrentMouse] = useState<{ x: number; y: number } | null>(null);
  const [selectedObject, setSelectedObject] = useState<{ kind: 'wall' | 'opening' | 'electrical' | 'hydraulic' | 'furniture'; id: string } | null>(null);
  const dragRef = useRef<{ kind: 'wall' | 'opening' | 'electrical' | 'hydraulic' | 'furniture'; id: string; x: number; y: number; endpoint?: 1 | 2 } | null>(null);
  const placementRef = useRef(false);

  // Push state to undo history
  const updateProjectState = (newProject: FloorPlanProject) => {
    const levelId = newProject.activeLevelId ?? activeLevelId;
    // Capture the changed top-level arrays before normalization. Normalizing first
    // would restore the stale active-level snapshot and silently discard new items.
    const levels = captureActiveLevel(newProject, levelId);
    const normalized = ensureProjectLevels({ ...newProject, levels, activeLevelId: levelId, isNightMode });
    const newHistory = history.slice(0, historyIndex + 1); newHistory.push(normalized);
    setHistory(newHistory); setHistoryIndex(newHistory.length - 1); setProject(normalized); setActiveLevelId(levelId);
    localStorage.setItem('obra_engep_active_project', JSON.stringify(normalized)); onSaveProject?.(normalized);
  };
  const handleCreateLevel = () => {
    const kindInput = window.prompt('Tipo de pavimento: subsolo, terreo ou superior', 'superior');
    if (!kindInput || !['subsolo','terreo','superior'].includes(kindInput.trim().toLowerCase())) return;
    const kind = kindInput.trim().toLowerCase() as FloorPlanLevel['kind']; const levels = captureActiveLevel(project, activeLevelId);
    if (kind === 'terreo' && levels.some(level => level.kind === 'terreo')) { window.alert('O projeto já possui um térreo.'); return; }
    const levelNumber = kind === 'terreo' ? 0 : kind === 'subsolo' ? Math.min(-1, ...levels.filter(item=>item.kind==='subsolo').map(item=>item.level-1)) : Math.max(1, ...levels.filter(item=>item.kind==='superior').map(item=>item.level+1));
    const suggested = kind === 'terreo' ? 'Térreo' : kind === 'subsolo' ? 'Subsolo ' + Math.abs(levelNumber) : levelNumber + 'º Pavimento';
    const name = window.prompt('Nome do pavimento:', suggested); if (!name?.trim()) return;
    if (levels.some(item=>item.name.toLocaleLowerCase()===name.trim().toLocaleLowerCase())) { window.alert('Já existe um pavimento com esse nome.'); return; }
    const created: FloorPlanLevel = { id: crypto.randomUUID(), name: name.trim(), kind, level: levelNumber, elevation: levelNumber*110, walls: [], rooms: [], openings: [], electrical: [], hydraulic: [], furniture: [] };
    setActiveLevelId(created.id); updateProjectState({ ...project, activeLevelId: created.id, levels: [...levels, created], walls: [], rooms: [], openings: [], electrical: [], hydraulic: [], furniture: [] });
  };
  const handleSelectLevel = (levelId: string) => {
    if (levelId === activeLevelId) return; const levels = captureActiveLevel(project, activeLevelId); const target = levels.find(level=>level.id===levelId); if (!target) return;
    const next = { ...project, levels, activeLevelId: levelId, walls: target.walls, rooms: target.rooms ?? [], openings: target.openings, electrical: target.electrical, hydraulic: target.hydraulic, furniture: target.furniture ?? [] };
    setActiveLevelId(levelId); setProject(next); setHistory(current=>[...current.slice(0,historyIndex+1),next]); setHistoryIndex(index=>index+1);
    localStorage.setItem('obra_engep_active_project',JSON.stringify(next)); onSaveProject?.(next); setSelectedObject(null); setSelectedObjects([]); setTool('select'); setWallSequencePoints([]); setRouteSequencePoints([]);
  };
  const handleRenameLevel = () => {
    const current=project.levels?.find(level=>level.id===activeLevelId); if(!current) return; const name=window.prompt('Novo nome do pavimento:',current.name); if(!name?.trim()) return;
    updateProjectState({ ...project, levels:captureActiveLevel(project,activeLevelId).map(level=>level.id===activeLevelId?{...level,name:name.trim()}:level) });
  };
  const handleDeleteLevel = () => {
    const levels=captureActiveLevel(project,activeLevelId); if(levels.length<=1){window.alert('O projeto precisa manter pelo menos um pavimento.');return;}
    const current=levels.find(level=>level.id===activeLevelId); if(!current||!window.confirm('Excluir o pavimento "'+current.name+'" e todos os elementos contidos nele?')) return;
    const remaining=levels.filter(level=>level.id!==activeLevelId); const target=remaining.find(level=>level.kind==='terreo')??remaining[0];
    setActiveLevelId(target.id); updateProjectState({...project,levels:remaining,activeLevelId:target.id,walls:target.walls,rooms:target.rooms??[],openings:target.openings,electrical:target.electrical,hydraulic:target.hydraulic,furniture:target.furniture??[]});
  };
  const toggleNightMode = () => { const next=!isNightMode; setIsNightMode(next); const updated={...project,isNightMode:next}; setProject(updated); localStorage.setItem('obra_engep_active_project',JSON.stringify(updated)); onSaveProject?.(updated); };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      const previous = ensureProjectLevels(history[historyIndex - 1]);
      setProject(previous); setActiveLevelId(previous.activeLevelId ?? 'ground-floor'); setIsNightMode(previous.isNightMode ?? false);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      const next = ensureProjectLevels(history[historyIndex + 1]);
      setProject(next); setActiveLevelId(next.activeLevelId ?? 'ground-floor'); setIsNightMode(next.isNightMode ?? false);
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
    ctx.translate(canvasPan.x / zoom, canvasPan.y / zoom);

    // Background
    ctx.fillStyle = isNightMode ? '#070B16' : isDark ? '#101827' : '#F8FAFC';
    ctx.fillRect(0, 0, width / zoom, height / zoom);

    // Grid (1 grid cell = 20px = 0.5m in 1:50 scale)
    if (showGrid) {
      ctx.strokeStyle = isNightMode ? '#172033' : isDark ? '#1e293b' : '#E2E8F0';
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

    // Room floors are drawn before walls so the wall strokes remain on top.
    if (showArchLayer) {
      (project.rooms ?? []).forEach((room) => {
        if (room.vertices.length < 3) return;
        const materialColors: Record<FloorMaterial, string> = {
          concrete: isDark ? '#64748B' : '#CBD5E1',
          wood: '#A8794F',
          tile: isDark ? '#94A3B8' : '#E2E8F0',
          stone: isDark ? '#78716C' : '#D6D3D1',
          laminate: '#C49A6C',
        };
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(room.vertices[0].x, room.vertices[0].y);
        room.vertices.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.fillStyle = materialColors[room.material] ?? materialColors.concrete;
        ctx.globalAlpha = 0.72;
        ctx.fill();
        const center = room.vertices.reduce((acc,p)=>({x:acc.x+p.x/room.vertices.length,y:acc.y+p.y/room.vertices.length}),{x:0,y:0});
        ctx.globalAlpha = 1;
        ctx.fillStyle = isDark ? '#F8FAFC' : '#0F172A';
        ctx.font = 'bold 12px Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(room.name || 'Cômodo', center.x, center.y);
        ctx.restore();
      });
    }

    // ARCHITECTURAL LAYER: Walls
    if (showArchLayer) {
      project.walls.forEach((w) => {
        // During a shared-vertex drag, the green preview replaces the old strokes of all connected walls.
        const vertexDrag = dragRef.current?.kind === 'wall' && dragRef.current.endpoint && currentMouse ? project.walls.find(item => item.id === dragRef.current?.id) : undefined;
        if (vertexDrag && dragRef.current?.endpoint) {
          const vx = dragRef.current.endpoint === 1 ? vertexDrag.x1 : vertexDrag.x2;
          const vy = dragRef.current.endpoint === 1 ? vertexDrag.y1 : vertexDrag.y2;
          if (Math.hypot(w.x1-vx,w.y1-vy)<2 || Math.hypot(w.x2-vx,w.y2-vy)<2) return;
        }
        ctx.strokeStyle = isDark ? '#E8EDF5' : '#1E293B';
        ctx.lineWidth = w.thickness / 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(w.x1, w.y1);
        ctx.lineTo(w.x2, w.y2);
        ctx.stroke();

        // Dimensions sit outside the room perimeter; while drawing/moving a junction,
        // temporarily show the two resulting lengths and restore the full length afterward.
        if (showDimensions) {
          const dx = w.x2 - w.x1, dy = w.y2 - w.y1;
          const lengthPx = Math.hypot(dx, dy);
          const lengthM = (lengthPx / 40).toFixed(2);
          const midX = (w.x1 + w.x2) / 2, midY = (w.y1 + w.y2) / 2;
          const room = (project.rooms ?? []).find(r => r.vertices.some((p,i) => {
            const q = r.vertices[(i+1)%r.vertices.length];
            return (Math.hypot(p.x-w.x1,p.y-w.y1)<3 && Math.hypot(q.x-w.x2,q.y-w.y2)<3) ||
              (Math.hypot(p.x-w.x2,p.y-w.y2)<3 && Math.hypot(q.x-w.x1,q.y-w.y1)<3);
          }));
          let nx = -dy / Math.max(1,lengthPx), ny = dx / Math.max(1,lengthPx);
          if (room) {
            const cx=room.vertices.reduce((a,p)=>a+p.x/room.vertices.length,0), cy=room.vertices.reduce((a,p)=>a+p.y/room.vertices.length,0);
            if ((midX+nx*20-cx)**2+(midY+ny*20-cy)**2 < (midX-nx*20-cx)**2+(midY-ny*20-cy)**2) { nx=-nx; ny=-ny; }
          }
          const labelAt = (text:string, x:number, y:number) => {
            ctx.save(); ctx.font='10px Roboto, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
            const width=ctx.measureText(text).width+8;
            ctx.fillStyle=isDark?'rgba(15,23,42,.92)':'rgba(255,255,255,.94)';
            ctx.fillRect(x-width/2,y-8,width,16); ctx.fillStyle='#5B9BFF'; ctx.fillText(text,x,y); ctx.restore();
          };
          const candidates = [currentMouse, startPoint].filter((p): p is {x:number;y:number} => !!p);
          const split = candidates.map(p => {
            const t=((p.x-w.x1)*dx+(p.y-w.y1)*dy)/(lengthPx*lengthPx||1);
            const px=w.x1+t*dx, py=w.y1+t*dy;
            return {t, distance:Math.hypot(p.x-px,p.y-py)};
          }).find(v=>v.t>0.03&&v.t<0.97&&v.distance<16);
          if (split && lengthPx>1) {
            const first=lengthPx*split.t/40, second=lengthPx*(1-split.t)/40;
            labelAt(`${first.toFixed(2)} m`,w.x1+dx*split.t/2+nx*18,w.y1+dy*split.t/2+ny*18);
            labelAt(`${second.toFixed(2)} m`,w.x1+dx*(split.t+(1-split.t)/2)+nx*18,w.y1+dy*(split.t+(1-split.t)/2)+ny*18);
          } else labelAt(`${lengthM} m`,midX+nx*18,midY+ny*18);
        }
      });

      // Shared vertices are visible snap targets for extending existing rooms.
      if (showWallVertices) {
        const vertices = new Map<string, { x: number; y: number }>();
        project.walls.forEach(w => [{ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }].forEach(p => vertices.set(Math.round(p.x) + ':' + Math.round(p.y), p)));
        ctx.save();
        vertices.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fillStyle = '#0F172A'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#60A5FA'; ctx.stroke(); });
        ctx.restore();
      }

      // Doors and Windows
      project.openings.forEach((op) => {
        ctx.save();
        ctx.translate(op.x, op.y);
        ctx.rotate(((op.rotation ?? 0) * Math.PI) / 180);
        const openingHalf = Math.max(10, op.width * 0.25);
        // In 2D, render only the door/window symbol. The 3D renderer handles wall openings.
        if (op.type === 'door') {
          ctx.strokeStyle = '#F5B93A'; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(-openingHalf, 0); ctx.lineTo(-openingHalf, -openingHalf); ctx.stroke();
          ctx.beginPath(); ctx.arc(-openingHalf, 0, openingHalf, -Math.PI / 2, 0); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-openingHalf, 0); ctx.lineTo(-openingHalf, -openingHalf); ctx.stroke();
        } else {
          ctx.strokeStyle = '#06B6D4'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(-openingHalf, -3); ctx.lineTo(openingHalf, -3); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-openingHalf, 3); ctx.lineTo(openingHalf, 3); ctx.stroke();
          ctx.strokeStyle = '#BAF3FF'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, 3); ctx.stroke();
        }
        ctx.restore();
      });
    }

    // ELECTRICAL LAYER
    if (showElecLayer) {
      project.electrical.forEach((el) => {
        if ((el.type === 'wire' || el.type === 'conduit') && el.x2 !== undefined && el.y2 !== undefined) { ctx.save(); ctx.strokeStyle=el.type==='conduit'?'#A78BFA':'#FACC15'; ctx.lineWidth=el.type==='conduit'?5:3; ctx.setLineDash(el.type==='conduit'?[]:[7,4]); ctx.beginPath(); ctx.moveTo(el.x,el.y); ctx.lineTo(el.x2,el.y2); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle='#FACC15'; ctx.beginPath(); ctx.arc(el.x,el.y,3,0,Math.PI*2); ctx.arc(el.x2,el.y2,3,0,Math.PI*2); ctx.fill(); ctx.restore();
        } else if (el.type === 'light') {
          ctx.save(); ctx.translate(el.x, el.y); ctx.rotate(((el.rotation ?? 0) * Math.PI) / 180);
          if (isNightMode) { const glow=ctx.createRadialGradient(0,0,3,0,0,72); glow.addColorStop(0,'rgba(255,221,145,.48)'); glow.addColorStop(.45,'rgba(255,190,90,.16)'); glow.addColorStop(1,'rgba(255,190,90,0)'); ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(0,0,72,0,Math.PI*2); ctx.fill(); }
          ctx.fillStyle = isNightMode ? '#FFF1B8' : '#EAB308';
          ctx.strokeStyle = '#CA8A04';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          // Cross inside lamp
          ctx.beginPath();
          ctx.moveTo(-5, -5);
          ctx.lineTo(5, 5);
          ctx.moveTo(5, -5);
          ctx.lineTo(-5, 5);
          ctx.stroke(); ctx.restore();
        } else if (el.type === 'socket') {
          ctx.save(); ctx.translate(el.x, el.y); ctx.rotate(((el.rotation ?? 0) * Math.PI) / 180);
          ctx.fillStyle = '#FF6B6B';
          ctx.strokeStyle = '#DC2626';
          ctx.beginPath();
          ctx.arc(0, 0, 6, 0, Math.PI);
          ctx.closePath();
          ctx.fill();
          ctx.stroke(); ctx.restore();
        } else if (el.type === 'solar_panel') { ctx.fillStyle='#1D4ED8';ctx.strokeStyle='#93C5FD';ctx.lineWidth=2;ctx.fillRect(el.x-14,el.y-10,28,20);ctx.strokeRect(el.x-14,el.y-10,28,20);ctx.beginPath();ctx.moveTo(el.x-5,el.y-10);ctx.lineTo(el.x-5,el.y+10);ctx.moveTo(el.x+5,el.y-10);ctx.lineTo(el.x+5,el.y+10);ctx.moveTo(el.x-14,el.y);ctx.lineTo(el.x+14,el.y);ctx.stroke(); } else if (el.type === 'panel') {
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
        if ((hy.type === 'water_pipe' || hy.type === 'sewage_pipe' || hy.type === 'vent_pipe' || hy.type === 'rain_pipe') && hy.x2 !== undefined && hy.y2 !== undefined) { ctx.save(); ctx.strokeStyle=hy.type==='sewage_pipe'?'#A16207':hy.type==='rain_pipe'?'#2563EB':hy.type==='vent_pipe'?'#A78BFA':'#06B6D4'; ctx.lineWidth=hy.type==='sewage_pipe'?4:3; ctx.setLineDash(hy.type==='sewage_pipe'||hy.type==='rain_pipe'?[6,3]:hy.type==='vent_pipe'?[2,3]:[]); ctx.beginPath(); ctx.moveTo(hy.x,hy.y); ctx.lineTo(hy.x2,hy.y2); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
        } else if (['sink','faucet','shower','toilet','floor_drain','cleanout','inspection_box','tank','heater','grease_trap','pool'].includes(hy.type)) { ctx.save(); ctx.fillStyle='#06B6D4'; ctx.strokeStyle='#E0F2FE'; ctx.lineWidth=2; ctx.beginPath(); if(hy.type==='sink'){ctx.roundRect(hy.x-11,hy.y-7,22,14,3);} else if(hy.type==='pool'){ctx.fillStyle='rgba(6,182,212,.22)';ctx.fillRect(hy.x-24,hy.y-16,48,32);ctx.strokeStyle='#06B6D4';ctx.strokeRect(hy.x-24,hy.y-16,48,32);ctx.beginPath();ctx.moveTo(hy.x-18,hy.y-5);ctx.lineTo(hy.x+18,hy.y-5);ctx.moveTo(hy.x-18,hy.y+5);ctx.lineTo(hy.x+18,hy.y+5);} else if(['inspection_box','grease_trap','tank'].includes(hy.type)){ctx.rect(hy.x-9,hy.y-9,18,18);} else if(hy.type==='floor_drain'){ctx.arc(hy.x,hy.y,7,0,Math.PI*2);ctx.moveTo(hy.x-5,hy.y);ctx.lineTo(hy.x+5,hy.y);ctx.moveTo(hy.x,hy.y-5);ctx.lineTo(hy.x,hy.y+5);} else if(hy.type==='cleanout'){ctx.arc(hy.x,hy.y,6,0,Math.PI*2);} else if(hy.type==='heater'){ctx.rect(hy.x-7,hy.y-9,14,18);} else if(hy.type==='toilet'){ctx.ellipse(hy.x,hy.y+2,7,9,0,0,Math.PI*2);ctx.rect(hy.x-5,hy.y-10,10,5);} else if(hy.type==='shower'){ctx.arc(hy.x,hy.y,8,0,Math.PI*2);ctx.moveTo(hy.x-5,hy.y+5);ctx.lineTo(hy.x+5,hy.y+5);} else {ctx.moveTo(hy.x-8,hy.y);ctx.lineTo(hy.x+6,hy.y);ctx.lineTo(hy.x+6,hy.y-5);} ctx.fill();ctx.stroke();ctx.restore();
        } else if (hy.type === 'cold_water' || hy.type === 'hot_water') {
          ctx.fillStyle = '#06B6D4';
          ctx.beginPath();
          ctx.arc(hy.x, hy.y, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '7px sans-serif';
          ctx.fillText('AF', hy.x - 4, hy.y + 3);
        } else if (hy.type === 'sewage' || hy.type === 'drain') {
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

    if (dragRef.current && currentMouse) {
      const drag = dragRef.current; ctx.save(); ctx.globalAlpha = 0.55; ctx.strokeStyle = '#5B9BFF'; ctx.fillStyle = '#5B9BFF'; ctx.lineWidth = 4; ctx.setLineDash([5, 3]);
      if (drag.kind === 'wall') { const w = project.walls.find(item => item.id === drag.id); if (w) { const dx = currentMouse.x - drag.x, dy = currentMouse.y - drag.y; ctx.beginPath(); ctx.moveTo(w.x1 + dx, w.y1 + dy); ctx.lineTo(w.x2 + dx, w.y2 + dy); ctx.stroke(); } }
      else if (drag.kind === 'furniture') { const item=(project.furniture??[]).find(o=>o.id===drag.id); if(item){ctx.save();ctx.translate(item.x+currentMouse.x-drag.x,item.y+currentMouse.y-drag.y);ctx.rotate(item.rotation*Math.PI/180);ctx.strokeRect(-item.widthIn*(40/39.37)/2,-item.depthIn*(40/39.37)/2,item.widthIn*(40/39.37),item.depthIn*(40/39.37));ctx.restore();} }
      else { const item = drag.kind === 'opening' ? project.openings.find(o => o.id === drag.id) : drag.kind === 'electrical' ? project.electrical.find(o => o.id === drag.id) : project.hydraulic.find(o => o.id === drag.id); if (item) { ctx.beginPath(); ctx.arc(item.x + currentMouse.x - drag.x, item.y + currentMouse.y - drag.y, 12, 0, Math.PI * 2); ctx.stroke(); } }
      ctx.restore();
    }
    // Highlight selected objects for clear visual feedback.
    if(selectionRect){ctx.save();ctx.fillStyle='rgba(91,155,255,.15)';ctx.strokeStyle='#5B9BFF';ctx.setLineDash([5,3]);ctx.fillRect(selectionRect.x1,selectionRect.y1,selectionRect.x2-selectionRect.x1,selectionRect.y2-selectionRect.y1);ctx.strokeRect(selectionRect.x1,selectionRect.y1,selectionRect.x2-selectionRect.x1,selectionRect.y2-selectionRect.y1);ctx.restore();}
    if (selectedObjects.length) {
      ctx.save();
      ctx.strokeStyle = '#5B9BFF';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 3]);
      selectedObjects.forEach((selection) => {
        if (selection.kind === 'wall') {
          const wall = project.walls.find(item => item.id === selection.id);
          if (!wall) return;
          ctx.beginPath();
          ctx.moveTo(wall.x1, wall.y1);
          ctx.lineTo(wall.x2, wall.y2);
          ctx.stroke();
          return;
        }
        if(selection.kind==='furniture'){const item=(project.furniture??[]).find(value=>value.id===selection.id);if(!item)return;ctx.save();ctx.translate(item.x,item.y);ctx.rotate(item.rotation*Math.PI/180);ctx.strokeRect(-item.widthIn*(40/39.37)/2,-item.depthIn*(40/39.37)/2,item.widthIn*(40/39.37),item.depthIn*(40/39.37));ctx.restore();return;}
        const item = selection.kind === 'opening' ? project.openings.find(value => value.id === selection.id) : selection.kind === 'electrical' ? project.electrical.find(value => value.id === selection.id) : project.hydraulic.find(value => value.id === selection.id);
        if (!item) return;
        ctx.beginPath(); ctx.arc(item.x, item.y, 15, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.restore();
    }
    if (selectedObject) {
      ctx.save(); ctx.strokeStyle = '#5B9BFF'; ctx.lineWidth = 3; ctx.setLineDash([5, 3]);
      if (selectedObject.kind === 'wall') { const w = project.walls.find(item => item.id === selectedObject.id); if (w) { ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); ctx.stroke(); } }
      else if(selectedObject.kind==='furniture'){const item=(project.furniture??[]).find(o=>o.id===selectedObject.id);if(item){ctx.translate(item.x,item.y);ctx.rotate(item.rotation*Math.PI/180);ctx.strokeRect(-item.widthIn*(40/39.37)/2,-item.depthIn*(40/39.37)/2,item.widthIn*(40/39.37),item.depthIn*(40/39.37));}}
      else { const item = selectedObject.kind === 'opening' ? project.openings.find(o => o.id === selectedObject.id) : selectedObject.kind === 'electrical' ? project.electrical.find(o => o.id === selectedObject.id) : project.hydraulic.find(o => o.id === selectedObject.id); if (item) { ctx.beginPath(); ctx.arc(item.x, item.y, 15, 0, Math.PI * 2); ctx.stroke(); } }
      ctx.restore();
    }
    if (placementRef.current && currentMouse && tool !== 'wall') {
      const p = (tool === 'door' || tool === 'window' || gapEnabled) ? snapToNearestWall(currentMouse.x, currentMouse.y) : {x:currentMouse.x,y:currentMouse.y,rotation:0,wallId:''}; ctx.save(); ctx.globalAlpha = 0.65; ctx.setLineDash([4, 3]); ctx.strokeStyle = '#5B9BFF'; ctx.fillStyle = '#5B9BFF';
      if (tool === 'door' || tool === 'window') { ctx.translate(p.x, p.y); ctx.rotate(p.rotation * Math.PI / 180); ctx.beginPath(); if (tool === 'door') { ctx.arc(0, 0, 25, 0, Math.PI / 2); ctx.moveTo(0, 0); ctx.lineTo(25, 0); } else { ctx.moveTo(-20, 0); ctx.lineTo(20, 0); } ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, tool === 'cold_water' ? 9 : 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      ctx.restore();
    }

    // Furniture symbols use the original CC0 top-view SVG assets from FloorPlanner.
    (showFurnitureLayer ? (project.furniture ?? []) : []).forEach((item) => {
      const width = item.widthIn * (40 / 39.37);
      const depth = item.depthIn * (40 / 39.37);
      const drawFallback = () => {
        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.rotate((item.rotation * Math.PI) / 180);
        ctx.fillStyle = '#D6C2A8';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.fillRect(-width / 2, -depth / 2, width, depth);
        ctx.strokeRect(-width / 2, -depth / 2, width, depth);
        ctx.restore();
      };
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.rotate((item.rotation * Math.PI) / 180);
        ctx.drawImage(img, -width / 2, -depth / 2, width, depth);
        ctx.restore();
      };
      img.onerror = drawFallback;
      img.src = item.symbolUrl;
      // Keep a visible, dimensionally scaled footprint while the original SVG loads.
      drawFallback();
    });

    if (tool === 'wall' && wallDrawMode === 'sequence' && wallSequencePoints.length) {
      ctx.save(); ctx.strokeStyle = '#3DD68C'; ctx.fillStyle = '#3DD68C'; ctx.lineWidth = 4; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(wallSequencePoints[0].x, wallSequencePoints[0].y);
      wallSequencePoints.slice(1).forEach(point => ctx.lineTo(point.x, point.y));
      if (currentMouse) ctx.lineTo(currentMouse.x, currentMouse.y);
      ctx.stroke(); ctx.setLineDash([]);
      wallSequencePoints.forEach((point, index) => { ctx.beginPath(); ctx.arc(point.x, point.y, index === 0 ? 7 : 5, 0, Math.PI * 2); ctx.fill(); });
      ctx.restore();
    }
    // Preview every wall connected to a dragged vertex, with live length and angle.
    if (dragRef.current?.kind === 'wall' && dragRef.current.endpoint && currentMouse) {
      const drag = dragRef.current;
      const draggedWall = project.walls.find(w => w.id === drag.id);
      if (draggedWall) {
        const oldX = drag.endpoint === 1 ? draggedWall.x1 : draggedWall.x2;
        const oldY = drag.endpoint === 1 ? draggedWall.y1 : draggedWall.y2;
        const newX = gapEnabled ? snap(currentMouse.x) : currentMouse.x;
        const newY = gapEnabled ? snap(currentMouse.y) : currentMouse.y;
        ctx.save(); ctx.strokeStyle = '#34D399'; ctx.fillStyle = '#34D399'; ctx.lineWidth = 4; ctx.setLineDash([6,4]);
        project.walls.filter(w => Math.hypot(w.x1-oldX,w.y1-oldY)<2 || Math.hypot(w.x2-oldX,w.y2-oldY)<2).forEach(w => {
          const a = Math.hypot(w.x1-oldX,w.y1-oldY)<2 ? {x:newX,y:newY} : {x:w.x1,y:w.y1};
          const b = Math.hypot(w.x2-oldX,w.y2-oldY)<2 ? {x:newX,y:newY} : {x:w.x2,y:w.y2};
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
          const label=(Math.hypot(b.x-a.x,b.y-a.y)/40).toFixed(2)+' m · '+(Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI).toFixed(1)+'°';
          ctx.setLineDash([]); ctx.font='10px Roboto, sans-serif'; const tw=ctx.measureText(label).width+8;
          ctx.fillStyle='rgba(15,23,42,.94)'; ctx.fillRect((a.x+b.x)/2-tw/2,(a.y+b.y)/2-20,tw,16);
          ctx.fillStyle='#6EE7B7'; ctx.textAlign='center'; ctx.fillText(label,(a.x+b.x)/2,(a.y+b.y)/2-9); ctx.setLineDash([6,4]);
        });
        ctx.setLineDash([]); ctx.beginPath(); ctx.arc(newX,newY,7,0,Math.PI*2); ctx.fill(); ctx.restore();
      }
    }
    if (dragRef.current?.kind === 'wall' && !dragRef.current.endpoint && currentMouse) {
      const drag=dragRef.current, wall=project.walls.find(w=>w.id===drag.id);
      if(wall){
        let dx=currentMouse.x-drag.x,dy=currentMouse.y-drag.y;
        let best=gapDistance+6,adjustment:{x:number;y:number}|null=null;
        if(gapEnabled) {
          const proposed=[{x:wall.x1+dx,y:wall.y1+dy},{x:wall.x2+dx,y:wall.y2+dy}];
          for (const otherWall of project.walls) {
            if (otherWall.id === wall.id) continue;
            const vertices = [{ x: otherWall.x1, y: otherWall.y1 }, { x: otherWall.x2, y: otherWall.y2 }];
            for (const vertex of vertices) {
              for (const point of proposed) {
                const distance = Math.hypot(point.x - vertex.x, point.y - vertex.y);
                if (distance < best) {
                  best = distance;
                  adjustment = { x: vertex.x - point.x, y: vertex.y - point.y };
                }
              }
            }
          }
        }
        if(adjustment){dx+=adjustment.x;dy+=adjustment.y;}
        ctx.save();ctx.strokeStyle='#34D399';ctx.lineWidth=5;ctx.setLineDash([7,4]);
        ctx.beginPath();ctx.moveTo(wall.x1+dx,wall.y1+dy);ctx.lineTo(wall.x2+dx,wall.y2+dy);ctx.stroke();ctx.setLineDash([]);
        if(adjustment){ctx.fillStyle='#34D399';ctx.beginPath();ctx.arc(wall.x1+dx,wall.y1+dy,7,0,Math.PI*2);ctx.arc(wall.x2+dx,wall.y2+dy,7,0,Math.PI*2);ctx.fill();}
        const label=(Math.hypot(wall.x2-wall.x1,wall.y2-wall.y1)/40).toFixed(2)+' m · '+(Math.atan2(wall.y2-wall.y1,wall.x2-wall.x1)*180/Math.PI).toFixed(1)+'°';
        ctx.font='10px Roboto, sans-serif';const tw=ctx.measureText(label).width+8;ctx.fillStyle='rgba(15,23,42,.94)';ctx.fillRect((wall.x1+wall.x2)/2+dx-tw/2,(wall.y1+wall.y2)/2+dy-20,tw,16);ctx.fillStyle='#6EE7B7';ctx.textAlign='center';ctx.fillText(label,(wall.x1+wall.x2)/2+dx,(wall.y1+wall.y2)/2+dy-9);ctx.restore();
      }
    }
    // Preview the next segment of a multi-vertex route without mutating saved geometry.
    if (routeSequencePoints.length && currentMouse && ['wire','conduit','water_pipe','sewage_pipe','vent_pipe','rain_pipe'].includes(tool)) {
      const last = routeSequencePoints[routeSequencePoints.length - 1];
      if (Math.hypot(currentMouse.x-last.x,currentMouse.y-last.y)>1) {
        ctx.save(); ctx.strokeStyle=tool==='sewage_pipe'?'#A16207':tool==='rain_pipe'?'#2563EB':tool==='vent_pipe'?'#A78BFA':tool==='wire'?'#FACC15':tool==='conduit'?'#F59E0B':'#06B6D4';
        ctx.lineWidth=tool==='sewage_pipe'?4:3; ctx.setLineDash(['sewage_pipe','rain_pipe','wire'].includes(tool)?[6,3]:[]);
        ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(currentMouse.x,currentMouse.y);ctx.stroke();ctx.restore();
      }
      ctx.save();ctx.fillStyle='#F8FAFC';ctx.strokeStyle='#3B82F6';ctx.lineWidth=2;
      routeSequencePoints.forEach(point=>{ctx.beginPath();ctx.arc(point.x,point.y,4,0,Math.PI*2);ctx.fill();ctx.stroke();});ctx.restore();
    }

    if (isDrawing && startPoint && currentMouse && tool === 'wall' && wallDrawMode === 'segment') {
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
    selectedObject,
    selectedObjects,
    selectionRect,
    canvasPan,
    showFurnitureLayer,
    wallDrawMode,
    wallSequencePoints,
    showWallVertices,
    isNightMode,
  ]);

  const snap = (coord: number) => gapEnabled ? Math.round(coord / gapDistance) * gapDistance : coord;
  const snapToNearestWall = (x: number, y: number) => {
    let best = { x, y, rotation: 0, distance: Number.POSITIVE_INFINITY, wallId: '' };
    for (const wall of project.walls) {
      const vx = wall.x2 - wall.x1, vy = wall.y2 - wall.y1;
      const len2 = vx * vx + vy * vy || 1;
      let t = Math.max(0, Math.min(1, ((x - wall.x1) * vx + (y - wall.y1) * vy) / len2));
      const rawX = wall.x1 + t * vx, rawY = wall.y1 + t * vy;
      const distance = Math.hypot(x - rawX, y - rawY);
      if (gapEnabled && len2 > 1) {
        const length = Math.sqrt(len2);
        const stepT = gapDistance / length;
        t = Math.max(0, Math.min(1, Math.round(t / stepT) * stepT));
      }
      const px = wall.x1 + t * vx, py = wall.y1 + t * vy;
      if (distance < best.distance) best = { x: px, y: py, rotation: Math.atan2(vy, vx) * 180 / Math.PI, distance, wallId: wall.id };
    }
    return best.distance <= 64 ? best : { x, y, rotation: 0, distance: best.distance, wallId: '' };
  };
  const activeKind = (): 'opening' | 'electrical' | 'hydraulic' | null => {
    if (tool === 'door' || tool === 'window') return 'opening';
    if (['socket','light','switch','panel','data_point','grounding','solar_panel'].includes(tool)) return 'electrical';
    if (['cold_water','hot_water','water_pipe','sewage_pipe','vent_pipe','rain_pipe','sink','faucet','shower','toilet','floor_drain','cleanout','inspection_box','tank','heater','grease_trap','pool'].includes(tool)) return 'hydraulic';
    return null;
  };

  const handleMouseDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointersRef.current.size >= 2) {
      const points = [...activePointersRef.current.values()];
      const centerX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
      const centerY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
      const a=points[0], b=points[1]; panGestureRef.current = { x: canvasPan.x, y: canvasPan.y, centerX, centerY, distance:Math.hypot(a.x-b.x,a.y-b.y), zoom };
      dragRef.current = null; placementRef.current = false;
      setIsDrawing(false); setStartPoint(null); setCurrentMouse(null);
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = snap((e.clientX - rect.left - canvasPan.x) / zoom);
    const y = snap((e.clientY - rect.top - canvasPan.y) / zoom);

    if ((tool === 'select' || tool === 'wall') && showWallVertices) {
      const vertexHit = project.walls.flatMap(w => [
        { wall: w, endpoint: 1 as const, x: w.x1, y: w.y1 },
        { wall: w, endpoint: 2 as const, x: w.x2, y: w.y2 },
      ]).reverse().find(v => Math.hypot(v.x - x, v.y - y) <= 12);
      if (vertexHit) {
        const target = { kind: 'wall' as const, id: vertexHit.wall.id };
        setSelectedObject(target);
        setSelectedObjects([target]);
        dragRef.current = vertexHit.wall.locked ? null : { ...target, x: vertexHit.x, y: vertexHit.y, endpoint: vertexHit.endpoint };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
    }

    if (tool === 'select') { const furnitureHits=(showFurnitureLayer?(project.furniture??[]):[]).filter(item=>{const dx=x-item.x,dy=y-item.y,angle=-(item.rotation*Math.PI/180),localX=dx*Math.cos(angle)+dy*Math.sin(angle),localY=-dx*Math.sin(angle)+dy*Math.cos(angle);return Math.abs(localX)<=item.widthIn*(40/39.37)/2+5&&Math.abs(localY)<=item.depthIn*(40/39.37)/2+5;}).map(item=>({kind:'furniture' as const,id:item.id,x:item.x,y:item.y})); const hit=[...project.openings.map(o=>({kind:'opening' as const,id:o.id,x:o.x,y:o.y})),...project.electrical.map(o=>({kind:'electrical' as const,id:o.id,x:o.x,y:o.y})),...project.hydraulic.map(o=>({kind:'hydraulic' as const,id:o.id,x:o.x,y:o.y})),...project.walls.map(w=>({kind:'wall' as const,id:w.id,x:(w.x1+w.x2)/2,y:(w.y1+w.y2)/2})),...furnitureHits].reverse().find(o=>o.kind==='furniture'||Math.hypot(o.x-x,o.y-y)<20); if(hit){const hitItem=hit.kind==='wall'?project.walls.find(v=>v.id===hit.id):hit.kind==='opening'?project.openings.find(v=>v.id===hit.id):hit.kind==='electrical'?project.electrical.find(v=>v.id===hit.id):hit.kind==='hydraulic'?project.hydraulic.find(v=>v.id===hit.id):(project.furniture??[]).find(v=>v.id===hit.id);if(hitItem?.locked){const target={kind:hit.kind,id:hit.id};setSelectedObject(target);setSelectedObjects([target]);dragRef.current=null;e.currentTarget.setPointerCapture(e.pointerId);return;}const target={kind:hit.kind,id:hit.id};setSelectedObjects(prev=>e.shiftKey?(prev.some(s=>s.id===hit.id&&s.kind===hit.kind)?prev.filter(s=>s.id!==hit.id):[...prev,target]):(prev.some(s=>s.id===hit.id&&s.kind===hit.kind)?prev:[target]));setSelectedObject(target);dragRef.current={...target,x,y};selectionStartRef.current=null;}else{selectionStartRef.current={x,y};setSelectionRect({x1:x,y1:y,x2:x,y2:y});setIsDrawing(true);if(!e.shiftKey){setSelectedObjects([]);setSelectedObject(null);}} e.currentTarget.setPointerCapture(e.pointerId);return; }
    if (tool === 'wall' && wallDrawMode === 'sequence') {
      const points = wallSequencePoints;
      const existingVertices = project.walls.flatMap(w => [{ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }]);
      const nearestVertex = (p: {x:number;y:number}) => {
        let best: {x:number;y:number;distance:number} | null = null;
        for (const vertex of existingVertices) {
          const distance = Math.hypot(vertex.x - p.x, vertex.y - p.y);
          if (distance <= 18 && (!best || distance < best.distance)) best = { ...vertex, distance };
        }
        return best ? { x: best.x, y: best.y } : p;
      };
      const clicked = nearestVertex({ x, y });
      if (!points.length) {
        setWallSequencePoints([clicked]); setCurrentMouse(clicked);
      } else {
        const first = points[0];
        const returnsToStart = Math.hypot(clicked.x - first.x, clicked.y - first.y) <= 18;
        const joinsExistingVertex = points.length >= 2 && existingVertices.some(v => Math.hypot(v.x-clicked.x, v.y-clicked.y) <= 8);
        const closesRoom = points.length >= 2 && (returnsToStart || joinsExistingVertex);
        const end = returnsToStart ? first : clicked;
        const previous = points[points.length - 1];
        const alreadyExists = project.walls.some(w =>
          (Math.hypot(w.x1-previous.x,w.y1-previous.y)<2 && Math.hypot(w.x2-end.x,w.y2-end.y)<2) ||
          (Math.hypot(w.x2-previous.x,w.y2-previous.y)<2 && Math.hypot(w.x1-end.x,w.y1-end.y)<2)
        );
        const addedWalls = Math.hypot(end.x - previous.x, end.y - previous.y) > 1 && !alreadyExists
          ? [{ id: ensureUuid('wall'), x1: previous.x, y1: previous.y, x2: end.x, y2: end.y, thickness: 15 } as WallSegment]
          : [];
        const nextWalls = [...project.walls, ...addedWalls];
        let nextRooms = project.rooms ?? [];
        if (closesRoom) {
          const vertices = [...points, ...(returnsToStart ? [] : [end])];
          const uniqueVertices = vertices.filter((p, i) => i === 0 || Math.hypot(p.x - vertices[i-1].x, p.y - vertices[i-1].y) > 1);
          if (uniqueVertices.length >= 3) {
            const room: FloorPlanRoom = { id: ensureUuid('room'), name: 'Novo cômodo', vertices: uniqueVertices, material: 'concrete' };
            nextRooms = [...nextRooms, room];
            // Open the room editor after the new project snapshot is committed.
            createdRoomId = room.id;
          }
        }
        if (addedWalls.length || nextRooms !== (project.rooms ?? [])) updateProjectState({ ...project, walls: nextWalls, rooms: nextRooms });
        if (closesRoom) { setWallSequencePoints([]); setCurrentMouse(null); }
        else setWallSequencePoints([...points, end]);
      }
      e.currentTarget.setPointerCapture(e.pointerId); return;
    }
    if (['wire','conduit','water_pipe','sewage_pipe','vent_pipe','rain_pipe'].includes(tool)) {
      placementRef.current=false;
      const routeTypes=['wire','conduit','water_pipe','sewage_pipe','vent_pipe','rain_pipe'];
      const endpoints=[...project.electrical.filter(item=>routeTypes.includes(item.type)&&item.x2!==undefined&&item.y2!==undefined).flatMap(item=>[{x:item.x,y:item.y},{x:item.x2 as number,y:item.y2 as number}]),...project.hydraulic.filter(item=>routeTypes.includes(item.type)&&item.x2!==undefined&&item.y2!==undefined).flatMap(item=>[{x:item.x,y:item.y},{x:item.x2 as number,y:item.y2 as number}]),...project.walls.flatMap(w=>[{x:w.x1,y:w.y1},{x:w.x2,y:w.y2}])];
      const nearest=endpoints.reduce((best,point)=>{const distance=Math.hypot(point.x-x,point.y-y);return distance<=18&&(!best||distance<best.distance)?{x:point.x,y:point.y,distance}:best;},null as ({x:number;y:number;distance:number}|null));
      const clicked=nearest?{x:nearest.x,y:nearest.y}:{x,y};
      if(!routeSequencePoints.length){setRouteSequencePoints([clicked]);setCurrentMouse(clicked);}
      else {const last=routeSequencePoints[routeSequencePoints.length-1];if(Math.hypot(clicked.x-last.x,clicked.y-last.y)<=6){setRouteSequencePoints([]);setCurrentMouse(null);setIsDrawing(false);e.currentTarget.setPointerCapture(e.pointerId);return;}
        const routeId=ensureUuid(tool);
        if(tool==='wire'||tool==='conduit'){const route:ElectricalItem={id:routeId,type:tool as ElectricalItem['type'],x:last.x,y:last.y,x2:clicked.x,y2:clicked.y,circuit:'Circuito 1',label:tool==='wire'?'Fiação elétrica':'Eletroduto elétrico'};updateProjectState({...project,electrical:[...project.electrical,route]});setSelectedObject({kind:'electrical',id:routeId});}
        else {const route:HydraulicItem={id:routeId,type:tool as HydraulicItem['type'],x:last.x,y:last.y,x2:clicked.x,y2:clicked.y,diameterMm:tool==='sewage_pipe'?100:tool==='rain_pipe'?75:tool==='vent_pipe'?50:25,label:tool==='sewage_pipe'?'Tubulação de esgoto Ø100mm':tool==='rain_pipe'?'Águas pluviais Ø75mm':tool==='vent_pipe'?'Ventilação sanitária Ø50mm':'Tubulação de água Ø25mm'};updateProjectState({...project,hydraulic:[...project.hydraulic,route]});setSelectedObject({kind:'hydraulic',id:routeId});}
        setRouteSequencePoints([...routeSequencePoints,clicked]);setCurrentMouse(clicked);setIsDrawing(false);setStartPoint(null);
      }
      e.currentTarget.setPointerCapture(e.pointerId);return;
    }
    const kind = activeKind();
    if (kind) {
      const threshold = 18;
      const opening = kind === 'opening' ? [...project.openings].reverse().find(o => Math.hypot(o.x - x, o.y - y) <= threshold) : undefined;
      const electrical = kind === 'electrical' ? [...project.electrical].reverse().find(o => o.type === tool && Math.hypot(o.x - x, o.y - y) <= threshold) : undefined;
      const hydraulic = kind === 'hydraulic' ? [...project.hydraulic].reverse().find(o => Math.hypot(o.x - x, o.y - y) <= threshold) : undefined;
      const target = opening ? { kind: 'opening' as const, id: opening.id } : electrical ? { kind: 'electrical' as const, id: electrical.id } : hydraulic ? { kind: 'hydraulic' as const, id: hydraulic.id } : null;
      if (target) { const locked = target.kind === 'opening' ? opening?.locked : target.kind === 'electrical' ? electrical?.locked : hydraulic?.locked; setSelectedObject(target); dragRef.current = locked ? null : { ...target, x, y }; placementRef.current = false; }
      else { setSelectedObject(null); dragRef.current = null; placementRef.current = true; setIsDrawing(true); setStartPoint({ x, y }); setCurrentMouse({ x, y }); }
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    if (tool === 'wall' && wallDrawMode === 'segment') {
      const wall = [...project.walls].reverse().find(w => {
        const vx = w.x2 - w.x1, vy = w.y2 - w.y1, len2 = vx * vx + vy * vy || 1;
        const t = Math.max(0, Math.min(1, ((x - w.x1) * vx + (y - w.y1) * vy) / len2));
        return Math.hypot(x - (w.x1 + t * vx), y - (w.y1 + t * vy)) <= 16;
      });
      if (wall) { const target = { kind: 'wall' as const, id: wall.id }; setSelectedObject(target); dragRef.current = wall.locked ? null : { ...target, x, y }; e.currentTarget.setPointerCapture(e.pointerId); return; }
      setSelectedObject(null);
      const nearestStart = snapToNearestWall(x, y);
      const start = nearestStart.distance <= 16 ? { x: nearestStart.x, y: nearestStart.y } : { x, y };
      setIsDrawing(true);
      setStartPoint(start);
      setCurrentMouse(start);
    }
  };

  const handleMouseMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointersRef.current.has(e.pointerId)) activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (panGestureRef.current && activePointersRef.current.size >= 2) {
      const points = [...activePointersRef.current.values()];
      const centerX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
      const centerY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
      const a=points[0], b=points[1], distance=Math.hypot(a.x-b.x,a.y-b.y); setCanvasPan({ x: panGestureRef.current.x + centerX - panGestureRef.current.centerX, y: panGestureRef.current.y + centerY - panGestureRef.current.centerY }); setZoom(Math.max(0.35,Math.min(3,panGestureRef.current.zoom*distance/Math.max(1,panGestureRef.current.distance))));
      return;
    }
    if (activePointersRef.current.size >= 2) return;
    if (tool === 'wall' && wallDrawMode === 'sequence' && wallSequencePoints.length) {
      const rect = e.currentTarget.getBoundingClientRect();
      setCurrentMouse({ x: snap((e.clientX - rect.left - canvasPan.x) / zoom), y: snap((e.clientY - rect.top - canvasPan.y) / zoom) });
      return;
    }
    if (['wire','conduit','water_pipe','sewage_pipe','vent_pipe','rain_pipe'].includes(tool) && routeSequencePoints.length) {
      const rect=e.currentTarget.getBoundingClientRect();const x=snap((e.clientX-rect.left-canvasPan.x)/zoom),y=snap((e.clientY-rect.top-canvasPan.y)/zoom);
      const routeTypes=['wire','conduit','water_pipe','sewage_pipe','vent_pipe','rain_pipe'];
      const endpoints=[...project.electrical.filter(item=>routeTypes.includes(item.type)&&item.x2!==undefined&&item.y2!==undefined).flatMap(item=>[{x:item.x,y:item.y},{x:item.x2 as number,y:item.y2 as number}]),...project.hydraulic.filter(item=>routeTypes.includes(item.type)&&item.x2!==undefined&&item.y2!==undefined).flatMap(item=>[{x:item.x,y:item.y},{x:item.x2 as number,y:item.y2 as number}]),...project.walls.flatMap(w=>[{x:w.x1,y:w.y1},{x:w.x2,y:w.y2}])];
      const nearest=endpoints.reduce((best,point)=>{const distance=Math.hypot(point.x-x,point.y-y);return distance<=18&&(!best||distance<best.distance)?{x:point.x,y:point.y,distance}:best;},null as ({x:number;y:number;distance:number}|null));
      setCurrentMouse(nearest?{x:nearest.x,y:nearest.y}:{x,y});return;
    }
    if (tool === 'select' && selectionStartRef.current) { const r=e.currentTarget.getBoundingClientRect(); setSelectionRect({x1:selectionStartRef.current.x,y1:selectionStartRef.current.y,x2:snap((e.clientX-r.left-canvasPan.x)/zoom),y2:snap((e.clientY-r.top-canvasPan.y)/zoom)}); return; }
    if (dragRef.current || placementRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      setCurrentMouse({ x: snap((e.clientX - rect.left - canvasPan.x) / zoom), y: snap((e.clientY - rect.top - canvasPan.y) / zoom) });
      return;
    }
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = snap((e.clientX - rect.left - canvasPan.x) / zoom);
    const y = snap((e.clientY - rect.top - canvasPan.y) / zoom);
    if (tool === 'wall' && wallDrawMode === 'segment') {
      const nearest = snapToNearestWall(x, y);
      if (nearest.distance <= 16) { setCurrentMouse({ x: nearest.x, y: nearest.y }); return; }
    }
    setCurrentMouse({ x, y });
  };

  const handleMouseUp = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if(e?.type==='lostpointercapture')return;
    if(e?.type==='pointercancel'){activePointersRef.current.delete(e.pointerId);dragRef.current=null;placementRef.current=false;selectionStartRef.current=null;setSelectionRect(null);setIsDrawing(false);setStartPoint(null);setCurrentMouse(null);return;}
    if (e) activePointersRef.current.delete(e.pointerId);
    if(tool==='select'&&selectionStartRef.current&&e){const r=e.currentTarget.getBoundingClientRect(),x2=snap((e.clientX-r.left-canvasPan.x)/zoom),y2=snap((e.clientY-r.top-canvasPan.y)/zoom),s=selectionStartRef.current;if(Math.hypot(x2-s.x,y2-s.y)>8){const inside=(x:number,y:number)=>x>=Math.min(s.x,x2)&&x<=Math.max(s.x,x2)&&y>=Math.min(s.y,y2)&&y<=Math.max(s.y,y2);const found=[...project.walls.filter(w=>inside((w.x1+w.x2)/2,(w.y1+w.y2)/2)).map(w=>({kind:'wall' as const,id:w.id})),...project.openings.filter(o=>inside(o.x,o.y)).map(o=>({kind:'opening' as const,id:o.id})),...project.electrical.filter(o=>inside(o.x,o.y)).map(o=>({kind:'electrical' as const,id:o.id})),...project.hydraulic.filter(o=>inside(o.x,o.y)).map(o=>({kind:'hydraulic' as const,id:o.id})),...(project.furniture??[]).filter(o=>inside(o.x,o.y)).map(o=>({kind:'furniture' as const,id:o.id}))];setSelectedObjects(found);setSelectedObject(found[0]||null);}selectionStartRef.current=null;setSelectionRect(null);setIsDrawing(false);setCurrentMouse(null);return;}
    if (panGestureRef.current) {
      if (activePointersRef.current.size < 2) panGestureRef.current = null;
      if (e && activePointersRef.current.size > 0) return;
      if (activePointersRef.current.size === 0) { panGestureRef.current = null; setIsDrawing(false); setStartPoint(null); setCurrentMouse(null); return; }
    }
    if (dragRef.current && e) {
      const drag = dragRef.current;
      const rect = e.currentTarget.getBoundingClientRect();
      const endX = snap((e.clientX - rect.left - canvasPan.x) / zoom), endY = snap((e.clientY - rect.top - canvasPan.y) / zoom);
      const dx = endX - drag.x, dy = endY - drag.y;
      if (drag.kind === 'wall' && drag.endpoint && (dx || dy)) {
        const wall=project.walls.find(w=>w.id===drag.id);
        if(wall){
          const oldX=drag.endpoint===1?wall.x1:wall.x2,oldY=drag.endpoint===1?wall.y1:wall.y2;
          const newX=gapEnabled?snap(endX):endX,newY=gapEnabled?snap(endY):endY;
          const connectedWalls=project.walls.filter(w=>Math.hypot(w.x1-oldX,w.y1-oldY)<2||Math.hypot(w.x2-oldX,w.y2-oldY)<2);
          const movedWallIds=new Set(connectedWalls.map(w=>w.id));
          const walls=project.walls.map(w=>({...w,...(Math.hypot(w.x1-oldX,w.y1-oldY)<2?{x1:newX,y1:newY}:{}),...(Math.hypot(w.x2-oldX,w.y2-oldY)<2?{x2:newX,y2:newY}:{})}));
          const rooms=(project.rooms??[]).map(room=>({...room,vertices:room.vertices.map(p=>Math.hypot(p.x-oldX,p.y-oldY)<2?{x:newX,y:newY}:p)}));
          const projectPointAlongMovedWall=(point:{x:number;y:number},oldWall:WallSegment)=>{const vx=oldWall.x2-oldWall.x1,vy=oldWall.y2-oldWall.y1,len2=vx*vx+vy*vy||1;const t=Math.max(0,Math.min(1,((point.x-oldWall.x1)*vx+(point.y-oldWall.y1)*vy)/len2));const distance=Math.hypot(point.x-(oldWall.x1+t*vx),point.y-(oldWall.y1+t*vy));if(distance>28)return null;const nextWall=walls.find(w=>w.id===oldWall.id)!;return {point:{x:nextWall.x1+t*(nextWall.x2-nextWall.x1),y:nextWall.y1+t*(nextWall.y2-nextWall.y1)},distance,rotation:Math.atan2(nextWall.y2-nextWall.y1,nextWall.x2-nextWall.x1)*180/Math.PI};};
          const moveAttachedPoint=(point:{x:number;y:number},preferredWallId?:string)=>{const candidates=connectedWalls.filter(w=>!preferredWallId||w.id===preferredWallId).map(w=>({wall:w,result:projectPointAlongMovedWall(point,w)})).filter((item):item is {wall:WallSegment;result:NonNullable<ReturnType<typeof projectPointAlongMovedWall>>}=>!!item.result).sort((a,b)=>a.result.distance-b.result.distance);return candidates.length?{...candidates[0].result,wallId:candidates[0].wall.id}:null;};
          const openings=moveAttachedParts?project.openings.map(item=>{const moved=moveAttachedPoint({x:item.x,y:item.y},movedWallIds.has(item.wallId)?item.wallId:undefined);return moved?{...item,x:moved.point.x,y:moved.point.y,rotation:moved.rotation,wallId:moved.wallId}:item;}):project.openings;
          const electrical=moveAttachedParts?project.electrical.map(item=>{const moved=moveAttachedPoint({x:item.x,y:item.y});const endMoved=item.x2!==undefined&&item.y2!==undefined?moveAttachedPoint({x:item.x2,y:item.y2}):null;return moved?{...item,x:moved.point.x,y:moved.point.y,...(endMoved?{x2:endMoved.point.x,y2:endMoved.point.y}:{}),...(item.rotation!==undefined?{rotation:moved.rotation}:{})}:endMoved?{...item,x2:endMoved.point.x,y2:endMoved.point.y}:item;}):project.electrical;
          const hydraulic=moveAttachedParts?project.hydraulic.map(item=>{const moved=moveAttachedPoint({x:item.x,y:item.y});const endMoved=item.x2!==undefined&&item.y2!==undefined?moveAttachedPoint({x:item.x2,y:item.y2}):null;return moved?{...item,x:moved.point.x,y:moved.point.y,...(endMoved?{x2:endMoved.point.x,y2:endMoved.point.y}:{})}:endMoved?{...item,x2:endMoved.point.x,y2:endMoved.point.y}:item;}):project.hydraulic;
          updateProjectState({...project,walls,rooms,openings,electrical,hydraulic});
        }
      } else if ((dx || dy) && tool === 'select' && selectedObjects.length > 1 && selectedObjects.some(s=>s.id===drag.id&&s.kind===drag.kind)) {
        const ids=(kind:string)=>new Set(selectedObjects.filter(s=>s.kind===kind).map(s=>s.id)); const walls=ids('wall'), openings=ids('opening'), electrical=ids('electrical'), hydraulic=ids('hydraulic'), furniture=ids('furniture');
        updateProjectState({...project,walls:project.walls.map(w=>walls.has(w.id)?{...w,x1:w.x1+dx,y1:w.y1+dy,x2:w.x2+dx,y2:w.y2+dy}:w),openings:project.openings.map(o=>openings.has(o.id)?{...o,x:o.x+dx,y:o.y+dy}:o),electrical:project.electrical.map(o=>electrical.has(o.id)?{...o,x:o.x+dx,y:o.y+dy}:o),hydraulic:project.hydraulic.map(o=>hydraulic.has(o.id)?{...o,x:o.x+dx,y:o.y+dy}:o),furniture:(project.furniture??[]).map(o=>furniture.has(o.id)?{...o,x:o.x+dx,y:o.y+dy}:o)});
      } else if (dx || dy) {
        if (drag.kind === 'wall') {
          const movedWall = project.walls.find(w => w.id === drag.id);
          const distanceToWall = (x: number, y: number, w: WallSegment) => {
            const vx = w.x2 - w.x1, vy = w.y2 - w.y1, len2 = vx * vx + vy * vy || 1;
            const t = Math.max(0, Math.min(1, ((x - w.x1) * vx + (y - w.y1) * vy) / len2));
            return Math.hypot(x - (w.x1 + t * vx), y - (w.y1 + t * vy));
          };
          let wallDx = dx, wallDy = dy;
          if (movedWall && gapEnabled) {
            let best = gapDistance + 6, adjustment: {x:number;y:number} | null = null;
            const proposed = [{x:movedWall.x1+dx,y:movedWall.y1+dy},{x:movedWall.x2+dx,y:movedWall.y2+dy}];
            for (const otherWall of project.walls) {
              if (otherWall.id === movedWall.id) continue;
              const vertices = [{ x: otherWall.x1, y: otherWall.y1 }, { x: otherWall.x2, y: otherWall.y2 }];
              for (const vertex of vertices) {
                for (const point of proposed) {
                  const distance = Math.hypot(point.x - vertex.x, point.y - vertex.y);
                  if (distance < best) {
                    best = distance;
                    adjustment = { x: vertex.x - point.x, y: vertex.y - point.y };
                  }
                }
              }
            }
            if(adjustment){wallDx+=adjustment.x;wallDy+=adjustment.y;}
          }
          const attached = movedWall && moveAttachedParts ? {
            openings: project.openings.filter(o => o.wallId === movedWall.id || distanceToWall(o.x, o.y, movedWall) <= 28).map(o => o.id),
            electrical: project.electrical.filter(o => distanceToWall(o.x, o.y, movedWall) <= 28).map(o => o.id),
            hydraulic: project.hydraulic.filter(o => distanceToWall(o.x, o.y, movedWall) <= 28).map(o => o.id),
          } : { openings: [], electrical: [], hydraulic: [] };
          updateProjectState({
            ...project,
            walls: project.walls.map(w => w.id === drag.id ? { ...w, x1: w.x1 + wallDx, y1: w.y1 + wallDy, x2: w.x2 + wallDx, y2: w.y2 + wallDy } : w),
            openings: project.openings.map(o => attached.openings.includes(o.id) ? { ...o, x: o.x + wallDx, y: o.y + wallDy } : o),
            electrical: project.electrical.map(o => attached.electrical.includes(o.id) ? { ...o, x: o.x + wallDx, y: o.y + wallDy } : o),
            hydraulic: project.hydraulic.map(o => attached.hydraulic.includes(o.id) ? { ...o, x: o.x + wallDx, y: o.y + wallDy } : o),
          });
        }
        else if (drag.kind === 'opening') { const p = snapToNearestWall(endX, endY); updateProjectState({ ...project, openings: project.openings.map(o => o.id === drag.id ? { ...o, x: p.x, y: p.y, rotation: p.rotation, wallId: p.wallId || o.wallId } : o) }); }
        else if (drag.kind === 'electrical') { const p = gapEnabled ? snapToNearestWall(endX, endY) : {x:endX,y:endY,rotation:0,wallId:''}; updateProjectState({ ...project, electrical: project.electrical.map(o => o.id === drag.id ? { ...o, x: p.x, y: p.y, ...(o.x2 !== undefined ? {x2:o.x2+dx,y2:(o.y2 ?? o.y)+dy} : {}), rotation: p.wallId ? p.rotation : (o.rotation ?? 0) } : o) }); }
        else if (drag.kind === 'hydraulic') { const p = gapEnabled ? snapToNearestWall(endX, endY) : {x:endX,y:endY,rotation:0,wallId:''}; updateProjectState({ ...project, hydraulic: project.hydraulic.map(o => o.id === drag.id ? { ...o, x: p.x, y: p.y, ...(o.x2 !== undefined ? {x2:o.x2+dx,y2:(o.y2 ?? o.y)+dy} : {}) } : o) }); }
        else { updateProjectState({...project,furniture:(project.furniture??[]).map(item=>item.id===drag.id?{...item,x:item.x+dx,y:item.y+dy}:item)}); }
      }
      dragRef.current = null; setCurrentMouse(null); setIsDrawing(false); setStartPoint(null); return;
    }
    if (placementRef.current && e) {
      const rect = e.currentTarget.getBoundingClientRect();
      const px = snap((e.clientX - rect.left - canvasPan.x) / zoom), py = snap((e.clientY - rect.top - canvasPan.y) / zoom);
      const p = (tool === 'door' || tool === 'window' || gapEnabled) ? snapToNearestWall(px, py) : {x:px,y:py,rotation:0,wallId:''}; const x = p.x, y = p.y;
      if (tool === 'door' || tool === 'window') {
        const item: OpeningItem = { id: ensureUuid(tool + '-' + Date.now()), type: tool, wallId: p.wallId || project.walls[0]?.id || '', x, y, width: tool === 'door' ? 80 : 100, rotation: p.rotation };
        updateProjectState({ ...project, openings: [...project.openings, item] }); setSelectedObject({ kind: 'opening', id: item.id });
      } else if (['light','socket','switch','panel','data_point','grounding','solar_panel'].includes(tool)) {
        const item: ElectricalItem = { id: ensureUuid(tool + '-' + Date.now()), type: tool as ElectricalItem['type'], x, y, rotation: p.wallId ? p.rotation : 0, circuit: tool === 'light' ? 'Circuito de iluminação' : tool === 'socket' ? 'Circuito de tomadas' : 'A definir', label: ({light:'Ponto de luz',socket:'Tomada TUG',switch:'Interruptor',panel:'Quadro de distribuição',data_point:'Ponto de dados',grounding:'Ponto de aterramento',solar_panel:'Painel solar fotovoltaico'} as Record<string,string>)[tool] || tool };
        updateProjectState({ ...project, electrical: [...project.electrical, item] }); setSelectedObject({ kind: 'electrical', id: item.id });
      } else if (['cold_water','hot_water','sink','faucet','shower','toilet','floor_drain','cleanout','inspection_box','tank','heater','grease_trap','pool'].includes(tool)) {
        const hydraulicType = tool as HydraulicItem['type'];
        const item: HydraulicItem = { id: ensureUuid(tool + '-' + Date.now()), type: hydraulicType, x, y, diameterMm: ['toilet','inspection_box','grease_trap'].includes(tool) ? 100 : tool === 'pool' ? 0 : ['shower','sink','floor_drain','cleanout'].includes(tool) ? 40 : 25, label: ({cold_water:'Ponto de água fria',hot_water:'Ponto de água quente',sink:'Pia',faucet:'Torneira',shower:'Chuveiro',toilet:'Bacia sanitária',floor_drain:'Ralo sifonado',cleanout:'Ponto de limpeza',inspection_box:'Caixa de inspeção',tank:'Reservatório de água',heater:'Aquecedor de água',grease_trap:'Caixa de gordura',pool:'Piscina'} as Record<string,string>)[tool] || tool };
        updateProjectState({ ...project, hydraulic: [...project.hydraulic, item] }); setSelectedObject({ kind: 'hydraulic', id: item.id });
      }
      placementRef.current = false; setIsDrawing(false); setStartPoint(null); setCurrentMouse(null); return;
    }
    if (isDrawing && startPoint && e && ['wire','conduit','water_pipe','sewage_pipe','vent_pipe','rain_pipe'].includes(tool)) {
      const rect = e.currentTarget.getBoundingClientRect();
      const end = {
        x: snap((e.clientX - rect.left - canvasPan.x) / zoom),
        y: snap((e.clientY - rect.top - canvasPan.y) / zoom),
      };
      if (Math.hypot(end.x - startPoint.x, end.y - startPoint.y) > 5) {
        const routeId = ensureUuid(tool);
        if (tool === 'wire' || tool === 'conduit') {
          const route: ElectricalItem = {
            id: routeId,
            type: tool as ElectricalItem['type'],
            x: startPoint.x,
            y: startPoint.y,
            x2: end.x,
            y2: end.y,
            circuit: 'Circuito 1',
            label: tool === 'wire' ? 'Fiação elétrica' : 'Eletroduto elétrico',
          };
          updateProjectState({ ...project, electrical: [...project.electrical, route] });
          setSelectedObject({ kind: 'electrical', id: routeId });
        } else {
          const route: HydraulicItem = {
            id: routeId,
            type: tool as HydraulicItem['type'],
            x: startPoint.x,
            y: startPoint.y,
            x2: end.x,
            y2: end.y,
            diameterMm: tool === 'sewage_pipe' ? 100 : tool === 'rain_pipe' ? 75 : tool === 'vent_pipe' ? 50 : 25,
            label: tool === 'sewage_pipe' ? 'Tubulação de esgoto Ø100mm' : tool === 'rain_pipe' ? 'Águas pluviais Ø75mm' : tool === 'vent_pipe' ? 'Ventilação sanitária Ø50mm' : 'Tubulação de água Ø25mm',
          };
          updateProjectState({ ...project, hydraulic: [...project.hydraulic, route] });
          setSelectedObject({ kind: 'hydraulic', id: routeId });
        }
      }
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentMouse(null);
      placementRef.current = false;
      return;
    }
    if (isDrawing && startPoint && e && tool === 'wall' && wallDrawMode === 'segment') {
      const rect=e.currentTarget.getBoundingClientRect();
      const pointerX=snap((e.clientX-rect.left-canvasPan.x)/zoom),pointerY=snap((e.clientY-rect.top-canvasPan.y)/zoom);
      const projectedEnd=snapToNearestWall(pointerX,pointerY);
      let endPoint=projectedEnd.distance<=16?{x:projectedEnd.x,y:projectedEnd.y}:{x:pointerX,y:pointerY};
      const nearestEndVertex=project.walls.flatMap(w=>[{x:w.x1,y:w.y1},{x:w.x2,y:w.y2}]).reduce((best,p)=>{const distance=Math.hypot(p.x-endPoint.x,p.y-endPoint.y);return distance<=18&&(!best||distance<best.distance)?{...p,distance}:best;},null as ({x:number;y:number;distance:number}|null));
      if(nearestEndVertex)endPoint={x:nearestEndVertex.x,y:nearestEndVertex.y};
      const nearestStartVertex=project.walls.flatMap(w=>[{x:w.x1,y:w.y1},{x:w.x2,y:w.y2}]).reduce((best,p)=>{const distance=Math.hypot(p.x-startPoint.x,p.y-startPoint.y);return distance<=18&&(!best||distance<best.distance)?{...p,distance}:best;},null as ({x:number;y:number;distance:number}|null));
      const wallStart=nearestStartVertex?{x:nearestStartVertex.x,y:nearestStartVertex.y}:startPoint;
      if (Math.hypot(wallStart.x-endPoint.x,wallStart.y-endPoint.y)>1) {
        const newWall: WallSegment = {
          id: ensureUuid('wall'),
          x1: wallStart.x,
          y1: wallStart.y,
          x2: endPoint.x,
          y2: endPoint.y,
          thickness: 15,
        };
        const nextWalls = [...project.walls, newWall];
        // Detect a closed cycle even when the user draws each wall as a separate segment.
        // Build a tolerant endpoint graph from the existing walls and find a path
        // from the new segment's end back to its start.
        const nodes: Array<{x:number;y:number;edges:number[]}> = [];
        const getNode = (x:number,y:number) => {
          let index = nodes.findIndex(n => Math.hypot(n.x-x,n.y-y) <= 10);
          if (index < 0) { index = nodes.length; nodes.push({x,y,edges:[]}); }
          return index;
        };
        const graphEdges: Array<[number,number]> = [];
        for (const wall of project.walls) {
          const a = getNode(wall.x1,wall.y1), b = getNode(wall.x2,wall.y2);
          graphEdges.push([a,b]);
        }
        const startNode = getNode(newWall.x1,newWall.y1), endNode = getNode(newWall.x2,newWall.y2);
        graphEdges.forEach(([a,b]) => { nodes[a].edges.push(b); nodes[b].edges.push(a); });
        const queue = [endNode], parent = new Map<number,number|null>([[endNode,null]]);
        while (queue.length && !parent.has(startNode)) {
          const node = queue.shift()!;
          for (const neighbor of nodes[node].edges) if (!parent.has(neighbor)) { parent.set(neighbor,node); queue.push(neighbor); }
        }
        let nextRooms = project.rooms ?? [];
        let createdRoomId: string | null = null;
        if (parent.has(startNode)) {
          const path:number[] = [];
          let cursor:number|null = startNode;
          while (cursor !== null) { path.push(cursor); cursor = parent.get(cursor) ?? null; }
          path.reverse(); // end -> ... -> start
          const polygon = [{x:newWall.x1,y:newWall.y1}, ...path.slice(0,-1).map(i=>({x:nodes[i].x,y:nodes[i].y}))];
          const area = Math.abs(polygon.reduce((sum,p,i)=>{const q=polygon[(i+1)%polygon.length];return sum+p.x*q.y-q.x*p.y;},0))/2;
          const duplicate = nextRooms.some(room => room.vertices.length === polygon.length && room.vertices.every(p=>polygon.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<=10)));
          if (polygon.length >= 3 && area > 100 && !duplicate) {
            const room: FloorPlanRoom = {id:ensureUuid('room'),name:'Novo cômodo',vertices:polygon,material:'concrete'};
            nextRooms = [...nextRooms,room];
            setPendingRoomId(room.id);
          }
        }
        updateProjectState({ ...project, walls: nextWalls, rooms: nextRooms });
        if(createdRoomId)setPendingRoomId(createdRoomId);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={project.id}
              onChange={(event) => {
                const selected = projects.find((item) => item.id === event.target.value);
                if (selected) {
                  const normalized = ensureProjectLevels(selected);
                  setProject(normalized); setActiveLevelId(normalized.activeLevelId ?? 'ground-floor'); setIsNightMode(normalized.isNightMode ?? false);
                  setHistory([normalized]); setHistoryIndex(0); setStage(normalized.stage);
                  localStorage.setItem('obra_engep_active_project', JSON.stringify(normalized));
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
        <div className="flex flex-wrap items-center gap-1.5">
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
              const created = ensureProjectLevels({ ...createEmptyProject(), name: name.trim() });
              setProject(created); setActiveLevelId(created.activeLevelId ?? 'ground-floor'); setIsNightMode(created.isNightMode ?? false);
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
                const next = ensureProjectLevels(projects.find((item) => item.id !== project.id) ?? createEmptyProject());
                setProject(next); setActiveLevelId(next.activeLevelId ?? 'ground-floor'); setIsNightMode(next.isNightMode ?? false);
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

      <div className="rounded-xl bg-[#17243A] border border-[#2A3A55] p-2.5 space-y-2"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 text-xs font-bold text-white"><Building2 className="w-4 h-4 text-[#5B9BFF]"/> Pavimentos</div><div className="flex flex-wrap gap-1.5"><button type="button" onClick={handleCreateLevel} className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white flex items-center gap-1"><Plus className="w-3.5 h-3.5"/> Novo piso</button><button type="button" onClick={handleRenameLevel} className="rounded-lg border border-[#2A3A55] px-2.5 py-1.5 text-xs text-[#CBD5E1]">Renomear</button><button type="button" onClick={handleDeleteLevel} disabled={(project.levels?.length??1)<=1} className="rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs text-red-300 disabled:opacity-30">Excluir piso</button></div></div><div className="flex gap-1.5 overflow-x-auto no-scrollbar">{(project.levels??[]).slice().sort((a,b)=>a.level-b.level).map(level=><button key={level.id} type="button" onClick={()=>handleSelectLevel(level.id)} aria-pressed={activeLevelId===level.id} className={'shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold '+(activeLevelId===level.id?'bg-blue-600 border-blue-500 text-white':'border-[#2A3A55] text-[#9FB0C8] hover:text-white')}>{level.kind==='subsolo'?'−'+Math.abs(level.level)+' · ':level.kind==='superior'?'+'+level.level+' · ':''}{level.name}</button>)}</div><p className="text-[10px] text-[#9FB0C8]">Editando: {project.levels?.find(level=>level.id===activeLevelId)?.name??'Térreo'} · Os demais pavimentos permanecem preservados.</p></div>

      {/* Layer Toggles Bar (Page 7: Camadas liga/desliga) */}
      <div className="flex items-center gap-2 p-2 rounded-xl bg-[#17243A] border border-[#2A3A55] overflow-x-auto no-scrollbar text-xs">
        <span className="text-[#9FB0C8] font-bold text-[11px] px-2 uppercase tracking-wider flex items-center gap-1">
          <Layers className="w-3.5 h-3.5" />
          Camadas:
        </span>
        <button onClick={() => { const next = !(showArchLayer && showElecLayer && showHydLayer && showFurnitureLayer); setShowArchLayer(next); setShowElecLayer(next); setShowHydLayer(next); setShowFurnitureLayer(next); }}
          className={`px-3 py-1 rounded-lg border transition ${showArchLayer && showElecLayer && showHydLayer && showFurnitureLayer ? 'bg-[#1F66D6] text-white border-[#1F66D6]' : 'border-[#2A3A55] text-[#9FB0C8]'}`}>Todas</button>
        <button
          onClick={() => { const next = !showArchLayer; setShowArchLayer(next); if (!next && ['wall','door','window'].includes(tool)) { setTool('select'); setWallSequencePoints([]); } }}
          className={`px-3 py-1 rounded-lg border transition ${
            showArchLayer
              ? 'bg-[#1F66D6] text-white border-[#1F66D6]'
              : 'border-[#2A3A55] text-[#9FB0C8]'
          }`}
        >
          Arquitetura (Paredes)
        </button>
        <button
          onClick={() => { const next = !showElecLayer; setShowElecLayer(next); if (!next && ['light','socket','switch','panel','wire','conduit','data_point','grounding','solar_panel'].includes(tool)) setTool('select'); }}
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
          onClick={() => { const next = !showHydLayer; setShowHydLayer(next); if (!next && ['cold_water','hot_water','water_pipe','sewage_pipe','vent_pipe','rain_pipe','sink','faucet','shower','toilet','floor_drain','cleanout','inspection_box','tank','heater','grease_trap','pool'].includes(tool)) setTool('select'); }}
          className={`px-3 py-1 rounded-lg border transition flex items-center gap-1 ${
            showHydLayer
              ? 'bg-[#06B6D4] text-white border-[#06B6D4]'
              : 'border-[#2A3A55] text-[#9FB0C8]'
          }`}
        >
          <Droplets className="w-3 h-3" />
          Hidráulica (AF/ESG)
        </button>
        <button onClick={() => setShowFurnitureLayer(!showFurnitureLayer)} className={`px-3 py-1 rounded-lg border transition ${showFurnitureLayer ? 'bg-violet-600 text-white border-violet-600' : 'border-[#2A3A55] text-[#9FB0C8]'}`}>Mobiliário</button>
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
      <div className="relative w-full min-w-0 rounded-2xl border border-[#2A3A55] overflow-hidden shadow-inner bg-[#101827]">
        <div className="absolute z-10 left-3 top-3 flex flex-wrap gap-2"><button type="button" onClick={()=>setShow3D(false)} className={'rounded-lg px-3 py-2 text-xs font-semibold '+(!show3D?'bg-blue-600 text-white':'bg-slate-900/80 text-slate-200')}>Planta 2D</button><button type="button" onClick={()=>setShow3D(true)} className={'rounded-lg px-3 py-2 text-xs font-semibold '+(show3D?'bg-blue-600 text-white':'bg-slate-900/80 text-slate-200')}>Vista 3D</button><button type="button" onClick={toggleNightMode} aria-pressed={isNightMode} className={'rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-1.5 '+(isNightMode?'bg-indigo-600 text-white':'bg-slate-900/80 text-slate-200')}>{isNightMode?<Moon className="w-3.5 h-3.5"/>:<Sun className="w-3.5 h-3.5"/>}{isNightMode?'Noite':'Dia'}</button></div>
        {show3D ? <div className="h-[min(68vh,680px)] min-h-[320px]"><FloorPlan3DView project={project} isDark={isDark} isNightMode={isNightMode} /></div> : <canvas
          ref={canvasRef}
          onPointerDown={handleMouseDown}
          onPointerMove={handleMouseMove}
          onPointerUp={handleMouseUp}
          onPointerCancel={handleMouseUp}
          onLostPointerCapture={handleMouseUp}
          className="block w-full cursor-crosshair touch-none select-none"
          style={{ touchAction: 'none' }}
        />}

        {!show3D && routeSequencePoints.length > 0 && <button type="button" onClick={() => { setRouteSequencePoints([]); setCurrentMouse(null); }} className="absolute z-20 bottom-3 right-3 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-lg">Concluir traçado</button>}

        {!show3D && <>{/* Floating Zoom & Undo Controls */}
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
        </div></>}
      </div>

      {selectedObject?.kind === 'opening' && project.openings.some(o => o.id === selectedObject.id && o.type === 'door') && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#2A3A55] bg-[#17243A] p-3">
          <label className="text-sm text-[#DCE6F5]" htmlFor="door-style">Modelo da porta</label>
          <select id="door-style" value={project.openings.find(o => o.id === selectedObject.id)?.doorStyle ?? 'wood'}
            onChange={e => updateProjectState({...project, openings: project.openings.map(o => o.id === selectedObject.id ? {...o, doorStyle: e.target.value as OpeningItem['doorStyle']} : o)})}
            className="min-h-[42px] rounded-lg border border-[#2A3A55] bg-[#101827] px-3 text-sm text-white">
            <option value="wood">Madeira tradicional</option><option value="sliding">Deslizante</option>
            <option value="glass">Vidro</option><option value="double">Duas folhas</option><option value="metal">Metálica</option>
          </select>
          <span className="text-xs text-[#9FB0C8]">Modelo exibido na vista 3D.</span>
        </div>
      )}
      {selectedObject && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#2A3A55] bg-[#17243A] p-2">
          <span className="px-2 text-xs text-[#9FB0C8]">Elemento selecionado</span>
          <button type="button" onClick={() => {
            const kind=selectedObject.kind,id=selectedObject.id;
            if(kind==='wall') updateProjectState({...project,walls:project.walls.map(v=>v.id===id?{...v,locked:!v.locked}:v)});
            else if(kind==='opening') updateProjectState({...project,openings:project.openings.map(v=>v.id===id?{...v,locked:!v.locked}:v)});
            else if(kind==='electrical') updateProjectState({...project,electrical:project.electrical.map(v=>v.id===id?{...v,locked:!v.locked}:v)});
            else if(kind==='hydraulic') updateProjectState({...project,hydraulic:project.hydraulic.map(v=>v.id===id?{...v,locked:!v.locked}:v)});
            else updateProjectState({...project,furniture:(project.furniture??[]).map(v=>v.id===id?{...v,locked:!v.locked}:v)});
            dragRef.current=null;
          }} className="flex items-center gap-2 rounded-xl border border-[#2A3A55] px-3 py-2 text-sm text-white" title="Travar ou destravar elemento">
            {((selectedObject.kind==='wall'?project.walls.find(v=>v.id===selectedObject.id):selectedObject.kind==='opening'?project.openings.find(v=>v.id===selectedObject.id):selectedObject.kind==='electrical'?project.electrical.find(v=>v.id===selectedObject.id):selectedObject.kind==='hydraulic'?project.hydraulic.find(v=>v.id===selectedObject.id):(project.furniture??[]).find(v=>v.id===selectedObject.id))?.locked) ? <Unlock className="h-4 w-4"/> : <Lock className="h-4 w-4"/>}
            {((selectedObject.kind==='wall'?project.walls.find(v=>v.id===selectedObject.id):selectedObject.kind==='opening'?project.openings.find(v=>v.id===selectedObject.id):selectedObject.kind==='electrical'?project.electrical.find(v=>v.id===selectedObject.id):selectedObject.kind==='hydraulic'?project.hydraulic.find(v=>v.id===selectedObject.id):(project.furniture??[]).find(v=>v.id===selectedObject.id))?.locked) ? 'Destravar' : 'Travar'}
          </button>
          <button onClick={() => {
            const id = ensureUuid('clone');
            if (selectedObject.kind === 'wall') {
              const source = project.walls.find(item => item.id === selectedObject.id); if (!source) return;
              const clone = { ...source, id, x1: source.x1 + 20, y1: source.y1 + 20, x2: source.x2 + 20, y2: source.y2 + 20 };
              updateProjectState({ ...project, walls: [...project.walls, clone] }); setSelectedObject({ kind: 'wall', id }); setSelectedObjects([{ kind: 'wall', id }]);
            } else if (selectedObject.kind === 'opening') {
              const source = project.openings.find(item => item.id === selectedObject.id); if (!source) return;
              const clone = { ...source, id, x: source.x + 20, y: source.y + 20 };
              updateProjectState({ ...project, openings: [...project.openings, clone] }); setSelectedObject({ kind: 'opening', id }); setSelectedObjects([{ kind: 'opening', id }]);
            } else if (selectedObject.kind === 'electrical') {
              const source = project.electrical.find(item => item.id === selectedObject.id); if (!source) return;
              const clone = { ...source, id, x: source.x + 20, y: source.y + 20 };
              updateProjectState({ ...project, electrical: [...project.electrical, clone] }); setSelectedObject({ kind: 'electrical', id }); setSelectedObjects([{ kind: 'electrical', id }]);
            } else if(selectedObject.kind==='hydraulic') {
              const source = project.hydraulic.find(item => item.id === selectedObject.id); if (!source) return;
              const clone = { ...source, id, x: source.x + 20, y: source.y + 20 };
              updateProjectState({ ...project, hydraulic: [...project.hydraulic, clone] }); setSelectedObject({ kind: 'hydraulic', id }); setSelectedObjects([{ kind: 'hydraulic', id }]);
            } else {
              const source=(project.furniture??[]).find(item=>item.id===selectedObject.id);if(!source)return;
              const clone={...source,id,x:source.x+20,y:source.y+20};
              updateProjectState({...project,furniture:[...(project.furniture??[]),clone]});setSelectedObject({kind:'furniture',id});setSelectedObjects([{kind:'furniture',id}]);
            }
          }} className="min-h-[44px] rounded-lg border border-[#2A3A55] px-3 text-sm text-white flex items-center gap-2"><Copy className="h-4 w-4" /> Copiar</button>
          <button onClick={() => {
            if (selectedObject.kind === 'opening') updateProjectState({ ...project, openings: project.openings.map(o => o.id === selectedObject.id ? { ...o, rotation: ((o.rotation ?? 0) + 90) % 360 } : o) });
            else if (selectedObject.kind === 'electrical') updateProjectState({ ...project, electrical: project.electrical.map(o => o.id === selectedObject.id ? { ...o, rotation: ((o.rotation ?? 0) + 90) % 360 } : o) });
            else if (selectedObject.kind === 'furniture') updateProjectState({...project,furniture:(project.furniture??[]).map(o=>o.id===selectedObject.id?{...o,rotation:(o.rotation+90)%360}:o)});
            else if (selectedObject.kind === 'wall') updateProjectState({ ...project, walls: project.walls.map(w => {
              if (w.id !== selectedObject.id) return w;
              const mx = (w.x1 + w.x2) / 2, my = (w.y1 + w.y2) / 2;
              return { ...w, x1: mx - (w.y1 - w.y2) / 2, y1: my + (w.x1 - w.x2) / 2, x2: mx + (w.y1 - w.y2) / 2, y2: my - (w.x1 - w.x2) / 2 };
            }) });
          }} className="min-h-[44px] rounded-lg border border-[#2A3A55] px-3 text-sm text-white flex items-center gap-2"><RotateCw className="h-4 w-4" /> Girar 90°</button>
          <button onClick={() => {
            const id = selectedObject.id;
            if (selectedObject.kind === 'opening') updateProjectState({ ...project, openings: project.openings.filter(o => o.id !== id) });
            else if (selectedObject.kind === 'wall') updateProjectState({ ...project, walls: project.walls.filter(o => o.id !== id) });
            else if (selectedObject.kind === 'electrical') updateProjectState({ ...project, electrical: project.electrical.filter(o => o.id !== id) });
            else if(selectedObject.kind==='hydraulic') updateProjectState({ ...project, hydraulic: project.hydraulic.filter(o => o.id !== id) });
            else updateProjectState({...project,furniture:(project.furniture??[]).filter(o=>o.id!==id)});
            setSelectedObject(null);
          }} className="min-h-[44px] rounded-lg border border-red-400/40 px-3 text-sm text-red-300 flex items-center gap-2"><Trash2 className="h-4 w-4" /> Excluir</button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#2A3A55] bg-[#17243A] px-3 py-2 text-xs text-[#DCE6F5]">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={gapEnabled} onChange={e => setGapEnabled(e.target.checked)} className="h-3.5 w-3.5 accent-[#1F66D6]" />
          <span>Gap</span>
        </label>
        <label className={`flex min-w-[150px] flex-1 items-center gap-2 ${gapEnabled ? '' : 'opacity-40'}`}>
          <span>Distância</span>
          <input aria-label="Distância do Gap" type="range" min="5" max="60" step="5" value={gapDistance} disabled={!gapEnabled} onChange={e => setGapDistance(Number(e.target.value))} className="min-w-0 flex-1 accent-[#1F66D6]" />
          <span className="w-8 text-right tabular-nums">{gapEnabled ? gapDistance : '—'} px</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={moveAttachedParts} onChange={e => setMoveAttachedParts(e.target.checked)} className="h-3.5 w-3.5 accent-[#1F66D6]" />
          <span>Mover partes juntas</span>
        </label>
      </div>

      {showFurnitureLayer && (<div className="rounded-xl border border-[#2A3A55] bg-[#17243A] p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0"><div className="text-sm font-semibold text-white">Mobiliário e objetos</div><p className="text-xs text-[#9FB0C8]">{(project.furniture ?? []).length} inserido(s) · escolha um item para adicionar à planta</p></div>
          <button type="button" onClick={() => setShowFurnitureCatalog(true)} className="flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-[#1F66D6] px-3 text-sm font-semibold text-white hover:bg-[#1A57B8]" aria-label="Abrir catálogo completo de mobiliário"><Plus className="h-4 w-4" /> Ver todos</button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {FURNITURE_CATALOG.slice(0, 18).map(item => (
            <button key={item.id} type="button" disabled={!showFurnitureLayer} onClick={() => {
              const bounds = project.walls.length ? { x: (Math.min(...project.walls.flatMap(w => [w.x1,w.x2])) + Math.max(...project.walls.flatMap(w => [w.x1,w.x2]))) / 2, y: (Math.min(...project.walls.flatMap(w => [w.y1,w.y2])) + Math.max(...project.walls.flatMap(w => [w.y1,w.y2]))) / 2 } : { x: 240, y: 180 };
              const count = (project.furniture ?? []).length;
              const placed = { id: ensureUuid('furniture'), catalogId:item.id, name:item.name, category:item.category, x:bounds.x+(count%4)*24, y:bounds.y+(count%4)*24, rotation:0, widthIn:item.widthIn, depthIn:item.depthIn, heightIn:item.heightIn, symbolUrl:item.symbolUrl, modelUrl:item.modelUrl, thumbnailUrl:item.thumbnailUrl };
              updateProjectState({ ...project, furniture:[...(project.furniture ?? []), placed] });
            }} className="flex w-28 shrink-0 flex-col overflow-hidden rounded-xl border border-[#2A3A55] bg-[#101827] text-left transition hover:border-blue-500 disabled:cursor-not-allowed">
              <span className="grid h-20 place-items-center bg-white p-2"><img src={item.symbolUrl} alt="" loading="lazy" className="h-full w-full object-contain" /></span>
              <span className="line-clamp-2 min-h-10 p-2 text-[11px] font-semibold text-white">{item.name}</span><span className="px-2 pb-2 text-[10px] text-blue-300">+ Adicionar</span>
            </button>
          ))}
          <button type="button" onClick={() => setShowFurnitureCatalog(true)} className="flex w-24 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-blue-400/60 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20" aria-label="Ver catálogo completo"><Plus className="h-7 w-7" /><span className="text-xs font-semibold">Ver todos</span></button>
        </div>
      </div>)}

      {(project.furniture ?? []).length > 0 && (
        <div className="rounded-xl border border-[#2A3A55] bg-[#17243A] p-3">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#9FB0C8]">Objetos inseridos</h4>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(project.furniture ?? []).map(item => (
              <div key={item.id} className="flex min-w-0 items-center gap-2 rounded-lg border border-[#2A3A55] p-2">
                <img src={item.symbolUrl} alt="" className="h-10 w-10 rounded bg-white object-contain p-1" />
                <div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold text-white">{item.name}</div><div className="text-[10px] text-[#9FB0C8]">{(item.widthIn * 0.0254).toFixed(2)} × {(item.depthIn * 0.0254).toFixed(2)} m · {item.rotation}°</div></div>
                <button type="button" onClick={() => { const clone = { ...item, id: ensureUuid('furniture-copy'), x: item.x + 20, y: item.y + 20 }; updateProjectState({ ...project, furniture:[...(project.furniture ?? []), clone] }); }} className="rounded-lg border border-[#2A3A55] px-2 py-2 text-xs text-white" aria-label={`Copiar ${item.name}`} title="Copiar"><Copy className="h-4 w-4" /></button>
                <button type="button" onClick={() => updateProjectState({...project,furniture:(project.furniture ?? []).map(value=>value.id===item.id?{...value,locked:!value.locked}:value)})} className="rounded-lg border border-[#2A3A55] px-2 py-2 text-xs text-white" aria-label={item.locked?'Destravar item':'Travar item'} title={item.locked?'Destravar':'Travar'}>{item.locked?<Unlock className="h-4 w-4"/>:<Lock className="h-4 w-4"/>}</button>
                <button type="button" disabled={item.locked} onClick={() => updateProjectState({...project, furniture:(project.furniture ?? []).map(value => value.id === item.id ? {...value, rotation:(value.rotation + 90) % 360} : value)})} className="rounded-lg border border-[#2A3A55] px-2 py-2 text-xs text-white" aria-label={`Girar ${item.name} 90 graus`}><RotateCw className="h-4 w-4" /></button>
                <button type="button" disabled={item.locked} onClick={() => updateProjectState({...project, furniture:(project.furniture ?? []).filter(value => value.id !== item.id)})} className="rounded-lg border border-red-400/30 px-2 py-2 text-xs text-red-300" aria-label={`Remover ${item.name}`}><Trash2 className="h-4 w-4" /></button>
                <details className="w-full pt-1">
                  <summary className="cursor-pointer select-none text-[11px] text-blue-300">Editar posição e dimensões</summary>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="text-[10px] text-[#9FB0C8]">X (px)<input type="number" disabled={item.locked} value={Math.round(item.x)} onChange={e => updateProjectState({...project, furniture:(project.furniture ?? []).map(value => value.id === item.id ? {...value, x:Number(e.target.value)} : value)})} className="mt-1 min-h-9 w-full rounded-md border border-[#2A3A55] bg-[#101827] px-2 text-xs text-white" /></label>
                    <label className="text-[10px] text-[#9FB0C8]">Y (px)<input type="number" disabled={item.locked} value={Math.round(item.y)} onChange={e => updateProjectState({...project, furniture:(project.furniture ?? []).map(value => value.id === item.id ? {...value, y:Number(e.target.value)} : value)})} className="mt-1 min-h-9 w-full rounded-md border border-[#2A3A55] bg-[#101827] px-2 text-xs text-white" /></label>
                    <label className="text-[10px] text-[#9FB0C8]">Largura (cm)<input type="number" disabled={item.locked} min="1" step="1" value={Number((item.widthIn * 2.54).toFixed(1))} onChange={e => updateProjectState({...project, furniture:(project.furniture ?? []).map(value => value.id === item.id ? {...value, widthIn:Math.max(1,Number(e.target.value))/2.54} : value)})} className="mt-1 min-h-9 w-full rounded-md border border-[#2A3A55] bg-[#101827] px-2 text-xs text-white" /></label>
                    <label className="text-[10px] text-[#9FB0C8]">Profundidade (cm)<input type="number" disabled={item.locked} min="1" step="1" value={Number((item.depthIn * 2.54).toFixed(1))} onChange={e => updateProjectState({...project, furniture:(project.furniture ?? []).map(value => value.id === item.id ? {...value, depthIn:Math.max(1,Number(e.target.value))/2.54} : value)})} className="mt-1 min-h-9 w-full rounded-md border border-[#2A3A55] bg-[#101827] px-2 text-xs text-white" /></label>
                  </div>
                </details>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingRoomId && (() => {
        const room = (project.rooms ?? []).find(item => item.id === pendingRoomId);
        if (!room) return null;
        return <div className="fixed bottom-20 left-3 right-3 z-50 mx-auto max-w-md rounded-2xl border border-[#3B82F6]/50 bg-[#17243A] p-4 shadow-2xl">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-white">Cômodo criado</h3>
            <button type="button" onClick={() => setPendingRoomId(null)} className="rounded-lg px-2 py-1 text-xs text-[#9FB0C8]">Concluir</button>
          </div>
          <label className="block text-xs text-[#9FB0C8]">Nome do cômodo
            <input autoFocus value={room.name} onChange={e => updateProjectState({...project, rooms:(project.rooms ?? []).map(item=>item.id===room.id?{...item,name:e.target.value}:item)})} className="mt-1 min-h-10 w-full rounded-lg border border-[#2A3A55] bg-[#101827] px-3 text-sm text-white" placeholder="Ex.: Sala, cozinha, banheiro" />
          </label>
          <label className="mt-3 block text-xs text-[#9FB0C8]">Material do piso
            <select value={room.material} onChange={e => updateProjectState({...project, rooms:(project.rooms ?? []).map(item=>item.id===room.id?{...item,material:e.target.value as FloorMaterial}:item)})} className="mt-1 min-h-10 w-full rounded-lg border border-[#2A3A55] bg-[#101827] px-3 text-sm text-white">
              <option value="concrete">Concreto</option><option value="wood">Madeira</option><option value="tile">Azulejo / cerâmica</option><option value="stone">Pedra</option><option value="laminate">Piso laminado</option>
            </select>
          </label>
          <p className="mt-2 text-[10px] text-[#9FB0C8]">O nome também aparece sobre o piso na planta 2D e 3D.</p>
        </div>;
      })()}

      {/* Bottom Tools Toolbar (Page 6 briefing: "Barra de ferramentas inferior") */}
      <div className="p-2.5 rounded-2xl bg-[#17243A] border border-[#2A3A55] grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-1">
        {[
          { id: 'select' as ToolMode, label: 'Mover/Selecionar', icon: Maximize2 },
          ...(showArchLayer ? [{ id: 'wall' as ToolMode, label: '+ Parede', icon: Square }, { id: 'door' as ToolMode, label: '+ Porta', icon: DoorOpen }, { id: 'window' as ToolMode, label: '+ Janela', icon: Maximize2 }] : []),
          ...(showElecLayer ? [{ id: 'light' as ToolMode, label: '+ Luz · NBR 5410', icon: Zap }, { id: 'socket' as ToolMode, label: '+ Tomada · NBR 5410', icon: Zap }, { id: 'switch' as ToolMode, label: '+ Interruptor', icon: Zap }, { id: 'panel' as ToolMode, label: '+ Quadro', icon: Zap }, { id: 'wire' as ToolMode, label: '+ Fiação', icon: Zap }, { id: 'conduit' as ToolMode, label: '+ Eletroduto', icon: Zap }, { id: 'data_point' as ToolMode, label: '+ Dados · NBR 14565', icon: Zap }, { id: 'grounding' as ToolMode, label: '+ Aterramento', icon: Zap }, { id: 'solar_panel' as ToolMode, label: '+ Painel solar fotovoltaico', icon: Zap }] : []),
          ...(showHydLayer ? [{ id: 'cold_water' as ToolMode, label: '+ Água fria · NBR 5626', icon: Droplets }, { id: 'hot_water' as ToolMode, label: '+ Água quente', icon: Droplets }, { id: 'water_pipe' as ToolMode, label: '+ Tubo água', icon: Droplets }, { id: 'sewage_pipe' as ToolMode, label: '+ Esgoto · NBR 8160', icon: Droplets }, { id: 'vent_pipe' as ToolMode, label: '+ Ventilação sanitária', icon: Droplets }, { id: 'rain_pipe' as ToolMode, label: '+ Pluvial · NBR 10844', icon: Droplets }, { id: 'sink' as ToolMode, label: '+ Pia', icon: Droplets }, { id: 'faucet' as ToolMode, label: '+ Torneira', icon: Droplets }, { id: 'shower' as ToolMode, label: '+ Chuveiro', icon: Droplets }, { id: 'toilet' as ToolMode, label: '+ Bacia sanitária', icon: Droplets }, { id: 'floor_drain' as ToolMode, label: '+ Ralo', icon: Droplets }, { id: 'cleanout' as ToolMode, label: '+ Limpeza', icon: Droplets }, { id: 'inspection_box' as ToolMode, label: '+ Caixa inspeção', icon: Droplets }, { id: 'tank' as ToolMode, label: '+ Reservatório', icon: Droplets }, { id: 'heater' as ToolMode, label: '+ Aquecedor', icon: Droplets }, { id: 'grease_trap' as ToolMode, label: '+ Caixa gordura', icon: Droplets }, { id: 'pool' as ToolMode, label: '+ Piscina', icon: Droplets }] : []),
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setTool(id); if (id !== 'wall') { setWallSequencePoints([]); setCurrentMouse(null); } }}
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

      {tool === 'wall' && showArchLayer && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#2A3A55] bg-[#17243A] p-3 text-xs text-[#DCE6F5]">
          <span className="font-semibold text-[#9FB0C8]">Desenho de paredes:</span>
          <button type="button" onClick={() => { setWallDrawMode('segment'); setWallSequencePoints([]); setIsDrawing(false); setStartPoint(null); }} className={`rounded-lg border px-3 py-2 ${wallDrawMode === 'segment' ? 'border-blue-500 bg-blue-600 text-white' : 'border-[#2A3A55] text-[#9FB0C8]'}`}>Linha única</button>
          <button type="button" onClick={() => { setWallDrawMode('sequence'); setWallSequencePoints([]); setIsDrawing(false); setStartPoint(null); }} className={`rounded-lg border px-3 py-2 ${wallDrawMode === 'sequence' ? 'border-blue-500 bg-blue-600 text-white' : 'border-[#2A3A55] text-[#9FB0C8]'}`}>Sequência por vértices</button>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={showWallVertices} onChange={e => setShowWallVertices(e.target.checked)} /> Mostrar vértices</label>{wallDrawMode === 'sequence' && <><span>{wallSequencePoints.length} vértice(s) · finalize no vértice inicial ou em outro vértice existente</span><button type="button" onClick={() => { setWallSequencePoints([]); setCurrentMouse(null); }} className="rounded-lg border border-red-400/40 px-3 py-2 text-red-300">Cancelar sequência</button></>}
        </div>
      )}

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
      {showFurnitureCatalog && (
        <FurnitureCatalog
          onClose={() => setShowFurnitureCatalog(false)}
          onAdd={(item: FurnitureCatalogItem) => {
            const bounds = project.walls.length ? {
              x: (Math.min(...project.walls.flatMap(w => [w.x1, w.x2])) + Math.max(...project.walls.flatMap(w => [w.x1, w.x2]))) / 2,
              y: (Math.min(...project.walls.flatMap(w => [w.y1, w.y2])) + Math.max(...project.walls.flatMap(w => [w.y1, w.y2]))) / 2,
            } : { x: 240, y: 180 };
            const placed = {
              id: crypto.randomUUID(), catalogId: item.id, name: item.name, category: item.category,
              x: bounds.x + ((project.furniture ?? []).length % 4) * 24,
              y: bounds.y + ((project.furniture ?? []).length % 4) * 24,
              rotation: 0, widthIn: item.widthIn, depthIn: item.depthIn, heightIn: item.heightIn,
              symbolUrl: item.symbolUrl, modelUrl: item.modelUrl, thumbnailUrl: item.thumbnailUrl,
            };
            updateProjectState({...project, furniture:[...(project.furniture ?? []), placed]});
            setShowFurnitureCatalog(false);
          }}
        />
      )}
    </div>
  );
};
