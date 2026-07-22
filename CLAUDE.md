# Arbeitsregeln für KI-Agenten

Dieses Dokument beschreibt nicht das Produkt (dafür: `UEBERBLICK.md`), sondern **wie**
in diesem Projekt gearbeitet wird. Es gilt für alle KI-Agenten und menschlichen Mitwirkenden.

## Reihenfolge des Verstehens

1. `UEBERBLICK.md` lesen (5 Minuten): Grundprinzipien + Domänenmodell.
2. **Erst den Geschäftsprozess verstehen, dann Architektur oder UI ändern.** Der Weg
   Schadenfall → … → Rechnung (UEBERBLICK.md, Notion „Geschäftsprozess") ist die Richtschnur —
   jede Funktion muss sich einem Prozessschritt und einer Rolle zuordnen lassen.
3. Produktwissen liegt in Notion („DryTrack — Docs"): PRD (FR-Nummern), UX-Flows,
   Design-System, Datenbank, Backend/ADRs, Roadmap, Testing, Tagebuch.

## Entscheidungen

- **Architektur-Entscheidungen (ADRs, z. B. ADR-1 Supabase) niemals eigenmächtig ändern.**
  Neue Vorschläge immer gegen bestehende ADRs und die Vision (kein ERP!) prüfen.
- **Bei Widersprüchen nachfragen statt entscheiden.** Widerspricht eine Anforderung den
  Docs oder dem Code-Ist-Stand, den Widerspruch benennen und klären lassen.
- **Neue Ideen zuerst als Idee erfassen** (Roadmap/Parking-Lot in Notion), nicht direkt bauen.
- Farben Rot/Gelb/Grün sind exklusiv für Messwert-Bewertungen reserviert — nie für Deko/Akzente.

## Konventionen im Repo

- **Branch:** Entwicklung ausschließlich auf `claude/drytrack-docs-program-g64405`.
- **Sprache:** Code-Kommentare, Commits, Doku auf Deutsch; Domänenbegriffe deutsch
  (Messpunkt, Einsatz, Trocknungsergebnis …). FR-Nummern aus dem PRD in Kommentaren
  referenzieren, wo einschlägig.
- **Tests vor Push:** `npm test` (vitest) und `npm run e2e` (Golden Path, headless Chromium).
  Der E2E-Test ist hermetisch — er blockiert Supabase-Requests; das muss so bleiben,
  sonst syncen CI-Läufe Testdaten in die geteilte Demo-Datenbank.
- **Deploy:** `VITE_AUTH_REQUIRED=true npm run build` → Inhalt von `dist/` nach `hosting/`
  kopieren → committen + pushen. GitHub Pages liefert `hosting/` aus. Niemals von Hand in
  `hosting/` editieren. **Wichtig:** Das `VITE_AUTH_REQUIRED=true` NICHT weglassen — sonst
  liefert der Produktions-Build die App ohne Pflicht-Login aus (Zugangssperre wäre offen).
  Der E2E-/CI-Build nutzt bewusst `npm run build` ohne die Variable (Login aus, hermetisch).
- **Supabase:** Schema-Änderungen nur additiv als Migration (`ADD COLUMN IF NOT EXISTS`,
  neue Tabellen mit Text-PK, GRANT + RLS-Policy + Realtime-Publication). Seed-/Demo-Daten
  nicht ohne Grund verändern. **Jede neue Migration zusätzlich als Datei nach
  `supabase/migrations/<version>_<name>.sql` schreiben** (Repo-Kopie zur Wiederherstellung,
  siehe `supabase/migrations/README.md`).
- **Doku-Pflicht:** Nach jedem nennenswerten Arbeitspaket einen Tagebuch-Eintrag in Notion
  (fortlaufende Nummer) und betroffene Docs (Testing, Roadmap …) aktualisieren.
