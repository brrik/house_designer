import type { PersistedState } from '../types';

// コマンドパターン基盤。
// すべての state 変更はコマンドを通して行う。これにより後から Undo/Redo を追加する際に
// 既存コード変更が不要になる（apply / invert を実装するだけで履歴対応できる）。

export type Command = {
  type: string;
  // apply: 現在 state を受け取り、新しい state を返す（イミュータブル）
  apply: (state: PersistedState) => PersistedState;
  // invert: 適用前の state スナップショットを使って逆操作を生成する。
  // Phase 18 (Undo/Redo) で実装するため、現状は optional として残しておく。
  invert?: (before: PersistedState, after: PersistedState) => Command;
};

// 履歴管理用の型（Phase 18 で利用予定）
export type HistoryEntry = {
  command: Command;
  beforeSnapshot: PersistedState;
};
