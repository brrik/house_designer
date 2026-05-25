import type { FurnitureTemplate, Plan, Wall } from '../types';

// プランをスタンドアロン SVG 文字列に変換する。React 依存なし。
// 寸法は cm 単位。viewBox はキャンバスサイズに合わせる。

const xmlEscape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function wallAngle(w: Wall): number {
  return Math.atan2(w.b.y - w.a.y, w.b.x - w.a.x);
}

type RenderOptions = {
  showDimensions?: boolean; // 寸法線を入れるか (詳細図用)
};

export function renderPlanSvg(
  plan: Plan,
  templates: FurnitureTemplate[],
  opts: RenderOptions = {},
): string {
  const { wCm, hCm } = plan.canvasSize;
  const strokeW = wCm / 100;
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${wCm} ${hCm}" width="${wCm}" height="${hCm}" style="background:#fff">`,
  );
  // 外枠
  parts.push(
    `<rect x="0" y="0" width="${wCm}" height="${hCm}" fill="#ffffff" stroke="#999" stroke-width="${strokeW * 0.3}"/>`,
  );

  // 壁
  for (const w of plan.walls) {
    parts.push(
      `<line x1="${w.a.x}" y1="${w.a.y}" x2="${w.b.x}" y2="${w.b.y}" stroke="${xmlEscape(w.color)}" stroke-width="${strokeW}" stroke-linecap="round"/>`,
    );
  }

  // ドア / 窓 (Canvas で描いたのと同じ計算)
  for (const d of plan.doors) {
    const wall = plan.walls.find((w) => w.id === d.wallId);
    if (!wall) continue;
    const ang = wallAngle(wall);
    const cosA = Math.cos(ang);
    const sinA = Math.sin(ang);
    const cx = wall.a.x + (wall.b.x - wall.a.x) * d.t;
    const cy = wall.a.y + (wall.b.y - wall.a.y) * d.t;
    const half = d.widthCm / 2;
    const hingeX = cx - cosA * half;
    const hingeY = cy - sinA * half;
    const tipX = cx + cosA * half;
    const tipY = cy + sinA * half;
    const nDir = d.flipped ? -1 : 1;
    const nx = -sinA * nDir;
    const ny = cosA * nDir;
    const doorEndX = hingeX + nx * d.widthCm;
    const doorEndY = hingeY + ny * d.widthCm;
    const sweep = nDir > 0 ? 0 : 1;
    parts.push(
      `<line x1="${hingeX}" y1="${hingeY}" x2="${tipX}" y2="${tipY}" stroke="#ffffff" stroke-width="${strokeW * 1.1}"/>`,
      `<line x1="${hingeX}" y1="${hingeY}" x2="${doorEndX}" y2="${doorEndY}" stroke="#444" stroke-width="${strokeW * 0.5}"/>`,
      `<path d="M ${tipX} ${tipY} A ${d.widthCm} ${d.widthCm} 0 0 ${sweep} ${doorEndX} ${doorEndY}" stroke="#444" stroke-width="${strokeW * 0.4}" fill="none"/>`,
    );
  }
  for (const win of plan.windows) {
    const wall = plan.walls.find((w) => w.id === win.wallId);
    if (!wall) continue;
    const ang = wallAngle(wall);
    const cosA = Math.cos(ang);
    const sinA = Math.sin(ang);
    const cx = wall.a.x + (wall.b.x - wall.a.x) * win.t;
    const cy = wall.a.y + (wall.b.y - wall.a.y) * win.t;
    const half = win.widthCm / 2;
    const ax = cx - cosA * half;
    const ay = cy - sinA * half;
    const bx = cx + cosA * half;
    const by = cy + sinA * half;
    const off = strokeW * 0.3;
    const nx = -sinA;
    const ny = cosA;
    parts.push(
      `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="#ffffff" stroke-width="${strokeW * 1.1}"/>`,
      `<line x1="${ax + nx * off}" y1="${ay + ny * off}" x2="${bx + nx * off}" y2="${by + ny * off}" stroke="#0070a0" stroke-width="${strokeW * 0.25}"/>`,
      `<line x1="${ax - nx * off}" y1="${ay - ny * off}" x2="${bx - nx * off}" y2="${by - ny * off}" stroke="#0070a0" stroke-width="${strokeW * 0.25}"/>`,
    );
  }

  // 点マーカー
  const iconR = 8;
  for (const o of plan.outlets) {
    parts.push(
      `<g transform="translate(${o.x} ${o.y})">`,
      `<circle r="${iconR}" fill="#fff" stroke="#333" stroke-width="${iconR * 0.12}"/>`,
    );
    const spacing = iconR * 0.5;
    for (let i = 0; i < o.plugs; i++) {
      const dx = (i - (o.plugs - 1) / 2) * spacing;
      parts.push(`<circle cx="${dx}" cy="0" r="${iconR * 0.25}" fill="#333"/>`);
    }
    parts.push(`</g>`);
  }
  for (const o of plan.infoOutlets) {
    parts.push(
      `<g transform="translate(${o.x} ${o.y})">`,
      `<rect x="${-iconR}" y="${-iconR}" width="${iconR * 2}" height="${iconR * 2}" fill="#fff" stroke="#0a6" stroke-width="${iconR * 0.12}"/>`,
      `<text x="0" y="0" text-anchor="middle" dominant-baseline="central" font-size="${iconR * 1.1}" font-weight="700" fill="#0a6">i</text>`,
      `</g>`,
    );
  }
  for (const l of plan.lights) {
    const r1 = iconR;
    const r2 = iconR * 0.45;
    const points: string[] = [];
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const r = i % 2 === 0 ? r1 : r2;
      points.push(`${Math.cos(a) * r},${Math.sin(a) * r}`);
    }
    parts.push(
      `<g transform="translate(${l.x} ${l.y})">`,
      `<polygon points="${points.join(' ')}" fill="#fff8e0" stroke="#c70" stroke-width="${iconR * 0.12}"/>`,
      `</g>`,
    );
  }

  // 家具インスタンス
  for (const fi of plan.furnitureInstances) {
    const t = templates.find((tpl) => tpl.id === fi.templateId);
    if (!t) continue;
    const fillC = xmlEscape(t.fillColor);
    const strokeC = xmlEscape(t.strokeColor);
    const sw = Math.max(1, (t.shape.type === 'circle' ? t.shape.rCm : 100) * 0.02);
    if (t.shape.type === 'circle') {
      parts.push(
        `<g transform="translate(${fi.x} ${fi.y}) rotate(${fi.rotationDeg})">`,
        `<circle r="${t.shape.rCm}" fill="${fillC}" stroke="${strokeC}" stroke-width="${sw}"/>`,
        `</g>`,
      );
    } else {
      const pts = t.shape.points.map((p) => `${p.x},${p.y}`).join(' ');
      parts.push(
        `<g transform="translate(${fi.x} ${fi.y}) rotate(${fi.rotationDeg})">`,
        `<polygon points="${pts}" fill="${fillC}" stroke="${strokeC}" stroke-width="${sw}"/>`,
        `</g>`,
      );
    }
  }

  // 寸法（詳細図のみ）: 壁ごとに長さラベルをミッドポイント付近に
  if (opts.showDimensions) {
    const fontSize = wCm / 80;
    for (const w of plan.walls) {
      const len = Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y);
      if (len < 1) continue;
      const m = Math.floor(len / 100);
      const r = Math.round(len - m * 100);
      const label = m > 0 ? (r > 0 ? `${m}m${r}cm` : `${m}m`) : `${r}cm`;
      const cx = (w.a.x + w.b.x) / 2;
      const cy = (w.a.y + w.b.y) / 2;
      const nx = -(w.b.y - w.a.y) / len;
      const ny = (w.b.x - w.a.x) / len;
      const off = fontSize * 0.8;
      parts.push(
        `<rect x="${cx + nx * off - fontSize * 2.2}" y="${cy + ny * off - fontSize * 0.7}" width="${fontSize * 4.4}" height="${fontSize * 1.4}" fill="rgba(255,255,255,0.9)" rx="${fontSize * 0.2}"/>`,
        `<text x="${cx + nx * off}" y="${cy + ny * off}" font-size="${fontSize}" text-anchor="middle" dominant-baseline="middle" fill="#222">${label}</text>`,
      );
    }
  }

  parts.push(`</svg>`);
  return parts.join('');
}

