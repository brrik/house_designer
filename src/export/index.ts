import { jsPDF } from 'jspdf';
import type { FurnitureTemplate, Plan } from '../types';
import { renderDetailedSvg, renderPlanSvg } from './renderPlanSvg';
import { composeSideBySideJpg, svgToPngDataUrl } from './svgToImage';

const MAX_PX = 4000; // 上限を超えるスケールでブラウザが死なないように

function scaleFor(svgString: string, targetPx = 2000): number {
  const m = svgString.match(/viewBox="([^"]+)"/);
  if (!m) return 1;
  const [, , w, h] = m[1].split(/\s+/).map(Number);
  const maxDim = Math.max(w, h);
  if (maxDim === 0) return 1;
  return Math.min(MAX_PX / maxDim, targetPx / maxDim);
}

function safeFilename(name: string): string {
  // ファイル名として使えない文字をハイフンに置換
  return name.replace(/[\\/:*?"<>|]/g, '-').trim() || 'plan';
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function exportPlanJpg(plan: Plan, templates: FurnitureTemplate[]): Promise<void> {
  const simpleSvg = renderPlanSvg(plan, templates);
  const detailedSvg = renderDetailedSvg(plan, templates);
  const [simple, detailed] = await Promise.all([
    svgToPngDataUrl(simpleSvg, scaleFor(simpleSvg)),
    svgToPngDataUrl(detailedSvg, scaleFor(detailedSvg)),
  ]);
  const jpg = await composeSideBySideJpg([simple.dataUrl, detailed.dataUrl]);
  downloadDataUrl(jpg, `${safeFilename(plan.name)}.jpg`);
}

export async function exportPlanPdf(plan: Plan, templates: FurnitureTemplate[]): Promise<void> {
  const simpleSvg = renderPlanSvg(plan, templates);
  const detailedSvg = renderDetailedSvg(plan, templates);
  const [simple, detailed] = await Promise.all([
    svgToPngDataUrl(simpleSvg, scaleFor(simpleSvg)),
    svgToPngDataUrl(detailedSvg, scaleFor(detailedSvg)),
  ]);
  // A4 横向き: 297 × 210 mm
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;

  const fit = (imgW: number, imgH: number) => {
    const maxW = pageW - margin * 2;
    const maxH = pageH - margin * 2;
    const ratio = Math.min(maxW / imgW, maxH / imgH);
    const w = imgW * ratio;
    const h = imgH * ratio;
    return { x: (pageW - w) / 2, y: (pageH - h) / 2, w, h };
  };

  // Page 1: simple
  const f1 = fit(simple.widthPx, simple.heightPx);
  doc.addImage(simple.dataUrl, 'PNG', f1.x, f1.y, f1.w, f1.h);
  // Page 2: detailed
  doc.addPage('a4', 'landscape');
  const f2 = fit(detailed.widthPx, detailed.heightPx);
  doc.addImage(detailed.dataUrl, 'PNG', f2.x, f2.y, f2.w, f2.h);

  doc.save(`${safeFilename(plan.name)}.pdf`);
}
