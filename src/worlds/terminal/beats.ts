import { defineBeats } from '@/core/beats'

export const beats = defineBeats({
  /** The black lifts and the panel fades up out of it. */
  rise: [0, 0.1],
  /** A prompt, a hex dump of raw bytes. */
  boot: [0.07, 0.35],
  /** The bytes turn into assembly, and the comments explain decomps and REA. */
  decode: [0.35, 0.7],
  /** The mechanics come out as a named table. */
  recover: [0.7, 1],
})

/**
 * The terminal's story (its script, camera and captions) is written in "story time" 0 to 1.
 * The last tenth of the world's progress is the CRT shutdown, and the world is longer on the
 * scroll (`scrollWeight` 1 / STORY_END) so the story keeps the scroll distance it always had:
 * story time maps onto the first STORY_END of the world's progress.
 */
export const STORY_END = 0.9
export const storyToU = (story: number) => story * STORY_END
export const uToStory = (u: number) => Math.min(1, u / STORY_END)

/** The shutdown: the end of the terminal's progress, after the story. */
export const SHUTDOWN = [STORY_END, 1] as const
