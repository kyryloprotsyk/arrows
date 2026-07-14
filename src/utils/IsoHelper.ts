/* IsoHelper.ts — Isometric math & rendering utilities */
import Phaser from 'phaser';

// ── Responsive tile sizing ────────────────────────────────────────────────
// Base sizes designed for a 375px-wide phone (iPhone SE).
// We scale them proportionally to the screen's shortest dimension (vmin).
const BASE_VMIN = 375;

function getVmin(): number {
  return Math.min(window.innerWidth, window.innerHeight);
}

/** Returns the current isometric tile scale factor (1.0 on a 375px-wide phone). */
export function getTileScale(): number {
  return Math.min(getVmin() / BASE_VMIN, 2.0); // cap at 2× for tablets
}

// Raw (design-space) constants — actual values multiply by getTileScale()
const RAW_TILE_W = 52;
const RAW_TILE_H = 26;
const RAW_BLOCK_H = 42;

/** Half tile width in screen pixels — scales with device. */
export function getTileW(): number { return RAW_TILE_W * getTileScale(); }
/** Half tile height in screen pixels — scales with device. */
export function getTileH(): number { return RAW_TILE_H * getTileScale(); }
/** Cube vertical height in screen pixels — scales with device. */
export function getBlockH(): number { return RAW_BLOCK_H * getTileScale(); }

