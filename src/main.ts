/* main.ts — Pure Babylon.js bootstrap */
import './style.css';
import { BabylonEngine } from './babylon/BabylonEngine';
import { SceneManager } from './babylon/SceneManager';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { WorldSelectScene } from './scenes/WorldSelectScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { GameScene } from './scenes/GameScene';
import { VictoryScene } from './scenes/VictoryScene';
import { ShopScene } from './scenes/ShopScene';
import { DailyChallengeScene } from './scenes/DailyChallengeScene';
import { LeaderboardScene } from './scenes/LeaderboardScene';
import { ProfileScene } from './scenes/ProfileScene';
import { DefeatScene } from './scenes/DefeatScene';

const canvas = document.getElementById('babylon-canvas') as HTMLCanvasElement;
BabylonEngine.getInstance().init(canvas);

// Register scenes
SceneManager.register('Boot', BootScene);
SceneManager.register('Menu', MenuScene);
SceneManager.register('WorldSelect', WorldSelectScene);
SceneManager.register('LevelSelect', LevelSelectScene);
SceneManager.register('Game', GameScene);
SceneManager.register('Victory', VictoryScene);
SceneManager.register('Defeat', DefeatScene);
SceneManager.register('Shop', ShopScene);
SceneManager.register('DailyChallenge', DailyChallengeScene);
SceneManager.register('Leaderboard', LeaderboardScene);
SceneManager.register('Profile', ProfileScene);

// Start game
SceneManager.start('Boot').catch(console.error);

console.log('🎮 Arrow Buddies 3D — Babylon Edition initialized!');
