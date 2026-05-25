import type { Point } from './geometry';

// 壁: 線分（cm）。色変更可。太さは描画時の定数。
export type Wall = {
  id: string;
  a: Point;
  b: Point;
  color: string;
};

// ドア・窓は壁線上の配置。t は始点(a)からの 0..1 の位置。
// 配置中心は a + (b - a) * t で算出。
export type WallMount = {
  id: string;
  wallId: string;
  t: number; // 0..1
  // ドア・窓の向きフラグ（建築記号の左右反転用）
  flipped: boolean;
};

export type Door = WallMount & { kind: 'door'; widthCm: number };
export type Window_ = WallMount & { kind: 'window'; widthCm: number };

// コンセント: 1〜4口、点配置
export type Outlet = {
  id: string;
  x: number;
  y: number;
  plugs: 1 | 2 | 3 | 4;
};

// 情報コンセント・照明: 種別なしの点
export type InfoOutlet = { id: string; x: number; y: number };
export type Light = { id: string; x: number; y: number };

// 家具テンプレート: 一度作って何度でも使う
// shape は cm 単位のローカル座標、原点 (0,0) は形状の重心または左上（実装側で揃える）
export type FurnitureShape =
  | { type: 'polygon'; points: Point[] } // 閉ポリゴン
  | { type: 'circle'; rCm: number };

export type FurnitureTemplate = {
  id: string;
  name: string;
  fillColor: string;
  strokeColor: string;
  shape: FurnitureShape;
};

// 家具インスタンス: テンプレートをキャンバスに配置したもの
export type FurnitureInstance = {
  id: string;
  templateId: string;
  x: number; // cm
  y: number; // cm
  rotationDeg: number; // 0..359 (10度刻み)
};

// プラン（タブ1つ分）
export type Plan = {
  id: string;
  name: string; // タブ名 = エクスポートファイル名
  canvasSize: { wCm: number; hCm: number };
  locked: boolean; // true: 家具配置モード、false: 間取り編集モード
  walls: Wall[];
  doors: Door[];
  windows: Window_[];
  outlets: Outlet[];
  infoOutlets: InfoOutlet[];
  lights: Light[];
  furnitureInstances: FurnitureInstance[];
};
