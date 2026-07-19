import {
  Scene,
  ArcRotateCamera,
  DirectionalLight,
  HemisphericLight,
  ShadowGenerator,
  Vector3,
  Color3,
  Color4,
  Mesh,
  MeshBuilder,
  Camera,
  DefaultRenderingPipeline,
  SSAO2RenderingPipeline
} from '@babylonjs/core';
import { PBRMaterials } from './PBRMaterials';
import { isMobileDevice } from './BabylonEngine';

export class BabylonBackground {
  private static camera: ArcRotateCamera | null = null;
  private static sunLight: DirectionalLight | null = null;
  private static shadowGenerator: ShadowGenerator | null = null;
  private static islandMeshes: Mesh[] = [];
  private static renderPipeline: DefaultRenderingPipeline | null = null;
  private static ssaoPipeline: SSAO2RenderingPipeline | null = null;

  static initScene(scene: Scene, worldIndex: number) {
    const mobile = isMobileDevice();

    // 1. Sky colour per world (bright, cheerful cartoon skies)
    const skyColors: Record<number, Color4> = {
      1: new Color4(0.95, 0.83, 0.95, 1.0), // Lilac Pink/Lavender
      2: new Color4(0.61, 0.88, 1.0, 1.0),  // Sunny Afternoon Sky Blue
      3: new Color4(1.0, 0.85, 0.72, 1.0),  // Sunset Warm Apricot Orange
      4: new Color4(0.62, 0.96, 0.94, 1.0),  // Bright Turquoise Lagoon
      5: new Color4(0.78, 0.94, 1.0, 1.0),  // Glacier Mint Ice Blue
      6: new Color4(1.0, 0.65, 0.52, 1.0)   // Warm Peach Campfire
    };
    scene.clearColor = skyColors[worldIndex] || new Color4(0.7, 0.85, 0.95, 1.0);

    // 2. Isometric orthographic camera
    const pitch = Math.atan(1.0 / Math.sqrt(2.0));
    this.camera = new ArcRotateCamera('isoCamera', -Math.PI / 4, pitch, 25.0, Vector3.Zero(), scene);
    this.camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    scene.activeCamera = this.camera;

    // 3. Directional sun light
    this.sunLight = new DirectionalLight('sunLight', new Vector3(-1.2, -2.5, -0.8), scene);
    this.sunLight.position = new Vector3(8.0, 15.0, 6.0);
    this.sunLight.intensity = 1.35; // Slightly brighter for cartoon style

    // 4. Ambient hemispheric light
    const ambientLight = new HemisphericLight('ambientLight', Vector3.Up(), scene);
    ambientLight.intensity = mobile ? 0.8 : 0.7; // Brighter ambient fill for cartoonish soft lighting // slightly brighter on mobile to compensate no shadows

    // 5. Shadow generator — smaller on mobile
    const shadowMapSize = mobile ? 512 : 1024;
    this.shadowGenerator = new ShadowGenerator(shadowMapSize, this.sunLight);
    if (mobile) {
      this.shadowGenerator.useExponentialShadowMap = true; // cheaper than blur
    } else {
      this.shadowGenerator.useBlurExponentialShadowMap = true;
      this.shadowGenerator.blurScale  = 2.0;
      this.shadowGenerator.blurKernel = 32;
    }

    // 6. Fog
    scene.fogMode    = Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.008;
    scene.fogColor   = new Color3(scene.clearColor.r, scene.clearColor.g, scene.clearColor.b);

    // 7. Post-processing — mobile gets minimal pipeline
    this.renderPipeline = new DefaultRenderingPipeline('defaultPipeline', !mobile /* HDR */, scene, [this.camera]);

    this.renderPipeline.bloomEnabled   = true;
    this.renderPipeline.bloomThreshold = mobile ? 0.9 : 0.8;
    this.renderPipeline.bloomWeight    = mobile ? 0.15 : 0.3;
    this.renderPipeline.samples        = mobile ? 1 : 4; // MSAA

    // Vignette (cheap, keep on mobile)
    this.renderPipeline.imageProcessing.vignetteEnabled   = true;
    this.renderPipeline.imageProcessing.vignetteWeight    = mobile ? 1.0 : 1.5;
    this.renderPipeline.imageProcessing.vignetteColor     = new Color4(0, 0, 0, 1);
    this.renderPipeline.imageProcessing.vignetteBlendMode = 0;

    // DoF — skip entirely on mobile (very expensive)
    this.renderPipeline.depthOfFieldEnabled = !mobile;
    if (!mobile) {
      this.renderPipeline.depthOfField.focusDistance = 15000;
      this.renderPipeline.depthOfField.focalLength   = 50;
      this.renderPipeline.depthOfField.fStop         = 1.4;
    }

    // SSAO — skip entirely on mobile (biggest GPU cost)
    if (!mobile) {
      this.ssaoPipeline               = new SSAO2RenderingPipeline('ssao', scene, 0.5, [this.camera]);
      this.ssaoPipeline.radius        = 2.0;
      this.ssaoPipeline.totalStrength = 1.0;
      this.ssaoPipeline.expensiveBlur = false; // cheaper even on desktop
      this.ssaoPipeline.samples       = 8;    // reduced from 16
      this.ssaoPipeline.maxZ          = 100;
    }
  }

