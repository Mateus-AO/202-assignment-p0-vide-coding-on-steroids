import { lerp } from '@/utils/math'
import type { Vec3 } from '@/utils/math/types'
import { beats } from './beats'
import { BASE_Y, heightAt } from './terrain'

const SPOT_X = 2.95
const SPOT_Z = -47

/** The camera comes in from the +z side, so "facing the camera" means yaw 0. */
const FACING_CAMERA = 0

const groundAt = (x: number, z: number) =>
  BASE_Y + heightAt(Math.round(x), Math.round(z)) + 0.5

/** Where the creature stands once it has noticed the camera; also what the camera locks on to. */
export const creeperSpot: Vec3 = [SPOT_X, groundAt(SPOT_X, SPOT_Z), SPOT_Z]

/** Idle wandering around the spot at `time` seconds: offset, and heading along the path. */
export function wanderAt(time: number) {
  const dx = 3 * Math.sin(0.35 * time)
  const dz = 2 * Math.cos(0.23 * time)
  const vx = 3 * 0.35 * Math.cos(0.35 * time)
  const vz = -2 * 0.23 * Math.sin(0.23 * time)
  return { dx, dz, yaw: Math.atan2(vx, vz) }
}

/** Shortest signed angle from `a` to `b`. */
const angleDiff = (a: number, b: number) =>
  ((((b - a) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI

/**
 * Pose at wall-clock `time` and progress `u`. The creature wanders on its own. As the camera
 * gets close it drifts back to its spot, stops and slowly turns to face the camera.
 */
export function creeperPose(time: number, u: number) {
  const notice = beats.smooth('notice', u)
  const wander = wanderAt(time)
  const x = SPOT_X + wander.dx * (1 - notice)
  const z = SPOT_Z + wander.dz * (1 - notice)
  const yaw = wander.yaw + angleDiff(wander.yaw, FACING_CAMERA) * notice
  return {
    position: [x, groundAt(x, z), z] as Vec3,
    yaw,
    /** 1 while strolling, 0 once it has stopped to look at the camera. */
    walking: lerp(1, 0, notice),
  }
}

/** The creature is on screen until it explodes. */
export const creeperVisible = (u: number) => !beats.started('blast', u)
