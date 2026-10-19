import type { ComponentType } from 'react'
import type { Vec3 } from '@/utils/math/types'
import type { QualityTier } from '@/utils/three/quality'
import type { WorldSound } from './sound'

export type CameraPose = { position: Vec3; target: Vec3 }

export type Caption = {
  /** Local progress range [from, to) in which the caption is shown. */
  from: number
  to: number
  text: string
  link?: { href: string; label: string }
}

export type WorldProps = {
  /** Local progress of this world in [0, 1]. Read it inside useFrame, not during render. */
  getU: () => number
  quality: QualityTier
}

/** The next world is seen through a hole and the camera flies into it. Cameras must line up. */
export type PortalExit = {
  kind: 'portal'
  /** Local position of the portal plane; must equal `cameraPath(1).position`. */
  position: Vec3
  size: [number, number]
  /** The portal becomes visible once progress reaches this value. */
  openAt: number
  /** Progress range in which the next world takes over the screen. */
  blendRange: [number, number]
}

/**
 * White covers the screen between `whiteFrom` and `whiteFull`, the next world swaps in
 * underneath, then the cover clears over the first `revealLength` of the next world's
 * progress. The cut is hidden, so the two cameras need not line up.
 */
export type CoverExit = {
  kind: 'cover'
  whiteFrom: number
  whiteFull: number
  revealLength: number
}

export type WorldExit = PortalExit | CoverExit

/**
 * A world is a self-contained scene plus the camera move through it.
 * Coordinates are local to the world.
 */
export type WorldModule = {
  id: string
  Scene: ComponentType<WorldProps>
  /** `aspect` = viewport width / height, so a world can keep its framing on any screen. */
  cameraPath: (u: number, aspect: number) => CameraPose
  /** How the world hands over to the next one. Omit on the last world. */
  exit?: WorldExit
  captions: Caption[]
  /** Ambient bed and cues, declared in the world's `sound.ts`. Optional: a world may be silent. */
  sound?: WorldSound
}

const ASPECTS = [16 / 9, 0.5]
const near = (a: number, b: number) => Math.abs(a - b) < 1e-6

function fail(world: WorldModule, message: string): never {
  throw new Error(`world "${world.id}": ${message}`)
}

/** Identity function that rejects a malformed world at load time. */
export function defineWorld(world: WorldModule): WorldModule {
  for (const c of world.captions) {
    if (!(c.from >= 0 && c.from < c.to && c.to <= 1))
      fail(world, `bad caption range for "${c.text}"`)
  }

  const exit = world.exit
  if (exit?.kind === 'portal') {
    const [from, to] = exit.blendRange
    if (!(from < to && to <= 1))
      fail(world, 'portal blendRange must satisfy from < to <= 1')
    if (!(exit.openAt >= 0 && exit.openAt <= from))
      fail(world, 'portal openAt must be before the blend starts')
    for (const aspect of ASPECTS) {
      const end = world.cameraPath(1, aspect).position
      if (!end.every((v, i) => near(v, exit.position[i]))) {
        fail(world, 'cameraPath(1) must end at the portal position')
      }
    }
  } else if (exit?.kind === 'cover') {
    if (!(exit.whiteFrom < exit.whiteFull && exit.whiteFull <= 1)) {
      fail(world, 'cover must satisfy whiteFrom < whiteFull <= 1')
    }
    if (!(exit.revealLength > 0 && exit.revealLength <= 1))
      fail(world, 'cover revealLength must be in (0, 1]')
  }
  return world
}

const direction = ({ position, target }: CameraPose) => {
  const d = target.map((t, i) => t - position[i])
  const len = Math.hypot(...d)
  return d.map((v) => v / len)
}

/** Checks the seams between consecutive worlds: portal exits need a matching camera. */
export function validateHandoffs(worlds: readonly WorldModule[]) {
  worlds.forEach((world, i) => {
    const next = worlds[i + 1]
    if (!next && world.exit) fail(world, 'the last world must not have an exit')
    if (next && !world.exit) fail(world, `needs an exit to lead into "${next.id}"`)
    if (world.exit?.kind !== 'portal' || !next) return

    for (const aspect of ASPECTS) {
      const end = direction(world.cameraPath(1, aspect))
      const start = direction(next.cameraPath(0, aspect))
      // Same look direction on both sides of the swap, or the view jumps.
      if (!end.every((v, k) => near(v, start[k]) || Math.abs(v - start[k]) < 1e-3)) {
        fail(world, `camera direction jumps at the handoff into "${next.id}"`)
      }
    }
  })
}
