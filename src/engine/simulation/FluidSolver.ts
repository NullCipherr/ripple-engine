import { FluidType, RealWorldFluidInput, SimulationConfig } from '../../types/simulation';
import { DEFAULT_REAL_WORLD_FLUID_INPUTS } from './fluidRealism';
import { ObstacleManager } from './ObstacleManager';

interface FluidDynamicsProfile {
  velocityAdvectionScale: number;
  densityAdvectionScale: number;
  densityRetention: number;
  velocityRetention: number;
  vorticityScale: number;
  buoyancy: number;
  viscosityScale: number;
  densityDiffusionScale: number;
}

export class FluidSolver {
  public width: number = 0;
  public height: number = 0;
  public size: number = 0;

  public density: Float32Array;
  public velocityX: Float32Array;
  public velocityY: Float32Array;

  public densityOld: Float32Array;
  public velocityXOld: Float32Array;
  public velocityYOld: Float32Array;

  public curl: Float32Array;
  private scratchVelocityX: Float32Array;
  private scratchVelocityY: Float32Array;
  private scratchDensity: Float32Array;

  private config: SimulationConfig;
  private obstacleManager: ObstacleManager;

  constructor(config: SimulationConfig, obstacleManager: ObstacleManager) {
    this.config = config;
    this.obstacleManager = obstacleManager;
    this.density = new Float32Array(0);
    this.velocityX = new Float32Array(0);
    this.velocityY = new Float32Array(0);
    this.densityOld = new Float32Array(0);
    this.velocityXOld = new Float32Array(0);
    this.velocityYOld = new Float32Array(0);
    this.curl = new Float32Array(0);
    this.scratchVelocityX = new Float32Array(0);
    this.scratchVelocityY = new Float32Array(0);
    this.scratchDensity = new Float32Array(0);
  }

  public initialize(): void {
    console.log('[FluidSolver] Initialized');
  }

  public resize(canvasWidth: number, canvasHeight: number): void {
    if (canvasWidth === 0 || canvasHeight === 0) return;
    
    const aspectRatio = canvasHeight / canvasWidth;
    this.width = this.config.gridSize;
    this.height = Math.max(1, Math.floor(this.width * aspectRatio));
    this.size = this.width * this.height;

    this.density = new Float32Array(this.size);
    this.velocityX = new Float32Array(this.size);
    this.velocityY = new Float32Array(this.size);
    this.densityOld = new Float32Array(this.size);
    this.velocityXOld = new Float32Array(this.size);
    this.velocityYOld = new Float32Array(this.size);
    this.curl = new Float32Array(this.size);
    this.scratchVelocityX = new Float32Array(this.size);
    this.scratchVelocityY = new Float32Array(this.size);
    this.scratchDensity = new Float32Array(this.size);
    
    this.obstacleManager.setGridSize(this.width, this.height);
    
    console.log(`[FluidSolver] Resized grid to ${this.width}x${this.height}`);
  }

  public step(dt: number): void {
    if (this.size === 0) return;
    const profile = this.getFluidDynamicsProfile();

    // Swap arrays
    let temp = this.velocityXOld; this.velocityXOld = this.velocityX; this.velocityX = temp;
    temp = this.velocityYOld; this.velocityYOld = this.velocityY; this.velocityY = temp;
    temp = this.densityOld; this.densityOld = this.density; this.density = temp;

    // Velocity step
    this.advect(1, this.velocityX, this.velocityXOld, this.velocityXOld, this.velocityYOld, dt * profile.velocityAdvectionScale);
    this.advect(2, this.velocityY, this.velocityYOld, this.velocityXOld, this.velocityYOld, dt * profile.velocityAdvectionScale);

    this.applyBuoyancy(this.densityOld, dt, profile);
    
    if (this.config.vorticity > 0) {
      this.computeCurl(this.velocityX, this.velocityY, this.curl);
      this.applyVorticity(this.velocityX, this.velocityY, this.curl, dt, profile);
    }

    this.applyViscosity(dt, profile);
    this.project(this.velocityX, this.velocityY, this.velocityXOld, this.velocityYOld);

    // Density step
    this.advect(0, this.density, this.densityOld, this.velocityX, this.velocityY, dt * profile.densityAdvectionScale);
    this.dissipate(dt, profile);
  }

