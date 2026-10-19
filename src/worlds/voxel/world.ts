import { defineWorld } from '@/core/world'
import { easeInOutCubic, lerp, smoothstep } from '@/utils/math'
import type { Vec3 } from '@/utils/math/types'
import { beats } from './beats'
import { creeperSpot } from './creeper'
import { Voxel } from './Voxel'
import { sound } from './sound'

export const voxel = defineWorld({
  id: 'voxel',
  Scene: Voxel,
  cameraPath: (u) => {
    // The camera slows to a stop as the creature reaches it.
    const p = lerp(u, 0.8, beats.smooth('slow', u))
    const s = easeInOutCubic(p)
    // A gentle sway while flying, absent at the start (so Pong's handoff still matches)
    // and fading out as the camera comes to a stop near the creature.
    const sway = smoothstep(0.02, 0.2, u) * (1 - beats.smooth('slow', u))
    const position: Vec3 = [
      Math.sin(p * 2.2) * 3 + Math.sin(u * 17) * 0.12 * sway,
      lerp(1, -0.5, s) + Math.sin(u * 38) * 0.07 * sway,
      -p * 55,
    ]
    // Starts level (matches where Pong's camera leaves off), tilts into the field, then
    // locks on to the creature.
    const ahead: Vec3 = [
      position[0],
      position[1] - 1.2 * beats.smooth('tilt', u),
      position[2] - 12,
    ]
    const [cx, cy, cz] = creeperSpot
    const lock = beats.smooth('lock', u)
    return {
      position,
      target: [
        lerp(ahead[0], cx, lock),
        lerp(ahead[1], cy + 1.4, lock),
        lerp(ahead[2], cz, lock),
      ],
    }
  },
  exit: {
    kind: 'cover',
    whiteFrom: beats.ranges.blast[0],
    whiteFull: beats.ranges.blast[1],
    revealLength: 0.4,
  },
  sound,
  captions: [
    { from: 0, to: 0.3, text: '2011. A whole world made of blocks, and of mods.' },
    {
      from: 0.3,
      to: beats.ranges.hiss[0],
      text: 'Today an AI agent can recover a mechanic from a decades-old binary and port it into a new game.',
      link: {
        href: 'https://github.com/morluto/rea',
        label: 'See REA, a tool that does this',
      },
    },
    { from: beats.ranges.hiss[0], to: 1, text: 'Sssssssssss…' },
  ],
})
