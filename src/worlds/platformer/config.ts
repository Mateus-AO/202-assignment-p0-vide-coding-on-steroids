/** All distances are in blocks along the x axis; the ground's top surface is y = 0. */

/** Where the hero starts, and how far the run is. */
export const HERO_START = 1
export const RUN_DISTANCE = 60

export const PIPES = [14, 38, 50]
/** Every pipe is cleared with the same jump. */
export const PIPE_JUMP = { width: 6, height: 5.2 }
/** How far the question block is knocked up, and how high the coin it releases rises. */
export const BUMP_HEIGHT = 0.45
export const COIN_RISE = 2.6
/** The flag slides down the pole over this many blocks before the goal. */
export const FLAG_SLIDE = 2
export const QUESTION_X = 20
export const WALKER_X = 28
/** The walker paces this far to each side of WALKER_X; one lap takes `WALKER_LAP` blocks of the hero's run. */
export const WALKER_PACE = 0.7
export const WALKER_LAP = 9
/** Its top (spikes included) and the half-width the hero must clear. */
export const WALKER_TOP = 1.45
export const WALKER_HALF_WIDTH = 0.65
export const FLAG_X = 60
export const CASTLE_X = 67

/** The castle door: its front face is at DOOR_Z and it spans y from 0 to DOOR_TOP. */
export const DOOR_Z = 0.56
export const DOOR_HALF_WIDTH = 0.7
export const DOOR_TOP = 2.2
/** The stone surround stands this far out from the wall's front face (z = 0.5). */
export const DOOR_FRAME_DEPTH = 0.2
/** How wide the surround is at each side of the opening. */
export const DOOR_FRAME_WIDTH = 0.3
/** The hero walks to the door along this z, then straight in to END_Z (hidden inside the wall). */
export const LANE_Z = 1.3
export const END_Z = -0.1

/** Coins arc over the first pipe, where the hero is in the air. */
export const COIN_XS = [11.5, 12.75, 14, 15.25, 16.5]

export const HERO_HEIGHT = 2.25

/** The sky: a stepped gradient from the horizon up to the zenith, and the scene's background. */
export const SKY = { zenith: '#4a98ee', horizon: '#bfe4ff', background: '#bfe4ff' }

/**
 * The camera. It sits `height` above the ground and looks at `targetHeight`, trailing the hero
 * at `minDistance` (more on narrow screens, which must show `minHalfWidth` blocks to each side).
 * Wide screens lead the hero by `lead` blocks (looking `targetLead` further ahead); phones keep
 * him `phoneLead` blocks left of center so the next obstacle is in frame. The camera follows his
 * jumps by `liftFollow` of their height.
 */
export const CAMERA = {
  height: 3.6,
  targetHeight: 2.6,
  minDistance: 16,
  minHalfWidth: 6,
  lead: 3,
  targetLead: 2,
  phoneLead: 2,
  /** Phones are tall: the whole view sits this much higher, so the level fills the middle, not the top. */
  phoneRaise: 2.5,
  liftFollow: 0.25,
  /** The dolly ends this far in front of the door, close enough that it fills the screen. */
  doorStandoff: 0.56,
}

/**
 * Backdrop layers follow the hero by this fraction of his travel, so the farther they are the
 * slower they slide past: parallax on top of the perspective.
 */
export const PARALLAX = { clouds: 0.12, cloudsFar: 0.25, mountains: 0.4, hillsFar: 0.18 }

/** What each quality tier draws. Low drops the far backdrop and the sparkles. */
export const DETAIL = {
  high: { backdrop: true, particles: true, torches: true },
  low: { backdrop: false, particles: false, torches: false },
}
