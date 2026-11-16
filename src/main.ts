import "./style.css";
import { Renderer } from "./renderer";
import { QUALITY_DPR, loadSettings, saveSettings, type Settings } from "./settings";
import { createSettingsPanel } from "./settings-panel";
import { WALLPAPERS } from "./shaders";

const STORAGE_KEY = "shaderwall.idx";
const FADE_MS = 350;
const IDLE_MS = 2500;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>("c");
const dots = $("dots");
const num = $("num");
const lbl = $("lbl");
const body = document.body;

let renderer: Renderer;
try {
  renderer = new Renderer(canvas, WALLPAPERS);
} catch {
  document.body.insertAdjacentHTML("beforeend", '<div class="err">WebGL2 not available</div>');
  throw new Error("WebGL2 not available");
}

let settings: Settings = loadSettings();

// ---- Layout -------------------------------------------------------------
let W = 0;
let H = 0;
function resize() {
  W = innerWidth;
  H = innerHeight;
  renderer.resize(W, H, Math.min(devicePixelRatio || 1, QUALITY_DPR[settings.quality]));
}
addEventListener("resize", resize);
resize();

/** Client px → shader space (height = 1, origin at centre, y up). */
const toShader = (x: number, y: number): [number, number] => [(x - W / 2) / H, (H / 2 - y) / H];

// ---- Pointer / idle -----------------------------------------------------
let target: [number, number] = [0.18, 0.08];
const mouse: [number, number] = [0.18, 0.08];

let idleTimer: number | undefined;
function wake() {
  body.classList.remove("idle");
  clearTimeout(idleTimer);
  idleTimer = window.setTimeout(() => {
    if (!panel.isOpen()) body.classList.add("idle");
  }, IDLE_MS);
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
  body.dataset.theme = WALLPAPERS[index].theme;
  buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(i === index)));
}

let cycleTimer: number | undefined;
function scheduleCycle() {
  clearTimeout(cycleTimer);
  if (settings.autoCycle > 0) cycleTimer = window.setTimeout(() => go(index + 1, false), settings.autoCycle * 1000);
}

let switchTimer: number | undefined;
function go(i: number, fromUser = true) {
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
    scheduleCycle();
  }, FADE_MS);
  if (fromUser) wake();
}

addEventListener("keydown", (e) => {
  // Leave keys alone while a form control has focus (sliders use arrows).
  if ((e.target as HTMLElement).closest?.("input, select, textarea")) return;
  const n = Number(e.key);
  if (Number.isInteger(n) && n >= 1 && n <= WALLPAPERS.length) go(n - 1);
  else if (e.key === "ArrowRight") go(index + 1);
  else if (e.key === "ArrowLeft") go(index - 1);
});

// ---- Settings -----------------------------------------------------------
function applySettings(prev: Settings | null) {
  body.classList.toggle("no-switcher", !settings.showSwitcher);
  if (prev && prev.quality !== settings.quality) resize();
  if (!prev || prev.autoCycle !== settings.autoCycle) scheduleCycle();
}

const panel = createSettingsPanel($("settings"), settings, (next) => {
  const prev = settings;
  settings = next;
  saveSettings(settings);
  applySettings(prev);
  wake();
});

renderLabel();
applySettings(null);
wake();

// ---- Loop ---------------------------------------------------------------
let last = performance.now();
function frame(nowMs: number) {
  const dt = Math.min((nowMs - last) / 1000, 0.1);
  last = nowMs;
  renderer.advance(dt * settings.speed);
  const k = 1 - Math.exp(-dt * 6); // frame-rate independent easing toward pointer
  mouse[0] += (target[0] - mouse[0]) * k;
  mouse[1] += (target[1] - mouse[1]) * k;
  renderer.draw(index, mouse, settings);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
