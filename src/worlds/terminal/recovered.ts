/**
 * The platformer's mechanics, as the terminal "recovers" them. These are copies (worlds never
 * import each other); a test in app/ fails if they drift from the platformer's own numbers.
 */
export const recovered = {
  runDistance: 60,
  pipeJumpHeight: 5.2,
  pipeJumpWidth: 6,
  blockBump: 0.45,
  coinRise: 2.6,
  flagSlide: 2,
}
