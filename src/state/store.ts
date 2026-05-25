import { create } from 'zustand';
import type { PersistedState } from '../types';
import { STORAGE_SCHEMA_VERSION } from '../types';
import { createDebouncedSaver, loadPersisted } from '../storage/localStorage';
import type { Command, HistoryEntry } from './commands';

// ルール:
// - state の変更は必ず dispatch(command) を通すこと
// - コンポーネントは直接 set を呼ばない（履歴対応・永続化のため）

type StoreState = {
  persisted: PersistedState;
  // 履歴スタック（Phase 18 で UI 接続）
  past: HistoryEntry[];
  future: HistoryEntry[];
  // 履歴上限（メモリ保護）
  historyLimit: number;

  dispatch: (command: Command) => void;
  // Phase 18 で使う想定の API（土台のみ用意）
  undo: () => void;
  redo: () => void;
  // 外部から永続化された state を読み込む
  hydrate: (persisted: PersistedState) => void;
};

const initialPersisted: PersistedState = loadPersisted() ?? {
  schemaVersion: STORAGE_SCHEMA_VERSION,
  plans: [],
  activePlanId: null,
  templates: [],
};

const debouncedSave = createDebouncedSaver(300);

export const useStore = create<StoreState>((set, get) => ({
  persisted: initialPersisted,
  past: [],
  future: [],
  historyLimit: 200,

  dispatch: (command) => {
    const before = get().persisted;
    const after = command.apply(before);
    if (after === before) return; // no-op
    set((s) => ({
      persisted: after,
      past: [
        ...s.past.slice(-s.historyLimit + 1),
        { command, beforeSnapshot: before },
      ],
      future: [], // 新しい操作で redo 履歴は破棄
    }));
    debouncedSave(after);
  },

  undo: () => {
    const { past, persisted } = get();
    if (past.length === 0) return;
    const last = past[past.length - 1];
    set((s) => ({
      persisted: last.beforeSnapshot,
      past: s.past.slice(0, -1),
      future: [...s.future, { command: last.command, beforeSnapshot: persisted }],
    }));
    debouncedSave(last.beforeSnapshot);
  },

  redo: () => {
    const { future } = get();
    if (future.length === 0) return;
    const next = future[future.length - 1];
    const before = get().persisted;
    const after = next.command.apply(before);
    set((s) => ({
      persisted: after,
      past: [...s.past, { command: next.command, beforeSnapshot: before }],
      future: s.future.slice(0, -1),
    }));
    debouncedSave(after);
  },

  hydrate: (persisted) => {
    set({ persisted, past: [], future: [] });
    debouncedSave(persisted);
  },
}));
