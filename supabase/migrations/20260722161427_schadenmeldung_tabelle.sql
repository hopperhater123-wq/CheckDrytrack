-- Schadenmeldung (Alt-System/GWG-Vorlage, PO-Fotos 22.07.): der Meldeweg vor dem
-- Erstbericht — Schadenart, externe Nummern, Eintritt/Hergang, verursachende vs.
-- geschädigte Wohnung(en) mit Mieter-Kontakten. Eine je Projekt (Upsert).
CREATE TABLE IF NOT EXISTS schadenmeldung (
  id text PRIMARY KEY,
  projekt_id text NOT NULL,
  schadenart text,
  schadennummer text,
  vertragsnummer text,
  auftragsnummer text,
  eintritt_datum text,
  gemeldet_am text,
  meldeweg text,
  hergang text,
  verursachende_wohnung jsonb NOT NULL DEFAULT '{}'::jsonb,
  geschaedigte_wohnungen jsonb NOT NULL DEFAULT '[]'::jsonb,
  hausrat_info text,
  nur_ursache_klaeren boolean NOT NULL DEFAULT false,
  sonstiges text,
  erstellt_von text NOT NULL,
  erstellt_am text NOT NULL
);
ALTER TABLE schadenmeldung ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS demo_vollzugriff ON schadenmeldung;
CREATE POLICY demo_vollzugriff ON schadenmeldung FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON schadenmeldung TO anon, authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE schadenmeldung;