  public reset(): void {
    if (this.size === 0) return;
    this.density.fill(0);
    this.velocityX.fill(0);
    this.velocityY.fill(0);
    this.densityOld.fill(0);
    this.velocityXOld.fill(0);
    this.velocityYOld.fill(0);
    this.curl.fill(0);
  }

  public updateConfig(newConfig: SimulationConfig): void {
    this.config = newConfig;
  }

  public addDensity(x: number, y: number, amount: number, radius: number): void {
    this.splat(x, y, amount, radius, this.density);
  }

  public addVelocity(x: number, y: number, amountX: number, amountY: number, radius: number): void {
    this.splat(x, y, amountX, radius, this.velocityX);
    this.splat(x, y, amountY, radius, this.velocityY);
  }

  private splat(x: number, y: number, amount: number, radius: number, field: Float32Array): void {
    if (this.size === 0) return;
    const W = this.width;
    const H = this.height;
    
    const gx = Math.floor(x * W);
    const gy = Math.floor(y * H);
    const r = Math.max(1, Math.floor(radius * Math.max(W, H)));

    for (let j = -r; j <= r; j++) {
      for (let i = -r; i <= r; i++) {
        const cx = gx + i;
        const cy = gy + j;
        if (cx >= 0 && cx < W && cy >= 0 && cy < H) {
          if (this.obstacleManager.isObstacle(cx, cy)) continue;
          
          const dist2 = i * i + j * j;
          if (dist2 < r * r) {
            const falloff = Math.exp(-dist2 / (r * r / 2));
            field[cx + cy * W] += amount * falloff;
          }
        }
      }
    }
  }

  private dissipate(dt: number, profile: FluidDynamicsProfile): void {
    const decayD = Math.pow(this.config.dissipation, dt * 60) * profile.densityRetention;
    const decayV = Math.pow(this.config.velocityDissipation, dt * 60) * profile.velocityRetention;
    for (let i = 0; i < this.size; i++) {
      this.density[i] *= decayD;
      this.velocityX[i] *= decayV;
      this.velocityY[i] *= decayV;
    }
  }

  private computeCurl(u: Float32Array, v: Float32Array, curl: Float32Array): void {
    const W = this.width;
    const H = this.height;
    
    for (let j = 1; j < H - 1; j++) {
      for (let i = 1; i < W - 1; i++) {
        const idx = i + j * W;
        if (this.obstacleManager.isObstacle(i, j)) {
          curl[idx] = 0;
          continue;
        }
        
        const du_dy = (u[i + (j + 1) * W] - u[i + (j - 1) * W]) * 0.5;
        const dv_dx = (v[i + 1 + j * W] - v[i - 1 + j * W]) * 0.5;
        curl[idx] = du_dy - dv_dx;
      }
    }
  }

  private applyVorticity(
    u: Float32Array,
    v: Float32Array,
    curl: Float32Array,
    dt: number,
    profile: FluidDynamicsProfile,
  ): void {
    const W = this.width;
    const H = this.height;
    
    for (let j = 1; j < H - 1; j++) {
      for (let i = 1; i < W - 1; i++) {
        const idx = i + j * W;
        if (this.obstacleManager.isObstacle(i, j)) continue;

        const c = curl[idx];
        const cx = Math.abs(curl[i + 1 + j * W]) - Math.abs(curl[i - 1 + j * W]);
        const cy = Math.abs(curl[i + (j + 1) * W]) - Math.abs(curl[i + (j - 1) * W]);
        
        const len = Math.sqrt(cx * cx + cy * cy) + 1e-5;
        const nx = cx / len;
        const ny = cy / len;
        
        const vorticityForce = this.config.vorticity * profile.vorticityScale;
        u[idx] += ny * c * vorticityForce * dt;
        v[idx] -= nx * c * vorticityForce * dt;
      }
    }
  }

