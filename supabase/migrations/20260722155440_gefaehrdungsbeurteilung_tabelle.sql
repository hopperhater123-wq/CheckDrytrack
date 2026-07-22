-- Ergänzende Gefährdungsbeurteilung (Alt-System sprint., 8 Seiten, PO-Fotos 22.07.):
-- Arbeitsschutz je Projekt — Asbest (TRGS 519), KMF (TRGS 521), sonstige
-- Gefährdungen, Neubewertungen, Unterweisungsnachweis. Eine je Projekt (Upsert).
CREATE TABLE IF NOT EXISTS gefaehrdungsbeurteilung (
  id text PRIMARY KEY,
  projekt_id text NOT NULL,
  datum text NOT NULL,
  autor text,
  bauleiter text,
  anmerkungen text,
  baujahr text,
  asbest text,
  aufsicht_person text,
  arbeitsbereich text,
  bt_taetigkeiten jsonb NOT NULL DEFAULT '[]'::jsonb,
  stoffe jsonb NOT NULL DEFAULT '[]'::jsonb,
  stoffe_sonstiges text,
  schutz jsonb NOT NULL DEFAULT '[]'::jsonb,
  schutz_sonstiges text,
  kmf text,
  kmf_wo text,
  kmf_schutz text,
  absturz boolean NOT NULL DEFAULT false,
  absturz_wo text,
  absturz_schutz text,
  enge_raeume boolean NOT NULL DEFAULT false,
  enge_wo text,
  enge_schutz text,
  spannung_frei boolean NOT NULL DEFAULT false,
  prcds boolean NOT NULL DEFAULT false,
  spannung_schutz text,
  neubewertungen jsonb NOT NULL DEFAULT '[]'::jsonb,
  erstellt_von text NOT NULL,
  erstellt_am text NOT NULL
);
ALTER TABLE gefaehrdungsbeurteilung ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS demo_vollzugriff ON gefaehrdungsbeurteilung;
CREATE POLICY demo_vollzugriff ON gefaehrdungsbeurteilung FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON gefaehrdungsbeurteilung TO anon, authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE gefaehrdungsbeurteilung;

