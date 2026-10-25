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
        const grid = new THREE.GridHelper(Math.max(spanX, spanZ) + 160, Math.max(10, Math.round(Math.max(spanX, spanZ) / 20)), isDark ? 0x475569 : 0x94a3b8, isDark ? 0x334155 : 0xcbd5e1);
        grid.position.set(centerX, -0.7, centerZ);
        scene.add(grid);

        // Walls are real meshes and therefore correctly occlude objects behind them.
        project.walls.forEach(w => {
          const dx = w.x2 - w.x1;
          const dz = w.y2 - w.y1;
          const length = Math.hypot(dx, dz);
          if (length < 1) return;
          const thickness = Math.max(4, w.thickness || 8);
          const wall = addBox(length, 100, thickness, (w.x1 + w.x2) / 2, 50, (w.y1 + w.y2) / 2, isDark ? 0x94a3b8 : 0xcbd5e1);
          wall.rotation.y = -Math.atan2(dz, dx);
          // Top cap gives the wall a finished architectural look.
          const cap = addBox(length, 2, thickness + 1, (w.x1 + w.x2) / 2, 101, (w.y1 + w.y2) / 2, isDark ? 0xcbd5e1 : 0xf8fafc);
          cap.rotation.y = wall.rotation.y;
        });

        // Openings are represented as clear, colored markers; wall booleans are intentionally not faked.
        project.openings.forEach(o => {
          const widthPx = Math.max(16, o.width * 0.5);
          const marker = addBox(widthPx, o.type === 'window' ? 8 : 3, 5, o.x, o.type === 'window' ? 52 : 3, o.y, o.type === 'window' ? 0x38bdf8 : 0xd97706, 0.45);
          marker.rotation.y = -((o.rotation ?? 0) * Math.PI / 180);
        });

        project.electrical.forEach(item => {
          const color = item.type === 'light' ? 0xfacc15 : item.type === 'panel' ? 0x2563eb : 0xfb7185;
          const point = new THREE.Mesh(new THREE.SphereGeometry(item.type === 'light' ? 6 : 4, 16, 12), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.12 }));
          point.position.set(item.x, item.type === 'light' ? 102 : 7, item.y);
          scene.add(point);
        });
        project.hydraulic.forEach(item => {
          const color = item.type === 'sewage' || item.type === 'drain' ? 0x92400e : 0x0ea5e9;
          const point = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 5, 16), new THREE.MeshStandardMaterial({ color }));
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
