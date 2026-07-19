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
import { HUD } from '../babylon/HUD';
import { BabylonEngine } from '../babylon/BabylonEngine';`);

// 2. Class declaration
content = content.replace(/export class GameScene extends Phaser\.Scene/g, 'export class GameScene implements IGameScene\n{\n  key = "Game";\n');

// 3. Scene init & create
content = content.replace(/init\(data: any\)/g, 'init(data: any)');
content = content.replace(/create\(\)/g, 'create(scene: any, data?: any)');

// 4. Tweens
content = content.replace(/this\.tweens\.add\(\{/g, 'TweenManager.add({');
content = content.replace(/this\.tweens\.killTweensOf\(/g, 'TweenManager.killTweensOf(');

// 5. Cameras
content = content.replace(/this\.cameras\.main\.shake\(/g, 'CameraEffects.shake(BabylonEngine.getInstance().getScene().activeCamera, ');
content = content.replace(/this\.cameras\.main\.flash\(/g, 'CameraEffects.flash(BabylonEngine.getInstance().getScene(), ');
content = content.replace(/this\.cameras\.main\.fadeOut\(/g, 'CameraEffects.fadeOut(BabylonEngine.getInstance().getScene(), ');
content = content.replace(/this\.cameras\.main\.zoomTo\(/g, '// CameraEffects.zoomTo(');

// 6. Time delayed call
content = content.replace(/this\.time\.delayedCall\(/g, 'TweenManager.delayedCall(');

// 7. Math
content = content.replace(/Phaser\.Math\.Clamp\(/g, 'Math.max(Math.min('); // manual fix needed later
content = content.replace(/Phaser\.Math\.Linear\(/g, '((a, b, t) => a + (b - a) * t)('); // works inline
content = content.replace(/Phaser\.Math\.Distance\.Between\(/g, 'Math.hypot('); // needs diffing

// 8. Properties (stubbing Phaser ones so it doesn't red squiggle too hard)
content = content.replace(/private time \! \: any;/g, '');

fs.writeFileSync(gameScenePath, content);
console.log('GameScene partially converted');
