import type { Point, Wall } from '../types';

// 点 p から線分 a-b への最短距離と、線分上の最近点パラメータ t (0..1)
export function pointToSegment(
  p: Point,
  a: Point,
  b: Point,
): { distance: number; t: number; closest: Point } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) {
    const d = Math.hypot(p.x - a.x, p.y - a.y);
    return { distance: d, t: 0, closest: a };
  }
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + dx * t;
  const cy = a.y + dy * t;
  return { distance: Math.hypot(p.x - cx, p.y - cy), t, closest: { x: cx, y: cy } };
}

// もっとも近い壁と、その壁上の t を返す。距離がしきい値を超えたら null。
export function findNearestWall(
  p: Point,
  walls: Wall[],
  thresholdCm: number,
): { wall: Wall; t: number; closest: Point } | null {
  let best: { wall: Wall; t: number; closest: Point; distance: number } | null = null;
  for (const w of walls) {
    const r = pointToSegment(p, w.a, w.b);
    if (r.distance <= thresholdCm && (!best || r.distance < best.distance)) {
      best = { wall: w, t: r.t, closest: r.closest, distance: r.distance };
    }
  }
  if (!best) return null;
  const { wall, t, closest } = best;
  return { wall, t, closest };
}

export function wallLengthCm(w: Wall): number {
  return Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y);
}

export function wallAngleRad(w: Wall): number {
  return Math.atan2(w.b.y - w.a.y, w.b.x - w.a.x);
}
