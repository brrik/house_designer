import { create } from 'zustand';
import type { Point } from '../types';

// 非永続な UI 状態。ツール選択・描画中の一時データ・選択ID 等。
// LocalStorage には保存しない。

export type ToolId =
  | 'select'
  | 'wall'
  | 'door'
  | 'window'
  | 'outlet'
  | 'infoOutlet'
  | 'light';

type UiState = {
  tool: ToolId;
  setTool: (t: ToolId) => void;

  // 壁・ドア・窓ツールの作図中の始点
  segmentStartPoint: Point | null;
  setSegmentStartPoint: (p: Point | null) => void;

  // ポインタ追従用 (描画プレビュー)
  hoverPoint: Point | null;
  setHoverPoint: (p: Point | null) => void;

  // 新規追加要素の色
  currentColor: string;
  setCurrentColor: (c: string) => void;

  // 選択中の要素 ID (Phase 6.7 以降で使用)
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;

  // テンプレートを Sidebar からドラッグ中 (Phase 13)
  draggingTemplateId: string | null;
  draggingPos: { sx: number; sy: number } | null;
  setDragging: (id: string | null, pos: { sx: number; sy: number } | null) => void;
};

export const useUiStore = create<UiState>((set) => ({
  tool: 'select',
  setTool: (t) => set({ tool: t, segmentStartPoint: null }),

  segmentStartPoint: null,
  setSegmentStartPoint: (p) => set({ segmentStartPoint: p }),

  hoverPoint: null,
  setHoverPoint: (p) => set({ hoverPoint: p }),

  currentColor: '#222222',
  setCurrentColor: (c) => set({ currentColor: c }),

  selectedId: null,
  setSelectedId: (id) => set({ selectedId: id }),

  draggingTemplateId: null,
  draggingPos: null,
  setDragging: (id, pos) => set({ draggingTemplateId: id, draggingPos: pos }),
}));
