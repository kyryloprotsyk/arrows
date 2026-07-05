/* IsoHelper.ts — Isometric math & rendering utilities */

export const TILE_W = 52;   // Half tile width in screen pixels
export const TILE_H = 26;   // Half tile height (2:1 ratio)
export const BLOCK_H = 42;  // Cube vertical height in screen pixels

export interface Vec3 { x: number; y: number; z: number; }

/** Convert 3D grid coordinate to 2D isometric screen position.
 *  Supports 4 rotation states (0=front-right, 1=back-right, 2=back-left, 3=front-left).
 */
export function gridToScreen(gx: number, gy: number, gz: number, rot = 0): { x: number; y: number } {
  let ix = gx, iz = gz;
  switch (((rot % 4) + 4) % 4) {
    case 1: [ix, iz] = [iz, -gx];   break;
    case 2: [ix, iz] = [-gx, -gz];  break;
    case 3: [ix, iz] = [-gz, gx];   break;
  }
  return {
    x: (ix - iz) * TILE_W,
    y: (ix + iz) * TILE_H - gy * BLOCK_H
  };
}

/** Depth value for correct isometric draw order (lower = drawn first/behind). */
export function getDrawDepth(gx: number, gy: number, gz: number, rot = 0): number {
  switch (((rot % 4) + 4) % 4) {
    case 0: return (gx + gz) + gy * 0.01;
    case 1: return (gz - gx) + gy * 0.01;
    case 2: return -(gx + gz) + gy * 0.01;
    case 3: return (gx - gz) + gy * 0.01;
    default: return gx + gz;
  }
}

