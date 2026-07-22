-- Benannte Messpunkte je Raum (Alt-System-Matrix: Zeilen = Messstellen)
CREATE TABLE IF NOT EXISTS public.messpunkt (
  id text PRIMARY KEY,
  raum_id text NOT NULL,
  bezeichnung text NOT NULL,
  messort text,
  tiefe_cm numeric,
  material_id text
);
GRANT ALL ON public.messpunkt TO anon, authenticated;
ALTER TABLE public.messpunkt ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS demo_vollzugriff ON public.messpunkt;
CREATE POLICY demo_vollzugriff ON public.messpunkt FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.messpunkt;

-- Zuordnung Messung → Messpunkt
ALTER TABLE public.messung ADD COLUMN IF NOT EXISTS messpunkt_id text;

-- Seed-Messpunkte (Demo, wie im lokalen Seed)
INSERT INTO public.messpunkt (id, raum_id, bezeichnung, messort, tiefe_cm, material_id) VALUES
  ('mp-1', 'r-1', 'Estrich Mitte', 'Küche, Raummitte', NULL, 'mat-schwimm'),
  ('mp-2', 'r-1', 'Randfuge Süd', 'Wand Süd, Sockelleiste', 4, 'mat-randfuge'),
  ('mp-3', 'r-1', 'Raumluft', NULL, NULL, 'mat-raumluft')
ON CONFLICT (id) DO NOTHING;
UPDATE public.messung SET messpunkt_id = 'mp-1' WHERE id IN ('me-1', 'me-2') AND messpunkt_id IS NULL;

