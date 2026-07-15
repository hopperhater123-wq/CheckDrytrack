# Torrek — Projekt-Überblick (für Menschen und KIs)

> Stand: 15.07.2026. Dieses Dokument fasst das gesamte Projekt auf einer Seite zusammen.

## Was ist Torrek?

Torrek (Arbeitstitel früher „DryTrack") ist eine **mobile-first, offline-fähige PWA für Gebäudetrocknungs-Firmen** (Wasserschaden-Sanierung). Sie digitalisiert den Arbeitstag des Trocknungstechnikers: Termine, geführter Besuch am Objekt, Feuchtemessungen mit Bewertungslogik, Trocknungsgeräte-Einsätze, Fotos/Skizzen mit Annotation, Berichte mit Unterschrift als PDF.

## Links

| Was | URL |
|---|---|
| **Live-App (Demo)** | https://hopperhater123-wq.github.io/CheckDrytrack/ |
| **Marketing-/Landingpage** | https://hopperhater123-wq.github.io/CheckDrytrack/website/ |
| **Repository** | https://github.com/hopperhater123-wq/CheckDrytrack |

Die Demo läuft ohne Login-Zwang: Auf dem Anmeldebildschirm eine Demo-Rolle wählen (z. B. Monteur). Alle Daten liegen offline im Browser (`localStorage`) und syncen best-effort mit Supabase.

## Grundprinzipien

1. **Wir digitalisieren Arbeitsabläufe, keine Formulare.** Die App folgt dem Tag des Technikers (Mein Tag → geführter Besuch), nicht der Datenbankstruktur.
2. **Der Benutzer arbeitet, die Software dokumentiert.** Check-in/Check-out, Feed-Einträge, Verlaufsmatrix und Verbrauchsberechnung entstehen als Nebenprodukt der Arbeit — nicht als Extra-Aufgabe.
3. **Offline-First.** Keller ohne Empfang ist der Normalfall, nicht die Ausnahme. Alles funktioniert lokal; Sync ist nachgelagert.
4. **Single Source of Truth.** Jede Information lebt genau einmal: strukturiert in den Daten (nicht in Fotos von Zetteln), Produktwissen in den Notion-Docs.
5. **PDF ist Ausgabe, strukturierte Daten sind die Wahrheit.** Berichte werden aus den Daten erzeugt — nie umgekehrt.

## Domänenmodell: der Weg eines Schadenfalls

```
Schadenfall (Kunde/Versicherung meldet)
  → Auftrag + A&A-Unterschrift          Projekt JJJJ-NNNN, Auftrag & Abtretung
  → ggf. Notdienst / Erstmaßnahme       Notdienst-Einsatzbericht, Sofortmaßnahmen
  → Schadenaufnahme                     Objektdaten, Räume, Bodenaufbau, Fotos, Skizzen
  → Eingangsmessung                     Messpunkte definieren, erste Werte
  → Kostenvoranschlag + Freigabe        Freigabegrenze (FR-PROJ-011), Kosten rollenbeschränkt
  → Trocknung                           Geräte-Aufbau (Scan, Startzählerstand)
  → Kontrollmessungen (je Besuch)       Verlaufsmatrix füllt sich, Besuchsberichte
  → Freimessung                         Werte unter Grenzwert → trocken
  → Abbau                               Endzählerstand → Verbrauch, Geräte zurück ins Lager
  → Trocknungsergebnis + Abnahme        je Geschoss, Kundenunterschrift, Abnahmeprotokoll
  → Abschluss + Übergabe Büro           Berichte/PDFs, Grundlage für die Rechnung
```

Dieser Prozess ist das Herzstück des Projekts; die App bildet ihn heute vom Auftrag bis zur Abnahme ab (Rechnungsstellung selbst bleibt bewusst außerhalb — kein ERP, siehe 000 Vision).

## Kernidee: nach Arbeitsablauf sortiert, nicht nach Datenbanktabellen

- **Mein Tag** (Startscreen Monteur): heutige Termine als Tour-Timeline, Anruf-/Maps-Links, Tagesfortschritt.
- **Geführter Besuch** (5 Schritte): Ankunft → Messen → Geräte → Doku → Abschluss. Check-in/Check-out landen automatisch im Projekt-Feed.
- **Messen** in Arbeitsreihenfolge: Räume anlegen → je Geschoss → je Raum: Bodenaufbau (Schichten), Messpunkte mit **Verlaufsmatrix** (Zeilen = Messpunkte, Spalten = Besuchstage, Zellen farbcodiert), Messung mit Vorbesuchs-Referenz.
- **Desktop-Ansicht** für Büro/Disposition: Dashboard mit KPIs, Projekten, Geräten, Wochenplan.

## Fachlogik (src/domain/mess.ts)

Vier Bewertungsmodelle je Material: `digit_grenzwert` (Praxisgrenzwert + 15-%-Band), `vergleichsmessung` (Δ zur Referenzstelle), `status_checkliste` (KMF/Dämmung: trocken/feucht/kontaminiert/Austausch), `hygrometer` (materialunabhängig über absolute Feuchte g/kg, Magnus-Formel; auch Bohrloch-/Dämmschicht-Messung). Ampel-Farben (rot/gelb/grün) sind exklusiv für Bewertungen reserviert.

## Technik

- **Frontend:** React 18 + TypeScript + Vite, PWA (Manifest, Service Worker, installierbar), Animationen mit `motion/react`.
- **Offline-First:** kompletter Datenbestand in `localStorage` (`drytrack.db.v2`), Mutationen über einen zentralen Store (`src/domain/store.ts`).
- **Sync:** Diff-basierte Upserts + Realtime gegen **Supabase** (28 Tabellen, Text-PKs, RLS mit Demo-Policy). Ohne Netz läuft alles rein lokal; eine persistente Queue spielt Änderungen später nach (`src/domain/remote.ts`).
- **PDF-Berichte:** Messprotokoll (inkl. Matrix, Trocknungsergebnis je Geschoss mit Unterschrift), Besuchsbericht, Stundenlohnbericht, Notdienst-, Abnahme-, Ersatzfliesenbericht u. a. (`src/domain/report.ts`).
- **Design-System:** „Feldinstrument" — Petrol `#0E7C86` als Akzent, Bernstein für den Trocknungsverlauf, Display-Font Big Shoulders + JetBrains Mono (eingebettet), Hell/Dunkel/Auto-Theme, dezente abschaltbare UI-Sounds (Web Audio, synthetisiert), animiertes App-Intro.
- **Tests + CI:** vitest-Unit-Tests für die Bewertungslogik (`src/domain/mess.test.ts`, 15 Tests), E2E-Golden-Path im echten Chromium (`e2e/workflow.mjs`, 18 Checks, hermetisch — Supabase wird im Test blockiert), GitHub-Actions-Workflow bei jedem Push (`.github/workflows/ci.yml`).

## Repo-Struktur (Auszug)

```
src/
  domain/    Typen, Store (localStorage), Bewertungslogik, Sync, PDF-Reports, Seed-Daten
  screens/   HeuteScreen (Mein Tag), BesuchFlow (geführter Besuch), MessprotokollTab,
             ProjektDetail, BerichteTab, GrundrissTab, Dashboard, Einstellungen …
  ui/        Icon, Modal/Motion-Bausteine, Intro, Sound, Theme, FotoAnnotator, SignaturPad
  app/       Navigation, Session/Rollen (Monteur, Bauleiter, Disponent, Büro, Admin)
e2e/         E2E-Golden-Path (playwright-core)
hosting/     deployter Build für GitHub Pages (+ /website Landingpage)
```

## Rollenmodell

Monteur (Mein Tag, Besuch, Erfassen), Bauleiter/Projektleiter (alle Erfassungen, Projekte führen), Disponent (Planung), Büro (Export/Reporting), Admin (Stammdaten, Rollen). Sichtbarkeit von Kosten/KVA ist rollenbeschränkt.

## Entstehung

Das Projekt wurde aus einer Notion-Dokumentation („DryTrack — Docs": Vision, PRD, UX-Flows, Design-System, Roadmap, Testing, Tagebuch) heraus entwickelt und gegen ein Alt-System (Foto- und Video-Analyse eines „Mobilen Trocknungsassistenten") auf Funktionsparität und darüber hinaus gebracht — u. a. Messpunkt-Verlaufsmatrix, Messgeräte je Messung, Foto-Annotation (Stift/Pfeil/Text), Trocknungsergebnis je Geschoss mit Kundenunterschrift.

## Dokumentation in drei Ebenen

1. **Einstieg (5 Minuten):** dieses Dokument. Was ist Torrek, welches Problem löst es, wie denkt das Projekt, wie ist das Repo aufgebaut.
2. **Produktwissen (Notion, privat):** „DryTrack — Docs" — Vision, Geschäftsprozess, PRD mit FR-Nummern, UX-Flows, Design-System, Datenbank, Backend/ADRs, Roadmap, Testing, Analyse Alt-System, Runbooks und das Tagebuch (Product Journal, #001 ff.). Dort entsteht das Domänenwissen; FR-Nummern aus dem PRD tauchen als Kommentare im Code wieder auf.
3. **Quellcode (dieses Repo):** React-PWA, Supabase-Sync, Tests, CI. Für KI-Agenten gelten die Arbeitsregeln in `CLAUDE.md`.
