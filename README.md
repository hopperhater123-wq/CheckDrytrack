# Torrek

Digitale Arbeitsplattform für Sanierungs- und Gebäudetrocknungsunternehmen.

> **👉 Neu hier (Mensch oder KI)? Zuerst [`UEBERBLICK.md`](UEBERBLICK.md) lesen** — das
> Projekt in 5 Minuten: Problem, Grundprinzipien, Domänenmodell, Technik, Struktur.
> Arbeitsregeln für KI-Agenten: [`CLAUDE.md`](CLAUDE.md).

> Name: **Torrek** (entschieden 14.07.2026, vormals Arbeitstitel „DryTrack").
> Formale Markenprüfung (DPMA/EUIPO) vor Launch ausstehend.

## 🌐 Live

- **App (PWA, installierbar):** https://hopperhater123-wq.github.io/CheckDrytrack/
- **Landingpage:** https://hopperhater123-wq.github.io/CheckDrytrack/website/

**Installieren:** Android/Chrome: Menü ⋮ → „App installieren" · iPhone/Safari: Teilen →
„Zum Home-Bildschirm" · Desktop: gleiche URL, ab 1024 px erscheint die Office-Ansicht.

Daten liegen offline im Browser (`localStorage`) und synchronisieren live über
**Supabase Postgres** (Projekt `zkuawtrwtmxhayshuxzv`, eu-central-1, Realtime).
Offline funktioniert alles weiter; Änderungen werden nachsynchronisiert.

**Sicherheit (Demo-Phase):** RLS ist aktiv, aber mit offenen Demo-Policies
(`demo_vollzugriff`), damit die App ohne Login nutzbar ist. Produktiv ersetzt der
Microsoft-365-Login (FR-SEC-001) diese durch rollenbasierte Policies.

## Entwicklung

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Unit-Tests (vitest) — Bewertungslogik
npm run build      # Typecheck (tsc -b) + Produktions-Build nach dist/
npm run e2e        # E2E-Golden-Path gegen den Build (headless Chromium)
```

CI (`.github/workflows/ci.yml`) führt bei jedem Push aus: npm ci → Unit-Tests → Build →
E2E. Der E2E-Test ist hermetisch (blockiert Supabase-Requests).

**Neue Version veröffentlichen:** `npm run build && cp -r dist/. hosting/`, committen und
pushen — GitHub Pages deployed automatisch den Stand aus `hosting/` (Branch
`claude/drytrack-docs-program-g64405`).

## Dokumentation

1. **Einstieg:** [`UEBERBLICK.md`](UEBERBLICK.md) (dieses Repo)
2. **Produktwissen:** Notion „DryTrack — Docs" (privat) — Vision, Geschäftsprozess, PRD,
   UX-Flows, Design-System, Datenbank, Backend/ADRs, Roadmap, Testing, Tagebuch
3. **Quellcode:** dieses Repo — Struktur und Prinzipien in [`UEBERBLICK.md`](UEBERBLICK.md),
   Arbeitsregeln in [`CLAUDE.md`](CLAUDE.md)
