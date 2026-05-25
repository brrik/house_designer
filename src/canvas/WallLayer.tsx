import type { Wall, Point } from '../types';
import type { ViewBox } from './coords';

type Props = {
  walls: Wall[];
  viewBox: ViewBox;
  selectedId: string | null;
  onSelect?: (id: string) => void;
  preview?: { from: Point; to: Point; color: string } | null;
};

// 壁の太さ仕様: 約 10px 相当（ズームに合わせて world 単位に換算）
function strokeWidthFor(viewBox: ViewBox): number {
  // 画面 1px は world で viewBox.w / (描画幅 px) cm に相当。
  // 描画幅 px は不明だが、概算 1000px 想定。10px ≒ viewBox.w / 100 cm。
  return viewBox.w / 100;
}

export default function WallLayer({ walls, viewBox, selectedId, onSelect, preview }: Props) {
  const sw = strokeWidthFor(viewBox);
  return (
    <g>
      {walls.map((w) => {
        const isSel = w.id === selectedId;
        return (
          <line
            key={w.id}
            x1={w.a.x}
            y1={w.a.y}
            x2={w.b.x}
            y2={w.b.y}
            stroke={isSel ? '#1e90ff' : w.color}
            strokeWidth={isSel ? sw * 1.2 : sw}
            strokeLinecap="round"
            style={{ cursor: 'pointer' }}
            onPointerDown={(e) => {
              if (!onSelect) return;
              e.stopPropagation();
              onSelect(w.id);
            }}
          />
        );
      })}
      {preview && (
        <line
          x1={preview.from.x}
          y1={preview.from.y}
          x2={preview.to.x}
          y2={preview.to.y}
          stroke={preview.color}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${sw} ${sw}`}
          opacity={0.6}
          pointerEvents="none"
        />
      )}
    </g>
  );
}
