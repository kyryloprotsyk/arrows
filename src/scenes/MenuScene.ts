/* MenuScene.ts — Clean bold main menu */
import type { IGameScene } from '../babylon/SceneManager';
import { BabylonGUI } from '../babylon/BabylonGUI';
import { SceneManager } from '../babylon/SceneManager';
import { TweenManager } from '../babylon/TweenManager';
import { BabylonBlockScene } from '../babylon/BabylonBlockScene';
import { BabylonParticles } from '../babylon/BabylonParticles';
import { GameData } from '../utils/GameData';
import { audio } from '../audio';
import { Control, Rectangle, TextBlock, StackPanel, Button } from '@babylonjs/gui';
import type { Scene as BjsScene } from '@babylonjs/core';

function makeBtn(
  id: string,
  emoji: string,
  label: string,
  bg: string,
  borderColor: string,
  onClick: () => void
): Button {
  const btn = Button.CreateSimpleButton(id, `${emoji}  ${label}`);
  btn.width        = '380px';
  btn.height       = '80px';
  btn.fontSize     = 26;
  btn.fontStyle    = 'bold';
  btn.fontFamily   = 'Fredoka, sans-serif';
  btn.color        = '#ffffff';
  btn.background   = bg;
  btn.cornerRadius = 24;
  btn.thickness    = 3;
  btn.paddingBottom = '16px';
  btn.shadowColor  = borderColor;
  btn.shadowBlur   = 0;
  btn.shadowOffsetX = 0;
  btn.shadowOffsetY = 6;
  (btn as any).color = borderColor;  // border colour
  if (btn.textBlock) btn.textBlock.color = '#ffffff';

  btn.onPointerEnterObservable.add(() => {
    btn.scaleX = 1.04; btn.scaleY = 1.04;
    btn.shadowOffsetY = 8;
  });
  btn.onPointerOutObservable.add(() => {
    btn.scaleX = 1.0; btn.scaleY = 1.0;
    btn.shadowOffsetY = 6;
  });
  btn.onPointerDownObservable.add(() => {
    btn.scaleX = 0.96; btn.scaleY = 0.96;
    btn.shadowOffsetY = 2;
  });
  btn.onPointerUpObservable.add(() => {
    btn.scaleX = 1.0; btn.scaleY = 1.0;
    btn.shadowOffsetY = 6;
    audio.playTap();
    onClick();
  });

  return btn;
}

export class MenuScene implements IGameScene {
  key = 'Menu';
  private updateFn?: (dt: number, t: number) => void;

