import type { PersistedState } from '../types';
import { STORAGE_KEY, STORAGE_SCHEMA_VERSION } from '../types';

// LocalStorage 永続化レイヤ。
// - SSR/Node では window が無いため安全に動くようガード
// - 破損データや旧バージョンは安全に握りつぶし、初期値で起動できるようにする

export function loadPersisted(): PersistedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (parsed?.schemaVersion !== STORAGE_SCHEMA_VERSION) {
      // 将来のバージョン: ここで migrate を呼ぶ
      return null;
    }
    return parsed as PersistedState;
  } catch {
    return null;
  }
}

export function savePersisted(state: PersistedState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota 超過等は握りつぶす（UI でユーザに通知するのは Phase 4.2 以降）
  }
}

// デバウンス付き保存ヘルパ
export function createDebouncedSaver(delayMs = 300) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (state: PersistedState) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => savePersisted(state), delayMs);
  };
}
