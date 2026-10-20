# Architecture

One cinematic scroll through game worlds. Each world hands over to the next through a portal or a full-screen cover.
React + TypeScript + Vite, React Three Fiber + drei (3D), Lenis + GSAP (scroll), Tailwind, Zustand, Vitest.

```
src/
  app/          shell: App, GlobalCanvas, WorldStack (portal + camera + cover), Captions,
                store (the current Frame), worlds.ts (order)
  core/         the page's own concepts: world contract (defineWorld), beats, timeline (frameAt)
  worlds/       one self-contained folder per world: world.ts, beats.ts, scene files
  components/   shared UI (Caption, WebGLFallback)
  utils/        wide-scope reusable code, knows nothing about this page:
    math/         clamp, lerp, smoothstep, easing, seeded random, Vec3
    three/        quality tier, WebGL check, pixel art (noise + block materials),
                  scene atmosphere (background + fog), InstancedBlocks
    transitions/  CrackOverlay, VoxelDebris, ScreenMosaic (full-screen cover)
    scroll/ hooks/
    audio/        synthesized sound: AudioContext lifecycle, limiter + hard ceiling,
                  tones/noise bursts, ambient beds, cue crossing, preference storage
  styles/       Tailwind entry + tokens
```

See `GLOSSARY.md` for the vocabulary (world, beat, timeline, frame, exit, cover).

## How it works

