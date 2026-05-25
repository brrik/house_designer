import type { FurnitureTemplate, Plan } from './plan';

// LocalStorage に保存するスキーマ。バージョンを上げる際は migrator を実装すること。
export const STORAGE_SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'house-planner:v1';

export type PersistedState = {
  schemaVersion: typeof STORAGE_SCHEMA_VERSION;
  plans: Plan[];
  activePlanId: string | null;
  templates: FurnitureTemplate[];
};
