-- Ergebnis der Trocknung je Geschoss (Alt-System "Messprotokoll – Trocknung")
CREATE TABLE IF NOT EXISTS public.trocknungsergebnis (
  id text PRIMARY KEY,
  projekt_id text NOT NULL,
  geschoss text NOT NULL,
  beginn_datum text,
  abgeschlossen boolean NOT NULL DEFAULT false,
  bemerkungen text,
  unterschrift_kunde text,
  unterschrift_kunde_name text,
  erstellt_von text,
  erstellt_am text
);
GRANT ALL ON public.trocknungsergebnis TO anon, authenticated;
ALTER TABLE public.trocknungsergebnis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS demo_vollzugriff ON public.trocknungsergebnis;
CREATE POLICY demo_vollzugriff ON public.trocknungsergebnis FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.trocknungsergebnis;

