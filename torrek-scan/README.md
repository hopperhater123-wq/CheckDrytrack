# Torrek Scan

Eigenständige, **offline-first** Erfassungs-App für **Bautrocknungs-Geräte**: Der Monteur
scannt vor Ort per Handy-Kamera die Geräte-Barcodes, tippt den **Zählerstand (kWh)** ein und
hängt optional ein **Foto vom Zähler** an. Beim Abbau rechnet die App automatisch die
**Differenz** (Verbrauch) gegen den Aufbau-Stand und erzeugt eine **Excel-Liste fürs Büro**.

> Torrek Scan ist ein **separates Projekt** neben der Torrek/DryTrack-Hauptanwendung und
> speichert getrennt von ihr (eigene Supabase Edge Function). Produktdoku liegt in Notion
> unter **„Torrek-Scan.Doc"**.

## Was es kann

- **Barcode-Scan** (CODE-128) über die Rückkamera, ZXing im Browser; Fallback: Nummer eintippen.
- **Aufbau / Abbau** als zwei Modi einer Liste. Im Abbau kennt die App die offenen Geräte des
  Projekts und warnt bei fehlenden, fremden oder negativen Ständen.
- **Neues Gerät** wird beim ersten Scan einmalig nach dem Gerätetyp gefragt, danach nie wieder.
- **Offline-first:** Jede Erfassung geht zuerst in IndexedDB. Der Sync gegen den Server läuft
  best-effort und automatisch nach, sobald wieder Netz da ist — nichts geht verloren.
- **Excel-Export** (SheetJS) als „Zettel fürs Büro", inkl. Gesamtverbrauch beim Abbau.

## Aufbau

Eine einzige, selbsttragende `index.html` (HTML + CSS + JS, keine Build-Kette). Externe
Bibliotheken (ZXing, SheetJS) werden per CDN geladen. Backend ist eine Supabase Edge Function
(`/functions/v1/torrek-scan`), authentifiziert über einen `x-app-code`-Header pro Liste.

| Datei | Zweck |
|---|---|
| `index.html` | komplette App (UI, Offline-Speicher, Scan, Sync, Export) |
| `vendor/` | lokal gebündelte Libs (ZXing, SheetJS) — statt CDN, für echtes Offline |
| `sw.js` | Service Worker (cacht App-Shell + Libs; Edge Function bleibt unberührt) |
| `manifest.webmanifest`, `icon.svg` | PWA-Manifest + Icon (installierbar) |
| `e2e.mjs` | hermetischer E2E-Golden-Path (Playwright) |
| `README.md` | dieses Dokument |

## Screens

`setup` (Liste anlegen) → `scan` (Kamera) → `typ` (nur bei neuem Gerät) → `wert`
(Ziffernfeld + Foto) → `liste` (Erfasstes + Sync-Status) → `senden` (Abschluss + Excel).

## Lokal ansehen

Statisch ausliefern, z. B. `python3 -m http.server` im Ordner, dann `index.html` im Browser
öffnen. Kamera und Service Worker brauchen `https` bzw. `localhost`. Dank lokal gebündelter
Libs startet und scannt die App auch **beim ersten Mal offline**; nur Sync/Backend braucht Netz.

## Offline & Installierbar

- **Kein CDN mehr:** ZXing und SheetJS liegen unter `vendor/` — nichts wird beim Start
  nachgeladen. Beim Abgleich der Versionen die Dateinamen (`…-<version>.min.js`) mitziehen.
- **Service Worker** cacht die App-Shell und die Libs. Die **Edge Function wird nie gecacht**
  — Sync geht immer ans echte Netz, offline puffert die App selbst (IndexedDB).
- **Installierbar** über `manifest.webmanifest` (Display „standalone").

## Tests

Hermetischer E2E-Golden-Path (Playwright, echtes Chromium): startet einen eigenen statischen
Server und **mockt bzw. blockiert die Edge Function** — es geht nie ein echter Request an
Supabase raus. Deckt Setup, Aufbau, Abbau-Differenz, Grammatik (1 Gerät / 2 Geräte),
Sync-Status und den Offline-Leerzustand ab (18 Checks).

```bash
# aus dem Repo-Wurzelverzeichnis (nutzt playwright-core aus dem Wurzel-node_modules)
node torrek-scan/e2e.mjs
```

## Deploy

Die App ist **komplett path-relativ** (alle Pfade relativ, Service-Worker-Scope und
`start_url` relativ) und läuft daher an jedem Ort — Site-Root **oder** Unterpfad. Verifiziert
unter `/torrek-scan/` (SW-Scope korrekt, Offline-Reload ok). `.nojekyll` verhindert Jekyll-
Verarbeitung, falls über GitHub Pages ausgeliefert.

**Wichtig:** GitHub Pages liefert pro Repo nur **eine** Quelle aus — hier aktuell `hosting/`
(DryTrack). Für einen *getrennten* Deploy stehen offen: eigenes Repo mit eigener Pages-Site,
ein externer Static-Host (Netlify/Cloudflare Pages, auf diesen Unterordner gezeigt), oder ein
Unterpfad unter der bestehenden Seite (koppelt beide Deploys — nur wenn Trennung nicht nötig).
Die Entscheidung liegt bewusst beim Team; DryTracks Deploy bleibt unangetastet.

## Design

Gestaltungsprinzip „Feldinstrument": Papier `#FBF9F5` / Tinte `#1C1A17`, Bernstein `#E8A33D`
als Akzent, dunkles Ablese-Display mit Monospace-Ziffern, animiertes Barcode-Intro. Die
Ampelfarben Rot/Gelb/Grün sind — wie im Hauptprojekt — für Bewertungen/Status reserviert.
`prefers-reduced-motion` wird vollständig respektiert.
