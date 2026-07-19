/* ShopScene.ts — Babylon.js Shop / Gacha Scene */
import type { IGameScene } from '../babylon/SceneManager';
import { BabylonGUI } from '../babylon/BabylonGUI';
import { SceneManager } from '../babylon/SceneManager';
import { TweenManager } from '../babylon/TweenManager';
import { BabylonBackground } from '../babylon/BabylonBackground';
import { BabylonBlockScene } from '../babylon/BabylonBlockScene';
import { GameData } from '../utils/GameData';
import { audio } from '../audio';
import { Control, TextBlock, Rectangle, Button, StackPanel, ScrollViewer } from '@babylonjs/gui';
import type { Scene as BjsScene } from '@babylonjs/core';

const SKINS = [
  { id: 'none',     name: 'No Hat',      emoji: '😊', rarity: 'common',    hue: 200 },
  { id: 'wizard',   name: 'Wizard Hat',  emoji: '🧙', rarity: 'rare',      hue: 270 },
  { id: 'crown',    name: 'Crown',       emoji: '👑', rarity: 'epic',      hue: 45  },
  { id: 'cat',      name: 'Cat Ears',    emoji: '🐱', rarity: 'common',    hue: 330 },
  { id: 'tophat',   name: 'Top Hat',     emoji: '🎩', rarity: 'rare',      hue: 210 },
  { id: 'chef',     name: 'Chef Hat',    emoji: '👨‍🍳', rarity: 'common',    hue: 30  },
  { id: 'propeller',name: 'Propeller',   emoji: '🪁', rarity: 'epic',      hue: 150 },
  { id: 'rainbow',  name: 'Rainbow',     emoji: '🌈', rarity: 'legendary', hue: 180 },
  { id: 'dragon',   name: 'Dragon Head', emoji: '🐉', rarity: 'legendary', hue: 10  },
  { id: 'golden_crown', name: 'Gold Trophy Crown', emoji: '👑', rarity: 'legendary', hue: 50 }
];

const RARITY_COLORS: Record<string, string> = {
  common: '#95a5a6', rare: '#2980b9', epic: '#8e44ad', legendary: '#f39c12'
};

const RARITY_BG: Record<string, string> = {
  common: '#f0f0f0', rare: '#eaf0fb', epic: '#f5eafb', legendary: '#fffbe6'
};

const RARITY_SHADOW: Record<string, string> = {
  common: '#bdc3c7', rare: '#2980b9', epic: '#8e44ad', legendary: '#e67e22'
};

const GACHA_COST = 50;

export class ShopScene implements IGameScene {
  key = 'Shop';
  private coinsTxt!: TextBlock;
  private gachaMachineBtn!: Button;

