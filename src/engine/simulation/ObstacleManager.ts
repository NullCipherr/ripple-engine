import { Obstacle } from '../../types/simulation';

export class ObstacleManager {
  private obstacles: Obstacle[] = [];
  private gridWidth: number = 0;
  private gridHeight: number = 0;
  private obstacleGrid: Uint8Array = new Uint8Array(0);

  public setGridSize(w: number, h: number) {
    this.gridWidth = w;
    this.gridHeight = h;
    this.obstacleGrid = new Uint8Array(w * h);
    this.updateObstacleGrid();
  }

  public setObstacles(obstacles: Obstacle[]) {
    this.obstacles = obstacles;
    this.updateObstacleGrid();
  }

  public getObstacles(): Obstacle[] {
    return this.obstacles;
  }

  public isObstacle(i: number, j: number): boolean {
    if (i < 0 || i >= this.gridWidth || j < 0 || j >= this.gridHeight) return true; // Bounds are obstacles
    return this.obstacleGrid[i + j * this.gridWidth] === 1;
  }

  public getObstacleGrid(): Uint8Array {
    return this.obstacleGrid;
  }

  public getObstacleGridByteSize(): number {
    return this.obstacleGrid.byteLength;
  }

  public getObstacleAt(normX: number, normY: number): number {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      if (obs.type === 'circle' && obs.radius) {
        const dx = normX - obs.x;
        const dy = normY - obs.y;
        const aspectRatio = this.gridWidth / this.gridHeight;
        const distSq = dx * dx + (dy * dy) / (aspectRatio * aspectRatio);
        if (distSq <= obs.radius * obs.radius) {
          return i;
        }
      } else if (obs.type === 'rect' && obs.width && obs.height) {
        if (
          normX >= obs.x - obs.width / 2 &&
          normX <= obs.x + obs.width / 2 &&
          normY >= obs.y - obs.height / 2 &&
          normY <= obs.y + obs.height / 2
        ) {
          return i;
        }
      }
    }
    return -1;
  }

  private updateObstacleGrid() {
    if (this.gridWidth === 0 || this.gridHeight === 0) return;
    this.obstacleGrid.fill(0);
    
    for (const obs of this.obstacles) {
      if (obs.type === 'circle' && obs.radius) {
        const cx = obs.x * this.gridWidth;
        const cy = obs.y * this.gridHeight;
        const r = obs.radius * Math.max(this.gridWidth, this.gridHeight);
        const rSq = r * r;
        
        const minX = Math.max(0, Math.floor(cx - r));
        const maxX = Math.min(this.gridWidth - 1, Math.ceil(cx + r));
        const minY = Math.max(0, Math.floor(cy - r));
        const maxY = Math.min(this.gridHeight - 1, Math.ceil(cy + r));
        
        for (let j = minY; j <= maxY; j++) {
          for (let i = minX; i <= maxX; i++) {
            const dx = i - cx;
            const dy = j - cy;
            if (dx * dx + dy * dy <= rSq) {
              this.obstacleGrid[i + j * this.gridWidth] = 1;
            }
          }
        }
      } else if (obs.type === 'rect' && obs.width && obs.height) {
        const cx = obs.x * this.gridWidth;
        const cy = obs.y * this.gridHeight;
        const hw = (obs.width * this.gridWidth) / 2;
        const hh = (obs.height * this.gridHeight) / 2;
        
        const minX = Math.max(0, Math.floor(cx - hw));
        const maxX = Math.min(this.gridWidth - 1, Math.ceil(cx + hw));
        const minY = Math.max(0, Math.floor(cy - hh));
        const maxY = Math.min(this.gridHeight - 1, Math.ceil(cy + hh));
        
        for (let j = minY; j <= maxY; j++) {
          for (let i = minX; i <= maxX; i++) {
            this.obstacleGrid[i + j * this.gridWidth] = 1;
          }
        }
      }
    }
  }

  public dispose(): void {
    this.obstacles = [];
    this.gridWidth = 0;
    this.gridHeight = 0;
    this.obstacleGrid = new Uint8Array(0);
  }
}
