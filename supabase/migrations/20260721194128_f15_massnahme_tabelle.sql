-- F15: Projektweite Maßnahmenliste (Text-Maßnahmen ohne Zeichnung).
-- Gezeichnete Befunde bleiben in grundriss_markierung; diese Tabelle ergänzt
-- freie Maßnahmen. Text-PK, RLS demo_vollzugriff, Grant, Realtime — wie Projektstandard.
CREATE TABLE IF NOT EXISTS massnahme (
  id text PRIMARY KEY,
  projekt_id text NOT NULL,
  raum_id text,
  kategorie text,
  text text NOT NULL,
  status text NOT NULL DEFAULT 'offen',
  erledigt_am text,
  erstellt_von text NOT NULL,
  erstellt_am text NOT NULL
);
ALTER TABLE massnahme ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS demo_vollzugriff ON massnahme;
CREATE POLICY demo_vollzugriff ON massnahme FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON massnahme TO anon, authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE massnahme;

