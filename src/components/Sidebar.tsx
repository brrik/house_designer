import { useRef, useState } from 'react';
import { useStore } from '../state/store';
import {
  addFurnitureInstanceCommand,
  addTemplateCommand,
  removeTemplateCommand,
  updateTemplateCommand,
} from '../state/planCommands';
import { useUiStore } from '../state/uiStore';
import { snapPoint } from '../canvas/coords';
import type { FurnitureTemplate } from '../types';
import FurnitureEditor from './FurnitureEditor';
import FurnitureThumbnail from './FurnitureThumbnail';

export default function Sidebar() {
  const templates = useStore((s) => s.persisted.templates);
  const dispatch = useStore((s) => s.dispatch);
  const setDragging = useUiStore((s) => s.setDragging);
  const [editing, setEditing] = useState<FurnitureTemplate | 'new' | null>(null);
  // ドラッグ中の解放処理
  const cleanupRef = useRef<(() => void) | null>(null);

  const startDrag = (templateId: string, startEvt: React.PointerEvent) => {
    setDragging(templateId, { sx: startEvt.clientX, sy: startEvt.clientY });

    const onMove = (e: PointerEvent) => {
      setDragging(templateId, { sx: e.clientX, sy: e.clientY });
    };
    const onUp = (e: PointerEvent) => {
      // Canvas 領域に落ちたかを判定: elementFromPoint で .canvas-svg を探す
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const svg = target?.closest('.canvas-svg') as SVGSVGElement | null;
      if (svg) {
        const rect = svg.getBoundingClientRect();
        const vbAttr = svg.getAttribute('viewBox')?.split(/\s+/).map(Number) ?? [0, 0, 1, 1];
        const [vx, vy, vw, vh] = vbAttr;
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const world = { x: vx + px * vw, y: vy + py * vh };
        const snapped = snapPoint(world);
        dispatch(addFurnitureInstanceCommand(templateId, snapped.x, snapped.y, 0));
      }
      setDragging(null, null);
      cleanup();
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      cleanupRef.current = null;
    };
    cleanupRef.current = cleanup;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <strong>家具</strong>
        <button type="button" onClick={() => setEditing('new')}>
          + 新規
        </button>
      </header>
      <ul className="furniture-list">
        {templates.length === 0 && <li className="empty">家具を作成してください</li>}
        {templates.map((t) => (
          <li
            key={t.id}
            className="furniture-item"
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).tagName === 'BUTTON') return;
              startDrag(t.id, e);
            }}
          >
            <FurnitureThumbnail template={t} />
            <span className="furniture-name">{t.name}</span>
            <div className="furniture-actions">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing(t);
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                編集
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`「${t.name}」を削除しますか？\n配置済みの同家具もすべて削除されます。`)) {
                    dispatch(removeTemplateCommand(t.id));
                  }
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                削除
              </button>
            </div>
          </li>
        ))}
      </ul>
      {editing && (
        <FurnitureEditor
          initial={editing === 'new' ? undefined : editing}
          onCancel={() => setEditing(null)}
          onSave={(t) => {
            if (editing === 'new') {
              dispatch(addTemplateCommand(t));
            } else {
              dispatch(updateTemplateCommand(editing.id, t));
            }
            setEditing(null);
          }}
        />
      )}
    </aside>
  );
}
