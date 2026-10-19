import { defineWorld } from '@/core/world'
import { Arena } from './Arena'
import { arenaCamera } from './camera'
import { captions } from './captions'
import { sound } from './sound'

/**
 * The last world: no exit. A top-down arena where the cast of the earlier worlds meets and
 * merges; the giant title above it (drawn by `app/`) reads the `title` beat in `beats.ts`.
 */
export const arena = defineWorld({
  id: 'arena',
  Scene: Arena,
  cameraPath: arenaCamera,
  theme: 'arena',
  scrollWeight: 1,
  sound,
  captions,
})
