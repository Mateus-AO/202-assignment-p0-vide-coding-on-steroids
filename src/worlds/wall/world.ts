import { defineWorld } from '@/core/world'
import { PILE_CENTER } from './layout'
import { sound } from './sound'
import { Wall } from './Wall'

/** CONTRACT (scene agent implements; this is a stub): a fixed camera in front of the pile. */
export const wallCamera = () => ({
  position: [0, PILE_CENTER.y, 14] as [number, number, number],
  target: [0, PILE_CENTER.y, 0] as [number, number, number],
})

export const wall = defineWorld({
  id: 'wall',
  Scene: Wall,
  cameraPath: wallCamera,
  sound,
  captions: [
    {
      from: 0.27,
      to: 0.53,
      text: 'One decomp rebuilds one game. An agent can read many.',
    },
    {
      from: 0.82,
      to: 1,
      text: 'Give an agent the right tools and it can read what nobody documented.',
    },
  ],
})
