# DryTrack

Digitale Arbeitsplattform für Sanierungs- und Gebäudetrocknungsunternehmen.
Umsetzung aus der Notion-Dokumentation **„DryTrack — Docs"** (000 Vision → 017 Deployment).

> Arbeitstitel „DryTrack" (Namensfindung offen, siehe 000 Vision).

## 🌐 Live

**App (PWA, installierbar):** https://zkuawtrwtmxhayshuxzv.supabase.co/functions/v1/app/

- **Handy:** Link öffnen → Android/Chrome: Menü ⋮ → „App installieren" · iPhone/Safari: Teilen → „Zum Home-Bildschirm"
- **Desktop:** gleiche URL, ab 1024px Fensterbreite erscheint die Office-Ansicht mit Sidebar
- Daten liegen in **Supabase Postgres** (Projekt `zkuawtrwtmxhayshuxzv`, eu-central-1) und synchronisieren
  live zwischen allen Geräten (Realtime). Offline funktioniert die App weiter; Änderungen werden
  bei Wiederverbindung nachsynchronisiert.

## Architektur

```
Browser/PWA (React + TS)
  ├─ src/domain/store.ts     lokaler Store (localStorage) — Offline-First
  ├─ src/domain/remote.ts    Sync: Pull aller Tabellen → Realtime-Subscription;
  │                          Mutations-Diffs als idempotente PK-Upserts, Offline-Queue
  └─ src/config.ts           Supabase-URL + Publishable Key (Client-Key, RLS-geschützt)

Supabase (008 Backend / ADR-1)
  ├─ Postgres: 18 Tabellen, deutsch, 1:1 aus "006 · Datenbank" (Migrationen im Projekt)
  ├─ Realtime: publication auf allen Tabellen
  └─ Edge Function "app": statisches Hosting der PWA (holt Build aus hosting/ im Repo)
```

**Sicherheit (Demo-Phase):** RLS ist aktiv, aber mit offenen Demo-Policies (`demo_vollzugriff`),
damit die App ohne Login nutzbar ist. Produktiv ersetzt der Microsoft-365-Login (FR-SEC-001)
diese Policies durch rollenbasierte — das Rollenmodell (04) ist in der App bereits abgebildet.

## Entwicklung

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # Typecheck + Produktions-Build nach dist/
```

**Neue Version veröffentlichen:** `npm run build && rm -rf hosting && cp -r dist hosting`,
committen und pushen — die Edge Function liefert immer den Stand aus `hosting/` auf dem Branch
`claude/drytrack-docs-program-g64405` aus (Cache: 1 h, index.html/sw.js: no-cache).

## Was diese App umsetzt

Ein lauffähiger, **mobile-first / offline-first** Prototyp (React + TypeScript + Vite) des
V1-Kerns aus den Docs:

- **Login / Rollen** — Demo-Login (produktiv Microsoft 365, FR-SEC-001), vier Rollen mit
  1:1 umgesetzter Rechte-Matrix aus *04 Rollenmodell* (u. a. KVA-/Kosten-Sichtbarkeit nur
  für Disposition/Projektleiter/Admin, nicht für Monteure).
- **Dashboard** — Live-Übersicht für die Disposition: Geräteauslastung (Lager/Baustelle/
  Werkstatt), offene Projekte, E-Check-Fälligkeiten.
- **Projekte** — Liste, Anlegen (Projektnummer `JJJJ-NNNN`, FR-PROJ-001), Detail mit
  Status-Lebenszyklus (FR-PROJ-010), Räumen, Kontaminations-/Gefährdungs-Warnung,
  Projekt-Feed und rollenabhängigen Dokumenten.
- **Geräte** — zentrale Stammdatentabelle (Schlüssel = Inventarnummer = Barcode-Inhalt),
  Status-Filter, Geräte-Historie als gefilterte Sicht auf die Einsätze (FR-KOMM-002).
- **Scan-Flow** — Inventarnummer eingeben → **Aufbau** (Projekt/Raum/Startzählerstand) oder
  **Abbau** (Endzählerstand). Verbrauch und Einsatzdauer werden automatisch berechnet
  (FR-EINSATZ-002); bei defektem/unlesbarem Zähler greift die Fallback-Schätzung
  *Einsatztage × kW × 24 h*, klar als Näherungswert gekennzeichnet (FR-EINSATZ-003).
- **Feed** — automatische Einträge (Scan/Abbau) plus manuelle Einträge mit Kategorie
  (FR-KOMM-001/004).

## Datenmodell

`src/domain/types.ts` bildet die **17 Tabellen** aus *006 · Datenbank* (Source of Truth,
Stand 12.07.2026) typisiert ab: `gerätetyp`, `gerät`, `projekt`, `einsatz`, `benutzer`,
`raum`, `raum_foto`, `feed_eintrag`, `feed_kommentar`, `dokument`, `materialdatenbank`,
`messung`, `grundriss`, `grundriss_markierung`, `bemusterung`, `versicherung`,
`firmen_einstellung`.

Die Daten liegen offline im Browser (`localStorage`). Ein Realtime-Backend (Supabase —
Auth/Postgres/Storage/Realtime, ADR-1 / *008 Backend*) würde in `src/domain/store.ts`
andocken; die Datenzugriffsschicht ist dafür gekapselt.

## Projektstruktur

```
src/
  domain/        Datenmodell + Geschäftslogik (framework-unabhängig)
    types.ts       17 Tabellen als TypeScript-Typen
    roles.ts       Rollen-Rechte-Matrix (04 Rollenmodell)
    einsatz.ts     Verbrauchs-/Dauerberechnung (FR-EINSATZ-002/003)
    store.ts       Offline-Store + Mutationen (Aufbau/Abbau/Feed/…)
    seed.ts        Beispieldaten
  app/           App-Infrastruktur (Store-Hook, Session, Navigation, Labels, Format)
  screens/       UI (Login, Dashboard, Projekte, Geräte, Scan, Einstellungen)
```

## Entwicklung

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # Typecheck (tsc -b) + Produktions-Build
npm run preview    # gebautes Bundle lokal servieren
```

## Umfang / Nicht-Ziele

Bewusst **kein** überladenes ERP (000 Vision). Nicht enthalten in diesem Prototyp:
echter MS-365-Login, Kamera-Barcode-Scan, PDF-/Strombrief-Generierung, KI-Assistent
(*007 AI*), Kartenansicht/Geocoding und die Supabase-Anbindung — diese Bereiche sind in
den Docs spezifiziert und dockt die gekapselte Domänenschicht später an.