/** Hit test: is screen point (px, py) inside the isometric block hex whose top-center is at (cx, cy)? */
export function isPointInBlock(px: number, py: number, cx: number, cy: number): boolean {
  const tw = TILE_W, th = TILE_H, bh = BLOCK_H;
  // Hexagonal outline of the full cube
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


/** Draw a full isometric cube at (cx, cy) using Phaser Graphics API. */
export function drawIsoCube(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  topCol: number, leftCol: number, rightCol: number,
  glowCol: number,
  glowAlpha = 0.5
) {
  const tw = TILE_W, th = TILE_H, bh = BLOCK_H;

  // Shared vertex coordinates
  const topX = cx,      topY = cy - th;
  const leftX = cx - tw, leftY = cy;
  const rightX = cx + tw, rightY = cy;
  const botX = cx,      botY = cy + th;
  const lbX = cx - tw,  lbY = cy + bh;
  const rbX = cx + tw,  rbY = cy + bh;
  const bbX = cx,       bbY = cy + th + bh;

  // Helper: fill a polygon by coords [x0,y0, x1,y1, ...]
  const fillPoly = (coords: number[]) => {
    g.beginPath();
    g.moveTo(coords[0], coords[1]);
    for (let i = 2; i < coords.length; i += 2) g.lineTo(coords[i], coords[i + 1]);
    g.closePath();
    g.fillPath();
  };

  // 1. RIGHT face (x+ side) — darkest
  g.fillStyle(rightCol, 1);
  fillPoly([rightX, rightY, botX, botY, bbX, bbY, rbX, rbY]);

  // 2. LEFT face (z+ side) — medium
  g.fillStyle(leftCol, 1);
  fillPoly([leftX, leftY, botX, botY, bbX, bbY, lbX, lbY]);

  // 3. TOP face — lightest
  g.fillStyle(topCol, 1);
  fillPoly([topX, topY, rightX, rightY, botX, botY, leftX, leftY]);

  // Glossy glass reflection overlay (diagonal shine)
  g.fillStyle(0xffffff, 0.2);
  fillPoly([topX, topY, (topX + rightX) / 2, (topY + rightY) / 2, (leftX + botX) / 2, (leftY + botY) / 2, leftX, leftY]);

  // White bevel highlight on the front-top edges
  g.lineStyle(1.5, 0xffffff, 0.3);
  g.beginPath();
  g.moveTo(leftX, leftY);
  g.lineTo(botX, botY);
  g.lineTo(rightX, rightY);
  g.strokePath();

  // 4. Glow edge highlights — multiple overlapping lines for bloom effect
  type Seg = [number, number, number, number]; // x1,y1,x2,y2
  const edges: Seg[] = [
    [topX,topY,   rightX,rightY], [topX,topY,   leftX,leftY],
    [leftX,leftY, lbX,lbY],
    [rightX,rightY, rbX,rbY],
    [botX,botY,   bbX,bbY],
    [lbX,lbY,    bbX,bbY], [rbX,rbY, bbX,bbY]
  ];

  // Draw 3 passes for glow bloom effect
  for (let pass = 0; pass < 3; pass++) {
    const alpha = glowAlpha * [0.15, 0.3, 0.55][pass];
    const width  = [5, 3, 1.5][pass];
    g.lineStyle(width, glowCol, alpha);
    for (const [ax, ay, bx, by] of edges) {
      g.beginPath();
      g.moveTo(ax, ay);
      g.lineTo(bx, by);
      g.strokePath();
    }
  }
}

/** HSL → 0xRRGGBB integer (for Phaser fillStyle). */
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

/** Get a color palette for a block based on world + position hash. */
export function getBlockPalette(worldIndex: number, posHash: number) {
  // World hue bands (HSL hue angles)
  const WORLD_HUES: Record<number, number[]> = {
    1: [330, 355, 15, 42],  // Jelly Hills: pinks, corals, warm
    2: [120, 145, 165, 185], // Dino Valley: greens, teals
    3: [210, 235, 255, 275]  // Cosmo Station: blues, purples
  };
  const hues = WORLD_HUES[worldIndex] ?? WORLD_HUES[1];
  const h = hues[((posHash % hues.length) + hues.length) % hues.length];

  return {
    top:   hslToInt(h, 90, 68),
    left:  hslToInt(h, 80, 46),
    right: hslToInt(h, 75, 30),
    glow:  hslToInt(h, 100, 80)
  };
}

/** Draws a 3D isometric hat on top of a block */
export function drawHat(g: Phaser.GameObjects.Graphics, cx: number, cy: number, tw: number, th: number, skin: string, timeNow: number) {
  if (skin === 'none') return;
  const hx = cx, hy = cy - th;

  switch (skin) {
    case 'wizard':
      g.fillStyle(0x4b0082, 1);
      g.fillEllipse(hx, hy, tw * 0.7, th * 0.7);
      g.beginPath();
      g.moveTo(hx - tw * 0.35, hy);
      g.lineTo(hx, hy - 28);
      g.lineTo(hx + tw * 0.35, hy);
      g.closePath();
      g.fillPath();
      g.fillStyle(0xffd700, 1);
      g.fillEllipse(hx, hy - 2, tw * 0.38, th * 0.38);
      g.fillStyle(0xffffff, 0.95);
      g.fillCircle(hx, hy - 28, 3.5);
      break;

    case 'crown':
      g.fillStyle(0xffd700, 1);
      g.fillEllipse(hx, hy, tw * 0.52, th * 0.52);
      g.beginPath();
      g.moveTo(hx - tw * 0.26, hy);
      g.lineTo(hx - tw * 0.26, hy - 13);
      g.lineTo(hx - tw * 0.13, hy - 4);
      g.lineTo(hx, hy - 17);
      g.lineTo(hx + tw * 0.13, hy - 4);
      g.lineTo(hx + tw * 0.26, hy - 13);
      g.lineTo(hx + tw * 0.26, hy);
      g.closePath();
      g.fillPath();
      g.fillStyle(0xff2233, 1);
      g.fillCircle(hx - tw * 0.26, hy - 13, 2.5);
      g.fillCircle(hx, hy - 17, 2.5);
      g.fillCircle(hx + tw * 0.26, hy - 13, 2.5);
      break;

    case 'cat':
      g.fillStyle(0x2b2b2b, 1);
      g.fillTriangle(hx - tw * 0.42, hy - 3, hx - tw * 0.14, hy, hx - tw * 0.36, hy - 14);
      g.fillStyle(0xffaacc, 1);
      g.fillTriangle(hx - tw * 0.37, hy - 3, hx - tw * 0.19, hy - 1, hx - tw * 0.33, hy - 11);
      g.fillStyle(0x2b2b2b, 1);
      g.fillTriangle(hx + tw * 0.42, hy - 3, hx + tw * 0.14, hy, hx + tw * 0.36, hy - 14);
      g.fillStyle(0xffaacc, 1);
      g.fillTriangle(hx + tw * 0.37, hy - 3, hx + tw * 0.19, hy - 1, hx + tw * 0.33, hy - 11);
      break;

    case 'tophat':
      g.fillStyle(0x111111, 1);
      g.fillEllipse(hx, hy, tw * 0.72, th * 0.72);
      g.fillStyle(0x222222, 1);
      g.fillRect(hx - tw * 0.34, hy - 22, tw * 0.68, 22);
      g.fillStyle(0xff1122, 1);
      g.fillRect(hx - tw * 0.34, hy - 6, tw * 0.68, 5);
      g.fillStyle(0x3a3a3a, 1);
      g.fillEllipse(hx, hy - 22, tw * 0.34, th * 0.34);
      break;

    case 'chef':
      g.fillStyle(0xdddddd, 1);
      g.fillRect(hx - tw * 0.28, hy - 8, tw * 0.56, 8);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(hx, hy - 18, 13);
      g.fillCircle(hx - 8, hy - 13, 10);
      g.fillCircle(hx + 8, hy - 13, 10);
      break;

    case 'propeller':
      g.fillStyle(0xff3b30, 1);
      g.fillEllipse(hx, hy, tw * 0.48, th * 0.48);
      g.beginPath();
      g.arc(hx, hy, tw * 0.24, Math.PI, 0, false);
      g.closePath();
      g.fillPath();
      g.lineStyle(2, 0x777777, 1);
      g.beginPath();
      g.moveTo(hx, hy - 7);
      g.lineTo(hx, hy - 21);
      g.strokePath();
      const angle = (timeNow * 0.015) % (Math.PI * 2);
      const bx1 = hx + Math.cos(angle) * 15;
      const by1 = hy - 21 + Math.sin(angle) * 4;
      const bx2 = hx - Math.cos(angle) * 15;
      const by2 = hy - 21 - Math.sin(angle) * 4;
      g.lineStyle(2.5, 0xffcc00, 1);
      g.beginPath();
      g.moveTo(bx1, by1);
      g.lineTo(bx2, by2);
      g.strokePath();
      g.fillStyle(0x333333, 1);
      g.fillCircle(hx, hy - 21, 2.5);
      break;

    case 'rainbow':
      const hVal = (timeNow * 0.1) % 360;
      const col1 = hslToInt(hVal, 100, 75);
      const col2 = hslToInt((hVal + 180) % 360, 100, 75);
      g.lineStyle(3, col1, 0.8);
      g.strokeEllipse(hx, hy - 12, tw * 0.44, th * 0.44);
      g.lineStyle(1.5, col2, 0.6);
      g.strokeEllipse(hx, hy - 16, tw * 0.32, th * 0.32);
      break;
  }
}
