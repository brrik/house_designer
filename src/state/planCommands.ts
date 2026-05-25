import type { Command } from './commands';
import type {
  Plan,
  Wall,
  PersistedState,
  Door,
  Window_,
  Outlet,
  InfoOutlet,
  Light,
  FurnitureTemplate,
  FurnitureInstance,
} from '../types';
import { ROTATION_STEP_DEG } from '../types';
import { STORAGE_SCHEMA_VERSION } from '../types';

// ---- ヘルパ ----
function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getActivePlan(state: PersistedState): Plan | null {
  if (!state.activePlanId) return null;
  return state.plans.find((p) => p.id === state.activePlanId) ?? null;
}

function updateActivePlan(
  state: PersistedState,
  updater: (plan: Plan) => Plan,
): PersistedState {
  if (!state.activePlanId) return state;
  return {
    ...state,
    plans: state.plans.map((p) => (p.id === state.activePlanId ? updater(p) : p)),
  };
}

// ---- プラン作成 ----
export function createNewPlan(name = 'プラン1'): Plan {
  return {
    id: genId('plan'),
    name,
    canvasSize: { wCm: 10_000, hCm: 10_000 },
    locked: false,
    walls: [],
    doors: [],
    windows: [],
    outlets: [],
    infoOutlets: [],
    lights: [],
    furnitureInstances: [],
  };
}

export const addPlanCommand = (name?: string): Command => ({
  type: 'plan/add',
  apply: (state) => {
    const plan = createNewPlan(name ?? `プラン${state.plans.length + 1}`);
    return {
      ...state,
      schemaVersion: STORAGE_SCHEMA_VERSION,
      plans: [...state.plans, plan],
      activePlanId: plan.id,
    };
  },
});

export const setActivePlanCommand = (planId: string): Command => ({
  type: 'plan/setActive',
  apply: (state) => ({ ...state, activePlanId: planId }),
});

// 既存プランを複製して新規作成
export const duplicatePlanCommand = (sourcePlanId: string, newName: string): Command => ({
  type: 'plan/duplicate',
  apply: (state) => {
    const src = state.plans.find((p) => p.id === sourcePlanId);
    if (!src) return state;
    const newPlan: Plan = {
      ...src,
      id: genId('plan'),
      name: newName,
      // インスタンス・壁・要素にも新 ID を付与（参照整合性を保つ）
      walls: src.walls.map((w) => ({ ...w, id: genId('wall') })),
      doors: src.doors.map((d) => ({ ...d, id: genId('door') })),
      windows: src.windows.map((w) => ({ ...w, id: genId('window') })),
      outlets: src.outlets.map((o) => ({ ...o, id: genId('outlet') })),
      infoOutlets: src.infoOutlets.map((o) => ({ ...o, id: genId('info') })),
      lights: src.lights.map((l) => ({ ...l, id: genId('light') })),
      furnitureInstances: src.furnitureInstances.map((f) => ({ ...f, id: genId('fi') })),
    };
    // ドア・窓は線分なので wallId マッピング不要（壁とは独立）
    return { ...state, plans: [...state.plans, newPlan], activePlanId: newPlan.id };
  },
});

export const renamePlanCommand = (planId: string, name: string): Command => ({
  type: 'plan/rename',
  apply: (state) => ({
    ...state,
    plans: state.plans.map((p) => (p.id === planId ? { ...p, name } : p)),
  }),
});

export const removePlanCommand = (planId: string): Command => ({
  type: 'plan/remove',
  apply: (state) => {
    const remaining = state.plans.filter((p) => p.id !== planId);
    let nextActive = state.activePlanId;
    if (state.activePlanId === planId) {
      nextActive = remaining[0]?.id ?? null;
    }
    return { ...state, plans: remaining, activePlanId: nextActive };
  },
});

// ---- 壁 ----
export const addWallCommand = (
  a: { x: number; y: number },
  b: { x: number; y: number },
  color: string,
): Command => ({
  type: 'wall/add',
  apply: (state) => {
    if (!getActivePlan(state)) return state;
    const wall: Wall = { id: genId('wall'), a, b, color };
    return updateActivePlan(state, (p) => ({ ...p, walls: [...p.walls, wall] }));
  },
});

export const removeWallCommand = (wallId: string): Command => ({
  type: 'wall/remove',
  apply: (state) =>
    updateActivePlan(state, (p) => ({
      ...p,
      walls: p.walls.filter((w) => w.id !== wallId),
    })),
});

export const setWallColorCommand = (wallId: string, color: string): Command => ({
  type: 'wall/setColor',
  apply: (state) =>
    updateActivePlan(state, (p) => ({
      ...p,
      walls: p.walls.map((w) => (w.id === wallId ? { ...w, color } : w)),
    })),
});

// ---- ドア / 窓 ----
type PointLike = { x: number; y: number };

export const addDoorCommand = (a: PointLike, b: PointLike): Command => ({
  type: 'door/add',
  apply: (state) =>
    updateActivePlan(state, (p) => {
      const door: Door = {
        id: genId('door'),
        a,
        b,
        flipped: false,
        kind: 'door',
      };
      return { ...p, doors: [...p.doors, door] };
    }),
});

