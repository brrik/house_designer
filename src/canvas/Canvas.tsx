import { useRef } from 'react';
import { useViewBox } from './useViewBox';
import Grid from './Grid';
import WallLayer from './WallLayer';
import LengthLabel from './LengthLabel';
import { useStore } from '../state/store';
import { useUiStore } from '../state/uiStore';
import {
  addWallCommand,
  addDoorCommand,
  addWindowCommand,
  addOutletCommand,
  addInfoOutletCommand,
  addLightCommand,
  moveFurnitureInstanceCommand,
  rotateFurnitureInstanceCommand,
  getActivePlan,
} from '../state/planCommands';
import { snapPoint, snapToAngleAndDistance } from './coords';
import { findNearestWall } from './wallMath';
import DoorWindowLayer from './DoorWindowLayer';
import PointMarkerLayer from './PointMarkerLayer';
import FurnitureLayer from './FurnitureLayer';
import { openContextMenuAt } from '../components/ContextMenu';

type Props = {
  canvasWCm: number;
  canvasHCm: number;
};

export default function Canvas({ canvasWCm, canvasHCm }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  const { viewBox, screenToWorld, handlers } = useViewBox(svgRef, {
    initial: { x: 0, y: 0, w: canvasWCm, h: canvasHCm },
  });

  const persisted = useStore((s) => s.persisted);
  const dispatch = useStore((s) => s.dispatch);
  const plan = getActivePlan(persisted);

  const tool = useUiStore((s) => s.tool);
  const wallStart = useUiStore((s) => s.wallStartPoint);
  const setWallStart = useUiStore((s) => s.setWallStartPoint);
  const hover = useUiStore((s) => s.hoverPoint);
  const setHover = useUiStore((s) => s.setHoverPoint);
  const color = useUiStore((s) => s.currentColor);
  const selectedId = useUiStore((s) => s.selectedId);
  const setSelectedId = useUiStore((s) => s.setSelectedId);

  // クリック判定（ドラッグでない）
  const pressInfo = useRef<{ x: number; y: number; t: number; moved: boolean } | null>(null);
  const DRAG_THRESHOLD_PX = 6;

  // 家具インスタンス操作
  const fiOp = useRef<
    | { kind: 'move'; id: string; offsetX: number; offsetY: number; pointerId: number }
    | { kind: 'rotate'; id: string; pointerId: number }
    | null
  >(null);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    handlers.onPointerDown(e);
    pressInfo.current = { x: e.clientX, y: e.clientY, t: Date.now(), moved: false };
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    // pointer が大きく動いたら長押しをキャンセル
    if (pressInfo.current) {
      const dx = e.clientX - pressInfo.current.x;
      const dy = e.clientY - pressInfo.current.y;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) cancelLongPress();
    }
    // 家具操作中はパン/ピンチに渡さず、家具を動かす
    if (fiOp.current && fiOp.current.pointerId === e.pointerId) {
      const world = screenToWorld(e.clientX, e.clientY);
      const op = fiOp.current;
      if (op.kind === 'move') {
        const snapped = snapPoint({ x: world.x - op.offsetX, y: world.y - op.offsetY });
        dispatch(moveFurnitureInstanceCommand(op.id, snapped.x, snapped.y));
      } else if (op.kind === 'rotate') {
        const fi = plan?.furnitureInstances.find((f) => f.id === op.id);
        if (fi) {
          const dx = world.x - fi.x;
          const dy = world.y - fi.y;
          // 上方向 (y 負) を 0 度とする
          const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
          dispatch(rotateFurnitureInstanceCommand(op.id, angle));
        }
      }
      return;
    }

    handlers.onPointerMove(e);
    if (pressInfo.current) {
      const dx = e.clientX - pressInfo.current.x;
      const dy = e.clientY - pressInfo.current.y;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
        pressInfo.current.moved = true;
      }
    }
    if (tool === 'wall') {
      const world = screenToWorld(e.clientX, e.clientY);
      // wallStart があれば 15度刻み + 5cm 刻みでスナップ、無ければ通常のグリッドスナップ
      const snapped = wallStart
        ? snapToAngleAndDistance(wallStart, world, 15)
        : snapPoint(world);
      setHover(snapped);
    }
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    cancelLongPress();
    if (fiOp.current && fiOp.current.pointerId === e.pointerId) {
      fiOp.current = null;
      pressInfo.current = null;
      return;
    }

    const wasClick = pressInfo.current && !pressInfo.current.moved;
    // テンプレートドラッグからのドロップは Sidebar 側の window listener で処理する
    handlers.onPointerUp(e);
    if (!wasClick) {
      pressInfo.current = null;
      return;
    }
    pressInfo.current = null;

    if (!plan) return;
    const world = screenToWorld(e.clientX, e.clientY);
    const snapped = snapPoint(world);

    if (tool === 'wall') {
      if (!wallStart) {
        setWallStart(snapped);
      } else {
        // 15度刻み + 5cm 刻みにスナップ
        const endPoint = snapToAngleAndDistance(wallStart, world, 15);
        if (endPoint.x !== wallStart.x || endPoint.y !== wallStart.y) {
          dispatch(addWallCommand(wallStart, endPoint, color));
        }
        setWallStart(endPoint);
      }
    } else if (tool === 'door' || tool === 'window') {
      const threshold = Math.max(20, viewBox.w / 40);
      const hit = findNearestWall(world, plan.walls, threshold);
      if (hit) {
        if (tool === 'door') {
          dispatch(addDoorCommand(hit.wall.id, hit.t));
        } else {
          dispatch(addWindowCommand(hit.wall.id, hit.t));
        }
      }
    } else if (tool === 'outlet') {
      dispatch(addOutletCommand(snapped.x, snapped.y, 2));
    } else if (tool === 'infoOutlet') {
      dispatch(addInfoOutletCommand(snapped.x, snapped.y));
    } else if (tool === 'light') {
      dispatch(addLightCommand(snapped.x, snapped.y));
    } else if (tool === 'select') {
      setSelectedId(null);
    }
  };

  const onContextMenu = (e: React.MouseEvent) => {
    if (tool === 'wall' && wallStart) {
      e.preventDefault();
      setWallStart(null);
    }
  };

  const handleFurnitureMoveStart = (id: string, e: React.PointerEvent) => {
    setSelectedId(id);
    const fi = plan?.furnitureInstances.find((f) => f.id === id);
    if (!fi) return;
    const world = screenToWorld(e.clientX, e.clientY);
    fiOp.current = {
      kind: 'move',
      id,
      offsetX: world.x - fi.x,
      offsetY: world.y - fi.y,
      pointerId: e.pointerId,
    };
    pressInfo.current = { x: e.clientX, y: e.clientY, t: Date.now(), moved: false };
  };

  const handleFurnitureRotateStart = (id: string, e: React.PointerEvent) => {
    fiOp.current = { kind: 'rotate', id, pointerId: e.pointerId };
    pressInfo.current = { x: e.clientX, y: e.clientY, t: Date.now(), moved: true };
  };

  // 長押し検出（モバイル向け）。500ms 動かなければメニューを開く。
  const longPressTimer = useRef<number | null>(null);
  const cancelLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  const handleFurnitureLongPress = (id: string, e: React.PointerEvent) => {
    cancelLongPress();
    const sx = e.clientX;
    const sy = e.clientY;
    longPressTimer.current = window.setTimeout(() => {
      // 移動 / 回転中ならキャンセル
      if (fiOp.current) {
        const op = fiOp.current;
        // すでに動いていたらメニューを出さない
        if (pressInfo.current?.moved) return;
        // 動いていない場合は move op をキャンセルしてメニュー
        fiOp.current = null;
        if (op.kind === 'rotate') return;
      }
      openContextMenuAt(sx, sy, { kind: 'furniture', id });
    }, 500);
  };

  const handleFurnitureContextMenu = (id: string, e: React.MouseEvent) => {
    cancelLongPress();
    // 操作中の move op はキャンセル
    fiOp.current = null;
    openContextMenuAt(e.clientX, e.clientY, { kind: 'furniture', id });
  };

  return (
    <svg
      ref={svgRef}
      className="canvas-svg"
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      preserveAspectRatio="xMidYMid meet"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={handlers.onPointerCancel}
      onContextMenu={onContextMenu}
    >
      <Grid viewBox={viewBox} canvasWCm={canvasWCm} canvasHCm={canvasHCm} />
      {plan && (
        <>
          <WallLayer
            walls={plan.walls}
            viewBox={viewBox}
            selectedId={selectedId}
            onSelect={tool === 'select' ? (id) => setSelectedId(id) : undefined}
            preview={
              tool === 'wall' && wallStart && hover
                ? { from: wallStart, to: hover, color }
                : null
            }
          />
          <DoorWindowLayer
            walls={plan.walls}
            doors={plan.doors}
            windows={plan.windows}
            viewBox={viewBox}
            selectedId={selectedId}
            onSelect={tool === 'select' ? (id) => setSelectedId(id) : undefined}
          />
          <PointMarkerLayer
            outlets={plan.outlets}
            infoOutlets={plan.infoOutlets}
            lights={plan.lights}
            viewBox={viewBox}
            selectedId={selectedId}
            onSelect={tool === 'select' ? (id) => setSelectedId(id) : undefined}
          />
          <FurnitureLayer
            instances={plan.furnitureInstances}
            templates={persisted.templates}
            viewBox={viewBox}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id)}
            onMoveStart={handleFurnitureMoveStart}
            onRotateStart={handleFurnitureRotateStart}
            onContextMenu={handleFurnitureContextMenu}
            onLongPress={handleFurnitureLongPress}
          />
        </>
      )}
      {plan?.walls
        .filter((w) => w.id === selectedId)
        .map((w) => (
          <LengthLabel key={`len-${w.id}`} a={w.a} b={w.b} viewBox={viewBox} />
        ))}
      {tool === 'wall' && wallStart && hover && (
        <LengthLabel a={wallStart} b={hover} viewBox={viewBox} />
      )}
    </svg>
  );
}
