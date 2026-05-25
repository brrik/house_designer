// SVG 文字列を Canvas にラスタライズし、PNG dataURL を得る。
// 高解像度書き出し用に scale 倍率を指定可能。

export async function svgToPngDataUrl(svgString: string, scale = 1): Promise<{
  dataUrl: string;
  widthPx: number;
  heightPx: number;
}> {
  // viewBox から幅・高さを取り出す
  const m = svgString.match(/viewBox="([^"]+)"/);
  if (!m) throw new Error('viewBox not found in SVG');
  const [, vbStr] = m;
  const [, , w, h] = vbStr.split(/\s+/).map(Number);
  const targetW = Math.max(1, Math.round(w * scale));
  const targetH = Math.max(1, Math.round(h * scale));

  // SVG → Image (data URL 経由)
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (err) => reject(err);
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(img, 0, 0, targetW, targetH);
    return {
      dataUrl: canvas.toDataURL('image/png'),
      widthPx: targetW,
      heightPx: targetH,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// 画像 2 枚を横並びにして JPG dataURL として返す
export async function composeSideBySideJpg(
  dataUrls: string[],
  gapPx = 40,
  quality = 0.92,
): Promise<string> {
  const imgs = await Promise.all(
    dataUrls.map(
      (url) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = url;
        }),
    ),
  );
  // 高さを揃える (最大高に合わせて、各画像をその高さに拡大縮小)
  const targetH = Math.max(...imgs.map((i) => i.naturalHeight));
  const widths = imgs.map((i) => (i.naturalWidth * targetH) / i.naturalHeight);
  const totalW = widths.reduce((a, b) => a + b, 0) + gapPx * (imgs.length - 1);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(totalW);
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  let x = 0;
  imgs.forEach((img, i) => {
    ctx.drawImage(img, x, 0, widths[i], targetH);
    x += widths[i] + gapPx;
  });
  return canvas.toDataURL('image/jpeg', quality);
}
