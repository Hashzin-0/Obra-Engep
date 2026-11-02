import React, { useEffect, useRef, useState } from 'react';
import type { FloorPlanProject } from '../types';

interface Props { project: FloorPlanProject; isDark: boolean; isNightMode?: boolean; }

const THREE_URL = 'https://esm.sh/three@0.180.0';
const GLTF_URL = 'https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';

/**
 * A single WebGL scene for the complete floor plan. Walls, floor, service points,
 * openings and GLB furniture share one camera and depth buffer.
 */
export const FloorPlan3DView: React.FC<Props> = ({ project, isDark, isNightMode = false }) => {
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
        scene.background = new THREE.Color(isNightMode ? '#050816' : isDark ? '#0b1220' : '#eef2f7');
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
        const floorProjects = (project.levels?.length ? project.levels : [{ ...project, elevation: 0, kind: 'terreo' as const, level: 0 }]).slice().sort((a,b) => a.elevation - b.elevation);
        const points = floorProjects.flatMap(floor => [...floor.walls.flatMap(w => [{ x: w.x1, z: w.y1 }, { x: w.x2, z: w.y2 }]), ...(floor.furniture ?? []).map(item => ({ x: item.x, z: item.y }))]);
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

        scene.add(new THREE.HemisphereLight(0xffffff, isNightMode ? 0x111827 : isDark ? 0x475569 : 0x94a3b8, isNightMode ? 0.28 : 2.0));
        const keyLight = new THREE.DirectionalLight(0xffffff, isNightMode ? 0.12 : 3.2);
        keyLight.position.set(centerX - spanX, Math.max(spanX, spanZ), centerZ - spanZ);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.set(2048, 2048);
        scene.add(keyLight);
        const fillLight = new THREE.DirectionalLight(0xcbdcff, isNightMode ? 0.08 : 1.1);
        fillLight.position.set(centerX + spanX, spanX * 0.7, centerZ + spanZ);
        scene.add(fillLight);

        for (const floorProject of floorProjects) {
          const floorGroup = new THREE.Group();
          floorGroup.position.y = floorProject.elevation ?? 0;
          scene.add(floorGroup);
          const furniture = floorProject.furniture ?? [];
        const addBox = (w: number, h: number, d: number, x: number, y: number, z: number, color: number, roughness = 0.85) => {
          const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(Math.max(0.1, w), Math.max(0.1, h), Math.max(0.1, d)),
            new THREE.MeshStandardMaterial({ color, roughness })
          );
          mesh.position.set(x, y, z);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          floorGroup.add(mesh);
          return mesh;
        };

        type SceneInteraction = {
          root: any;
          kind: 'door' | 'window' | 'light' | 'switch' | 'water' | 'flush' | 'pool';
          progress: number;
          target: number;
          circuit?: string;
          update: (progress: number, elapsed: number) => void;
        };
        const sceneInteractions: SceneInteraction[] = [];
        const addSceneInteraction = (
          root: any,
          kind: SceneInteraction['kind'],
          update: SceneInteraction['update'],
          circuit?: string,
          initiallyActive = false
        ) => {
          const interaction: SceneInteraction = {
            root, kind, progress: initiallyActive ? 1 : 0,
            target: initiallyActive ? 1 : 0, circuit, update
          };
          root.userData.sceneInteraction = interaction;
          sceneInteractions.push(interaction);
          floorGroup.add(root);
          update(interaction.progress, 0);
          return interaction;
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
        (floorProject.rooms ?? []).forEach((room: any) => {
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
          floorGroup.add(floor);

          // Rodapé contínuo na face interna de cada cômodo. A orientação do
          // polígono determina a normal interna, mantendo o acabamento voltado
          // para dentro mesmo quando os vértices estão em sentido horário.
          const signedArea = room.vertices.reduce((area: number, point: {x:number;y:number}, index: number) => {
            const next = room.vertices[(index + 1) % room.vertices.length];
            return area + point.x * next.y - next.x * point.y;
          }, 0) / 2;
          const inwardDirection = signedArea >= 0 ? 1 : -1;
          room.vertices.forEach((point: {x:number;y:number}, index: number) => {
            const next = room.vertices[(index + 1) % room.vertices.length];
            const dx = next.x - point.x;
            const dz = next.y - point.y;
            const length = Math.hypot(dx, dz);
            if (length < 1) return;
            const midX = (point.x + next.x) / 2;
            const midZ = (point.y + next.y) / 2;
            const nearestWall = floorProject.walls.reduce((closest, wall) => {
              const wallDx = wall.x2 - wall.x1;
              const wallDz = wall.y2 - wall.y1;
              const wallLengthSquared = wallDx * wallDx + wallDz * wallDz;
              const t = wallLengthSquared > 0
                ? Math.max(0, Math.min(1, ((midX - wall.x1) * wallDx + (midZ - wall.y1) * wallDz) / wallLengthSquared))
                : 0;
              const distance = Math.hypot(midX - (wall.x1 + t * wallDx), midZ - (wall.y1 + t * wallDz));
              return distance < closest.distance ? { distance, thickness: wall.thickness } : closest;
            }, { distance: Infinity, thickness: 8 });
            const wallThickness = Math.max(4, nearestWall.thickness || 8);
            const inwardOffset = wallThickness / 2 + 0.9;
            const baseboard = addBox(
              length + 1,
              6,
              1.8,
              midX + (-dz / length) * inwardDirection * inwardOffset,
              3,
              midZ + (dx / length) * inwardDirection * inwardOffset,
              isDark ? 0xb6a18a : 0x9a8066
            );
            baseboard.rotation.y = -Math.atan2(dz, dx) + (inwardDirection < 0 ? Math.PI : 0);
          });

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
              floorGroup.add(label);
            }
          }
        });

        // The reference grid belongs exclusively to level zero. Checking both
        // fields prevents upper floors incorrectly tagged as "terreo" from drawing it.
        if (floorProject.level === 0 && floorProject.kind === 'terreo') {
          const grid = new THREE.GridHelper(Math.max(spanX, spanZ) + 160, Math.max(10, Math.round(Math.max(spanX, spanZ) / 20)), isDark ? 0x475569 : 0x94a3b8, isDark ? 0x334155 : 0xcbd5e1);
          grid.position.set(centerX, -0.7, centerZ);
          floorGroup.add(grid);
        }

        // Assign both doors and windows to their host wall. Openings are real
        // gaps in the wall mesh, not decorative markers laid over a solid wall.
        const openingAssignments = new Map<string, Array<{x:number;y:number;width:number;rotation?:number;type:'door'|'window';style?:string}>>();
        floorProject.openings.forEach(o => {
          let bestWall: typeof floorProject.walls[number] | undefined;
          let bestDistance = Infinity;
          floorProject.walls.forEach(w => {
            const dx = w.x2-w.x1, dz = w.y2-w.y1, len2 = dx*dx+dz*dz;
            if (len2 < 1) return;
            const t = Math.max(0, Math.min(1, ((o.x-w.x1)*dx+(o.y-w.y1)*dz)/len2));
            const distance = Math.hypot(o.x-(w.x1+t*dx), o.y-(w.y1+t*dz));
            if ((o.wallId === w.id && distance < 40) || (distance < bestDistance && distance < 28)) { bestWall=w; bestDistance=distance; }
          });
          if (bestWall) openingAssignments.set(bestWall.id, [...(openingAssignments.get(bestWall.id)||[]), o]);
        });

        floorProject.walls.forEach(w => {
          const dx = w.x2 - w.x1;
          const dz = w.y2 - w.y1;
          const length = Math.hypot(dx, dz);
          if (length < 1) return;
          const thickness = Math.max(4, w.thickness || 8);
          const angle = -Math.atan2(dz, dx);
          const openings = (openingAssignments.get(w.id) || []).map(o => {
            const t = Math.max(0, Math.min(1, ((o.x-w.x1)*dx+(o.y-w.y1)*dz)/(length*length)));
            const widthPx = Math.min(length * 0.8, Math.max(16, o.width * 0.5));
            return { start: Math.max(0, t*length-widthPx/2), end: Math.min(length, t*length+widthPx/2), type:o.type };
          }).sort((a,b)=>a.start-b.start);
          const addWallPart = (start:number, end:number, bottom:number, height:number) => {
            if (end-start < 1 || height < 1) return;
            const joinsAtStart = start <= 0.001, joinsAtEnd = end >= length - 0.001;
            const partStart = joinsAtStart ? start - thickness / 2 : start;
            const partEnd = joinsAtEnd ? end + thickness / 2 : end;
            const partLength = partEnd - partStart, mid = (partStart + partEnd) / 2;
            const x = w.x1 + (dx/length)*mid, z = w.y1 + (dz/length)*mid;
            const mesh = addBox(partLength, height, thickness, x, bottom+height/2, z, isDark ? 0x94a3b8 : 0xcbd5e1);
            mesh.rotation.y = angle;
          };
          let cursor = 0;
          openings.forEach(opening => {
            const start = Math.max(cursor, opening.start), end = Math.max(start, opening.end);
            addWallPart(cursor, start, 0, 100);
            if (opening.type === 'door') {
              addWallPart(start, end, 80, 20);
            } else {
              // Window opening: sill at 30 and lintel above 72 (scene units).
              addWallPart(start, end, 0, 30);
              addWallPart(start, end, 72, 28);
            }
            cursor = Math.max(cursor, end);
          });
          addWallPart(cursor, length, 0, 100);
          const cap = addBox(length + thickness, 2, thickness + 1, (w.x1 + w.x2) / 2, 101, (w.y1 + w.y2) / 2, isDark ? 0xcbd5e1 : 0xf8fafc);
          cap.rotation.y = angle;
        });

        // Fill shared junctions with a small wall-material core. This closes the
        // diagonal corner gaps left by intersecting rotated wall boxes.
        const junctions: Array<{x:number;z:number;count:number}> = [];
        floorProject.walls.forEach(w => [{x:w.x1,z:w.y1},{x:w.x2,z:w.y2}].forEach(p => {
          let node=junctions.find(v=>Math.hypot(v.x-p.x,v.z-p.z)<3);
          if (!node) { node={x:p.x,z:p.z,count:0}; junctions.push(node); }
          node.count++;
        }));
        junctions.filter(p=>p.count>1).forEach(p => {
          const thickness=Math.max(4,...floorProject.walls.filter(w=>Math.hypot(w.x1-p.x,w.y1-p.z)<3||Math.hypot(w.x2-p.x,w.y2-p.z)<3).map(w=>w.thickness||8));
          addBox(thickness,100,thickness,p.x,50,p.z,isDark?0x94a3b8:0xcbd5e1);
          addBox(thickness+1,2,thickness+1,p.x,101,p.z,isDark?0xcbd5e1:0xf8fafc);
        });

        // Batentes e folhas móveis. Cada abertura possui um controlador
        // independente para que a interação não altere a geometria persistida.
        floorProject.openings.forEach(o => {
          const widthPx = Math.max(16, o.width * 0.5);
          const angle = -((o.rotation ?? 0) * Math.PI / 180);
          const hostWall = floorProject.walls.find(w => w.id === o.wallId);
          const frameDepth = Math.max(6, (hostWall?.thickness ?? 8) + 3);
          const offsetOnWall = (distance: number) => ({
            x: o.x + Math.cos(angle) * distance,
            z: o.y - Math.sin(angle) * distance
          });
          const left = offsetOnWall(-widthPx / 2), right = offsetOnWall(widthPx / 2);
          const frameColor = o.type === 'door'
            ? (o.doorStyle === 'metal' ? 0x94a3b8 : o.doorStyle === 'glass' ? 0x64748b : 0x805333)
            : 0x64748b;
          const jambHeight = o.type === 'door' ? 80 : 42;
          const jambY = o.type === 'door' ? 40 : 51;
          const jambLeft = addBox(o.type === 'door' ? 4 : 3, jambHeight, frameDepth, left.x, jambY, left.z, frameColor);
          const jambRight = addBox(o.type === 'door' ? 4 : 3, jambHeight, frameDepth, right.x, jambY, right.z, frameColor);
          jambLeft.rotation.y = angle; jambRight.rotation.y = angle;

          if (o.type === 'door') {
            const style = o.doorStyle ?? 'wood';
            const frameTop = addBox(widthPx + 4, 4, frameDepth, o.x, 80, o.y, frameColor);
            frameTop.rotation.y = angle;
            const doorRoot = new THREE.Group();
            doorRoot.position.set(o.x, 0, o.y);
            doorRoot.rotation.y = angle;
            const material = style === 'glass'
              ? new THREE.MeshStandardMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.62, metalness: 0.12, roughness: 0.16 })
              : new THREE.MeshStandardMaterial({ color: style === 'metal' ? 0x94a3b8 : style === 'sliding' ? 0xb08968 : 0x9a6b3f, roughness: 0.68, metalness: style === 'metal' ? 0.55 : 0.05 });

            if (style === 'sliding') {
              const sash = new THREE.Group();
              const leaf = new THREE.Mesh(new THREE.BoxGeometry(widthPx * 0.9, 78, 3), material);
              leaf.position.y = 39;
              sash.add(leaf);
              const railTop = new THREE.Mesh(new THREE.BoxGeometry(widthPx + 2, 1.5, 5), new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.65, roughness: 0.3 }));
              railTop.position.y = 79;
              sash.add(railTop);
              doorRoot.add(sash);
              addSceneInteraction(doorRoot, 'door', progress => {
                sash.position.x = progress * widthPx * 0.82;
              });
            } else if (style === 'double') {
              const leftPivot = new THREE.Group();
              leftPivot.position.x = -widthPx / 2;
              const leftLeaf = new THREE.Mesh(new THREE.BoxGeometry(widthPx / 2, 78, 3), material);
              leftLeaf.position.set(widthPx / 4, 39, 0);
              leftPivot.add(leftLeaf);
              const rightPivot = new THREE.Group();
              rightPivot.position.x = widthPx / 2;
              const rightLeaf = new THREE.Mesh(new THREE.BoxGeometry(widthPx / 2, 78, 3), material.clone());
              rightLeaf.position.set(-widthPx / 4, 39, 0);
              rightPivot.add(rightLeaf);
              doorRoot.add(leftPivot, rightPivot);
              addSceneInteraction(doorRoot, 'door', progress => {
                leftPivot.rotation.y = -progress * Math.PI / 2;
                rightPivot.rotation.y = progress * Math.PI / 2;
              });
            } else {
              const hinge = new THREE.Group();
              hinge.position.x = -widthPx / 2;
              const leaf = new THREE.Mesh(new THREE.BoxGeometry(widthPx * 0.92, 78, 3), material);
              leaf.position.set(widthPx * 0.46, 39, 0);
              hinge.add(leaf);
              const handleMaterial = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.82, roughness: 0.24 });
              [-1, 1].forEach(side => {
                const handleX = widthPx * 0.72;
                const handleZ = side * 3;
                const rosette = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 1.4, 16), handleMaterial);
                rosette.rotation.x = Math.PI / 2;
                rosette.position.set(handleX, 40, handleZ);
                hinge.add(rosette);
                const knob = new THREE.Mesh(new THREE.SphereGeometry(2.5, 16, 12), handleMaterial);
                knob.position.set(handleX, 40, side * 5);
                hinge.add(knob);
              });
              doorRoot.add(hinge);
              addSceneInteraction(doorRoot, 'door', progress => {
                hinge.rotation.y = progress * Math.PI / 2;
              });
            }
            doorRoot.traverse((node: any) => {
              if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; }
            });
            // addSceneInteraction attaches the root; traversal above also covers
            // children added later because the root is populated before registration.
          } else {
            const sill = addBox(widthPx + 3, 3, frameDepth, o.x, 30, o.y, frameColor);
            const header = addBox(widthPx + 3, 3, frameDepth, o.x, 72, o.y, frameColor);
            sill.rotation.y = angle; header.rotation.y = angle;
            const windowRoot = new THREE.Group();
            windowRoot.position.set(o.x, 0, o.y);
            windowRoot.rotation.y = angle;
            const sash = new THREE.Group();
            const glazing = new THREE.Mesh(
              new THREE.BoxGeometry(Math.max(1, widthPx - 3), 39, 1.5),
              new THREE.MeshStandardMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.38, metalness: 0.12, roughness: 0.16 })
            );
            glazing.position.y = 51;
            sash.add(glazing);
            const sashFrame = new THREE.Mesh(
              new THREE.BoxGeometry(widthPx - 1, 2, 2),
              new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.35, roughness: 0.45 })
            );
            sashFrame.position.y = 51;
            sash.add(sashFrame);
            windowRoot.add(sash);
            addSceneInteraction(windowRoot, 'window', progress => {
              sash.position.x = progress * widthPx * 0.42;
            });
          }
        });

        floorProject.electrical.forEach(item => {
          if ((item.type === 'wire' || item.type === 'conduit') && item.x2 !== undefined && item.y2 !== undefined) { const dx=item.x2-item.x,dz=item.y2-item.y,len=Math.hypot(dx,dz); if(len>1){const mesh=addBox(len,item.type==='conduit'?4:2,2,(item.x+item.x2)/2,8,(item.y+item.y2)/2,item.type==='conduit'?0xa78bfa:0xfacc15);mesh.rotation.y=-Math.atan2(dz,dx);} return; }
          if (item.type === 'solar_panel') {
            const panel = addBox(28, 2, 20, item.x, 8, item.y, 0x1d4ed8);
            panel.rotation.y = -((item.rotation ?? 0) * Math.PI / 180);
            panel.material = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, emissive: 0x172554, roughness: 0.35, metalness: 0.25 });
            return;
          }
          const isLight = item.type === 'light';
          const isSwitch = item.type === 'switch';
          const color = isLight ? 0xfacc15 : isSwitch ? 0x22c55e : item.type === 'panel' ? 0x2563eb : 0xfb7185;
          const point = new THREE.Mesh(
            new THREE.SphereGeometry(isLight ? 6 : 4, 16, 12),
            new THREE.MeshStandardMaterial({
              color: isLight && isNightMode ? 0xffe4a3 : color,
              emissive: isLight ? 0xffb84d : color,
              emissiveIntensity: isLight ? 0.9 : 0.12
            })
          );
          point.position.set(item.x, isLight ? 102 : 7, item.y);
          if (isLight) {
            const lamp = new THREE.PointLight(0xffc66d, isNightMode ? 26000 : 18000, 420, 2);
            lamp.position.set(item.x, 86, item.y);
            const lightRoot = new THREE.Group();
            lightRoot.add(point, lamp);
            addSceneInteraction(lightRoot, 'light', progress => {
              (point.material as any).emissiveIntensity = 0.08 + progress * (isNightMode ? 2.2 : 0.9);
              lamp.intensity = (isNightMode ? 26000 : 18000) * progress;
            }, item.circuit, true);
          } else if (isSwitch) {
            const switchRoot = new THREE.Group();
            switchRoot.add(point);
            addSceneInteraction(switchRoot, 'switch', () => {}, item.circuit);
          } else {
            floorGroup.add(point);
          }
        });
        floorProject.hydraulic.forEach(item => {
          if ((item.type === 'water_pipe' || item.type === 'sewage_pipe' || item.type === 'vent_pipe' || item.type === 'rain_pipe') && item.x2 !== undefined && item.y2 !== undefined) { const dx=item.x2-item.x,dz=item.y2-item.y,len=Math.hypot(dx,dz); if(len>1){const mesh=addBox(len,item.type==='sewage_pipe'?4:3,3,(item.x+item.x2)/2,5,(item.y+item.y2)/2,item.type==='sewage_pipe'?0x92400e:item.type==='rain_pipe'?0x2563eb:item.type==='vent_pipe'?0xa78bfa:0x0ea5e9);mesh.rotation.y=-Math.atan2(dz,dx);} return; }
          if (item.type === 'pool') {
            const pool = addBox(48, 3, 32, item.x, -0.2, item.y, 0x0891b2);
            pool.material = new THREE.MeshStandardMaterial({ color: 0x0891b2, roughness: 0.2, metalness: 0.05, transparent: true, opacity: 0.78 });
            return;
          }
          const color = item.type === 'sewage' || item.type === 'drain' || item.type === 'sewage_pipe' || item.type === 'grease_trap' || item.type === 'inspection_box' ? 0x92400e : item.type === 'rain_pipe' ? 0x2563eb : item.type === 'vent_pipe' ? 0xa78bfa : 0x0ea5e9;
          const hydraulicRoot = new THREE.Group();
          hydraulicRoot.position.set(item.x, 0, item.y);
          const fixture = new THREE.Mesh(
            new THREE.CylinderGeometry(['sink','faucet','shower','toilet','floor_drain','cleanout','inspection_box','tank','heater','grease_trap'].includes(item.type) ? 8 : 5, ['sink','faucet','shower','toilet'].includes(item.type) ? 8 : 5, 5, 16),
            new THREE.MeshStandardMaterial({ color, metalness: ['faucet','shower'].includes(item.type) ? 0.62 : 0.12, roughness: 0.38 })
          );
          fixture.position.y = 5;
          hydraulicRoot.add(fixture);

          if (item.type === 'faucet' || item.type === 'shower') {
            const isShower = item.type === 'shower';
            const waterMaterial = new THREE.MeshBasicMaterial({
              color: 0x38bdf8, transparent: true, opacity: 0.82,
              depthWrite: false
            });
            const water = isShower
              ? new THREE.Mesh(new THREE.ConeGeometry(10, 28, 18, 1, true), waterMaterial)
              : new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.8, 20, 10), waterMaterial);
            water.position.y = isShower ? -4 : -6;
            if (isShower) water.rotation.x = Math.PI;
            hydraulicRoot.add(water);
            addSceneInteraction(hydraulicRoot, 'water', (progress, elapsed) => {
              water.visible = progress > 0.02;
              water.material.opacity = 0.18 + progress * 0.64;
              water.scale.setScalar(0.92 + Math.sin(elapsed * 9) * 0.035 * progress);
            });
          } else if (item.type === 'toilet') {
            const flushWater = new THREE.Mesh(
              new THREE.TorusGeometry(5, 0.7, 8, 32),
              new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75 })
            );
            flushWater.rotation.x = Math.PI / 2;
            flushWater.position.y = 8;
            hydraulicRoot.add(flushWater);
            addSceneInteraction(hydraulicRoot, 'flush', (progress, elapsed) => {
              flushWater.visible = progress > 0.02;
              flushWater.material.opacity = progress * 0.72;
              flushWater.scale.setScalar(0.45 + progress * 0.75 + Math.sin(elapsed * 10) * 0.08 * progress);
              flushWater.rotation.z = elapsed * 2.4;
            });
          } else if (item.type === 'pool') {
            const ripple = new THREE.Mesh(
              new THREE.TorusGeometry(12, 0.55, 8, 48),
              new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.55 })
            );
            ripple.rotation.x = Math.PI / 2;
            ripple.position.y = 2;
            hydraulicRoot.add(ripple);
            addSceneInteraction(hydraulicRoot, 'pool', (progress, elapsed) => {
              ripple.visible = progress > 0.02;
              ripple.material.opacity = progress * 0.55;
              ripple.scale.setScalar(0.5 + (elapsed % 2) * 0.55);
            });
          } else if (item.type === 'heater') {
            addSceneInteraction(hydraulicRoot, 'water', progress => {
              (fixture.material as any).emissive = new THREE.Color(0xf97316);
              (fixture.material as any).emissiveIntensity = progress * 0.8;
            });
          } else {
            floorGroup.add(hydraulicRoot);
          }
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
            floorGroup.add(model);
            resolve();
          }, undefined, () => resolve());
        })));
        }

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
        const pointerOrigins = new Map<number, { x: number; y: number }>();
        const raycaster = new THREE.Raycaster();
        const normalizedPointer = new THREE.Vector2();
        const activateInteraction = (event: PointerEvent) => {
          const rect = renderer.domElement.getBoundingClientRect();
          normalizedPointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          normalizedPointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(normalizedPointer, camera);
          const hits = raycaster.intersectObjects(scene.children, true);
          let interaction: SceneInteraction | undefined;
          for (const hit of hits) {
            let node = hit.object;
            while (node && !node.userData?.sceneInteraction) node = node.parent;
            if (node?.userData?.sceneInteraction) {
              interaction = node.userData.sceneInteraction as SceneInteraction;
              break;
            }
          }
          if (!interaction) return;
          if (interaction.kind === 'switch') {
            const circuit = interaction.circuit;
            if (!circuit) return;
            const circuitLights = sceneInteractions.filter(candidate => candidate.kind === 'light' && candidate.circuit === circuit);
            if (!circuitLights.length) return;
            const shouldTurnOn = circuitLights.some(light => light.target < 0.5);
            circuitLights.forEach(light => { light.target = shouldTurnOn ? 1 : 0; });
            return;
          }
          interaction.target = interaction.target > 0.5 ? 0 : 1;
        };
        const onDown = (e: PointerEvent) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          active.set(e.pointerId, { x: e.clientX, y: e.clientY });
          pointerOrigins.set(e.pointerId, { x: e.clientX, y: e.clientY });
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
        const onUp = (e: PointerEvent) => {
          const origin = pointerOrigins.get(e.pointerId);
          const wasClick = origin && active.size === 1 && Math.hypot(e.clientX - origin.x, e.clientY - origin.y) < 7;
          if (wasClick) activateInteraction(e);
          pointerOrigins.delete(e.pointerId);
          active.delete(e.pointerId);
          if (active.size < 2) pinchStart = null;
          if (!active.size) start = null;
        };
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

        let previousFrameTime = performance.now();
        let elapsedSceneTime = 0;
        const animate = () => {
          if (disposed) return;
          frame = requestAnimationFrame(animate);
          const now = performance.now();
          const delta = Math.min(0.05, (now - previousFrameTime) / 1000);
          previousFrameTime = now;
          elapsedSceneTime += delta;
          sceneInteractions.forEach(interaction => {
            const difference = interaction.target - interaction.progress;
            if (Math.abs(difference) > 0.001) {
              interaction.progress += Math.sign(difference) * Math.min(Math.abs(difference), delta * 2.8);
            } else {
              interaction.progress = interaction.target;
            }
            interaction.update(interaction.progress, elapsedSceneTime);
          });
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
  }, [project, isDark, isNightMode]);

  return <div className="relative h-full min-h-[320px] w-full overflow-hidden rounded-xl border border-slate-700/50">
    <div ref={hostRef} className="absolute inset-0" aria-label="Cena 3D integrada da planta" role="img" />
    {loading && <div className="absolute bottom-3 left-3 rounded-md bg-slate-950/80 px-3 py-2 text-xs text-white" role="status">Carregando cena 3D e modelos GLB…</div>}
    {error && <div className="absolute inset-x-3 bottom-3 rounded-md border border-amber-500/40 bg-slate-950/90 px-3 py-2 text-sm text-amber-100" role="alert">Falha ao carregar a cena 3D: {error}. Verifique a conexão e a disponibilidade do CDN.</div>}
    <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-slate-950/75 px-3 py-2 text-xs text-white">Arraste para orbitar · Pinça/roda para zoom · Objetos com profundidade real</div>
  </div>;
};