  private applyBuoyancy(densitySource: Float32Array, dt: number, profile: FluidDynamicsProfile): void {
    if (profile.buoyancy <= 0) return;

    const W = this.width;
    const H = this.height;
    const buoyancyStrength = profile.buoyancy * dt * 0.08;

    for (let j = 1; j < H - 1; j++) {
      for (let i = 1; i < W - 1; i++) {
        if (this.obstacleManager.isObstacle(i, j)) continue;
        const idx = i + j * W;
        const localDensity = Math.max(0, densitySource[idx]);
        this.velocityY[idx] -= localDensity * buoyancyStrength;
      }
    }

    this.setBnd(2, this.velocityY);
  }

  private applyViscosity(dt: number, profile: FluidDynamicsProfile): void {
    const effectiveViscosity = this.config.viscosity * profile.viscosityScale;
    if (effectiveViscosity <= 0) return;

    const W = this.width;
    const H = this.height;
    const velDiffusion = Math.min(0.24, effectiveViscosity * dt * 260);
    const densityDiffusion = velDiffusion * profile.densityDiffusionScale * 0.4;

    this.scratchVelocityX.set(this.velocityX);
    this.scratchVelocityY.set(this.velocityY);
    this.scratchDensity.set(this.density);

    for (let j = 1; j < H - 1; j++) {
      for (let i = 1; i < W - 1; i++) {
        if (this.obstacleManager.isObstacle(i, j)) continue;

        const idx = i + j * W;
        const idxL = i - 1 + j * W;
        const idxR = i + 1 + j * W;
        const idxB = i + (j - 1) * W;
        const idxT = i + (j + 1) * W;

        const lapVX = this.scratchVelocityX[idxL] + this.scratchVelocityX[idxR] + this.scratchVelocityX[idxB] + this.scratchVelocityX[idxT] - 4 * this.scratchVelocityX[idx];
        const lapVY = this.scratchVelocityY[idxL] + this.scratchVelocityY[idxR] + this.scratchVelocityY[idxB] + this.scratchVelocityY[idxT] - 4 * this.scratchVelocityY[idx];
        const lapD = this.scratchDensity[idxL] + this.scratchDensity[idxR] + this.scratchDensity[idxB] + this.scratchDensity[idxT] - 4 * this.scratchDensity[idx];

        this.velocityX[idx] = this.scratchVelocityX[idx] + lapVX * velDiffusion;
        this.velocityY[idx] = this.scratchVelocityY[idx] + lapVY * velDiffusion;
        this.density[idx] = Math.max(0, this.scratchDensity[idx] + lapD * densityDiffusion);
      }
    }

    this.setBnd(1, this.velocityX);
    this.setBnd(2, this.velocityY);
    this.setBnd(0, this.density);
  }

  private getFluidDynamicsProfile(): FluidDynamicsProfile {
    const fluidType = this.config.fluidType;
    const input = this.getRealWorldInput(fluidType);

    const density = Math.max(0.01, input.densityKgM3);
    const dynamicViscosity = Math.max(1e-7, input.dynamicViscosityPaS);
    const kinematicViscosity = dynamicViscosity / density;
    const turbulence = this.clamp(input.turbulence, 0, 1);
    const tempDelta = input.temperatureC - input.ambientTemperatureC;
    const halfLife = Math.max(0.3, input.densityHalfLifeSeconds);
    const dampingPerSecond = Math.max(0.01, input.momentumDampingPerSecond);
    const diffusion = Math.max(1e-10, input.diffusionM2S);

    const densityRetention = this.clamp(Math.exp(-Math.log(2) / (halfLife * 60)), 0.92, 0.9996);
    const velocityRetention = this.clamp(Math.exp(-dampingPerSecond / 60), 0.94, 0.9992);
    const viscosityScale = this.clamp(Math.pow(kinematicViscosity / 0.000001, 0.35), 0.08, 3.4);
    const densityDiffusionScale = this.clamp(Math.pow(diffusion / 0.000001, 0.25), 0.18, 2.2);

    const thermalBuoyancy = this.clamp((tempDelta * 0.00035) + ((1.225 / density) * 0.08), 0, 1.8);
    const fluidTypeBoost = fluidType === 'plasma' ? 0.28 : fluidType === 'smoke' ? 0.12 : 0;
    const buoyancy = this.clamp(thermalBuoyancy + fluidTypeBoost, 0, 1.9);

    const turbulenceBoost = 0.78 + turbulence * 1.55;
    const vorticityScale = this.clamp(turbulenceBoost + (fluidType === 'plasma' ? 0.55 : 0), 0.35, 2.4);
    const velocityAdvectionScale = this.clamp(0.82 + turbulence * 0.62 + (fluidType === 'plasma' ? 0.12 : 0), 0.72, 1.45);
    const densityAdvectionScale = this.clamp(0.84 + turbulence * 0.45 + densityDiffusionScale * 0.08, 0.76, 1.35);

    return {
      velocityAdvectionScale,
      densityAdvectionScale,
      densityRetention,
      velocityRetention,
      vorticityScale,
      buoyancy,
      viscosityScale,
      densityDiffusionScale,
    };
  }

