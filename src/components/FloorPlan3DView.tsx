import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { FloorPlanProject } from '../types';

interface Props { project: FloorPlanProject; isDark: boolean; }
const MODEL_VIEWER_SCRIPT = 'https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js';

export const FloorPlan3DView: React.FC<Props> = ({ project, isDark }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ centerX: number; centerY: number; distance: number; panX: number; panY: number; zoom: number } | null>(null);
  const drag = useRef<{ x: number; y: number; angle: number; panX: number; panY: number } | null>(null);
  const [camera, setCamera] = useState({ angle: -0.65, zoom: 1, panX: 0, panY: 0 });
  const [size, setSize] = useState({ width: 0, height: 320 });

  useEffect(() => {
    const script = document.querySelector<HTMLScriptElement>(`script[src="${MODEL_VIEWER_SCRIPT}"]`);
    if (!script) {
      const next = document.createElement('script');
      next.type = 'module';
      next.src = MODEL_VIEWER_SCRIPT;
      document.head.appendChild(next);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const updateSize = () => {
      const rect = parent.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  const layout = useMemo(() => {
    const all = project.walls.flatMap(w => [{ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }]);
    if (!all.length || !size.width) return null;
    const minX = Math.min(...all.map(p => p.x)), maxX = Math.max(...all.map(p => p.x));
    const minY = Math.min(...all.map(p => p.y)), maxY = Math.max(...all.map(p => p.y));
    const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;
    const sceneHeight = 100;
    const scale = Math.min((size.width - 80) / Math.max(120, maxX - minX + maxY - minY), (size.height - 100) / Math.max(120, (maxX - minX + maxY - minY) * .55 + sceneHeight)) * camera.zoom;
    const projectPoint = (x: number, y: number, z: number) => {
      const dx = x - centerX, dy = y - centerY;
      const rx = dx * Math.cos(camera.angle) - dy * Math.sin(camera.angle);
      const ry = dx * Math.sin(camera.angle) + dy * Math.cos(camera.angle);
      return { x: size.width / 2 + camera.panX + (rx - ry) * scale * .72, y: size.height / 2 + camera.panY + (rx + ry) * scale * .36 - z * scale };
    };
    return { all, minX, maxX, minY, maxY, scale, projectPoint };
  }, [project.walls, size, camera]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layout) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = isDark ? '#0b1220' : '#f1f5f9';
    ctx.fillRect(0, 0, rect.width, rect.height);
    const { minX, maxX, minY, maxY, scale, projectPoint } = layout;
    const polygon = (points: {x:number;y:number;z:number}[], fill: string) => {
      const pts = points.map(p => projectPoint(p.x, p.y, p.z));
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = 'rgba(71,85,105,.65)'; ctx.lineWidth = 1; ctx.stroke();
    };
    polygon([{x:minX,y:minY,z:0},{x:maxX,y:minY,z:0},{x:maxX,y:maxY,z:0},{x:minX,y:maxY,z:0}], isDark ? '#1e293b' : '#e2e8f0');
    project.walls.forEach(w => {
      const t = Math.max(4, w.thickness || 8), vx = w.x2 - w.x1, vy = w.y2 - w.y1, len = Math.hypot(vx, vy) || 1;
      const ox = -vy / len * t / 2, oy = vx / len * t / 2;
      const a={x:w.x1+ox,y:w.y1+oy}, b={x:w.x2+ox,y:w.y2+oy}, c={x:w.x2-ox,y:w.y2-oy}, d={x:w.x1-ox,y:w.y1-oy};
      polygon([{...a,z:0},{...b,z:0},{...b,z:100},{...a,z:100}], isDark ? '#94a3b8' : '#cbd5e1');
      polygon([{...b,z:0},{...c,z:0},{...c,z:100},{...b,z:100}], isDark ? '#64748b' : '#94a3b8');
      polygon([{...a,z:100},{...b,z:100},{...c,z:100},{...d,z:100}], isDark ? '#cbd5e1' : '#f8fafc');
    });
    project.openings.forEach(o => {
      const p=projectPoint(o.x,o.y,o.type==='window'?48:8);
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(((o.rotation||0)*Math.PI/180)+camera.angle);
      ctx.fillStyle=o.type==='window'?'#38bdf8':'#a16207'; ctx.fillRect(-Math.max(8,o.width*scale*.25),-5,Math.max(16,o.width*scale*.5),10);
      ctx.strokeStyle=isDark?'#e2e8f0':'#334155'; ctx.strokeRect(-Math.max(8,o.width*scale*.25),-5,Math.max(16,o.width*scale*.5),10); ctx.restore();
    });
    [...project.electrical.map(e=>({...e,group:'electric'})),...project.hydraulic.map(e=>({...e,group:'hydraulic'}))].forEach(item=>{
      const p=projectPoint(item.x,item.y,item.group==='electric'&&item.type==='light'?100:45);
      ctx.beginPath();ctx.arc(p.x,p.y,4.5,0,Math.PI*2);ctx.fillStyle=item.group==='hydraulic'?'#38bdf8':item.type==='light'?'#facc15':'#fb7185';ctx.fill();
    });
    ctx.fillStyle=isDark?'#cbd5e1':'#475569';ctx.font='12px sans-serif';ctx.textAlign='left';
    ctx.fillText('Arraste para orbitar · Pinça para zoom · Dois dedos para mover',14,rect.height-18);
  }, [project, isDark, camera, layout]);

  const onDown=(e: React.PointerEvent<HTMLCanvasElement>)=>{
    e.currentTarget.setPointerCapture(e.pointerId); pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const pts=[...pointers.current.values()];
    if(pts.length>=2){const [a,b]=pts;gesture.current={centerX:(a.x+b.x)/2,centerY:(a.y+b.y)/2,distance:Math.hypot(a.x-b.x,a.y-b.y),panX:camera.panX,panY:camera.panY,zoom:camera.zoom};drag.current=null;}
    else drag.current={x:e.clientX,y:e.clientY,angle:camera.angle,panX:camera.panX,panY:camera.panY};
  };
  const onMove=(e: React.PointerEvent<HTMLCanvasElement>)=>{
    if(!pointers.current.has(e.pointerId))return;
    pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});const pts=[...pointers.current.values()];
    if(pts.length>=2&&gesture.current){const [a,b]=pts, g=gesture.current,cx=(a.x+b.x)/2,cy=(a.y+b.y)/2,d=Math.hypot(a.x-b.x,a.y-b.y);setCamera(v=>({...v,zoom:Math.max(.25,Math.min(4,g.zoom*d/Math.max(1,g.distance))),panX:g.panX+cx-g.centerX,panY:g.panY+cy-g.centerY}));}
    else if(drag.current){const d=drag.current;setCamera(v=>({...v,angle:d.angle+(e.clientX-d.x)*.008,panY:d.panY+(e.clientY-d.y)}));}
  };
  const onUp=(e: React.PointerEvent<HTMLCanvasElement>)=>{pointers.current.delete(e.pointerId);if(pointers.current.size<2)gesture.current=null;if(!pointers.current.size)drag.current=null;};

  return <div className="relative h-full min-h-[320px] w-full overflow-hidden rounded-xl border border-slate-700/50">
    <canvas ref={canvasRef} className="absolute inset-0 h-full min-h-[320px] w-full touch-none" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onLostPointerCapture={onUp} />
    {layout && <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-label="Móveis 3D posicionados na planta">
      {(project.furniture ?? []).filter(item => item.modelUrl).map(item => {
        const point = layout.projectPoint(item.x, item.y, 3);
        const width = Math.max(42, item.widthIn * 2.54 * layout.scale * .78);
        const height = Math.max(42, item.depthIn * 2.54 * layout.scale * .78);
        return <div key={item.id} title={item.name} style={{position:'absolute',left:point.x-width/2,top:point.y-height/2,width,height,overflow:'hidden'}}>
          {React.createElement('model-viewer' as any, {src:item.modelUrl,poster:item.thumbnailUrl ?? undefined,alt:item.name,'camera-controls':false,'auto-rotate':false,'interaction-prompt':'none',orientation:`${item.rotation}deg 0deg 0deg`,style:{width:'100%',height:'100%',backgroundColor:'transparent','--poster-color':'transparent',pointerEvents:'none'}})}
        </div>;
      })}
    </div>}
    <div className="absolute right-3 top-3 z-10 flex gap-2"><button type="button" onClick={()=>setCamera(c=>({...c,zoom:Math.min(4,c.zoom*1.2)}))} className="rounded-md border bg-slate-900/80 px-3 py-2 text-white" aria-label="Aproximar">+</button><button type="button" onClick={()=>setCamera(c=>({...c,zoom:Math.max(.25,c.zoom/1.2)}))} className="rounded-md border bg-slate-900/80 px-3 py-2 text-white" aria-label="Afastar">−</button><button type="button" onClick={()=>setCamera({angle:-.65,zoom:1,panX:0,panY:0})} className="rounded-md border bg-slate-900/80 px-3 py-2 text-white">Resetar vista</button></div>
  </div>;
};
