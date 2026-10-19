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
export const FLAG_X = 60
export const CASTLE_X = 67

/** The castle door: its front face is at DOOR_Z and it spans y from 0 to DOOR_TOP. */
export const DOOR_Z = 0.56
export const DOOR_HALF_WIDTH = 0.7
export const DOOR_TOP = 2.2
/** The hero walks to the door along this z, then straight in to END_Z (hidden inside the wall). */
export const LANE_Z = 1.15
export const END_Z = -0.1

/** Coins arc over the first pipe, where the hero is in the air. */
export const COIN_XS = [11.5, 12.75, 14, 15.25, 16.5]

export const HERO_HEIGHT = 2.25
