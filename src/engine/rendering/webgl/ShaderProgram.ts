export class ShaderProgram {
  public program: WebGLProgram;
  private gl: WebGL2RenderingContext;
  private uniformLocations: Map<string, WebGLUniformLocation> = new Map();

  constructor(gl: WebGL2RenderingContext, vertexSrc: string, fragmentSrc: string) {
    this.gl = gl;
    this.program = this.createProgram(vertexSrc, fragmentSrc);
  }

  private compileShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const info = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error(`Shader compilation failed: ${info}`);
    }
    return shader;
  }

  private createProgram(vertexSrc: string, fragmentSrc: string): WebGLProgram {
    const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexSrc);
    const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentSrc);

    const program = this.gl.createProgram()!;
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const info = this.gl.getProgramInfoLog(program);
      throw new Error(`Program linking failed: ${info}`);
    }

    // Clean up shaders as they are no longer needed once linked
    this.gl.deleteShader(vertexShader);
    this.gl.deleteShader(fragmentShader);

    return program;
  }

  public bind(): void {
    this.gl.useProgram(this.program);
  }

  public getUniformLocation(name: string): WebGLUniformLocation | null {
    if (!this.uniformLocations.has(name)) {
      const location = this.gl.getUniformLocation(this.program, name);
      if (location !== null) {
        this.uniformLocations.set(name, location);
      }
    }
    return this.uniformLocations.get(name) || null;
  }

  public setUniform1i(name: string, value: number): void {
    const loc = this.getUniformLocation(name);
    if (loc) this.gl.uniform1i(loc, value);
  }

  public setUniform1f(name: string, value: number): void {
    const loc = this.getUniformLocation(name);
    if (loc) this.gl.uniform1f(loc, value);
  }

  public setUniform2f(name: string, x: number, y: number): void {
    const loc = this.getUniformLocation(name);
    if (loc) this.gl.uniform2f(loc, x, y);
  }

  public setUniform3f(name: string, x: number, y: number, z: number): void {
    const loc = this.getUniformLocation(name);
    if (loc) this.gl.uniform3f(loc, x, y, z);
  }

  public dispose(): void {
    this.gl.deleteProgram(this.program);
  }
}