  static getCamera(): ArcRotateCamera | null {
    return this.camera;
  }

  static getShadowGenerator(): ShadowGenerator | null {
    return this.shadowGenerator;
  }

  static updateProjection(width: number, height: number, zoom: number, panX: number, panY: number) {
    if (!this.camera) return;

    const aspect = width / height;
    
    // Scale viewport bounds using a virtual width factor of 7.2
    const virtualW = 7.2 / zoom;
    const halfW = virtualW * 0.5;
    const halfH = halfW / aspect;

    this.camera.orthoLeft = -halfW;
    this.camera.orthoRight = halfW;
    this.camera.orthoTop = halfH;
    this.camera.orthoBottom = -halfH;

    // Sync camera target to follow the panning offsets
    // Convert 2D pan offsets to 3D orthographic plane shifts
    // PanX and PanY shift the camera target along screen space horizontal/vertical axes
    const forward = this.camera.getForwardRay().direction;
    const right = Vector3.Cross(forward, Vector3.Up()).normalize();
    const up = Vector3.Cross(right, forward).normalize();

    // Standard scaling factors for screen-to-world isometric projection mapping
    const panFactor = 0.0088; 
    this.camera.target = right.scale(-panX * panFactor).add(up.scale(-panY * panFactor));
  }

  static drawFloatingIsland(scene: Scene, footprint: { x: number; z: number }[], worldIndex: number) {
    // Clean old platform meshes
    this.islandMeshes.forEach(m => m.dispose());
    this.islandMeshes = [];

    const _soilColors: Record<number, Color3> = {
      1: new Color3(0.58, 0.41, 0.8),
      2: new Color3(0.35, 0.22, 0.11),
      3: new Color3(0.08, 0.1, 0.13),
      4: new Color3(0.0, 0.32, 0.5),
      5: new Color3(0.51, 0.65, 0.79),
      6: new Color3(0.18, 0.05, 0.05)
    };
    void _soilColors; // reserved for future side panel rendering

    footprint.forEach(c => {
      // Platform tile box (slabs)
      // width/depth slightly smaller than 1.0 (e.g. 0.96) to draw visual gaps/seams
      const tile = MeshBuilder.CreateBox(
        `platform_${c.x}_${c.z}`,
        { width: 0.97, height: 0.25, depth: 0.97 },
        scene
      );

      // Pivot bottom aligned with y = 0
      tile.position.set(c.x, -0.125, c.z);
      tile.receiveShadows = true;

      // Assign realistic surface material using PBRMaterials cache
      const mat = PBRMaterials.getMaterialForBlock(scene, worldIndex, 'platform');
      tile.material = mat;

      this.islandMeshes.push(tile);
    });
  }

  static cleanup() {
    this.islandMeshes.forEach(m => m.dispose());
    this.islandMeshes = [];
    this.camera = null;
    this.sunLight = null;
    this.shadowGenerator = null;
    if (this.renderPipeline) {
      this.renderPipeline.dispose();
      this.renderPipeline = null;
    }
    if (this.ssaoPipeline) {
      this.ssaoPipeline.dispose();
      this.ssaoPipeline = null;
    }
  }
}
