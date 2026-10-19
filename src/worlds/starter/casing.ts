import { Path, Shape, ShapeGeometry } from 'three'
import { HOLE_H, HOLE_RADIUS, HOLE_W } from './camera'

/** The plate is far larger than any view, so its edge is never seen. */
const PLATE_HALF_W = 18
const PLATE_HALF_H = 12

/** A rounded rectangle, as a closed path of lines and quarter circles. */
function roundedRect<P extends Path>(path: P, w: number, h: number, r: number): P {
  const x = w / 2
  const y = h / 2
  path.moveTo(-x + r, -y)
  path.lineTo(x - r, -y)
  path.absarc(x - r, -y + r, r, -Math.PI / 2, 0, false)
  path.lineTo(x, y - r)
  path.absarc(x - r, y - r, r, 0, Math.PI / 2, false)
  path.lineTo(-x + r, y)
  path.absarc(-x + r, y - r, r, Math.PI / 2, Math.PI, false)
  path.lineTo(-x, -y + r)
  path.absarc(-x + r, -y + r, r, Math.PI, Math.PI * 1.5, false)
  return path
}

/** The casing's front plate: a big flat sheet with a rounded window cut in it. */
export function createPlateGeometry() {
  const sheet = new Shape()
  sheet.moveTo(-PLATE_HALF_W, -PLATE_HALF_H)
  sheet.lineTo(PLATE_HALF_W, -PLATE_HALF_H)
  sheet.lineTo(PLATE_HALF_W, PLATE_HALF_H)
  sheet.lineTo(-PLATE_HALF_W, PLATE_HALF_H)
  sheet.closePath()
  sheet.holes.push(roundedRect(new Path(), HOLE_W, HOLE_H, HOLE_RADIUS))
  return new ShapeGeometry(sheet, 12)
}
