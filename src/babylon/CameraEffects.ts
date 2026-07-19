/* CameraEffects.ts — Pure Babylon.js camera effects */
import { ArcRotateCamera, Color3, StandardMaterial, MeshBuilder, Scene, Plane } from '@babylonjs/core';
import { TweenManager } from './TweenManager';

export class CameraEffects {
  static shake(camera: ArcRotateCamera, duration: number, intensity: number) {
    // Simple shake using TweenManager
    const originalAlpha = camera.alpha;
    const originalBeta = camera.beta;
    const target = { val: 0 };
    
    TweenManager.add({
      targets: target,
      val: 1,
      duration: duration,
      ease: 'SineInOut',
      onUpdate: () => {
        const remaining = 1 - target.val;
        const currentIntensity = intensity * remaining;
        camera.alpha = originalAlpha + (Math.random() - 0.5) * currentIntensity;
        camera.beta = originalBeta + (Math.random() - 0.5) * currentIntensity;
      },
      onComplete: () => {
        camera.alpha = originalAlpha;
        camera.beta = originalBeta;
      }
    });
  }

  static flash(scene: Scene, duration: number, color: string = '#ffffff') {
    // Create a screen-space plane or a simple GUI rect to flash
    const rect = document.createElement('div');
    rect.style.position = 'absolute';
    rect.style.top = '0';
    rect.style.left = '0';
    rect.style.width = '100%';
    rect.style.height = '100%';
    rect.style.backgroundColor = color;
    rect.style.opacity = '1';
    rect.style.zIndex = '9999';
    rect.style.pointerEvents = 'none';
    document.body.appendChild(rect);

    const target = { opacity: 1 };
    TweenManager.add({
      targets: target,
      opacity: 0,
      duration: duration,
      onUpdate: () => {
        rect.style.opacity = target.opacity.toString();
      },
      onComplete: () => {
        if (document.body.contains(rect)) {
          document.body.removeChild(rect);
        }
      }
    });
  }

  static fadeOut(scene: Scene, duration: number, onComplete?: () => void) {
    const rect = document.createElement('div');
    rect.style.position = 'absolute';
    rect.style.top = '0';
    rect.style.left = '0';
    rect.style.width = '100%';
    rect.style.height = '100%';
    rect.style.backgroundColor = '#000000';
    rect.style.opacity = '0';
    rect.style.zIndex = '9999';
    rect.style.pointerEvents = 'none';
    document.body.appendChild(rect);

    const target = { opacity: 0 };
    TweenManager.add({
      targets: target,
      opacity: 1,
      duration: duration,
      onUpdate: () => {
        rect.style.opacity = target.opacity.toString();
      },
      onComplete: () => {
        if (onComplete) onComplete();
        // Don't remove immediately if navigating, new scene will clear DOM or we handle it in fadeIn
      }
    });
  }
}
