import type { WallSegment } from '../types';

export interface WallJunctionPoint {
  x: number;
  y: number;
}

const convexHull = (points: WallJunctionPoint[]): WallJunctionPoint[] => {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (sorted.length <= 2) return sorted;

  const cross = (origin: WallJunctionPoint, a: WallJunctionPoint, b: WallJunctionPoint) =>
    (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);

  const lower: WallJunctionPoint[] = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
    lower.push(point);
  }

  const upper: WallJunctionPoint[] = [];
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const point = sorted[index];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
    upper.push(point);
  }

  lower.pop();
  upper.pop();
  return [...lower, ...upper];
};

/**
 * Builds the mitered footprint that closes a shared wall endpoint.
 * Each incident wall contributes its end cross-section extended by half its
 * thickness, then a convex hull joins diagonal and orthogonal segments.
 */
export function buildWallJunctionPolygon(
  walls: WallSegment[],
  x: number,
  y: number,
  tolerance = 3
): WallJunctionPoint[] {
  const corners: WallJunctionPoint[] = [];

  for (const wall of walls) {
    const startsHere = Math.hypot(wall.x1 - x, wall.y1 - y) <= tolerance;
    const endsHere = Math.hypot(wall.x2 - x, wall.y2 - y) <= tolerance;
    if (!startsHere && !endsHere) continue;

    const other = startsHere
      ? { x: wall.x2, y: wall.y2 }
      : { x: wall.x1, y: wall.y1 };
    const dx = x - other.x;
    const dy = y - other.y;
    const length = Math.hypot(dx, dy);
    if (length < 1) continue;

    const half = Math.max(4, wall.thickness || 8) / 2;
    const tx = dx / length;
    const ty = dy / length;
    const nx = -ty;
    const ny = tx;

    for (const tangentSide of [-1, 1]) {
      for (const normalSide of [-1, 1]) {
        corners.push({
          x: x + tx * half * tangentSide + nx * half * normalSide,
          y: y + ty * half * tangentSide + ny * half * normalSide,
        });
      }
    }
  }

  return convexHull(corners);
}
