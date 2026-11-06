import React from 'react';
import LiquidGlass, { type LiquidGlassProps } from 'simple-liquid-glass';

/**
 * Shared optical material for the Obra-Engep PWA.
 * Chromium uses SVG displacement on mobile; iOS can use the shared WebGL scene.
 */
export type LiquidGlassSurfaceProps = LiquidGlassProps;

const materialOptions = {
  strength: 0.11,
  depth: 0.18,
  curvature: 0.32,
  bend: 0.16,
  bendWidth: 0.075,
  sheen: 0.48,
  sheenWidth: 3.5,
  sheenFalloff: 1.5,
  sheenAngle: 45,
  specular: 0.72,
  glow: 0.035,
  glowSpread: 0.4,
  glowFalloff: 1.5,
  brightness: 0,
} as const;

export const LiquidGlassSurface: React.FC<LiquidGlassSurfaceProps> = ({
  children,
  className,
  style,
  ...props
}) => (
  <LiquidGlass
    mode="custom"
    renderer="auto"
    mobileFallback="svg"
    refraction="lens"
    lensProfile="material"
    lensOptions={materialOptions}
    autodetectquality
    blur={0}
    frost={0.025}
    saturation={118}
    dispersion={16}
    aberrationIntensity={0.12}
    glassColor="rgba(255,255,255,0.045)"
    borderColor="rgba(255,255,255,0.24)"
    radius={18}
    className={['liquid-glass-surface', className].filter(Boolean).join(' ')}
    style={{ width: 'var(--liquid-glass-width, 100%)', height: 'var(--liquid-glass-height, auto)', backgroundColor: 'transparent', ...style }}
    {...props}
  >
    {children}
  </LiquidGlass>
);
