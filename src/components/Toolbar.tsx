import { useUiStore, type ToolId } from '../state/uiStore';
import { useStore } from '../state/store';
import {
  removeWallCommand,
  setWallColorCommand,
  removeDoorCommand,
  removeWindowCommand,
  toggleDoorFlipCommand,
  toggleWindowFlipCommand,
  removeOutletCommand,
  setOutletPlugsCommand,
  removeInfoOutletCommand,
  removeLightCommand,
  removeFurnitureInstanceCommand,
  duplicateFurnitureInstanceCommand,
} from '../state/planCommands';

const TOOL_LABELS: Record<ToolId, string> = {
  select: '選択',
  wall: '壁',
  door: 'ドア',
  window: '窓',
  outlet: 'コンセント',
  infoOutlet: '情報コンセント',
  light: '照明',
};

// 後フェーズで実装するツールはここで一旦無効化
// 編集系ツール: 間取り編集モードでのみ有効
const EDIT_TOOLS: ToolId[] = ['wall', 'door', 'window', 'outlet', 'infoOutlet', 'light'];

export default function Toolbar() {
  const tool = useUiStore((s) => s.tool);
  const setTool = useUiStore((s) => s.setTool);
  const color = useUiStore((s) => s.currentColor);
  const setColor = useUiStore((s) => s.setCurrentColor);
  const selectedId = useUiStore((s) => s.selectedId);
  const setSelectedId = useUiStore((s) => s.setSelectedId);

  const persisted = useStore((s) => s.persisted);
  const dispatch = useStore((s) => s.dispatch);
  const plan = persisted.plans.find((p) => p.id === persisted.activePlanId) ?? null;
  const selectedWall = plan?.walls.find((w) => w.id === selectedId) ?? null;
  const selectedDoor = plan?.doors.find((d) => d.id === selectedId) ?? null;
  const selectedWindow = plan?.windows.find((w) => w.id === selectedId) ?? null;
  const selectedOutlet = plan?.outlets.find((o) => o.id === selectedId) ?? null;
  const selectedInfo = plan?.infoOutlets.find((o) => o.id === selectedId) ?? null;
  const selectedLight = plan?.lights.find((l) => l.id === selectedId) ?? null;
  const selectedFi = plan?.furnitureInstances.find((f) => f.id === selectedId) ?? null;
  const selectedFiTemplate = selectedFi
    ? persisted.templates.find((t) => t.id === selectedFi.templateId)
    : null;
  // 家具の bbox サイズ表示用
  const fiSize = (() => {
    if (!selectedFiTemplate) return null;
    if (selectedFiTemplate.shape.type === 'circle') {
      const d = selectedFiTemplate.shape.rCm * 2;
      return `直径 ${d}cm`;
    }
    const xs = selectedFiTemplate.shape.points.map((p) => p.x);
    const ys = selectedFiTemplate.shape.points.map((p) => p.y);
    const w = Math.round(Math.max(...xs) - Math.min(...xs));
    const h = Math.round(Math.max(...ys) - Math.min(...ys));
    return `${w}cm × ${h}cm`;
  })();

  return (
    <div className="toolbar">
      <div className="tool-group">
        {(Object.keys(TOOL_LABELS) as ToolId[]).map((id) => {
          const disabled = plan?.locked && EDIT_TOOLS.includes(id);
          return (
            <button
              key={id}
              type="button"
              className={`tool-btn ${tool === id ? 'active' : ''}`}
              disabled={disabled}
              onClick={() => setTool(id)}
              title={disabled ? '家具配置モードでは無効' : TOOL_LABELS[id]}
            >
              {TOOL_LABELS[id]}
            </button>
          );
        })}
      </div>
      <div className="tool-group">
        色:
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
      </div>
      {selectedWall && (
        <div className="tool-group">
          選択中の壁:
          <input
            type="color"
            value={selectedWall.color}
            onChange={(e) => dispatch(setWallColorCommand(selectedWall.id, e.target.value))}
          />
          <button
            type="button"
            onClick={() => {
              dispatch(removeWallCommand(selectedWall.id));
              setSelectedId(null);
            }}
          >
            削除
          </button>
        </div>
      )}
      {selectedDoor && (
        <div className="tool-group">
          選択中のドア:
          <button type="button" onClick={() => dispatch(toggleDoorFlipCommand(selectedDoor.id))}>
            向き反転
          </button>
          <button
            type="button"
            onClick={() => {
              dispatch(removeDoorCommand(selectedDoor.id));
              setSelectedId(null);
            }}
          >
            削除
          </button>
        </div>
      )}
      {selectedWindow && (
        <div className="tool-group">
          選択中の窓:
          <button
            type="button"
            onClick={() => dispatch(toggleWindowFlipCommand(selectedWindow.id))}
          >
            向き反転
          </button>
          <button
            type="button"
            onClick={() => {
              dispatch(removeWindowCommand(selectedWindow.id));
              setSelectedId(null);
            }}
          >
            削除
          </button>
        </div>
      )}
      {selectedOutlet && (
        <div className="tool-group">
          選択中のコンセント: 口数
          <select
            value={selectedOutlet.plugs}
            onChange={(e) =>
              dispatch(
                setOutletPlugsCommand(
                  selectedOutlet.id,
                  Number(e.target.value) as 1 | 2 | 3 | 4,
                ),
              )
            }
          >
            <option value={1}>1口</option>
            <option value={2}>2口</option>
            <option value={3}>3口</option>
            <option value={4}>4口</option>
          </select>
          <button
            type="button"
            onClick={() => {
              dispatch(removeOutletCommand(selectedOutlet.id));
              setSelectedId(null);
            }}
          >
            削除
          </button>
        </div>
      )}
      {selectedInfo && (
        <div className="tool-group">
          選択中の情報コンセント:
          <button
            type="button"
            onClick={() => {
              dispatch(removeInfoOutletCommand(selectedInfo.id));
              setSelectedId(null);
            }}
          >
            削除
          </button>
        </div>
      )}
      {selectedLight && (
        <div className="tool-group">
          選択中の照明:
          <button
            type="button"
            onClick={() => {
              dispatch(removeLightCommand(selectedLight.id));
              setSelectedId(null);
            }}
          >
            削除
          </button>
        </div>
      )}
      {selectedFi && selectedFiTemplate && (
        <div className="tool-group">
          選択中の家具: {selectedFiTemplate.name} ({fiSize}, {selectedFi.rotationDeg}°)
          <button
            type="button"
            onClick={() => dispatch(duplicateFurnitureInstanceCommand(selectedFi.id))}
          >
            複製
          </button>
          <button
            type="button"
            onClick={() => {
              dispatch(removeFurnitureInstanceCommand(selectedFi.id));
              setSelectedId(null);
            }}
          >
            削除
          </button>
        </div>
      )}
    </div>
  );
}
