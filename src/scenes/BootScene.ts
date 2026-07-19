/* BootScene.ts — Clean branded splash screen */
import type { IGameScene } from '../babylon/SceneManager';
import { BabylonGUI } from '../babylon/BabylonGUI';
import { SceneManager } from '../babylon/SceneManager';
import { TweenManager } from '../babylon/TweenManager';
import { Control, Rectangle, TextBlock } from '@babylonjs/gui';

export class BootScene implements IGameScene {
  key = 'Boot';

  create(_scene: any, _data?: any) {
    const gui = BabylonGUI.createFullscreenUI('boot_ui');

    // ── Solid warm peach background ───────────────────────────────────────
    const bg = new Rectangle('bg');
    bg.width      = '100%';
    bg.height     = '100%';
    bg.background = '#fff5ea';
    bg.thickness  = 0;
    gui.addControl(bg);

    // ── Logo icon ─────────────────────────────────────────────────────────
    const logoIcon = new TextBlock('logo_icon');
    logoIcon.text       = '🏹';
    logoIcon.fontSize   = 100;
    logoIcon.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    logoIcon.top   = '-140px';
    logoIcon.alpha = 0;
    logoIcon.scaleX = 0.3;
    logoIcon.scaleY = 0.3;
    gui.addControl(logoIcon);
    TweenManager.add({ targets: logoIcon, alpha: 1, scaleX: 1, scaleY: 1, duration: 600, ease: 'Back.Out', delay: 100 });

    // ── Game name ─────────────────────────────────────────────────────────
    const logoName = new TextBlock('logo_name');
    logoName.text       = 'ARROW BUDDIES';
    logoName.color      = '#ff9f1c';
    logoName.fontSize   = 48;
    logoName.fontStyle  = 'bold';
    logoName.fontFamily = 'Fredoka, sans-serif';
    logoName.shadowColor = '#5c3d2e';
    logoName.shadowBlur  = 0;
    logoName.shadowOffsetX = 3;
    logoName.shadowOffsetY = 3;
    logoName.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    logoName.top   = '-50px';
    logoName.alpha = 0;
    gui.addControl(logoName);
    TweenManager.add({ targets: logoName, alpha: 1, duration: 500, delay: 350 });

    // ── "3D" badge ────────────────────────────────────────────────────────
    const badge = new Rectangle('badge');
    badge.width         = '72px';
    badge.height        = '34px';
    badge.background    = '#ff6b6b';
    badge.cornerRadius  = 12;
    badge.thickness     = 0;
    badge.shadowColor   = 'transparent';
    badge.shadowBlur    = 0;
    badge.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    badge.verticalAlignment   = Control.VERTICAL_ALIGNMENT_CENTER;
    badge.left  = '-30px';
    badge.top   = '-52px';
    badge.alpha = 0;
    gui.addControl(badge);

    const badgeTxt = new TextBlock('badge_txt');
    badgeTxt.text       = '3D';
    badgeTxt.color      = '#ffffff';
    badgeTxt.fontSize   = 20;
    badgeTxt.fontStyle  = 'bold';
    badgeTxt.fontFamily = 'Fredoka, sans-serif';
    badge.addControl(badgeTxt);
    TweenManager.add({ targets: badge, alpha: 1, duration: 400, delay: 550 });

    // ── Sub-tagline ───────────────────────────────────────────────────────
    const sub = new TextBlock('sub');
    sub.text       = 'Neon Escape Puzzle';
    sub.color      = '#ff6b6b';
    sub.fontSize   = 20;
    sub.fontFamily = 'Fredoka, sans-serif';
    sub.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    sub.top   = '-2px';
    sub.alpha = 0;
    gui.addControl(sub);
    TweenManager.add({ targets: sub, alpha: 1, duration: 400, delay: 500 });

    // ── Progress bar track ────────────────────────────────────────────────
    const track = new Rectangle('track');
    track.width        = '300px';
    track.height       = '10px';
    track.background   = 'rgba(0,0,0,0.06)';
    track.cornerRadius = 5;
    track.thickness    = 0;
    track.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    track.top  = '70px';
    gui.addControl(track);

    const fill = new Rectangle('fill');
    fill.width        = '0%';
    fill.height       = '10px';
    fill.background   = '#2ecc71';
    fill.cornerRadius = 5;
    fill.thickness    = 0;
    fill.shadowColor  = 'transparent';
    fill.shadowBlur   = 0;
    fill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    track.addControl(fill);

    // ── Loading label ─────────────────────────────────────────────────────
    const loadLbl = new TextBlock('load_lbl');
    loadLbl.text       = 'Loading…  0%';
    loadLbl.color      = 'rgba(0,0,0,0.5)';
    loadLbl.fontSize   = 18;
    loadLbl.fontFamily = 'Fredoka, sans-serif';
    loadLbl.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    loadLbl.top = '100px';
    gui.addControl(loadLbl);

    // ── Version ───────────────────────────────────────────────────────────
    const ver = new TextBlock('ver');
    ver.text       = 'v1.0 · Babylon.js Edition';
    ver.color      = 'rgba(0,0,0,0.2)';
    ver.fontSize   = 14;
    ver.fontFamily = 'Fredoka, sans-serif';
    ver.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    ver.top = '-14px';
    gui.addControl(ver);

    // ── Animate and transition ────────────────────────────────────────────
    let progress = 0;
    const spin = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
    let si = 0;

    const interval = setInterval(() => {
      progress = Math.min(progress + 0.045, 1);
      si = (si + 1) % spin.length;

      const pct = Math.round(progress * 100);
      (fill as any).width = `${pct}%`;
      loadLbl.text = `${spin[si]}  Loading…  ${pct}%`;

      if (progress >= 1) {
        clearInterval(interval);
        loadLbl.text  = '✓  Ready!';
        loadLbl.color = '#27ae60';
        fill.background   = '#2ecc71';
        TweenManager.add({ targets: bg, alpha: 0, duration: 400, delay: 400 });
        TweenManager.delayedCall(800, () => SceneManager.start('Menu'));
      }
    }, 55);
  }
}
