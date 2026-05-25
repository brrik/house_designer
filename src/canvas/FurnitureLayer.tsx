import type { FurnitureInstance, FurnitureTemplate } from '../types';
import type { ViewBox } from './coords';

type Props = {
  instances: FurnitureInstance[];
  templates: FurnitureTemplate[];
  viewBox: ViewBox;
  selectedId: string | null;
  onSelect?: (id: string) => void;
  onRotateStart?: (id: string, e: React.PointerEvent) => void;
  onMoveStart?: (id: string, e: React.PointerEvent) => void;
  onContextMenu?: (id: string, e: React.MouseEvent) => void;
  onLongPress?: (id: string, e: React.PointerEvent) => void;
};

function templateById(templates: FurnitureTemplate[], id: string): FurnitureTemplate | undefined {
  return templates.find((t) => t.id === id);
}

function shapeBBox(t: FurnitureTemplate): { w: number; h: number } {
  if (t.shape.type === 'circle') {
    return { w: t.shape.rCm * 2, h: t.shape.rCm * 2 };
  }
  const xs = t.shape.points.map((p) => p.x);
  const ys = t.shape.points.map((p) => p.y);
  return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

export default function FurnitureLayer({
  instances,
  templates,
  viewBox,
  selectedId,
  onSelect,
  onRotateStart,
  onMoveStart,
  onContextMenu,
  onLongPress,
}: Props) {
  return (
    <g>
      {instances.map((fi) => {
        const t = templateById(templates, fi.templateId);
        if (!t) return null;
        const selected = fi.id === selectedId;
        const { w, h } = shapeBBox(t);
        const transform = `translate(${fi.x} ${fi.y}) rotate(${fi.rotationDeg})`;
        return (
          <g
            key={fi.id}
            transform={transform}
            onContextMenu={(e) => {
              if (!onContextMenu) return;
              e.preventDefault();
              e.stopPropagation();
              onContextMenu(fi.id, e);
            }}
          >
            <ShapePath
              t={t}
              selected={selected}
              onSelect={() => onSelect?.(fi.id)}
              onMoveStart={(e) => onMoveStart?.(fi.id, e)}
              onLongPress={(e) => onLongPress?.(fi.id, e)}
            />
            {selected && (
              <SelectionDecor
                w={w}
                h={h}
                viewBox={viewBox}
                onRotateStart={(e) => onRotateStart?.(fi.id, e)}
              />
            )}
          </g>
        );
      })}
    </g>
  );
}

function ShapePath({
  t,
  selected,
  onSelect,
  onMoveStart,
  onLongPress,
}: {
  t: FurnitureTemplate;
  selected: boolean;
  onSelect: () => void;
  onMoveStart: (e: React.PointerEvent) => void;
  onLongPress: (e: React.PointerEvent) => void;
}) {
  const strokeW = Math.max(1, (t.shape.type === 'circle' ? t.shape.rCm : 100) * 0.02);
  const sw = selected ? strokeW * 1.5 : strokeW;
  const stroke = selected ? '#1e90ff' : t.strokeColor;
  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect();
    onMoveStart(e);
    onLongPress(e);
  };
  const common = {
    fill: t.fillColor,
    stroke,
    strokeWidth: sw,
    style: { cursor: 'move' as const },
    onPointerDown,
  };
  if (t.shape.type === 'circle') {
    return <circle r={t.shape.rCm} {...common} />;
  }
  return (
    <polygon
      points={t.shape.points.map((p) => `${p.x},${p.y}`).join(' ')}
      {...common}
    />
  );
}

function SelectionDecor({
  w,
  h,
  viewBox,
  onRotateStart,
}: {
  w: number;
  h: number;
  viewBox: ViewBox;
  onRotateStart: (e: React.PointerEvent) => void;
}) {
  // 選択枠は bbox に少しマージン
  const pad = Math.max(w, h) * 0.05 + 5;
  const x = -w / 2 - pad;
  const y = -h / 2 - pad;
  const ww = w + pad * 2;
  const hh = h + pad * 2;
  // 回転ハンドル位置: 上辺の中央から少し外側
  const handleOffset = Math.max(w, h) * 0.15 + 15;
  const handleR = viewBox.w / 100;
  return (
    <g pointerEvents="none">
      <rect
        x={x}
        y={y}
        width={ww}
        height={hh}
        fill="none"
        stroke="#1e90ff"
        strokeDasharray={`${viewBox.w / 150} ${viewBox.w / 200}`}
        strokeWidth={viewBox.w / 400}
      />
      {/* 回転ハンドル */}
      <line
        x1={0}
        y1={y}
        x2={0}
        y2={y - handleOffset}
        stroke="#1e90ff"
        strokeWidth={viewBox.w / 400}
      />
      <circle
        cx={0}
        cy={y - handleOffset}
        r={handleR}
        fill="#1e90ff"
        stroke="#fff"
        strokeWidth={viewBox.w / 500}
        style={{ cursor: 'crosshair', pointerEvents: 'all' }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onRotateStart(e);
        }}
      />
    </g>
  );
}
