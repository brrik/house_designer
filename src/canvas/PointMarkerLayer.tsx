import type { InfoOutlet, Light, Outlet } from '../types';
import type { ViewBox } from './coords';

type Props = {
  outlets: Outlet[];
  infoOutlets: InfoOutlet[];
  lights: Light[];
  viewBox: ViewBox;
  selectedId: string | null;
  onSelect?: (id: string) => void;
};

// アイコン半径。最小 15cm (= 方眼3マス相当の直径) を保証しつつ、
// 大きくズームアウトしている場合は viewBox 比で拡大して常に視認できるサイズに。
function iconRadius(viewBox: ViewBox): number {
  return Math.max(15, viewBox.w * 0.015);
}

function OutletIcon({
  o,
  r,
  selected,
  onSelect,
}: {
  o: Outlet;
  r: number;
  selected: boolean;
  onSelect?: () => void;
}) {
  const stroke = selected ? '#1e90ff' : '#333';
  const dotR = r * 0.25;
  const spacing = r * 0.5;
  const offsets: number[] = [];
  for (let i = 0; i < o.plugs; i++) {
    offsets.push((i - (o.plugs - 1) / 2) * spacing);
  }
  return (
    <g
      transform={`translate(${o.x} ${o.y})`}
      style={{ cursor: onSelect ? 'pointer' : 'default' }}
      onPointerDown={(e) => {
        if (!onSelect) return;
        e.stopPropagation();
        onSelect();
      }}
    >
      <circle r={r} fill="#fff" stroke={stroke} strokeWidth={r * 0.12} />
      {offsets.map((dx, i) => (
        <circle key={i} cx={dx} cy={0} r={dotR} fill={stroke} />
      ))}
    </g>
  );
}

function InfoOutletIcon({
  o,
  r,
  selected,
  onSelect,
}: {
  o: InfoOutlet;
  r: number;
  selected: boolean;
  onSelect?: () => void;
}) {
  const stroke = selected ? '#1e90ff' : '#0a6';
  return (
    <g
      transform={`translate(${o.x} ${o.y})`}
      style={{ cursor: onSelect ? 'pointer' : 'default' }}
      onPointerDown={(e) => {
        if (!onSelect) return;
        e.stopPropagation();
        onSelect();
      }}
    >
      <rect
        x={-r}
        y={-r}
        width={r * 2}
        height={r * 2}
        fill="#fff"
        stroke={stroke}
        strokeWidth={r * 0.12}
      />
      <text
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={r * 1.1}
        fontWeight={700}
        fill={stroke}
      >
        i
      </text>
    </g>
  );
}

function LightIcon({
  l,
  r,
  selected,
  onSelect,
}: {
  l: Light;
  r: number;
  selected: boolean;
  onSelect?: () => void;
}) {
  const stroke = selected ? '#1e90ff' : '#c70';
  const r1 = r;
  const r2 = r * 0.45;
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r1 : r2;
    points.push(`${Math.cos(ang) * rr},${Math.sin(ang) * rr}`);
  }
  return (
    <g
      transform={`translate(${l.x} ${l.y})`}
      style={{ cursor: onSelect ? 'pointer' : 'default' }}
      onPointerDown={(e) => {
        if (!onSelect) return;
        e.stopPropagation();
        onSelect();
      }}
    >
      <polygon
        points={points.join(' ')}
        fill="#fff8e0"
        stroke={stroke}
        strokeWidth={r * 0.12}
      />
    </g>
  );
}

export default function PointMarkerLayer({
  outlets,
  infoOutlets,
  lights,
  viewBox,
  selectedId,
  onSelect,
}: Props) {
  const r = iconRadius(viewBox);
  return (
    <g>
      {outlets.map((o) => (
        <OutletIcon
          key={o.id}
          o={o}
          r={r}
          selected={selectedId === o.id}
          onSelect={onSelect ? () => onSelect(o.id) : undefined}
        />
      ))}
      {infoOutlets.map((o) => (
        <InfoOutletIcon
          key={o.id}
          o={o}
          r={r}
          selected={selectedId === o.id}
          onSelect={onSelect ? () => onSelect(o.id) : undefined}
        />
      ))}
      {lights.map((l) => (
        <LightIcon
          key={l.id}
          l={l}
          r={r}
          selected={selectedId === l.id}
          onSelect={onSelect ? () => onSelect(l.id) : undefined}
        />
      ))}
    </g>
  );
}
