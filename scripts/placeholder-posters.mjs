import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const svg = (width, height) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#e6e0d2"/>
  <ellipse cx="${width * 0.52}" cy="${height * 0.48}" rx="${width * 0.28}" ry="${height * 0.22}" fill="#3f7c82"/>
  <ellipse cx="${width * 0.52}" cy="${height * 0.48}" rx="${width * 0.22}" ry="${height * 0.15}" fill="#2f6b72"/>
  <rect x="${width * 0.4}" y="${height * 0.62}" width="${width * 0.08}" height="${height * 0.07}" rx="4" fill="#a68462"/>
</svg>`

await mkdir('public/map-preview', { recursive: true })
await sharp(Buffer.from(svg(2400, 800))).webp({ quality: 80 }).toFile('public/map-preview/desktop.webp')
await sharp(Buffer.from(svg(900, 1200))).webp({ quality: 80 }).toFile('public/map-preview/mobile.webp')
await sharp(Buffer.from(svg(1200, 630))).jpeg({ quality: 82 }).toFile('public/og.jpg')