// Legacy named exports kept for backward-compat (used in hot paths where
// we already call getTileScale() once per frame, so reading the getter is fine).
export const TILE_W = RAW_TILE_W;   // design-space constant — prefer getTileW()
export const TILE_H = RAW_TILE_H;   // design-space constant — prefer getTileH()
export const BLOCK_H = RAW_BLOCK_H; // design-space constant — prefer getBlockH()

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
  const tw = getTileW(), th = getTileH(), bh = getBlockH();
  return {
    x: (ix - iz) * tw,
    y: (ix + iz) * th - gy * bh
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
  const tw = getTileW(), th = getTileH(), bh = getBlockH();
  // Hexagonal outline of the full cube (scaled with device)
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

export type CoordTransformer = (x: number, y: number) => { x: number; y: number };

/** Draw a full isometric cube at (cx, cy) using Phaser Graphics API. */
export function drawIsoCube(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  topCol: number, leftCol: number, rightCol: number,
  glowCol: number,
  glowAlpha = 0.5,
  transformer?: CoordTransformer,
  worldIndex = 1,
  timeNow = 0
) {
  const tw = getTileW(), th = getTileH(), bh = getBlockH();

  // Shared vertex coordinates
  let topX = cx,      topY = cy - th;
  let leftX = cx - tw, leftY = cy;
  let rightX = cx + tw, rightY = cy;
  let botX = cx,      botY = cy + th;
  let lbX = cx - tw,  lbY = cy + bh;
  let rbX = cx + tw,  rbY = cy + bh;
  let bbX = cx,       bbY = cy + th + bh;

  if (transformer) {
    const tTop = transformer(topX, topY);     topX = tTop.x; topY = tTop.y;
    const tLeft = transformer(leftX, leftY);   leftX = tLeft.x; leftY = tLeft.y;
    const tRight = transformer(rightX, rightY); rightX = tRight.x; rightY = tRight.y;
    const tBot = transformer(botX, botY);     botX = tBot.x; botY = tBot.y;
    const tLb = transformer(lbX, lbY);       lbX = tLb.x; lbY = tLb.y;
    const tRb = transformer(rbX, rbY);       rbX = tRb.x; rbY = tRb.y;
    const tBb = transformer(bbX, bbY);       bbX = tBb.x; bbY = tBb.y;
  }

  // Helper: fill a polygon by coords [x0,y0, x1,y1, ...]
  const fillPoly = (coords: number[]) => {
    g.beginPath();
    g.moveTo(coords[0], coords[1]);
    for (let i = 2; i < coords.length; i += 2) g.lineTo(coords[i], coords[i + 1]);
    g.closePath();
    g.fillPath();
  };

  // Helper: 2D linear interpolation
  const lerp2D = (x1: number, y1: number, x2: number, y2: number, t: number) => ({
    x: x1 + (x2 - x1) * t,
    y: y1 + (y2 - y1) * t
  });

  // Determine material opacity and base colors
  let faceAlpha = 1.0;
  let actualTopCol = topCol;
  let actualLeftCol = leftCol;
  let actualRightCol = rightCol;

  if (worldIndex === 4) { // Water
    faceAlpha = 0.55;
  } else if (worldIndex === 5) { // Ice
    faceAlpha = 0.72;
  } else if (worldIndex === 6) { // Magma/Obsidian (dark volcanic stone)
    actualTopCol = 0x242424;
    actualLeftCol = 0x191919;
    actualRightCol = 0x0f0f0f;
  }

  // Cel-shaded / Solid style: No transparent backfaces
  // Instead, we will draw thick black/dark outlines behind the block to act as ambient occlusion
  g.lineStyle(6, 0x000000, 0.4);
  fillPoly([topX, topY, rightX, rightY, rbX, rbY, bbX, bbY, lbX, lbY, leftX, leftY]);
  g.strokePath();

  // Draw front visible faces with linear gradients (lighter at top, darker at bottom)
  const rightLight = blendColor(actualRightCol, 0xffffff, 0.12);
  const rightDark  = blendColor(actualRightCol, 0x000000, 0.12);
  g.fillGradientStyle(rightLight, rightLight, rightDark, rightDark, faceAlpha, faceAlpha, faceAlpha, faceAlpha);
  fillPoly([rightX, rightY, botX, botY, bbX, bbY, rbX, rbY]);

  const leftLight = blendColor(actualLeftCol, 0xffffff, 0.12);
  const leftDark  = blendColor(actualLeftCol, 0x000000, 0.12);
  g.fillGradientStyle(leftLight, leftLight, leftDark, leftDark, faceAlpha, faceAlpha, faceAlpha, faceAlpha);
  fillPoly([leftX, leftY, botX, botY, bbX, bbY, lbX, lbY]);

  const topAlpha = faceAlpha === 1.0 ? 1.0 : Math.min(faceAlpha + 0.1, 1.0);
  const topLight = blendColor(actualTopCol, 0xffffff, 0.15);
  const topDark  = blendColor(actualTopCol, 0x000000, 0.08);
  g.fillGradientStyle(topLight, topLight, topDark, topDark, topAlpha, topAlpha, topAlpha, topAlpha);
  fillPoly([topX, topY, rightX, rightY, botX, botY, leftX, leftY]);

  // ── Procedural Material Overlays ───────────────────────────────────────
  switch (worldIndex) {
    case 1: { // Jelly Core (Concentric soft wobbly overlay)
      const wobbleX = Math.sin(timeNow * 0.005 + cx) * 1.5;
      const wobbleY = Math.cos(timeNow * 0.005 + cy) * 1.0;

      // Top Face Jelly Core
      const tcX = (topX + botX) / 2 + wobbleX;
      const tcY = (topY + botY) / 2 + wobbleY;
      const t0 = lerp2D(tcX, tcY, topX, topY, 0.58);
      const t1 = lerp2D(tcX, tcY, rightX, rightY, 0.58);
      const t2 = lerp2D(tcX, tcY, botX, botY, 0.58);
      const t3 = lerp2D(tcX, tcY, leftX, leftY, 0.58);
      g.fillStyle(0xffffff, 0.18);
      fillPoly([t0.x, t0.y, t1.x, t1.y, t2.x, t2.y, t3.x, t3.y]);

      // Left Face Jelly Core
      const lcX = (leftX + botX + bbX + lbX) / 4 + wobbleX;
      const lcY = (leftY + botY + bbY + lbY) / 4 + wobbleY;
      const l0 = lerp2D(lcX, lcY, leftX, leftY, 0.6);
      const l1 = lerp2D(lcX, lcY, botX, botY, 0.6);
      const l2 = lerp2D(lcX, lcY, bbX, bbY, 0.6);
      const l3 = lerp2D(lcX, lcY, lbX, lbY, 0.6);
      g.fillStyle(0xffffff, 0.12);
      fillPoly([l0.x, l0.y, l1.x, l1.y, l2.x, l2.y, l3.x, l3.y]);

      // Right Face Jelly Core
      const rcX = (rightX + botX + bbX + rbX) / 4 + wobbleX;
      const rcY = (rightY + botY + bbY + rbY) / 4 + wobbleY;
      const r0 = lerp2D(rcX, rcY, rightX, rightY, 0.6);
      const r1 = lerp2D(rcX, rcY, botX, botY, 0.6);
      const r2 = lerp2D(rcX, rcY, bbX, bbY, 0.6);
      const r3 = lerp2D(rcX, rcY, rbX, rbY, 0.6);
      g.fillStyle(0xffffff, 0.12);
      fillPoly([r0.x, r0.y, r1.x, r1.y, r2.x, r2.y, r3.x, r3.y]);
      break;
    }

    case 2: { // Wood Grain & Planks
      g.lineStyle(1.5, 0x000000, 0.22);
      // Top face grain lines
      for (const t of [0.25, 0.5, 0.75]) {
        const p1 = lerp2D(topX, topY, leftX, leftY, t);
        const p2 = lerp2D(rightX, rightY, botX, botY, t);
        g.beginPath(); g.moveTo(p1.x, p1.y); g.lineTo(p2.x, p2.y); g.strokePath();
      }
      // Left face plank lines
      for (const t of [0.33, 0.66]) {
        const p1 = lerp2D(leftX, leftY, botX, botY, t);
        const p2 = lerp2D(lbX, lbY, bbX, bbY, t);
        g.beginPath(); g.moveTo(p1.x, p1.y); g.lineTo(p2.x, p2.y); g.strokePath();
      }
      // Right face plank lines
      for (const t of [0.33, 0.66]) {
        const p1 = lerp2D(botX, botY, rightX, rightY, t);
        const p2 = lerp2D(bbX, bbY, rbX, rbY, t);
        g.beginPath(); g.moveTo(p1.x, p1.y); g.lineTo(p2.x, p2.y); g.strokePath();
      }

      // Draw organic wood knot and concentric contours on top face
      const tc = { x: (topX + botX)/2, y: (topY + botY)/2 };
      g.fillStyle(0x000000, 0.16);
      g.fillEllipse(tc.x + tw * 0.15, tc.y - th * 0.1, 5, 2.5);
      g.lineStyle(1.2, 0x000000, 0.14);
      g.strokeEllipse(tc.x + tw * 0.15, tc.y - th * 0.1, 10, 5);
      break;
    }

    case 3: { // Cyber-Metal Reflection & Circuits
      // Left face metallic chrome strip
      const l1 = lerp2D(leftX, leftY, lbX, lbY, 0.4);
      const l2 = lerp2D(botX, botY, bbX, bbY, 0.4);
      const l3 = lerp2D(botX, botY, bbX, bbY, 0.52);
      const l4 = lerp2D(leftX, leftY, lbX, lbY, 0.52);
      g.fillStyle(0xffffff, 0.16);
      fillPoly([l1.x, l1.y, l2.x, l2.y, l3.x, l3.y, l4.x, l4.y]);

      // Right face metallic chrome strip
      const r1 = lerp2D(botX, botY, bbX, bbY, 0.4);
      const r2 = lerp2D(rightX, rightY, rbX, rbY, 0.4);
      const r3 = lerp2D(rightX, rightY, rbX, rbY, 0.52);
      const r4 = lerp2D(botX, botY, bbX, bbY, 0.52);
      fillPoly([r1.x, r1.y, r2.x, r2.y, r3.x, r3.y, r4.x, r4.y]);

      // Top face diagonal reflection
      const t1 = lerp2D(topX, topY, leftX, leftY, 0.3);
      const t2 = lerp2D(rightX, rightY, botX, botY, 0.55);
      const t3 = lerp2D(rightX, rightY, botX, botY, 0.7);
      const t4 = lerp2D(topX, topY, leftX, leftY, 0.45);
      g.fillStyle(0xffffff, 0.22);
      fillPoly([t1.x, t1.y, t2.x, t2.y, t3.x, t3.y, t4.x, t4.y]);

      // Neon cyber circuit traces on top face
      const tcX = (topX + botX) / 2;
      const tcY = (topY + botY) / 2;
      const end1 = lerp2D(leftX, leftY, topX, topY, 0.5);
      const end2 = lerp2D(rightX, rightY, botX, botY, 0.5);

      g.lineStyle(1.8, glowCol, 0.95);
      g.beginPath(); g.moveTo(tcX, tcY); g.lineTo(end1.x, end1.y); g.strokePath();
      g.beginPath(); g.moveTo(tcX, tcY); g.lineTo(end2.x, end2.y); g.strokePath();

      g.fillStyle(glowCol, 1.0);
      g.fillCircle(end1.x, end1.y, 2.5);
      g.fillCircle(end2.x, end2.y, 2.5);

      // Steel rivets at 4 corners of Top face, offset slightly inwards
      const tc = { x: (topX + botX)/2, y: (topY + botY)/2 };
      const rivet1 = lerp2D(topX, topY, tc.x, tc.y, 0.15);
      const rivet2 = lerp2D(leftX, leftY, tc.x, tc.y, 0.15);
      const rivet3 = lerp2D(rightX, rightY, tc.x, tc.y, 0.15);
      const rivet4 = lerp2D(botX, botY, tc.x, tc.y, 0.15);
      [rivet1, rivet2, rivet3, rivet4].forEach(pt => {
        g.fillStyle(0x333333, 0.95);
        g.fillCircle(pt.x, pt.y, 2.4);
        g.fillStyle(0xdddddd, 1.0);
        g.fillCircle(pt.x, pt.y, 0.9);
      });
      break;
    }

    case 4: { // Water Waves & Floating Bubbles
      const waveOffset = Math.sin(timeNow * 0.005 + cx * 0.05) * 2.8;

      // Left face water volume
      const wl1 = lerp2D(leftX, leftY, lbX, lbY, 0.45);
      const wl2 = lerp2D(botX, botY, bbX, bbY, 0.45);
      wl1.y += waveOffset;
      wl2.y += waveOffset;
      g.fillStyle(0x00d2ff, 0.22);
      fillPoly([wl1.x, wl1.y, wl2.x, wl2.y, bbX, bbY, lbX, lbY]);
      g.lineStyle(1.5, 0xffffff, 0.35);
      g.beginPath(); g.moveTo(wl1.x, wl1.y); g.lineTo(wl2.x, wl2.y); g.strokePath();

      // Right face water volume
      const wr1 = lerp2D(botX, botY, bbX, bbY, 0.45);
      const wr2 = lerp2D(rightX, rightY, rbX, rbY, 0.45);
      wr1.y += waveOffset;
      wr2.y += waveOffset;
      g.fillStyle(0x00d2ff, 0.22);
      fillPoly([wr1.x, wr1.y, wr2.x, wr2.y, rbX, rbY, bbX, bbY]);
      g.beginPath(); g.moveTo(wr1.x, wr1.y); g.lineTo(wr2.x, wr2.y); g.strokePath();

      // Draw floating bubbles inside the liquid
      const localH = bh + th;
      const b1 = ((timeNow * 0.035) % localH);
      const b2 = (((timeNow * 0.035) + localH / 2) % localH);
      const bY1 = (cy + bh) - b1;
      const bY2 = (cy + bh) - b2;

      g.fillStyle(0xffffff, 0.65);
      g.fillCircle(cx - tw * 0.45, bY1, 1.8);
      g.fillCircle(cx + tw * 0.45, bY2, 2.2);
      break;
    }

    case 5: { // Frosty Ice Cracks & Star Sparkle
      g.lineStyle(1.5, 0xffffff, 0.55);
      const tcX = (topX + botX) / 2;
      const tcY = (topY + botY) / 2;

      // Crack 1
      const c1 = lerp2D(leftX, leftY, lbX, lbY, 0.5);
      g.beginPath(); g.moveTo(tcX, tcY); g.lineTo(c1.x, c1.y); g.lineTo(lbX + 4, lbY - 6); g.strokePath();

      // Crack 2
      const c2 = lerp2D(rightX, rightY, botX, botY, 0.4);
      g.beginPath(); g.moveTo(tcX, tcY); g.lineTo(c2.x, c2.y); g.lineTo(bbX - 6, bbY - 10); g.strokePath();

      // Sparkle star on top vertex
      g.lineStyle(1.5, 0xffffff, 0.95);
      g.beginPath();
      g.moveTo(topX, topY - 11); g.lineTo(topX, topY + 11);
      g.moveTo(topX - 11, topY); g.lineTo(topX + 11, topY);
      g.strokePath();
      g.fillStyle(0xffffff, 1.0);
      g.fillCircle(topX, topY, 2.5);
      break;
    }

    case 6: { // Pulsing Molten Lava Cracks / Obsidian
      const pulse = 0.4 + 0.6 * Math.sin(timeNow * 0.005);
      const veinCol = hslToInt(15, 100, 50 + pulse * 20); // shifts red -> orange -> yellow

      g.lineStyle(1.8 + pulse * 1.4, veinCol, 0.85);

      // Top face jagged lava line
      const midTop = lerp2D(topX, topY, botX, botY, 0.5);
      midTop.x += Math.sin(cx) * 3; midTop.y += Math.cos(cy) * 2;
      g.beginPath(); g.moveTo(topX, topY); g.lineTo(midTop.x, midTop.y); g.lineTo(botX, botY); g.strokePath();

      // Left face jagged lava line
      const midLeft = lerp2D(leftX, leftY, bbX, bbY, 0.55);
      midLeft.x += Math.sin(cy) * 3;
      g.beginPath(); g.moveTo(leftX, leftY); g.lineTo(midLeft.x, midLeft.y); g.lineTo(bbX, bbY); g.strokePath();

      // Right face jagged lava line
      const midRight = lerp2D(rightX, rightY, bbX, bbY, 0.45);
      midRight.x += Math.cos(cx) * 3;
      g.beginPath(); g.moveTo(rightX, rightY); g.lineTo(midRight.x, midRight.y); g.lineTo(bbX, bbY); g.strokePath();

      // Hot core overlay (inner yellow line)
      g.lineStyle(0.8, 0xffea00, 0.5 + pulse * 0.4);
      g.beginPath(); g.moveTo(topX, topY); g.lineTo(midTop.x, midTop.y); g.lineTo(botX, botY); g.strokePath();
      g.beginPath(); g.moveTo(leftX, leftY); g.lineTo(midLeft.x, midLeft.y); g.lineTo(bbX, bbY); g.strokePath();
      g.beginPath(); g.moveTo(rightX, rightY); g.lineTo(midRight.x, midRight.y); g.lineTo(bbX, bbY); g.strokePath();

      // Real-time floating glowing volcanic embers rising upwards
      for (let i = 0; i < 3; i++) {
        const offsetHash = (cx * 13 + cy * 7 + i * 17) % 40;
        const emberTime = (timeNow * 0.025 + offsetHash) % 30; // loop Y offset
        const t = emberTime / 30; // 0 to 1
        
        const startPt = lerp2D(topX, topY, botX, botY, 0.25 + i * 0.25);
        const emberX = startPt.x + Math.sin(timeNow * 0.005 + i) * 3.5;
        const emberY = startPt.y - t * 26; // float up 26px
        
        const alpha = (1 - t) * 0.85;
        const size = 1.4 + (1 - t) * 1.4;
        
        g.fillStyle(0xff5500, alpha);
        g.fillCircle(emberX, emberY, size);
        g.fillStyle(0xffea00, alpha * 0.95);
        g.fillCircle(emberX, emberY, size * 0.5);
      }
      break;
    }
  }

  // Ambient Occlusion Shadows (Darken inner edges)
  g.lineStyle(4, 0x000000, 0.5);
  g.beginPath();
  g.moveTo(botX, botY); g.lineTo(bbX, bbY); // vertical center seam
  g.strokePath();

  g.lineStyle(2, 0x000000, 0.3);
  g.beginPath();
  g.moveTo(leftX, leftY); g.lineTo(botX, botY); g.lineTo(rightX, rightY);
  g.strokePath();

  // Hard-edged Cel-Shading Gloss Highlights (Crisp vectors instead of soft gradients)
  g.fillStyle(0xffffff, worldIndex === 6 ? 0.25 : 0.4); // slightly dimmer highlight on dark obsidian magma
  // Sharp angular highlight on top face
  fillPoly([
    topX, topY + 4,
    (topX + rightX) / 2 - 2, (topY + rightY) / 2,
    (topX + botX) / 2, (topY + botY) / 2 - 2,
    (topX + leftX) / 2 + 2, (topY + leftY) / 2
  ]);

  // Sharp bright bevel on the top-front edge
  g.lineStyle(3, 0xffffff, worldIndex === 6 ? 0.45 : 0.8);
  g.beginPath();
  g.moveTo(leftX + 2, leftY + 1);
  g.lineTo(botX, botY + 1);
  g.lineTo(rightX - 2, rightY + 1);
  g.strokePath();

  // Very thin, semi-transparent white outline inside the top-front edge for glossy specular bevel reflection
  g.lineStyle(1.2, 0xffffff, 0.4);
  g.beginPath();
  g.moveTo(leftX, leftY);
  g.lineTo(botX, botY);
  g.lineTo(rightX, rightY);
  g.strokePath();

  // Inner glowing core (optional, maybe we keep it minimal since it's solid now)
  const scaleX = transformer ? Math.hypot(rightX - leftX, rightY - leftY) / (tw * 2) : 1;
  const scaleY = transformer ? Math.hypot(bbY - topY, bbX - topX) / (th * 2 + bh) : 1;
  const tPt = (x: number, y: number) => transformer ? transformer(x, y) : { x, y };

  // 4. Multi-Layered Concentric Outer Glows & Bloom Edge Highlights
  type Seg = [number, number, number, number]; // x1,y1,x2,y2
  const edges: Seg[] = [
    [topX,topY,   rightX,rightY], [topX,topY,   leftX,leftY],
    [leftX,leftY, lbX,lbY],
    [rightX,rightY, rbX,rbY],
    [botX,botY,   bbX,bbY],
    [lbX,lbY,    bbX,bbY], [rbX,rbY, bbX,bbY]
  ];

  // Draw 4 concentric bloom passes for intense neon cartoon aesthetic using SCREEN blend mode
  g.setBlendMode('SCREEN');
  for (let pass = 0; pass < 4; pass++) {
    const alpha = glowAlpha * [0.3, 0.5, 0.8, 1.0][pass];
    const width  = [12, 8, 4, 1.8][pass];
    const passCol = pass === 3 ? 0xffffff : glowCol; // Inner-most outline is pure white
    g.lineStyle(width, passCol, alpha);
    for (const [ax, ay, bx, by] of edges) {
      g.beginPath();
      g.moveTo(ax, ay);
      g.lineTo(bx, by);
      g.strokePath();
    }
  }
  g.setBlendMode('NORMAL');

  // Soft base aura glow beneath block
  const baseAura = tPt(cx, cy + bh);
  g.fillStyle(glowCol, glowAlpha * 0.18);
  g.fillEllipse(baseAura.x, baseAura.y, tw * 1.8 * scaleX, th * 1.4 * scaleY);
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
  // Premium modern game color palettes (Neon/Synthwave/Hyper-casual)
  const WORLD_HUES: Record<number, number[]> = {
    1: [320, 335, 350, 15],  // Jelly Hills: Rich magentas, deep pinks, neon coral
    2: [140, 160, 175, 190], // Dino Valley: Vivid teals, toxic greens, cyan
    3: [240, 260, 275, 290], // Cosmo Station: Deep indigo, cyberpunk purple, electric violet
    4: [165, 175, 185, 195], // Coral Reef: Aqua, ocean blue, teal
    5: [185, 195, 205, 215], // Ice Castle: Ice blue, frost white
    6: [5, 15, 25, 345]      // Volcanic Land: Lava orange, magma red, ash purple
  };
  const hues = WORLD_HUES[worldIndex] ?? WORLD_HUES[1];
  const h = hues[((posHash % hues.length) + hues.length) % hues.length];

  return {
    top:   hslToInt(h, 100, 78),
    left:  hslToInt(h, 100, 56),
    right: hslToInt(h, 95, 36),
    glow:  hslToInt(h, 100, 88)
  };
}

/** Draws a 3D isometric hat on top of a block */
export function drawHat(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  tw: number, th: number,
  skin: string,
  timeNow: number,
  transformer?: CoordTransformer
) {
  if (skin === 'none') return;
  const hx = cx, hy = cy - th;

  const tPt = (x: number, y: number) => transformer ? transformer(x, y) : { x, y };

  switch (skin) {
    case 'wizard': {
      const c = tPt(hx, hy);
      const tip = tPt(hx, hy - 28);
      g.fillStyle(0x4b0082, 1);
      g.fillEllipse(c.x, c.y, tw * 0.7, th * 0.7);
      g.beginPath();
      const baseL = tPt(hx - tw * 0.35, hy);
      const baseR = tPt(hx + tw * 0.35, hy);
      g.moveTo(baseL.x, baseL.y);
      g.lineTo(tip.x, tip.y);
      g.lineTo(baseR.x, baseR.y);
      g.closePath();
      g.fillPath();
      g.fillStyle(0xffd700, 1);
      g.fillEllipse(c.x, c.y - 2, tw * 0.38, th * 0.38);
      g.fillStyle(0xffffff, 0.95);
      g.fillCircle(tip.x, tip.y, 3.5);
      break;
    }

    case 'crown': {
      const c = tPt(hx, hy);
      g.fillStyle(0xffd700, 1);
      g.fillEllipse(c.x, c.y, tw * 0.52, th * 0.52);

      const p0 = tPt(hx - tw * 0.26, hy);
      const p1 = tPt(hx - tw * 0.26, hy - 13);
      const p2 = tPt(hx - tw * 0.13, hy - 4);
      const p3 = tPt(hx, hy - 17);
      const p4 = tPt(hx + tw * 0.13, hy - 4);
      const p5 = tPt(hx + tw * 0.26, hy - 13);
      const p6 = tPt(hx + tw * 0.26, hy);

      g.beginPath();
      g.moveTo(p0.x, p0.y);
      g.lineTo(p1.x, p1.y);
      g.lineTo(p2.x, p2.y);
      g.lineTo(p3.x, p3.y);
      g.lineTo(p4.x, p4.y);
      g.lineTo(p5.x, p5.y);
      g.lineTo(p6.x, p6.y);
      g.closePath();
      g.fillPath();

      g.fillStyle(0xff2233, 1);
      g.fillCircle(p1.x, p1.y, 2.5);
      g.fillCircle(p3.x, p3.y, 2.5);
      g.fillCircle(p5.x, p5.y, 2.5);
      break;
    }

    case 'cat': {
      const el1 = tPt(hx - tw * 0.42, hy - 3);
      const el2 = tPt(hx - tw * 0.14, hy);
      const el3 = tPt(hx - tw * 0.36, hy - 14);

      const il1 = tPt(hx - tw * 0.37, hy - 3);
      const il2 = tPt(hx - tw * 0.19, hy - 1);
      const il3 = tPt(hx - tw * 0.33, hy - 11);

      const er1 = tPt(hx + tw * 0.42, hy - 3);
      const er2 = tPt(hx + tw * 0.14, hy);
      const er3 = tPt(hx + tw * 0.36, hy - 14);

      const ir1 = tPt(hx + tw * 0.37, hy - 3);
      const ir2 = tPt(hx + tw * 0.19, hy - 1);
      const ir3 = tPt(hx + tw * 0.33, hy - 11);

      g.fillStyle(0x2b2b2b, 1);
      g.fillTriangle(el1.x, el1.y, el2.x, el2.y, el3.x, el3.y);
      g.fillStyle(0xffaacc, 1);
      g.fillTriangle(il1.x, il1.y, il2.x, il2.y, il3.x, il3.y);
      g.fillStyle(0x2b2b2b, 1);
      g.fillTriangle(er1.x, er1.y, er2.x, er2.y, er3.x, er3.y);
      g.fillStyle(0xffaacc, 1);
      g.fillTriangle(ir1.x, ir1.y, ir2.x, ir2.y, ir3.x, ir3.y);
      break;
    }

    case 'tophat': {
      const c1 = tPt(hx, hy);
      const c2 = tPt(hx, hy - 22);
      g.fillStyle(0x111111, 1);
      g.fillEllipse(c1.x, c1.y, tw * 0.72, th * 0.72);
      g.fillStyle(0x222222, 1);

      // Draw body as path
      const bl = tPt(hx - tw * 0.34, hy);
      const br = tPt(hx + tw * 0.34, hy);
      const tl = tPt(hx - tw * 0.34, hy - 22);
      const tr = tPt(hx + tw * 0.34, hy - 22);
      g.beginPath();
      g.moveTo(bl.x, bl.y);
      g.lineTo(tl.x, tl.y);
      g.lineTo(tr.x, tr.y);
      g.lineTo(br.x, br.y);
      g.closePath();
      g.fillPath();

      // Red band as path
      const bandBl = tPt(hx - tw * 0.34, hy);
      const bandBr = tPt(hx + tw * 0.34, hy);
      const bandTl = tPt(hx - tw * 0.34, hy - 6);
      const bandTr = tPt(hx + tw * 0.34, hy - 6);
      g.fillStyle(0xff1122, 1);
      g.beginPath();
      g.moveTo(bandBl.x, bandBl.y);
      g.lineTo(bandTl.x, bandTl.y);
      g.lineTo(bandTr.x, bandTr.y);
      g.lineTo(bandBr.x, bandBr.y);
      g.closePath();
      g.fillPath();

      g.fillStyle(0x3a3a3a, 1);
      g.fillEllipse(c2.x, c2.y, tw * 0.34, th * 0.34);
      break;
    }

    case 'chef': {
      // Base bands as path
      const bl = tPt(hx - tw * 0.28, hy);
      const br = tPt(hx + tw * 0.28, hy);
      const tl = tPt(hx - tw * 0.28, hy - 8);
      const tr = tPt(hx + tw * 0.28, hy - 8);
      g.fillStyle(0xdddddd, 1);
      g.beginPath();
      g.moveTo(bl.x, bl.y);
      g.lineTo(tl.x, tl.y);
      g.lineTo(tr.x, tr.y);
      g.lineTo(br.x, br.y);
      g.closePath();
      g.fillPath();

      const cc = tPt(hx, hy - 18);
      const cl = tPt(hx - 8, hy - 13);
      const cr = tPt(hx + 8, hy - 13);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(cc.x, cc.y, 13);
      g.fillCircle(cl.x, cl.y, 10);
      g.fillCircle(cr.x, cr.y, 10);
      break;
    }

    case 'propeller': {
      const c = tPt(hx, hy);
      g.fillStyle(0xff3b30, 1);
      g.fillEllipse(c.x, c.y, tw * 0.48, th * 0.48);

      g.beginPath();
      const arcStart = tPt(hx - tw * 0.24, hy);
      const arcEnd = tPt(hx + tw * 0.24, hy);
      g.moveTo(arcStart.x, arcStart.y);
      // Draw 5 points to approximate a quadratic curve
      for (let i = 1; i <= 4; i++) {
        const ratio = i / 4;
        const px = hx - tw * 0.24 + ratio * tw * 0.48;
        // height profile is a simple parabola
        const hOffset = tw * 0.24 * 4 * ratio * (1 - ratio);
        const py = hy - hOffset;
        const pt = tPt(px, py);
        g.lineTo(pt.x, pt.y);
      }
      g.lineTo(arcEnd.x, arcEnd.y);
      g.closePath();
      g.fillPath();

      const shaftB = tPt(hx, hy - 7);
      const shaftT = tPt(hx, hy - 21);
      g.lineStyle(2, 0x777777, 1);
      g.beginPath();
      g.moveTo(shaftB.x, shaftB.y);
      g.lineTo(shaftT.x, shaftT.y);
      g.strokePath();

      const angle = (timeNow * 0.015) % (Math.PI * 2);
      const bx1 = hx + Math.cos(angle) * 15;
      const by1 = hy - 21 + Math.sin(angle) * 4;
      const bx2 = hx - Math.cos(angle) * 15;
      const by2 = hy - 21 - Math.sin(angle) * 4;

      const p1 = tPt(bx1, by1);
      const p2 = tPt(bx2, by2);

      g.lineStyle(2.5, 0xffcc00, 1);
      g.beginPath();
      g.moveTo(p1.x, p1.y);
      g.lineTo(p2.x, p2.y);
      g.strokePath();

      g.fillStyle(0x333333, 1);
      g.fillCircle(shaftT.x, shaftT.y, 2.5);
      break;
    }

    case 'rainbow': {
      const c = tPt(hx, hy - 12);
      const c2 = tPt(hx, hy - 16);
      const hVal = (timeNow * 0.1) % 360;
      const col1 = hslToInt(hVal, 100, 75);
      const col2 = hslToInt((hVal + 180) % 360, 100, 75);

      g.lineStyle(3, col1, 0.8);
      g.strokeEllipse(c.x, c.y, tw * 0.44, th * 0.44);
      g.lineStyle(1.5, col2, 0.6);
      g.strokeEllipse(c2.x, c2.y, tw * 0.32, th * 0.32);
      break;
    }

    case 'dragon': {
      const c = tPt(hx, hy - 14);
      // Dragon horn base
      g.fillStyle(0xd92323, 1);
      g.fillTriangle(c.x - 14, c.y + 4, c.x - 6, c.y + 4, c.x - 16, c.y - 12);
      g.fillTriangle(c.x + 14, c.y + 4, c.x + 6, c.y + 4, c.x + 16, c.y - 12);
      // Gold horn tips
      g.fillStyle(0xffd700, 1);
      g.fillTriangle(c.x - 12, c.y - 6, c.x - 16, c.y - 12, c.x - 9, c.y - 5);
      g.fillTriangle(c.x + 12, c.y - 6, c.x + 16, c.y - 12, c.x + 9, c.y - 5);
      // Center dragon crest
      g.fillStyle(0xff5500, 0.9);
      g.fillCircle(c.x, c.y - 2, 5);
      break;
    }

    case 'golden_crown': {
      const c = tPt(hx, hy - 16);
      // Golden crown band and peaks
      g.fillStyle(0xffcc00, 1);
      g.fillTriangle(c.x - 14, c.y + 8, c.x - 4, c.y + 8, c.x - 16, c.y - 10);
      g.fillTriangle(c.x - 8, c.y + 8, c.x + 8, c.y + 8, c.x, c.y - 14);
      g.fillTriangle(c.x + 4, c.y + 8, c.x + 14, c.y + 8, c.x + 16, c.y - 10);
      g.fillStyle(0xff0044, 1);
      g.fillCircle(c.x - 16, c.y - 10, 2.5);
      g.fillCircle(c.x, c.y - 14, 3);
      g.fillCircle(c.x + 16, c.y - 10, 2.5);
      break;
    }
  }
}

/** Draws a vibrant cartoon-style cosmic background with a grid floor */
export function drawCartoonCosmicBg(g: Phaser.GameObjects.Graphics, W: number, H: number, worldHue = 280) {
  g.clear();
  
  // 1. Cosmic Gradient Sky (Deep space blue/purple to bright neon magenta/cyan horizon)
  const steps = 30;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const hue = worldHue + (1 - t) * 60; // Shifts hue up in the darker regions
    const lit = 8 + Math.pow(t, 2) * 20; // Dark at top, bright at horizon
    const alpha = 1;
    g.fillStyle(hslToInt(hue % 360, 95, lit), alpha);
    g.fillRect(0, i * (H / steps), W, Math.ceil(H / steps));
  }

  // 2. Horizon Glow
  g.fillStyle(hslToInt(worldHue, 100, 60), 0.3);
  g.fillEllipse(W / 2, H * 0.45, W * 1.5, H * 0.3);
  g.fillStyle(hslToInt(worldHue, 100, 80), 0.5);
  g.fillEllipse(W / 2, H * 0.45, W * 0.8, H * 0.15);

  // 2.5. Horizon Parallax Cartoon Mountain Silhouettes
  const horizonY = H * 0.45;

  // Back distant mountain layer
  g.fillStyle(hslToInt(worldHue, 60, 15), 0.7);
  g.beginPath();
  g.moveTo(0, H);
  g.lineTo(0, horizonY);
  for (let x = 0; x <= W + 40; x += 40) {
    const hillY = horizonY - 14 - Math.sin(x * 0.009 + worldHue * 0.1) * 15 - Math.cos(x * 0.02) * 6;
    g.lineTo(x, hillY);
  }
  g.lineTo(W, H);
  g.closePath();
  g.fillPath();

  // Mid closer mountain/hill layer
  g.fillStyle(hslToInt(worldHue, 75, 11), 0.96);
  g.beginPath();
  g.moveTo(0, H);
  g.lineTo(0, horizonY);
  for (let x = 0; x <= W + 40; x += 40) {
    const hillY = horizonY - 4 - Math.cos(x * 0.013 - worldHue * 0.05) * 16 - Math.sin(x * 0.03) * 5;
    g.lineTo(x, hillY);
  }
  g.lineTo(W, H);
  g.closePath();
  g.fillPath();

  // 3. Synthwave Neon Grid Floor
  const vanishingX = W / 2;
  const gridCol = hslToInt(worldHue, 100, 75);

  g.lineStyle(2, gridCol, 0.4);
  
  // Converging vertical-ish lines
  const lineCount = 16;
  for (let i = 0; i <= lineCount; i++) {
    const t = i / lineCount;
    const startX = W * (t * 3.0 - 1.0); // wide bottom span
    g.beginPath();
    g.moveTo(vanishingX, horizonY);
    g.lineTo(startX, H);
    g.strokePath();
  }

  // Horizontal grid lines getting further apart based on perspective
  for (let j = 0; j < 12; j++) {
    const pt = Math.pow(j / 11, 2.5); // Perspective scaling
    const y = horizonY + pt * (H - horizonY);
    g.lineStyle(2, gridCol, 0.1 + pt * 0.5);
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(W, y);
    g.strokePath();
  }
}

