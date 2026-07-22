-- Messgerät mit Nummer je Messung (Alt-System-Maske "Messgeräte": Uni 2 / RTU 600 + Gerätenummer)
ALTER TABLE public.messung ADD COLUMN IF NOT EXISTS messgeraet text;

