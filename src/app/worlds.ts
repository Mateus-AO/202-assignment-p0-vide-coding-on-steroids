import { validateHandoffs } from '@/core/world'
import pong from '@/worlds/pong'
import voxel from '@/worlds/voxel'
import platformer from '@/worlds/platformer'
import terminal from '@/worlds/terminal'

/** Page order. To add a world: create its folder, then add it here. */
export const worlds = [pong, voxel, platformer, terminal]

validateHandoffs(worlds)

/** Scroll distance per world, in viewport heights. */
export const SCROLL_VH_PER_WORLD = 300
