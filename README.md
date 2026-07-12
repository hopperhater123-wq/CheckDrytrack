# DryTrack

Digitale Arbeitsplattform für Sanierungs- und Gebäudetrocknungsunternehmen.
Umsetzung aus der Notion-Dokumentation **„DryTrack — Docs"** (000 Vision → 017 Deployment).

> Arbeitstitel „DryTrack" (Namensfindung offen, siehe 000 Vision).

Das Herzstück ist die **Einsatzverwaltung**: nicht Geräte stehen im Mittelpunkt,
sondern deren tatsächliche Einsätze innerhalb eines Projekts. Ein Einsatz dokumentiert
den Lebenszyklus eines Geräts (Aufbau → Abbau) und erzeugt automatisch eine Historie.

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
