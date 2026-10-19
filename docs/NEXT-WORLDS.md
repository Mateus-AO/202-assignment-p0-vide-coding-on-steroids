# Next worlds (planning notes)

> **Temporary.** Delete this file, or fold the decisions into `docs/ARCHITECTURE.md`, once the owner has answered the open questions in section 5.

## 1. Where the page stands

Order today: **Pong** (portal) → **voxel field** (white cover) → **platformer** (black cover) → **terminal** (CRT cover) → **wall** (last; no exit). A world is a folder in `src/worlds/` built with `defineWorld`: a scene, a `cameraPath(u, aspect)`, an `exit`, captions, a `sound.ts`, and a `beats.ts` that names every timed moment once. The story so far: rules plus assets can be pulled apart (Pong) → people remix them (voxel) → an agent can recover a mechanic from an old binary (REA) → here are the numbers (terminal) → nine screens decompile and assemble a picture (wall).

Constraints that bind every new world:

- Original art drawn in code (instanced meshes, procedural textures, small shaders). No real game names or characters on the page. Genres and eras are described generically.
- Scrubbable: everything is a pure function of `u` (read via `getU()` in `useFrame`), allocation-free per frame. Anything simulated must be closed-form or baked once into a table indexed by `u`.
- Phones: the camera takes `aspect` and keeps the subject in frame; the quality tier (`low`/`high`) reaches every scene.
- Reduced motion: progress snaps to steps, covers become plain fades, no flash above 2.5 pulses per second.
- Handoff: **portal** (next world seen through a hole; `cameraPath(1)` must line up with the next world's start; tests via `validateHandoffs`) or **cover** (white mosaic, black fade, CRT; cameras need not match). Materials are unlit, and custom shaders must end with the tonemapping/colorspace includes (see `AGENT-NOTES.md`).
- Captions now take `kicker`, `headline`, `body`, up to 4 `stats`, `footnote`, `link` (`core/caption.ts`). Stats are cheapest and safest when they are numbers from our own code (grid size, speed, frame counts), pinned by a test like the terminal's `mechanics` check. Any real-world fact (a year) must be verified before it ships.
- Scroll cost: every world is 300 vh at weight 1. Five worlds are about 1500 vh; new short worlds should use `scrollWeight` around 0.6 to 0.8.

## 2. Candidate worlds

Effort: S = about half a day of agent work, M = 1 to 2 days, L = 3+ days. "Shader quad" means one full-screen-ish quad drawn by a fragment shader from tiny data (the terminal's approach): cheap on the CPU, cost scales with pixels, so cap dpr on `low`.

### Summary

| # | Working title | Genre / era | Mechanic shown | Hand-in / hand-out | Effort | Verdict |
|---|---|---|---|---|---|---|
| A | Open Road | late-80s to mid-90s home-console racer | Pseudo-3D projection (flat texture scaled per scanline) | in: cover; out: portal (finish arch) | M | Do |
| B | The Well | late-80s falling-blocks puzzle | Rules as data: rotate, lock, clear a line | in: cover; out: portal (cleared row) | M | Do |
| C | Cabinet Room | arcade hall, 80s | The binary needs hardware: ROM, screen, input | in: cover; out: portal (cabinet screen) | M/L | Do (bridge) |
| D | Battle Screen | 90s turn-based RPG | A fight is a state machine plus one damage formula | in: cover; out: new swirl cover | M | Do, third |
| E | Crawl | top-down dungeon crawler, late 80s | Grid movement and tile collision; rooms from a seed | in: cover; out: portal (stairwell) | M | Maybe |
| F | Corridor | first-person ray-cast shooter, early 90s | Ray casting: a 2D map faking 3D | in: portal; out: portal (door) | M | Maybe |
| G | Bullet Field | vertical space shooter, 80s/90s | Patterns: bullets as a formula of time | in: cover; out: warp cover | M | Maybe |
| H | Hit Boxes | 2D fighting game stage, 90s | Frame data and hit/hurt boxes | in: cover; out: black cover | L | Later |
| I | Lanes | rhythm game, 2000s | Timing windows; the song is the clock | in: cover; out: cover | M | Later |
| J | The Tracker | chiptune music tracker, 80s/90s | Music as data: patterns, channels, notes | in: cover; out: cover | M | Later |
| K | Sandbox | physics sandbox / falling sand, 2000s | A world is state plus a few constants | in: cover; out: cover | L | Later |
| L | Story Prompt | text adventure, 70s/80s | Parser plus a state machine | in: CRT/black; out: black | S | Skip (overlaps terminal and wall) |

### Details

**A. Open Road (racer)**
- Mechanic: pseudo-3D. The "3D" road is a flat texture; a formula picks, per screen row, how wide and how far along it is. Caption stats from our code: `rows 120`, `road width 1 texture`, `curve steps`.
- Visual hook: a striped road curving over hills to a banded sunset, roadside sprites (palms, signs) scaling up as they pass, a small car seen from behind. Drawn in a fragment shader on one quad (road, sky, bands) plus instanced billboards for roadside.
- Camera: nearly fixed behind the car at low height; the "motion" is the road scrolling with `u`; slight roll in curves, FOV push at the finish.
- Hand-in: cover, from the voxel blast (white), so no camera match. Hand-out: portal in the finish arch (the car drives through it), next world seen through the arch.
- Risks: fill-rate on phones (one big shader; cap dpr 1 on `low`); art load small (shader plus 4 sprites); sound: engine drone and a bass line are easy, synthesized.
- Fit: the most different silhouette from the existing blocky worlds, and the cheapest wow per hour.

**B. The Well (falling blocks)**
- Mechanic: a tiny rule set (7 piece shapes, rotate, lock, clear full rows) is all the "game" is. Pure function: a seeded sequence of pieces and a baked landing table, so any `u` shows a legal board.
- Visual hook: a glowing well of instanced cubes in a dark room; pieces drop and lock; a row clears in a bright sweep; stacks sag and fall (baked steps). Stats: `10 columns`, `20 rows`, `7 pieces`, `4 rows per clear`.
- Camera: front-on and slowly rising, drifting to the side so the well shows depth; on phones, the well is tall, so the camera is portrait-biased (good for 390 x 844).
- Hand-in: cover. Hand-out: portal sized as a thin horizontal slit: the last rows clear and the next world appears through the cleared rows (portal size is already [w, h]); camera dollies into the slit.
- Risks: baking the board (fixed seed, test that every state is reachable); flash on row clears must stay at 2.5 Hz or less; sound: lock clicks and line-clear chord, cheap.

**C. Cabinet Room (arcade hall)**
- Mechanic: the code a decompiler recovers ran on hardware: ROM chips, a screen, a joystick. Ties to REA's "old binaries" story and sets up the terminal.
- Visual hook: a dark hall of cabinets with glowing marquees and carpet pattern, each screen a small looping stand-in for an earlier world (static textures or tiny shaders, not live render-to-texture, which would be too heavy). Optional peek at the board and ROM chips inside one cabinet.
- Camera: slow dolly down the aisle, then push into one screen.
- Hand-in: cover. Hand-out: portal in the screen of the last cabinet; the next world is seen through it (cleanest portal in the set: a flat quad).
- Risks: art load (cabinet mesh from boxes; marquee text on canvas textures); unlit materials need hand-faked glow; sound: crowd murmur and coin sounds are noisy to synthesize, keep it to hum plus chimes.
- Fit: works well as the bridge before the platformer or as a recap right before the closing section.

**D. Battle Screen (turn-based RPG)**
- Mechanic: a fight is a state machine and a damage formula. Stats shown are real numbers from our code: `attack 12`, `defense 5`, `damage = a x 2 - d`, `turns 4`.
- Visual hook: a flat sky-blue battle backdrop, an enemy sprite built from instanced pixels, a boxed menu and a number popping up. HP bars are pure in `u`.
- Camera: still, frontal, small dolly and a shake on hits (shake is a function of `u`, not clock).
- Hand-in: cover. Hand-out: a new cover style, the pixelated swirl a battle starts with, played in reverse or forward (`style: 'swirl'`, drawn like `CrtShutdown`). Needs a pure `swirl.ts` shape plus tests.
- Risks: the swirl is the real work (S to M); flash and swirl must obey the 2.5 Hz cap; sound: menu blips and hit noise, cheap.

**E. Crawl (top-down dungeon)**
- Mechanic: grid movement and tile collision; rooms laid out from a seed (a table, so scrubbable).
- Visual hook: torch-lit dungeon of instanced tiles, fog of war that opens as the hero walks (radius in a shader), flicker lights faked with a vertex-colour tint.
- Camera: high and top-down, tilting to a three-quarter view; follows a baked path through four rooms; pulls back on narrow screens.
- Hand-in: cover. Hand-out: portal into a stairwell (hole in the floor, camera drops in).
- Risks: it looks like a cousin of the voxel world (blocks, small tiles); needs a strong palette difference. Art: a hero, two monsters, a chest, a door, all from boxes or pixel textures (M). Sound: footsteps and a drip bed, easy.

**F. Corridor (ray-cast shooter)**
- Mechanic: ray casting: a 2D map fakes a 3D corridor with one ray per screen column. Stats: `map 16 x 16`, `rays = screen width`, `no look up or down`.
- Visual hook: low-res walls with a hard palette and distance darkening, a gun at the bottom, a door that slides. One shader quad; the map is a uniform array.
- Camera: not a 3D camera at all: the scene's own player position follows `u`, so `cameraPath` is fixed, and the portal in or out has to match the quad's frame.
- Hand-in: portal (a door at the end of the previous world). Hand-out: portal through the last door.
- Risks: portals into a shader quad are fiddly (the quad must fill the portal); shader complexity on phones (limit rays; half-res on `low`); the genre is close to "no real game names" territory, so keep enemies abstract (blob-like).

**G. Bullet Field (vertical shooter)**
- Mechanic: patterns: every bullet is `position(t, i)`, a formula; no state. Stats: `bullets 1,200`, `patterns 3`, `hits 0`.
- Visual hook: a ship at the bottom weaving through ever-denser fans and spirals; parallax stars; a big boss shape made of instanced blocks.
- Camera: straight down, ship centred; zooms out on narrow screens so the field stays full width.
- Hand-in: cover. Hand-out: warp cover (stars stretch to white lines, then white): reuse the white mosaic cover, only add a short star streak in the scene itself, so no new cover style.
- Risks: 1,200 instances is fine, but dense bright dots flicker: check the flash cap and keep bullet brightness steady; sound: laser blips can get harsh, rate-limit.

**H. Hit Boxes (fighting stage)**
- Mechanic: frame data. Every attack has startup, active and recovery frames and boxes that overlap or not. A debug overlay of boxes makes that visible.
- Visual hook: a side-on stage with a parallax crowd, two block-built fighters, coloured hit and hurt boxes drawn over them, a frame counter.
- Camera: side view that pans with the fight, zooms on the impact, freezes for a frame count.
- Hand-in: cover. Hand-out: black cover after a K.O. freeze.
- Risks: biggest art load of the set (two animated fighters from boxes: L); the animation has to be a pure function of `u`. Stats: `startup 4f`, `active 3f`, `recovery 11f`.

**I. Lanes (rhythm)**
- Mechanic: timing windows; the song is the clock. Notes are a pure function of `u`, which suits scroll perfectly: scroll is the song.
- Visual hook: four glowing lanes toward the camera, notes as instanced gems, a hit line, rings on each hit.
- Camera: behind the lanes, tilting up as the song builds.
- Risks: sound is off by default, so it must still read without sound; flashing notes need the 2.5 Hz cap, which is tight for a rhythm world (use colour and scale pulses, not brightness flashes).

**J. The Tracker (chiptune)**
- Mechanic: music is data: patterns, channels, notes in a grid. The same idea as the terminal's hex, for sound.
- Visual hook: a scrolling grid of note names in columns, with one tower of voxels per channel rising and falling in time. Stats: `4 channels`, `64 rows`, `speed 6`.
- Camera: looking down the grid, slowly orbiting the towers.
- Risks: its heart is audio, which is off by default and not yet auditioned. A world whose point is a song needs the sound pass first. Could double as the closing credits' music.

**K. Sandbox (physics / falling sand)**
- Mechanic: a world is state plus a few constants (gravity, friction, a rule per material).
- Visual hook: a cutaway tank where sand, water and crates fall and pile up.
- Risks: a real simulation is not scrubbable. Bake a fixed-step run at load into a table (memory and boot time on phones) or use closed-form fall curves. Highest risk for the least story value; keep for later.

**L. Story Prompt (text adventure)**
- Mechanic: a parser and a state machine. Cheap (S) but the terminal and the wall already speak in text on a dark screen, so it would feel like a repeat. Better to fold the idea into the closing section's changelog terminal (option 3C below).

### Where they could go in the order

- Keep **platformer → terminal → wall** adjacent: the terminal recovers the platformer's numbers, and the wall continues the terminal's CRT.
- New worlds go **between the voxel field and the platformer**, or between Pong and the voxel field (only if the Pong portal and the voxel start are re-matched: avoid).
- Proposed: Pong → voxel → **Open Road → The Well → Cabinet Room** → platformer → terminal → wall → closing.
- Vary the exit style so three covers in a row do not blur together: the voxel white mosaic, then portal, portal, cover (the platformer's existing black fade).
- A running idea that ties the new worlds together: each world drops one named mechanic into a "collected mechanics" list shown in the HUD (section 4); the closing section uses them all.

## 3. The closing "what's next" crossover section

The wall ends on a mascot picture whose eyes follow the pointer. The closing should answer: so what is a crossover, and what can the visitor do.

| Option | What it shows | Pros | Cons | Effort |
|---|---|---|---|---|
| 3A. All worlds in one frame | A final crossover: the camera pulls back, and one frame holds a Pong paddle on a racing road, falling blocks over a voxel field, the hero walking across. Collected mechanics line up as a legend. | Pays off the whole premise visually; the strongest finale. | Needs every earlier world's pieces reusable at small scale; heavy on phones; fragile to maintain as worlds change. | L |
| 3B. Call to action to REA | The wall dissolves into one calm frame: the headline, what REA does in two lines, a button to `https://github.com/morluto/rea`, plus a "back to top" and share link. | Direct, cheap, always works on phones; conversion is the page's real purpose. | Less spectacle; risk of feeling like a footer. | S/M |
| 3C. Credits / changelog terminal | A terminal like the earlier one scrolls the page's credits as a changelog (one line per world: the mechanic recovered, numbers, how it was drawn: "all art drawn in code"), ending on the REA link. | Reuses the terminal screen code (`screen.ts`, glyph atlas); consistent voice; honest about "no ripped assets". | The third text-on-dark screen in a row after terminal and wall; low visual surprise. | M |

**Recommendation: 3B first, then upgrade toward a light 3A.** Ship a simple closing that is a real destination (headline, REA link, back to top) as a normal HTML section after the canvas, so it is accessible, indexable and costs nothing at runtime. Then, as a second step, make the last frame of the wall hand off into a small "everything combined" shot: the collected mechanics as icons, not a full re-render of all worlds. Use 3C's changelog as the footnote text rather than a world.

## 4. Page-level ideas

| Idea | What | Notes / effort |
|---|---|---|
| Progress HUD | A thin rail with one tick per world, current world's `kicker` ("STAGE 03 / 1991"), and a list of collected mechanics that grows as worlds pass. | Reads `frame` from the store; no scene changes. Phones: rail on the edge, label hidden under 400 px. M |
| Chapter navigation | Click a tick to scroll to that world's start (Lenis `scrollTo`), keyboard reachable, deep links (`#road`). | Needs a pure helper from `core/timeline.ts` that returns each world's start progress. Reduced motion: jump, no tween. Landing mid-world at a cover exit must render correctly (it does, frames are pure). M |
| Sound design pass | Audition every cue and bed on a real phone and laptop speakers; set a master level; add a loudness check; per-world bed crossfades; remember the preference. | Needs the owner's ears. Known suspects: the terminal bed's 8 kHz whine, tick levels, the shutdown whine. S to M |
| Performance: code splitting | The bundle is one chunk (about 1.3 MB, 360 kB gzip). Make each world's module a `React.lazy` / dynamic import, split `three`/`drei`/`gsap` into vendor chunks, and prefetch the next world once the current one passes about 50% of its `u`. | `app/worlds.ts` is the only importer, so this is a contained change; the first load becomes Pong plus the engine. Check the cover hides the load. M |
| Real-device checks | One mid-range Android, one older iPhone, one low-end laptop. Record frame time on the heaviest frame of each world, memory, thermal throttle over 2 minutes of scrolling, and `low` tier behaviour (it has no screenshots yet). | Software WebGL (about 10 fps) cannot judge this. Write the checklist, owner runs it. S |
| Accessibility | A plain-text outline of the story for screen readers (the captions in order); `aria-live` for the active caption or a visually hidden full transcript; focus-visible on the sound toggle, links and chapter ticks; contrast of caption text over bright scenes (the white cover); reduced motion already snaps; flash cap applies to new covers; `prefers-reduced-data` could force the `low` tier. | Check captions meet contrast over the white mosaic. S to M |
| Share and loading | Open Graph image, a static poster frame, and a no-WebGL page that is the same story as text (`WebGLFallback` exists). | S |
| Housekeeping | Migrate the deprecated caption `text` field to `body`/`headline` everywhere, then remove it. | S |

## 5. Open questions for the owner

1. **How long should the page be?** Today about 1500 vh. *Recommend:* cap at about 2200 vh by giving new worlds `scrollWeight` 0.6 to 0.8; at the page's pace, 8 worlds is the limit before it drags.
2. **How many new worlds in the first round?** *Recommend:* three (Open Road, The Well, Cabinet Room), then pause and review on real devices before adding more.
3. **Is the Cabinet Room a world or an interlude/recap?** *Recommend:* a world placed just before the platformer, short (weight 0.6), whose last screen is the portal.
4. **Where may new worlds go in the order?** *Recommend:* between the voxel field and the platformer only; leave Pong's portal, and the platformer, terminal and wall chain, alone.
5. **Should we add new cover styles (swirl, wipe) or keep to white, black and CRT?** *Recommend:* one new style at most (the swirl, for the battle world), and only if that world is built.
6. **Real years in kickers ("STAGE 03 / 1991")?** *Recommend:* yes, for the era only, never a game name, and the owner checks each year before it ships.
7. **Is the closing a destination (HTML section) or another world?** *Recommend:* an HTML section first (option 3B), a light combined-frame shot later.
8. **What is the closing's goal: the REA repo, or an invitation to contribute worlds?** *Recommend:* REA link as the main button, plus a short line about how the page was made.
9. **Is the mascot exception final?** The wall's picture is a hand-drawn rendition of a real mascot, allowed once. *Recommend:* keep it a one-off, not repeated in the closing or HUD.
10. **Should sound ever turn on by default (after the first scroll)?** *Recommend:* no; keep it off by default, but add a first-scroll hint near the toggle.
11. **Who tests on real devices, and on which phones?** *Recommend:* the owner's own phone plus one low-end Android, before any new world ships.
12. **Do we want chapter navigation and a HUD at all, or keep the page a pure single scroll?** *Recommend:* yes, but quiet: a thin rail, no menu overlay.

## 6. Suggested order of work

| Step | Work | Size | Why now |
|---|---|---|---|
| 1 | Housekeeping: finish the caption migration, write the real-device checklist | S | Clears debt before new copy is added |
| 2 | Code splitting of world modules plus next-world prefetch | M | Every new world should arrive lazy, not grow the 1.3 MB chunk |
| 3 | Minimal closing section (3B) | S/M | The page finally has an end; unblocks sharing |
| 4 | Progress HUD plus chapter navigation | M | Makes the page navigable before it grows longer |
| 5 | Open Road | M | Cheapest large visual change; tests the new "insert between voxel and platformer" order |
| 6 | The Well | M | Shows the slit-shaped portal; line-clear flash tests the 2.5 Hz cap |
| 7 | Sound design pass on a real device (existing five worlds plus new) | S/M | Needs the owner; do it before the music-heavy worlds |
| 8 | Real-device performance pass | S/M | Decides whether more worlds are affordable |
| 9 | Cabinet Room | M/L | The bridge into the platformer; do after the performance data |
| 10 | Battle Screen with the swirl cover | M | Only if the review after step 8 says there is room |
| 11 | Upgrade the closing toward the combined frame (3A, light) | M/L | Last, because it depends on the final world list |
| 12 | Later pool: Crawl, Corridor, Bullet Field, Hit Boxes, Lanes, The Tracker, Sandbox | M each (L for Hit Boxes, Sandbox) | Only if the owner wants a longer page |

Rough total for steps 1 to 8: about 7 to 9 agent-days. Steps 9 to 11: about 5 to 7 more.
