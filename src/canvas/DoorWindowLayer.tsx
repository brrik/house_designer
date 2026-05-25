import type { Door, Wall, Window_ } from '../types';
import type { ViewBox } from './coords';
import { wallAngleRad } from './wallMath';

type Props = {
  walls: Wall[];
  doors: Door[];
  windows: Window_[];
  viewBox: ViewBox;
  selectedId: string | null;
  onSelect?: (id: string) => void;
};

function findWall(walls: Wall[], id: string): Wall | undefined {
  return walls.find((w) => w.id === id);
}

// ドア: 壁上に widthCm の開口部 + 弧で建築記号を描く。
// 弧は開口部の片端を中心とし半径 = widthCm の 1/4 円。flipped で反対側に。
function DoorSymbol({
  wall,
  door,
  strokeW,
  selected,
  onSelect,
}: {
  wall: Wall;
  door: Door;
  strokeW: number;
  selected: boolean;
  onSelect?: () => void;
}) {
  const len = Math.hypot(wall.b.x - wall.a.x, wall.b.y - wall.a.y);
  if (len === 0) return null;
  const ang = wallAngleRad(wall);
  const cosA = Math.cos(ang);
  const sinA = Math.sin(ang);
  // 開口部の中心位置
  const cx = wall.a.x + (wall.b.x - wall.a.x) * door.t;
  const cy = wall.a.y + (wall.b.y - wall.a.y) * door.t;
  // 開口部の両端
  const half = door.widthCm / 2;
  const hingeX = cx - cosA * half;
  const hingeY = cy - sinA * half;
  const tipX = cx + cosA * half;
  const tipY = cy + sinA * half;
  // ヒンジから垂直方向に半径 widthCm のドア板（ライン）を伸ばす
  // flipped で法線方向を反転
  const nDir = door.flipped ? -1 : 1;
  const nx = -sinA * nDir;
  const ny = cosA * nDir;
  const doorEndX = hingeX + nx * door.widthCm;
  const doorEndY = hingeY + ny * door.widthCm;

  // 弧 (hinge を中心、開口幅 = 半径)。SVG path で arc を描く。
  const sweep = nDir > 0 ? 0 : 1;
  const arcPath = `M ${tipX} ${tipY} A ${door.widthCm} ${door.widthCm} 0 0 ${sweep} ${doorEndX} ${doorEndY}`;

  const color = selected ? '#1e90ff' : '#444';

  return (
    <g
      style={{ cursor: 'pointer' }}
      onPointerDown={(e) => {
        if (!onSelect) return;
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* 開口部 (壁を白で隠す) */}
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
    </g>
  );
}

// 窓: 壁線に重ねる平行二重線。壁部分を白で抜いて 2 本の細線で描く。
function WindowSymbol({
  wall,
  win,
  strokeW,
  selected,
  onSelect,
}: {
  wall: Wall;
  win: Window_;
  strokeW: number;
  selected: boolean;
  onSelect?: () => void;
}) {
  const ang = wallAngleRad(wall);
  const cosA = Math.cos(ang);
  const sinA = Math.sin(ang);
  const cx = wall.a.x + (wall.b.x - wall.a.x) * win.t;
  const cy = wall.a.y + (wall.b.y - wall.a.y) * win.t;
  const half = win.widthCm / 2;
  const ax = cx - cosA * half;
  const ay = cy - sinA * half;
  const bx = cx + cosA * half;
  const by = cy + sinA * half;
  // 二重線の間隔は strokeW の半分
  const off = strokeW * 0.3;
  const nx = -sinA;
  const ny = cosA;
  const color = selected ? '#1e90ff' : '#0070a0';

  return (
    <g
      style={{ cursor: 'pointer' }}
      onPointerDown={(e) => {
        if (!onSelect) return;
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* 壁を抜く */}
      <line x1={ax} y1={ay} x2={bx} y2={by} stroke="#ffffff" strokeWidth={strokeW * 1.1} />
      {/* 二重線 */}
      <line
        x1={ax + nx * off}
        y1={ay + ny * off}
        x2={bx + nx * off}
        y2={by + ny * off}
        stroke={color}
        strokeWidth={strokeW * 0.25}
      />
      <line
        x1={ax - nx * off}
        y1={ay - ny * off}
        x2={bx - nx * off}
        y2={by - ny * off}
        stroke={color}
        strokeWidth={strokeW * 0.25}
      />
    </g>
  );
}

export default function DoorWindowLayer({
  walls,
  doors,
  windows,
  viewBox,
  selectedId,
  onSelect,
}: Props) {
  const strokeW = viewBox.w / 100;
  return (
    <g>
      {doors.map((d) => {
        const wall = findWall(walls, d.wallId);
        if (!wall) return null;
        return (
          <DoorSymbol
            key={d.id}
            wall={wall}
            door={d}
            strokeW={strokeW}
            selected={selectedId === d.id}
            onSelect={onSelect ? () => onSelect(d.id) : undefined}
          />
        );
      })}
      {windows.map((w) => {
        const wall = findWall(walls, w.wallId);
        if (!wall) return null;
        return (
          <WindowSymbol
            key={w.id}
            wall={wall}
            win={w}
            strokeW={strokeW}
            selected={selectedId === w.id}
            onSelect={onSelect ? () => onSelect(w.id) : undefined}
          />
        );
      })}
    </g>
  );
}
