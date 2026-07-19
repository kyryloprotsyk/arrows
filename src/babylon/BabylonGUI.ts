/* BabylonGUI.ts — Singleton wrapper for Babylon.js GUI with full texture tracking */
import {
  AdvancedDynamicTexture, TextBlock, Button, StackPanel, Control, Rectangle
} from '@babylonjs/gui';

export class BabylonGUI {
  /** Singleton "game HUD" texture created via getUI() */
  private static ui: AdvancedDynamicTexture | null = null;
  /** ALL textures ever created — cleared on scene transition */
  private static allTextures: AdvancedDynamicTexture[] = [];

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /**
   * Create a fresh fullscreen UI texture for a scene.
   * The texture is tracked so clearAll() disposes it when transitioning.
   */
  static createFullscreenUI(name = 'ui'): AdvancedDynamicTexture {
    const tex = AdvancedDynamicTexture.CreateFullscreenUI(name, true);
    tex.idealWidth  = 1080;
    tex.idealHeight = 1920;
    tex.renderAtIdealSize = false;
    this.allTextures.push(tex);
    return tex;
  }

  /**
   * Return (or lazily create) the shared singleton HUD texture.
   * Used by HUD.ts so in-game controls share one layer.
   */
  static getUI(): AdvancedDynamicTexture {
    if (!this.ui) {
      this.ui = AdvancedDynamicTexture.CreateFullscreenUI('main-ui', true);
      this.ui.idealWidth  = 1080;
      this.ui.idealHeight = 1920;
      this.allTextures.push(this.ui);
    }
    return this.ui;
  }

  /**
   * Dispose EVERY tracked texture and reset state.
   * Must be called at the start of every scene transition.
   */
  static clearAll() {
    for (const tex of this.allTextures) {
      try { tex.dispose(); } catch { /* already disposed */ }
    }
    this.allTextures = [];
    this.ui = null;
  }

  // ── Element Factories ────────────────────────────────────────────────────

  static addRect(
    gui: AdvancedDynamicTexture,
    opts: {
      width?: string | number;
      height?: string | number;
      background?: string;
      cornerRadius?: number;
      top?: string | number;
      left?: string | number;
      thickness?: number;
      color?: string;
    }
  ): Rectangle {
    const rect = new Rectangle();
    rect.width         = opts.width   ?? '100%';
    rect.height        = opts.height  ?? '100%';
    rect.background    = opts.background ?? 'transparent';
    rect.cornerRadius  = opts.cornerRadius ?? 0;
    rect.thickness     = opts.thickness ?? 0;
    if (opts.color) rect.color = opts.color;
    if (opts.top  !== undefined) { rect.verticalAlignment   = Control.VERTICAL_ALIGNMENT_CENTER;   rect.top  = opts.top;  }
    if (opts.left !== undefined) { rect.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;  rect.left = opts.left; }
    gui.addControl(rect);
    return rect;
  }

  static addText(
    gui: AdvancedDynamicTexture,
    opts: {
      text: string;
      fontSize?: number;
      color?: string;
      fontFamily?: string;
      top?: string | number;
      left?: string | number;
      shadowColor?: string;
      shadowBlur?: number;
    }
  ): TextBlock {
    const tb = new TextBlock();
    tb.text       = opts.text;
    tb.color      = opts.color      ?? '#ffffff';
    tb.fontSize   = opts.fontSize   ?? 36;
    tb.fontFamily = opts.fontFamily ?? 'Fredoka, sans-serif';
    if (opts.shadowColor) tb.shadowColor = opts.shadowColor;
    if (opts.shadowBlur)  tb.shadowBlur  = opts.shadowBlur;
    if (opts.top  !== undefined) { tb.verticalAlignment   = Control.VERTICAL_ALIGNMENT_CENTER;  tb.top  = opts.top;  }
    if (opts.left !== undefined) { tb.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER; tb.left = opts.left; }
    gui.addControl(tb);
    return tb;
  }

  static createText(text: string, style?: any): TextBlock {
    const tb = new TextBlock();
    tb.text                    = text;
    tb.color                   = style?.color  || '#ffffff';
    tb.fontSize                = style?.fontSize || 36;
    tb.fontFamily              = style?.fontFamily || 'Fredoka, sans-serif';
    tb.textHorizontalAlignment = style?.align  || Control.HORIZONTAL_ALIGNMENT_CENTER;
    tb.textVerticalAlignment   = style?.valign || Control.VERTICAL_ALIGNMENT_CENTER;
    tb.shadowOffsetX           = style?.shadowOffsetX || 0;
    tb.shadowOffsetY           = style?.shadowOffsetY || 0;
    tb.shadowBlur              = style?.shadowBlur    || 0;
    tb.shadowColor             = style?.shadowColor   || 'transparent';
    return tb;
  }

  static createButton(label: string, onClick: () => void, style?: any): Button {
    const btn = Button.CreateSimpleButton(`btn-${label}-${Math.random().toString(36).slice(2)}`, label);
    btn.width        = style?.width        || '200px';
    btn.height       = style?.height       || '80px';
    btn.color        = style?.color        || '#ffffff';
    btn.fontSize     = style?.fontSize     || 36;
    btn.fontFamily   = style?.fontFamily   || 'Fredoka, sans-serif';
    btn.background   = style?.bgColor      || '#c0392b';
    btn.thickness    = style?.thickness    ?? 2;
    btn.cornerRadius = style?.cornerRadius ?? 24;

    btn.onPointerEnterObservable.add(() => { btn.scaleX = 1.05; btn.scaleY = 1.05; });
    btn.onPointerOutObservable.add(()  => { btn.scaleX = 1.0;  btn.scaleY = 1.0;  });
    btn.onPointerDownObservable.add(() => { btn.scaleX = 0.95; btn.scaleY = 0.95; });
    btn.onPointerUpObservable.add(()  => { btn.scaleX = 1.05; btn.scaleY = 1.05; onClick(); });
    return btn;
  }

  static addButton(
    gui: AdvancedDynamicTexture,
    label: string,
    onClick: () => void,
    style?: any
  ): Button {
    const btn = this.createButton(label, onClick, style);
    if (style?.top  !== undefined) { btn.verticalAlignment   = Control.VERTICAL_ALIGNMENT_CENTER;  btn.top  = style.top;  }
    if (style?.left !== undefined) { btn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER; btn.left = style.left; }
    gui.addControl(btn);
    return btn;
  }

  static createPanel(isVertical = true): StackPanel {
    const panel = new StackPanel();
    panel.isVertical = isVertical;
    return panel;
  }
}