- Scroll gives raw progress; each world takes a share of it by its `scrollWeight` (default 1; the terminal's is 1 / 0.9, see `scrollBoundary` in `core/timeline.ts`). `frameAt(worlds, progress, { reduced })` (`core/timeline.ts`, pure) returns a **Frame**: active world, local progress `u`, camera pose, portal state, cover state, caption. `App` stores it; nothing else derives timing.
- `CameraRig` applies `frame.pose`. `PortalGate` applies `frame.portal`. `ScreenMosaic` draws `frame.cover`. `Captions` shows `frame.caption`. Scenes read `getU()` inside `useFrame`, never during render. Scrubbing is deterministic and works in reverse.
- `WorldStack` mounts only the active world and, inside its portal, the next world (drei `MeshPortalMaterial`).
- Sound is off by default: `SoundControl` builds no AudioContext until a click, tap or key, and `soundDirector` plays each world's `sound.ts` cues for the progress the scroll crossed (forward only) and crossfades the world's ambient bed at handoffs.
- **Loading screen and scroll lock.** The first world, `starter`, is a CRT with a fisheye shader of its own (no post-processing). `App` starts `useSmoothScroll` locked (`overflow: hidden` on the root, Lenis stopped, also under reduced motion) and the page starts at the top. `PlayGate` (`app/`) draws the Play button as a real DOM button over the canvas, placed by `playButtonSpot(aspect)`; it is disabled until `useStarterStore.booted`. The starter sets `booted` once its bar is full: the bar is the lesser of the real startup work that finished (`core/readiness.ts`: `fonts`, `shaders`, and `next-world`, which `PortalGate` marks after `compileAsync` of the next world) and the minimum boot time (`loading.ts`; a task that never reports counts as done after 12 s). Play unlocks the scroll and calls `scrollToProgress(progressPast(worlds, 0))`, a Lenis glide (an instant jump in reduced motion, to the first step past the starter), so the fly-in is ordinary scroll and scrubs both ways. Scrolling back up shows the screen as READY. Play does not start sound. Dev: `?boot=6` stretches the minimum boot time; a pinned `?progress=` skips the lock and the loading screen.
- Each world names its timing once in `beats.ts` (`defineBeats`). Scene files, the camera and the exit all read the same beats, and scene files never import `world.ts`, so there are no cycles.
- The quality tier is detected once in `App` and passed to every scene as a prop. No module reads the browser at import time, so tests need no fake `window`.

## Two kinds of exit

`WorldModule.exit` is a tagged union, checked by `defineWorld` at load time and across worlds by `validateHandoffs`.

- **Portal** (`kind: 'portal'`): the next world is seen through a hole and the camera flies in. `cameraPath(1)` must end at the portal position and the look direction must match the next world's start.
- **Cover** (`kind: 'cover'`): a full-screen overlay. White spreads over the screen (`whiteFrom` → `whiteFull`), the next world swaps in underneath, then the white clears outward from the center into a large cluster of see-through squares, over the first 30% of the reveal (`revealLength`, in the next world's progress), after which the overlay is gone. The cut is hidden, so cameras need not match. Voxel → platformer uses this. With `style: 'black'` the cover is a plain fade through black instead (the same fade reduced motion uses): the platformer's dark castle door fills the screen and the fade only hides the swap into the terminal. With `style: 'crt'` (`utils/transitions/crt.ts`, drawn by `CrtShutdown`, not the mosaic) the screen shuts down like an old TV: black bars close to a bright line, the line shrinks to a dot, the dot fades. Terminal → wall uses it; to drop it, revert its commit and set the terminal's exit back to `style: 'black'`.
- The starter → Pong handoff is a portal: the camera ends on the glass (the portal plane, z = 0) looking down -z, which is how Pong starts. The starter turns the renderer's tone mapping off while it is mounted, because drei tone-maps everything seen through a portal and Pong's whites (`toneMapped={false}`) would otherwise show grey until the swap.
- Reduced motion: progress snaps to fixed steps, the cover becomes a plain fade through black, and the creature's swell and flash are skipped. The flash is time-based and capped at 2.5 pulses per second.

## Captions

- **Contract** (`core/caption.ts`): a `Caption` is a range `from`/`to` of the world's progress plus optional `kicker`, `headline`, `body`, `stats` (up to 4 `{label, value}`), `footnote`, `link`, and look overrides `theme` and `anchor`; `captionProblem` validates it and `defineWorld` rejects a bad one. A `settled` caption is shown complete from its start. The starter world has no caption box; it draws its words on the glass.
- **Copy** lives in each world's `captions.ts`: a plain array with a how-to-edit comment at the top. It may import the world's `beats.ts` (or `config`/`mechanics`/`layout` for numbers that must stay true, so a figure about the page cannot drift); `world.ts` imports it, scene files never do. Every claim about the outside world (a year, a hardware fact, how a decompilation project works) needs a row in `docs/CAPTION-SOURCES.md` (claim, source URL, date checked, how sure) in the same change; anything that could not be confirmed stays out. Examples stay generic: no real game names or characters (the word "Pong" and years are the only exceptions). `app/captions.test.ts` runs every registered world's captions through `captionProblem` and checks order, phone fit (a character cap per font, see below), that every world names a theme, and the REA link.
- **Themes** (`core/captionTheme.ts`, pure, tested): `CAPTION_THEMES` has one `CaptionTheme` per id in `CAPTION_THEME_IDS` (pong, voxel, platformer, terminal, wall, arena): five colours (`surface`, `border`, `text`, `accent`, `muted`; tests hold text, accent and muted to WCAG AA 4.5:1 on the surface and the border to 3:1), a border style (`solid` stepped pixel box, `double`, `dashed`, `none`), a `font` (`pixel` for headline and body, or `mono`), an `anchor` (`bottom` or `top`) and a `reveal` effect. A world sets its default with `theme:` in `world.ts`; a caption may override it with `theme:` and `anchor:`. `resolveCaptionTheme(caption, world.theme)` picks caption, then world, then Pong; `resolveCaptionAnchor(caption, theme)` picks caption, then theme. `app/Captions.tsx` resolves both on each caption and puts the box at the top or bottom (a top box starts below the sound button); `components/Caption.tsx` sets the colours as `--caption-*` custom properties on the box (`components/themeVars.ts`, which the sound button also uses to wear the active world's colours) and the border and font as `data-border` / `data-font` attributes that `styles/index.css` styles. The arena's giant title reads the same registry. Edit a world's look in the registry only.
- **Reveal** (`core/reveal.ts`, pure, tested): the text is a pure function of the world's `u`, so it scrubs both ways. The theme picks the effect: `scramble` (a terminal-style scramble resolving left to right behind a cursor), `typewriter` (the same left-to-right writing with a cursor and no scrambled characters) or `fade` (each field, then each stat, steps up from invisible to opaque in `FADE_STEPS` steps). In every effect spaces, punctuation and length never change, fields are written in order (kicker, headline, body, stats, footnote), numbers in stats count up (except under `fade`), and the link appears when the reveal is complete. The reveal takes at most 60% of a caption's range (`MAX_REVEAL_SHARE`) and at most `PROGRESS_PER_CHAR` per character, so a long text needs a long range and a short one is written fast and then just stays.
- **Drawing** (`components/Caption.tsx`): the DOM is updated imperatively from a `ProgressSource` (`app/Captions.tsx` gives it the store's `frame.u`), never through React state per frame, and only when a piece of text (or a fade step) changed. The not-yet-written rest is rendered invisibly and stats sit in slots sized by their final text, so the box never resizes whatever the effect. Under reduced motion the final text fades in whatever the theme. Typography: the `pixel` face (Press Start 2P, 12px on phones) writes headline and body; kicker, stats and footnote are smaller (JetBrains Mono, imported in `app/main.tsx` like the pixel font); the `mono` face writes everything in JetBrains Mono, about 40% narrower per character, so a mono theme holds more words (the phone cap is 340 characters against 260). On screens 1024px and wider the stats become one line.
- Boxes are taller than the old one-liners. Keep copy short (a test caps it), and mind what a world's camera leaves free: the terminal's recovered-mechanics table is why its last caption sits at the top (a test checks any caption over that table is top-anchored), and the platformer's box is at the top because the hero and the ground are in the lower half.

## Adding a world

1. Create `src/worlds/<name>/` with `beats.ts` (if it has timed moments), the scene files, and `captions.ts` (the copy), and `world.ts` that default-exports (via `index.ts`) a `defineWorld({ id, Scene, cameraPath, exit, captions })`.
2. Give every world except the last an `exit`. Add it to `src/app/worlds.ts`; order there = page order.

## Rules (enforced by ESLint, see `eslint.config.js`)

1. Worlds never import other worlds or `app/`; they may use `core/`, `components/` and `utils/`.
2. If two worlds need it, move it to `utils/` (generic) or `core/` (about worlds) or `components/` (UI).
3. Layers only point down: `app/` → `worlds/` → `core/` → `utils/`. `utils/` imports nothing of ours above it; `core/` and `components/` never import `worlds/` or `app/`.
4. `app/` imports a world only through its index (`@/worlds/pong`).

## Conventions

- Everything visual is generated in code (instanced voxels, procedural pixel textures, small shaders). No ripped game assets; textures are original, in each game's style.
- Quality tier (`utils/three/quality.ts`): detected once in `App`; phones and weak CPUs get fewer voxels and dpr 1.
- Reduced motion: no smooth scroll; progress snaps to fixed steps.
- Dev only: `/?progress=0.3` pins the scene at that progress.

## Scripts

`npm run dev | build | lint | test | format | check:cycles`
