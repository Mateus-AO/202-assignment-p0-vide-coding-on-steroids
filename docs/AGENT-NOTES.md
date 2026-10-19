# Agent notes

Non-obvious facts that cost time to learn. The environment (configs, scripts, folder layout, `docs/ARCHITECTURE.md`) already answers the rest.

## Rendering gotchas

- **Portal frame.** drei `MeshPortalMaterial` draws its children in the portal mesh's own frame. `WorldStack` shifts the next world by `-cameraPath(0).position` so its camera start sits on the portal plane. Once `blend > 0` the portal takes over the render loop, so an `EffectComposer` (bloom) conflicts with it; the page has no post-processing for that reason.
- **Tone mapping differs on screen and through a portal.** The renderer tone-maps on screen; through a portal the portal material tone-maps everything. A custom `ShaderMaterial` must end with `#include <tonemapping_fragment>` then `#include <colorspace_fragment>`, or it changes color at the swap (this once looked like "the fog changes"). Pure white needs `toneMapped={false}` (Pong's whites and debris).
- **Remount at the swap.** A world moves from inside the portal to the root, so it remounts. A cover exit hides that; a portal exit relies on identical frames.
- **No browser access at import.** Never touch `window`/`document` at module load (textures use `document`). Create them inside `useMemo` or functions, or tests and imports crash.
- **Circular imports crash the app while Vitest stays green** (its loader does not enforce temporal dead zones). Keep timing in `beats.ts`/`config.ts`, and run `npm run check:cycles`.
- **React Compiler lint.** `useMemo` takes an inline function. Mutating three.js objects from a hook needs the `eslint-disable react-hooks/immutability` pair used in `useSceneAtmosphere`.
- **Lights.** Materials are unlit (`MeshBasicMaterial`, `blockMaterials` shades faces by hand), so they work inside portals with no lights.
- **Drive uniforms through the material.** Set a `ShaderMaterial`'s uniform values via `material.current.uniforms` (a ref), as `ScreenMosaic` and the terminal do. Mutating a memoized `uniforms` object never reached the GPU: the terminal's text stayed invisible (fade stuck at 0) while every test passed.
- **GLSL `pow(x, y)` is undefined for negative `x`.** It gave NaN here and every glyph drew black. Square with `x * x`.
- **Portal into a world with untoned materials.** `PortalGate` shifts the next world by its camera start at the viewport's real aspect (Pong pulls back on narrow screens). drei's blend quad tone-maps the whole picture, so a next world made of `toneMapped={false}` materials (Pong) looked grey in the portal (226) and jumped to 255 at the swap. The starter sets `gl.toneMapping = NoToneMapping` while mounted; check any new portal into such a world by comparing max pixel values just before and after the swap.
- **Fog and sky share `HORIZON`** (`worlds/voxel/atmosphere.ts`). Change it in one place.

## Verifying visually

1. `npm run dev -- --port <free port>`. Pick a port no other agent uses.
2. In a scratch dir outside the repo: `npm i playwright && npx playwright install chromium`.
3. From that dir: `PORT=<port> OUT=/tmp/shots node <repo>/scripts/shot.mjs 0.1 0.5 0.9`, then read the PNGs. Env: `W`, `H` (use 390×844 for phones), `PREFIX`.
4. `/?progress=<p>` (dev only) pins overall progress p in [0, 1]. World i spans `[scrollBoundary(worlds, i), scrollBoundary(worlds, i + 1)]` (worlds have different `scrollWeight`s; the starter is 0.3), and its local progress is the position inside that span. Convert beat ranges to p before choosing shots. `/` (no `progress`) shows the starter's loading state; add `?boot=6` to hold it for 6 s.
5. Headless Firefox (snap) hangs; use the Playwright Chromium. Software WebGL gives about 10 fps, so judge frame time by code (draw calls, per-frame allocation), not by that fps.
6. Combine shots into contact sheets with Python PIL to compare moments.

## Working in parallel

Give each agent its own folder (a world, or `utils/transitions`), its own dev-server port, and its own screenshot directory. Format only your folder (`npx prettier --write <folder>`), never the whole tree, and kill only your own server by PID.

## Per-world notes

- **Starter** (`camera.ts`, `loading.ts`, `layout.ts`, `Starter.tsx`, `shaders.ts`, `casing.ts`): a plate with a rounded window in front of a 4 x 3 glass; the camera flies straight down -z from `startDistance(aspect)` to the glass plane. `camera.ts` is the contract: window and glass rectangles in viewport fractions at u = 0 (`windowRect`, `glassRect`) place the DOM Play button (`layout.ts`) and are tested for every aspect. The boot picture is a canvas redrawn only when its numeric key changes (typed characters, bar cells, OK bits, blink). Flicker is a 2 Hz, 2% brightness ripple plus a hum bar every 8 s; READY blinks at 1 Hz; all off under reduced motion. Scanline count follows the glass's pixel height to avoid moire on phones. Copy and the boot log are in `captions.ts`.
- **Pong** (`rally.ts`): pure rally path with 10 contacts; the ball strikes the block as `crack` starts. `court.ts` holds `BLOCK_POS`, which `world.ts` and the scene both read. The block is black with a white frame; cracks and debris are white (the shared `CrackOverlay` draws dark cracks, invisible on black).
- **Voxel** (`creeper.ts`, `beats.ts`): the creature wanders by clock time, drifts to its spot and turns to the camera during `notice`, ignites during `hiss`, explodes at `blast`. Its position is pure in `u` and time; the camera locks on `creeperSpot`. Trees and plants keep clear of the camera corridor and the creature stage (tests enforce it).
- **Platformer** (`hero.ts`, `config.ts`, `beats.ts`): hero position and jumps are pure functions of x, which comes from `u`; jumps are centered on obstacles and never overlap (tests). `platformerCamera` centers on the hero and pulls back on narrow screens. The end is choreographed in `beats.ts`: `run` to the flag, `approach` (he steps to `LANE_Z` in front of the wall, which tests keep clear of the castle), `turn`, `enter` (walks into the door), `dolly` (camera ends 0.56 in front of the door, which then fills the screen at every aspect up to 2.4; tests), then `dark`, the black cover into the terminal. `mechanics.ts` exports the numbers the terminal shows. `sound.ts` puts every cue at `uAtX(x)` (the inverse of `heroX`, kept beside it in `hero.ts`), and its footsteps follow `heroTravel`, so they carry on to the door and stop while he stands turning; the `door` and `dark` cues sit on the `enter` and `dolly` beats.
- **Terminal** (`script.ts`, `screen.ts`, `Terminal.tsx`): one quad drawn by a shader from a 48 x 24 cell buffer that `renderScreen(u, out)` rewrites each frame (pure, allocation-free; lines type, hex rewrites into assembly through scrambled glyphs, the session scrolls). Its numbers are copied in `recovered.ts`; a test in `app/worlds.test.ts` fails if they drift from the platformer's `mechanics`. The panel turns away from the pointer (`tilt.ts`, `utils/hooks/usePointer`), sways with `u` on touch screens and holds still under reduced motion. The glyph atlas is the browser's monospace font thresholded to hard pixels, so letter shapes vary by platform. The disassembly bytes are made up (the script says so); the table values are real. The terminal's script, camera, panel fade, sway and captions are in _story time_ (0 to 1); `uToStory(u)` / `storyToU` (`beats.ts`) map them onto the first `STORY_END` = 0.9 of the world's progress, and the world has `scrollWeight` 1 / 0.9, so the story keeps the scroll distance it always had while the CRT shutdown plays over the last tenth.
- **Wall** (`layout.ts`, `beats.ts`, `script.ts`, `picture.ts`, `Wall.tsx`, `shaders.ts`, `model.ts`): nine TV sets piled 4-3-2. `layout.ts` is the contract: each set's `SLOTS` entry (its slice `rect` of the 48 x 28 picture grid), seeded `POSES` (yaw, roll, scale, nudges), `tiltAt` (the sets ease to 40% of their tilt while the picture assembles), `WAVE_RANK` (the warm-up and assemble waves run from the pile's center out) and `warmAmount` / `assembleAmount`. `script.ts` (`tvScreen`) fills each set's 28 x 12 character grid with its own seeded decompile session; `picture.ts` (`renderPicture`) draws the mascot, whose eyes take the pointer's `look` and a clock-based `blink` (`blink.ts`). Each set shows its own slice inside its own tilted glass, so the finished picture is a hand-stacked mosaic, not a seamless projection; the figure is composed so its eyes land in the center set and its legs in the bottom row (tests check the share of it that shows through the sets).
- **CRT shutdown** (`utils/transitions/crt.ts`, `CrtShutdown.tsx`): a pure shape of phase `t` (bars to a line to a dot to black); `frameAt` gives it a linear phase and the easing lives in `crt.ts`. `WorldStack` hides crt covers from the mosaic.
- **Cover** (`utils/transitions/ScreenMosaic.tsx`): white covers, then clears outward from the center into a large cluster of see-through squares; the overlay is gone after the first 30% of the reveal. With `style: 'black'` it is a plain fade through black over the whole reveal (the shader's plain-fade branch, also used by reduced motion). Square size = screen height / `rows`, rounded to 8px.

## Known rough edges and ideas

- Sound has never been auditioned on a real device (the 8 kHz whine of the terminal's bed, tick levels and the shutdown whine are the things to check by ear); the shutdown has only been checked in pinned frames, not real-time playback.
- Working with agent worktrees: they live under `.claude/worktrees/` (ignored by git and ESLint). A worktree may start from `main`, not from your integration branch, so tell each agent which commit to base on; each agent's `node_modules` is a symlink, which makes the dev server answer 403 for the pixel font (harmless in checks).

- Pong: after its last bounce the ball sits still until the block shatters.
- Voxel: water is a flat plane; grass tufts read pale; oak crowns are blocky; the low quality tier has no screenshots.
- Platformer: no pits or stomping.
- Bundle is one chunk (~1.3 MB, 360 kB gzip); the world modules could load lazily.
- Sound (`utils/audio`, each world's `sound.ts`): all synthesized, off until a click/tap/key unlocks it; `recordVoice` in `utils/audio` is the test double for checking what a cue plays.
- Not built yet: the closing "what's next" crossover section (hero-shooter idea), touch controls are not needed (no interactive games).
