# p0-landing

A scroll-driven 3D landing page: one continuous camera move through game worlds (Pong → Minecraft-style voxel field → platformer). It tells how crossover games get built; the voxel world's caption links REA (https://github.com/morluto/rea), an AI tool that recovers mechanics from old binaries. There are no playable games. Stack: React, TypeScript, Vite, React Three Fiber + drei, GSAP + Lenis, Tailwind, Zustand, Vitest. Not a git repo (the owner chose that); make no commits.

## Where to look

- `docs/ARCHITECTURE.md`: read before touching `core/`, `app/`, a world's exit, or adding a world.
- `GLOSSARY.md`: world, beat, timeline, frame, exit, handoff, cover. Use these words in code and replies.
- `docs/AGENT-NOTES.md`: read before touching rendering (portal, shaders, textures, tone mapping), before verifying visually, and before running several agents at once.

## Rules

- Layers point down: `app/` → `worlds/` → `core/` → `utils/`; worlds never import each other. ESLint enforces it.
- Name every timed moment of a world once in its `beats.ts`; the scene, camera and exit read it. Scene files never import `world.ts`.
- Draw everything in code with original art (textures, characters, sounds). No ripped or trademarked assets, no real game names or characters on the page.
- Keep scenes scrubbable: position, animation and effects are pure functions of the world's progress `u`, read through `getU()` inside `useFrame`. Allocate nothing per frame; use instanced meshes.
- Respect reduced motion and the quality tier (both reach every scene). Keep any flash at 2.5 pulses per second or fewer.
- Design for phones: cameras take the aspect ratio and keep the subject in frame.
- A new world gets `defineWorld`, tests for its pure logic, and an entry in `src/app/worlds.ts`.

## Done means

`npm run lint && npm test && npm run build && npm run check:cycles` all pass, and for any visual change you have looked at real screenshots (recipe in `docs/AGENT-NOTES.md`). Unit tests cannot see rendering bugs; the page has gone blank before while every test passed.

## Where things stand

Three worlds are built and polished: Pong rally, voxel field with a wandering creature that explodes into a white cover, platformer level. Open ideas: the closing "what's next" crossover section, more worlds, splitting the 1.3 MB bundle, real-device performance checks.
