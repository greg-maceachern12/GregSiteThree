import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--no-sandbox'],
})
const page = await browser.newPage()
page.on('console', (msg) => console.log('CONSOLE', msg.type(), msg.text()))
page.on('pageerror', (err) => console.log('PAGEERROR', err.message))
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0', timeout: 30000 })
await page.waitForFunction(() => document.querySelector('.page')?.getAttribute('data-scene-status') === 'ready', { timeout: 20000 }).catch((err) => console.log('WAIT', err.message))
const status = await page.$eval('.page', (el) => el.getAttribute('data-scene-status'))
console.log('STATUS', status)
await page.screenshot({ path: '/tmp/greybox-page.png' })
await page.evaluate(() => {
  document.querySelector('.intro')?.setAttribute('style', 'display:none')
  document.querySelector('.footer')?.setAttribute('style', 'display:none')
  document.querySelector('.loading')?.setAttribute('style', 'display:none')
  const world = document.querySelector('.world')
  if (world) world.setAttribute('style', 'inset:0')
})
await new Promise((r) => setTimeout(r, 400))
const world = await page.$('.world')
await world.screenshot({ path: '/tmp/greybox-world.png' })
await browser.close()
