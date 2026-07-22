-- KVA-Verwaltung (plancraft-Analyse 22.07.): festgeschriebene Kostenvoranschläge
-- mit laufender Nummer, Status und Positions-Snapshot (jsonb). Additiv.
CREATE TABLE IF NOT EXISTS kva (
  id text PRIMARY KEY,
  projekt_id text,
  nummer integer,
  status text,
  datum text,
  positionen jsonb DEFAULT '[]'::jsonb,
  netto double precision,
  mwst double precision,
  brutto double precision,
  erstellt_von text,
  erstellt_am text
);
ALTER TABLE kva ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS demo_vollzugriff ON kva;
CREATE POLICY demo_vollzugriff ON kva FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON kva TO anon, authenticated;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE kva;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
