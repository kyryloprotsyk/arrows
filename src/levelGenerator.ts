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
    const blocks = this.backSolve(coords);
    this.injectSpecials(blocks, worldIndex, levelIndex);

    let multiplier = 1.35;
    if (worldIndex === 1) multiplier = 1.45;
    else if (worldIndex === 2) multiplier = 1.35;
    else if (worldIndex === 3) multiplier = 1.28;
    else if (worldIndex === 4) multiplier = 1.25;
    else if (worldIndex === 5) multiplier = 1.20;
    else if (worldIndex >= 6) multiplier = 1.15;

    const moveLimit = Math.max(12, Math.round(blocks.length * multiplier + 4));
    const par = Math.max(4, Math.round(blocks.length * 0.70));

    return {
      worldIndex, levelIndex,
      worldName: this.getWorldName(worldIndex),
      blocks,
      moveLimit,
      par
    };
  }

  private getShapeCoords(w: number, l: number): Vec3[] {
    const coords: Vec3[] = [];

    if (w === 1) {
      // World 1: Jelly Hills (Clean, Bubbly Intro Shapes — 6 to 12 blocks)
      if (l === 1) {
        // Compact Cross (7 blocks)
        coords.push(v3(0, 0, 0));
        for (const d of DIRS) coords.push(v3clone(d));
      } else if (l === 2) {
        // Floating Ring (8 blocks)
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          coords.push(v3(Math.round(Math.cos(a) * 1.3), 0, Math.round(Math.sin(a) * 1.3)));
        }
      } else if (l === 3) {
        // Mini pyramid (9 blocks)
        for (let x = -1; x <= 1; x++) {
          for (let z = -1; z <= 1; z++) {
            if (Math.abs(x) + Math.abs(z) <= 1) coords.push(v3(x, 0, z));
          }
        }
        coords.push(v3(0, 1, 0));
        coords.push(v3(0, -1, 0));
      } else if (l === 4) {
        // Tiny Hollow Cube Cage (10 blocks)
        coords.push(v3(-1, 0, -1), v3(1, 0, -1));
        coords.push(v3(-1, 0, 1), v3(1, 0, 1));
        coords.push(v3(0, 1, 0), v3(0, -1, 0));
        coords.push(v3(-1, -1, 0), v3(1, 1, 0));
        coords.push(v3(0, 0, -1), v3(0, 0, 1));
      } else {
        // Helix Spire (10 blocks)
        for (let y = -2; y <= 2; y++) {
          const a = (y / 2) * Math.PI;
          coords.push(v3(Math.round(Math.cos(a)), y, Math.round(Math.sin(a))));
          coords.push(v3(Math.round(Math.cos(a + Math.PI)), y, Math.round(Math.sin(a + Math.PI))));
        }
      }

    } else if (w === 2) {
      // World 2: Dino Valley (Prehistoric Shapes — 9 to 14 blocks)
      if (l === 1) {
        // Claw Plate (9 blocks)
        for (let x = -1; x <= 1; x++) {
          for (let z = -1; z <= 1; z++) {
            coords.push(v3(x, 0, z));
          }
        }
      } else if (l === 2) {
        // Enclosure Vault (10 blocks)
        coords.push(v3(0, 0, 0));
        coords.push(v3(0, 1, 0));
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          coords.push(v3(Math.round(Math.cos(a) * 1.5), 0, Math.round(Math.sin(a) * 1.5)));
        }
      } else if (l === 3) {
        // Propeller turbine (11 blocks)
        coords.push(v3(0, 0, 0));
        for (let i = 1; i <= 2; i++) {
          coords.push(v3(i, 0, 0));
          coords.push(v3(-i, 0, 0));
          coords.push(v3(0, 0, i));
          coords.push(v3(0, 0, -i));
          coords.push(v3(0, i, 0));
        }
      } else if (l === 4) {
        // Dino Claw footprint (12 blocks)
        for (let x = -1; x <= 1; x++) {
          coords.push(v3(x, 0, -1));
          coords.push(v3(x, 0, 1));
          coords.push(v3(x, 1, 0));
          coords.push(v3(x, -1, 0));
        }
      } else {
        // Mini Castle Ramparts (13 blocks)
        for (let x = -1; x <= 1; x++) {
          for (let z = -1; z <= 1; z++) {
            if (x !== 0 || z !== 0) coords.push(v3(x, 0, z));
          }
        }
        coords.push(v3(0, 0, 0));
        coords.push(v3(0, 1, 0));
        coords.push(v3(-1, 1, -1));
        coords.push(v3(1, 1, 1));
      }

    } else if (w === 3) {
      // World 3: Cosmo Station (Cyber Orbiters — 12 to 15 blocks)
      if (l === 1) {
        // Floating satellite dish (12 blocks)
        for (let y = -1; y <= 1; y++) coords.push(v3(0, y, 0));
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2;
          coords.push(v3(Math.round(Math.cos(a) * 1.5), 0, Math.round(Math.sin(a) * 1.5)));
        }
      } else if (l === 2) {
        // Binary star cores (12 blocks)
        for (let y = -1; y <= 0; y++) {
          for (let z = -1; z <= 1; z++) {
            coords.push(v3(-1.5, y, z));
            coords.push(v3(1.5, y, z));
          }
        }
      } else if (l === 3) {
        // Space Station Cylinder (12 blocks)
        for (let y = -1; y <= 1; y++) {
          for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2;
            coords.push(v3(Math.round(Math.cos(a)), y, Math.round(Math.sin(a))));
          }
        }
      } else if (l === 4) {
        // Vortex helix (12 blocks)
        for (let i = 0; i < 12; i++) {
          const a = (i / 6) * Math.PI * 2;
          coords.push(v3(Math.round(Math.cos(a)), Math.round(i / 4) - 1, Math.round(Math.sin(a))));
        }
      } else {
        // Cosmo Core matrix (14 blocks)
        for (let x = -1; x <= 1; x++) {
          for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
              if (Math.abs(x) + Math.abs(y) + Math.abs(z) === 1) {
                coords.push(v3(x, y, z));
              }
            }
          }
        }
        coords.push(v3(0, 0, 0));
        coords.push(v3(1, 1, 1), v3(-1, -1, -1));
      }

    } else if (w === 4) {
      // World 4: Coral Reef (Reef Chains — 12 to 16 blocks)
      if (l === 1) {
        // Coral branches (12 blocks)
        for (let y = -2; y <= 2; y++) coords.push(v3(0, y, 0));
        coords.push(v3(1, 1, 0), v3(2, 2, 0));
        coords.push(v3(-1, -1, 0), v3(-2, -2, 0));
        coords.push(v3(0, 0, 1), v3(0, 1, 2));
        coords.push(v3(0, -1, -1));
      } else if (l === 2) {
        // Whirlpool (12 blocks)
        for (let i = 0; i < 12; i++) {
          const a = (i / 4) * Math.PI * 2;
          const r = 2 - (i / 12);
          coords.push(v3(Math.round(Math.cos(a) * r), Math.round(i / 4) - 1, Math.round(Math.sin(a) * r)));
        }
      } else if (l === 3) {
        // Anchor (13 blocks)
        for (let y = -2; y <= 1; y++) coords.push(v3(0, y, 0));
        for (let x = -2; x <= 2; x++) coords.push(v3(x, 1, 0));
        coords.push(v3(-2, -1, 0), v3(2, -1, 0));
        coords.push(v3(-1, -2, 0), v3(1, -2, 0));
      } else if (l === 4) {
        // Chain Rings (14 blocks)
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          coords.push(v3(Math.round(Math.cos(a) * 1.5) - 1, Math.round(Math.sin(a) * 1.5), 0));
          coords.push(v3(Math.round(Math.cos(a) * 1.5) + 1, 0, Math.round(Math.sin(a) * 1.5)));
        }
      } else {
        // Reef Wall (15 blocks)
        for (let x = -1; x <= 1; x++) {
          for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
              if ((x + y + z) % 2 === 0) {
                coords.push(v3(x, y, z));
              }
            }
          }
        }
      }

    } else if (w === 5) {
      // World 5: Ice Castle (Chilled Spires — 13 to 18 blocks)
      if (l === 1) {
        // Frost Spire (14 blocks)
        for (let y = -2; y <= 2; y++) {
          const r = y === 0 ? 2 : 1;
          for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2;
            coords.push(v3(Math.round(Math.cos(a) * r), y, Math.round(Math.sin(a) * r)));
          }
        }
        coords.push(v3(0, 3, 0), v3(0, -3, 0));
      } else if (l === 2) {
        // Double Tower (14 blocks)
        for (let y = -1; y <= 1; y++) {
          coords.push(v3(-1.5, y, -0.5), v3(-1.5, y, 0.5));
          coords.push(v3(1.5, y, -0.5), v3(1.5, y, 0.5));
        }
        coords.push(v3(-1.5, 2, 0), v3(1.5, 2, 0));
      } else if (l === 3) {
        // Throne Room (15 blocks)
        for (let x = -1; x <= 1; x++) {
          for (let z = -1; z <= 1; z++) {
            if (z === -1 || x === -1 || x === 1) {
              coords.push(v3(x, -1, z));
              coords.push(v3(x, 0, z));
              coords.push(v3(x, 1, z));
            }
          }
        }
      } else if (l === 4) {
        // Glacier Labyrinth (16 blocks)
        for (let x = -2; x <= 2; x++) {
          for (let z = -2; z <= 2; z++) {
            if ((x + z) % 2 === 0) {
              coords.push(v3(x, 0, z));
            }
          }
        }
      } else {
        // Dome Castle (18 blocks)
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          coords.push(v3(Math.round(Math.cos(a) * 2), 0, Math.round(Math.sin(a) * 2)));
        }
        for (let y = -1; y <= 1; y++) {
          coords.push(v3(-1, y, -1), v3(1, y, 1));
        }
      }

    } else {
      // World 6: Volcanic Land (Extreme Crags — 14 to 20 blocks)
      if (l === 1) {
        // Magma Shell (14 blocks)
        for (let x = -1; x <= 1; x++) {
          for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
              if (Math.abs(x) + Math.abs(y) + Math.abs(z) === 2) {
                coords.push(v3(x, y, z));
              }
            }
          }
        }
      } else if (l === 2) {
        // concentric Pit (15 blocks)
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          coords.push(v3(Math.round(Math.cos(a) * 2), 0, Math.round(Math.sin(a) * 2)));
        }
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          coords.push(v3(Math.round(Math.cos(a) * 1.2), -1, Math.round(Math.sin(a) * 1.2)));
        }
        coords.push(v3(0, 1, 0));
      } else if (l === 3) {
        // Volcano Cone (16 blocks)
        for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) {
          if (Math.abs(x) === 2 || Math.abs(z) === 2) coords.push(v3(x, -1, z));
        }
        coords.push(v3(0, 0, 0), v3(0, 1, 0), v3(0, 2, 0), v3(1, 0, 0));
      } else if (l === 4) {
        // Crossbones (18 blocks)
        for (let i = -2; i <= 2; i++) {
          coords.push(v3(i, i, 0));
          coords.push(v3(-i, i, 0));
          coords.push(v3(0, i, i));
          coords.push(v3(0, i, -i));
        }
        coords.push(v3(0, 0, 0), v3(0, 1, 0));
      } else {
        // Reactor Core (20 blocks)
        for (let x = -2; x <= 2; x++) {
          for (let y = -1; y <= 1; y++) {
            for (let z = -2; z <= 2; z++) {
              const d = Math.abs(x) + Math.abs(y) + Math.abs(z);
              if (d >= 2 && d <= 3) {
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