export function createCosmicEffects(scene: Phaser.Scene, W: number, H: number, worldHue = 280): Phaser.GameObjects.Graphics {
  const gfx = scene.add.graphics();
  
  const oW = W * 1.3;
  const oH = H * 1.3;
  const startX = -W * 0.15;
  const startY = -H * 0.15;

  // 1. Vibrant Stars
  for (let i = 0; i < 70; i++) {
    const x = startX + Math.random() * oW;
    const y = startY + Math.random() * oH * 0.6; // mostly above horizon
    const size = Math.random() * 2 + 1;
    const isBright = Math.random() > 0.8;
    
    gfx.fillStyle(0xffffff, isBright ? 0.9 : 0.4);
    gfx.fillCircle(x, y, size);
    
    if (isBright) {
      gfx.fillStyle(hslToInt(worldHue, 100, 85), 0.5);
      gfx.fillCircle(x, y, size * 2.5); // star glow
    }
  }

  // 2. Confetti / Floating Neon Bits
  for (let i = 0; i < 30; i++) {
    const x = startX + Math.random() * oW;
    const y = startY + Math.random() * oH;
    const w = 4 + Math.random() * 6;
    const h = 4 + Math.random() * 6;
    const hue = (worldHue + (Math.random() * 120 - 60)) % 360;
    
    gfx.fillStyle(hslToInt(hue, 100, 75), 0.7);
    
    if (Math.random() > 0.5) {
      gfx.fillRect(x, y, w, h);
    } else {
      gfx.fillTriangle(x, y, x + w, y + h, x - w, y + h);
    }
  }

  // 3. Shooting Stars (Comets)
  for (let i = 0; i < 4; i++) {
    const x = startX + Math.random() * oW;
    const y = startY + Math.random() * oH * 0.3;
    gfx.lineStyle(3, 0xffffff, 0.8);
    gfx.beginPath();
    gfx.moveTo(x, y);
    gfx.lineTo(x - 40, y + 20);
    gfx.strokePath();
    
    gfx.lineStyle(6, hslToInt(worldHue, 100, 80), 0.4);
    gfx.beginPath();
    gfx.moveTo(x, y);
    gfx.lineTo(x - 50, y + 25);
    gfx.strokePath();
  }

  // Twinkle effect: fade in/out random stars
  scene.tweens.add({
    targets: gfx, alpha: { from: 0.7, to: 1 },
    duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.InOut'
  });

  return gfx;
}

