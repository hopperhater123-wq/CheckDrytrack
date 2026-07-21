// E2E-Golden-Path gegen den Produktions-Build (012 · Testing).
// Läuft lokal wie in CI: `npm run build && npm run e2e`.
// Chromium-Auflösung: CHROMIUM_PATH > playwright-core-Standard > lokale Fallbacks.
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { chromium } from "playwright-core";

const kandidaten = [
  process.env.CHROMIUM_PATH,
  (() => { try { return chromium.executablePath(); } catch { return null; } })(),
  "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell",
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
].filter(Boolean);
const executablePath = kandidaten.find((k) => existsSync(k));
if (!executablePath) {
  console.error("Kein Chromium gefunden. In CI: `npx playwright-core install chromium`; lokal: CHROMIUM_PATH setzen.");
  process.exit(2);
}

const css = readFileSync("dist/app.css", "utf8");
const js = readFileSync("dist/app.js", "utf8");
const html = `<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0E7C86">
<style>${css}</style></head><body><div id="root"></div>
<script type="module">${js}</script></body></html>`;

const server = createServer((_q, res) => {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}).listen(4310);

const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 400, height: 850 } });
// Hermetisch: Supabase blockieren. Sonst zieht der Sync in CI den Remote-Stand
// mitten im Test herein (überschreibt erledigt/Feed) und jeder CI-Lauf würde
// Testdaten in die geteilte Demo-Datenbank schreiben.
await page.route(/supabase\.co/, (route) => route.abort());
const fehler = [];
page.on("pageerror", (e) => fehler.push(String(e)));
const ok = (name, cond) => { console.log(`${cond ? "✓" : "✗"} ${name}`); if (!cond) process.exitCode = 1; };

// Monteur-Login, Intro überspringen
await page.addInitScript(() => localStorage.setItem("drytrack.session.userId", "u-monteur"));
await page.goto("http://localhost:4310/");
await page.waitForSelector(".intro");
ok("Intro erscheint", true);
await page.locator(".intro").click();
await page.waitForSelector("h1");

// Mein Tag
ok("Monteur landet auf 'Mein Tag'", await page.locator("h1", { hasText: "Mein Tag" }).count() === 1);
ok("Heutiger Termin mit Anruf-Link", await page.locator('.tour-card a[href^="tel:"]').count() >= 1);

// Geführter Besuch
await page.locator("button", { hasText: "Besuch starten" }).first().click();
await page.waitForSelector(".besuch-rail");
ok("Schritt-Schiene mit 5 Schritten", await page.locator(".rail-stop").count() === 5);
await page.locator("button", { hasText: "Ankunft erfassen" }).click();
ok("Ankunft erfasst", await page.locator("button", { hasText: "Ankunft erfasst" }).count() === 1);

// Messen-Schritt: Arbeitsreihenfolge
await page.locator(".besuch-fuss button", { hasText: "Weiter" }).click();
await page.waitForSelector(".mp-bereich");
const karten = await page.evaluate(() =>
  [...document.querySelectorAll("section.card h2")].map((h) => h.textContent ?? ""));
ok("Räume-Karte steht zuoberst", (karten.find((t) => t.includes("Räume") || t.includes("Ersten Raum")) ?? "") !== "" && karten.findIndex((t) => t.startsWith("Räume")) < karten.findIndex((t) => t.startsWith("Küche")));
const kueche = page.locator("section.card", { has: page.locator("h2", { hasText: "Küche" }) }).first();
ok("Bodenaufbau eingeklappt (gepflegt)", await kueche.locator(".aufbau-zu").count() === 1);
ok("3 Seed-Messpunkte + Matrix", await kueche.locator(".mp-bereich .listrow").count() === 3
  && await kueche.locator(".matrix-scroll table").count() === 1);
const spaltenVorher = await kueche.locator(".matrix-scroll thead th").count();

// Messung am Messpunkt mit Vorbesuchs-Referenz
await kueche.locator(".mp-bereich .listrow", { hasText: "Estrich Mitte" }).locator("button", { hasText: "Messen" }).click();
await page.waitForSelector(".modal");
const modal = page.locator(".modal");
ok("Vorbesuchs-Referenz sichtbar", (await modal.locator(".readout").first().textContent() ?? "").includes("Vorbesuch"));
await modal.locator("select", { has: page.locator("option", { hasText: "Freimessung" }) }).last().selectOption("eingangsmessung");
await modal.locator('input[placeholder="z. B. 62"]').fill("49");
await modal.locator("button", { hasText: "Speichern" }).click();
await page.waitForTimeout(400);
ok("Matrix bekommt heutige Spalte", await kueche.locator(".matrix-scroll thead th").count() === spaltenVorher + 1);

// Durch die restlichen Schritte zum Abschluss
await page.locator(".besuch-fuss button", { hasText: "Weiter" }).click();
await page.waitForTimeout(250);
ok("Plan-Schritt (Grundriss/Schadensstelle)", await page.locator("h2", { hasText: "Grundriss" }).count() === 1);
await page.locator(".besuch-fuss button", { hasText: "Weiter" }).click();
await page.waitForTimeout(250);
ok("Geräte-Schritt (Scan + Einsätze)", await page.locator("button", { hasText: "Gerät scannen" }).count() === 1);
await page.locator(".besuch-fuss button", { hasText: "Weiter" }).click();
await page.waitForTimeout(250);
ok("Doku-Schritt (Fotos je Raum + Feed)", await page.locator("h2", { hasText: "Fotos — Küche" }).count() === 1
  && await page.locator(".composer").count() === 1);
await page.locator(".besuch-fuss button", { hasText: "Weiter" }).click();
await page.waitForTimeout(250);
ok("Abschluss-Schritt", await page.locator("h2", { hasText: "Besuch im Überblick" }).count() === 1);
await page.locator("button", { hasText: "Besuch abschließen" }).click();
await page.waitForSelector(".trocken-overlay", { timeout: 4000 });
ok("Trocken-Moment", true);
await page.waitForTimeout(3400);
ok("Zurück auf 'Mein Tag', Termin erledigt", await page.locator("h1", { hasText: "Mein Tag" }).count() === 1
  && await page.locator(".tour-stop.erledigt").count() === 1);

// Persistenz
const db = await page.evaluate(() => JSON.parse(localStorage.getItem("drytrack.db.v2")));
const feeds = db.feed_eintrag.filter((f) => f.projekt_id === "p-1").map((f) => f.ursprung);
ok("check_in/check_out im Feed", feeds.includes("check_in") && feeds.includes("check_out"));
const neu = db.messung.find((m) => m.anzeige_digit === 49);
ok("Messung dem Messpunkt zugeordnet", !!neu && neu.messpunkt_id === "mp-1");
ok("Keine Seitenfehler", fehler.length === 0);
if (fehler.length) console.log(fehler.join("\n"));

await browser.close();
server.close();