  private getRealWorldInput(fluidType: FluidType): RealWorldFluidInput {
    const base = DEFAULT_REAL_WORLD_FLUID_INPUTS[fluidType];
    const override = this.config.fluidRealWorldProfiles?.[fluidType];
    return {
      ...base,
      ...override,
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private advect(b: number, d: Float32Array, d0: Float32Array, u: Float32Array, v: Float32Array, dt: number): void {
    const W = this.width;
    const H = this.height;
    const dt0 = dt * Math.max(W, H);

    for (let j = 1; j < H - 1; j++) {
      for (let i = 1; i < W - 1; i++) {
        if (this.obstacleManager.isObstacle(i, j)) {
          d[i + j * W] = 0;
          continue;
        }

        let x = i - dt0 * u[i + j * W];
        let y = j - dt0 * v[i + j * W];

        if (x < 0.5) x = 0.5;
        if (x > W - 1.5) x = W - 1.5;
        const i0 = Math.floor(x);
        const i1 = i0 + 1;

        if (y < 0.5) y = 0.5;
        if (y > H - 1.5) y = H - 1.5;
        const j0 = Math.floor(y);
        const j1 = j0 + 1;

        const s1 = x - i0;
        const s0 = 1.0 - s1;
        const t1 = y - j0;
        const t0 = 1.0 - t1;

        d[i + j * W] =
          s0 * (t0 * d0[i0 + j0 * W] + t1 * d0[i0 + j1 * W]) +
          s1 * (t0 * d0[i1 + j0 * W] + t1 * d0[i1 + j1 * W]);
      }
    }
    this.setBnd(b, d);
  }

  private project(u: Float32Array, v: Float32Array, p: Float32Array, div: Float32Array): void {
    const W = this.width;
    const H = this.height;
    const h = 1.0 / Math.max(W, H);

    for (let j = 1; j < H - 1; j++) {
      for (let i = 1; i < W - 1; i++) {
        if (this.obstacleManager.isObstacle(i, j)) {
          div[i + j * W] = 0;
          p[i + j * W] = 0;
          continue;
        }

        let uRight = u[i + 1 + j * W];
        let uLeft = u[i - 1 + j * W];
        let vTop = v[i + (j + 1) * W];
        let vBottom = v[i + (j - 1) * W];

        if (this.obstacleManager.isObstacle(i + 1, j)) uRight = -u[i + j * W];
        if (this.obstacleManager.isObstacle(i - 1, j)) uLeft = -u[i + j * W];
        if (this.obstacleManager.isObstacle(i, j + 1)) vTop = -v[i + j * W];
        if (this.obstacleManager.isObstacle(i, j - 1)) vBottom = -v[i + j * W];

        div[i + j * W] = -0.5 * h * (uRight - uLeft + vTop - vBottom);
        p[i + j * W] = 0;
      }
    }
    this.setBnd(0, div);
    this.setBnd(0, p);

    for (let k = 0; k < 20; k++) { // Increased iterations for better projection
      for (let j = 1; j < H - 1; j++) {
        for (let i = 1; i < W - 1; i++) {
          if (this.obstacleManager.isObstacle(i, j)) continue;

          let pRight = p[i + 1 + j * W];
          let pLeft = p[i - 1 + j * W];
          let pTop = p[i + (j + 1) * W];
          let pBottom = p[i + (j - 1) * W];

          if (this.obstacleManager.isObstacle(i + 1, j)) pRight = p[i + j * W];
          if (this.obstacleManager.isObstacle(i - 1, j)) pLeft = p[i + j * W];
          if (this.obstacleManager.isObstacle(i, j + 1)) pTop = p[i + j * W];
          if (this.obstacleManager.isObstacle(i, j - 1)) pBottom = p[i + j * W];

          p[i + j * W] = (div[i + j * W] + pLeft + pRight + pBottom + pTop) / 4;
        }
      }
      this.setBnd(0, p);
    }

    for (let j = 1; j < H - 1; j++) {
      for (let i = 1; i < W - 1; i++) {
        if (this.obstacleManager.isObstacle(i, j)) {
          u[i + j * W] = 0;
          v[i + j * W] = 0;
          continue;
        }

        let pRight = p[i + 1 + j * W];
        let pLeft = p[i - 1 + j * W];
        let pTop = p[i + (j + 1) * W];
        let pBottom = p[i + (j - 1) * W];

        if (this.obstacleManager.isObstacle(i + 1, j)) pRight = p[i + j * W];
        if (this.obstacleManager.isObstacle(i - 1, j)) pLeft = p[i + j * W];
        if (this.obstacleManager.isObstacle(i, j + 1)) pTop = p[i + j * W];
        if (this.obstacleManager.isObstacle(i, j - 1)) pBottom = p[i + j * W];

        u[i + j * W] -= 0.5 * (pRight - pLeft) / h;
        v[i + j * W] -= 0.5 * (pTop - pBottom) / h;
      }
    }
    this.setBnd(1, u);
    this.setBnd(2, v);
  }

  private setBnd(b: number, x: Float32Array): void {
    const W = this.width;
    const H = this.height;

    for (let i = 1; i < W - 1; i++) {
      x[i + 0 * W] = b === 2 ? -x[i + 1 * W] : x[i + 1 * W];
      x[i + (H - 1) * W] = b === 2 ? -x[i + (H - 2) * W] : x[i + (H - 2) * W];
    }
    for (let j = 1; j < H - 1; j++) {
      x[0 + j * W] = b === 1 ? -x[1 + j * W] : x[1 + j * W];
      x[W - 1 + j * W] = b === 1 ? -x[W - 2 + j * W] : x[W - 2 + j * W];
    }

    x[0 + 0 * W] = 0.5 * (x[1 + 0 * W] + x[0 + 1 * W]);
    x[0 + (H - 1) * W] = 0.5 * (x[1 + (H - 1) * W] + x[0 + (H - 2) * W]);
    x[W - 1 + 0 * W] = 0.5 * (x[W - 2 + 0 * W] + x[W - 1 + 1 * W]);
    x[W - 1 + (H - 1) * W] = 0.5 * (x[W - 2 + (H - 1) * W] + x[W - 1 + (H - 2) * W]);
  }

  public getEstimatedMemoryBytes(): number {
    return (
      this.density.byteLength +
      this.velocityX.byteLength +
      this.velocityY.byteLength +
      this.densityOld.byteLength +
      this.velocityXOld.byteLength +
      this.velocityYOld.byteLength +
      this.curl.byteLength
    );
  }

  public dispose(): void {
    this.width = 0;
    this.height = 0;
    this.size = 0;
    this.density = new Float32Array(0);
    this.velocityX = new Float32Array(0);
    this.velocityY = new Float32Array(0);
    this.densityOld = new Float32Array(0);
    this.velocityXOld = new Float32Array(0);
    this.velocityYOld = new Float32Array(0);
    this.curl = new Float32Array(0);
    this.scratchVelocityX = new Float32Array(0);
    this.scratchVelocityY = new Float32Array(0);
    this.scratchDensity = new Float32Array(0);
  }
}