/**
 * Creates a professional, polished 3D cartoon-style button container.
 * Clickable in the entire bounding box with tactile spring/wiggle feedback.
 */
export function createCartoonButton(
  scene: Phaser.Scene,
  x: number, y: number,
  w: number, h: number,
  text: string,
  onClick: () => void,
  options?: {
    bgColor?: number;
    shadowColor?: number;
    textColor?: string;
    fontSize?: number;
    fontFamily?: string;
    radius?: number;
    depth?: number;
  }
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  container.setDepth(options?.depth ?? 21);
  container.setSize(w, h);
  
  // Entire button area hit zone
  container.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
  container.input!.cursor = 'pointer';

  const bg = scene.add.graphics();
  container.add(bg);

  const fontSize = options?.fontSize ?? Math.round(h * 0.45);
  const txt = scene.add.text(0, -2, text, {
    fontFamily: options?.fontFamily ?? 'Orbitron',
    fontSize: fontSize + 'px',
    color: options?.textColor ?? '#ffffff',
    stroke: '#000000',
    strokeThickness: 2.2,
    align: 'center'
  }).setOrigin(0.5);
  container.add(txt);

  const faceCol = options?.bgColor ?? 0x9b72ff;
  const shadowCol = options?.shadowColor ?? blendColor(faceCol, 0x000000, 0.4);
  const r = options?.radius ?? 12;

  const redraw = (state: 'idle' | 'hover' | 'pressed') => {
    bg.clear();
    
    let faceY = -h / 2;
    let shH = 6;
    
    if (state === 'pressed') {
      faceY = -h / 2 + 4;
      shH = 2;
      txt.setY(2);
    } else {
      txt.setY(-2);
    }

    const faceBright = state === 'hover' ? blendColor(faceCol, 0xffffff, 0.15) : faceCol;

    // 1. Draw 3D shadow/thickness (Darker bottom layer)
    bg.fillStyle(shadowCol, 1);
    bg.fillRoundedRect(-w / 2, -h / 2 + shH, w, h, r);

    // 2. Draw Main top face
    bg.fillStyle(faceBright, 1);
    bg.fillRoundedRect(-w / 2, faceY, w, h, r);

    // 3. Highlight Bevel
    bg.lineStyle(1.8, 0xffffff, 0.4);
    bg.beginPath();
    bg.moveTo(-w / 2 + r, faceY + 1.2);
    bg.lineTo(w / 2 - r, faceY + 1.2);
    bg.strokePath();
  };

  redraw('idle');

  container.on('pointerover', () => {
    redraw('hover');
    scene.tweens.add({
      targets: container,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 100,
      ease: 'Quad.Out',
      overwrite: true
    });
  });

  container.on('pointerout', () => {
    redraw('idle');
    scene.tweens.add({
      targets: container,
      scaleX: 1.0,
      scaleY: 1.0,
      duration: 100,
      ease: 'Quad.Out',
      overwrite: true
    });
  });

  container.on('pointerdown', () => {
    redraw('pressed');
    scene.tweens.add({
      targets: container,
      scaleX: 0.96,
      scaleY: 0.96,
      duration: 50,
      ease: 'Quad.Out',
      overwrite: true
    });
  });

  container.on('pointerup', () => {
    redraw('hover');
    scene.tweens.add({
      targets: container,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 80,
      ease: 'Quad.Out',
      overwrite: true
    });
    onClick();
  });

  return container;
}