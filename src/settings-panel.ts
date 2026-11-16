import { DEFAULTS, SECTIONS, type ControlDef, type Settings } from "./settings";

const SLIDERS_ICON = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" aria-hidden="true">
<path d="M2 4h7M13 4h1M2 8h2M8 8h6M2 12h8M14 12h0"/><circle cx="11" cy="4" r="1.6"/><circle cx="6" cy="8" r="1.6"/><circle cx="12" cy="12" r="1.6"/></svg>`;

export interface SettingsPanel {
  isOpen(): boolean;
  close(): void;
}

/**
 * Builds the settings button + popover into `root`. Calls `onChange` with the
 * full settings object after every edit.
 */
export function createSettingsPanel(
  root: HTMLElement,
  initial: Settings,
  onChange: (s: Settings) => void,
): SettingsPanel {
  let settings: Settings = { ...initial };
  /** Pushes current `settings` into every control. */
  const syncers: (() => void)[] = [];

  const button = document.createElement("button");
  button.type = "button";
  button.className = "gear";
  button.setAttribute("aria-label", "Settings");
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", "settings-panel");
  button.innerHTML = SLIDERS_ICON;

  const panel = document.createElement("form");
  panel.className = "panel";
  panel.id = "settings-panel";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Settings");
  panel.addEventListener("submit", (e) => e.preventDefault());

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    settings = { ...settings, [key]: value };
    onChange(settings);
  };

  for (const section of SECTIONS) {
    const fs = document.createElement("fieldset");
    fs.className = "section";
    const legend = document.createElement("legend");
    legend.textContent = section.title;
    fs.appendChild(legend);
    for (const def of section.controls) fs.appendChild(buildControl(def));
    panel.appendChild(fs);
  }

  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "reset";
  reset.textContent = "Reset to defaults";
  reset.addEventListener("click", () => {
    settings = { ...DEFAULTS };
    syncers.forEach((s) => s());
    onChange(settings);
  });
  panel.appendChild(reset);

  root.append(button, panel);

  function buildControl(def: ControlDef): HTMLElement {
    const id = `set-${def.key}`;
    const row = document.createElement("div");
    row.className = `row row-${def.kind}`;

    if (def.kind === "range") {
      const label = document.createElement("label");
      label.htmlFor = id;
      label.textContent = def.label;
      const out = document.createElement("output");
      out.htmlFor.add(id);
      const input = document.createElement("input");
      input.type = "range";
      input.id = id;
      input.min = String(def.min);
      input.max = String(def.max);
      input.step = String(def.step);
      const sync = () => {
        input.value = String(settings[def.key]);
        out.textContent = def.format(settings[def.key]);
        input.style.setProperty("--fill", `${((settings[def.key] - def.min) / (def.max - def.min)) * 100}%`);
      };
      input.addEventListener("input", () => {
        update(def.key, Number(input.value));
        sync();
      });
      // Double-click a slider to restore its default.
      input.addEventListener("dblclick", () => {
        update(def.key, DEFAULTS[def.key]);
        sync();
      });
      syncers.push(sync);
      sync();
      const head = document.createElement("div");
      head.className = "row-head";
      head.append(label, out);
      row.append(head, input);
    } else if (def.kind === "choice") {
      const group = document.createElement("div");
      group.className = "seg";
      group.setAttribute("role", "radiogroup");
      group.setAttribute("aria-labelledby", `${id}-label`);
      const label = document.createElement("span");
      label.id = `${id}-label`;
      label.textContent = def.label;
      const inputs = def.options.map((opt, i) => {
        const optId = `${id}-${i}`;
        const input = document.createElement("input");
        input.type = "radio";
        input.name = id;
        input.id = optId;
        input.addEventListener("change", () => input.checked && update(def.key, opt.value));
        const l = document.createElement("label");
        l.htmlFor = optId;
        l.textContent = opt.label;
        group.append(input, l);
        return { input, value: opt.value };
      });
      const sync = () => inputs.forEach((o) => (o.input.checked = o.value === settings[def.key]));
      syncers.push(sync);
      sync();
      row.append(label, group);
    } else {
      const label = document.createElement("label");
      label.htmlFor = id;
      label.textContent = def.label;
      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = id;
      input.setAttribute("role", "switch");
      input.addEventListener("change", () => update(def.key, input.checked));
      const sync = () => (input.checked = settings[def.key]);
      syncers.push(sync);
      sync();
      row.append(label, input);
    }
    return row;
  }

  const setOpen = (open: boolean) => {
    panel.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
    root.classList.toggle("open", open);
  };
  const close = () => setOpen(false);

  button.addEventListener("click", () => setOpen(panel.hidden));
  document.addEventListener("pointerdown", (e) => {
    if (!panel.hidden && !root.contains(e.target as Node)) close();
  });
  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) {
      close();
      button.focus();
    }
  });

  return { isOpen: () => !panel.hidden, close };
}
