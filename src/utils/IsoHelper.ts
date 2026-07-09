/* IsoHelper.ts — Isometric math & rendering utilities */

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


export type CoordTransformer = (x: number, y: number) => { x: number; y: number };

/** Draw a full isometric cube at (cx, cy) using Phaser Graphics API. */
export function drawIsoCube(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  topCol: number, leftCol: number, rightCol: number,
  glowCol: number,
  glowAlpha = 0.5,
  transformer?: CoordTransformer
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

  // Hidden back-bottom vertex (shifted down from top vertex A by bh)
  let backX = cx, backY = cy - th + bh;
  if (transformer) {
    const tBack = transformer(backX, backY);
    backX = tBack.x; backY = tBack.y;
  }

  // Draw hidden back faces first for realistic transparency
  g.fillStyle(leftCol, 0.12);
  fillPoly([topX, topY, leftX, leftY, lbX, lbY, backX, backY]);
  
  g.fillStyle(rightCol, 0.12);
  fillPoly([topX, topY, rightX, rightY, rbX, rbY, backX, backY]);

  g.fillStyle(topCol, 0.12);
  fillPoly([backX, backY, lbX, lbY, bbX, bbY, rbX, rbY]);

  // Draw back wireframe structure
  g.lineStyle(1.2, 0xffffff, 0.08);
  g.beginPath();
  g.moveTo(backX, backY); g.lineTo(topX, topY);
  g.moveTo(backX, backY); g.lineTo(lbX, lbY);
  g.moveTo(backX, backY); g.lineTo(rbX, rbY);
  g.strokePath();

  // Draw inner glowing core
  const scaleX = transformer ? Math.hypot(rightX - leftX, rightY - leftY) / (tw * 2) : 1;
  const scaleY = transformer ? Math.hypot(bbY - topY, bbX - topX) / (th * 2 + bh) : 1;
  const tPt = (x: number, y: number) => transformer ? transformer(x, y) : { x, y };

  const coreCenter = tPt(cx, cy + bh / 2);
  g.fillStyle(glowCol, 0.35);
  g.fillEllipse(coreCenter.x, coreCenter.y, 22 * scaleX, 16 * scaleY);
  g.fillStyle(0xffffff, 0.40);
  g.fillEllipse(coreCenter.x, coreCenter.y, 10 * scaleX, 7 * scaleY);

  // Draw front visible faces with glass transparency
  g.fillStyle(rightCol, 0.72);
  fillPoly([rightX, rightY, botX, botY, bbX, bbY, rbX, rbY]);

  g.fillStyle(leftCol, 0.72);
  fillPoly([leftX, leftY, botX, botY, bbX, bbY, lbX, lbY]);

  g.fillStyle(topCol, 0.78);
  fillPoly([topX, topY, rightX, rightY, botX, botY, leftX, leftY]);

  // Top glossy highlights
  g.fillStyle(0xffffff, 0.22);
  const topHighlight = tPt(cx - 3, cy - th * 0.55);
  g.fillEllipse(topHighlight.x, topHighlight.y, 12 * scaleX, 5 * scaleY);

  // Glossy glass reflection overlay (diagonal shine)
  g.fillStyle(0xffffff, 0.12);
  fillPoly([topX, topY, (topX + rightX) / 2, (topY + rightY) / 2, (leftX + botX) / 2, (leftY + botY) / 2, leftX, leftY]);

  // White bevel highlight on the front-top edges
  g.lineStyle(1.5, 0xffffff, 0.32);
  g.beginPath();
  g.moveTo(leftX, leftY);
  g.lineTo(botX, botY);
  g.lineTo(rightX, rightY);
  g.strokePath();

  // 4. Multi-Layered Concentric Outer Glows & Bloom Edge Highlights
  type Seg = [number, number, number, number]; // x1,y1,x2,y2
  const edges: Seg[] = [
    [topX,topY,   rightX,rightY], [topX,topY,   leftX,leftY],
    [leftX,leftY, lbX,lbY],
    [rightX,rightY, rbX,rbY],
    [botX,botY,   bbX,bbY],
    [lbX,lbY,    bbX,bbY], [rbX,rbY, bbX,bbY]
  ];

  // Draw 4 concentric bloom passes for neon glass aura
  for (let pass = 0; pass < 4; pass++) {
    const alpha = glowAlpha * [0.10, 0.25, 0.48, 0.88][pass];
    const width  = [10, 6, 3, 1.3][pass];
    g.lineStyle(width, glowCol, alpha);
    for (const [ax, ay, bx, by] of edges) {
      g.beginPath();
      g.moveTo(ax, ay);
      g.lineTo(bx, by);
      g.strokePath();
    }
  }

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
      // Ruby gems
      g.fillStyle(0xff0044, 1);
      g.fillCircle(c.x - 16, c.y - 10, 2.5);
      g.fillCircle(c.x, c.y - 14, 3);
      g.fillCircle(c.x + 16, c.y - 10, 2.5);
      break;
    }
  }
}
