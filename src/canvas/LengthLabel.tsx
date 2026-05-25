import type { Point } from '../types';
import type { ViewBox } from './coords';

type Props = {
  a: Point;
  b: Point;
  viewBox: ViewBox;
};

function formatCm(cm: number): string {
  const abs = Math.abs(cm);
  const m = Math.floor(abs / 100);
  const r = Math.round(abs - m * 100);
  if (m > 0 && r > 0) return `${m}m${r}cm`;
  if (m > 0) return `${m}m`;
  return `${r}cm`;
}

// 線分の中点付近に長さを表示
export default function LengthLabel({ a, b, viewBox }: Props) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return null;
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2;
  // 文字サイズも viewBox スケールに合わせる (画面上 14px 程度)
  const fontSize = viewBox.w / 70;
  // 線分に対して垂直方向にオフセット
  const nx = -dy / len;
  const ny = dx / len;
  const off = fontSize * 0.8;
  return (
    <g pointerEvents="none">
      <rect
        x={cx + nx * off - fontSize * 2}
        y={cy + ny * off - fontSize * 0.7}
        width={fontSize * 4}
        height={fontSize * 1.4}
        fill="rgba(255,255,255,0.9)"
        rx={fontSize * 0.2}
      />
      <text
        x={cx + nx * off}
        y={cy + ny * off}
        fontSize={fontSize}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#222"
      >
        {formatCm(len)}
      </text>
    </g>
  );
}
