/* main.ts — Phaser 3 game bootstrap */
import './style.css';
import Phaser from 'phaser';
import { BootScene }        from './scenes/BootScene';
import { MenuScene }        from './scenes/MenuScene';
import { WorldSelectScene } from './scenes/WorldSelectScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { GameScene }        from './scenes/GameScene';
import { VictoryScene }     from './scenes/VictoryScene';
import { ShopScene }        from './scenes/ShopScene';
import { DailyChallengeScene } from './scenes/DailyChallengeScene';
import { LeaderboardScene }    from './scenes/LeaderboardScene';
import { ProfileScene }        from './scenes/ProfileScene';
import { DefeatScene }      from './scenes/DefeatScene';

/** Returns the true viewport size — respects dvh on iOS/Android. */
function getViewport() {
  // visualViewport is more reliable than innerWidth/innerHeight on mobile
  const vvp = window.visualViewport;
  return {
    w: vvp ? vvp.width  : window.innerWidth,
    h: vvp ? vvp.height : window.innerHeight
  };
}

const { w, h } = getViewport();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#0a001a',
  scene: [BootScene, MenuScene, WorldSelectScene, LevelSelectScene, GameScene, VictoryScene, DefeatScene, ShopScene, DailyChallengeScene, LeaderboardScene, ProfileScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: w,
    height: h
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

/** Resize handler — also fires on orientation change. */
function onResize() {
  const { w: nw, h: nh } = getViewport();
  game.scale.resize(nw, nh);
}

window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => {
  // Short delay gives the browser time to re-layout after rotation
  setTimeout(onResize, 150);
});

// Also listen on visualViewport (handles soft-keyboard appearing/disappearing)
window.visualViewport?.addEventListener('resize', onResize);

console.log('🎮 Arrow Buddies 3D — Phaser Edition initialized!');
