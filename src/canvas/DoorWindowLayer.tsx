import type { Door, Point, Window_ } from '../types';
import type { ViewBox } from './coords';

type Props = {
  doors: Door[];
  windows: Window_[];
  viewBox: ViewBox;
  selectedId: string | null;
  onSelect?: (id: string) => void;
  // 描画プレビュー用 (作図中の始点→hover)
  preview?: { kind: 'door' | 'window'; from: Point; to: Point } | null;
};

function segMetrics(a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return null;
  const cosA = dx / len;
  const sinA = dy / len;
  return { len, cosA, sinA };
}

function DoorSymbol({
  door,
  strokeW,
  selected,
  onSelect,
}: {
  door: Door;
  strokeW: number;
  selected: boolean;
  onSelect?: () => void;
}) {
  const m = segMetrics(door.a, door.b);
  if (!m) return null;
  const { len, cosA, sinA } = m;
  // 開口部の中心と両端 (a=ヒンジ側, b=先端側)
  const hingeX = door.a.x;
  const hingeY = door.a.y;
  const tipX = door.b.x;
  const tipY = door.b.y;
  // 開閉方向: 線分の法線方向に開く
  const nDir = door.flipped ? -1 : 1;
  const nx = -sinA * nDir;
  const ny = cosA * nDir;
  const doorEndX = hingeX + nx * len;
  const doorEndY = hingeY + ny * len;
  // 弧 (hinge 中心、開口幅 = 半径)
  const sweep = nDir > 0 ? 0 : 1;
  const arcPath = `M ${tipX} ${tipY} A ${len} ${len} 0 0 ${sweep} ${doorEndX} ${doorEndY}`;
  const color = selected ? '#1e90ff' : '#444';
  return (
    <g
      style={{ cursor: onSelect ? 'pointer' : 'default' }}
      onPointerDown={(e) => {
        if (!onSelect) return;
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* 壁を白でマスキングして開口を表現 */}
      <line
        x1={hingeX}
        y1={hingeY}
        x2={tipX}
        y2={tipY}
        stroke="#ffffff"
        strokeWidth={strokeW * 1.1}
      />
      {/* ドア板 */}
      <line
        x1={hingeX}
        y1={hingeY}
        x2={doorEndX}
        y2={doorEndY}
        stroke={color}
        strokeWidth={strokeW * 0.5}
      />
      {/* 弧 */}
      <path d={arcPath} stroke={color} strokeWidth={strokeW * 0.4} fill="none" />
      {/* ヒンジ点を小さく表示 */}
      <circle cx={hingeX} cy={hingeY} r={strokeW * 0.3} fill={color} />
    </g>
  );
}

function WindowSymbol({
  win,
  strokeW,
  selected,
  onSelect,
}: {
  win: Window_;
  strokeW: number;
  selected: boolean;
  onSelect?: () => void;
}) {
  const m = segMetrics(win.a, win.b);
  if (!m) return null;
  const { cosA, sinA } = m;
  const off = strokeW * 0.3;
  const nx = -sinA;
  const ny = cosA;
  const color = selected ? '#1e90ff' : '#0070a0';
  return (
    <g
      style={{ cursor: onSelect ? 'pointer' : 'default' }}
      onPointerDown={(e) => {
        if (!onSelect) return;
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* 壁を白で抜く */}
      <line
        x1={win.a.x}
        y1={win.a.y}
        x2={win.b.x}
        y2={win.b.y}
        stroke="#ffffff"
        strokeWidth={strokeW * 1.1}
      />
      {/* 平行二重線 */}
      <line
        x1={win.a.x + nx * off}
        y1={win.a.y + ny * off}
        x2={win.b.x + nx * off}
        y2={win.b.y + ny * off}
        stroke={color}
        strokeWidth={strokeW * 0.25}
      />
      <line
        x1={win.a.x - nx * off}
        y1={win.a.y - ny * off}
        x2={win.b.x - nx * off}
        y2={win.b.y - ny * off}
        stroke={color}
        strokeWidth={strokeW * 0.25}
      />
    </g>
  );
}

export default function DoorWindowLayer({
  doors,
  windows,
  viewBox,
  selectedId,
  onSelect,
  preview,
}: Props) {
  const strokeW = viewBox.w / 100;
  return (
    <g>
      {doors.map((d) => (
        <DoorSymbol
          key={d.id}
          door={d}
          strokeW={strokeW}
          selected={selectedId === d.id}
          onSelect={onSelect ? () => onSelect(d.id) : undefined}
        />
      ))}
      {windows.map((w) => (
        <WindowSymbol
          key={w.id}
          win={w}
          strokeW={strokeW}
          selected={selectedId === w.id}
          onSelect={onSelect ? () => onSelect(w.id) : undefined}
        />
      ))}
      {/* 描画プレビュー: ドラフト線分 (点線) */}
      {preview && (
        <line
          x1={preview.from.x}
          y1={preview.from.y}
          x2={preview.to.x}
          y2={preview.to.y}
          stroke={preview.kind === 'door' ? '#888' : '#3aa'}
          strokeWidth={strokeW * 0.5}
          strokeDasharray={`${strokeW} ${strokeW}`}
          opacity={0.7}
          pointerEvents="none"
        />
      )}
    </g>
  );
}
