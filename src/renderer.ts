import { HEAD, MAX_CLICKS, VERTEX, type Wallpaper } from "./shaders";

/** User colour grade applied in the shared `finish()` pass. */
export interface Look {
  hue: number; // degrees
  saturation: number;
  brightness: number;
  grain: number;
  vignette: number;
}

interface Program {
  program: WebGLProgram;
  R: WebGLUniformLocation | null;
  T: WebGLUniformLocation | null;
  M: WebGLUniformLocation | null;
  C: WebGLUniformLocation | null;
  Look: WebGLUniformLocation | null;
  Vig: WebGLUniformLocation | null;
}

/** Draws one full-screen triangle with the active wallpaper's fragment shader. */
export class Renderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly programs: Program[];
  private readonly clicks = new Float32Array(MAX_CLICKS * 3);
  private clickIndex = 0;
  /** Shader clock in seconds; advances at the user's speed setting. */
  private time = 0;

  constructor(private readonly canvas: HTMLCanvasElement, wallpapers: Wallpaper[]) {
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false });
    if (!gl) throw new Error("WebGL2 not available");
    this.gl = gl;

    for (let i = 0; i < MAX_CLICKS; i++) this.clicks[i * 3 + 2] = -99;

    const vs = this.compile(gl.VERTEX_SHADER, VERTEX);
    this.programs = wallpapers.map((w) => {
      const program = gl.createProgram()!;
      gl.attachShader(program, vs);
      gl.attachShader(program, this.compile(gl.FRAGMENT_SHADER, HEAD + w.src));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(w.name, gl.getProgramInfoLog(program));
      }
      const u = (n: string) => gl.getUniformLocation(program, n);
      return { program, R: u("R"), T: u("T"), M: u("M"), C: u("C"), Look: u("Look"), Vig: u("Vig") };
    });
    gl.bindVertexArray(gl.createVertexArray());
  }

  /** Advances the shader clock by `dt` (already scaled by speed). */
  advance(dt: number): void {
    this.time += dt;
  }

  resize(width: number, height: number, dpr: number): void {
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  /** Records a click (aspect-corrected coords) to spawn a ripple. */
  addClick(x: number, y: number): void {
    const i = this.clickIndex * 3;
    this.clicks[i] = x;
    this.clicks[i + 1] = y;
    this.clicks[i + 2] = this.time;
    this.clickIndex = (this.clickIndex + 1) % MAX_CLICKS;
  }

  draw(index: number, mouse: [number, number], look: Look): void {
    const { gl, canvas } = this;
    const p = this.programs[index];
    gl.useProgram(p.program);
    gl.uniform2f(p.R, canvas.width, canvas.height);
    gl.uniform1f(p.T, this.time);
    gl.uniform2f(p.M, mouse[0], mouse[1]);
    gl.uniform3fv(p.C, this.clicks);
    gl.uniform4f(p.Look, (look.hue * Math.PI) / 180, look.saturation, look.brightness, look.grain);
    gl.uniform1f(p.Vig, look.vignette);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private compile(type: number, source: string): WebGLShader {
    const { gl } = this;
    const s = gl.createShader(type)!;
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
    return s;
  }
}