  create(scene: BjsScene) {
    // ── 3D Background ─────────────────────────────────────────────────────
    const footprint = [
      { x: -1, z: -1 }, { x: 0, z: -1 }, { x: 1, z: -1 },
      { x: -1, z:  0 }, { x: 0, z:  0 }, { x: 1, z:  0 },
      { x: -1, z:  1 }, { x: 0, z:  1 }, { x: 1, z:  1 }
    ];
    BabylonBlockScene.create(scene, footprint, 1);

    const buddies = footprint.map((f, i) => ({
      id: `m_${i}`, x: f.x, y: 0, z: f.z,
      type: i === 4 ? 'key' : (i === 8 ? 'bomb' : 'normal'),
      state: 'idle', sx: 0, sy: 0, dir: { x: 0, y: 0, z: 0 },
      jellyScalePara: 1, jellyScalePerp: 1, jellyAngle: 0
    }));
    BabylonBlockScene.syncBlocks(buddies, 0, 1.5, 0, 0, 1080, 1920);

    BabylonParticles.createWeather(scene, 1);

    // Slow cinematic auto-orbit
    let rotAngle = 0;
    this.updateFn = (dt: number) => {
      rotAngle += dt * 0.06;
      BabylonBlockScene.syncBlocks(
        buddies, 0, 1.5,
        Math.sin(rotAngle) * 25, -15,
        1080, 1920
      );
    };
    SceneManager.addUpdateListener(this.updateFn);

    // ── GUI ───────────────────────────────────────────────────────────────
    const gui = BabylonGUI.createFullscreenUI('menu_ui');

    // Light warm overlay to make UI pop over 3D, keeping it bright and sunny
    const overlay = new Rectangle('overlay');
    overlay.width      = '100%';
    overlay.height     = '100%';
    overlay.background = '#fff5ea';
    overlay.thickness  = 0;
    overlay.alpha      = 0.35;
    gui.addControl(overlay);

    // ══════════════════════════════════════════════════════════════════════
    // TOP AREA — Profile + Coin
    // ══════════════════════════════════════════════════════════════════════

    // Coin badge top-left
    const coinBadge = new Rectangle('coin_badge');
    coinBadge.width           = '180px';
    coinBadge.height          = '54px';
    coinBadge.background      = '#ffffff';
    coinBadge.cornerRadius    = 27;
    coinBadge.thickness       = 3;
    coinBadge.color           = '#ffa500';
    coinBadge.shadowColor     = '#ffa500';
    coinBadge.shadowBlur      = 0;
    coinBadge.shadowOffsetX   = 0;
    coinBadge.shadowOffsetY   = 4;
    coinBadge.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    coinBadge.verticalAlignment   = Control.VERTICAL_ALIGNMENT_TOP;
    coinBadge.left = '20px';
    coinBadge.top  = '20px';
    coinBadge.alpha = 0;
    gui.addControl(coinBadge);

    const coinTxt = new TextBlock('coin_txt');
    coinTxt.text       = `🪙  ${GameData.coins.get()}`;
    coinTxt.color      = '#d35400';
    coinTxt.fontSize   = 24;
    coinTxt.fontStyle  = 'bold';
    coinTxt.fontFamily = 'Fredoka, sans-serif';
    coinBadge.addControl(coinTxt);

    TweenManager.add({ targets: coinBadge, alpha: 1, duration: 400, delay: 200 });

    // Mute toggle top-right
    const muteBtn = new Rectangle('mute_btn');
    muteBtn.width           = '54px';
    muteBtn.height          = '54px';
    muteBtn.background      = '#ffffff';
    muteBtn.cornerRadius    = 27;
    muteBtn.thickness       = 3;
    muteBtn.color           = '#9b72ff';
    muteBtn.shadowColor     = '#9b72ff';
    muteBtn.shadowBlur      = 0;
    muteBtn.shadowOffsetX   = 0;
    muteBtn.shadowOffsetY   = 4;
    muteBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    muteBtn.verticalAlignment   = Control.VERTICAL_ALIGNMENT_TOP;
    muteBtn.left  = '-20px';
    muteBtn.top   = '20px';
    muteBtn.alpha = 0;
    gui.addControl(muteBtn);

    const muteTxt = new TextBlock('mute_txt');
    muteTxt.text     = GameData.muted.get() ? '🔇' : '🔊';
    muteTxt.fontSize = 26;
    muteBtn.addControl(muteTxt);

    TweenManager.add({ targets: muteBtn, alpha: 1, duration: 400, delay: 200 });

    muteBtn.onPointerDownObservable.add(() => {
      const muted = !GameData.muted.get();
      GameData.muted.set(muted);
      muteTxt.text = muted ? '🔇' : '🔊';
      if (!muted) audio.playBGM();
      else audio.stopBGM();
    });

    // ══════════════════════════════════════════════════════════════════════
    // CENTER — Title
    // ══════════════════════════════════════════════════════════════════════

    const titleLine1 = new TextBlock('t1');
    titleLine1.text       = '🏹  ARROW BUDDIES';
    titleLine1.color      = '#ff9f1c';
    titleLine1.fontSize   = 58;
    titleLine1.fontStyle  = 'bold';
    titleLine1.fontFamily = 'Fredoka, sans-serif';
    titleLine1.shadowColor = '#5c3d2e';
    titleLine1.shadowBlur  = 0;
    titleLine1.shadowOffsetX = 4;
    titleLine1.shadowOffsetY = 4;
    titleLine1.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    titleLine1.top  = '-38%';
    titleLine1.alpha = 0;
    gui.addControl(titleLine1);

    const titleLine2 = new TextBlock('t2');
    titleLine2.text       = 'NEON ESCAPE PUZZLE';
    titleLine2.color      = '#ff6b6b';
    titleLine2.fontSize   = 22;
    titleLine2.fontStyle  = 'bold';
    titleLine2.fontFamily = 'Fredoka, sans-serif';
    titleLine2.shadowColor = '#5c3d2e';
    titleLine2.shadowBlur  = 0;
    titleLine2.shadowOffsetX = 2;
    titleLine2.shadowOffsetY = 2;
    titleLine2.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    titleLine2.top  = '-29%';
    titleLine2.alpha = 0;
    gui.addControl(titleLine2);

    // Animated badge "3D"
    const badge = new Rectangle('badge_3d');
    badge.width          = '72px';
    badge.height         = '34px';
    badge.background     = '#ff6b6b';
    badge.cornerRadius   = 12;
    badge.thickness      = 0;
    badge.shadowColor    = 'transparent';
    badge.shadowBlur     = 0;
    badge.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    badge.verticalAlignment   = Control.VERTICAL_ALIGNMENT_CENTER;
    badge.left  = '-30px';
    badge.top   = '-33%';
    badge.alpha = 0;
    gui.addControl(badge);

    const badgeTxt = new TextBlock('badge_3d_txt');
    badgeTxt.text       = '3D';
    badgeTxt.color      = '#ffffff';
    badgeTxt.fontSize   = 20;
    badgeTxt.fontStyle  = 'bold';
    badgeTxt.fontFamily = 'Fredoka, sans-serif';
    badge.addControl(badgeTxt);

    TweenManager.add({ targets: titleLine1, alpha: 1, scaleX: 0.85, scaleY: 0.85, duration: 1 });
    TweenManager.add({ targets: titleLine1, alpha: 1, scaleX: 1, scaleY: 1, duration: 700, ease: 'Back.Out', delay: 100 });
    TweenManager.add({ targets: titleLine2, alpha: 1, duration: 500, delay: 400 });
    TweenManager.add({ targets: badge,      alpha: 1, duration: 400, delay: 550 });

    // Pulse title
    let pDir = 1;
    const origUpdateFn = this.updateFn;
    this.updateFn = (dt: number, t: number) => {
      origUpdateFn(dt, t);
      titleLine1.scaleX += pDir * 0.0004;
      titleLine1.scaleY += pDir * 0.0004;
      if (titleLine1.scaleX > 1.03 || titleLine1.scaleX < 0.99) pDir *= -1;
    };
    SceneManager.removeUpdateListener(origUpdateFn);
    SceneManager.addUpdateListener(this.updateFn);

    // ══════════════════════════════════════════════════════════════════════
    // STATS ROW
    // ══════════════════════════════════════════════════════════════════════

    const statsPanel = new StackPanel('stats');
    statsPanel.isVertical = false;
    statsPanel.spacing    = 20;
    statsPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    statsPanel.top   = '-17%';
    statsPanel.alpha = 0;
    gui.addControl(statsPanel);

    const statDefs = [
      { emoji: '⭐', val: `${GameData.totalStars()}`, label: 'Stars',  color: '#ffa500' },
      { emoji: '🔥', val: `${GameData.dailyStreak?.get?.() ?? 0}`,    label: 'Streak', color: '#e67e22' },
      { emoji: '✅', val: `${GameData.puzzlesSolved?.get?.() ?? 0}`,  label: 'Solved', color: '#27ae60' },
    ];

    for (const s of statDefs) {
      const pill = new Rectangle(`stat_${s.label}`);
      pill.width        = '130px';
      pill.height       = '64px';
      pill.background   = '#ffffff';
      pill.cornerRadius = 18;
      pill.thickness    = 3;
      pill.color        = s.color;
      pill.shadowColor  = s.color;
      pill.shadowBlur   = 0;
      pill.shadowOffsetX = 0;
      pill.shadowOffsetY = 4;
      statsPanel.addControl(pill);

      const emojiTxt = new TextBlock(`se_${s.label}`);
      emojiTxt.text      = `${s.emoji} ${s.val}`;
      emojiTxt.color     = s.color;
      emojiTxt.fontSize  = 22;
      emojiTxt.fontStyle = 'bold';
      emojiTxt.fontFamily = 'Fredoka, sans-serif';
      emojiTxt.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
      emojiTxt.top = '-10px';
      pill.addControl(emojiTxt);

      const labelTxt = new TextBlock(`sl_${s.label}`);
      labelTxt.text      = s.label.toUpperCase();
      labelTxt.color     = 'rgba(0,0,0,0.5)';
      labelTxt.fontSize  = 12;
      labelTxt.fontFamily = 'Fredoka, sans-serif';
      labelTxt.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
      labelTxt.top = '-6px';
      pill.addControl(labelTxt);
    }

    TweenManager.add({ targets: statsPanel, alpha: 1, duration: 400, delay: 600 });

    // ══════════════════════════════════════════════════════════════════════
    // BUTTONS
    // ══════════════════════════════════════════════════════════════════════

    const panel = new StackPanel('btn_panel');
    panel.isVertical = true;
    panel.spacing    = 0;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    panel.top   = '12%';
    panel.alpha = 0;
    gui.addControl(panel);

    const btnDefs = [
      { emoji: '▶', label: 'PLAY GAME',        bg: '#2ecc71', glow: '#27ae60', key: 'WorldSelect'    },
      { emoji: '📅', label: 'DAILY QUEST',      bg: '#f1c40f', glow: '#f39c12', key: 'DailyChallenge' },
      { emoji: '🏆', label: 'LEADERBOARD',      bg: '#9b59b6', glow: '#8e44ad', key: 'Leaderboard'    },
      { emoji: '✨', label: 'SKINS SHOP',       bg: '#e91e63', glow: '#c2185b', key: 'Shop'           },
    ];

    for (const [i, def] of btnDefs.entries()) {
      const btn = makeBtn(
        `btn_${def.key}`, def.emoji, def.label,
        def.bg, def.glow,
        () => SceneManager.start(def.key)
      );
      btn.alpha = 0;
      panel.addControl(btn);
      TweenManager.add({ targets: btn, alpha: 1, duration: 400, delay: 700 + i * 80 });
    }

    TweenManager.add({ targets: panel, alpha: 1, duration: 1, delay: 680 });

    // ══════════════════════════════════════════════════════════════════════
    // BOTTOM HINT
    // ══════════════════════════════════════════════════════════════════════

    const hint = new TextBlock('hint');
    hint.text       = '👆 Tap · 🌀 Swipe to rotate · 🤌 Pinch to zoom';
    hint.color      = 'rgba(0,0,0,0.6)';
    hint.fontSize   = 18;
    hint.fontFamily = 'Fredoka, sans-serif';
    hint.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    hint.top   = '-18px';
    hint.alpha = 0;
    gui.addControl(hint);
    TweenManager.add({ targets: hint, alpha: 1, duration: 500, delay: 1000 });

    // ── BGM ───────────────────────────────────────────────────────────────
    if (!GameData.muted.get()) audio.playBGM();
  }

  destroy() {
    if (this.updateFn) {
      SceneManager.removeUpdateListener(this.updateFn);
    }
  }
}
