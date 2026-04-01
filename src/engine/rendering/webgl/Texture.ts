export class Texture {
  public texture: WebGLTexture;
  private gl: WebGL2RenderingContext;
  private width: number;
  private height: number;
  private internalFormat: number;
  private format: number;
  private type: number;

  constructor(gl: WebGL2RenderingContext, width: number, height: number, internalFormat: number, format: number, type: number) {
    this.gl = gl;
    this.width = width;
    this.height = height;
    this.internalFormat = internalFormat;
    this.format = format;
    this.type = type;

    this.texture = this.gl.createTexture()!;
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    
    // Linear filtering for smooth interpolation
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    
    // Clamp to edge to prevent wrapping artifacts
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.internalFormat, this.width, this.height, 0, this.format, this.type, null);
  }

  public updateData(data: ArrayBufferView): void {
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, this.width, this.height, this.format, this.type, data);
  }

  public bind(unit: number): void {
    this.gl.activeTexture(this.gl.TEXTURE0 + unit);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
  }

  public dispose(): void {
    this.gl.deleteTexture(this.texture);
  }
}
