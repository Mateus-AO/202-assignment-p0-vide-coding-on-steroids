// Screenshots the dev page at pinned scroll progress, in headless Chromium with software WebGL.
//
//   PORT=5199 W=1280 H=720 OUT=/tmp/shots PREFIX=p node scripts/shot.mjs 0.1 0.5 0.9
//
// Needs a dev server on PORT and `playwright` installed in the directory you run this from
// (`npm i playwright && npx playwright install chromium`, in a scratch dir, not in the repo).
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'

const { chromium } = createRequire(process.cwd() + '/')('playwright')
const {
  PORT = '5199',
  W = '1280',
  H = '720',
  OUT = '/tmp/shots',
  PREFIX = 'p',
} = process.env

mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({
  args: [
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
  ],
})
const page = await browser.newPage({ viewport: { width: Number(W), height: Number(H) } })
page.on('console', (m) => {
  const text = m.text()
  if (['error', 'warning'].includes(m.type()) && !text.includes('THREE.Clock')) {
    console.log(`[console.${m.type()}]`, text.slice(0, 400))
  }
})
page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 600)))

for (const progress of process.argv.slice(2)) {
  await page.goto(`http://localhost:${PORT}/?progress=${progress}`)
  await page.waitForTimeout(3500) // software rendering is slow; let the scene settle
  const file = `${OUT}/${PREFIX}_${progress}.png`
  await page.screenshot({ path: file })
  console.log('wrote', file)
}
await browser.close()
