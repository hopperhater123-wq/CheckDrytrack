-- F6 · Ursachen-Chronik (PO 21.07.): wer/wann/was zur Schadensursache — Beweiskette
-- gegen das „wer-ist-schuld"-Pingpong. Neue Tabelle nach Standard-Muster.
CREATE TABLE IF NOT EXISTS public.ursache_eintrag (
  id text PRIMARY KEY,
  projekt_id text NOT NULL REFERENCES public.projekt(id) ON DELETE CASCADE,
  datum text NOT NULL,                 -- ISO-Date der Feststellung
  quelle text NOT NULL,                -- leckortung | installateur | sanierer | gutachter | wir | sonstige
  text text NOT NULL,
  foto text,                           -- optionale komprimierte Data-URL (Beleg)
  erstellt_von text NOT NULL,
  erstellt_am timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ursache_eintrag ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS demo_vollzugriff ON public.ursache_eintrag;
CREATE POLICY demo_vollzugriff ON public.ursache_eintrag FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ursache_eintrag TO anon, authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ursache_eintrag;

-- Schadensstelle vs. Feuchtestelle: Markierung bekommt eine Art (additiv).
ALTER TABLE public.grundriss_markierung ADD COLUMN IF NOT EXISTS art text NOT NULL DEFAULT 'hinweis';

