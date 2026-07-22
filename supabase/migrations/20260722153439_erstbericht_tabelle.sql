-- Erstbericht (Alt-System "sprint. Erstbericht", PO-Fotos 22.07.): das Dokument des
-- ersten Besuchs für die Versicherung — Gebäude/Baustoffe, Schadenangaben,
-- erforderliche Maßnahmen, Gerätebedarf, Kostenschätzung. Ein Bericht je Projekt.
CREATE TABLE IF NOT EXISTS erstbericht (
  id text PRIMARY KEY,
  projekt_id text NOT NULL,
  datum text NOT NULL,
  baujahr text, geschosse text, objekttyp text, gebaeudedaemmung text, bauweise text,
  aussenwand text, deckenkonstruktion text, deckenverkleidung text, wandkonstruktion text,
  wandaufbau text, estrichart text, daemmung_estrich text, gebaeude_sonstiges text,
  schadenursache text,
  massnahmen_getroffen boolean NOT NULL DEFAULT false,
  ursache_beseitigt boolean NOT NULL DEFAULT false,
  anwesende text,
  leitungszustand integer,
  ursache_ort text,
  verursachung jsonb NOT NULL DEFAULT '[]'::jsonb,
  abwasser jsonb NOT NULL DEFAULT '[]'::jsonb,
  schaden_sonstiges text,
  massnahmen jsonb NOT NULL DEFAULT '{}'::jsonb,
  geraete jsonb NOT NULL DEFAULT '{}'::jsonb,
  trocknung_hinweise text,
  schimmel boolean NOT NULL DEFAULT false,
  faekalien boolean NOT NULL DEFAULT false,
  desinfektion boolean NOT NULL DEFAULT false,
  ersatzfliesen_vorhanden integer NOT NULL DEFAULT 0,
  fliesen_zerstoerungsfrei integer NOT NULL DEFAULT 0,
  fliesen_zerstoert integer NOT NULL DEFAULT 0,
  weitere_infos text,
  kosten jsonb NOT NULL DEFAULT '{}'::jsonb,
  erstellt_von text NOT NULL,
  erstellt_am text NOT NULL
);
ALTER TABLE erstbericht ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS demo_vollzugriff ON erstbericht;
CREATE POLICY demo_vollzugriff ON erstbericht FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON erstbericht TO anon, authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE erstbericht;

