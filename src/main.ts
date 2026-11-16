import "./style.css";
import { Renderer } from "./renderer";
import { WALLPAPERS } from "./shaders";

const STORAGE_KEY = "shaderwall.idx";
const FADE_MS = 350;
const IDLE_MS = 2500;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>("c");
const ui = $("ui");
const dots = $("dots");
const num = $("num");
const lbl = $("lbl");

let renderer: Renderer;
try {
  renderer = new Renderer(canvas, WALLPAPERS);
} catch {
  document.body.insertAdjacentHTML("beforeend", '<div class="err">WebGL2 not available</div>');
  throw new Error("WebGL2 not available");
}

// ---- Layout -------------------------------------------------------------
let W = 0;
let H = 0;
function resize() {
  W = innerWidth;
  H = innerHeight;
  renderer.resize(W, H, Math.min(devicePixelRatio || 1, 1.5));
}
addEventListener("resize", resize);
resize();

/** Client px → shader space (height = 1, origin at centre, y up). */
const toShader = (x: number, y: number): [number, number] => [(x - W / 2) / H, (H / 2 - y) / H];

// ---- Pointer ------------------------------------------------------------
let target: [number, number] = [0.18, 0.08];
const mouse: [number, number] = [0.18, 0.08];

let idleTimer: number | undefined;
function wake() {
  ui.classList.remove("idle");
  clearTimeout(idleTimer);
  idleTimer = window.setTimeout(() => ui.classList.add("idle"), IDLE_MS);
}

addEventListener("pointermove", (e) => {
  target = toShader(e.clientX, e.clientY);
  wake();
});
canvas.addEventListener("pointerdown", (e) => {
  const [x, y] = toShader(e.clientX, e.clientY);
  renderer.addClick(x, y);
});

// ---- Switcher -----------------------------------------------------------
function readIndex(): number {
  try {
    const n = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
    return Number.isInteger(n) && n >= 0 ? n % WALLPAPERS.length : 0;
  } catch {
    return 0;
  }
}
let index = readIndex();

const buttons = WALLPAPERS.map((w, i) => {
  const b = document.createElement("button");
  b.type = "button";
  b.title = w.name;
  b.setAttribute("aria-label", w.name);
  b.addEventListener("click", () => go(i));
  dots.appendChild(b);
  return b;
});

function renderLabel() {
  num.textContent = String(index + 1).padStart(2, "0");
  lbl.textContent = WALLPAPERS[index].name;
  ui.dataset.theme = WALLPAPERS[index].theme;
  buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(i === index)));
}

let switchTimer: number | undefined;
function go(i: number) {
  i = (i + WALLPAPERS.length) % WALLPAPERS.length;
  if (i === index) return;
  clearTimeout(switchTimer);
  canvas.style.opacity = "0";
  switchTimer = window.setTimeout(() => {
    index = i;
    try {
      localStorage.setItem(STORAGE_KEY, String(index));
    } catch {
      /* storage unavailable */
    }
    renderLabel();
    canvas.style.opacity = "1";
  }, FADE_MS);
  wake();
}

addEventListener("keydown", (e) => {
  const n = Number(e.key);
  if (Number.isInteger(n) && n >= 1 && n <= WALLPAPERS.length) go(n - 1);
  else if (e.key === "ArrowRight") go(index + 1);
  else if (e.key === "ArrowLeft") go(index - 1);
});

renderLabel();
wake();

// ---- Loop ---------------------------------------------------------------
let last = renderer.now();
function frame() {
  const t = renderer.now();
  const dt = Math.min(t - last, 0.1);
  last = t;
  const k = 1 - Math.exp(-dt * 6); // frame-rate independent easing toward pointer
  mouse[0] += (target[0] - mouse[0]) * k;
  mouse[1] += (target[1] - mouse[1]) * k;
  renderer.draw(index, t, mouse);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
