import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  Color,
  MeshBasicMaterial,
  Object3D,
  type InstancedMesh,
} from 'three'
import type { WorldProps } from '@/core/world'
import { MERGE_GREEN } from '@/core/captionTheme'
import { mulberry32 } from '@/utils/math/random'
import { cellScale, GLYPH_CELLS, GRID, glyphProgress } from './glyph'

const dummy = new Object3D()
const green = new Color(MERGE_GREEN)

/** The ring may brighten and dim, slowly: 1 pulse a second, far under the 2.5 a second cap. */
const PULSE_HZ = 1
const PULSE_DEPTH = 0.18

/** Writes every cell's matrix for a symbol `drawn` complete; `size` scales the tile. */
function writeCells(mesh: InstancedMesh, drawn: number, size: number, y: number) {
  GLYPH_CELLS.forEach((cell, i) => {
    const s = cellScale(cell.key, drawn) * size
    dummy.position.set(cell.x, y, cell.z)
    dummy.rotation.set(-Math.PI / 2, 0, 0)
    dummy.scale.set(Math.max(s, 1e-4), Math.max(s, 1e-4), 1)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
  })
  mesh.instanceMatrix.needsUpdate = true
}

/**
 * The merge ring: a pull-request symbol of emissive green tiles on the floor (MERGE_GREEN, drawn
 * unlit and untoned so it keeps the exact green). The tiles pop in along the line as the merge
 * proceeds, so it scrubs both ways. When quality allows it breathes and has a soft glow under it.
 */
export function Ring({
  getU,
  quality,
  calm,
}: Pick<WorldProps, 'getU' | 'quality'> & { calm: boolean }) {
  const tiles = useRef<InstancedMesh>(null)
  const glow = useRef<InstancedMesh>(null)
  const shown = useRef(-1)
  const rich = quality === 'high' && !calm
  const material = useMemo(
    () => new MeshBasicMaterial({ color: MERGE_GREEN, toneMapped: false }),
    [],
  )
  const glowMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: MERGE_GREEN,
        toneMapped: false,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  )

  useLayoutEffect(() => {
    // Hidden until the merge: every tile at zero size.
    if (tiles.current) writeCells(tiles.current, 0, GRID.tile, 0.03)
    if (glow.current) writeCells(glow.current, 0, GRID.tile * 1.9, 0.02)
  }, [])

  useFrame(({ clock }) => {
    const drawn = glyphProgress(getU())
    if (Math.abs(drawn - shown.current) > 1e-4) {
      shown.current = drawn
      if (tiles.current) writeCells(tiles.current, drawn, GRID.tile, 0.03)
      if (glow.current) writeCells(glow.current, drawn, GRID.tile * 1.9, 0.02)
    }
    const pulse =
      rich && drawn > 0.95
        ? 1 -
          PULSE_DEPTH * (0.5 + 0.5 * Math.sin(clock.elapsedTime * Math.PI * 2 * PULSE_HZ))
        : 1
    material.color.copy(green).multiplyScalar(pulse)
  })

  return (
    <>
      <instancedMesh
        ref={tiles}
        args={[undefined, undefined, GLYPH_CELLS.length]}
        material={material}
        frustumCulled={false}
      >
        <planeGeometry args={[1, 1]} />
      </instancedMesh>
      {rich && (
        <instancedMesh
          ref={glow}
          args={[undefined, undefined, GLYPH_CELLS.length]}
          material={glowMaterial}
          frustumCulled={false}
        >
          <planeGeometry args={[1, 1]} />
        </instancedMesh>
      )}
    </>
  )
}

const SPARKS = 28

/**
 * Motes of green light rising off the symbol once it is drawn (high quality, normal motion).
 * They drift on the clock, never blink, and are small.
 */
export function Sparks({ getU }: Pick<WorldProps, 'getU'>) {
  const mesh = useRef<InstancedMesh>(null)
  const seeds = useMemo(() => {
    const rng = mulberry32(5)
    return Array.from({ length: SPARKS }, () => ({
      cell: GLYPH_CELLS[Math.floor(rng() * GLYPH_CELLS.length)],
      phase: rng(),
      speed: 0.18 + rng() * 0.12,
      size: 0.05 + rng() * 0.05,
    }))
  }, [])
  const material = useMemo(
    () => new MeshBasicMaterial({ color: '#b6ffcb', toneMapped: false }),
    [],
  )

  useFrame(({ clock }) => {
    const m = mesh.current
    if (!m) return
    const drawn = glyphProgress(getU())
    seeds.forEach((s, i) => {
      const life = (clock.elapsedTime * s.speed + s.phase) % 1
      const visible = cellScale(s.cell.key, drawn) > 0.99 ? 1 : 0
      const size = s.size * visible * Math.sin(Math.PI * life)
      dummy.position.set(s.cell.x, 0.1 + life * 1.3, s.cell.z)
      dummy.rotation.set(0, life * 6, 0)
      dummy.scale.setScalar(Math.max(size, 1e-4))
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, SPARKS]}
      material={material}
      frustumCulled={false}
    >
      <boxGeometry />
    </instancedMesh>
  )
}
