import type { FurnitureTemplate } from '../types';

type Props = {
  template: FurnitureTemplate;
  size?: number; // px
};

// テンプレートの shape を BBox に合わせて縮小描画するサムネイル
export default function FurnitureThumbnail({ template, size = 48 }: Props) {
  const { shape, fillColor, strokeColor } = template;
  if (shape.type === 'circle') {
    const d = shape.rCm * 2;
    return (
      <svg width={size} height={size} viewBox={`${-d / 2 - 5} ${-d / 2 - 5} ${d + 10} ${d + 10}`}>
        <circle r={shape.rCm} fill={fillColor} stroke={strokeColor} strokeWidth={d * 0.04} />
      </svg>
    );
  }
  const xs = shape.points.map((p) => p.x);
  const ys = shape.points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  const padding = Math.max(w, h) * 0.06;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`${minX - padding} ${minY - padding} ${w + padding * 2} ${h + padding * 2}`}
    >
      <polygon
        points={shape.points.map((p) => `${p.x},${p.y}`).join(' ')}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={Math.max(w, h) * 0.04}
      />
    </svg>
  );
}