export const addWindowCommand = (a: PointLike, b: PointLike): Command => ({
  type: 'window/add',
  apply: (state) =>
    updateActivePlan(state, (p) => {
      const win: Window_ = {
        id: genId('window'),
        a,
        b,
        flipped: false,
        kind: 'window',
      };
      return { ...p, windows: [...p.windows, win] };
    }),
});

export const removeDoorCommand = (id: string): Command => ({
  type: 'door/remove',
  apply: (state) =>
    updateActivePlan(state, (p) => ({ ...p, doors: p.doors.filter((d) => d.id !== id) })),
});

export const removeWindowCommand = (id: string): Command => ({
  type: 'window/remove',
  apply: (state) =>
    updateActivePlan(state, (p) => ({
      ...p,
      windows: p.windows.filter((w) => w.id !== id),
    })),
});

export const toggleDoorFlipCommand = (id: string): Command => ({
  type: 'door/flip',
  apply: (state) =>
    updateActivePlan(state, (p) => ({
      ...p,
      doors: p.doors.map((d) => (d.id === id ? { ...d, flipped: !d.flipped } : d)),
    })),
});

export const toggleWindowFlipCommand = (id: string): Command => ({
  type: 'window/flip',
  apply: (state) =>
    updateActivePlan(state, (p) => ({
      ...p,
      windows: p.windows.map((w) =>
        w.id === id ? { ...w, flipped: !w.flipped } : w,
      ),
    })),
});

// ---- コンセント ----
export const addOutletCommand = (x: number, y: number, plugs: 1 | 2 | 3 | 4 = 2): Command => ({
  type: 'outlet/add',
  apply: (state) =>
    updateActivePlan(state, (p) => {
      const o: Outlet = { id: genId('outlet'), x, y, plugs };
      return { ...p, outlets: [...p.outlets, o] };
    }),
});

export const removeOutletCommand = (id: string): Command => ({
  type: 'outlet/remove',
  apply: (state) =>
    updateActivePlan(state, (p) => ({ ...p, outlets: p.outlets.filter((o) => o.id !== id) })),
});

export const setOutletPlugsCommand = (id: string, plugs: 1 | 2 | 3 | 4): Command => ({
  type: 'outlet/setPlugs',
  apply: (state) =>
    updateActivePlan(state, (p) => ({
      ...p,
      outlets: p.outlets.map((o) => (o.id === id ? { ...o, plugs } : o)),
    })),
});

// ---- 情報コンセント ----
export const addInfoOutletCommand = (x: number, y: number): Command => ({
  type: 'infoOutlet/add',
  apply: (state) =>
    updateActivePlan(state, (p) => {
      const o: InfoOutlet = { id: genId('info'), x, y };
      return { ...p, infoOutlets: [...p.infoOutlets, o] };
    }),
});

export const removeInfoOutletCommand = (id: string): Command => ({
  type: 'infoOutlet/remove',
  apply: (state) =>
    updateActivePlan(state, (p) => ({
      ...p,
      infoOutlets: p.infoOutlets.filter((o) => o.id !== id),
    })),
});

// ---- 照明 ----
export const addLightCommand = (x: number, y: number): Command => ({
  type: 'light/add',
  apply: (state) =>
    updateActivePlan(state, (p) => {
      const l: Light = { id: genId('light'), x, y };
      return { ...p, lights: [...p.lights, l] };
    }),
});

export const removeLightCommand = (id: string): Command => ({
  type: 'light/remove',
  apply: (state) =>
    updateActivePlan(state, (p) => ({ ...p, lights: p.lights.filter((l) => l.id !== id) })),
});

// ---- 間取り確定 / トリミング ----
// 全要素を含む外接矩形を計算し、キャンバスサイズと全要素の座標をシフトして
// (0,0) 起点・最大外周ぴったりのキャンバスにする。
export const lockPlanCommand = (paddingCm = 50): Command => ({
  type: 'plan/lock',
  apply: (state) =>
    updateActivePlan(state, (p) => {
      const xs: number[] = [];
      const ys: number[] = [];
      for (const w of p.walls) {
        xs.push(w.a.x, w.b.x);
        ys.push(w.a.y, w.b.y);
      }
      for (const d of p.doors) {
        xs.push(d.a.x, d.b.x);
        ys.push(d.a.y, d.b.y);
      }
      for (const w of p.windows) {
        xs.push(w.a.x, w.b.x);
        ys.push(w.a.y, w.b.y);
      }
      for (const o of p.outlets) {
        xs.push(o.x);
        ys.push(o.y);
      }
      for (const o of p.infoOutlets) {
        xs.push(o.x);
        ys.push(o.y);
      }
      for (const l of p.lights) {
        xs.push(l.x);
        ys.push(l.y);
      }
      if (xs.length === 0 || ys.length === 0) {
        // 何も無い場合はトリミングしない、ただし lock のみ反映
        return { ...p, locked: true };
      }
      const minX = Math.min(...xs) - paddingCm;
      const minY = Math.min(...ys) - paddingCm;
      const maxX = Math.max(...xs) + paddingCm;
      const maxY = Math.max(...ys) + paddingCm;
      const dx = -minX;
      const dy = -minY;
      const shift = <T extends { x: number; y: number }>(o: T): T => ({
        ...o,
        x: o.x + dx,
        y: o.y + dy,
      });
      const shiftSegment = <T extends { a: PointLike; b: PointLike }>(seg: T): T => ({
        ...seg,
        a: { x: seg.a.x + dx, y: seg.a.y + dy },
        b: { x: seg.b.x + dx, y: seg.b.y + dy },
      });
      return {
        ...p,
        locked: true,
        canvasSize: { wCm: maxX - minX, hCm: maxY - minY },
        walls: p.walls.map(shiftSegment),
        doors: p.doors.map(shiftSegment),
        windows: p.windows.map(shiftSegment),
        outlets: p.outlets.map(shift),
        infoOutlets: p.infoOutlets.map(shift),
        lights: p.lights.map(shift),
        // 家具インスタンスも一緒にシフト
        furnitureInstances: p.furnitureInstances.map((fi) => ({
          ...fi,
          x: fi.x + dx,
          y: fi.y + dy,
        })),
      };
    }),
});

