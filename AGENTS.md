# p0-landing

A scroll-driven 3D landing page: one continuous camera move through game worlds (Pong → Minecraft-style voxel field → platformer). It tells how crossover games get built; REA (https://github.com/morluto/rea), an AI tool that recovers mechanics from old binaries, is linked from the voxel world's caption, the arena's giant title and the footer. There are no playable games. Stack: React, TypeScript, Vite, React Three Fiber + drei, GSAP + Lenis, Tailwind, Zustand, Vitest. It is a git repo (remote `origin`, default branch `main`). Work on a `feat/<name>` branch (agents in a worktree under `.claude/worktrees/`), commit with conventional messages (`feat(scope):`, `fix:`, `docs:`, `chore:`), and merge to `main` with a merge commit. Merging to `main` and pushing need the owner's go-ahead.

## Where to look

- `docs/ARCHITECTURE.md`: read before touching `core/`, `app/`, a world's exit, or adding a world.
- `GLOSSARY.md`: world, beat, timeline, frame, exit, handoff, cover. Use these words in code and replies.
- `docs/AGENT-NOTES.md`: read before touching rendering (portal, shaders, textures, tone mapping), before verifying visually, and before running several agents at once.

## Rules

- Layers point down: `app/` → `worlds/` → `core/` → `utils/`; worlds never import each other. ESLint enforces it.
- Name every timed moment of a world once in its `beats.ts`; the scene, camera and exit read it. Scene files never import `world.ts`.
- Draw everything in code with original art (textures, characters, sounds). No ripped or trademarked assets, no real game names or characters on the page. One exception, by the owner's decision: the wall world's picture is a hand-drawn pixel rendition of the Claude Code mascot, drawn from scratch in code with no copied files. It must not be reused elsewhere or imply endorsement; everything else still follows this rule.
- Keep scenes scrubbable: position, animation and effects are pure functions of the world's progress `u`, read through `getU()` inside `useFrame`. Allocate nothing per frame; use instanced meshes.
- One documented exception to scrubbable scenes: the arena's giant title (`app/MergeTitle.tsx`) runs a glitch cycle on the clock (every ~2 s, deterministic, paused when hidden, off under reduced motion). It is limited to that overlay; see `docs/ARCHITECTURE.md`.
- Respect reduced motion and the quality tier (both reach every scene). Keep any flash at 2.5 pulses per second or fewer.
- Design for phones: cameras take the aspect ratio and keep the subject in frame.
- A new world gets `defineWorld`, tests for its pure logic, and an entry in `src/app/worlds.ts`.

## Done means

`npm run lint && npm test && npm run build && npm run check:cycles` all pass, and for any visual change you have looked at real screenshots (recipe in `docs/AGENT-NOTES.md`). Unit tests cannot see rendering bugs; the page has gone blank before while every test passed.

## Where things stand

Seven worlds are built: a CRT loading screen with a Play button (scroll stays locked until Play, which flies the camera into the glass and on into Pong through a portal), Pong rally, voxel field with a wandering creature that explodes into a white cover, platformer level that ends with the hero walking into the castle (the dark door fills the screen), a holographic terminal that recovers the platformer's mechanics and explains decomps and REA, and, after a CRT-style shutdown, a pile of nine old TVs that each run a decompile session and then combine into a picture whose eyes follow the pointer, then (after a glitch cover) the last world, a top-down arena where the cast of the earlier worlds walks in, does its signature moves and merges into a green pull-request symbol on the floor, leaving the top of the screen free for the giant title drawn by `app/`. A footer follows the last world. Every world has its own caption theme (colours, border, font, position, reveal effect; `core/captionTheme.ts`), and outside facts in the captions are listed with sources in `docs/CAPTION-SOURCES.md`. Sound (synthesized, off by default) covers every world and has not been auditioned on a real device. Open ideas (`docs/NEXT-WORLDS.md`, a temporary planning document): more worlds, splitting the 1.3 MB bundle, real-device performance checks.
