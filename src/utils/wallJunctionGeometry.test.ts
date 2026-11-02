import assert from 'node:assert/strict';
import testCase from 'node:test';
import { buildWallJunctionPolygon } from './wallJunctionGeometry';
import type { WallSegment } from '../types';

const wall = (x1: number, y1: number, x2: number, y2: number, thickness = 8): WallSegment => ({
  id: `${x1},${y1}-${x2},${y2}`,
  x1, y1, x2, y2, thickness,
});

testCase('creates a closed miter footprint for a diagonal wall meeting a straight wall', () => {
  const polygon = buildWallJunctionPolygon([
    wall(-100, 0, 0, 0),
    wall(0, 0, 100, 100),
  ], 0, 0);

  assert.ok(polygon.length >= 5);
  assert.ok(polygon.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)));
  assert.ok(polygon.some((point) => point.x < 0 && point.y < 0));
  assert.ok(polygon.some((point) => point.x > 0 && point.y > 0));
});

testCase('supports three-way junctions with different wall thicknesses', () => {
  const polygon = buildWallJunctionPolygon([
    wall(-100, 0, 0, 0, 8),
    wall(0, 0, 100, 0, 12),
    wall(0, 0, 0, 100, 10),
  ], 0, 0);

  assert.ok(polygon.length >= 4);
  assert.ok(polygon.every((point) => Math.hypot(point.x, point.y) < 20));
});

testCase('returns no patch for an isolated wall endpoint', () => {
  assert.deepEqual(buildWallJunctionPolygon([wall(0, 0, 100, 0)], 0, 0), []);
});
