import { useCallback, useEffect, useRef, useState } from 'react';
import type { ViewBox } from './coords';

type Options = {
  initial: ViewBox;
  minZoom?: number; // 表示できる最小の viewBox 幅 (cm) → 拡大上限
  maxZoom?: number; // 表示できる最大の viewBox 幅 (cm) → 縮小上限
};

// SVG の viewBox を「パン・ホイールズーム・ピンチズーム・1本指パン」で操作するフック。
// world 座標 (cm) と viewBox は同一スケール (1 unit = 1 cm) 前提。
export function useViewBox(svgRef: React.RefObject<SVGSVGElement | null>, opts: Options) {
  const [viewBox, setViewBox] = useState<ViewBox>(opts.initial);
  const minW = opts.minZoom ?? 50; // 50cm まで拡大可
  const maxW = opts.maxZoom ?? 200_000; // 2000m まで縮小可

  // ポインタ管理
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPanPointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const lastPinch = useRef<{ dist: number; cx: number; cy: number } | null>(null);

  const screenToWorld = useCallback(
    (sx: number, sy: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      // SVG ネイティブの座標変換を使う。preserveAspectRatio のレターボックスも正しく扱われる。
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      const pt = svg.createSVGPoint();
      pt.x = sx;
      pt.y = sy;
      const w = pt.matrixTransform(ctm.inverse());
      return { x: w.x, y: w.y };
    },
    [svgRef],
  );

  const zoomAt = useCallback(
    (sx: number, sy: number, factor: number) => {
      setViewBox((prev) => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return prev;
        const aspect = prev.h / prev.w;
        let newW = prev.w * factor;
        newW = Math.max(minW, Math.min(maxW, newW));
        const newH = newW * aspect;
        // ズーム中心を screen 位置に固定
        const px = (sx - rect.left) / rect.width;
        const py = (sy - rect.top) / rect.height;
        const worldX = prev.x + px * prev.w;
        const worldY = prev.y + py * prev.h;
        return {
          x: worldX - px * newW,
          y: worldY - py * newH,
          w: newW,
          h: newH,
        };
      });
    },
    [svgRef, minW, maxW],
  );

  // ホイールズーム
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = Math.exp(e.deltaY * 0.001);
      zoomAt(e.clientX, e.clientY, factor);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [svgRef, zoomAt]);

  // ポインタ操作（パン・ピンチ）
  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.current.size === 1) {
        lastPanPointer.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        lastPinch.current = null;
      } else if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        lastPinch.current = {
          dist: Math.hypot(a.x - b.x, a.y - b.y),
          cx: (a.x + b.x) / 2,
          cy: (a.y + b.y) / 2,
        };
        lastPanPointer.current = null;
      }
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.current.size === 2 && lastPinch.current) {
        const [a, b] = [...pointers.current.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        const factor = lastPinch.current.dist / dist;
        zoomAt(cx, cy, factor);
        lastPinch.current = { dist, cx, cy };
        return;
      }

      if (
        pointers.current.size === 1 &&
        lastPanPointer.current &&
        lastPanPointer.current.id === e.pointerId
      ) {
        const dx = e.clientX - lastPanPointer.current.x;
        const dy = e.clientY - lastPanPointer.current.y;
        // クリック判定のため、わずかな移動ではパンしない
        if (Math.hypot(dx, dy) < 6) return;
        lastPanPointer.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        setViewBox((prev) => {
          const rect = svgRef.current?.getBoundingClientRect();
          if (!rect) return prev;
          // viewBox は preserveAspectRatio=meet によりレターボックスされる前提で、
          // 1 screen px が world に対応する長さを計算する
          const aspectVB = prev.w / prev.h;
          const aspectRect = rect.width / rect.height;
          // 表示されている content size (px)
          let contentW: number;
          let contentH: number;
          if (aspectVB > aspectRect) {
            // viewBox が横長 → 横いっぱい、縦がレターボックス
            contentW = rect.width;
            contentH = rect.width / aspectVB;
          } else {
            contentH = rect.height;
            contentW = rect.height * aspectVB;
          }
          const wx = (dx / contentW) * prev.w;
          const wy = (dy / contentH) * prev.h;
          return { ...prev, x: prev.x - wx, y: prev.y - wy };
        });
      }
    },
    [svgRef, zoomAt],
  );

  const onPointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) lastPinch.current = null;
    if (pointers.current.size === 0) lastPanPointer.current = null;
  }, []);

  return {
    viewBox,
    setViewBox,
    screenToWorld,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  };
}
