// Torrek PWA-Icons: Feuchte-Rampe (Teal→Amber) + weißer Tropfen (Brand-Logo).
// Rendert public/icons/* über headless Chromium in allen benötigten Größen.
import { chromium } from "playwright-core";
import fs from "fs";

// Tropfen-Glyphe aus src/ui/Icon.tsx (24er-ViewBox), hier gefüllt statt Outline.
const DROP = "M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5S12.5 5 12 2.5C11.5 5 10 7.4 8 9.5S5 13 5 15a7 7 0 0 0 7 7Z";

/** Icon-SVG: size px, Glyphe als Anteil der Kante (maskable braucht mehr Rand). */
function iconSvg(size, glyphFrac) {
  const g = size * glyphFrac; // Kantenlänge des 24er-Glyph-Rasters
  const off = (size - g) / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ramp" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0B5560"/><stop offset="0.52" stop-color="#0E7C86"/><stop offset="1" stop-color="#E0A43B"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#ramp)"/>
  <g transform="translate(${off},${off}) scale(${g / 24})">
    <path d="${DROP}" fill="#FFFFFF"/>
  </g>
</svg>`;
}

const jobs = [
  { file: "public/icons/icon-192.png", size: 192, frac: 0.66 },
  { file: "public/icons/icon-512.png", size: 512, frac: 0.66 },
  { file: "public/icons/apple-touch-icon.png", size: 180, frac: 0.62 },
  { file: "public/icons/maskable-512.png", size: 512, frac: 0.52 }, // Safe-Zone
];

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell" });
for (const j of jobs) {
  const ctx = await browser.newContext({ viewport: { width: j.size, height: j.size }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.setContent(`<!doctype html><style>*{margin:0}</style>${iconSvg(j.size, j.frac)}`);
  await page.screenshot({ path: j.file });
  await ctx.close();
  console.log("ok", j.file);
}
await browser.close();
