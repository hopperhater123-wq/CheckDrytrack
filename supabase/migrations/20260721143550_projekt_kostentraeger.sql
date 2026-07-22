-- F4 · Kostenträger-Klärung (PO 21.07.): wer zahlt (Gebäude-/Hausrat-VS, Verursacher,
-- privat, ungeklärt) + Klärungsstatus. Rein additiv.
ALTER TABLE public.projekt ADD COLUMN IF NOT EXISTS kostentraeger text;
ALTER TABLE public.projekt ADD COLUMN IF NOT EXISTS kostentraeger_status text NOT NULL DEFAULT 'offen';
ALTER TABLE public.projekt ADD COLUMN IF NOT EXISTS kostentraeger_notiz text;

