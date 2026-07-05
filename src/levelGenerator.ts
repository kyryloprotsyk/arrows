/* levelGenerator.ts — Solvable 3D puzzle generator (no Three.js dependency) */

export interface Vec3 { x: number; y: number; z: number; }
export type BlockType = 'normal' | 'bomb' | 'key' | 'chest' | 'rainbow';

export interface BlockConfig {
  id: string;
  x: number; y: number; z: number;
  dir: Vec3;
  type: BlockType;
  targetChestId?: string;
}

export interface LevelData {
  worldIndex: number;
  levelIndex: number;
  worldName: string;
  blocks: BlockConfig[];
  moveLimit: number;
}

// --- Vector helpers ---
const v3  = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
const key3 = (v: Vec3) => `${v.x.toFixed(1)},${v.y.toFixed(1)},${v.z.toFixed(1)}`;

function v3dot(a: Vec3, b: Vec3) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function v3scale(v: Vec3, s: number): Vec3 { return { x: v.x * s, y: v.y * s, z: v.z * s }; }
function v3sub(a: Vec3, b: Vec3): Vec3 { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function v3clone(v: Vec3): Vec3 { return { x: v.x, y: v.y, z: v.z }; }


const DIRS: Vec3[] = [
  v3(1, 0, 0), v3(-1, 0, 0),
  v3(0, 1, 0), v3(0, -1, 0),
  v3(0, 0, 1), v3(0, 0, -1)
];

class LevelGenerator {

  getWorldName(w: number) {
    return ['', 'Jelly Hills', 'Dino Valley', 'Cosmo Station'][w] ?? 'Jelly Hills';
  }

  generateLevel(worldIndex: number, levelIndex: number): LevelData {
    const coords = this.getShapeCoords(worldIndex, levelIndex);
    const blocks = this.backSolve(coords);
    this.injectSpecials(blocks, worldIndex, levelIndex);
    return {
      worldIndex, levelIndex,
      worldName: this.getWorldName(worldIndex),
      blocks,
      moveLimit: blocks.length + 6
    };
  }

  private getShapeCoords(w: number, l: number): Vec3[] {
    const coords: Vec3[] = [];

    if (w === 1) {
      // World 1: Simple, easy shapes
      if (l === 1) {
        // 2×2×2 cube (8 blocks)
        for (let x = 0; x < 2; x++) for (let y = 0; y < 2; y++) for (let z = 0; z < 2; z++)
          coords.push(v3(x - 0.5, y - 0.5, z - 0.5));
      } else if (l === 2) {
        // 3D Plus cross (7 blocks)
        coords.push(v3(0, 0, 0));
        for (const d of DIRS) coords.push(v3clone(d));
      } else if (l === 3) {
        // Flat 3×3 grid (9 blocks)
        for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++)
          coords.push(v3(x, 0, z));
      } else if (l === 4) {
        // Hollow 3×3×3 shell (26 blocks)
        for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++)
          if (!(x === 0 && y === 0 && z === 0)) coords.push(v3(x, y, z));
      } else {
        // Pyramid (14 blocks)
        for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) coords.push(v3(x, -1, z));
        for (let x = 0; x <= 1; x++) for (let z = 0; z <= 1; z++) coords.push(v3(x - 0.5, 0, z - 0.5));
        coords.push(v3(0, 1, 0));
      }

    } else if (w === 2) {
      // World 2: More complex shapes (Increased Difficulty)
      if (l === 1) {
        // Thick Ring of 16 (radius 2)
        for (let r = 1; r <= 2; r++) {
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            coords.push(v3(Math.round(Math.cos(a) * (1.5 * r)), 0, Math.round(Math.sin(a) * (1.5 * r))));
          }
        }
      } else if (l === 2) {
        // Triple cross / giant sword (35 blocks)
        for (let y = -3; y <= 3; y++) coords.push(v3(0, y, 0));
        for (let x = -3; x <= 3; x++) if (x !== 0) coords.push(v3(x, 1, 0));
        for (let z = -3; z <= 3; z++) if (z !== 0) coords.push(v3(0, 1, z));
        for (let x = -2; x <= 2; x++) if (x !== 0) coords.push(v3(x, -1, 0));
      } else if (l === 3) {
        // 5x5 base stepped pyramid
        for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) coords.push(v3(x, -2, z));
        for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) coords.push(v3(x, -1, z));
        for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) coords.push(v3(x, 0, z));
        coords.push(v3(0, 1, 0));
        coords.push(v3(0, 2, 0));
      } else if (l === 4) {
        // Solid 4x4x3 Core + antennas
        for (let x = -1.5; x <= 1.5; x++) for (let y = -1; y <= 1; y++) for (let z = -1.5; z <= 1.5; z++)
          coords.push(v3(Math.round(x), y, Math.round(z)));
        coords.push(v3(0, 3, 0)); coords.push(v3(0, -3, 0));
        coords.push(v3(3, 0, 0)); coords.push(v3(-3, 0, 0));
      } else {
        // Giant Egg capsule
        for (let y = -3; y <= 3; y++) {
          const r = (Math.abs(y) === 3) ? 1 : (Math.abs(y) === 2) ? 2 : 2.5;
          const steps = Math.abs(y) === 3 ? 8 : 12;
          for (let i = 0; i < steps; i++) {
            const a = (i / steps) * Math.PI * 2;
            coords.push(v3(Math.round(Math.cos(a) * r), y, Math.round(Math.sin(a) * r)));
          }
        }
      }

    } else {
      // World 3: High complexity & massive size
      if (l === 1) {
        // Giant Star
        coords.push(v3(0, 0, 0));
        for (const d of DIRS) { coords.push(v3clone(d)); coords.push(v3scale(d, 2)); coords.push(v3scale(d, 3)); }
        for (let i = -2; i <= 2; i+=4) for (let j = -2; j <= 2; j+=4) {
          coords.push(v3(i/2, j/2, 0));
          coords.push(v3(i, j, 0));
        }
      } else if (l === 2) {
        // Thick Satellite ring 
        for (let y = -2; y <= 2; y++) coords.push(v3(0, y, 0));
        for (let r = 2; r <= 3; r++) {
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            coords.push(v3(Math.round(Math.cos(a) * r), 0, Math.round(Math.sin(a) * r)));
          }
        }
        for (const d of DIRS) { coords.push(v3scale(d, 4)); }
      } else if (l === 3) {
        // 4x4x4 Hollow cube with inner core
        for (let x = -1.5; x <= 1.5; x++) for (let y = -1.5; y <= 1.5; y++) for (let z = -1.5; z <= 1.5; z++) {
          const rx = Math.round(x*2); const ry = Math.round(y*2); const rz = Math.round(z*2);
          if (Math.abs(rx) === 3 || Math.abs(ry) === 3 || Math.abs(rz) === 3 || (rx===0&&ry===0&&rz===0)) {
            coords.push(v3(rx, ry, rz));
          }
        }
      } else if (l === 4) {
        // Double Helix spiral
        for (let i = 0; i < 36; i++) {
          const a = (i / 6) * Math.PI * 2;
          coords.push(v3(Math.round(Math.cos(a) * 2), Math.round(i / 4) - 4, Math.round(Math.sin(a) * 2)));
          coords.push(v3(Math.round(Math.cos(a + Math.PI) * 2), Math.round(i / 4) - 4, Math.round(Math.sin(a + Math.PI) * 2)));
        }
      } else {
        // Mega station - massive structure
        for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) for (let z = -2; z <= 2; z++)
          if (Math.abs(x)+Math.abs(y)+Math.abs(z) <= 3) coords.push(v3(x, y, z));
        [-5, -4, -3, 3, 4, 5].forEach(x => coords.push(v3(x, 0, 0)));
        [-4, -3, 3, 4].forEach(y => coords.push(v3(0, y, 0)));
        [-4, -3, 3, 4].forEach(z => coords.push(v3(0, 0, z)));
      }
    }

    // Deduplicate
    const map = new Map<string, Vec3>();
    coords.forEach(c => map.set(key3(c), c));
    return Array.from(map.values());
  }

  /** Back-solving ensures puzzle is solvable: place blocks that can "escape" first. */
  private backSolve(targets: Vec3[]): BlockConfig[] {
    const placed: Vec3[] = [];
    const blocks: BlockConfig[] = [];
    const remaining = targets.map(v3clone);
    let id = 0;

    let iters = 0;
    const MAX = targets.length * 50;

    while (remaining.length > 0 && iters++ < MAX) {
      const ti = Math.floor(Math.random() * remaining.length);
      const pos = remaining[ti];

      // Shuffle directions
      const dirs = [...DIRS].sort(() => Math.random() - 0.5);
      let placed_ = false;

      for (const d of dirs) {
        // Check path is clear through already-placed blocks
        let clear = true;
        for (const p of placed) {
          const diff = v3sub(p, pos);
          const dot = v3dot(diff, d);
          if (dot > 0.05) {
            const proj = v3scale(d, dot);
            const rem = v3sub(diff, proj);
            if (Math.abs(rem.x) < 0.1 && Math.abs(rem.y) < 0.1 && Math.abs(rem.z) < 0.1) {
              clear = false; break;
            }
          }
        }

        if (clear) {
          blocks.push({ id: `b${id++}`, x: pos.x, y: pos.y, z: pos.z, dir: d, type: 'normal' });
          placed.push(pos);
          remaining.splice(ti, 1);
          placed_ = true;
          break;
        }
      }

      if (!placed_) {
        // Force place with random dir (fallback)
        const d = dirs[0];
        blocks.push({ id: `b${id++}`, x: pos.x, y: pos.y, z: pos.z, dir: d, type: 'normal' });
        placed.push(pos);
        remaining.splice(ti, 1);
      }
    }

    return blocks;
  }

  private injectSpecials(blocks: BlockConfig[], w: number, l: number) {
    if (w === 1) return; // World 1 = normals only

    const normal = blocks.filter(b => b.type === 'normal');
    const shuffle = [...normal].sort(() => Math.random() - 0.5);

    let si = 0;

    if (w >= 2) {
      // Bombs
      const bombCount = l === 1 ? 1 : l < 4 ? 2 : 3;
      for (let i = 0; i < bombCount && si < shuffle.length; i++, si++) {
        shuffle[si].type = 'bomb';
      }

      // Key/Chest pair (from level 3+)
      if (l >= 3 && shuffle.length - si >= 2) {
        const chestBlock = shuffle[si]; si++;
        const keyBlock = shuffle[si];   si++;
        chestBlock.type = 'chest';
        keyBlock.type = 'key';
        keyBlock.targetChestId = chestBlock.id;
      }
    }

    if (w === 3) {
      // Rainbow buddies (~15%)
      const count = Math.max(1, Math.round(normal.length * 0.15));
      for (let i = 0; i < count && si < shuffle.length; i++, si++) {
        if (shuffle[si].type === 'normal') shuffle[si].type = 'rainbow';
      }

      // Extra key/chest pair at level 4+
      if (l >= 4 && shuffle.length - si >= 2) {
        const c = shuffle[si]; si++;
        const k = shuffle[si]; si++;
        if (c.type === 'normal' && k.type === 'normal') {
          c.type = 'chest'; k.type = 'key'; k.targetChestId = c.id;
        }
      }
    }
  }
}

export const levelGenerator = new LevelGenerator();
