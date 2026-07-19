import { Scene, Mesh, MeshBuilder, TransformNode, Color3 } from '@babylonjs/core';
import { PBRMaterials } from './PBRMaterials';

// Helper: cast a TransformNode child to Mesh safely
function asMesh(node: unknown): Mesh | null {
  return (node instanceof Mesh) ? node : null;
}

// Attach a body mesh reference onto the parent node via a custom property
const BODY_KEY = '__bodyMesh';

export class BlockMeshPool {
  private static pool: TransformNode[] = [];

  static acquire(scene: Scene, worldIndex: number, type: string, isPortalA?: boolean): TransformNode {
    let node = this.pool.pop();

    if (!node) {
      node = this.createBlockHierarchy(scene);
    }

    node.setEnabled(true);
    node.scaling.set(1, 1, 1);
    node.rotation.set(0, 0, 0);
    node.position.set(0, 0, 0);

    // Apply the correct PBR material to the body cube mesh
    const bodyMesh = (node as any)[BODY_KEY] as Mesh | null;
    if (bodyMesh) {
      bodyMesh.material = PBRMaterials.getMaterialForBlock(scene, worldIndex, type, isPortalA);
    }

    this.configureSpecialTypeDetails(node, type, scene);

    return node;
  }

  static release(node: TransformNode) {
    node.setEnabled(false);
    node.parent = null;
    this.pool.push(node);
  }

  static clearPool() {
    this.pool.forEach(node => node.dispose());
    this.pool = [];
  }

  private static createBlockHierarchy(scene: Scene): TransformNode {
    const parent = new TransformNode('block_root', scene);

    // Base body cube mesh — pivot at bottom
    const body = MeshBuilder.CreateBox('body', { size: 1.0 }, scene);
    body.position.y = 0.5;
    body.parent = parent;
    body.receiveShadows = true;

    // Store body reference on parent for fast retrieval
    (parent as any)[BODY_KEY] = body;

    // Face elements root
    const faceRoot = new TransformNode('face_root', scene);
    faceRoot.parent = parent;
    faceRoot.position.set(0, 0.5, 0.51);

    const eyeL = MeshBuilder.CreateBox('eye_l', { width: 0.16, height: 0.16, depth: 0.02 }, scene);
    eyeL.position.set(-0.2, 0.1, 0);
    eyeL.parent = faceRoot;

    const eyeR = MeshBuilder.CreateBox('eye_r', { width: 0.16, height: 0.16, depth: 0.02 }, scene);
    eyeR.position.set(0.2, 0.1, 0);
    eyeR.parent = faceRoot;

    const pupilL = MeshBuilder.CreateBox('pupil_l', { width: 0.07, height: 0.07, depth: 0.03 }, scene);
    pupilL.position.set(-0.2, 0.1, 0.01);
    pupilL.parent = faceRoot;

    const pupilR = MeshBuilder.CreateBox('pupil_r', { width: 0.07, height: 0.07, depth: 0.03 }, scene);
    pupilR.position.set(0.2, 0.1, 0.01);
    pupilR.parent = faceRoot;

    const blushL = MeshBuilder.CreateBox('blush_l', { width: 0.12, height: 0.06, depth: 0.02 }, scene);
    blushL.position.set(-0.25, -0.05, 0);
    blushL.parent = faceRoot;

    const blushR = MeshBuilder.CreateBox('blush_r', { width: 0.12, height: 0.06, depth: 0.02 }, scene);
    blushR.position.set(0.25, -0.05, 0);
    blushR.parent = faceRoot;

    const mouth = MeshBuilder.CreateBox('mouth', { width: 0.1, height: 0.03, depth: 0.02 }, scene);
    mouth.position.set(0, -0.08, 0);
    mouth.parent = faceRoot;

    // Apply face materials
    eyeL.material = PBRMaterials.getMaterialForBlock(scene, 0, 'eye_white');
    eyeR.material = PBRMaterials.getMaterialForBlock(scene, 0, 'eye_white');
    pupilL.material = PBRMaterials.getMaterialForBlock(scene, 0, 'eye_black');
    pupilR.material = PBRMaterials.getMaterialForBlock(scene, 0, 'eye_black');
    mouth.material = PBRMaterials.getMaterialForBlock(scene, 0, 'eye_black');
    blushL.material = PBRMaterials.getMaterialForBlock(scene, 0, 'eye_pink');
    blushR.material = PBRMaterials.getMaterialForBlock(scene, 0, 'eye_pink');

    return parent;
  }

