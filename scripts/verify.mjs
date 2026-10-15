import { writeFile } from 'node:fs/promises'
import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--no-sandbox'],
})

let page = await browser.newPage()
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
await page.setViewport({ width: 1440, height: 900 })
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0', timeout: 30000 })
await page.waitForFunction(
  () => document.querySelector('.page')?.getAttribute('data-scene-status') === 'ready',
  { timeout: 20000 },
)

if (!process.env.SKIP_CAPTURE) {
  await capture(page, 2400, 800, 'public/map-preview/desktop.webp', 'image/webp')
  await capture(page, 900, 1200, 'public/map-preview/mobile.webp', 'image/webp')
  await capture(page, 1200, 630, 'public/og.jpg', 'image/jpeg')
}

await page.close()
page = await browser.newPage()
page.on('pageerror', (error) => errors.push(error.message))
await page.setViewport({ width: 1440, height: 900 })
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0', timeout: 30000 })
await page.waitForFunction(
  () => document.querySelector('.page')?.getAttribute('data-scene-status') === 'ready',
  { timeout: 20000 },
)
await page.waitForFunction(() => {
  const button = document.querySelector('[data-anchor="microsoft"]')
  return button && !button.hidden
})

const order = await page.$$eval('[data-anchor]', (nodes) => nodes.map((node) => node.getAttribute('data-anchor')))
assert(
  JSON.stringify(order) ===
    JSON.stringify([
      'queens',
      'seattle',
      'microsoft',
      'newyork',
      'music',
      'range',
      'ghola',
      'moolah',
      'resuto',
      'pace',
      'github',
      'baselift',
      'visuai',
      'primer',
      'musicmilk',
      'consultancy',
    ]),
  order.join(','),
)

const heading = await page.$eval('h1', (node) => node.textContent)
assert(heading === 'Greg Mac', heading)
const github = await page.$eval('a[aria-label="GitHub"]', (node) => node.getAttribute('href'))
assert(github === '#', github)

await page.hover('[data-anchor="queens"]')
await page.waitForFunction(
  () => getComputedStyle(document.querySelector('[data-anchor="queens"] .hover-label')).opacity === '1',
  { timeout: 5000 },
)

await openCard(page, 'microsoft')
await expectText(page, '.card h2', 'Microsoft')
await expectText(page, '.card .role', 'Product Manager')
await expectText(page, '.card .detail', 'OneNote on Apple, then Copilot in OneNote')
const panes = await page.$$eval('.card .mark i', (nodes) => nodes.length)
assert(panes === 4, String(panes))
const msLink = await page.$('.card .card-link')
assert(msLink === null, 'microsoft should not link')

await openCard(page, 'seattle')
await expectText(page, '.card h2', 'Seattle')
assert((await page.$('.card .role')) === null, 'seattle role')
assert((await page.$('.card .detail')) === null, 'seattle detail')

await openCard(page, 'newyork')
await expectText(page, '.card h2', 'New York')
assert((await page.$('.card .role')) === null, 'new york role')
await expectText(page, '.card .detail', 'Home')

await openCard(page, 'music')
await expectText(page, '.card .role', 'Websites for artists and labels')
await expectText(page, '.card .detail', 'greg.so')
const music = await page.$eval('.card .card-link', (node) => ({
  href: node.href,
  target: node.target,
  rel: node.rel,
}))
assert(music.href === 'https://greg.so/', music.href)
assert(music.target === '_blank', music.target)
assert(music.rel.includes('noreferrer'), music.rel)

await page.keyboard.press('Escape')
await page.waitForFunction(() => !document.querySelector('.card'))

await openCard(page, 'range')
await page.mouse.click(40, 40)
await page.waitForFunction(() => !document.querySelector('.card'))

await openCard(page, 'ghola')
await expectText(page, '.card h2', 'Ghola AI')
await expectText(page, '.card .detail', 'Visualization of characters from books & stories.')
const gholaIcon = await page.$eval('.card .project-icon', (node) => node.getAttribute('src'))
assert(gholaIcon === '/projects/ghola.png', gholaIcon)
const ghola = await page.$eval('.card .card-link', (node) => node.href)
assert(ghola === 'https://ghola.co/', ghola)

await page.keyboard.press('Escape')
await page.waitForFunction(() => !document.querySelector('.card'))

await openCard(page, 'baselift')
await expectText(page, '.card h2', 'Baselift')
await expectText(page, '.card .detail', 'Custom workout splits using AI')
const baselift = await page.$eval('.card .card-link', (node) => node.href)
assert(baselift === 'https://www.baselift.io/', baselift)

await page.click('[aria-label="Pause motion"]')
const paused = await page.$eval('[aria-label="Play motion"]', (node) => node.getAttribute('aria-pressed'))
assert(paused === 'true', paused)
await page.click('[aria-label="Reset view"]')

const busy = await page.$eval('.world', (node) => node.getAttribute('aria-busy'))
const label = await page.$eval('.world', (node) => node.getAttribute('aria-label'))
assert(busy === 'false', busy)
assert(label === 'Interactive lake', label)
assert(errors.length === 0, errors.join('\n'))

await page.setViewport({ width: 390, height: 844 })
await new Promise((resolve) => setTimeout(resolve, 400))
await page.screenshot({ path: '/tmp/mobile-page.png' })

await browser.close()

const blocked = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  args: ['--disable-webgl', '--disable-3d-apis', '--no-sandbox'],
})
const fallback = await blocked.newPage()
await fallback.setViewport({ width: 1280, height: 800 })
await fallback.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' })
await fallback.waitForFunction(
  () => document.querySelector('.page')?.getAttribute('data-scene-status') === 'failed',
  { timeout: 15000 },
)
const names = await fallback.$$eval('.fallback button', (nodes) => nodes.map((node) => node.textContent))
assert(names.includes('Seattle') && names.includes('Ghola AI') && names.includes('Baselift'), names.join(','))
const poster = await fallback.$eval('.preview', (node) => getComputedStyle(node).opacity)
assert(poster === '1', poster)
await fallback.click('.fallback button')
await fallback.waitForSelector('.card')
await blocked.close()

console.log('verified')

async function capture(page, width, height, file, mime) {
  await page.setViewport({ width, height, deviceScaleFactor: 1 })
  await page.addStyleTag({
    content: `
      .page { min-height: 0 !important; height: 100% !important; }
      .intro, .footer, .loading, .anchor, .card, .sr, .hover-label { display: none !important; }
      .world { inset: 0 !important; }
      .world canvas, .preview {
        -webkit-mask-image: none !important;
        mask-image: none !important;
      }
    `,
  })
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 250)))
      }),
  )
  const data = await page.evaluate((kind) => document.querySelector('canvas').toDataURL(kind, 0.9), mime)
  const buffer = Buffer.from(data.split(',')[1], 'base64')
  await writeFile(file, buffer)
  console.log(file, buffer.length)
}

async function openCard(page, id) {
  await page.click(`[data-anchor="${id}"]`)
  await page.waitForSelector('.card')
}

async function expectText(page, selector, text) {
  const value = await page.$eval(selector, (node) => node.textContent.trim())
  assert(value.includes(text), `${selector}: ${value}`)
}

function assert(condition, detail) {
  if (!condition) throw new Error(String(detail))
}
