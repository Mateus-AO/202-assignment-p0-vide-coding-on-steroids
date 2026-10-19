import { defineWorld } from '@/core/world'
import { beats, OPEN_AT } from './beats'
import { GLASS_H, GLASS_W, starterCamera } from './camera'
import { captions } from './captions'
import { Starter } from './Starter'

/**
 * The loading screen: a CRT with a Play button (the button is DOM, drawn by the app shell).
 * Scroll is locked until Play is pressed, then the camera flies into the glass and the portal
 * opens on Pong. A short scroll, because the fly-in is a gesture, not a story.
 */
export const starter = defineWorld({
  id: 'starter',
  Scene: Starter,
  cameraPath: starterCamera,
  scrollWeight: 0.3,
  exit: {
    kind: 'portal',
    // The camera ends on the glass plane, which is where the portal sits.
    position: [0, 0, 0],
    size: [GLASS_W, GLASS_H],
    openAt: OPEN_AT,
    blendRange: [...beats.ranges.blend],
  },
  captions,
})
