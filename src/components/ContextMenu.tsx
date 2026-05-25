import { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store';
import { useUiStore } from '../state/uiStore';
import {
  duplicateFurnitureInstanceCommand,
  removeFurnitureInstanceCommand,
  removeWallCommand,
  removeDoorCommand,
  removeWindowCommand,
  removeOutletCommand,
  removeInfoOutletCommand,
  removeLightCommand,
} from '../state/planCommands';

type MenuTarget =
  | { kind: 'furniture'; id: string }
  | { kind: 'wall'; id: string }
  | { kind: 'door'; id: string }
  | { kind: 'window'; id: string }
  | { kind: 'outlet'; id: string }
  | { kind: 'infoOutlet'; id: string }
  | { kind: 'light'; id: string };

type MenuState = {
  x: number;
  y: number;
  target: MenuTarget;
};

let openMenuFn: ((s: MenuState) => void) | null = null;

// 外部からメニューを開くための簡易ヘルパ
export function openContextMenuAt(x: number, y: number, target: MenuTarget) {
  openMenuFn?.({ x, y, target });
}

export default function ContextMenu() {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const dispatch = useStore((s) => s.dispatch);
  const setSelectedId = useUiStore((s) => s.setSelectedId);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    openMenuFn = setMenu;
    return () => {
      openMenuFn = null;
    };
  }, []);

  useEffect(() => {
    if (!menu) return;
    const onClickAway = (e: MouseEvent | PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setMenu(null);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(null);
    };
    window.addEventListener('pointerdown', onClickAway);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('pointerdown', onClickAway);
      window.removeEventListener('keydown', onEsc);
    };
  }, [menu]);

  if (!menu) return null;

  const close = () => setMenu(null);

  const remove = () => {
    const { target } = menu;
    switch (target.kind) {
      case 'furniture':
        dispatch(removeFurnitureInstanceCommand(target.id));
        break;
      case 'wall':
        dispatch(removeWallCommand(target.id));
        break;
      case 'door':
        dispatch(removeDoorCommand(target.id));
        break;
      case 'window':
        dispatch(removeWindowCommand(target.id));
        break;
      case 'outlet':
        dispatch(removeOutletCommand(target.id));
        break;
      case 'infoOutlet':
        dispatch(removeInfoOutletCommand(target.id));
        break;
      case 'light':
        dispatch(removeLightCommand(target.id));
        break;
    }
    setSelectedId(null);
    close();
  };

  const duplicate = () => {
    if (menu.target.kind === 'furniture') {
      dispatch(duplicateFurnitureInstanceCommand(menu.target.id));
    }
    close();
  };

  // 画面端で切れないよう左/上にシフト
  const W = 160;
  const H = menu.target.kind === 'furniture' ? 80 : 44;
  const left = Math.min(menu.x, window.innerWidth - W - 4);
  const top = Math.min(menu.y, window.innerHeight - H - 4);

  return (
    <div
      ref={ref}
      className="context-menu"
      style={{ left, top, width: W }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {menu.target.kind === 'furniture' && (
        <button type="button" onClick={duplicate}>
          複製
        </button>
      )}
      <button type="button" onClick={remove}>
        削除
      </button>
    </div>
  );
}