export const unlockPlanCommand = (): Command => ({
  type: 'plan/unlock',
  apply: (state) => updateActivePlan(state, (p) => ({ ...p, locked: false })),
});

export const setCanvasSizeCommand = (wCm: number, hCm: number): Command => ({
  type: 'plan/setCanvasSize',
  apply: (state) =>
    updateActivePlan(state, (p) => ({
      ...p,
      canvasSize: { wCm: Math.max(100, wCm), hCm: Math.max(100, hCm) },
    })),
});

// ---- 家具テンプレート ----
export const addTemplateCommand = (
  template: Omit<FurnitureTemplate, 'id'>,
): Command => ({
  type: 'template/add',
  apply: (state) => ({
    ...state,
    templates: [...state.templates, { ...template, id: genId('tpl') }],
  }),
});

export const updateTemplateCommand = (
  id: string,
  patch: Partial<Omit<FurnitureTemplate, 'id'>>,
): Command => ({
  type: 'template/update',
  apply: (state) => ({
    ...state,
    templates: state.templates.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  }),
});

export const removeTemplateCommand = (id: string): Command => ({
  type: 'template/remove',
  apply: (state) => ({
    ...state,
    templates: state.templates.filter((t) => t.id !== id),
    // テンプレートが消えたら関連インスタンスも消す
    plans: state.plans.map((p) => ({
      ...p,
      furnitureInstances: p.furnitureInstances.filter((fi) => fi.templateId !== id),
    })),
  }),
});

// ---- 家具インスタンス ----
export const addFurnitureInstanceCommand = (
  templateId: string,
  x: number,
  y: number,
  rotationDeg = 0,
): Command => ({
  type: 'furniture/add',
  apply: (state) =>
    updateActivePlan(state, (p) => {
      const fi: FurnitureInstance = {
        id: genId('fi'),
        templateId,
        x,
        y,
        rotationDeg,
      };
      return { ...p, furnitureInstances: [...p.furnitureInstances, fi] };
    }),
});

export const moveFurnitureInstanceCommand = (id: string, x: number, y: number): Command => ({
  type: 'furniture/move',
  apply: (state) =>
    updateActivePlan(state, (p) => ({
      ...p,
      furnitureInstances: p.furnitureInstances.map((fi) =>
        fi.id === id ? { ...fi, x, y } : fi,
      ),
    })),
});

export const rotateFurnitureInstanceCommand = (id: string, rotationDeg: number): Command => ({
  type: 'furniture/rotate',
  apply: (state) => {
    // 10度刻みにスナップ
    const snapped = Math.round(rotationDeg / ROTATION_STEP_DEG) * ROTATION_STEP_DEG;
    const normalized = ((snapped % 360) + 360) % 360;
    return updateActivePlan(state, (p) => ({
      ...p,
      furnitureInstances: p.furnitureInstances.map((fi) =>
        fi.id === id ? { ...fi, rotationDeg: normalized } : fi,
      ),
    }));
  },
});

export const removeFurnitureInstanceCommand = (id: string): Command => ({
  type: 'furniture/remove',
  apply: (state) =>
    updateActivePlan(state, (p) => ({
      ...p,
      furnitureInstances: p.furnitureInstances.filter((fi) => fi.id !== id),
    })),
});

export const duplicateFurnitureInstanceCommand = (id: string): Command => ({
  type: 'furniture/duplicate',
  apply: (state) =>
    updateActivePlan(state, (p) => {
      const src = p.furnitureInstances.find((fi) => fi.id === id);
      if (!src) return p;
      const copy: FurnitureInstance = {
        ...src,
        id: genId('fi'),
        x: src.x + 20, // 少しずらして配置
        y: src.y + 20,
      };
      return { ...p, furnitureInstances: [...p.furnitureInstances, copy] };
    }),
});

// ---- セレクタ（便利関数）----
export { getActivePlan };
