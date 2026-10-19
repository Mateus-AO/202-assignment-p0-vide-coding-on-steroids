# Glossary

**World**: one game-themed scene plus the camera move through it. Lives in `src/worlds/<name>/` and is built with `defineWorld`.

**Progress** (`u`): how far through a world we are, in [0, 1]. Overall page progress is split across worlds by the timeline.

**Beat**: a named stretch of a world's progress (`crack`, `hiss`, `blast`), declared once in the world's `beats.ts` with `defineBeats`.

**Timeline**: the pure function `frameAt` that turns raw scroll progress into a **Frame**.

**Frame**: everything the page draws at one moment: active world, its progress, camera pose, portal state, cover state and caption.

**Exit**: how a world hands over to the next. A **portal exit** shows the next world through a hole and the cameras must line up. A **cover exit** hides the cut behind a full-screen cover.

**Handoff**: the moment the active world changes. Must look seamless.

**Cover**: the full-screen overlay (`ScreenMosaic`): white spreads over the screen, then clears outward from the center into a large cluster of see-through squares where the world underneath shows. A cover with `style: 'black'` is instead a plain fade through black.

**Quality tier**: `low` or `high`, detected once at startup and passed to every world.
