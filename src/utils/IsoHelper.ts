/* IsoHelper.ts — Pure Math Isometric utilities (No Phaser) */

// ── Responsive tile sizing ────────────────────────────────────────────────
const BASE_VMIN = 375;

function getVmin(): number {
  return Math.min(window.innerWidth, window.innerHeight);
}

export function getTileScale(): number {
  return Math.min(getVmin() / BASE_VMIN, 2.0); // cap at 2× for tablets
}

// Raw (design-space) constants
const RAW_TILE_W = 52;
const RAW_TILE_H = 26;
const RAW_BLOCK_H = 42;

export function getTileW(): number { return RAW_TILE_W * getTileScale(); }
export function getTileH(): number { return RAW_TILE_H * getTileScale(); }
export function getBlockH(): number { return RAW_BLOCK_H * getTileScale(); }

export const TILE_W = RAW_TILE_W;   // design-space constant
export const TILE_H = RAW_TILE_H;   // design-space constant
export const BLOCK_H = RAW_BLOCK_H; // design-space constant

export interface Vec3 { x: number; y: number; z: number; }

export function gridToScreen(gx: number, gy: number, gz: number, rot = 0): { x: number; y: number } {
  let ix = gx, iz = gz;
  switch (((rot % 4) + 4) % 4) {
    case 1: [ix, iz] = [iz, -gx];   break;
    case 2: [ix, iz] = [-gx, -gz];  break;
    case 3: [ix, iz] = [-gz, gx];   break;
  }
  const tw = getTileW(), th = getTileH(), bh = getBlockH();
  return {
    x: (ix - iz) * tw,
    y: (ix + iz) * th - gy * bh
  };
}

export function getDrawDepth(gx: number, gy: number, gz: number, rot = 0): number {
  switch (((rot % 4) + 4) % 4) {
    case 0: return (gx + gz) + gy * 0.01;
    case 1: return (gz - gx) + gy * 0.01;
    case 2: return -(gx + gz) + gy * 0.01;
    case 3: return (gx - gz) + gy * 0.01;
    default: return gx + gz;
  }
}

export function isPointInBlock(px: number, py: number, cx: number, cy: number): boolean {
  const tw = getTileW(), th = getTileH(), bh = getBlockH();
  const poly = [
    cx - tw, cy,
    cx,      cy - th,
    cx + tw, cy,
    cx + tw, cy + bh,
    cx,      cy + th + bh,
    cx - tw, cy + bh
  ];
  return pointInPoly(px, py, poly);
}

function pointInPoly(px: number, py: number, poly: number[]): boolean {
  let inside = false;
  const n = poly.length >> 1;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i * 2], yi = poly[i * 2 + 1];
    const xj = poly[j * 2], yj = poly[j * 2 + 1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function blendColor(c1: number, c2: number, t: number): number {
  const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return (r << 16) | (g << 8) | b;
}

export function hslToInt(h: number, s: number, l: number): number {
  h /= 360; s /= 100; l /= 100;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hue2rgb(p, q, h + 1 / 3);
  const gv = hue2rgb(p, q, h);
  const b = hue2rgb(p, q, h - 1 / 3);
  return (Math.round(r * 255) << 16) | (Math.round(gv * 255) << 8) | Math.round(b * 255);
}

function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

export function getBlockPalette(worldIndex: number, posHash: number) {
  const WORLD_HUES: Record<number, number[]> = {
    1: [345, 10, 25, 35],    
    2: [100, 120, 135, 80],   
    3: [215, 225, 235, 205],  
    4: [170, 185, 195, 155],  
    5: [195, 205, 215, 185],  
    6: [15, 25, 35, 5]        
  };

  const hues = WORLD_HUES[worldIndex] ?? WORLD_HUES[1];
  const h = hues[((posHash % hues.length) + hues.length) % hues.length];

  let s = 50, lTop = 68, lLeft = 48, lRight = 32, lGlow = 78;

  switch (worldIndex) {
    case 1: s = 55; lTop = 72; lLeft = 52; lRight = 36; lGlow = 82; break;
    case 2: s = 45; lTop = 56; lLeft = 40; lRight = 26; lGlow = 72; break;
    case 3: s = 30; lTop = 60; lLeft = 44; lRight = 30; lGlow = 74; break;
    case 4: s = 48; lTop = 62; lLeft = 46; lRight = 32; lGlow = 76; break;
    case 5: s = 25; lTop = 78; lLeft = 60; lRight = 44; lGlow = 88; break;
    case 6: s = 40; lTop = 50; lLeft = 34; lRight = 20; lGlow = 62; break;
  }

  return {
    top:   hslToInt(h, s, lTop),
    left:  hslToInt(h, s, lLeft),
    right: hslToInt(h, s, lRight),
    glow:  hslToInt(h, s, lGlow)
  };
}

// Legacy shims
export function drawIsoCube(...args: any[]) {}
export function drawHat(...args: any[]) {}
export function drawCartoonCosmicBg(...args: any[]) {}
export function createCosmicEffects(...args: any[]) {}
export function createCartoonButton(...args: any[]) {}