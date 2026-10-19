import type { Vec3 } from '@/utils/math/types'

/** Court geometry, in world units. The court is flat at z = 0. */
export const BLOCK_POS: Vec3 = [2, 0, 0]
export const BLOCK_SIZE = 2

export const HALF_W = 6
/** Walls are centered at ±HALF_H and 0.2 thick. */
export const HALF_H = 4.2
export const WALL_THICKNESS = 0.2

export const PADDLE_X = 5.6
export const PADDLE_DEPTH = 0.25
export const PADDLE_HALF_H = 0.8

export const BALL_SIZE = 0.4
export const BALL_HALF = BALL_SIZE / 2

/** Where the ball's center sits when it touches a paddle face, a wall, or the block. */
export const BALL_X_AT_PADDLE = PADDLE_X - PADDLE_DEPTH / 2 - BALL_HALF
export const BALL_Y_AT_WALL = HALF_H - WALL_THICKNESS / 2 - BALL_HALF
export const BALL_X_AT_BLOCK = BLOCK_POS[0] - BLOCK_SIZE / 2 - BALL_HALF
