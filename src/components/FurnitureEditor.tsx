import { useMemo, useRef, useState } from 'react';
import type { FurnitureShape, FurnitureTemplate, Point } from '../types';
import { FURNITURE_EDITOR_CANVAS_CM, GRID_CM } from '../types';
import { snapPoint } from '../canvas/coords';

type Mode = 'polyline' | 'circle';

type Props = {
  initial?: FurnitureTemplate;
  onSave: (t: Omit<FurnitureTemplate, 'id'>) => void;
  onCancel: () => void;
};

function formatCm(cm: number): string {
  const abs = Math.abs(cm);
  const m = Math.floor(abs / 100);
  const r = Math.round(abs - m * 100);
  if (m > 0 && r > 0) return `${m}m${r}cm`;
  if (m > 0) return `${m}m`;
  return `${r}cm`;
}

// 約 10m × 10m のミニキャンバス。viewBox は 0..1000cm。
const CANVAS_CM = FURNITURE_EDITOR_CANVAS_CM;

export default function FurnitureEditor({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [fillColor, setFillColor] = useState(initial?.fillColor ?? '#cccccc');
  const [strokeColor, setStrokeColor] = useState(initial?.strokeColor ?? '#333333');
  const [mode, setMode] = useState<Mode>('polyline');
  const [shape, setShape] = useState<FurnitureShape | null>(initial?.shape ?? null);

  // 入力中の状態
  const [polyPoints, setPolyPoints] = useState<Point[]>([]);
  const [circleCenter, setCircleCenter] = useState<Point | null>(null);
  const [hover, setHover] = useState<Point | null>(null);

  // クイック作成用
  const [rectW, setRectW] = useState(80);
  const [rectH, setRectH] = useState(40);
  const [diameter, setDiameter] = useState(60);

  const svgRef = useRef<SVGSVGElement>(null);

  const lastClickTime = useRef<number>(0);
  const DOUBLE_CLICK_MS = 350;

  const screenToWorld = (sx: number, sy: number): Point => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const px = (sx - rect.left) / rect.width;
    const py = (sy - rect.top) / rect.height;
    return { x: px * CANVAS_CM, y: py * CANVAS_CM };
  };

  const resetDrawing = () => {
    setPolyPoints([]);
    setCircleCenter(null);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    resetDrawing();
  };

  const closePolyline = () => {
    if (polyPoints.length >= 3) {
      setShape({ type: 'polygon', points: polyPoints });
      setPolyPoints([]);
    }
  };

  const onSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const p = snapPoint(screenToWorld(e.clientX, e.clientY));
    const now = Date.now();
    const isDoubleClick = now - lastClickTime.current < DOUBLE_CLICK_MS;
    lastClickTime.current = now;

    if (mode === 'polyline') {
      if (isDoubleClick && polyPoints.length >= 3) {
        // ダブルクリックで閉じる (重複した最後の点を除去)
        setShape({ type: 'polygon', points: polyPoints });
        setPolyPoints([]);
        return;
      }
      setPolyPoints((prev) => [...prev, p]);
    } else if (mode === 'circle') {
      if (!circleCenter) {
        setCircleCenter(p);
      } else {
        const r = Math.round(Math.hypot(p.x - circleCenter.x, p.y - circleCenter.y) / GRID_CM) * GRID_CM;
        if (r >= GRID_CM) {
          setShape({ type: 'circle', rCm: r });
        }
        setCircleCenter(null);
      }
    }
  };

  const onSvgMove = (e: React.MouseEvent<SVGSVGElement>) => {
    setHover(snapPoint(screenToWorld(e.clientX, e.clientY)));
  };

  const previewLastSegmentLen = useMemo(() => {
    if (mode === 'polyline' && polyPoints.length > 0 && hover) {
      const last = polyPoints[polyPoints.length - 1];
      return Math.hypot(hover.x - last.x, hover.y - last.y);
    }
    if (mode === 'circle' && circleCenter && hover) {
      return Math.hypot(hover.x - circleCenter.x, hover.y - circleCenter.y);
    }
    return null;
  }, [mode, polyPoints, circleCenter, hover]);

  const applyRect = () => {
    const w = Math.max(GRID_CM, Math.round(rectW / GRID_CM) * GRID_CM);
    const h = Math.max(GRID_CM, Math.round(rectH / GRID_CM) * GRID_CM);
    // 中心を (CANVAS_CM/2, CANVAS_CM/2) としたポリゴンを作る
    const cx = CANVAS_CM / 2;
    const cy = CANVAS_CM / 2;
    setShape({
      type: 'polygon',
      points: [
        { x: cx - w / 2, y: cy - h / 2 },
        { x: cx + w / 2, y: cy - h / 2 },
        { x: cx + w / 2, y: cy + h / 2 },
        { x: cx - w / 2, y: cy + h / 2 },
      ],
    });
    resetDrawing();
  };

  const applyCircleNumeric = () => {
    const d = Math.max(GRID_CM, Math.round(diameter / GRID_CM) * GRID_CM);
    setShape({ type: 'circle', rCm: d / 2 });
    resetDrawing();
  };

  // テンプレート保存時は shape を bbox 中心原点に正規化する。
  const normalizeShape = (s: FurnitureShape): FurnitureShape => {
    if (s.type === 'circle') return s;
    const xs = s.points.map((p) => p.x);
    const ys = s.points.map((p) => p.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    return {
      type: 'polygon',
      points: s.points.map((p) => ({ x: p.x - cx, y: p.y - cy })),
    };
  };

  const handleSaveNormalized = () => {
    if (!shape) {
      alert('家具の形状を作成してください。');
      return;
    }
    if (!name.trim()) {
      alert('家具名を入力してください。');
      return;
    }
    onSave({
      name: name.trim(),
      fillColor,
      strokeColor,
      shape: normalizeShape(shape),
    });
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal furniture-editor">
        <header className="modal-header">
          <strong>家具エディタ</strong>
          <button type="button" onClick={onCancel}>
            ×
          </button>
        </header>
        <div className="furniture-editor-toolbar">
          <input
            type="text"
            placeholder="家具名"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="furniture-name-input"
          />
          <span>
            塗:
            <input
              type="color"
              value={fillColor}
              onChange={(e) => setFillColor(e.target.value)}
            />
          </span>
          <span>
            線:
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
            />
          </span>
          <div className="tool-group">
            <button
              type="button"
              className={`tool-btn ${mode === 'polyline' ? 'active' : ''}`}
              onClick={() => switchMode('polyline')}
            >
              ポリライン
            </button>
            <button
              type="button"
              className={`tool-btn ${mode === 'circle' ? 'active' : ''}`}
              onClick={() => switchMode('circle')}
            >
              円
            </button>
          </div>
          {mode === 'polyline' && (
            <button
              type="button"
              onClick={closePolyline}
              disabled={polyPoints.length < 3}
            >
              閉じる (またはダブルクリック)
            </button>
          )}
        </div>
        <div className="furniture-editor-canvas-wrap">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${CANVAS_CM} ${CANVAS_CM}`}
            className="furniture-editor-canvas"
            onClick={onSvgClick}
            onMouseMove={onSvgMove}
            onMouseLeave={() => setHover(null)}
          >
            {/* グリッド */}
            <FurnitureGrid />
            {/* 確定済み形状プレビュー */}
            {shape && (
              <ShapeRender shape={shape} fillColor={fillColor} strokeColor={strokeColor} />
            )}
            {/* ポリライン進行中 */}
            {mode === 'polyline' && polyPoints.length > 0 && (
              <g>
                <polyline
                  points={polyPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={CANVAS_CM / 200}
                />
                {hover && (
                  <line
                    x1={polyPoints[polyPoints.length - 1].x}
                    y1={polyPoints[polyPoints.length - 1].y}
                    x2={hover.x}
                    y2={hover.y}
                    stroke={strokeColor}
                    strokeWidth={CANVAS_CM / 200}
                    strokeDasharray={`${CANVAS_CM / 100} ${CANVAS_CM / 100}`}
                    opacity={0.6}
                  />
                )}
                {polyPoints.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={CANVAS_CM / 200} fill={strokeColor} />
                ))}
              </g>
            )}
            {/* 円進行中 */}
            {mode === 'circle' && circleCenter && hover && (
              <g>
                <circle
                  cx={circleCenter.x}
                  cy={circleCenter.y}
                  r={Math.hypot(hover.x - circleCenter.x, hover.y - circleCenter.y)}
                  fill="none"
                  stroke={strokeColor}
                  strokeDasharray={`${CANVAS_CM / 100} ${CANVAS_CM / 100}`}
                  strokeWidth={CANVAS_CM / 200}
                  opacity={0.6}
                />
                <circle
                  cx={circleCenter.x}
                  cy={circleCenter.y}
                  r={CANVAS_CM / 200}
                  fill={strokeColor}
                />
              </g>
            )}
            {/* リアルタイム長さラベル */}
            {previewLastSegmentLen !== null && hover && (
              <text
                x={hover.x}
                y={hover.y - CANVAS_CM / 80}
                fontSize={CANVAS_CM / 50}
                fill="#333"
                textAnchor="middle"
              >
                {formatCm(previewLastSegmentLen)}
              </text>
            )}
          </svg>
        </div>
        <div className="furniture-editor-quick">
          <div className="tool-group">
            矩形クイック作成: W
            <input
              type="number"
              min={GRID_CM}
              step={GRID_CM}
              value={rectW}
              onChange={(e) => setRectW(Number(e.target.value) || GRID_CM)}
            />
            × H
            <input
              type="number"
              min={GRID_CM}
              step={GRID_CM}
              value={rectH}
              onChange={(e) => setRectH(Number(e.target.value) || GRID_CM)}
            />
            cm
            <button type="button" onClick={applyRect}>
              適用
            </button>
          </div>
          <div className="tool-group">
            円クイック作成: 直径
            <input
              type="number"
              min={GRID_CM}
              step={GRID_CM}
              value={diameter}
              onChange={(e) => setDiameter(Number(e.target.value) || GRID_CM)}
            />
            cm
            <button type="button" onClick={applyCircleNumeric}>
              適用
            </button>
          </div>
          {shape && (
            <button type="button" onClick={() => setShape(null)}>
              形状クリア
            </button>
          )}
        </div>
        <footer className="modal-footer">
          <button type="button" onClick={onCancel}>
            キャンセル
          </button>
          <button type="button" className="primary" onClick={handleSaveNormalized}>
            保存
          </button>
        </footer>
      </div>
    </div>
  );
}

function FurnitureGrid() {
  const fine = GRID_CM;
  const coarse = 100;
  const lines: React.ReactNode[] = [];
  for (let x = 0; x <= CANVAS_CM; x += fine) {
    const isCoarse = x % coarse === 0;
    lines.push(
      <line
        key={`vx${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={CANVAS_CM}
        stroke={isCoarse ? '#c0c0c0' : '#ececec'}
        strokeWidth={isCoarse ? CANVAS_CM / 500 : CANVAS_CM / 1000}
      />,
    );
  }
  for (let y = 0; y <= CANVAS_CM; y += fine) {
    const isCoarse = y % coarse === 0;
    lines.push(
      <line
        key={`vy${y}`}
        x1={0}
        y1={y}
        x2={CANVAS_CM}
        y2={y}
        stroke={isCoarse ? '#c0c0c0' : '#ececec'}
        strokeWidth={isCoarse ? CANVAS_CM / 500 : CANVAS_CM / 1000}
      />,
    );
  }
  return <g pointerEvents="none">{lines}</g>;
}

function ShapeRender({
  shape,
  fillColor,
  strokeColor,
}: {
  shape: FurnitureShape;
  fillColor: string;
  strokeColor: string;
}) {
  if (shape.type === 'circle') {
    return (
      <circle
        cx={CANVAS_CM / 2}
        cy={CANVAS_CM / 2}
        r={shape.rCm}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={CANVAS_CM / 200}
      />
    );
  }
  return (
    <polygon
      points={shape.points.map((p) => `${p.x},${p.y}`).join(' ')}
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={CANVAS_CM / 200}
    />
  );
}