  private static configureSpecialTypeDetails(node: TransformNode, type: string, scene: Scene) {
    // Toggle face visibility for chest blocks (no face needed)
    const faceRoot = node.getChildren().find(c => c.name === 'face_root');
    if (faceRoot) {
      faceRoot.setEnabled(type !== 'chest');
    }

    // Disable existing special extras by default
    ['special_fuse', 'special_chest_lock', 'special_rotator_ring'].forEach(name => {
      const c = node.getChildren().find(c => c.name === name);
      if (c) c.setEnabled(false);
    });

    if (type === 'bomb') {
      let fuse = node.getChildren().find(c => c.name === 'special_fuse');
      if (!fuse) {
        const fuseMesh = MeshBuilder.CreateCylinder('special_fuse', { diameter: 0.06, height: 0.35 }, scene);
        fuseMesh.position.set(0, 1.1, 0);
        fuseMesh.parent = node;
        fuseMesh.material = PBRMaterials.getMaterialForBlock(scene, 0, 'eye_black');
        fuse = fuseMesh;
      }
      fuse.setEnabled(true);
    } else if (type === 'chest') {
      let lock = node.getChildren().find(c => c.name === 'special_chest_lock');
      if (!lock) {
        const lockMesh = MeshBuilder.CreateBox('special_chest_lock', { width: 0.3, height: 0.2, depth: 0.08 }, scene);
        lockMesh.position.set(0, 0.5, 0.51);
        lockMesh.parent = node;
        lockMesh.material = PBRMaterials.getMaterialForBlock(scene, 0, 'key');
        lock = lockMesh;
      }
      lock.setEnabled(true);
    } else if (type === 'rotator') {
      let ring = node.getChildren().find(c => c.name === 'special_rotator_ring');
      if (!ring) {
        const ringMesh = MeshBuilder.CreateTorus('special_rotator_ring', { diameter: 0.7, thickness: 0.09 }, scene);
        const ringNode = ringMesh as Mesh;
        ringNode.position.set(0, 0.5, 0);
        ringNode.rotation.set(Math.PI / 2, 0, 0);
        ringNode.parent = node;
        ringNode.material = PBRMaterials.getMaterialForBlock(scene, 0, 'key');
        ring = ringNode;
      }
      ring.setEnabled(true);
    }
  }

  static createArrowIndicator(scene: Scene): Mesh {
    // Arrow pointing down
    const cylinder = MeshBuilder.CreateCylinder('arrow_cyl', { diameter: 0.15, height: 0.3 }, scene);
    cylinder.position.y = 0.3;
    const cone = MeshBuilder.CreateCylinder('arrow_cone', { diameterTop: 0.3, diameterBottom: 0, height: 0.2 }, scene);
    cone.position.y = 0.05;
    
    const arrow = Mesh.MergeMeshes([cylinder, cone], true, true, undefined, false, true);
    if (arrow) {
      arrow.name = 'arrow_indicator';
      arrow.material = PBRMaterials.getMaterialForBlock(scene, 0, 'eye_white'); // glowing white/blue ideally
      // Glow emissive
      (arrow.material as any).emissiveColor = new (Color3 as any)(0.5, 0.8, 1.0);
    }
    return arrow as Mesh;
  }

  static applyHat(scene: Scene, node: TransformNode, skin: string) {
    const existing = node.getChildren().find(c => c.name.startsWith('hat_'));
    if (existing) {
      if (existing.name === `hat_${skin}`) {
        existing.setEnabled(true);
        return;
      }
      existing.setEnabled(false); // Disable old hat
    }

    if (skin === 'none') return;

    let hatMesh: Mesh | null = null;
    
    if (skin === 'wizard') {
      const cone = MeshBuilder.CreateCylinder(`hat_${skin}`, { diameterTop: 0, diameterBottom: 0.8, height: 1.0 }, scene);
      cone.position.set(0, 1.5, 0);
      cone.material = PBRMaterials.getMaterialForBlock(scene, 0, 'eye_pink'); // placeholder purple-ish
      hatMesh = cone;
    } else if (skin === 'crown') {
      const crown = MeshBuilder.CreateCylinder(`hat_${skin}`, { diameter: 0.6, height: 0.3 }, scene);
      crown.position.set(0, 1.15, 0);
      crown.material = PBRMaterials.getMaterialForBlock(scene, 0, 'key'); // Gold
      hatMesh = crown;
    } else if (skin === 'propeller') {
      const base = MeshBuilder.CreateCylinder('base', { diameter: 0.4, height: 0.2 }, scene);
      const blade = MeshBuilder.CreateBox('blade', { width: 0.8, height: 0.05, depth: 0.1 }, scene);
      blade.position.y = 0.15;
      const merged = Mesh.MergeMeshes([base, blade], true);
      if (merged) {
        merged.name = `hat_${skin}`;
        merged.position.set(0, 1.1, 0);
        merged.material = PBRMaterials.getMaterialForBlock(scene, 0, 'rotator');
        hatMesh = merged;
      }
    } else if (skin === 'halo') {
      const halo = MeshBuilder.CreateTorus(`hat_${skin}`, { diameter: 0.6, thickness: 0.08 }, scene);
      halo.position.set(0, 1.4, 0);
      halo.material = PBRMaterials.getMaterialForBlock(scene, 0, 'eye_white');
      (halo.material as any).emissiveColor = new (Color3 as any)(1.0, 0.8, 0.2);
      hatMesh = halo;
    }

    if (hatMesh) {
      hatMesh.parent = node;
    }
  }
}
