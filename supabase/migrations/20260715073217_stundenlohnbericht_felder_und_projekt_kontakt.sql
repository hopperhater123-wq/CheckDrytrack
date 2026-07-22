-- Stundenlohnbericht: Felder aus dem Alt-System-Formular (Frame-Analyse)
ALTER TABLE public.stundenlohnbericht
  ADD COLUMN IF NOT EXISTS schadenrolle text,
  ADD COLUMN IF NOT EXISTS fahrtkilometer numeric,
  ADD COLUMN IF NOT EXISTS hin_und_rueckfahrt boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS anteilig boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS naechster_termin text;

-- Projekt-Kontakt (aus dem letzten Feature, falls noch nicht vorhanden)
ALTER TABLE public.projekt
  ADD COLUMN IF NOT EXISTS ansprechpartner text,
  ADD COLUMN IF NOT EXISTS telefon text;
UPDATE public.projekt SET ansprechpartner = 'Frau Müller (VN)', telefon = '0211 555123' WHERE id = 'p-1' AND telefon IS NULL;
UPDATE public.projekt SET ansprechpartner = 'Herr Kern (Inhaber)', telefon = '0221 998877' WHERE id = 'p-2' AND telefon IS NULL;

