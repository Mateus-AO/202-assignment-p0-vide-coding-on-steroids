# Architecture

One cinematic scroll through game worlds. Each world hands over to the next through a portal or a full-screen cover.
React + TypeScript + Vite, React Three Fiber + drei (3D), Lenis + GSAP (scroll/captions), Tailwind, Zustand, Vitest.

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
  styles/       Tailwind entry + tokens
```

See `GLOSSARY.md` for the vocabulary (world, beat, timeline, frame, exit, cover).

## How it works

- Scroll gives raw progress. `frameAt(worlds, progress, { reduced })` (`core/timeline.ts`, pure) returns a **Frame**: active world, local progress `u`, camera pose, portal state, cover state, caption. `App` stores it; nothing else derives timing.
- `CameraRig` applies `frame.pose`. `PortalGate` applies `frame.portal`. `ScreenMosaic` draws `frame.cover`. `Captions` shows `frame.caption`. Scenes read `getU()` inside `useFrame`, never during render. Scrubbing is deterministic and works in reverse.
- `WorldStack` mounts only the active world and, inside its portal, the next world (drei `MeshPortalMaterial`).
- Each world names its timing once in `beats.ts` (`defineBeats`). Scene files, the camera and the exit all read the same beats, and scene files never import `world.ts`, so there are no cycles.
- The quality tier is detected once in `App` and passed to every scene as a prop. No module reads the browser at import time, so tests need no fake `window`.

## Two kinds of exit

`WorldModule.exit` is a tagged union, checked by `defineWorld` at load time and across worlds by `validateHandoffs`.

- **Portal** (`kind: 'portal'`): the next world is seen through a hole and the camera flies in. `cameraPath(1)` must end at the portal position and the look direction must match the next world's start.
- **Cover** (`kind: 'cover'`): a full-screen overlay. White spreads over the screen (`whiteFrom` → `whiteFull`), the next world swaps in underneath, then the white clears from the center leaving a large cluster (about half the screen) of broken squares (see-through) among unbroken ones (black); the black squares then crack in staged, Minecraft-style steps and disappear until the world is fully visible (`revealLength`, in the next world's progress). The cut is hidden, so cameras need not match. Voxel → platformer uses this.
- Reduced motion: progress snaps to fixed steps, the cover becomes a plain fade through black, and the creature's swell and flash are skipped. The flash is time-based and capped at 2.5 pulses per second.

## Adding a world

1. Create `src/worlds/<name>/` with `beats.ts` (if it has timed moments), the scene files, and `world.ts` that default-exports (via `index.ts`) a `defineWorld({ id, Scene, cameraPath, exit, captions })`.
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
