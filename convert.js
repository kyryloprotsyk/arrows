const fs = require('fs');
const path = require('path');

const gameScenePath = path.join(__dirname, 'src/scenes/GameScene.ts');
let content = fs.readFileSync(gameScenePath, 'utf8');

// 1. Imports
content = content.replace(/import Phaser from 'phaser';/g, 
`import { IGameScene } from '../babylon/SceneManager';
import { TweenManager } from '../babylon/TweenManager';
import { InputManager } from '../babylon/InputManager';
import { CameraEffects } from '../babylon/CameraEffects';
import { HUD } from '../babylon/HUD';`);

// 2. Class declaration
content = content.replace(/export class GameScene extends Phaser\.Scene/g, 'export class GameScene implements IGameScene');

// 3. Scene init & create
content = content.replace(/init\(data: any\)/g, 'init(data: any)');
content = content.replace(/create\(\)/g, 'create(scene: any, data?: any)');

// 4. Tweens
content = content.replace(/this\.tweens\.add\(\{/g, 'TweenManager.add({');
content = content.replace(/this\.tweens\.killTweensOf\(/g, 'TweenManager.killTweensOf(');

// 5. Cameras
content = content.replace(/this\.cameras\.main\.shake\(/g, 'CameraEffects.shake(BabylonBackground.camera, ');
content = content.replace(/this\.cameras\.main\.flash\(/g, 'CameraEffects.flash(BabylonEngine.getInstance().getScene(), ');
content = content.replace(/this\.cameras\.main\.fadeOut\(/g, 'CameraEffects.fadeOut(BabylonEngine.getInstance().getScene(), ');
content = content.replace(/this\.cameras\.main\.zoomTo\(/g, '// CameraEffects.zoomTo(');

// 6. Time delayed call
content = content.replace(/this\.time\.delayedCall\(/g, 'TweenManager.delayedCall(');

// 7. Math
content = content.replace(/Phaser\.Math\.Clamp\(/g, 'Math.max(Math.min('); // needs manual fix
content = content.replace(/Phaser\.Math\.Linear\(/g, '(a, b, t) => a + (b - a) * t; // Phaser.Math.Linear('); // manual fix
content = content.replace(/Phaser\.Math\.Distance\.Between\(/g, 'Math.hypot( // Phaser.Math.Distance.Between('); // manual fix

fs.writeFileSync(gameScenePath, content);
console.log('GameScene partially converted');
