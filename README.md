# p0-landing

A scroll-driven 3D landing page that tells how crossover games get built: one continuous
camera move through game worlds, from a Pong rally to a voxel field, a platformer, a
decompilation terminal and a wall of old TVs, ending in an arena where the cast of every
world merges.

**Live:** https://mao-202-p0-landing.vercel.app

This is the **P0 assignment of the Trilha 202**, available at <https://202lab.com.br/>.

There are no playable games. Every texture, character and sound is drawn or synthesized in
code, and the page respects reduced motion and adapts to phones.

## The worlds

Scroll is locked until you press **Play**. Then one camera move carries you through:

| #   | World           | What happens                                                                                                                                                                                                |
| --- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Starter**     | A CRT loading screen with a fisheye glass and a Play button. Play flies the camera into the screen.                                                                                                         |
| 2   | **Pong**        | A rally between two paddles. The ball cracks the block, and the next world is already running behind it.                                                                                                    |
| 3   | **Voxel field** | A world made of blocks, with a wandering creature that explodes into a white cover.                                                                                                                         |
| 4   | **Platformer**  | A hero runs, jumps pipes, collects coins and walks into the castle.                                                                                                                                         |
| 5   | **Terminal**    | A holographic terminal recovers the platformer's mechanics from its binary and explains decompilation and REA.                                                                                              |
| 6   | **Wall**        | After a CRT-style shutdown, nine old TVs each run a decompile session, then combine into one picture whose eyes follow the pointer.                                                                         |
| 7   | **Arena**       | After a screen glitch, a top-down arena: the paddle, ball, creature, hero and walker walk in, do their signature moves and merge into a green pull-request symbol under the title "You can merge anything". |

A footer follows the arena. Sound is synthesized, covers every world and is **off by
default**; turn it on with the toggle in the corner.

The page links [REA](https://github.com/morluto/rea), an MCP server and CLI for AI agents
that recovers mechanics from old binaries, from the voxel world's caption, the arena's title
and the footer.

## Stack

React 19, TypeScript, Vite, React Three Fiber + drei (Three.js), GSAP + Lenis, Tailwind CSS,
Zustand and Vitest.

## Getting started

You need a current Node.js (developed on Node 24) and npm.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Command                | What it does                            |
| ---------------------- | --------------------------------------- |
| `npm run dev`          | Dev server with hot reload              |
| `npm run build`        | Type-check, then build to `dist/`       |
| `npm run preview`      | Serve the production build              |
| `npm test`             | Unit tests (Vitest)                     |
| `npm run lint`         | ESLint, including the layer rules below |
| `npm run check:cycles` | Fails on circular imports               |
| `npm run format`       | Prettier                                |

Dev-only URL parameters:

- `?progress=0.6` pins the scene at that overall scroll progress (handy for screenshots).
- `?boot=6` stretches the loading screen's minimum boot time.

## How it is organized

```
src/
  app/          the shell: App, canvas, world stack (portal + cover), captions, footer,
                the giant title, the store, and worlds.ts (the page order)
  core/         the page's own concepts: defineWorld, beats, the timeline, caption themes
  worlds/       one self-contained folder per world (scene, beats, captions, sound, tests)
  components/   shared UI
  utils/        reusable code that knows nothing about this page: math, three helpers,
                transitions (covers), scroll, audio
```

Layers point down: `app/` → `worlds/` → `core/` → `utils/`, and worlds never import each
other. ESLint enforces it. Three ideas run through the code:

- **Worlds and beats.** A world is a scene plus a camera move. Each names its timed moments
  once, in `beats.ts`, and the scene, camera and exit all read them.
- **Scrubbable.** Position, animation and effects are pure functions of the world's progress,
  so scrolling backwards plays everything in reverse. (One documented exception: the arena
  title's glitch cycle runs on the clock.)
- **Handoffs.** Worlds hand over through a **portal** (the camera flies into the next world)
  or a full-screen **cover** (mosaic, black fade, CRT shutdown or glitch).

To add a world: create its folder with `defineWorld`, tests for its pure logic, and an entry in
`src/app/worlds.ts`.

## Editing the text

All copy is plain data you can change without touching scene code:

- each world's `src/worlds/<world>/captions.ts`: kicker, headline, body, a stats row, footnote
  and link, with the progress range where it shows;
- each world's look (colours, border, font, box position, reveal effect) in
  `src/core/captionTheme.ts`;
- the footer in `src/app/footerContent.ts`.

Facts about the outside world in the captions are listed with their sources in
[`docs/CAPTION-SOURCES.md`](docs/CAPTION-SOURCES.md).

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): how it works, read before touching `core/`, `app/` or a world's exit.
- [`GLOSSARY.md`](GLOSSARY.md): world, beat, timeline, frame, exit, handoff, cover.
- [`docs/AGENT-NOTES.md`](docs/AGENT-NOTES.md): rendering pitfalls, how to verify visually and how to run several agents at once.
- [`docs/NEXT-WORLDS.md`](docs/NEXT-WORLDS.md): temporary ideas for future worlds.
- [`AGENTS.md`](AGENTS.md): the working rules for contributors and coding agents.

## Contributing

Work on a `feat/<name>` branch and commit with conventional messages (`feat(scope):`,
`fix:`, `docs:`, `chore:`). A change is done when this passes:

```bash
npm run lint && npm test && npm run build && npm run check:cycles
```

and, for any visual change, you have looked at real screenshots. Unit tests cannot see
rendering bugs, and the page has gone blank before while every test passed. The recipe is in
`docs/AGENT-NOTES.md`; `scripts/shot.mjs` takes screenshots at a pinned progress.

Rules worth knowing before you start:

- Draw everything in code with original art. No ripped or trademarked assets, and no real
  game names or characters on the page.
- Respect reduced motion and the quality tier, keep any flash at 2.5 pulses per second or
  fewer, and keep subjects in frame on phones.

## Deploying

The site is deployed to Vercel as a static Vite build (`npm run build`, output `dist/`), with
no extra configuration:

```bash
npx vercel deploy --prod
```

## Credits and notices

All art, sound and text are original. No game owner is affiliated with or endorses this page,
and any resemblance to existing games is a tribute. The pixel picture on the TV wall is a
hand-drawn rendition of the Claude Code mascot made from scratch in code; it implies no
endorsement by Anthropic.

This repository has no license file yet.
