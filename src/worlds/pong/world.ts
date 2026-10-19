import { defineWorld } from '@/core/world'
import { easeInOutCubic, lerp } from '@/utils/math'
import { beats } from './beats'
import { captions } from './captions'
import { BLOCK_POS } from './court'
import { Pong } from './Pong'
import { sound } from './sound'

export const pong = defineWorld({
  id: 'pong',
  Scene: Pong,
  cameraPath: (u, aspect) => {
    // Pull back on narrow screens so the whole court stays in frame.
    const distance = Math.max(11, 13.9 / aspect)
    const s = easeInOutCubic(beats.linear('approach', u))
    return {
      position: [lerp(0, BLOCK_POS[0], s), 0, lerp(distance, BLOCK_POS[2], s)],
      target: [lerp(0, BLOCK_POS[0], s), 0, lerp(0, -5, s)],
    }
  },
  exit: {
    kind: 'portal',
    position: BLOCK_POS,
    size: [2, 2],
    openAt: beats.ranges.shatter[0],
    blendRange: [...beats.ranges.blend],
  },
  sound,
  captions,
})