  create(scene: BjsScene) {
    BabylonBackground.initScene(scene, 3); // Cosmo station BG

    const gui = BabylonGUI.createFullscreenUI('shop_ui');

    // Warm peach background
    const bg = new Rectangle();
    bg.width = '100%'; bg.height = '100%';
    bg.background = '#fff5ea'; bg.thickness = 0;
    gui.addControl(bg);

    // Title
    const title = new TextBlock();
    title.text = '✨ Skins Wardrobe';
    title.color = '#9b59b6';
    title.fontSize = 36;
    title.fontStyle = 'bold';
    title.fontFamily = 'Fredoka, sans-serif';
    title.shadowColor = '#5c3d2e';
    title.shadowBlur = 0;
    title.shadowOffsetX = 3;
    title.shadowOffsetY = 3;
    title.top = '-45%';
    title.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    title.alpha = 0;
    gui.addControl(title);
    TweenManager.add({ targets: title, alpha: 1, duration: 500, delay: 100 });

    // Coins
    this.coinsTxt = new TextBlock();
    this.coinsTxt.text = `🪙 Coins: ${GameData.coins.get()}`;
    this.coinsTxt.color = '#f39c12';
    this.coinsTxt.fontSize = 20;
    this.coinsTxt.fontStyle = 'bold';
    this.coinsTxt.fontFamily = 'Fredoka, sans-serif';
    this.coinsTxt.top = '-38%';
    this.coinsTxt.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.coinsTxt.alpha = 0;
    gui.addControl(this.coinsTxt);
    TweenManager.add({ targets: this.coinsTxt, alpha: 1, duration: 500, delay: 200 });

    // Scroll
    const scroller = new ScrollViewer('shop_scroll');
    scroller.width = '380px'; scroller.height = '50%';
    scroller.top = '-5%';
    scroller.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    scroller.thickness = 0; scroller.color = 'transparent';
    gui.addControl(scroller);

    const panel = new StackPanel();
    panel.isVertical = true; panel.width = '100%';
    scroller.addControl(panel);

    const unlockedSet = new Set(GameData.unlockedSkins.get());
    const active = GameData.activeSkin.get();

    SKINS.forEach((skin, i) => {
      const isUnlocked = unlockedSet.has(skin.id);
      const isActive = active === skin.id;
      const bg = isActive ? '#fffbe6' : isUnlocked ? RARITY_BG[skin.rarity] : '#f5f5f5';
      const border = isActive ? '#f39c12' : isUnlocked ? RARITY_COLORS[skin.rarity] : '#d5c7b3';
      const shadow = isActive ? '#e67e22' : isUnlocked ? RARITY_SHADOW[skin.rarity] : '#bdc3c7';

      const row = Button.CreateSimpleButton(`btn_skin_${skin.id}`, '');
      row.width = '340px'; row.height = '56px';
      row.background = bg;
      row.color = border;
      row.cornerRadius = 16; row.thickness = 3;
      row.paddingBottom = '8px';
      row.shadowColor = shadow;
      row.shadowBlur = 0;
      row.shadowOffsetX = 0;
      row.shadowOffsetY = isActive ? 4 : 3;
      row.alpha = 0;
      panel.addControl(row);

      const rowTxt = new TextBlock();
      rowTxt.text = isUnlocked ? `${skin.emoji}  ${skin.name}   ${isActive ? '✅' : ''}` : `🔒 ???  (${skin.rarity})`;
      rowTxt.color = isUnlocked ? (isActive ? '#7f3d00' : RARITY_COLORS[skin.rarity]) : '#bdc3c7';
      rowTxt.fontSize = 16;
      rowTxt.fontStyle = 'bold';
      rowTxt.fontFamily = 'Fredoka, sans-serif';
      row.addControl(rowTxt);

      TweenManager.add({ targets: row, alpha: 1, duration: 350, delay: 300 + i * 50 });

      if (isUnlocked) {
        row.onPointerEnterObservable.add(() => { row.scaleX = 1.02; row.scaleY = 1.02; row.shadowOffsetY = 5; });
        row.onPointerOutObservable.add(() => { row.scaleX = 1.0; row.scaleY = 1.0; row.shadowOffsetY = isActive ? 4 : 3; });
        row.onPointerDownObservable.add(() => { row.scaleX = 0.98; row.scaleY = 0.98; row.shadowOffsetY = 1; });
        row.onPointerUpObservable.add(() => {
          row.scaleX = 1.0; row.scaleY = 1.0;
          row.shadowOffsetY = isActive ? 4 : 3;
          audio.playTap();
          GameData.activeSkin.set(skin.id);
          SceneManager.start('Shop'); // Simple refresh
        });
      }
    });

    // Gacha Button (purple cartoon button)
    const canAfford = GameData.coins.get() >= GACHA_COST;
    this.gachaMachineBtn = Button.CreateSimpleButton('btn_gacha', `🎰 Roll Gacha (${GACHA_COST} 🪙)`);
    this.gachaMachineBtn.width = '280px'; this.gachaMachineBtn.height = '60px';
    this.gachaMachineBtn.color = '#ffffff'; this.gachaMachineBtn.fontSize = 18;
    this.gachaMachineBtn.fontStyle = 'bold';
    this.gachaMachineBtn.fontFamily = 'Fredoka, sans-serif';
    this.gachaMachineBtn.background = canAfford ? '#9b59b6' : '#bdc3c7';
    (this.gachaMachineBtn as any).color = canAfford ? '#8e44ad' : '#95a5a6';
    this.gachaMachineBtn.cornerRadius = 24; this.gachaMachineBtn.thickness = 3;
    this.gachaMachineBtn.shadowColor = canAfford ? '#8e44ad' : '#95a5a6';
    this.gachaMachineBtn.shadowBlur = 0;
    this.gachaMachineBtn.shadowOffsetX = 0;
    this.gachaMachineBtn.shadowOffsetY = 5;
    this.gachaMachineBtn.top = '28%';
    this.gachaMachineBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.gachaMachineBtn.alpha = 0;
    gui.addControl(this.gachaMachineBtn);
    TweenManager.add({ targets: this.gachaMachineBtn, alpha: 1, duration: 500, delay: 600 });
    this.gachaMachineBtn.onPointerEnterObservable.add(() => { this.gachaMachineBtn.scaleX = 1.03; this.gachaMachineBtn.scaleY = 1.03; this.gachaMachineBtn.shadowOffsetY = 6; });
    this.gachaMachineBtn.onPointerOutObservable.add(() => { this.gachaMachineBtn.scaleX = 1.0; this.gachaMachineBtn.scaleY = 1.0; this.gachaMachineBtn.shadowOffsetY = 5; });
    this.gachaMachineBtn.onPointerDownObservable.add(() => { this.gachaMachineBtn.scaleX = 0.97; this.gachaMachineBtn.scaleY = 0.97; this.gachaMachineBtn.shadowOffsetY = 2; });
    this.gachaMachineBtn.onPointerUpObservable.add(() => {
      this.gachaMachineBtn.scaleX = 1.0; this.gachaMachineBtn.scaleY = 1.0;
      this.gachaMachineBtn.shadowOffsetY = 5;
      this.rollGacha();
    });

    // Back button (pink cartoon design)
    const backBtn = Button.CreateSimpleButton('btn_back', '← Menu');
    backBtn.width = '150px'; backBtn.height = '44px';
    backBtn.color = '#ffffff'; backBtn.fontSize = 18;
    backBtn.fontStyle = 'bold';
    backBtn.fontFamily = 'Fredoka, sans-serif';
    backBtn.background = '#e91e63';
    (backBtn as any).color = '#c2185b';
    backBtn.cornerRadius = 20; backBtn.thickness = 3;
    backBtn.shadowColor = '#c2185b';
    backBtn.shadowBlur = 0;
    backBtn.shadowOffsetX = 0;
    backBtn.shadowOffsetY = 4;
    backBtn.top = '46%';
    backBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    backBtn.alpha = 0;
    gui.addControl(backBtn);
    TweenManager.add({ targets: backBtn, alpha: 1, duration: 400, delay: 700 });
    backBtn.onPointerEnterObservable.add(() => { backBtn.scaleX = 1.03; backBtn.scaleY = 1.03; backBtn.shadowOffsetY = 5; });
    backBtn.onPointerOutObservable.add(() => { backBtn.scaleX = 1.0; backBtn.scaleY = 1.0; backBtn.shadowOffsetY = 4; });
    backBtn.onPointerDownObservable.add(() => { backBtn.scaleX = 0.97; backBtn.scaleY = 0.97; backBtn.shadowOffsetY = 1; });
    backBtn.onPointerUpObservable.add(() => {
      backBtn.scaleX = 1.0; backBtn.scaleY = 1.0;
      backBtn.shadowOffsetY = 4;
      audio.playTap();
      SceneManager.start('Menu');
    });
  }

  private rollGacha() {
    if (GameData.coins.get() < GACHA_COST) {
      this.gachaMachineBtn.background = '#ff0000';
      TweenManager.delayedCall(300, () => this.gachaMachineBtn.background = '#884444');
      return;
    }
    audio.playTap();
    GameData.coins.add(-GACHA_COST);
    
    const unlocked = GameData.unlockedSkins.get();
    const lockedSkins = SKINS.filter(s => s.id !== 'none' && !unlocked.includes(s.id));
    
    if (lockedSkins.length === 0) {
      GameData.coins.add(GACHA_COST + 10); // Refund + bonus
      return;
    }
    
    const idx = Math.floor(Math.random() * lockedSkins.length);
    const win = lockedSkins[idx];
    GameData.unlockedSkins.add(win.id);
    
    // Refresh
    SceneManager.start('Shop');
  }
}
