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
| `README.md` | dieses Dokument |

## Screens

`setup` (Liste anlegen) → `scan` (Kamera) → `typ` (nur bei neuem Gerät) → `wert`
(Ziffernfeld + Foto) → `liste` (Erfasstes + Sync-Status) → `senden` (Abschluss + Excel).

## Lokal ansehen

Statisch ausliefern, z. B. `python3 -m http.server` im Ordner, dann `index.html` im Browser
öffnen. Kamera braucht `https` bzw. `localhost`. Ohne Backend läuft die UI vollständig
(Erfassung landet lokal); Scan/Sync/Export benötigen Netz.

## Design

Gestaltungsprinzip „Feldinstrument": Papier `#FBF9F5` / Tinte `#1C1A17`, Bernstein `#E8A33D`
als Akzent, dunkles Ablese-Display mit Monospace-Ziffern, animiertes Barcode-Intro. Die
Ampelfarben Rot/Gelb/Grün sind — wie im Hauptprojekt — für Bewertungen/Status reserviert.
`prefers-reduced-motion` wird vollständig respektiert.
