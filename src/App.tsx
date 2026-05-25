import { useEffect } from 'react';
import Canvas from './canvas/Canvas';
import Toolbar from './components/Toolbar';
import Sidebar from './components/Sidebar';
import FurnitureThumbnail from './components/FurnitureThumbnail';
import ContextMenu from './components/ContextMenu';
import TabBar from './components/TabBar';
import { useStore } from './state/store';
import { useUiStore } from './state/uiStore';
import {
  addPlanCommand,
  lockPlanCommand,
  unlockPlanCommand,
  setCanvasSizeCommand,
} from './state/planCommands';
import { exportPlanJpg, exportPlanPdf } from './export';

function DragGhost() {
  const draggingId = useUiStore((s) => s.draggingTemplateId);
  const pos = useUiStore((s) => s.draggingPos);
  const templates = useStore((s) => s.persisted.templates);
  if (!draggingId || !pos) return null;
  const t = templates.find((tpl) => tpl.id === draggingId);
  if (!t) return null;
  return (
    <div
      style={{
        position: 'fixed',
        left: pos.sx,
        top: pos.sy,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 200,
        opacity: 0.85,
      }}
    >
      <FurnitureThumbnail template={t} size={64} />
    </div>
  );
}

export default function App() {
  const persisted = useStore((s) => s.persisted);
  const dispatch = useStore((s) => s.dispatch);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const activePlan = persisted.plans.find((p) => p.id === persisted.activePlanId) ?? null;

  // 初回起動時にプランが無ければ作成
  useEffect(() => {
    if (persisted.plans.length === 0) {
      dispatch(addPlanCommand('プラン1'));
    }
  }, [persisted.plans.length, dispatch]);

  // キーボードショートカット: Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      // input/textarea にフォーカス中は無視
      const t = e.target as HTMLElement;
      if (t?.tagName === 'INPUT' || t?.tagName === 'TEXTAREA' || t?.isContentEditable) return;
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        (e.key.toLowerCase() === 'z' && e.shiftKey) ||
        e.key.toLowerCase() === 'y'
      ) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const templates = useStore((s) => s.persisted.templates);

  if (!activePlan) {
    return <div className="app-root">初期化中...</div>;
  }

  const { wCm, hCm } = activePlan.canvasSize;

  const onExportJpg = async () => {
    try {
      await exportPlanJpg(activePlan, templates);
    } catch (e) {
      alert(`JPG出力に失敗しました: ${(e as Error).message}`);
    }
  };
  const onExportPdf = async () => {
    try {
      await exportPlanPdf(activePlan, templates);
    } catch (e) {
      alert(`PDF出力に失敗しました: ${(e as Error).message}`);
    }
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <strong>House Planner</strong>
        <span className="canvas-size-control">
          キャンバス:
          <input
            type="number"
            min={100}
            max={1_000_000}
            step={100}
            value={wCm}
            disabled={activePlan.locked}
            onChange={(e) =>
              dispatch(setCanvasSizeCommand(Number(e.target.value) || 100, hCm))
            }
          />
          cm ×
          <input
            type="number"
            min={100}
            max={1_000_000}
            step={100}
            value={hCm}
            disabled={activePlan.locked}
            onChange={(e) =>
              dispatch(setCanvasSizeCommand(wCm, Number(e.target.value) || 100))
            }
          />
          cm ({(wCm / 100).toFixed(2)}m × {(hCm / 100).toFixed(2)}m)
        </span>
        <button
          type="button"
          className={activePlan.locked ? 'lock-btn locked' : 'lock-btn'}
          onClick={() =>
            dispatch(activePlan.locked ? unlockPlanCommand() : lockPlanCommand())
          }
        >
          {activePlan.locked ? '間取り編集に戻る' : '間取り確定（外周にトリミング）'}
        </button>
        <span className="mode-indicator">
          現在モード: {activePlan.locked ? '家具配置' : '間取り編集'}
        </span>
        <span className="export-group">
          <button type="button" onClick={undo} disabled={!canUndo} title="元に戻す (Cmd/Ctrl+Z)">
            ↶
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            title="やり直し (Cmd/Ctrl+Shift+Z)"
          >
            ↷
          </button>
          <button type="button" onClick={onExportJpg}>
            JPG 出力
          </button>
          <button type="button" onClick={onExportPdf}>
            PDF 出力
          </button>
        </span>
      </header>
      <TabBar />
      <Toolbar />
      <main className="app-main">
        <div className="app-canvas-wrap">
          <Canvas
            key={`${activePlan.id}-${wCm}-${hCm}`}
            canvasWCm={wCm}
            canvasHCm={hCm}
          />
        </div>
        <Sidebar />
      </main>
      <DragGhost />
      <ContextMenu />
    </div>
  );
}
