import { BUMP_HEIGHT, COIN_RISE, FLAG_SLIDE, PIPE_JUMP, RUN_DISTANCE } from './config'

/**
 * The numbers that make this level play the way it does. Another world may show them (the
 * terminal "recovers" them); a test in app/ keeps that copy in step with these.
 */
export const mechanics = {
  runDistance: RUN_DISTANCE,
  pipeJumpHeight: PIPE_JUMP.height,
  pipeJumpWidth: PIPE_JUMP.width,
  blockBump: BUMP_HEIGHT,
  coinRise: COIN_RISE,
  flagSlide: FLAG_SLIDE,
}
