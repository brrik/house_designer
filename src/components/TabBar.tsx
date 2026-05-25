import { useState } from 'react';
import { useStore } from '../state/store';
import { useUiStore } from '../state/uiStore';
import {
  addPlanCommand,
  duplicatePlanCommand,
  removePlanCommand,
  renamePlanCommand,
  setActivePlanCommand,
} from '../state/planCommands';

export default function TabBar() {
  const plans = useStore((s) => s.persisted.plans);
  const activeId = useStore((s) => s.persisted.activePlanId);
  const dispatch = useStore((s) => s.dispatch);
  const setSelectedId = useUiStore((s) => s.setSelectedId);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [copyFromId, setCopyFromId] = useState<string>('');

  const startRename = (id: string, current: string) => {
    setRenamingId(id);
    setRenameValue(current);
  };
  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      dispatch(renamePlanCommand(renamingId, renameValue.trim()));
    }
    setRenamingId(null);
  };

  const createPlan = () => {
    const name = newName.trim() || `プラン${plans.length + 1}`;
    if (copyFromId) {
      dispatch(duplicatePlanCommand(copyFromId, name));
    } else {
      dispatch(addPlanCommand(name));
    }
    setNewDialogOpen(false);
    setNewName('');
    setCopyFromId('');
  };

  const deletePlan = (id: string) => {
    const plan = plans.find((p) => p.id === id);
    if (!plan) return;
    if (!confirm(`タブ「${plan.name}」を削除しますか？\nこの操作は元に戻せません。`)) return;
    dispatch(removePlanCommand(id));
  };

  return (
    <div className="tabbar">
      {plans.map((p) => (
        <div key={p.id} className={`tab ${p.id === activeId ? 'active' : ''}`}>
          {renamingId === p.id ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') setRenamingId(null);
              }}
            />
          ) : (
            <span
              className="tab-name"
              onClick={() => {
                if (p.id !== activeId) {
                  dispatch(setActivePlanCommand(p.id));
                  setSelectedId(null);
                }
              }}
              onDoubleClick={() => startRename(p.id, p.name)}
              title="ダブルクリックで名前変更"
            >
              {p.name}
            </span>
          )}
          {plans.length > 1 && (
            <button
              type="button"
              className="tab-close"
              onClick={() => deletePlan(p.id)}
              title="削除"
            >
              ×
            </button>
          )}
        </div>
      ))}
      <button type="button" className="tab-add" onClick={() => setNewDialogOpen(true)}>
        + 新規
      </button>
      {newDialogOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal new-plan-modal">
            <header className="modal-header">
              <strong>新規プラン</strong>
              <button type="button" onClick={() => setNewDialogOpen(false)}>
                ×
              </button>
            </header>
            <div className="new-plan-body">
              <label>
                プラン名:
                <input
                  type="text"
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={`プラン${plans.length + 1}`}
                />
              </label>
              <label>
                元の間取り読み込み:
                <select value={copyFromId} onChange={(e) => setCopyFromId(e.target.value)}>
                  <option value="">（新規作成）</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <footer className="modal-footer">
              <button type="button" onClick={() => setNewDialogOpen(false)}>
                キャンセル
              </button>
              <button type="button" className="primary" onClick={createPlan}>
                作成
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
