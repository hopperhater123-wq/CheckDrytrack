# Supabase-Migrationen (Wiederherstellungs-Sicherung)

Dieser Ordner ist die **Repo-Kopie der Datenbank-Migrationen** des Supabase-Projekts
`zkuawtrwtmxhayshuxzv`. Er dient als Versicherung: Falls Supabase das (kostenlose)
Projekt nach langer Inaktivität einmal löschen sollte, lässt sich die komplette
Datenbank allein aus diesem Repo neu aufbauen — ohne Zugriff auf die alte Instanz.

Stand des Exports: **22.07.2026**, 50 Migrationen, 39 Tabellen (1:1 mit der Live-DB abgeglichen).

## Was hier liegt

- Je Migration eine Datei `<version>_<name>.sql` (Zeitstempel-Präfix = chronologische
  Reihenfolge). Inhalt ist der **wörtliche SQL-Text**, wie er auf der Live-DB angewandt
  wurde (aus `supabase_migrations.schema_migrations` exportiert).
- Enthält Schema, RLS-Policies (`demo_vollzugriff`), GRANTs, Realtime-Publications
  **und** die Demo-Seed-Daten (Migration `..._drytrack_seed_demo_daten.sql`).

## Wiederherstellung (frisches Supabase-Projekt)

**Variante A — Supabase-CLI (empfohlen):**
```bash
supabase link --project-ref <neue-projekt-ref>
supabase db push          # spielt alle Dateien in Zeitstempel-Reihenfolge ein
```

**Variante B — ohne CLI:** Die `.sql`-Dateien in aufsteigender Reihenfolge des
Dateinamens im Supabase-SQL-Editor nacheinander ausführen. Die Migrationen sind
weitgehend idempotent (`create table if not exists`, `add column if not exists`,
`on conflict do nothing`), ein erneutes Einspielen schadet also nicht.

Danach in Torrek die neue Projekt-URL + anon-Key eintragen (`src/domain/remote.ts`).

## Wichtig

- **Reihenfolge zählt.** Einige spätere Migrationen ändern frühere (z. B. wird die
  Interims-Scan-App in `..._interim_scan_app_grundlage` angelegt und in
  `..._torrek_scan_entkoppeln` wieder aus den Torrek-Tabellen herausgelöst). Nur die
  vollständige Reihenfolge ergibt den korrekten Endzustand.
- **Kein Ersatz für ein Backup echter Daten.** Für den Pilotbetrieb mit Demo-Daten
  genügt dieser Export; sobald echte Schadendaten in der DB liegen, zusätzlich
  regelmäßige Backups (Supabase Pro / `pg_dump`) einrichten.
- **Neue Migrationen bitte nachziehen:** Wird über die Supabase-Tools eine neue
  Migration angewandt, gehört ihr SQL als weitere Datei hierher (gleiche Namenskonvention).
