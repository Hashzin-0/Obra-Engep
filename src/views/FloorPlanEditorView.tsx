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
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { FloorPlanProject, WallSegment, OpeningItem, ElectricalItem, HydraulicItem, ProjectDeadline } from '../types';
import { createEmptyProject } from '../data/referenceData';
import { ensureUuid } from '../utils/uuid';
import { LimitBar } from '../components/LimitBar';
import { AlertBanner } from '../components/AlertBanner';
import { Calendar, Bell, CalendarCheck } from 'lucide-react';
import { exportToLocalCalendar, getGoogleCalendarUrl } from '../utils/calendarSync';
import { FurnitureCatalog } from '../components/FurnitureCatalog';
import type { FurnitureCatalogItem } from '../data/furnitureCatalog';

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
  const [gapEnabled, setGapEnabled] = useState(true);
  const [gapDistance, setGapDistance] = useState(20);
  const [moveAttachedParts, setMoveAttachedParts] = useState(true);

  // Tool
  const [tool, setTool] = useState<ToolMode>('select');
  const [zoom, setZoom] = useState(1);
  const [show3D, setShow3D] = useState(false);
  const [showFurnitureCatalog, setShowFurnitureCatalog] = useState(false);
  const [selectedObjects, setSelectedObjects] = useState<Array<{ kind: 'wall' | 'opening' | 'electrical' | 'hydraulic'; id: string }>>([]);
  const [selectionRect, setSelectionRect] = useState<{x1:number;y1:number;x2:number;y2:number}|null>(null);
  const selectionStartRef = useRef<{x:number;y:number}|null>(null);
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>());
  const panGestureRef = useRef<{ x: number; y: number; centerX: number; centerY: number; distance:number; zoom:number } | null>(null);
  const [stage, setStage] = useState<'estudo_preliminar' | 'executivo'>(project.stage);

  useEffect(() => {
    if (projects.length > 0 && !projects.some((item) => item.id === project.id)) {
      const next = projects[0];
      setProject(next);
      setHistory([next]);
      setHistoryIndex(0);
      setStage(next.stage);
      localStorage.setItem('obra_engep_active_project', JSON.stringify(next));
    }
  }, [projects, project.id]);

  // Drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentMouse, setCurrentMouse] = useState<{ x: number; y: number } | null>(null);
  const [selectedObject, setSelectedObject] = useState<{ kind: 'wall' | 'opening' | 'electrical' | 'hydraulic'; id: string } | null>(null);
  const dragRef = useRef<{ kind: 'wall' | 'opening' | 'electrical' | 'hydraulic'; id: string; x: number; y: number } | null>(null);
  const placementRef = useRef(false);

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
    ctx.translate(canvasPan.x / zoom, canvasPan.y / zoom);

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
        ctx.save();
        ctx.translate(op.x, op.y);
        ctx.rotate(((op.rotation ?? 0) * Math.PI) / 180);
        if (op.type === 'door') {
          ctx.strokeStyle = '#F5B93A';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, 25, 0, Math.PI / 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(25, 0);
          ctx.stroke();
        } else {
          ctx.strokeStyle = '#06B6D4';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(-20, 0);
          ctx.lineTo(20, 0);
          ctx.stroke();
        }
        ctx.restore();
      });
    }

    // ELECTRICAL LAYER
    if (showElecLayer) {
      project.electrical.forEach((el) => {
        if (el.type === 'light') {
          ctx.save(); ctx.translate(el.x, el.y); ctx.rotate(((el.rotation ?? 0) * Math.PI) / 180);
          ctx.fillStyle = '#EAB308';
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

    if (dragRef.current && currentMouse) {
      const drag = dragRef.current; ctx.save(); ctx.globalAlpha = 0.55; ctx.strokeStyle = '#5B9BFF'; ctx.fillStyle = '#5B9BFF'; ctx.lineWidth = 4; ctx.setLineDash([5, 3]);
      if (drag.kind === 'wall') { const w = project.walls.find(item => item.id === drag.id); if (w) { const dx = currentMouse.x - drag.x, dy = currentMouse.y - drag.y; ctx.beginPath(); ctx.moveTo(w.x1 + dx, w.y1 + dy); ctx.lineTo(w.x2 + dx, w.y2 + dy); ctx.stroke(); } }
      else { const item = drag.kind === 'opening' ? project.openings.find(o => o.id === drag.id) : drag.kind === 'electrical' ? project.electrical.find(o => o.id === drag.id) : project.hydraulic.find(o => o.id === drag.id); if (item) { ctx.beginPath(); ctx.arc(item.x + currentMouse.x - drag.x, item.y + currentMouse.y - drag.y, 12, 0, Math.PI * 2); ctx.stroke(); } }
      ctx.restore();
    }
    // Highlight selected objects for clear visual feedback.
    if(selectionRect){ctx.save();ctx.fillStyle='rgba(91,155,255,.15)';ctx.strokeStyle='#5B9BFF';ctx.setLineDash([5,3]);ctx.fillRect(selectionRect.x1,selectionRect.y1,selectionRect.x2-selectionRect.x1,selectionRect.y2-selectionRect.y1);ctx.strokeRect(selectionRect.x1,selectionRect.y1,selectionRect.x2-selectionRect.x1,selectionRect.y2-selectionRect.y1);ctx.restore();}
    if(selectedObjects.length){ctx.save();ctx.strokeStyle='#5B9BFF';ctx.lineWidth=3;ctx.setLineDash([5,3]);selectedObjects.forEach(s=>{const o=s.kind==='wall'?project.walls.find(v=>v.id===s.id):s.kind==='opening'?project.openings.find(v=>v.id===s.id):s.kind==='electrical'?project.electrical.find(v=>v.id===s.id):project.hydraulic.find(v=>v.id===s.id);if(!o)return;if(s.kind==='wall'){ctx.beginPath();ctx.moveTo(o.x1,o.y1);ctx.lineTo(o.x2,o.y2);ctx.stroke();}else{ctx.beginPath();ctx.arc(o.x,o.y,15,0,Math.PI*2);ctx.stroke();}});ctx.restore();}
    if (selectedObject) {
      ctx.save(); ctx.strokeStyle = '#5B9BFF'; ctx.lineWidth = 3; ctx.setLineDash([5, 3]);
      if (selectedObject.kind === 'wall') { const w = project.walls.find(item => item.id === selectedObject.id); if (w) { ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); ctx.stroke(); } }
      else { const item = selectedObject.kind === 'opening' ? project.openings.find(o => o.id === selectedObject.id) : selectedObject.kind === 'electrical' ? project.electrical.find(o => o.id === selectedObject.id) : project.hydraulic.find(o => o.id === selectedObject.id); if (item) { ctx.beginPath(); ctx.arc(item.x, item.y, 15, 0, Math.PI * 2); ctx.stroke(); } }
      ctx.restore();
    }
    if (placementRef.current && currentMouse && tool !== 'wall') {
      const p = snapToNearestWall(currentMouse.x, currentMouse.y); ctx.save(); ctx.globalAlpha = 0.65; ctx.setLineDash([4, 3]); ctx.strokeStyle = '#5B9BFF'; ctx.fillStyle = '#5B9BFF';
      if (tool === 'door' || tool === 'window') { ctx.translate(p.x, p.y); ctx.rotate(p.rotation * Math.PI / 180); ctx.beginPath(); if (tool === 'door') { ctx.arc(0, 0, 25, 0, Math.PI / 2); ctx.moveTo(0, 0); ctx.lineTo(25, 0); } else { ctx.moveTo(-20, 0); ctx.lineTo(20, 0); } ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, tool === 'cold_water' ? 9 : 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      ctx.restore();
    }

    // Furniture symbols use the original CC0 top-view SVG assets from FloorPlanner.
    (project.furniture ?? []).forEach((item) => {
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
    selectedObject,
    selectedObjects,
    selectionRect,
  ]);

  const snap = (coord: number) => gapEnabled ? Math.round(coord / gapDistance) * gapDistance : coord;
  const snapToNearestWall = (x: number, y: number) => {
    let best = { x, y, rotation: 0, distance: Number.POSITIVE_INFINITY, wallId: '' };
    for (const wall of project.walls) {
      const vx = wall.x2 - wall.x1, vy = wall.y2 - wall.y1;
      const len2 = vx * vx + vy * vy || 1;
      const t = Math.max(0, Math.min(1, ((x - wall.x1) * vx + (y - wall.y1) * vy) / len2));
      const px = wall.x1 + t * vx, py = wall.y1 + t * vy;
      const distance = Math.hypot(x - px, y - py);
      if (distance < best.distance) best = { x: snap(px), y: snap(py), rotation: Math.round(Math.atan2(vy, vx) * 180 / Math.PI / 90) * 90, distance, wallId: wall.id };
    }
    return best.distance <= 64 ? best : { x, y, rotation: 0, distance: best.distance, wallId: '' };
  };
  const activeKind = (): 'opening' | 'electrical' | 'hydraulic' | null => {
    if (tool === 'door' || tool === 'window') return 'opening';
    if (tool === 'socket' || tool === 'light') return 'electrical';
    if (tool === 'cold_water') return 'hydraulic';
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

    if (tool === 'select') { const hit=[...project.openings.map(o=>({kind:'opening' as const,id:o.id,x:o.x,y:o.y})),...project.electrical.map(o=>({kind:'electrical' as const,id:o.id,x:o.x,y:o.y})),...project.hydraulic.map(o=>({kind:'hydraulic' as const,id:o.id,x:o.x,y:o.y})),...project.walls.map(w=>({kind:'wall' as const,id:w.id,x:(w.x1+w.x2)/2,y:(w.y1+w.y2)/2}))].reverse().find(o=>Math.hypot(o.x-x,o.y-y)<20); if(hit){const target={kind:hit.kind,id:hit.id};setSelectedObjects(prev=>e.shiftKey?(prev.some(s=>s.id===hit.id&&s.kind===hit.kind)?prev.filter(s=>s.id!==hit.id):[...prev,target]):(prev.some(s=>s.id===hit.id&&s.kind===hit.kind)?prev:[target]));setSelectedObject(target);dragRef.current={...target,x,y};selectionStartRef.current=null;}else{selectionStartRef.current={x,y};setSelectionRect({x1:x,y1:y,x2:x,y2:y});setIsDrawing(true);if(!e.shiftKey){setSelectedObjects([]);setSelectedObject(null);}} e.currentTarget.setPointerCapture(e.pointerId);return; }
    const kind = activeKind();
    if (kind) {
      const threshold = 18;
      const opening = kind === 'opening' ? [...project.openings].reverse().find(o => Math.hypot(o.x - x, o.y - y) <= threshold) : undefined;
      const electrical = kind === 'electrical' ? [...project.electrical].reverse().find(o => o.type === tool && Math.hypot(o.x - x, o.y - y) <= threshold) : undefined;
      const hydraulic = kind === 'hydraulic' ? [...project.hydraulic].reverse().find(o => Math.hypot(o.x - x, o.y - y) <= threshold) : undefined;
      const target = opening ? { kind: 'opening' as const, id: opening.id } : electrical ? { kind: 'electrical' as const, id: electrical.id } : hydraulic ? { kind: 'hydraulic' as const, id: hydraulic.id } : null;
      if (target) { setSelectedObject(target); dragRef.current = { ...target, x, y }; placementRef.current = false; }
      else { setSelectedObject(null); dragRef.current = null; placementRef.current = true; setIsDrawing(true); setStartPoint({ x, y }); setCurrentMouse({ x, y }); }
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    if (tool === 'wall') {
      const wall = [...project.walls].reverse().find(w => {
        const vx = w.x2 - w.x1, vy = w.y2 - w.y1, len2 = vx * vx + vy * vy || 1;
        const t = Math.max(0, Math.min(1, ((x - w.x1) * vx + (y - w.y1) * vy) / len2));
        return Math.hypot(x - (w.x1 + t * vx), y - (w.y1 + t * vy)) <= 16;
      });
      if (wall) { const target = { kind: 'wall' as const, id: wall.id }; setSelectedObject(target); dragRef.current = { ...target, x, y }; e.currentTarget.setPointerCapture(e.pointerId); return; }
      setSelectedObject(null);
      setIsDrawing(true);
      setStartPoint({ x, y });
      setCurrentMouse({ x, y });
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
    setCurrentMouse({ x, y });
  };

  const handleMouseUp = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (e) activePointersRef.current.delete(e.pointerId);
    if(tool==='select'&&selectionStartRef.current&&e){const r=e.currentTarget.getBoundingClientRect(),x2=snap((e.clientX-r.left-canvasPan.x)/zoom),y2=snap((e.clientY-r.top-canvasPan.y)/zoom),s=selectionStartRef.current;if(Math.hypot(x2-s.x,y2-s.y)>8){const inside=(x:number,y:number)=>x>=Math.min(s.x,x2)&&x<=Math.max(s.x,x2)&&y>=Math.min(s.y,y2)&&y<=Math.max(s.y,y2);const found=[...project.walls.filter(w=>inside((w.x1+w.x2)/2,(w.y1+w.y2)/2)).map(w=>({kind:'wall' as const,id:w.id})),...project.openings.filter(o=>inside(o.x,o.y)).map(o=>({kind:'opening' as const,id:o.id})),...project.electrical.filter(o=>inside(o.x,o.y)).map(o=>({kind:'electrical' as const,id:o.id})),...project.hydraulic.filter(o=>inside(o.x,o.y)).map(o=>({kind:'hydraulic' as const,id:o.id}))];setSelectedObjects(found);setSelectedObject(found[0]||null);}selectionStartRef.current=null;setSelectionRect(null);setIsDrawing(false);setCurrentMouse(null);return;}
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
      if ((dx || dy) && tool === 'select' && selectedObjects.length > 1 && selectedObjects.some(s=>s.id===drag.id&&s.kind===drag.kind)) {
        const ids=(kind:string)=>new Set(selectedObjects.filter(s=>s.kind===kind).map(s=>s.id)); const walls=ids('wall'), openings=ids('opening'), electrical=ids('electrical'), hydraulic=ids('hydraulic');
        updateProjectState({...project,walls:project.walls.map(w=>walls.has(w.id)?{...w,x1:w.x1+dx,y1:w.y1+dy,x2:w.x2+dx,y2:w.y2+dy}:w),openings:project.openings.map(o=>openings.has(o.id)?{...o,x:o.x+dx,y:o.y+dy}:o),electrical:project.electrical.map(o=>electrical.has(o.id)?{...o,x:o.x+dx,y:o.y+dy}:o),hydraulic:project.hydraulic.map(o=>hydraulic.has(o.id)?{...o,x:o.x+dx,y:o.y+dy}:o)});
      } else if (dx || dy) {
        if (drag.kind === 'wall') {
          const movedWall = project.walls.find(w => w.id === drag.id);
          const distanceToWall = (x: number, y: number, w: WallSegment) => {
            const vx = w.x2 - w.x1, vy = w.y2 - w.y1, len2 = vx * vx + vy * vy || 1;
            const t = Math.max(0, Math.min(1, ((x - w.x1) * vx + (y - w.y1) * vy) / len2));
            return Math.hypot(x - (w.x1 + t * vx), y - (w.y1 + t * vy));
          };
          const attached = movedWall && moveAttachedParts ? {
            openings: project.openings.filter(o => o.wallId === movedWall.id || distanceToWall(o.x, o.y, movedWall) <= 28).map(o => o.id),
            electrical: project.electrical.filter(o => distanceToWall(o.x, o.y, movedWall) <= 28).map(o => o.id),
            hydraulic: project.hydraulic.filter(o => distanceToWall(o.x, o.y, movedWall) <= 28).map(o => o.id),
          } : { openings: [], electrical: [], hydraulic: [] };
          updateProjectState({
            ...project,
            walls: project.walls.map(w => w.id === drag.id ? { ...w, x1: w.x1 + dx, y1: w.y1 + dy, x2: w.x2 + dx, y2: w.y2 + dy } : w),
            openings: project.openings.map(o => attached.openings.includes(o.id) ? { ...o, x: o.x + dx, y: o.y + dy } : o),
            electrical: project.electrical.map(o => attached.electrical.includes(o.id) ? { ...o, x: o.x + dx, y: o.y + dy } : o),
            hydraulic: project.hydraulic.map(o => attached.hydraulic.includes(o.id) ? { ...o, x: o.x + dx, y: o.y + dy } : o),
          });
        }
        else if (drag.kind === 'opening') { const p = snapToNearestWall(endX, endY); updateProjectState({ ...project, openings: project.openings.map(o => o.id === drag.id ? { ...o, x: p.x, y: p.y, rotation: p.rotation, wallId: p.wallId || o.wallId } : o) }); }
        else if (drag.kind === 'electrical') { const p = snapToNearestWall(endX, endY); updateProjectState({ ...project, electrical: project.electrical.map(o => o.id === drag.id ? { ...o, x: p.x, y: p.y, rotation: p.wallId ? p.rotation : (o.rotation ?? 0) } : o) }); }
        else { const p = snapToNearestWall(endX, endY); updateProjectState({ ...project, hydraulic: project.hydraulic.map(o => o.id === drag.id ? { ...o, x: p.x, y: p.y } : o) }); }
      }
      dragRef.current = null; setCurrentMouse(null); setIsDrawing(false); setStartPoint(null); return;
    }
    if (placementRef.current && e) {
      const rect = e.currentTarget.getBoundingClientRect();
      const px = snap((e.clientX - rect.left - canvasPan.x) / zoom), py = snap((e.clientY - rect.top - canvasPan.y) / zoom);
      const p = snapToNearestWall(px, py), x = p.x, y = p.y;
      if (tool === 'door' || tool === 'window') {
        const item: OpeningItem = { id: ensureUuid(tool + '-' + Date.now()), type: tool, wallId: p.wallId || project.walls[0]?.id || '', x, y, width: tool === 'door' ? 80 : 100, rotation: p.rotation };
        updateProjectState({ ...project, openings: [...project.openings, item] }); setSelectedObject({ kind: 'opening', id: item.id });
      } else if (tool === 'light' || tool === 'socket') {
        const item: ElectricalItem = { id: ensureUuid(tool + '-' + Date.now()), type: tool, x, y, rotation: p.wallId ? p.rotation : 0, circuit: tool === 'light' ? 'Circuito 1' : 'Circuito 2', label: tool === 'light' ? 'Ponto de Luz 100W' : 'Tomada 10A TUG' };
        updateProjectState({ ...project, electrical: [...project.electrical, item] }); setSelectedObject({ kind: 'electrical', id: item.id });
      } else if (tool === 'cold_water') {
        const item: HydraulicItem = { id: ensureUuid('af-' + Date.now()), type: 'cold_water', x, y, diameterMm: 25, label: 'Ponto AF 25mm' };
        updateProjectState({ ...project, hydraulic: [...project.hydraulic, item] }); setSelectedObject({ kind: 'hydraulic', id: item.id });
      }
      placementRef.current = false; setIsDrawing(false); setStartPoint(null); setCurrentMouse(null); return;
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55]">
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
      <div className="relative w-full min-w-0 rounded-2xl border border-[#2A3A55] overflow-hidden shadow-inner bg-[#101827]">
        <div className="absolute z-10 left-3 top-3 flex gap-2"><button type="button" onClick={()=>setShow3D(false)} className={'rounded-lg px-3 py-2 text-xs font-semibold '+(!show3D?'bg-blue-600 text-white':'bg-slate-900/80 text-slate-200')}>Planta 2D</button><button type="button" onClick={()=>setShow3D(true)} className={'rounded-lg px-3 py-2 text-xs font-semibold '+(show3D?'bg-blue-600 text-white':'bg-slate-900/80 text-slate-200')}>Vista 3D</button></div>
        {show3D ? <div className="h-[min(68vh,680px)] min-h-[320px]"><FloorPlan3DView project={project} isDark={isDark} /></div> : <canvas
          ref={canvasRef}
          onPointerDown={handleMouseDown}
          onPointerMove={handleMouseMove}
          onPointerUp={handleMouseUp}
          onPointerCancel={handleMouseUp}
          onLostPointerCapture={handleMouseUp}
          className="block w-full cursor-crosshair touch-none select-none"
          style={{ touchAction: 'none' }}
        />}

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

      {selectedObject && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#2A3A55] bg-[#17243A] p-2">
          <span className="px-2 text-xs text-[#9FB0C8]">Elemento selecionado</span>
          <button onClick={() => {
            if (selectedObject.kind === 'opening') updateProjectState({ ...project, openings: project.openings.map(o => o.id === selectedObject.id ? { ...o, rotation: ((o.rotation ?? 0) + 90) % 360 } : o) });
            else if (selectedObject.kind === 'electrical') updateProjectState({ ...project, electrical: project.electrical.map(o => o.id === selectedObject.id ? { ...o, rotation: ((o.rotation ?? 0) + 90) % 360 } : o) });
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
            else updateProjectState({ ...project, hydraulic: project.hydraulic.filter(o => o.id !== id) });
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

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#2A3A55] bg-[#17243A] p-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">Mobiliário e objetos</div>
          <p className="text-xs text-[#9FB0C8]">{(project.furniture ?? []).length} objeto(s) na planta · símbolos 2D e modelos 3D de bibliotecas externas CC0</p>
        </div>
        <button type="button" onClick={() => setShowFurnitureCatalog(true)} className="flex min-h-11 items-center gap-2 rounded-xl bg-[#1F66D6] px-4 text-sm font-semibold text-white hover:bg-[#1A57B8]">
          <Plus className="h-4 w-4" /> Abrir catálogo 2D / 3D
        </button>
      </div>

      {(project.furniture ?? []).length > 0 && (
        <div className="rounded-xl border border-[#2A3A55] bg-[#17243A] p-3">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#9FB0C8]">Objetos inseridos</h4>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(project.furniture ?? []).map(item => (
              <div key={item.id} className="flex min-w-0 items-center gap-2 rounded-lg border border-[#2A3A55] p-2">
                <img src={item.symbolUrl} alt="" className="h-10 w-10 rounded bg-white object-contain p-1" />
                <div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold text-white">{item.name}</div><div className="text-[10px] text-[#9FB0C8]">{(item.widthIn * 0.0254).toFixed(2)} × {(item.depthIn * 0.0254).toFixed(2)} m · {item.rotation}°</div></div>
                <button type="button" onClick={() => updateProjectState({...project, furniture:(project.furniture ?? []).map(value => value.id === item.id ? {...value, rotation:(value.rotation + 90) % 360} : value)})} className="rounded-lg border border-[#2A3A55] px-2 py-2 text-xs text-white" aria-label={`Girar ${item.name} 90 graus`}><RotateCw className="h-4 w-4" /></button>
                <button type="button" onClick={() => updateProjectState({...project, furniture:(project.furniture ?? []).filter(value => value.id !== item.id)})} className="rounded-lg border border-red-400/30 px-2 py-2 text-xs text-red-300" aria-label={`Remover ${item.name}`}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Tools Toolbar (Page 6 briefing: "Barra de ferramentas inferior") */}
      <div className="p-2.5 rounded-2xl bg-[#17243A] border border-[#2A3A55] grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-1">
        {[
          { id: 'select' as ToolMode, label: 'Mover/Selecionar', icon: Maximize2 },
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
