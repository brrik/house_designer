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
