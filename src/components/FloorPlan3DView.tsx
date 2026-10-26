import React, { useEffect, useRef, useState } from 'react';
import type { FloorPlanProject } from '../types';

interface Props { project: FloorPlanProject; isDark: boolean; }

const THREE_URL = 'https://esm.sh/three@0.180.0';
const GLTF_URL = 'https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';

/**
 * A single WebGL scene for the complete floor plan. Walls, floor, service points,
 * openings and GLB furniture share one camera and depth buffer.
 */
export const FloorPlan3DView: React.FC<Props> = ({ project, isDark }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let frame = 0;
    let renderer: any;
    let scene: any;
    let camera: any;
    let controls: { yaw: number; pitch: number; distance: number; targetX: number; targetY: number; targetZ: number } | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let cleanupEvents: (() => void) | null = null;
    const cleanups: Array<() => void> = [];

    setError(null);
    setLoading(true);

    const boot = async () => {
      try {
        const [THREE, loaderModule] = await Promise.all([
          import(/* @vite-ignore */ THREE_URL),
          import(/* @vite-ignore */ GLTF_URL),
        ]);
        if (disposed) return;
        const { GLTFLoader } = loaderModule;
        scene = new THREE.Scene();
        scene.background = new THREE.Color(isDark ? '#0b1220' : '#eef2f7');
        scene.fog = new THREE.Fog(scene.background, 1200, 4200);

        const width = Math.max(host.clientWidth, 320);
        const height = Math.max(host.clientHeight, 320);
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        host.prepend(renderer.domElement);
        renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none;';

        camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
        const points = project.walls.flatMap(w => [{ x: w.x1, z: w.y1 }, { x: w.x2, z: w.y2 }]);
        const furniture = project.furniture ?? [];
        furniture.forEach(f => points.push({ x: f.x, z: f.y }));
        const minX = points.length ? Math.min(...points.map(p => p.x)) : 0;
        const maxX = points.length ? Math.max(...points.map(p => p.x)) : 600;
        const minZ = points.length ? Math.min(...points.map(p => p.z)) : 0;
        const maxZ = points.length ? Math.max(...points.map(p => p.z)) : 440;
        const spanX = Math.max(240, maxX - minX);
        const spanZ = Math.max(240, maxZ - minZ);
        const centerX = (minX + maxX) / 2;
        const centerZ = (minZ + maxZ) / 2;
        const target = new THREE.Vector3(centerX, 35, centerZ);
        controls = { yaw: -0.72, pitch: 0.78, distance: Math.max(spanX, spanZ) * 1.65, targetX: target.x, targetY: target.y, targetZ: target.z };

        scene.add(new THREE.HemisphereLight(0xffffff, isDark ? 0x475569 : 0x94a3b8, 2.0));
        const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
        keyLight.position.set(centerX - spanX, Math.max(spanX, spanZ), centerZ - spanZ);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.set(2048, 2048);
        scene.add(keyLight);
        const fillLight = new THREE.DirectionalLight(0xcbdcff, 1.1);
        fillLight.position.set(centerX + spanX, spanX * 0.7, centerZ + spanZ);
        scene.add(fillLight);

        const addBox = (w: number, h: number, d: number, x: number, y: number, z: number, color: number, roughness = 0.85) => {
          const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(Math.max(0.1, w), Math.max(0.1, h), Math.max(0.1, d)),
            new THREE.MeshStandardMaterial({ color, roughness })
          );
          mesh.position.set(x, y, z);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          scene.add(mesh);
          return mesh;
        };

        // One floor surface shared with all scene objects.
        addBox(spanX + 180, 4, spanZ + 180, centerX, -3, centerZ, isDark ? 0x1e293b : 0xdbe4ee);

        // Individual room floors are polygonal surfaces, not rectangular approximations.
        const roomMaterials: Record<string, number> = {
          concrete: isDark ? 0x64748b : 0xcbd5e1,
          wood: 0xa8794f,
          tile: isDark ? 0x94a3b8 : 0xe2e8f0,
          stone: isDark ? 0x78716c : 0xd6d3d1,
          laminate: 0xc49a6c,
        };
        (project.rooms ?? []).forEach((room: any) => {
          if (!Array.isArray(room.vertices) || room.vertices.length < 3) return;
          const shape = new THREE.Shape();
          shape.moveTo(room.vertices[0].x, -room.vertices[0].y);
          room.vertices.slice(1).forEach((p: {x:number;y:number}) => shape.lineTo(p.x, -p.y));
          shape.closePath();
          const floor = new THREE.Mesh(
            new THREE.ShapeGeometry(shape),
            new THREE.MeshStandardMaterial({ color: roomMaterials[room.material] ?? roomMaterials.concrete, roughness: room.material === 'tile' ? 0.35 : 0.85, side: THREE.DoubleSide })
          );
          floor.rotation.x = -Math.PI / 2;
          floor.position.y = -0.65;
          floor.receiveShadow = true;
          scene.add(floor);

          const center = room.vertices.reduce((a: {x:number;y:number}, p: {x:number;y:number}) => ({x:a.x+p.x/room.vertices.length,y:a.y+p.y/room.vertices.length}), {x:0,y:0});
          if (room.name) {
            const labelCanvas = document.createElement('canvas');
            labelCanvas.width = 512; labelCanvas.height = 128;
            const labelCtx = labelCanvas.getContext('2d');
            if (labelCtx) {
              labelCtx.clearRect(0,0,512,128);
              labelCtx.fillStyle = isDark ? 'rgba(15,23,42,0.72)' : 'rgba(255,255,255,0.72)';
              labelCtx.fillRect(12,28,488,72);
              labelCtx.font = 'bold 38px sans-serif';
              labelCtx.textAlign = 'center'; labelCtx.textBaseline = 'middle';
              labelCtx.fillStyle = isDark ? '#F8FAFC' : '#0F172A';
              labelCtx.fillText(String(room.name).slice(0,32),256,64);
              const texture = new THREE.CanvasTexture(labelCanvas);
              const label = new THREE.Mesh(new THREE.PlaneGeometry(72,18),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide}));
              label.rotation.x = -Math.PI/2;
              label.position.set(center.x,0.15,center.y);
              scene.add(label);
            }
          }
        });

        const grid = new THREE.GridHelper(Math.max(spanX, spanZ) + 160, Math.max(10, Math.round(Math.max(spanX, spanZ) / 20)), isDark ? 0x475569 : 0x94a3b8, isDark ? 0x334155 : 0xcbd5e1);
        grid.position.set(centerX, -0.7, centerZ);
        scene.add(grid);

        // Cut real openings for both doors and windows. Openings are projected to
        // the closest wall axis, so diagonal walls keep the correct angle and gap.
        const openingAssignments = new Map<string, Array<{x:number;y:number;width:number;rotation:number;type:'door'|'window';doorStyle?:string}>>();
        project.openings.forEach(o => {
          let bestWall: typeof project.walls[number] | undefined;
          let bestDistance = Infinity;
          project.walls.forEach(w => {
            const dx=w.x2-w.x1,dz=w.y2-w.y1,len2=dx*dx+dz*dz;
            if(len2<1)return;
            const t=Math.max(0,Math.min(1,((o.x-w.x1)*dx+(o.y-w.y1)*dz)/len2));
            const distance=Math.hypot(o.x-(w.x1+t*dx),o.y-(w.y1+t*dz));
            if((o.wallId===w.id || distance<bestDistance) && distance<32){bestWall=w;bestDistance=distance;}
          });
          if(bestWall) openingAssignments.set(bestWall.id,[...(openingAssignments.get(bestWall.id)||[]),o]);
        });

        project.walls.forEach(w => {
          const dx=w.x2-w.x1,dz=w.y2-w.y1,length=Math.hypot(dx,dz);
          if(length<1)return;
          const thickness=Math.max(4,w.thickness||8),angle=-Math.atan2(dz,dx);
          const openings=(openingAssignments.get(w.id)||[]).map(o=>{
            const t=Math.max(0,Math.min(1,((o.x-w.x1)*dx+(o.y-w.y1)*dz)/(length*length)));
            const halfWidth=Math.min(length*0.45,Math.max(10,o.width/2));
            return {start:Math.max(0,t*length-halfWidth),end:Math.min(length,t*length+halfWidth),type:o.type};
          }).sort((a,b)=>a.start-b.start);
          const addWallPart=(start:number,end:number,bottom:number,height:number)=>{
            if(end-start<1||height<1)return;
            const joinsAtStart=start<=0.001,joinsAtEnd=end>=length-0.001;
            const partStart=joinsAtStart?start-thickness/2:start,partEnd=joinsAtEnd?end+thickness/2:end;
            const partLength=partEnd-partStart,mid=(partStart+partEnd)/2;
            const mesh=addBox(partLength,height,thickness,w.x1+(dx/length)*mid,bottom+height/2,w.y1+(dz/length)*mid,isDark?0x94a3b8:0xcbd5e1);
            mesh.rotation.y=angle;
          };
          let cursor=0;
          openings.forEach(op=>{
            const start=Math.max(cursor,op.start),end=Math.max(start,op.end);
            addWallPart(cursor,start,0,100);
            if(op.type==='door') addWallPart(start,end,80,20);
            else {
              // Window aperture: sill below 35 units and header above 70 units.
              addWallPart(start,end,0,35);
              addWallPart(start,end,70,30);
            }
            cursor=Math.max(cursor,end);
          });
          addWallPart(cursor,length,0,100);
          const cap=addBox(length+thickness,2,thickness+1,(w.x1+w.x2)/2,101,(w.y1+w.y2)/2,isDark?0xcbd5e1:0xf8fafc);
          cap.rotation.y=angle;
        });

        // Procedural door models: frame, leaf, handle and material variants.
        // These are actual 3D meshes and remain selectable/editable through the 2D object.
        project.openings.forEach(o=>{
          let wall=project.walls.find(w=>w.id===o.wallId);
          if(!wall){
            let nearest=Infinity;
            project.walls.forEach(w=>{const dx=w.x2-w.x1,dz=w.y2-w.y1,l2=dx*dx+dz*dz||1,t=Math.max(0,Math.min(1,((o.x-w.x1)*dx+(o.y-w.y1)*dz)/l2)),d=Math.hypot(o.x-(w.x1+t*dx),o.y-(w.y1+t*dz));if(d<nearest){nearest=d;wall=w;}});
          }
          const angle=wall?-Math.atan2(wall.y2-wall.y1,wall.x2-wall.x1):-((o.rotation??0)*Math.PI/180);
          const widthPx=Math.max(20,o.width),half=widthPx/2;
          if(o.type==='door'){
            const style=o.doorStyle??'wood';
            const wood=style==='wood',glass=style==='glass'||style==='sliding',color=wood?0x98663d:style==='metal'?0x64748b:0x9ca3af;
            const frameColor=0xe2e8f0;
            const left=addBox(3,82,5,o.x-half+1.5,41,o.y,frameColor);left.rotation.y=angle;
            const right=addBox(3,82,5,o.x+half-1.5,41,o.y,frameColor);right.rotation.y=angle;
            const header=addBox(widthPx,3,5,o.x,81,o.y,frameColor);header.rotation.y=angle;
            if(style==='sliding'){
              const panelA=addBox(widthPx*0.49,78,3,o.x-widthPx*0.245,40,o.y,0x94a3b8,0.35);panelA.rotation.y=angle;
              const panelB=addBox(widthPx*0.49,78,3,o.x+widthPx*0.245,40,o.y,0x64748b,0.35);panelB.rotation.y=angle;
              const rail=addBox(widthPx,2,6,o.x,79,o.y,0x475569);rail.rotation.y=angle;
            }else{
              const leaf=addBox(widthPx*0.9,78,3,o.x,40,o.y,glass?0x67e8f9:color,glass?0.25:0.9);leaf.rotation.y=angle;
              if(glass) leaf.material=new THREE.MeshStandardMaterial({color:0x67e8f9,transparent:true,opacity:0.58,roughness:0.2,metalness:0.1,side:THREE.DoubleSide});
              const handle=addBox(2,8,2,o.x+half*0.65,42,o.y-2,0xfacc15);handle.rotation.y=angle;
            }
          }else{
            // Window frame and glazing occupy the aperture; wall meshes are cut away around it.
            const frame=0xe2e8f0,glass=0x38bdf8;
            const sill=addBox(widthPx,3,thickness+2,o.x,35,o.y,frame);sill.rotation.y=angle;
            const head=addBox(widthPx,3,thickness+2,o.x,70,o.y,frame);head.rotation.y=angle;
            const jambL=addBox(3,35,thickness+2,o.x-half+1.5,52.5,o.y,frame);jambL.rotation.y=angle;
            const jambR=addBox(3,35,thickness+2,o.x+half-1.5,52.5,o.y,frame);jambR.rotation.y=angle;
            const pane=addBox(widthPx-6,30,2,o.x,52.5,o.y,glass,0.25);
            pane.material=new THREE.MeshStandardMaterial({color:glass,transparent:true,opacity:0.55,roughness:0.2,side:THREE.DoubleSide});pane.rotation.y=angle;
          }
        });

        project.electrical.forEach(item => {
          if ((item.type === 'wire' || item.type === 'conduit') && item.x2 !== undefined && item.y2 !== undefined) { const dx=item.x2-item.x,dz=item.y2-item.y,len=Math.hypot(dx,dz); if(len>1){const mesh=addBox(len,item.type==='conduit'?4:2,2,(item.x+item.x2)/2,8,(item.y+item.y2)/2,item.type==='conduit'?0xa78bfa:0xfacc15);mesh.rotation.y=-Math.atan2(dz,dx);} return; }
          if (item.type === 'solar_panel') {
            const panel = addBox(28, 2, 20, item.x, 8, item.y, 0x1d4ed8);
            panel.rotation.y = -((item.rotation ?? 0) * Math.PI / 180);
            panel.material = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, emissive: 0x172554, roughness: 0.35, metalness: 0.25 });
            return;
          }
          const color = item.type === 'light' ? 0xfacc15 : item.type === 'panel' ? 0x2563eb : 0xfb7185;
          const point = new THREE.Mesh(new THREE.SphereGeometry(item.type === 'light' ? 6 : 4, 16, 12), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.12 }));
          point.position.set(item.x, item.type === 'light' ? 102 : 7, item.y);
          scene.add(point);
        });
        project.hydraulic.forEach(item => {
          if ((item.type === 'water_pipe' || item.type === 'sewage_pipe' || item.type === 'vent_pipe' || item.type === 'rain_pipe') && item.x2 !== undefined && item.y2 !== undefined) { const dx=item.x2-item.x,dz=item.y2-item.y,len=Math.hypot(dx,dz); if(len>1){const mesh=addBox(len,item.type==='sewage_pipe'?4:3,3,(item.x+item.x2)/2,5,(item.y+item.y2)/2,item.type==='sewage_pipe'?0x92400e:item.type==='rain_pipe'?0x2563eb:item.type==='vent_pipe'?0xa78bfa:0x0ea5e9);mesh.rotation.y=-Math.atan2(dz,dx);} return; }
          if (item.type === 'pool') {
            const pool = addBox(48, 3, 32, item.x, -0.2, item.y, 0x0891b2);
            pool.material = new THREE.MeshStandardMaterial({ color: 0x0891b2, roughness: 0.2, metalness: 0.05, transparent: true, opacity: 0.78 });
            return;
          }
          const color = item.type === 'sewage' || item.type === 'drain' || item.type === 'sewage_pipe' || item.type === 'grease_trap' || item.type === 'inspection_box' ? 0x92400e : item.type === 'rain_pipe' ? 0x2563eb : item.type === 'vent_pipe' ? 0xa78bfa : 0x0ea5e9;
          const point = new THREE.Mesh(new THREE.CylinderGeometry(['sink','faucet','shower','toilet','floor_drain','cleanout','inspection_box','tank','heater','grease_trap'].includes(item.type)?8:5, ['sink','faucet','shower','toilet'].includes(item.type)?8:5, 5, 16), new THREE.MeshStandardMaterial({ color }));
          point.position.set(item.x, 5, item.y);
          scene.add(point);
        });

        // Load genuine GLB geometry into the same scene, normalized to catalog dimensions.
        const loader = new GLTFLoader();
        await Promise.all(furniture.map(item => new Promise<void>(resolve => {
          if (!item.modelUrl) { resolve(); return; }
          loader.load(item.modelUrl, (gltf: any) => {
            if (disposed) { resolve(); return; }
            const model = gltf.scene;
            model.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3();
            box.getSize(size);
            if (size.x <= 0 || size.y <= 0 || size.z <= 0) { resolve(); return; }
            const targetWidth = Math.max(12, item.widthIn * 2.54 / 2.5);
            const targetDepth = Math.max(12, item.depthIn * 2.54 / 2.5);
            const targetHeight = Math.max(10, item.heightIn * 2.54 / 2.5);
            model.scale.set(targetWidth / size.x, targetHeight / size.y, targetDepth / size.z);
            model.rotation.y = -(item.rotation * Math.PI / 180);
            model.updateMatrixWorld(true);
            const scaledBox = new THREE.Box3().setFromObject(model);
            model.position.set(item.x, -scaledBox.min.y, item.y);
            model.traverse((node: any) => {
              if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; }
            });
            scene.add(model);
            resolve();
          }, undefined, () => resolve());
        })));
        if (disposed) return;
        setLoading(false);

        const updateCamera = () => {
          if (!controls) return;
          const c = controls;
          const horizontal = Math.cos(c.pitch) * c.distance;
          camera.position.set(c.targetX + Math.sin(c.yaw) * horizontal, c.targetY + Math.sin(c.pitch) * c.distance, c.targetZ + Math.cos(c.yaw) * horizontal);
          camera.lookAt(c.targetX, c.targetY, c.targetZ);
        };
        updateCamera();

        let active = new Map<number, { x: number; y: number }>();
        let start: { x: number; y: number; yaw: number; pitch: number; distance: number; tx: number; ty: number; tz: number } | null = null;
        let pinchStart: { distance: number; zoom: number; cx: number; cy: number; tx: number; ty: number; tz: number } | null = null;
        const onDown = (e: PointerEvent) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          active.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (!controls) return;
          const pts = [...active.values()];
          if (pts.length === 1) start = { x: e.clientX, y: e.clientY, yaw: controls.yaw, pitch: controls.pitch, distance: controls.distance, tx: controls.targetX, ty: controls.targetY, tz: controls.targetZ };
          if (pts.length >= 2) {
            const [a, b] = pts;
            pinchStart = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: controls.distance, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, tx: controls.targetX, ty: controls.targetY, tz: controls.targetZ };
            start = null;
          }
        };
        const onMove = (e: PointerEvent) => {
          if (!active.has(e.pointerId) || !controls) return;
          active.set(e.pointerId, { x: e.clientX, y: e.clientY });
          const pts = [...active.values()];
          if (pts.length >= 2 && pinchStart) {
            const [a, b] = pts, p = pinchStart;
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            controls.distance = Math.max(80, Math.min(5000, p.zoom * p.distance / Math.max(1, dist)));
            const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
            controls.targetX = p.tx - (cx - p.cx) * controls.distance / 1200;
            controls.targetZ = p.tz + (cy - p.cy) * controls.distance / 1200;
          } else if (start) {
            controls.yaw = start.yaw - (e.clientX - start.x) * 0.008;
            controls.pitch = Math.max(0.12, Math.min(1.42, start.pitch + (e.clientY - start.y) * 0.006));
          }
          updateCamera();
        };
        const onUp = (e: PointerEvent) => { active.delete(e.pointerId); if (active.size < 2) pinchStart = null; if (!active.size) start = null; };
        const onWheel = (e: WheelEvent) => { e.preventDefault(); if (controls) { controls.distance = Math.max(80, Math.min(5000, controls.distance * (e.deltaY > 0 ? 1.1 : 0.9))); updateCamera(); } };
        renderer.domElement.addEventListener('pointerdown', onDown);
        renderer.domElement.addEventListener('pointermove', onMove);
        renderer.domElement.addEventListener('pointerup', onUp);
        renderer.domElement.addEventListener('pointercancel', onUp);
        renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
        cleanupEvents = () => {
          renderer?.domElement?.removeEventListener('pointerdown', onDown);
          renderer?.domElement?.removeEventListener('pointermove', onMove);
          renderer?.domElement?.removeEventListener('pointerup', onUp);
          renderer?.domElement?.removeEventListener('pointercancel', onUp);
          renderer?.domElement?.removeEventListener('wheel', onWheel);
        };

        resizeObserver = new ResizeObserver(() => {
          if (!renderer || !camera || !host) return;
          const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
          renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
        });
        resizeObserver.observe(host);

        const animate = () => {
          if (disposed) return;
          frame = requestAnimationFrame(animate);
          renderer.render(scene, camera);
        };
        animate();
      } catch (e) {
        if (!disposed) {
          setError(e instanceof Error ? e.message : 'Não foi possível inicializar a cena 3D.');
          setLoading(false);
        }
      }
    };

    void boot();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      cleanupEvents?.();
      cleanups.forEach(fn => fn());
      if (scene) scene.traverse((object: any) => {
        object.geometry?.dispose?.();
        if (Array.isArray(object.material)) object.material.forEach((m: any) => m.dispose?.());
        else object.material?.dispose?.();
      });
      if (renderer) { renderer.dispose(); renderer.domElement.remove(); }
    };
  }, [project, isDark]);

  return <div className="relative h-full min-h-[320px] w-full overflow-hidden rounded-xl border border-slate-700/50">
    <div ref={hostRef} className="absolute inset-0" aria-label="Cena 3D integrada da planta" role="img" />
    {loading && <div className="absolute bottom-3 left-3 rounded-md bg-slate-950/80 px-3 py-2 text-xs text-white" role="status">Carregando cena 3D e modelos GLB…</div>}
    {error && <div className="absolute inset-x-3 bottom-3 rounded-md border border-amber-500/40 bg-slate-950/90 px-3 py-2 text-sm text-amber-100" role="alert">Falha ao carregar a cena 3D: {error}. Verifique a conexão e a disponibilidade do CDN.</div>}
    <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-slate-950/75 px-3 py-2 text-xs text-white">Arraste para orbitar · Pinça/roda para zoom · Objetos com profundidade real</div>
  </div>;
};
