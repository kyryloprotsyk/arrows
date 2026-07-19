import { Scene, PBRMaterial, Color3, Material } from '@babylonjs/core';

export class PBRMaterials {
  private static cachedMaterials: Map<string, Material> = new Map();

  static getMaterialForBlock(
    scene: Scene,
    worldIndex: number,
    type: string,
    isPortalA?: boolean
  ): Material {
    const cacheKey = `${worldIndex}_${type}_${isPortalA ? 'A' : 'B'}`;
    let mat = this.cachedMaterials.get(cacheKey);
    if (mat) {
      // Ensure the material is not disposed and belongs to this scene
      if (mat.getScene() === scene) {
        return mat;
      }
      mat.dispose();
    }

    const newMat = this.createMaterial(scene, worldIndex, type, isPortalA);
    this.cachedMaterials.set(cacheKey, newMat);
    return newMat;
  }

  private static createMaterial(
    scene: Scene,
    worldIndex: number,
    type: string,
    isPortalA?: boolean
  ): Material {
    const matName = `mat_${worldIndex}_${type}_${isPortalA ? 'A' : 'B'}`;

    // ── Handle Eye details ───────────────────────────────────────────────
    if (type === 'eye_white') {
      const pbr = new PBRMaterial(matName, scene);
      pbr.albedoColor = new Color3(0.98, 0.98, 0.98);
      pbr.roughness = 0.2;
      pbr.metallic = 0.0;
      return pbr;
    }
    if (type === 'eye_black') {
      const pbr = new PBRMaterial(matName, scene);
      pbr.albedoColor = new Color3(0.05, 0.05, 0.05);
      pbr.roughness = 0.1;
      pbr.metallic = 0.0;
      return pbr;
    }
    if (type === 'eye_pink') {
      const pbr = new PBRMaterial(matName, scene);
      pbr.albedoColor = new Color3(0.98, 0.6, 0.7);
      pbr.roughness = 0.4;
      pbr.metallic = 0.0;
      return pbr;
    }

    // ── Handle Custom Platform Blocks ─────────────────────────────────────
    if (type === 'platform') {
      const pbr = new PBRMaterial(matName, scene);
      pbr.metallic = 0.0;
      pbr.roughness = 0.75;
      switch (worldIndex) {
        case 1: // Jelly Hills: sweet cream cookie platform
          pbr.albedoColor = new Color3(0.96, 0.88, 0.82); // Warm biscuit cream
          break;
        case 2: // Dino Valley: toy grass sod
          pbr.albedoColor = new Color3(0.45, 0.78, 0.3); // Bright Grass Green
          break;
        case 3: // Cosmo Station: clean toy plastic blue-grey
          pbr.albedoColor = new Color3(0.48, 0.58, 0.7);
          break;
        case 4: // Coral Reef: sandy beach beige
          pbr.albedoColor = new Color3(0.95, 0.85, 0.68);
          break;
        case 5: // Ice Castle: snow/frosty white
          pbr.albedoColor = new Color3(0.94, 0.97, 1.0);
          break;
        case 6: // Volcanic Land: terracotta red clay
          pbr.albedoColor = new Color3(0.72, 0.42, 0.32);
          break;
        default:
          pbr.albedoColor = new Color3(0.7, 0.7, 0.7);
          break;
      }
      return pbr;
    }

    // ── Handle Special Block Types ───────────────────────────────────────
    if (type === 'bomb') {
      const pbr = new PBRMaterial(matName, scene);
      pbr.albedoColor = new Color3(0.18, 0.18, 0.2); // Soft matte black clay
      pbr.metallic = 0.0;
      pbr.roughness = 0.6;
      return pbr;
    }

    if (type === 'key') {
      const pbr = new PBRMaterial(matName, scene);
      pbr.albedoColor = new Color3(0.98, 0.82, 0.2); // Saturated shiny gold
      pbr.metallic = 0.7;
      pbr.roughness = 0.2;
      pbr.emissiveColor = new Color3(0.15, 0.12, 0.03);
      return pbr;
    }

    if (type === 'chest') {
      const pbr = new PBRMaterial(matName, scene);
      pbr.albedoColor = new Color3(0.68, 0.44, 0.24); // Cartoon light wood trunk
      pbr.metallic = 0.1;
      pbr.roughness = 0.65;
      return pbr;
    }

    if (type === 'rotator') {
      const pbr = new PBRMaterial(matName, scene);
      pbr.albedoColor = new Color3(0.2, 0.6, 0.8); // Cute toy blue spinner
      pbr.metallic = 0.0;
      pbr.roughness = 0.45;
      return pbr;
    }

    if (type === 'portal') {
      const pbr = new PBRMaterial(matName, scene);
      if (isPortalA) {
        pbr.albedoColor = new Color3(0.15, 0.5, 0.9); // Cartoon blue portal
        pbr.emissiveColor = new Color3(0.08, 0.25, 0.45);
      } else {
        pbr.albedoColor = new Color3(0.95, 0.45, 0.1); // Cartoon orange portal
        pbr.emissiveColor = new Color3(0.45, 0.2, 0.05);
      }
      pbr.metallic = 0.0;
      pbr.roughness = 0.3;
      return pbr;
    }

    // ── Handle Standard World Palettes ───────────────────────────────────
    const pbr = new PBRMaterial(matName, scene);

    switch (worldIndex) {
      case 1: // Jelly (bright translucent strawberry gummy)
        pbr.albedoColor = new Color3(0.98, 0.55, 0.75); // Candy pink
        pbr.alpha = 0.88;
        pbr.metallic = 0.0;
        pbr.roughness = 0.15;
        pbr.subSurface.isRefractionEnabled = true;
        pbr.subSurface.indexOfRefraction = 1.35;
        pbr.subSurface.isTranslucencyEnabled = true;
        pbr.subSurface.translucencyIntensity = 0.8;
        pbr.clearCoat.isEnabled = true;
        pbr.clearCoat.intensity = 0.6;
        pbr.clearCoat.roughness = 0.1;
        break;

      case 2: // Forest (bright toy green)
        pbr.albedoColor = new Color3(0.35, 0.72, 0.28); // Vibrant meadow green
        pbr.metallic = 0.0;
        pbr.roughness = 0.6;
        break;

      case 3: // Cosmo Station/Cyber (bright playroom/cosmo banana yellow)
        pbr.albedoColor = new Color3(0.98, 0.8, 0.18); // Soft plastic yellow
        pbr.metallic = 0.0;
        pbr.roughness = 0.5;
        break;

      case 4: // Water (sky-glass aqua blue)
        pbr.albedoColor = new Color3(0.25, 0.72, 0.9); // Aqua blue
        pbr.alpha = 0.8;
        pbr.metallic = 0.0;
        pbr.roughness = 0.15;
        pbr.subSurface.isRefractionEnabled = true;
        pbr.subSurface.indexOfRefraction = 1.33;
        pbr.subSurface.isTranslucencyEnabled = true;
        pbr.subSurface.translucencyIntensity = 0.6;
        pbr.clearCoat.isEnabled = true;
        pbr.clearCoat.intensity = 0.9;
        pbr.clearCoat.roughness = 0.05;
        break;

      case 5: // Ice (frosty ice candy blue)
        pbr.albedoColor = new Color3(0.72, 0.9, 0.98); // Frosty cyan-blue
        pbr.alpha = 0.85;
        pbr.metallic = 0.0;
        pbr.roughness = 0.2;
        pbr.subSurface.isRefractionEnabled = true;
        pbr.subSurface.indexOfRefraction = 1.31;
        pbr.subSurface.isTranslucencyEnabled = true;
        pbr.subSurface.translucencyIntensity = 0.7;
        pbr.clearCoat.isEnabled = true;
        pbr.clearCoat.intensity = 1.0;
        pbr.clearCoat.roughness = 0.1;
        break;

      case 6: // Magma (bright volcanic terracotta clay orange)
        pbr.albedoColor = new Color3(0.95, 0.38, 0.24); // Saturated orange/red
        pbr.metallic = 0.0;
        pbr.roughness = 0.7;
        break;

      default: // Default toy grey
        pbr.albedoColor = new Color3(0.6, 0.6, 0.64);
        pbr.metallic = 0.0;
        pbr.roughness = 0.6;
        break;
    }

    return pbr;
  }

  static clearCache() {
    this.cachedMaterials.forEach(m => m.dispose());
    this.cachedMaterials.clear();
  }
}
