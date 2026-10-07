import type { MapPackage, Prop } from '@thevtt/shared';
import { drawProp } from './props';
import { renderTerrain, terrainCellPx, terrainSeed } from './terrainRender';

const load = (src: string) =>
  new Promise<HTMLImageElement | null>((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });

/**
 * A map as one picture: its image, the painted ground, the grid, the scenery
 * and the labels (no walls, no tokens). For the PNG export and the library's
 * thumbnails.
 */
export async function renderPackage(pkg: MapPackage, maxSide: number): Promise<HTMLCanvasElement> {
  const sc = pkg.scene;
  const scale = Math.max(2, Math.min(70, maxSide / Math.max(sc.widthCells, sc.heightCells)));
  const W = Math.round(sc.widthCells * scale);
  const H = Math.round(sc.heightCells * scale);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#1c1c1e';
  c.fillRect(0, 0, W, H);
  const bgUrl = sc.background ? pkg.assets[sc.background] : undefined;
  if (bgUrl) {
    const bg = await load(bgUrl);
    if (bg) {
      const px = sc.bgCellPx;
      if (px) c.drawImage(bg, (sc.bgOffsetX ?? 0) * scale, (sc.bgOffsetY ?? 0) * scale, (bg.naturalWidth / px) * scale, (bg.naturalHeight / px) * scale);
      else c.drawImage(bg, 0, 0, W, H);
    }
  }
  if (sc.terrain) {
    // small pictures don't need the full detail of the ground
    const px = Math.max(8, Math.min(terrainCellPx(sc.widthCells, sc.heightCells), Math.ceil(scale)));
    c.drawImage(renderTerrain(sc.terrain, sc.widthCells, sc.heightCells, terrainSeed(sc.seed ?? 'library'), px, sc.autoWalls !== false && sc.buildingWalls !== false), 0, 0, W, H);
  }
  if (sc.showGrid && scale >= 24) {
    c.strokeStyle = 'rgba(0,0,0,0.18)';
    c.lineWidth = 1;
    c.beginPath();
    for (let x = 0; x <= sc.widthCells; x++) (c.moveTo(x * scale, 0), c.lineTo(x * scale, H));
    for (let y = 0; y <= sc.heightCells; y++) (c.moveTo(0, y * scale), c.lineTo(W, y * scale));
    c.stroke();
  }
  for (const p of pkg.props) {
    if (p.hidden) continue;
    const url = p.image ? pkg.assets[p.image] : undefined;
    const img = url ? await load(url) : null;
    drawProp(c, { ...p, id: 'x', sceneId: 'x' } as Prop, scale, img, 0, false);
  }
  for (const d of pkg.drawings) {
    if (!d.text) continue;
    c.font = `600 ${d.width * scale}px Inter, system-ui, sans-serif`;
    c.fillStyle = d.color;
    c.strokeStyle = 'rgba(0,0,0,0.6)';
    c.lineWidth = Math.max(1, d.width * scale * 0.12);
    c.strokeText(d.text, d.points[0]! * scale, d.points[1]! * scale);
    c.fillText(d.text, d.points[0]! * scale, d.points[1]! * scale);
  }
  return canvas;
}

/** Saves something to the user's disk through the browser's download (a save dialog in the app). */
export function download(href: string, name: string): void {
  const a = document.createElement('a');
  a.href = href;
  a.download = name.replace(/[\\/:*?"<>|]/g, '').trim() || 'mappa';
  a.click();
}
