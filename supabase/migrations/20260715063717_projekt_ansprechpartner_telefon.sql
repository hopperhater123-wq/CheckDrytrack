-- Kontakt vor Ort (Alt-System: Kundenkontakt + Telefon im Termin-Betreff)
ALTER TABLE public.projekt ADD COLUMN IF NOT EXISTS ansprechpartner text;
ALTER TABLE public.projekt ADD COLUMN IF NOT EXISTS telefon text;