// 詳細図: プラン + 凡例 + 家具リスト を 1 つの SVG にまとめる
export function renderDetailedSvg(
  plan: Plan,
  templates: FurnitureTemplate[],
): string {
  const { wCm, hCm } = plan.canvasSize;
  const used = templates.filter((t) =>
    plan.furnitureInstances.some((fi) => fi.templateId === t.id),
  );
  // レイアウト: 左に planSvg、右に家具リスト + 凡例
  const planSvgInner = renderPlanSvg(plan, templates, { showDimensions: true });
  // インライン展開: 上記は完全な <svg>...</svg> なので、外側を剥がす
  const innerMatch = planSvgInner.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  const planInner = innerMatch ? innerMatch[1] : '';

  // サイドパネル幅: キャンバス幅の 0.35 倍
  const panelW = Math.max(wCm * 0.35, 1500);
  const totalW = wCm + panelW;
  const totalH = hCm;
  const fontSize = totalH / 60;
  const lineH = fontSize * 1.8;

  const sideParts: string[] = [];
  sideParts.push(`<g transform="translate(${wCm} 0)">`);
  sideParts.push(
    `<rect x="0" y="0" width="${panelW}" height="${totalH}" fill="#fafafa" stroke="#bbb" stroke-width="${totalW / 1000}"/>`,
  );
  sideParts.push(
    `<text x="${panelW / 2}" y="${lineH}" font-size="${fontSize * 1.4}" font-weight="700" text-anchor="middle" fill="#222">${xmlEscape(plan.name)}</text>`,
  );
  // 凡例
  let y = lineH * 2.5;
  sideParts.push(
    `<text x="${lineH}" y="${y}" font-size="${fontSize * 1.1}" font-weight="700" fill="#222">凡例</text>`,
  );
  y += lineH;
  const legend = [
    { kind: 'outlet', label: 'コンセント（口数=ドット数）' },
    { kind: 'info', label: '情報コンセント' },
    { kind: 'light', label: '照明' },
    { kind: 'door', label: 'ドア' },
    { kind: 'window', label: '窓' },
  ] as const;
  for (const item of legend) {
    sideParts.push(
      `<g transform="translate(${lineH * 1.2} ${y - fontSize * 0.5})">`,
    );
    if (item.kind === 'outlet') {
      sideParts.push(
        `<circle cx="0" cy="0" r="${fontSize * 0.6}" fill="#fff" stroke="#333" stroke-width="${fontSize * 0.07}"/>`,
        `<circle cx="${-fontSize * 0.2}" cy="0" r="${fontSize * 0.15}" fill="#333"/>`,
        `<circle cx="${fontSize * 0.2}" cy="0" r="${fontSize * 0.15}" fill="#333"/>`,
      );
    } else if (item.kind === 'info') {
      sideParts.push(
        `<rect x="${-fontSize * 0.6}" y="${-fontSize * 0.6}" width="${fontSize * 1.2}" height="${fontSize * 1.2}" fill="#fff" stroke="#0a6" stroke-width="${fontSize * 0.07}"/>`,
        `<text x="0" y="0" text-anchor="middle" dominant-baseline="central" font-size="${fontSize * 0.7}" font-weight="700" fill="#0a6">i</text>`,
      );
    } else if (item.kind === 'light') {
      sideParts.push(
        `<polygon points="0,${-fontSize * 0.6} ${fontSize * 0.18},${-fontSize * 0.18} ${fontSize * 0.55},${-fontSize * 0.18} ${fontSize * 0.27},${fontSize * 0.12} ${fontSize * 0.37},${fontSize * 0.55} 0,${fontSize * 0.3} ${-fontSize * 0.37},${fontSize * 0.55} ${-fontSize * 0.27},${fontSize * 0.12} ${-fontSize * 0.55},${-fontSize * 0.18} ${-fontSize * 0.18},${-fontSize * 0.18}" fill="#fff8e0" stroke="#c70" stroke-width="${fontSize * 0.07}"/>`,
      );
    } else if (item.kind === 'door') {
      sideParts.push(
        `<line x1="${-fontSize * 0.6}" y1="0" x2="${fontSize * 0.6}" y2="0" stroke="#444" stroke-width="${fontSize * 0.12}"/>`,
        `<path d="M ${fontSize * 0.6} 0 A ${fontSize * 0.8} ${fontSize * 0.8} 0 0 0 ${-fontSize * 0.2} ${-fontSize * 0.8}" stroke="#444" stroke-width="${fontSize * 0.08}" fill="none"/>`,
      );
    } else {
      sideParts.push(
        `<line x1="${-fontSize * 0.6}" y1="${-fontSize * 0.15}" x2="${fontSize * 0.6}" y2="${-fontSize * 0.15}" stroke="#0070a0" stroke-width="${fontSize * 0.08}"/>`,
        `<line x1="${-fontSize * 0.6}" y1="${fontSize * 0.15}" x2="${fontSize * 0.6}" y2="${fontSize * 0.15}" stroke="#0070a0" stroke-width="${fontSize * 0.08}"/>`,
      );
    }
    sideParts.push(
      `</g>`,
      `<text x="${lineH * 2.5}" y="${y}" font-size="${fontSize}" fill="#222">${xmlEscape(item.label)}</text>`,
    );
    y += lineH;
  }
  // 家具リスト
  y += lineH * 0.5;
  sideParts.push(
    `<text x="${lineH}" y="${y}" font-size="${fontSize * 1.1}" font-weight="700" fill="#222">家具一覧</text>`,
  );
  y += lineH;
  for (const t of used) {
    const count = plan.furnitureInstances.filter((fi) => fi.templateId === t.id).length;
    let sizeLabel = '';
    if (t.shape.type === 'circle') {
      sizeLabel = `Φ${t.shape.rCm * 2}cm`;
    } else {
      const xs = t.shape.points.map((p) => p.x);
      const ys = t.shape.points.map((p) => p.y);
      const w = Math.round(Math.max(...xs) - Math.min(...xs));
      const h = Math.round(Math.max(...ys) - Math.min(...ys));
      sizeLabel = `${w}×${h}cm`;
    }
    // 色見本
    sideParts.push(
      `<rect x="${lineH * 1.2 - fontSize * 0.6}" y="${y - fontSize * 0.6}" width="${fontSize * 1.2}" height="${fontSize * 1.2}" fill="${xmlEscape(t.fillColor)}" stroke="${xmlEscape(t.strokeColor)}" stroke-width="${fontSize * 0.07}"/>`,
      `<text x="${lineH * 2.5}" y="${y}" font-size="${fontSize}" fill="#222">${xmlEscape(t.name)} (${sizeLabel}) × ${count}</text>`,
    );
    y += lineH;
    if (y > totalH - lineH) break;
  }
  if (used.length === 0) {
    sideParts.push(
      `<text x="${lineH}" y="${y}" font-size="${fontSize}" fill="#888">（家具なし）</text>`,
    );
  }
  sideParts.push(`</g>`);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}" style="background:#fff">` +
    planInner +
    sideParts.join('') +
    `</svg>`
  );
}
