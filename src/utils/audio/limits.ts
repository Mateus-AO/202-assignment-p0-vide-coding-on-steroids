/** Peak output of the whole engine, as a fraction of full scale. Nothing can play louder. */
export const OUTPUT_CEILING = 0.3

/** Any gain a caller asks for, forced into [0, 1]. */
export const clampGain = (gain: number) =>
  Number.isFinite(gain) ? Math.min(1, Math.max(0, gain)) : 0

/**
 * WaveShaper curve that hard-clips at full scale: inputs beyond ±1 map to the curve's ends, so
 * after it the signal can never exceed ±1, whatever was summed into it.
 */
export const hardClipCurve = () => new Float32Array([-1, 1])
