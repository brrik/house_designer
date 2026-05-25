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

// アイコンサイズ (cm)。viewBox の大きさに依存しない実寸固定。
const ICON_R_CM = 8;

function OutletIcon({
  o,
  selected,
  onSelect,
}: {
  o: Outlet;
  selected: boolean;
  onSelect?: () => void;
}) {
  const stroke = selected ? '#1e90ff' : '#333';
  // 口数分のドットを横並び。最大4個、ICON_R_CM の円内に配置
  const dotR = ICON_R_CM * 0.25;
  const spacing = ICON_R_CM * 0.5;
  const offsets: number[] = [];
  for (let i = 0; i < o.plugs; i++) {
    offsets.push((i - (o.plugs - 1) / 2) * spacing);
  }
  return (
    <g
      transform={`translate(${o.x} ${o.y})`}
      style={{ cursor: 'pointer' }}
      onPointerDown={(e) => {
        if (!onSelect) return;
        e.stopPropagation();
        onSelect();
      }}
    >
      <circle r={ICON_R_CM} fill="#fff" stroke={stroke} strokeWidth={ICON_R_CM * 0.12} />
      {offsets.map((dx, i) => (
        <circle key={i} cx={dx} cy={0} r={dotR} fill={stroke} />
      ))}
    </g>
  );
}

function InfoOutletIcon({
  o,
  selected,
  onSelect,
}: {
  o: InfoOutlet;
  selected: boolean;
  onSelect?: () => void;
}) {
  const stroke = selected ? '#1e90ff' : '#0a6';
  return (
    <g
      transform={`translate(${o.x} ${o.y})`}
      style={{ cursor: 'pointer' }}
      onPointerDown={(e) => {
        if (!onSelect) return;
        e.stopPropagation();
        onSelect();
      }}
    >
      <rect
        x={-ICON_R_CM}
        y={-ICON_R_CM}
        width={ICON_R_CM * 2}
        height={ICON_R_CM * 2}
        fill="#fff"
        stroke={stroke}
        strokeWidth={ICON_R_CM * 0.12}
      />
      <text
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={ICON_R_CM * 1.1}
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
  selected,
  onSelect,
}: {
  l: Light;
  selected: boolean;
  onSelect?: () => void;
}) {
  const stroke = selected ? '#1e90ff' : '#c70';
  // 星型 (5 角)
  const r1 = ICON_R_CM;
  const r2 = ICON_R_CM * 0.45;
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const r = i % 2 === 0 ? r1 : r2;
    points.push(`${Math.cos(ang) * r},${Math.sin(ang) * r}`);
  }
  return (
    <g
      transform={`translate(${l.x} ${l.y})`}
      style={{ cursor: 'pointer' }}
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
        strokeWidth={ICON_R_CM * 0.12}
      />
    </g>
  );
}

export default function PointMarkerLayer({
  outlets,
  infoOutlets,
  lights,
  selectedId,
  onSelect,
}: Props) {
  return (
    <g>
      {outlets.map((o) => (
        <OutletIcon
          key={o.id}
          o={o}
          selected={selectedId === o.id}
          onSelect={onSelect ? () => onSelect(o.id) : undefined}
        />
      ))}
      {infoOutlets.map((o) => (
        <InfoOutletIcon
          key={o.id}
          o={o}
          selected={selectedId === o.id}
          onSelect={onSelect ? () => onSelect(o.id) : undefined}
        />
      ))}
      {lights.map((l) => (
        <LightIcon
          key={l.id}
          l={l}
          selected={selectedId === l.id}
          onSelect={onSelect ? () => onSelect(l.id) : undefined}
        />
      ))}
    </g>
  );
}
