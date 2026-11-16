export type Quality = "low" | "medium" | "high";

export interface Settings {
  /** Time multiplier; 0 pauses. */
  speed: number;
  /** Hue rotation in degrees. */
  hue: number;
  saturation: number;
  brightness: number;
  grain: number;
  vignette: number;
  quality: Quality;
  /** Seconds between automatic wallpaper changes; 0 = off. */
  autoCycle: number;
  showSwitcher: boolean;
}

export const DEFAULTS: Settings = {
  speed: 1,
  hue: 0,
  saturation: 1,
  brightness: 1,
  grain: 1,
  vignette: 1,
  quality: "medium",
  autoCycle: 0,
  showSwitcher: true,
};

/** Max device-pixel-ratio per quality level. */
export const QUALITY_DPR: Record<Quality, number> = { low: 0.75, medium: 1.5, high: 2 };

type NumericKey = { [K in keyof Settings]: Settings[K] extends number ? K : never }[keyof Settings];

export interface RangeDef {
  kind: "range";
  key: NumericKey;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}

export interface ChoiceDef<K extends keyof Settings = keyof Settings> {
  kind: "choice";
  key: K;
  label: string;
  options: { value: Settings[K]; label: string }[];
}

export interface ToggleDef {
  kind: "toggle";
  key: "showSwitcher";
  label: string;
}

export type ControlDef = RangeDef | ChoiceDef | ToggleDef;

const pct = (v: number) => `${Math.round(v * 100)}%`;

export const SECTIONS: { title: string; controls: ControlDef[] }[] = [
  {
    title: "Look",
    controls: [
      { kind: "range", key: "hue", label: "Hue", min: -180, max: 180, step: 1, format: (v) => `${v > 0 ? "+" : ""}${v}°` },
      { kind: "range", key: "saturation", label: "Saturation", min: 0, max: 2, step: 0.01, format: pct },
      { kind: "range", key: "brightness", label: "Brightness", min: 0.5, max: 1.5, step: 0.01, format: pct },
      { kind: "range", key: "grain", label: "Grain", min: 0, max: 4, step: 0.05, format: pct },
      { kind: "range", key: "vignette", label: "Vignette", min: 0, max: 2, step: 0.01, format: pct },
    ],
  },
  {
    title: "Motion",
    controls: [
      { kind: "range", key: "speed", label: "Speed", min: 0, max: 3, step: 0.05, format: (v) => (v === 0 ? "Paused" : `${v.toFixed(2)}×`) },
      {
        kind: "choice",
        key: "autoCycle",
        label: "Auto-cycle",
        options: [
          { value: 0, label: "Off" },
          { value: 30, label: "30s" },
          { value: 60, label: "1m" },
          { value: 300, label: "5m" },
        ],
      },
    ],
  },
  {
    title: "Display",
    controls: [
      {
        kind: "choice",
        key: "quality",
        label: "Quality",
        options: [
          { value: "low", label: "Low" },
          { value: "medium", label: "Med" },
          { value: "high", label: "High" },
        ],
      },
      { kind: "toggle", key: "showSwitcher", label: "Show switcher" },
    ],
  },
];

const STORAGE_KEY = "shaderwall.settings";

/** Loads saved settings, discarding anything missing, mistyped or out of range. */
export function loadSettings(): Settings {
  const s: Settings = { ...DEFAULTS };
  let raw: Record<string, unknown> = {};
  try {
    raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") ?? {};
  } catch {
    return s;
  }
  for (const section of SECTIONS) {
    for (const c of section.controls) {
      const v = raw[c.key];
      if (c.kind === "range" && typeof v === "number" && Number.isFinite(v)) {
        s[c.key] = Math.min(c.max, Math.max(c.min, v));
      } else if (c.kind === "choice" && c.options.some((o) => o.value === v)) {
        (s as unknown as Record<string, unknown>)[c.key] = v;
      } else if (c.kind === "toggle" && typeof v === "boolean") {
        s[c.key] = v;
      }
    }
  }
  return s;
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}
