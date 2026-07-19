import { Scene, TransformNode } from '@babylonjs/core';
import { BlockMeshPool } from './BlockMeshPool';
import { BabylonBackground } from './BabylonBackground';
import { getTileW, getTileH, getBlockH, gridToScreen } from '../utils/IsoHelper';

interface SyncBuddy {
  id: string;
  x: number;
  y: number;
  z: number;
  type: string;
  state: string;
  sx: number;
  sy: number;
  dir: { x: number; y: number; z: number };
  targetChestId?: string;
  jellyScalePara: number;
  jellyScalePerp: number;
  jellyAngle: number;
}

export class BabylonBlockScene {
  private static activeMeshes: Map<string, TransformNode> = new Map();
  private static scene: Scene | null = null;
  private static worldIndex = 1;

  static create(scene: Scene, footprint: { x: number; z: number }[], worldIndex: number) {
    this.scene = scene;
    this.worldIndex = worldIndex;

    // Clean old meshes and pools
    this.activeMeshes.forEach(mesh => BlockMeshPool.release(mesh));
    this.activeMeshes.clear();
    BlockMeshPool.clearPool();

    // Initialize environment elements
    BabylonBackground.initScene(scene, worldIndex);
    BabylonBackground.drawFloatingIsland(scene, footprint, worldIndex);
  }

  static syncBlocks(
    buddies: SyncBuddy[],
    rotState: number,
    zoom: number,
    panX: number,
    panY: number,
    width: number,
    height: number
  ) {
    if (!this.scene) return;

    // 1. Update camera zoom and panning offsets
    BabylonBackground.updateProjection(width, height, zoom, panX, panY);

    // Sync camera yaw based on rotation state
    const camera = BabylonBackground.getCamera();
    if (camera) {
      // Snaps to -45°, -135°, -225°, -315°
      camera.alpha = -Math.PI / 4 - rotState * (Math.PI / 2);
    }

    // 2. Track current buddy IDs to clean up escaped/deleted blocks
    const activeIds = new Set<string>();

    buddies.forEach(b => {
      activeIds.add(b.id);
      let node = this.activeMeshes.get(b.id);

      const isPortalA = b.type === 'portal' && buddies.filter(x => x.type === 'portal').indexOf(b) % 2 === 0;

      if (!node) {
        // Acquire fresh block from Pool
        node = BlockMeshPool.acquire(this.scene!, this.worldIndex, b.type, isPortalA);
        this.activeMeshes.set(b.id, node);

        // Add shadow caster for body mesh (pool returns a TransformNode)
        const shadowGen = BabylonBackground.getShadowGenerator();
        if (shadowGen) {
          const meshes = (node as any).getChildMeshes ? (node as any).getChildMeshes() : [];
          for (const m of meshes) shadowGen.addShadowCaster(m);
        }
      }

      // 3. Project 2D animated screen displacement back to 3D world coords
      const base = gridToScreen(b.x, b.y, b.z, rotState);
      const dx = b.sx - base.x;
      const dy = b.sy - base.y;

      const offset = this.get3DOffset(dx, dy, b.dir, rotState);

      // Position block in 3D space
      node.position.set(b.x + offset.x, b.y + offset.y, b.z + offset.z);

      // 4. Apply organic Jelly squash & stretch scaling
      node.scaling.set(b.jellyScalePara, b.jellyScalePerp, b.jellyScalePara);

      // Set eye blinking/blush overlays active based on status
      const faceRoot = node.getChildren().find(c => c.name === 'face_root');
      if (faceRoot instanceof TransformNode) {
        faceRoot.rotation.z = Math.sin(b.jellyAngle) * 0.05;
      }
    });

    // 5. Clean up nodes for blocks that have completed escaping
    this.activeMeshes.forEach((node, id) => {
      if (!activeIds.has(id)) {
        BlockMeshPool.release(node);
        this.activeMeshes.delete(id);
      }
    });
  }

  private static get3DOffset(
    dx: number,
    dy: number,
    dir: { x: number; y: number; z: number },
    rotState: number
  ): { x: number; y: number; z: number } {
    const tw = getTileW();
    const th = getTileH();
    const bh = getBlockH();

    // If moving vertically (gravity fall or vertical escape)
    if (dir.y !== 0) {
      return { x: 0, y: -dy / bh, z: 0 };
    }

    // Horizontal offset mapping
    const ix_offset = (dx / tw + dy / th) / 2;
    const iz_offset = (dy / th - dx / tw) / 2;

    // Rotate back based on current view angle (rotState)
    let gx_offset = ix_offset;
    let gz_offset = iz_offset;
    switch (((rotState % 4) + 4) % 4) {
      case 1: // [iz, -gx]
        gx_offset = -iz_offset;
        gz_offset = ix_offset;
        break;
      case 2: // [-gx, -gz]
        gx_offset = -ix_offset;
        gz_offset = -iz_offset;
        break;
      case 3: // [-gz, gx]
        gx_offset = iz_offset;
        gz_offset = -ix_offset;
        break;
    }

    return { x: gx_offset, y: 0, z: gz_offset };
  }

  static destroy() {
    this.activeMeshes.forEach(mesh => BlockMeshPool.release(mesh));
    this.activeMeshes.clear();
    BlockMeshPool.clearPool();
    BabylonBackground.cleanup();
    this.scene = null;
  }
}
