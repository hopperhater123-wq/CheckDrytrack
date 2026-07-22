-- F3 · Beteiligte je Projekt (PO 21.07.): Leckortung, Installateur, Sanierer,
-- Gutachter, Gebäude-/Hausrat-VS, VN, Mieter, Eigentümer … mit Rolle + Telefon.
-- Muster wie die übrigen Tabellen: Text-PK, RLS demo_vollzugriff, GRANT, Realtime.
CREATE TABLE IF NOT EXISTS public.beteiligter (
  id text PRIMARY KEY,
  projekt_id text NOT NULL REFERENCES public.projekt(id) ON DELETE CASCADE,
  rolle text NOT NULL,
  name text NOT NULL,
  telefon text,
  notiz text,
  erstellt_von text NOT NULL,
  erstellt_am timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.beteiligter ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS demo_vollzugriff ON public.beteiligter;
CREATE POLICY demo_vollzugriff ON public.beteiligter FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beteiligter TO anon, authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE public.beteiligter;

