import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three'
import { BAR_CELLS, type BootLine, type BootView } from './loading'
import { bootLog, screenText } from './captions'
import {
  BAR_H,
  BAR_Y,
  CELL_W,
  FONT_PX,
  LABEL_Y,
  LOGICAL_H,
  LOGICAL_W,
  LOG_STEP,
  LOG_Y,
  MARGIN_X,
  RULE_Y,
  TITLE_Y,
} from './layout'

const BACKGROUND = '#04140b'
const GREEN = '#7dff9d'
const DIM = '#2f8f4d'
const AMBER = '#ffd84d'

export type ScreenCanvas = {
  ctx: CanvasRenderingContext2D
  texture: CanvasTexture
}

/** Creates the canvas the glass shows. Touches `document`, so call it from an effect or `useMemo`. */
export function createScreenCanvas(scale: number): ScreenCanvas {
  const canvas = document.createElement('canvas')
  canvas.width = LOGICAL_W * scale
  canvas.height = LOGICAL_H * scale
  const ctx = canvas.getContext('2d')!
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.generateMipmaps = false
  texture.minFilter = texture.magFilter = LinearFilter
  return { ctx, texture }
}

export type ScreenFlags = {
  /** Cursor / READY text blink phase (always on when motion is reduced). */
  blinkOn: boolean
}

/** Redraws the whole picture. Called only when something it shows has changed. */
export function drawScreen(
  { ctx, texture }: ScreenCanvas,
  scale: number,
  view: BootView,
  flags: ScreenFlags,
  lines: readonly BootLine[] = bootLog,
) {
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.fillStyle = BACKGROUND
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)
  ctx.font = `${FONT_PX}px "Press Start 2P", monospace`
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  const right = LOGICAL_W - MARGIN_X

  ctx.fillStyle = AMBER
  ctx.fillText(screenText.title, MARGIN_X, TITLE_Y)
  ctx.fillStyle = DIM
  ctx.fillRect(MARGIN_X, RULE_Y, right - MARGIN_X, 1)

  // The log: each line types out; its status appears when it is fully typed.
  let left = view.typed
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i].text
    const shown = Math.min(left, text.length)
    left -= shown
    if (shown === 0) break
    const y = LOG_Y + i * LOG_STEP
    ctx.fillStyle = GREEN
    ctx.textAlign = 'left'
    ctx.fillText('> ' + text.slice(0, shown), MARGIN_X, y)
    if (shown === text.length) {
      const ok = (view.okMask >> i) & 1
      ctx.textAlign = 'right'
      ctx.fillStyle = ok ? GREEN : DIM
      ctx.fillText(ok ? screenText.ok : screenText.pending, right, y)
    } else {
      ctx.fillRect(MARGIN_X + (shown + 2) * FONT_PX, y, FONT_PX - 1, FONT_PX)
    }
  }

  // The loading bar: a frame with cells that fill, and a label that turns to READY.
  ctx.textAlign = 'left'
  if (view.ready) {
    ctx.fillStyle = AMBER
    if (flags.blinkOn) ctx.fillText(screenText.ready, MARGIN_X, LABEL_Y)
  } else {
    ctx.fillStyle = GREEN
    ctx.fillText(`${screenText.loading} ${view.percent}%`, MARGIN_X, LABEL_Y)
  }
  const barW = BAR_CELLS * CELL_W + 4
  ctx.fillStyle = DIM
  ctx.fillRect(MARGIN_X, BAR_Y, barW, BAR_H)
  ctx.fillStyle = BACKGROUND
  ctx.fillRect(MARGIN_X + 2, BAR_Y + 2, barW - 4, BAR_H - 4)
  ctx.fillStyle = view.ready ? AMBER : GREEN
  for (let c = 0; c < view.cells; c++) {
    ctx.fillRect(MARGIN_X + 4 + c * CELL_W, BAR_Y + 4, CELL_W - 2, BAR_H - 8)
  }

  texture.needsUpdate = true
}
