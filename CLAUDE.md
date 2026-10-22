# CLAUDE.md — notes for future sessions

Browser VR/3D experience «حين تتحدث الدوال بلغة المشاعر»: a walk along Jebel Tuwaiq with 10 math-function stations.
- `PROJECT_BRIEF.md` = the vision (background only, not a task list).
- `PLAN.md` = the agreed step-by-step plan. **Work one step at a time, only when the user names the step.** At the end of a step: tick its box, summarise, give test notes (laptop / phone / VR emulator), make **one commit** (`Step X.Y: short title`), then stop.
- Never change the Arabic content text. Ask if something looks like a typo.
- Pin every dependency exactly (`npm install --save-exact`).

## Run
- `npm install`
- `npm run dev` → `https://localhost:5173` (self-signed cert: accept the warning). The terminal also prints a `Network` URL for a phone on the same Wi-Fi. HTTPS is required for motion sensors and WebXR.
- `npm run build` → `dist/`. `BASE_PATH=/repo-name/ npm run build` for GitHub Pages.

## Stack
- Vite 8 (vanilla JS) + `@vitejs/plugin-basic-ssl`, config in `vite.config.js` (`base` from `BASE_PATH` env, default `/`).
- A-Frame 1.8.0 (npm). It depends on `three` = `npm:super-three@0.184.0`; troika-three-text must share that same package (step 1.2).

## Structure
- `index.html`: the `<a-scene>`.
- `src/main.js`: entry; imports A-Frame.
- `assets/`: fonts (Tajawal for Arabic, Fira Sans for math formulas; Cairo unused). Audio/images may be added later and must stay optional.

## Decisions
See the "Decisions" table in `PLAN.md`.

## Progress
- Step 1.1 done: scaffold + HTTPS dev server.
