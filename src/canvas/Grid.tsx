import { GRID_CM } from '../types';
import type { ViewBox } from './coords';

type Props = {
  viewBox: ViewBox;
  canvasWCm: number;
  canvasHCm: number;
};

// 5cm 単位グリッド。ズームレベルに応じて間引いて描く（過密回避）。
// SVG <pattern> 直書きだとパフォーマンスが厳しい場面があるため、可視範囲のみ <line> で描く。
export default function Grid({ viewBox, canvasWCm, canvasHCm }: Props) {
  const fineStep = GRID_CM; // 5cm
  const coarseStep = 100; // 1m

  // viewBox 幅に対して、画面上で 8px 未満になる線は省略する閾値
  // (viewBox.w / svgPixelWidth) px/cm → 1cm 当たり px 数
  // 厳密な計算は SVG レンダで viewBox がストレッチされるため省略し、密度ヒューリスティックで判定
  const pxPerCmHeuristic = 1 / (viewBox.w / 1000); // viewBox 1000cm 表示で 1cm=1px 換算
  const showFine = pxPerCmHeuristic * fineStep >= 4;

  const x0 = Math.max(0, Math.floor(viewBox.x / fineStep) * fineStep);
  const x1 = Math.min(canvasWCm, Math.ceil((viewBox.x + viewBox.w) / fineStep) * fineStep);
  const y0 = Math.max(0, Math.floor(viewBox.y / fineStep) * fineStep);
  const y1 = Math.min(canvasHCm, Math.ceil((viewBox.y + viewBox.h) / fineStep) * fineStep);

  const fineLines: React.ReactNode[] = [];
  const coarseLines: React.ReactNode[] = [];

  if (showFine) {
    for (let x = x0; x <= x1; x += fineStep) {
      if (x % coarseStep === 0) continue;
      fineLines.push(<line key={`fx${x}`} x1={x} y1={y0} x2={x} y2={y1} />);
    }
    for (let y = y0; y <= y1; y += fineStep) {
      if (y % coarseStep === 0) continue;
      fineLines.push(<line key={`fy${y}`} x1={x0} y1={y} x2={x1} y2={y} />);
    }
  }

  for (let x = Math.ceil(x0 / coarseStep) * coarseStep; x <= x1; x += coarseStep) {
    coarseLines.push(<line key={`cx${x}`} x1={x} y1={y0} x2={x} y2={y1} />);
  }
  for (let y = Math.ceil(y0 / coarseStep) * coarseStep; y <= y1; y += coarseStep) {
    coarseLines.push(<line key={`cy${y}`} x1={x0} y1={y} x2={x1} y2={y} />);
  }

  // 線幅は viewBox スケールに依存するため、見た目 1px ≒ viewBox.w/1000 で割って描く
  const strokeFine = viewBox.w / 2000;
  const strokeCoarse = viewBox.w / 1000;

  return (
    <g pointerEvents="none">
      {/* キャンバス外周 */}
      <rect
        x={0}
        y={0}
        width={canvasWCm}
        height={canvasHCm}
        fill="#ffffff"
        stroke="#888"
        strokeWidth={strokeCoarse}
      />
      <g stroke="#e8e8e8" strokeWidth={strokeFine}>
        {fineLines}
      </g>
      <g stroke="#c0c0c0" strokeWidth={strokeCoarse}>
        {coarseLines}
      </g>
    </g>
  );
}
