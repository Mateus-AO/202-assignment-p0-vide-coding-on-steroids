import { validateHandoffs } from '@/core/world'
import starter from '@/worlds/starter'
import pong from '@/worlds/pong'
import voxel from '@/worlds/voxel'
import platformer from '@/worlds/platformer'
import terminal from '@/worlds/terminal'
import wall from '@/worlds/wall'
import arena from '@/worlds/arena'

/** Page order. To add a world: create its folder, then add it here. */
export const worlds = [starter, pong, voxel, platformer, terminal, wall, arena]

validateHandoffs(worlds)

/** Scroll distance per world of weight 1, in viewport heights. */
export const SCROLL_VH_PER_WORLD = 300
