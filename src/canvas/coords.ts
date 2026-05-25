import { GRID_CM } from '../types';

// 座標系について:
// - world: 実寸 cm (描画対象本来の座標)
// - svg/viewBox: SVG の内部座標。world と同じスケールで使用 (1 unit = 1 cm)
// - screen: 画面ピクセル
// パン・ズームは SVG の viewBox を動かすことで実現する。
// よって world ↔ svg 間の変換は不要、screen ↔ svg(world) のみ気にすれば良い。

export type ViewBox = { x: number; y: number; w: number; h: number };

export function screenToWorld(
  screenX: number,
  screenY: number,
  rect: DOMRect,
  viewBox: ViewBox,
): { x: number; y: number } {
  const px = (screenX - rect.left) / rect.width;
  const py = (screenY - rect.top) / rect.height;
  return {
    x: viewBox.x + px * viewBox.w,
    y: viewBox.y + py * viewBox.h,
  };
}

export function snapToGrid(value: number, grid = GRID_CM): number {
  return Math.round(value / grid) * grid;
}

export function snapPoint(p: { x: number; y: number }, grid = GRID_CM) {
  return { x: snapToGrid(p.x, grid), y: snapToGrid(p.y, grid) };
}

// 始点 start から end への線分について、角度を stepDeg 度刻みにスナップし、
// 距離を distanceStep cm 刻みにスナップした終点を返す。
// 壁の作図時に「だいたいまっすぐ」を強制するために使用する。
export function snapToAngleAndDistance(
  start: { x: number; y: number },
  end: { x: number; y: number },
  stepDeg = 15,
  distanceStep = GRID_CM,
): { x: number; y: number } {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dist = Math.hypot(dx, dy);
  if (dist < distanceStep / 2) return { x: start.x, y: start.y };
  const ang = Math.atan2(dy, dx);
  const stepRad = (stepDeg * Math.PI) / 180;
  const snappedAng = Math.round(ang / stepRad) * stepRad;
  const snappedDist = Math.max(distanceStep, Math.round(dist / distanceStep) * distanceStep);
  return {
    x: start.x + Math.cos(snappedAng) * snappedDist,
    y: start.y + Math.sin(snappedAng) * snappedDist,
  };
}
