# Shader Wallpapers

Five interactive full-screen WebGL2 wallpapers — **Drift**, **Lattice**, **Contour**, **Glass**, **Liquid**.

- Move the pointer to bend the scene; click to send ripples.
- Switch with the dots, keys `1`–`5`, or `←` / `→`. The choice is remembered.
- Open the settings menu (top right) to adjust hue, saturation, brightness, grain, vignette, speed, auto-cycle, render quality and switcher visibility. Settings are saved; double-click a slider to reset it.

```bash
npm install
npm run dev
```

Shaders live in `src/shaders.ts`; add an entry to `WALLPAPERS` to add a wallpaper. Settings are defined in `src/settings.ts` — the panel is generated from `SECTIONS`.
