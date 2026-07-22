-- Positionsauflistung über ausgeführte Leistungen (Alt-System sprint., PO-Fotos 22.07.):
-- Aufmaß/Mengengerüst je Projekt — Positionen je Gewerk mit Aufmaß-Formeln.
-- BEWUSST OHNE PREISE (kein ERP): reiner Mengennachweis für die Abrechnung im Büro.
CREATE TABLE IF NOT EXISTS leistungsposition (
  id text PRIMARY KEY,
  projekt_id text NOT NULL,
  gewerk text,
  artikel_nr text,
  kurztext text NOT NULL,
  langtext text,
  raum_id text,
  einheit text,
  aufmass_zeilen jsonb NOT NULL DEFAULT '[]'::jsonb,
  menge numeric,
  bemerkung text,
  erstellt_von text NOT NULL,
  erstellt_am text NOT NULL
);
ALTER TABLE leistungsposition ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS demo_vollzugriff ON leistungsposition;
CREATE POLICY demo_vollzugriff ON leistungsposition FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON leistungsposition TO anon, authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE leistungsposition;

