export type QualityTier = 'low' | 'high'

export type QualityEnv = { coarsePointer: boolean; cores: number }

/** Phones and weak machines get the cheaper tier. */
export const tierFor = ({ coarsePointer, cores }: QualityEnv): QualityTier =>
  coarsePointer || cores <= 4 ? 'low' : 'high'

/** Reads the browser. Call once at startup and pass the result down. */
export const detectQuality = (): QualityTier =>
  tierFor({
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
    cores: navigator.hardwareConcurrency ?? 4,
  })
