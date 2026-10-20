# Glossary

**World**: one game-themed scene plus the camera move through it. Lives in `src/worlds/<name>/` and is built with `defineWorld`.

**Progress** (`u`): how far through a world we are, in [0, 1]. Overall page progress is split across worlds by the timeline.

**Beat**: a named stretch of a world's progress (`crack`, `hiss`, `blast`), declared once in the world's `beats.ts` with `defineBeats`.

**Timeline**: the pure function `frameAt` that turns raw scroll progress into a **Frame**.

**Frame**: everything the page draws at one moment: active world, its progress, camera pose, portal state, cover state and caption.

**Exit**: how a world hands over to the next. A **portal exit** shows the next world through a hole and the cameras must line up. A **cover exit** hides the cut behind a full-screen cover.

**Handoff**: the moment the active world changes. Must look seamless.

**Cover**: the full-screen overlay (`ScreenMosaic`): white spreads over the screen, then clears outward from the center into a large cluster of see-through squares where the world underneath shows. A cover with `style: 'black'` is instead a plain fade through black, and `style: 'crt'` is a TV shutting down (bars close to a line, the line to a dot, then black), and `style: 'glitch'` is a screen glitch (dark tearing bands and blocks, colour-split bars, scanline noise; `GlitchCover`) that hides the swap and clears away over the next world.

**Scroll weight**: a world's share of the page's scroll relative to the others (`scrollWeight`, default 1). The terminal is longer so its story keeps its scroll distance while a shutdown plays at its end.

**Caption**: the text box a world shows over a range of its progress. Fields: `kicker` (small line above), `headline`, `body`, `stats` (up to four label/value pairs), `footnote`, `link`. Copy lives in the world's `captions.ts`.

**Reveal**: how a caption is written, driven by the world's progress (so it scrubs both ways): a `scramble` that resolves into the text behind a cursor, a `typewriter` (left to right, no scramble) or a stepped `fade`. Stats count up. The effect belongs to the theme. Pure logic in `core/reveal.ts`.

**Theme**: the look of a caption box: colours, border style, font (pixel or mono), anchor and reveal effect. One per world (`theme:` in `world.ts`), kept in the registry `CAPTION_THEMES` (`core/captionTheme.ts`); a caption may override it with its own `theme`. Resolution: caption, then world, then Pong.

**Anchor**: where a caption box sits: `bottom`, `top`, or `bottom-right` (a narrow corner box on wide screens, full width at the bottom on phones). Comes from the theme; a caption may override it with `anchor` (used to keep the box off what the camera frames, e.g. the terminal's table).

**Quality tier**: `low` or `high`, detected once at startup and passed to every world.

**Boot / Play gate**: the first world (`starter`) is a CRT loading screen. Its bar follows real startup work (**readiness**: fonts, its own shaders, the next world compiled) and a minimum boot time; the DOM Play button enables when both are done. The page scroll is **locked** until Play is pressed; Play glides to the end of the starter, which is the fly-in.

**Tableau**: the calm final pose of the arena's cast during the `title` beat, standing inside the merge ring.

**Title**: the "You can merge anything" DOM overlay at the top of the screen over the arena: one line in a centred box that hugs the text (at most about 850 px wide on desktop) (`app/MergeTitle.tsx`), with the REA link as its subtitle. Written by the scramble reveal over the arena's `title` beat.

**Glitch cycle**: the title's clock-driven loop, a documented exception to scroll-driven scenes: every ~2 s the text glitches for ~220 ms and then holds the next world's look (`CAPTION_THEMES` order: pong, voxel, platformer, terminal, wall, arena). Pure in the title's own clock (`app/mergeTitle/glitch.ts`); off under reduced motion.

**Scroll end**: the scroll offset where overall progress reaches 1: the bottom of the scroll spacer lined up with the bottom of the viewport. Content after the spacer is the **footer** (`app/Footer.tsx`), which scrolls into view with progress held at 1.
