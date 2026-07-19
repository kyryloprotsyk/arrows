/* levelGenerator.ts — Solvable 3D puzzle generator (no Three.js dependency) */

export interface Vec3 { x: number; y: number; z: number; }
export type BlockType = 'normal' | 'bomb' | 'key' | 'chest' | 'rainbow' | 'rotator' | 'portal';

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
  par: number;
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
    return ['', 'Jelly Hills', 'Dino Valley', 'Cosmo Station', 'Coral Reef', 'Ice Castle', 'Volcanic Land'][w] ?? 'Jelly Hills';
  }

  generateLevel(worldIndex: number, levelIndex: number): LevelData {
    const coords = this.getShapeCoords(worldIndex, levelIndex);

    // Retry generation up to 8 times to ensure a solvable puzzle
    let blocks: BlockConfig[] = [];
    let attempts = 0;
    do {
      blocks = this.backSolve(coords);
      attempts++;
    } while (!this.isSolvable(blocks) && attempts < 8);

    this.injectSpecials(blocks, worldIndex, levelIndex);

    let multiplier = 1.35;
    if (worldIndex === 1) multiplier = 1.45;
    else if (worldIndex === 2) multiplier = 1.35;
    else if (worldIndex === 3) multiplier = 1.28;
    else if (worldIndex === 4) multiplier = 1.25;
    else if (worldIndex === 5) multiplier = 1.20;
    else if (worldIndex >= 6) multiplier = 1.15;

    const moveLimit = Math.max(12, Math.round(blocks.length * multiplier + 4));
    // Dynamic par target is tight (approx. 70% of blocks count, representing a smart puzzle solution)
    const par = Math.max(4, Math.round(blocks.length * 0.70));

    return {
      worldIndex, levelIndex,
      worldName: this.getWorldName(worldIndex),
      blocks,
      moveLimit,
      par
    };
  }

  /**
   * BFS-style solvability check: repeatedly removes any block whose escape path
   * is currently clear.  Returns true if all blocks can eventually be cleared.
   * Rainbow blocks can always find a free direction, bombs self-remove — both are
   * treated as always escapable for this simplified check.
   */
  private isSolvable(blocks: BlockConfig[]): boolean {
    let remaining = blocks.map(b => ({ ...b }));
    let changed = true;
    while (changed) {
      changed = false;
      const stuck: BlockConfig[] = [];
      for (const b of remaining) {
        const others = remaining.filter(o => o.id !== b.id);
        if (b.type === 'rainbow' || b.type === 'bomb') {
          // Rainbow finds any free direction; bomb self-destructs — always escapable
          changed = true;
        } else if (b.type === 'chest') {
          // Chest escapes only when its key has already escaped
          const hasKey = remaining.some(o => o.type === 'key' && o.targetChestId === b.id);
          if (!hasKey && this.canEscapeSimple(b, others)) {
            changed = true;
          } else {
            stuck.push(b);
          }
        } else {
          if (this.canEscapeSimple(b, others)) {
            changed = true;
          } else {
            stuck.push(b);
          }
        }
      }
      remaining = stuck;
    }
    return remaining.length === 0;
  }

  /** Returns true if block b's escape direction is unobstructed by others. */
  private canEscapeSimple(b: BlockConfig, others: BlockConfig[]): boolean {
    const dir = b.dir;
    for (const other of others) {
      const diff = { x: other.x - b.x, y: other.y - b.y, z: other.z - b.z };
      const dot = diff.x * dir.x + diff.y * dir.y + diff.z * dir.z;
      if (dot > 0.05) {
        const proj = { x: dir.x * dot, y: dir.y * dot, z: dir.z * dot };
        const rem  = { x: diff.x - proj.x, y: diff.y - proj.y, z: diff.z - proj.z };
        if (Math.abs(rem.x) < 0.1 && Math.abs(rem.y) < 0.1 && Math.abs(rem.z) < 0.1) {
          return false; // blocked
        }
      }
    }
    return true;
  }

  private getShapeCoords(w: number, l: number): Vec3[] {
    const coords: Vec3[] = [];

    if (w === 1) {
      // World 1: Jelly Hills (Warm-up & Flowing Curves)
      if (l === 1) {
        // Level 1: Compact Cross (7 blocks)
        coords.push(v3(0, 0, 0));
        for (const d of DIRS) coords.push(v3clone(d));
      } else if (l === 2) {
        // Level 2: Intertwining Double Ring (12 blocks)
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          coords.push(v3(Math.round(Math.cos(a) * 1.5), Math.round(Math.sin(a) * 1.5), 0));
          coords.push(v3(Math.round(Math.cos(a) * 1.5), 0, Math.round(Math.sin(a) * 1.5)));
        }
      } else if (l === 3) {
        // Level 3: Stepped Mini Fortress (14 blocks)
        for (let x = -1; x <= 1; x++) {
          for (let z = -1; z <= 1; z++) {
            coords.push(v3(x, -1, z));
          }
        }
        for (let x = 0; x <= 1; x++) {
          for (let z = 0; z <= 1; z++) {
            coords.push(v3(x - 0.5, 0, z - 0.5));
          }
        }
        coords.push(v3(0, 1, 0));
      } else if (l === 4) {
        // Level 4: Hollow Cube Cage (26 blocks)
        for (let x = -1; x <= 1; x++) {
          for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
              if (x !== 0 || y !== 0 || z !== 0) {
                coords.push(v3(x, y, z));
              }
            }
          }
        }
      } else {
        // Level 5: Double Helix Columns (24 blocks)
        for (let y = -3; y <= 3; y++) {
          const a = (y / 3) * Math.PI;
          coords.push(v3(Math.round(Math.cos(a) * 1.3), y, Math.round(Math.sin(a) * 1.3)));
          coords.push(v3(Math.round(Math.cos(a + Math.PI) * 1.3), y, Math.round(Math.sin(a + Math.PI) * 1.3)));
        }
      }

    } else if (w === 2) {
      // World 2: Dino Valley (Increased Difficulty & Bombs)
      if (l === 1) {
        // Level 1: Lava Wall with a Bomb Core (22 blocks)
        for (let x = -2; x <= 2; x++) {
          for (let y = -2; y <= 2; y++) {
            if (Math.abs(x) + Math.abs(y) <= 3) {
              coords.push(v3(x, y, 0));
            }
          }
        }
      } else if (l === 2) {
        // Level 2: Vault Ring enclosing a chest (24 blocks)
        coords.push(v3(0, 0, 0));
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          coords.push(v3(Math.round(Math.cos(a) * 2), 0, Math.round(Math.sin(a) * 2)));
        }
        for (let i = 0; i < 11; i++) {
          const a = (i / 11) * Math.PI * 2;
          coords.push(v3(Math.round(Math.cos(a) * 3), 0, Math.round(Math.sin(a) * 3)));
        }
      } else if (l === 3) {
        // Level 3: Rotator Turbine with spinning arms (28 blocks)
        for (let x = 0; x <= 1; x++) {
          for (let z = 0; z <= 1; z++) {
            coords.push(v3(x - 0.5, 0, z - 0.5));
          }
        }
        for (let i = 2; i <= 7; i++) {
          coords.push(v3(i, 0, 0));
          coords.push(v3(-i, 0, 0));
          coords.push(v3(0, 0, i));
          coords.push(v3(0, 0, -i));
        }
      } else if (l === 4) {
        // Level 4: Dino Claw footprint (32 blocks)
        for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) coords.push(v3(x, 0, z));
        for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) coords.push(v3(x, -2, z));
        for (let i = 1; i <= 4; i++) {
          coords.push(v3(-i, i, 0));
          coords.push(v3(0, i + 1, 0));
          coords.push(v3(i, i, 0));
        }
      } else {
        // Level 5: Mesozoic Castle Ramparts (38 blocks)
        for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) {
          if (Math.abs(x) === 2 || Math.abs(z) === 2) coords.push(v3(x, -1, z));
        }
        for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) {
          if (Math.abs(x) === 1 || Math.abs(z) === 1) coords.push(v3(x, 0, z));
        }
        for (let y = -2; y <= 2; y++) {
          coords.push(v3(0, y, 0));
        }
        coords.push(v3(-2, 0, -2)); coords.push(v3(2, 0, -2));
        coords.push(v3(-2, 0, 2));  coords.push(v3(2, 0, 2));
        coords.push(v3(-2, 1, -2)); coords.push(v3(2, 1, -2));
        coords.push(v3(-2, 1, 2));  coords.push(v3(2, 1, 2));
        coords.push(v3(0, 2, 1));
      }

    } else if (w === 3) {
      // World 3: Cosmo Station (High complexity & Rainbow panels)
      if (l === 1) {
        // Level 1: Satellite Dish with Orbiting Rainbow Panels (30 blocks)
        for (let y = -2; y <= 2; y++) coords.push(v3(0, y, 0));
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          coords.push(v3(Math.round(Math.cos(a) * 1.5), 1, Math.round(Math.sin(a) * 1.5)));
        }
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          coords.push(v3(Math.round(Math.cos(a) * 3), 0, Math.round(Math.sin(a) * 3)));
        }
        coords.push(v3(-4, 0, 0)); coords.push(v3(4, 0, 0));
        coords.push(v3(0, 0, -4)); coords.push(v3(0, 0, 4));
        coords.push(v3(0, 3, 0));
      } else if (l === 2) {
        // Level 2: Binary Star Cores (34 blocks)
        for (let y = -1; y <= 1; y++) {
          for (let z = -1; z <= 1; z++) {
            coords.push(v3(-2, y, z));
            coords.push(v3(2, y, z));
          }
        }
        for (let x = -1; x <= 1; x++) {
          coords.push(v3(x, 0, 0));
          coords.push(v3(x, 0, 1));
          coords.push(v3(x, 0, -1));
        }
        for (let i = 0; i < 7; i++) {
          coords.push(v3(-4, Math.round(Math.sin(i) * 1.5), Math.round(Math.cos(i) * 1.5)));
          coords.push(v3(4, Math.round(Math.sin(i) * 1.5), Math.round(Math.cos(i) * 1.5)));
        }
      } else if (l === 3) {
        // Level 3: Space Station Cylinder Capsule (40 blocks)
        for (let y = -2; y <= 2; y++) {
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            coords.push(v3(Math.round(Math.cos(a) * 2), y, Math.round(Math.sin(a) * 2)));
          }
        }
      } else if (l === 4) {
        // Level 4: Dense Vortex Helix (44 blocks)
        for (let i = 0; i < 22; i++) {
          const a = (i / 11) * Math.PI * 4;
          coords.push(v3(Math.round(Math.cos(a) * 2), Math.round(i / 3) - 3, Math.round(Math.sin(a) * 2)));
          coords.push(v3(Math.round(Math.cos(a + Math.PI) * 2), Math.round(i / 3) - 3, Math.round(Math.sin(a + Math.PI) * 2)));
        }
      } else {
        // Level 5: Nested Hyper-Cube Matrix (56 blocks)
        for (let x = -2; x <= 2; x++) {
          for (let y = -2; y <= 2; y++) {
            for (let z = -2; z <= 2; z++) {
              if (Math.abs(x) === 2 || Math.abs(y) === 2 || Math.abs(z) === 2) {
                coords.push(v3(x, y, z));
              }
            }
          }
        }
      }

    } else if (w === 4) {
      // World 4: Coral Reef (Interlocking chains & Whirlpools)
      if (l === 1) {
        // Level 1: Coral Branch tree layout (32 blocks)
        for (let y = -3; y <= 2; y++) coords.push(v3(0, y, 0));
        for (let i = 1; i <= 4; i++) {
          coords.push(v3(i, i - 1, 0)); coords.push(v3(i, i - 1, 1));
          coords.push(v3(-i, i - 2, 0)); coords.push(v3(-i, i - 2, -1));
          coords.push(v3(0, i - 1, i)); coords.push(v3(1, i - 1, i));
          coords.push(v3(0, i - 2, -i)); coords.push(v3(-1, i - 2, -i));
        }
        coords.push(v3(0, 3, 0)); coords.push(v3(1, 3, 0));
      } else if (l === 2) {
        // Level 2: Spiraling Inward Whirlpool Cone (38 blocks)
        for (let i = 0; i < 38; i++) {
          const a = (i / 8) * Math.PI * 2;
          const r = 3 - (i / 38) * 2;
          coords.push(v3(Math.round(Math.cos(a) * r), Math.round(i / 6) - 3, Math.round(Math.sin(a) * r)));
        }
      } else if (l === 3) {
        // Level 3: Dense Anchor with twin hooks (42 blocks)
        for (let y = -3; y <= 3; y++) {
          coords.push(v3(0, y, 0));
          coords.push(v3(0, y, 1));
        }
        for (let x = -3; x <= 3; x++) coords.push(v3(x, 2, 0));
        for (let x = -3; x <= 3; x++) {
          if (x !== 0) {
            const h = Math.abs(x) === 3 ? -1 : Math.abs(x) === 2 ? -2 : -3;
            coords.push(v3(x, h, 0));
            coords.push(v3(x, h + 1, 0));
          }
        }
        coords.push(v3(0, -4, 0));
        coords.push(v3(1, -4, 0));
        coords.push(v3(-1, -4, 0));
      } else if (l === 4) {
        // Level 4: Interlocking Chain rings (48 blocks)
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          coords.push(v3(Math.round(Math.cos(a) * 2.2) - 1.5, Math.round(Math.sin(a) * 2.2), 0));
          coords.push(v3(Math.round(Math.cos(a) * 2.2) + 1.5, 0, Math.round(Math.sin(a) * 2.2)));
          coords.push(v3(0, Math.round(Math.cos(a) * 2.2), Math.round(Math.sin(a) * 2.2) + 1.5));
        }
      } else {
        // Level 5: Porous Reef Wall (58 blocks)
        for (let x = -3; x <= 3; x++) {
          for (let y = -1; y <= 1; y++) {
            for (let z = -2; z <= 2; z++) {
              if ((x + y + z) % 3 !== 0) {
                coords.push(v3(x, y, z));
              }
            }
          }
        }
      }

    } else if (w === 5) {
      // World 5: Ice Castle (Chilled spires, castles & double keys)
      if (l === 1) {
        // Level 1: Frost Spire tower (36 blocks)
        for (let y = -3; y <= 3; y++) {
          const r = Math.max(1, 3 - Math.abs(y));
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            coords.push(v3(Math.round(Math.cos(a) * r), y, Math.round(Math.sin(a) * r)));
          }
        }
      } else if (l === 2) {
        // Level 2: Double Tower gates (40 blocks)
        for (let y = -2; y <= 2; y++) {
          coords.push(v3(-2.5, y, -0.5)); coords.push(v3(-2.5, y, 0.5));
          coords.push(v3(-1.5, y, -0.5)); coords.push(v3(-1.5, y, 0.5));
          coords.push(v3(2.5, y, -0.5));  coords.push(v3(2.5, y, 0.5));
          coords.push(v3(1.5, y, -0.5));  coords.push(v3(1.5, y, 0.5));
        }
      } else if (l === 3) {
        // Level 3: U-shaped Throne Room (45 blocks)
        for (let x = -2; x <= 2; x++) {
          for (let z = -2; z <= 2; z++) {
            if (z === -2 || x === -2 || x === 2) {
              for (let y = -1; y <= 1; y++) {
                coords.push(v3(x, y, z));
              }
            }
          }
        }
      } else if (l === 4) {
        // Level 4: Grid-based Glacier Labyrinth (52 blocks)
        for (let x = -2; x <= 2; x++) {
          for (let y = -1; y <= 1; y++) {
            for (let z = -2; z <= 2; z++) {
              if ((x * z + y) % 2 === 0) {
                coords.push(v3(x, y, z));
              }
            }
          }
        }
      } else {
        // Level 5: Crystal Palace dome (64 blocks)
        for (let y = -2; y <= 2; y++) {
          const r = y === 2 ? 1.5 : y === 1 ? 2.5 : 3.5;
          const steps = y === 2 ? 8 : y === 1 ? 12 : 16;
          for (let i = 0; i < steps; i++) {
            const a = (i / steps) * Math.PI * 2;
            coords.push(v3(Math.round(Math.cos(a) * r), y, Math.round(Math.sin(a) * r)));
          }
        }
        for (let y = -1; y <= 3; y++) {
          coords.push(v3(-3, y, -3)); coords.push(v3(3, y, -3));
          coords.push(v3(-3, y, 3));  coords.push(v3(3, y, 3));
        }
      }

    } else {
      // World 6: Volcanic Land (Extreme structures & Doomsday challenges)
      if (l === 1) {
        // Level 1: Spherical Magma Shell around core (40 blocks)
        for (let x = -2; x <= 2; x++) {
          for (let y = -2; y <= 2; y++) {
            for (let z = -2; z <= 2; z++) {
              const d = Math.hypot(x, y, z);
              if (d > 1.8 && d < 2.8) {
                coords.push(v3(x, y, z));
              }
            }
          }
        }
      } else if (l === 2) {
        // Level 2: Stepped Lava Pit concentric rings (46 blocks)
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          coords.push(v3(Math.round(Math.cos(a) * 3), 1, Math.round(Math.sin(a) * 3)));
        }
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          coords.push(v3(Math.round(Math.cos(a) * 2), 0, Math.round(Math.sin(a) * 2)));
        }
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          coords.push(v3(Math.round(Math.cos(a) * 1.2), -1, Math.round(Math.sin(a) * 1.2)));
        }
        for (let y = -2; y <= 2; y++) {
          coords.push(v3(0, y, 0));
          coords.push(v3(1, y, 0));
        }
      } else if (l === 3) {
        // Level 3: Volcano Cone with side vents (52 blocks)
        for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) {
          if (Math.abs(x) === 3 || Math.abs(z) === 3) coords.push(v3(x, -1, z));
        }
        for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) {
          if (Math.abs(x) === 2 || Math.abs(z) === 2) coords.push(v3(x, 0, z));
        }
        for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) {
          if (Math.abs(x) === 1 || Math.abs(z) === 1) coords.push(v3(x, 1, z));
        }
        coords.push(v3(0, 2, 0)); coords.push(v3(0, -2, 0));
        coords.push(v3(1, 2, 0)); coords.push(v3(-1, 2, 0));
      } else if (l === 4) {
        // Level 4: Interlocking Diagonal Crossbones (58 blocks)
        for (let i = -4; i <= 4; i++) {
          coords.push(v3(i, i, 0)); coords.push(v3(i, i, 1));
          coords.push(v3(-i, i, 0)); coords.push(v3(-i, i, -1));
          coords.push(v3(0, i, i)); coords.push(v3(1, i, i));
          coords.push(v3(0, i, -i)); coords.push(v3(-1, i, -i));
        }
        coords.push(v3(0, 0, 0)); coords.push(v3(1, 0, 0));
      } else {
        // Level 5: Dense Doomsday Reactor Matrix (72 blocks)
        for (let x = -3; x <= 3; x++) {
          for (let y = -2; y <= 2; y++) {
            for (let z = -3; z <= 3; z++) {
              const d = Math.abs(x) + Math.abs(y) + Math.abs(z);
              if (d >= 3 && d <= 5) {
                coords.push(v3(x, y, z));
              }
            }
          }
        }
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
        // Fallback: pick the direction that has the fewest future blockers
        // (prefer directions along axes that have fewer placed blocks nearby)
        let bestDir = dirs[0];
        let minBlocked = Infinity;
        for (const d of dirs) {
          let blockCount = 0;
          for (const p of placed) {
            const diff = v3sub(p, pos);
            const dot = v3dot(diff, d);
            if (dot > 0.05) blockCount++;
          }
          if (blockCount < minBlocked) { minBlocked = blockCount; bestDir = d; }
        }
        blocks.push({ id: `b${id++}`, x: pos.x, y: pos.y, z: pos.z, dir: bestDir, type: 'normal' });
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

    // Define quantities based on World and Level
    let bombCount = 0;
    let keyChestPairs = 0;
    let rotatorCount = 0;
    let rainbowPct = 0;
    let portalPairs = 0;

    if (w === 2) {
      bombCount = l === 1 ? 1 : l < 4 ? 2 : 3;
      rotatorCount = l >= 2 ? (l < 4 ? 1 : 2) : 0;
      keyChestPairs = l >= 3 ? 1 : 0;
    } else if (w === 3) {
      bombCount = l < 3 ? 2 : 3;
      rotatorCount = l < 3 ? 1 : 2;
      keyChestPairs = l >= 3 ? 1 : 0;
      rainbowPct = 0.15;
      portalPairs = l >= 2 ? 1 : 0;
    } else if (w === 4) {
      bombCount = l < 3 ? 2 : 4;
      rotatorCount = l < 3 ? 2 : 3;
      keyChestPairs = l >= 3 ? (l === 5 ? 2 : 1) : 0;
      rainbowPct = 0.15;
      portalPairs = l >= 2 ? 1 : 0;
    } else if (w === 5) {
      bombCount = l < 3 ? 3 : 4;
      rotatorCount = l < 3 ? 2 : 4;
      keyChestPairs = l >= 3 ? (l >= 4 ? 2 : 1) : 0;
      rainbowPct = 0.20;
      portalPairs = l >= 2 ? (l >= 4 ? 2 : 1) : 0;
    } else if (w >= 6) {
      bombCount = l < 3 ? 3 : 5;
      rotatorCount = l < 3 ? 3 : 5;
      keyChestPairs = l >= 3 ? (l === 5 ? 3 : 2) : 0;
      rainbowPct = 0.20;
      portalPairs = 2;
    }

    // 1. Inject Bombs
    for (let i = 0; i < bombCount && si < shuffle.length; i++) {
      shuffle[si].type = 'bomb';
      si++;
    }

    // 2. Inject Key/Chest Pairs
    for (let i = 0; i < keyChestPairs && si + 1 < shuffle.length; i++) {
      const chestBlock = shuffle[si]; si++;
      const keyBlock = shuffle[si];   si++;
      chestBlock.type = 'chest';
      keyBlock.type = 'key';
      keyBlock.targetChestId = chestBlock.id;
    }

    // 3. Inject Rotators
    for (let i = 0; i < rotatorCount && si < shuffle.length; i++) {
      shuffle[si].type = 'rotator';
      si++;
    }

    // 4. Inject Rainbow Blocks
    if (rainbowPct > 0) {
      const count = Math.max(1, Math.round(normal.length * rainbowPct));
      for (let i = 0; i < count && si < shuffle.length; i++) {
        if (shuffle[si].type === 'normal') {
          shuffle[si].type = 'rainbow';
          si++;
        }
      }
    }

    // 5. Inject Portal Pairs
    for (let i = 0; i < portalPairs && si + 1 < shuffle.length; i++) {
      const portalA = shuffle[si]; si++;
      const portalB = shuffle[si]; si++;
      portalA.type = 'portal';
      portalB.type = 'portal';
      portalA.targetChestId = `portal_group_${i}`;
      portalB.targetChestId = `portal_group_${i}`;
    }
  }
}

export const levelGenerator = new LevelGenerator();
