/* main.ts — Phaser 3 game bootstrap */
import './style.css';
import Phaser from 'phaser';
import { BootScene }        from './scenes/BootScene';
import { MenuScene }        from './scenes/MenuScene';
import { WorldSelectScene } from './scenes/WorldSelectScene';
import { GameScene }        from './scenes/GameScene';
import { VictoryScene }     from './scenes/VictoryScene';
import { ShopScene }        from './scenes/ShopScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#0a001a',
  scene: [BootScene, MenuScene, WorldSelectScene, GameScene, VictoryScene, ShopScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight
  },
  render: {
    antialias: true,
    powerPreference: 'high-performance'
  },
  input: {
    activePointers: 3  // Support up to 3 touch points (pinch zoom)
  }
};

const game = new Phaser.Game(config);

// Handle resize
window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});

console.log('🎮 Arrow Buddies 3D — Phaser Edition initialized!');
