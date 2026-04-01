import { FluidEngine } from './FluidEngine';

export class InputController {
  private canvas: HTMLCanvasElement;
  private engine: FluidEngine;
  private isPointerDown: boolean = false;
  private lastX: number = 0;
  private lastY: number = 0;
  private isRightClick: boolean = false;
  private draggedObstacleIndex: number = -1;
  private readonly onContextMenu = (e: Event) => e.preventDefault();

  constructor(canvas: HTMLCanvasElement, engine: FluidEngine) {
    this.canvas = canvas;
    this.engine = engine;
  }

  public initialize(): void {
    this.canvas.addEventListener('mousedown', this.onPointerDown);
    this.canvas.addEventListener('mousemove', this.onPointerMove);
    window.addEventListener('mousemove', this.onGlobalPointerMove);
    window.addEventListener('mouseup', this.onPointerUp);
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
    
    this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('touchend', this.onPointerUp);
  }

  public dispose(): void {
    this.canvas.removeEventListener('mousedown', this.onPointerDown);
    this.canvas.removeEventListener('mousemove', this.onPointerMove);
    window.removeEventListener('mousemove', this.onGlobalPointerMove);
    window.removeEventListener('mouseup', this.onPointerUp);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    
    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('touchend', this.onPointerUp);
    this.draggedObstacleIndex = -1;
    this.isPointerDown = false;
    this.isRightClick = false;
  }

  private inject(x: number, y: number, dx: number, dy: number) {
    const rect = this.canvas.getBoundingClientRect();
    this.engine.processInput({
      normX: x / rect.width,
      normY: y / rect.height,
      normDx: dx / rect.width,
      normDy: dy / rect.height,
      reverseForce: this.isRightClick,
      injectDensity: !this.isRightClick,
    });
  }

  private interpolateAndInject(x1: number, y1: number, x2: number, y2: number) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Inject at least once, and more times if distance is large
    const steps = Math.max(1, Math.floor(dist / 5)); 
    
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const ix = x1 + dx * t;
      const iy = y1 + dy * t;
      this.inject(ix, iy, dx, dy);
    }
  }

  private handleDragStart(x: number, y: number): boolean {
    const rect = this.canvas.getBoundingClientRect();
    const normX = x / rect.width;
    const normY = y / rect.height;
    
    const obsManager = this.engine.getObstacleManager();
    const idx = obsManager.getObstacleAt(normX, normY);
    
    if (idx !== -1) {
      this.draggedObstacleIndex = idx;
      return true;
    }
    return false;
  }

  private handleDragMove(x: number, y: number) {
    if (this.draggedObstacleIndex === -1) return;
    
    const rect = this.canvas.getBoundingClientRect();
    this.engine.moveObstacleByIndex(this.draggedObstacleIndex, x / rect.width, y / rect.height);
  }

  private onPointerDown = (e: MouseEvent) => {
    this.isPointerDown = true;
    this.isRightClick = e.button === 2;
    this.lastX = e.offsetX;
    this.lastY = e.offsetY;
    
    if (!this.handleDragStart(e.offsetX, e.offsetY)) {
      this.inject(e.offsetX, e.offsetY, 0, 0);
    }
  };

  private onGlobalPointerMove = (e: MouseEvent) => {
    if (!this.isPointerDown) return;
    if (e.buttons === 0) {
      this.onPointerUp();
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    if (this.draggedObstacleIndex !== -1) {
      this.handleDragMove(x, y);
    } else {
      this.interpolateAndInject(this.lastX, this.lastY, x, y);
    }

    this.lastX = x;
    this.lastY = y;
  };

  private onPointerMove = (e: MouseEvent) => {
    if (!this.isPointerDown) return;
    
    if (this.draggedObstacleIndex !== -1) {
      this.handleDragMove(e.offsetX, e.offsetY);
    } else {
      this.interpolateAndInject(this.lastX, this.lastY, e.offsetX, e.offsetY);
    }
    
    this.lastX = e.offsetX;
    this.lastY = e.offsetY;
  };

  private onPointerUp = () => {
    this.isPointerDown = false;
    this.isRightClick = false;
    this.draggedObstacleIndex = -1;
  };

  private onTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const rect = this.canvas.getBoundingClientRect();
      this.isPointerDown = true;
      this.isRightClick = e.touches.length > 1; // Two fingers = right click
      this.lastX = e.touches[0].clientX - rect.left;
      this.lastY = e.touches[0].clientY - rect.top;
      
      if (!this.handleDragStart(this.lastX, this.lastY)) {
        this.inject(this.lastX, this.lastY, 0, 0);
      }
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (!this.isPointerDown || e.touches.length === 0) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    
    if (this.draggedObstacleIndex !== -1) {
      this.handleDragMove(x, y);
    } else {
      this.interpolateAndInject(this.lastX, this.lastY, x, y);
    }
    
    this.lastX = x;
    this.lastY = y;
  };
}
