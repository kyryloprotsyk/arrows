/* InputManager.ts — Unified pointer input system for Babylon.js */

export class InputManager {
  private static canvas: HTMLCanvasElement | null = null;
  
  private static isDragging = false;
  private static hasMoved = false;
  private static pointerDownX = 0;
  private static pointerDownY = 0;
  private static dragLastX = 0;
  private static dragLastY = 0;
  private static activePointers: Map<number, { x: number, y: number }> = new Map();
  private static initialPinchDist = 0;

  // Callbacks
  static onTap: ((x: number, y: number) => void) | null = null;
  static onDragStart: ((x: number, y: number) => void) | null = null;
  static onDragMove: ((dx: number, dy: number, velocityX: number, velocityY: number) => void) | null = null;
  static onDragEnd: ((totalVelocityX: number, totalVelocityY: number) => void) | null = null;
  static onPinchZoom: ((scaleFactor: number) => void) | null = null;
  static onWheel: ((deltaY: number) => void) | null = null;
  static onKey: ((key: string) => void) | null = null;

  static init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    
    // Pointer Events
    window.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointercancel', this.handlePointerUp);
    
    // Wheel
    window.addEventListener('wheel', this.handleWheel, { passive: false });

    // Keyboard
    window.addEventListener('keydown', this.handleKeyDown);
  }

  static destroy() {
    window.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointercancel', this.handlePointerUp);
    window.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('keydown', this.handleKeyDown);
    this.canvas = null;
    this.activePointers.clear();
  }

  private static handlePointerDown = (e: PointerEvent) => {
    // Ignore UI elements like buttons that stop propagation if we add them later
    if (e.target !== this.canvas) return;

    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.activePointers.size === 1) {
      this.isDragging = true;
      this.hasMoved = false;
      this.pointerDownX = e.clientX;
      this.pointerDownY = e.clientY;
      this.dragLastX = e.clientX;
      this.dragLastY = e.clientY;

      if (this.onDragStart) {
        this.onDragStart(e.clientX, e.clientY);
      }
    } else if (this.activePointers.size === 2) {
      // Setup pinch zoom
      const pts = Array.from(this.activePointers.values());
      this.initialPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }
  };

  private static handlePointerMove = (e: PointerEvent) => {
    if (!this.activePointers.has(e.pointerId)) return;
    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.activePointers.size === 1 && this.isDragging) {
      const dx = e.clientX - this.dragLastX;
      const dy = e.clientY - this.dragLastY;
      
      const distFromStart = Math.hypot(e.clientX - this.pointerDownX, e.clientY - this.pointerDownY);
      if (distFromStart > 10) {
        this.hasMoved = true;
      }

      if (this.hasMoved && this.onDragMove) {
        // Approximate velocity (delta per move)
        this.onDragMove(e.clientX - this.pointerDownX, e.clientY - this.pointerDownY, dx, dy);
      }
      this.dragLastX = e.clientX;
      this.dragLastY = e.clientY;
    } else if (this.activePointers.size === 2) {
      const pts = Array.from(this.activePointers.values());
      const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (this.initialPinchDist > 0 && this.onPinchZoom) {
        const scaleFactor = currentDist / this.initialPinchDist;
        this.onPinchZoom(scaleFactor);
      }
    }
  };

  private static handlePointerUp = (e: PointerEvent) => {
    this.activePointers.delete(e.pointerId);

    if (this.activePointers.size === 0) {
      if (this.isDragging) {
        this.isDragging = false;
        
        if (this.hasMoved) {
          if (this.onDragEnd) {
            this.onDragEnd(e.clientX - this.pointerDownX, e.clientY - this.pointerDownY);
          }
        } else {
          if (this.onTap) {
            this.onTap(e.clientX, e.clientY);
          }
        }
      }
    } else if (this.activePointers.size === 1) {
      // Reset drag start for the remaining pointer
      const remaining = Array.from(this.activePointers.values())[0];
      this.pointerDownX = remaining.x;
      this.pointerDownY = remaining.y;
      this.dragLastX = remaining.x;
      this.dragLastY = remaining.y;
      this.initialPinchDist = 0;
    }
  };

  private static handleWheel = (e: WheelEvent) => {
    if (e.target !== this.canvas) return;
    e.preventDefault();
    if (this.onWheel) {
      this.onWheel(e.deltaY);
    }
  };

  private static handleKeyDown = (e: KeyboardEvent) => {
    if (this.onKey) {
      this.onKey(e.key);
    }
  };
}
